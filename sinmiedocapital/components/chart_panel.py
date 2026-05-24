"""
Plotly candlestick charts — Model B signals, supply/demand zones, manual levels.
Model B logic translated from Pine Script: swing breakout + SMA200 trend + ATR stops.
"""

import streamlit as st
import pandas as pd
import numpy as np
import plotly.graph_objects as go
import yfinance as yf

_TICKER_MAP = {
    "MCL": "CL=F",
    "MES": "ES=F",
}

_INTERVAL_OPTIONS = ["5m", "15m", "1h", "1d"]
_PERIOD_MAP = {
    "5m":  "5d",
    "15m": "5d",
    "1h":  "1mo",
    "1d":  "6mo",
}


# ── Indicators ────────────────────────────────────────────────────────────────

def _vwap_daily(df: pd.DataFrame) -> pd.Series:
    """Session VWAP that resets each calendar day."""
    typical = (df["High"] + df["Low"] + df["Close"]) / 3
    tv   = typical * df["Volume"]
    dates = df.index.normalize()
    return tv.groupby(dates).cumsum() / df["Volume"].groupby(dates).cumsum().replace(0, np.nan)


def _atr(df: pd.DataFrame, period: int = 14) -> pd.Series:
    tr = pd.concat([
        df["High"] - df["Low"],
        (df["High"] - df["Close"].shift(1)).abs(),
        (df["Low"]  - df["Close"].shift(1)).abs(),
    ], axis=1).max(axis=1)
    return tr.ewm(span=period, adjust=False).mean()


# ── Supply / Demand zones ─────────────────────────────────────────────────────

def _find_zones(df: pd.DataFrame, max_per_type: int = 4) -> list:
    """Swing-pivot based supply/demand zones."""
    n = len(df)
    pivot_bars = max(3, min(8, n // 25))
    if n < pivot_bars * 2 + 1:
        return []

    highs = df["High"].values
    lows  = df["Low"].values
    avg_rng = (df["High"] - df["Low"]).mean()
    min_h   = avg_rng * 0.2

    demand, supply = [], []
    for i in range(pivot_bars, n - pivot_bars):
        hi = highs[i]; lo = lows[i]
        zone_h = max(hi - lo, min_h)
        win_h = highs[i - pivot_bars: i + pivot_bars + 1]
        win_l = lows[i - pivot_bars: i + pivot_bars + 1]
        if hi >= win_h.max():
            supply.append({"type": "supply", "high": hi, "low": hi - zone_h, "x_start": df.index[i]})
        if lo <= win_l.min():
            demand.append({"type": "demand", "high": lo + zone_h, "low": lo, "x_start": df.index[i]})

    def dedup(zones):
        out = []
        for z in reversed(zones):
            mid = (z["high"] + z["low"]) / 2
            if not any(abs(mid - (o["high"] + o["low"]) / 2) / mid < 0.002 for o in out):
                out.append(z)
            if len(out) >= max_per_type:
                break
        return out

    return dedup(demand) + dedup(supply)


# ── Model B signal engine ─────────────────────────────────────────────────────

def _model_b_signals(df: pd.DataFrame,
                     swing_len: int   = 10,
                     trend_len: int   = 200,
                     fast_len:  int   = 20,
                     atr_len:   int   = 14,
                     atr_mult:  float = 1.5,
                     rr:        float = 2.0) -> list:
    """
    Python port of the Model B Pine Script indicator.

    Entry rules (buy):
      • close breaks above the prior swing high (highest high of last swing_len bars)
      • close > open (bullish bar)
      • body/range ≥ 40% (solid bar, not a doji/wick candle)
      • close > SMA 200 (with-trend only)
      • no open position

    Entry rules (sell): mirror of above.

    Stop  = ATR(14) × 1.5 below/above entry.
    Target = stop distance × R:R ratio.

    Exits:
      • Stop or target hit
      • Close crosses SMA 20 against the trade
    """
    close = df["Close"]
    high  = df["High"]
    low   = df["Low"]
    open_ = df["Open"]

    sma200 = close.rolling(trend_len, min_periods=max(50, trend_len // 4)).mean()
    sma20  = close.rolling(fast_len,  min_periods=5).mean()
    atr_s  = _atr(df, atr_len)

    sw_high = high.rolling(swing_len).max().shift(1)
    sw_low  = low.rolling(swing_len).min().shift(1)

    body     = (close - open_).abs()
    rng      = (high - low).replace(0, np.nan)
    solid    = body / rng >= 0.4

    # Session filter: NY 09:30-16:00 ET (intraday only)
    try:
        if df.index.tz is not None:
            et = df.index.tz_convert("America/New_York")
        else:
            et = df.index.tz_localize("America/New_York", ambiguous="NaT", nonexistent="NaT")
        t = et.time
        in_sess = pd.Series(
            [(x.hour, x.minute) >= (9, 30) and (x.hour, x.minute) <= (16, 0)
             for x in et],
            index=df.index,
        )
    except Exception:
        in_sess = pd.Series(True, index=df.index)

    signals  = []
    in_long  = False
    in_short = False
    sl_p = tp_p = entry_p = None

    start = max(trend_len // 2, swing_len + 1, fast_len + 1)

    for i in range(start, len(df)):
        c   = close.iloc[i]
        h   = high.iloc[i]
        l   = low.iloc[i]
        s200 = sma200.iloc[i]
        s20  = sma20.iloc[i]
        s20p = sma20.iloc[i - 1]
        cp   = close.iloc[i - 1]
        sw_h = sw_high.iloc[i]
        sw_l = sw_low.iloc[i]
        atr_v = atr_s.iloc[i]
        solid_bar = solid.iloc[i]
        sess = bool(in_sess.iloc[i])
        t_i  = df.index[i]

        if pd.isna(s200) or pd.isna(s20) or pd.isna(sw_h) or pd.isna(atr_v):
            continue

        # ── Exits first ────────────────────────────────────────────────────
        if in_long:
            cross_dn = cp > s20p and c < s20
            if l <= sl_p or h >= tp_p or cross_dn:
                signals.append({"type": "exit_long", "time": t_i, "price": h * 1.0003})
                in_long = False; sl_p = tp_p = entry_p = None

        if in_short:
            cross_up = cp < s20p and c > s20
            if h >= sl_p or l <= tp_p or cross_up:
                signals.append({"type": "exit_short", "time": t_i, "price": l * 0.9997})
                in_short = False; sl_p = tp_p = entry_p = None

        # ── Entries ────────────────────────────────────────────────────────
        if not in_long and not in_short and solid_bar and sess:
            if c > sw_h and c > open_.iloc[i] and c > s200:
                in_long = True
                entry_p = c
                sl_p    = c - atr_v * atr_mult
                tp_p    = c + (c - sl_p) * rr
                signals.append({"type": "buy", "time": t_i,
                                "marker_y": l * 0.9995,
                                "entry": entry_p, "sl": sl_p, "tp": tp_p})

            elif c < sw_l and c < open_.iloc[i] and c < s200:
                in_short = True
                entry_p  = c
                sl_p     = c + atr_v * atr_mult
                tp_p     = c - (sl_p - c) * rr
                signals.append({"type": "sell", "time": t_i,
                                "marker_y": h * 1.0005,
                                "entry": entry_p, "sl": sl_p, "tp": tp_p})

    return signals


# ── Manual level helpers ──────────────────────────────────────────────────────

def _levels_key(symbol: str) -> str:
    return f"trade_levels_{symbol}"


# ── Main render ───────────────────────────────────────────────────────────────

def render_chart_panel(symbol: str, height: int = 520):
    ticker_sym = _TICKER_MAP.get(symbol, symbol)

    interval_key = f"chart_interval_{symbol}"
    if interval_key not in st.session_state:
        st.session_state[interval_key] = "5m"
    if _levels_key(symbol) not in st.session_state:
        st.session_state[_levels_key(symbol)] = []

    # ── Timeframe selector ────────────────────────────────────────────────
    btn_cols = st.columns(len(_INTERVAL_OPTIONS) + 2)
    with btn_cols[0]:
        st.markdown(
            '<span style="color:#5577aa;font-size:0.8em;line-height:2.4;">Timeframe:</span>',
            unsafe_allow_html=True,
        )
    for i, iv in enumerate(_INTERVAL_OPTIONS):
        with btn_cols[i + 1]:
            label = f"**{iv}**" if st.session_state[interval_key] == iv else iv
            if st.button(label, key=f"btn_{symbol}_{iv}"):
                st.session_state[interval_key] = iv
                st.rerun()

    interval = st.session_state[interval_key]

    with st.spinner(f"Loading {symbol} {interval}…"):
        try:
            df = yf.download(
                ticker_sym, period=_PERIOD_MAP[interval],
                interval=interval, progress=False, auto_adjust=True,
            )
        except Exception as e:
            st.error(f"Data error: {e}")
            return

    if df is None or df.empty:
        st.warning(f"No data for {symbol}. Market may be closed.")
        return

    if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.get_level_values(0)
    df = df.dropna(subset=["Open", "High", "Low", "Close"])

    fig = go.Figure()
    x_end = df.index[-1]
    intraday = interval in ("5m", "15m", "1h")

    # ── Supply / Demand zones ─────────────────────────────────────────────
    zones = _find_zones(df)
    for zone in zones:
        color = "#2ecc71" if zone["type"] == "demand" else "#e74c3c"
        fill  = "rgba(46,204,113,0.15)" if zone["type"] == "demand" else "rgba(231,76,60,0.15)"
        x0, x1 = zone["x_start"], x_end
        y0, y1 = zone["low"], zone["high"]
        fig.add_trace(go.Scatter(
            x=[x0, x1, x1, x0, x0],
            y=[y0, y0, y1, y1, y0],
            fill="toself", fillcolor=fill,
            line=dict(color=color, width=0.8),
            mode="lines", showlegend=False, hoverinfo="skip",
        ))

    # ── Candlesticks ──────────────────────────────────────────────────────
    fig.add_trace(go.Candlestick(
        x=df.index,
        open=df["Open"], high=df["High"],
        low=df["Low"],   close=df["Close"],
        name=symbol,
        increasing_line_color="#2ecc71", decreasing_line_color="#e74c3c",
        increasing_fillcolor="#2ecc71",  decreasing_fillcolor="#e74c3c",
    ))

    # ── SMA 200 + SMA 20 ──────────────────────────────────────────────────
    sma200 = df["Close"].rolling(200, min_periods=50).mean()
    sma20  = df["Close"].rolling(20,  min_periods=5).mean()
    fig.add_trace(go.Scatter(x=df.index, y=sma200, mode="lines",
                             name="SMA 200", line=dict(color="#95a5a6", width=1.5)))
    fig.add_trace(go.Scatter(x=df.index, y=sma20,  mode="lines",
                             name="SMA 20",  line=dict(color="#1e40af", width=1.2)))

    # ── VWAP (intraday only) ──────────────────────────────────────────────
    if intraday:
        vwap = _vwap_daily(df)
        fig.add_trace(go.Scatter(x=df.index, y=vwap, mode="lines",
                                 name="VWAP", line=dict(color="#f39c12", width=1.4, dash="dot")))

    # ── Model B signals ───────────────────────────────────────────────────
    signals = _model_b_signals(df)

    # Collect last open trade's SL/TP for overlay
    last_sl = last_tp = last_entry = None
    last_type = None
    for sig in signals:
        if sig["type"] in ("buy", "sell"):
            last_sl    = sig["sl"]
            last_tp    = sig["tp"]
            last_entry = sig["entry"]
            last_type  = sig["type"]
        elif sig["type"] in ("exit_long", "exit_short"):
            last_sl = last_tp = last_entry = last_type = None

    # SL / TP / Entry lines for current open trade
    if last_entry and last_sl and last_tp:
        for y_val, color, label in [
            (last_entry, "#95a5a6", "Entry"),
            (last_sl,    "#e74c3c", "SL"),
            (last_tp,    "#2ecc71", "TP"),
        ]:
            fig.add_trace(go.Scatter(
                x=[df.index[0], x_end], y=[y_val, y_val],
                mode="lines", name=label,
                line=dict(color=color, width=1.2, dash="dash"),
                hovertemplate=f"{label}: {y_val:.2f}<extra></extra>",
            ))

    # Buy / Sell / Exit markers
    buy_t  = [s["time"]     for s in signals if s["type"] == "buy"]
    buy_y  = [s["marker_y"] for s in signals if s["type"] == "buy"]
    sell_t = [s["time"]     for s in signals if s["type"] == "sell"]
    sell_y = [s["marker_y"] for s in signals if s["type"] == "sell"]
    exl_t  = [s["time"]     for s in signals if s["type"] == "exit_long"]
    exl_y  = [s["price"]    for s in signals if s["type"] == "exit_long"]
    exs_t  = [s["time"]     for s in signals if s["type"] == "exit_short"]
    exs_y  = [s["price"]    for s in signals if s["type"] == "exit_short"]

    if buy_t:
        fig.add_trace(go.Scatter(
            x=buy_t, y=buy_y, mode="markers+text",
            name="BUY", text=["BUY"] * len(buy_t),
            textposition="bottom center",
            textfont=dict(color="#ffffff", size=9),
            marker=dict(symbol="triangle-up", size=14,
                        color="#2ecc71", line=dict(color="#1a9954", width=1)),
            hovertemplate="BUY %{y:.2f}<extra></extra>",
        ))
    if sell_t:
        fig.add_trace(go.Scatter(
            x=sell_t, y=sell_y, mode="markers+text",
            name="SELL", text=["SELL"] * len(sell_t),
            textposition="top center",
            textfont=dict(color="#ffffff", size=9),
            marker=dict(symbol="triangle-down", size=14,
                        color="#e74c3c", line=dict(color="#c0392b", width=1)),
            hovertemplate="SELL %{y:.2f}<extra></extra>",
        ))
    if exl_t:
        fig.add_trace(go.Scatter(
            x=exl_t, y=exl_y, mode="markers+text",
            name="EXIT", text=["EXIT"] * len(exl_t),
            textposition="top center",
            textfont=dict(color="#ffffff", size=8),
            marker=dict(symbol="triangle-down", size=10,
                        color="#f39c12", line=dict(color="#d68910", width=1)),
            hovertemplate="EXIT %{y:.2f}<extra></extra>",
        ))
    if exs_t:
        fig.add_trace(go.Scatter(
            x=exs_t, y=exs_y, mode="markers+text",
            name="EXIT", text=["EXIT"] * len(exs_t),
            textposition="bottom center",
            textfont=dict(color="#ffffff", size=8),
            marker=dict(symbol="triangle-up", size=10,
                        color="#f39c12", line=dict(color="#d68910", width=1)),
            showlegend=False,
            hovertemplate="EXIT %{y:.2f}<extra></extra>",
        ))

    # ── Manual buy/sell levels ────────────────────────────────────────────
    for lvl in st.session_state[_levels_key(symbol)]:
        color = "#2ecc71" if lvl["direction"] == "Buy" else "#e74c3c"
        label = f"{lvl['direction']} {lvl['price']:.2f}"
        if lvl.get("note"):
            label += f"  {lvl['note']}"
        fig.add_trace(go.Scatter(
            x=[df.index[0], x_end], y=[lvl["price"], lvl["price"]],
            mode="lines", name=label,
            line=dict(color=color, width=1.5, dash="longdash"),
            hovertemplate=f"{label}<extra></extra>",
        ))

    # ── Layout ────────────────────────────────────────────────────────────
    fig.update_layout(
        height=height,
        margin=dict(l=0, r=0, t=10, b=0),
        paper_bgcolor="#f5f8ff", plot_bgcolor="#ffffff",
        font=dict(color="#0a1428", size=11),
        xaxis=dict(gridcolor="#e8eef8", showgrid=True,
                   rangeslider=dict(visible=False), type="date"),
        yaxis=dict(gridcolor="#e8eef8", showgrid=True, side="right"),
        legend=dict(orientation="h", yanchor="bottom", y=1.01,
                    xanchor="left", x=0, font=dict(size=10),
                    bgcolor="rgba(0,0,0,0)"),
        hovermode="x unified",
    )

    st.plotly_chart(fig, use_container_width=True, config={
        "displayModeBar": True,
        "modeBarButtonsToRemove": ["select2d", "lasso2d"],
        "displaylogo": False,
    })

    # Signal summary
    n_buy  = len(buy_t)
    n_sell = len(sell_t)
    d_ct = sum(1 for z in zones if z["type"] == "demand")
    s_ct = sum(1 for z in zones if z["type"] == "supply")
    st.markdown(
        f'<div style="font-size:0.78em;color:#5577aa;margin-top:-6px;">'
        f'Model B — <span style="color:#2ecc71;">▲ {n_buy} buy</span>'
        f' &nbsp;·&nbsp; <span style="color:#e74c3c;">▼ {n_sell} sell</span>'
        f' &nbsp;|&nbsp; Zones: '
        f'<span style="color:#2ecc71;">{d_ct} demand</span>'
        f' · <span style="color:#e74c3c;">{s_ct} supply</span>'
        f'</div>',
        unsafe_allow_html=True,
    )

    # ── Manual level input ────────────────────────────────────────────────
    with st.expander("Add Manual Level", expanded=False):
        c1, c2, c3, c4 = st.columns([1, 1, 2, 1])
        with c1:
            direction = st.selectbox("Direction", ["Buy", "Sell"], key=f"lvl_dir_{symbol}")
        with c2:
            price_val = st.number_input("Price", value=0.00, format="%.2f",
                                        step=0.01, key=f"lvl_price_{symbol}")
        with c3:
            note = st.text_input("Note", value="", placeholder="e.g. VWAP reclaim",
                                 key=f"lvl_note_{symbol}")
        with c4:
            st.markdown('<div style="margin-top:24px;">', unsafe_allow_html=True)
            if st.button("Add", key=f"lvl_add_{symbol}"):
                if price_val > 0:
                    st.session_state[_levels_key(symbol)].append(
                        {"direction": direction, "price": price_val, "note": note.strip()})
                    st.rerun()
            st.markdown('</div>', unsafe_allow_html=True)

        levels = st.session_state[_levels_key(symbol)]
        if levels:
            st.markdown('<div style="font-size:0.8em;color:#5577aa;margin-top:4px;">Active levels:</div>',
                        unsafe_allow_html=True)
            for idx, lvl in enumerate(levels):
                color = "#2ecc71" if lvl["direction"] == "Buy" else "#e74c3c"
                lc1, lc2 = st.columns([5, 1])
                with lc1:
                    note_txt = f" — {lvl['note']}" if lvl.get("note") else ""
                    st.markdown(
                        f'<span style="color:{color};font-size:0.85em;font-weight:600;">'
                        f'{lvl["direction"]} @ {lvl["price"]:.2f}</span>'
                        f'<span style="color:#5577aa;font-size:0.82em;">{note_txt}</span>',
                        unsafe_allow_html=True,
                    )
                with lc2:
                    if st.button("✕", key=f"lvl_rm_{symbol}_{idx}"):
                        st.session_state[_levels_key(symbol)].pop(idx)
                        st.rerun()
            if st.button(f"Clear All ({symbol})", key=f"lvl_clear_{symbol}"):
                st.session_state[_levels_key(symbol)] = []
                st.rerun()
