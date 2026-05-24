"""
Plotly candlestick charts — Model B signals, supply/demand zones, manual levels.
"""

import streamlit as st
import pandas as pd
import numpy as np
import plotly.graph_objects as go
import yfinance as yf

_TICKER_MAP = {"MCL": "CL=F", "MES": "ES=F"}
_INTERVAL_OPTIONS = ["5m", "15m", "1h", "1d"]
_PERIOD_MAP = {"5m": "5d", "15m": "5d", "1h": "1mo", "1d": "6mo"}


# ── Data fetch (cached 5 min) ─────────────────────────────────────────────────

@st.cache_data(ttl=300, show_spinner=False)
def _download(ticker: str, period: str, interval: str) -> pd.DataFrame:
    try:
        df = yf.download(ticker, period=period, interval=interval,
                         progress=False, auto_adjust=True)
    except Exception:
        return pd.DataFrame()
    if df is None or df.empty:
        return pd.DataFrame()
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.get_level_values(0)
    return df.dropna(subset=["Open", "High", "Low", "Close"])


# ── Indicators ────────────────────────────────────────────────────────────────

def _vwap_daily(df: pd.DataFrame) -> pd.Series:
    """Session VWAP — resets each calendar day."""
    typical = (df["High"] + df["Low"] + df["Close"]) / 3
    tv = typical * df["Volume"]
    try:
        dates = df.index.normalize()
    except Exception:
        dates = pd.Series(df.index.date, index=df.index)
    return (tv.groupby(dates).cumsum() /
            df["Volume"].groupby(dates).cumsum().replace(0, np.nan))


def _atr(df: pd.DataFrame, period: int = 14) -> pd.Series:
    prev = df["Close"].shift(1)
    tr = pd.concat([df["High"] - df["Low"],
                    (df["High"] - prev).abs(),
                    (df["Low"]  - prev).abs()], axis=1).max(axis=1)
    return tr.ewm(span=period, adjust=False).mean()


# ── Supply / demand zones ─────────────────────────────────────────────────────

def _find_zones(df: pd.DataFrame, max_per_type: int = 3) -> list:
    n = len(df)
    pivot = max(3, min(8, n // 25))
    if n < pivot * 2 + 1:
        return []
    highs = df["High"].values
    lows  = df["Low"].values
    avg_r = (df["High"] - df["Low"]).mean()
    demand, supply = [], []
    for i in range(pivot, n - pivot):
        hi, lo = highs[i], lows[i]
        zone_h = max(hi - lo, avg_r * 0.2)
        if hi >= highs[i - pivot: i + pivot + 1].max():
            supply.append({"type": "supply", "high": hi,
                           "low": hi - zone_h, "x": df.index[i]})
        if lo <= lows[i - pivot: i + pivot + 1].min():
            demand.append({"type": "demand", "high": lo + zone_h,
                           "low": lo, "x": df.index[i]})

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

def _model_b(df: pd.DataFrame,
             swing_len: int = 10, trend_len: int = 200, fast_len: int = 20,
             atr_len: int = 14, atr_mult: float = 1.5, rr: float = 2.0) -> list:
    """
    Translated from Pine Script Model B.
    Buy : close > swing high + bullish solid bar + above SMA200 + NY session
    Sell: mirror below swing low
    Exit: SL/TP hit or SMA20 cross
    State machine prevents duplicate signals.
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

    body  = (close - open_).abs()
    rng   = (high - low).replace(0, np.nan)
    solid = body / rng >= 0.4

    # NY session filter — graceful fallback if timezone unavailable
    try:
        idx = df.index
        if idx.tz is None:
            idx = idx.tz_localize("UTC")
        et = idx.tz_convert("America/New_York")
        in_sess = pd.Series(
            [((t.hour == 9 and t.minute >= 30) or
              (10 <= t.hour < 16)) for t in et],
            index=df.index, dtype=bool,
        )
    except Exception:
        in_sess = pd.Series(True, index=df.index)

    signals = []
    in_long = in_short = False
    sl_p = tp_p = entry_p = None
    start = max(trend_len // 2, swing_len + 1, fast_len + 1)

    for i in range(start, len(df)):
        c    = close.iloc[i];  h = high.iloc[i];  l = low.iloc[i]
        s200 = sma200.iloc[i]; s20 = sma20.iloc[i]; s20p = sma20.iloc[i - 1]
        cp   = close.iloc[i - 1]
        sw_h = sw_high.iloc[i]; sw_l = sw_low.iloc[i]
        atr_v = atr_s.iloc[i]
        sess  = bool(in_sess.iloc[i])
        t_i   = df.index[i]

        if any(pd.isna(x) for x in [s200, s20, sw_h, sw_l, atr_v]):
            continue

        # Exits
        if in_long:
            if l <= sl_p or h >= tp_p or (cp > s20p and c < s20):
                signals.append({"type": "exit_long",  "time": t_i, "y": h * 1.001})
                in_long = False; sl_p = tp_p = entry_p = None

        if in_short:
            if h >= sl_p or l <= tp_p or (cp < s20p and c > s20):
                signals.append({"type": "exit_short", "time": t_i, "y": l * 0.999})
                in_short = False; sl_p = tp_p = entry_p = None

        # Entries
        if not in_long and not in_short and solid.iloc[i] and sess:
            o = open_.iloc[i]
            if c > sw_h and c > o and c > s200:
                in_long = True; entry_p = c
                sl_p = c - atr_v * atr_mult
                tp_p = c + (c - sl_p) * rr
                signals.append({"type": "buy",  "time": t_i, "y": l * 0.9993,
                                "entry": entry_p, "sl": sl_p, "tp": tp_p})
            elif c < sw_l and c < o and c < s200:
                in_short = True; entry_p = c
                sl_p = c + atr_v * atr_mult
                tp_p = c - (sl_p - c) * rr
                signals.append({"type": "sell", "time": t_i, "y": h * 1.0007,
                                "entry": entry_p, "sl": sl_p, "tp": tp_p})

    return signals


def _levels_key(s): return f"trade_levels_{s}"


# ── Main render ───────────────────────────────────────────────────────────────

def render_chart_panel(symbol: str, height: int = 520):
    ticker = _TICKER_MAP.get(symbol, symbol)

    iv_key = f"chart_interval_{symbol}"
    if iv_key not in st.session_state:
        st.session_state[iv_key] = "5m"
    if _levels_key(symbol) not in st.session_state:
        st.session_state[_levels_key(symbol)] = []

    # Timeframe buttons
    cols = st.columns(len(_INTERVAL_OPTIONS) + 2)
    with cols[0]:
        st.markdown('<span style="color:#5577aa;font-size:0.8em;line-height:2.4;">Timeframe:</span>',
                    unsafe_allow_html=True)
    for i, iv in enumerate(_INTERVAL_OPTIONS):
        with cols[i + 1]:
            active = st.session_state[iv_key] == iv
            if st.button(f"**{iv}**" if active else iv, key=f"btn_{symbol}_{iv}"):
                st.session_state[iv_key] = iv
                st.rerun()

    interval = st.session_state[iv_key]
    intraday = interval in ("5m", "15m", "1h")

    with st.spinner(f"Loading {symbol}…"):
        df = _download(ticker, _PERIOD_MAP[interval], interval)

    if df.empty:
        st.warning(f"No data for {symbol}. Market may be closed.")
        return

    fig = go.Figure()
    x0, x1 = df.index[0], df.index[-1]

    # ── Zones ────────────────────────────────────────────────────────────
    zones = _find_zones(df)
    for z in zones:
        fill = "rgba(46,204,113,0.13)" if z["type"] == "demand" else "rgba(231,76,60,0.13)"
        line = "#2ecc71"              if z["type"] == "demand" else "#e74c3c"
        fig.add_trace(go.Scatter(
            x=[z["x"], x1, x1, z["x"], z["x"]],
            y=[z["low"], z["low"], z["high"], z["high"], z["low"]],
            fill="toself", fillcolor=fill,
            line=dict(color=line, width=0.5),
            mode="lines", showlegend=False, hoverinfo="skip",
        ))

    # ── Candlesticks ──────────────────────────────────────────────────────
    fig.add_trace(go.Candlestick(
        x=df.index, open=df["Open"], high=df["High"],
        low=df["Low"], close=df["Close"], name=symbol,
        increasing_line_color="#2ecc71", decreasing_line_color="#e74c3c",
        increasing_fillcolor="#2ecc71",  decreasing_fillcolor="#e74c3c",
    ))

    # ── SMA 200 / SMA 20 / VWAP ───────────────────────────────────────────
    sma200 = df["Close"].rolling(200, min_periods=50).mean()
    sma20  = df["Close"].rolling(20,  min_periods=5).mean()
    fig.add_trace(go.Scatter(x=df.index, y=sma200, mode="lines", name="SMA 200",
                             line=dict(color="#95a5a6", width=1.4)))
    fig.add_trace(go.Scatter(x=df.index, y=sma20,  mode="lines", name="SMA 20",
                             line=dict(color="#1e40af", width=1.2)))
    if intraday:
        vwap = _vwap_daily(df)
        fig.add_trace(go.Scatter(x=df.index, y=vwap, mode="lines", name="VWAP",
                                 line=dict(color="#f39c12", width=1.3, dash="dot")))

    # ── Model B signals ───────────────────────────────────────────────────
    signals = _model_b(df)

    # Determine if a trade is currently open
    last_trade = None
    for s in signals:
        if s["type"] in ("buy", "sell"):
            last_trade = s
        elif s["type"] in ("exit_long", "exit_short"):
            last_trade = None

    # Active SL / TP / Entry lines
    if last_trade:
        for val, color, lbl in [
            (last_trade["entry"], "#95a5a6", "Entry"),
            (last_trade["sl"],    "#e74c3c", "SL"),
            (last_trade["tp"],    "#2ecc71", "TP"),
        ]:
            fig.add_trace(go.Scatter(
                x=[x0, x1], y=[val, val], mode="lines", name=lbl,
                line=dict(color=color, width=1.1, dash="dash"),
                hovertemplate=f"{lbl}: {val:.2f}<extra></extra>",
            ))

    # Collect marker arrays
    def _pts(sig_type):
        return ([s["time"] for s in signals if s["type"] == sig_type],
                [s["y"]    for s in signals if s["type"] == sig_type])

    bt, by   = _pts("buy");         st2, sy  = _pts("sell")
    elt, ely = _pts("exit_long");   est, esy = _pts("exit_short")

    if bt:
        fig.add_trace(go.Scatter(x=bt, y=by, mode="markers", name="BUY",
                                 marker=dict(symbol="triangle-up", size=13, color="#2ecc71",
                                             line=dict(color="#1a9954", width=1)),
                                 hovertemplate="BUY %{y:.2f}<extra></extra>"))
    if st2:
        fig.add_trace(go.Scatter(x=st2, y=sy, mode="markers", name="SELL",
                                 marker=dict(symbol="triangle-down", size=13, color="#e74c3c",
                                             line=dict(color="#c0392b", width=1)),
                                 hovertemplate="SELL %{y:.2f}<extra></extra>"))

    exits_t = elt + est
    exits_y = ely + esy
    if exits_t:
        # Sort by time for clean rendering
        pairs = sorted(zip(exits_t, exits_y), key=lambda p: p[0])
        et_s  = [p[0] for p in pairs]
        ey_s  = [p[1] for p in pairs]
        syms  = (["triangle-down"] * len(elt) + ["triangle-up"] * len(est))
        syms  = [s for _, s in sorted(zip(exits_t, syms), key=lambda p: p[0])]
        fig.add_trace(go.Scatter(x=et_s, y=ey_s, mode="markers", name="EXIT",
                                 marker=dict(symbol=syms, size=9, color="#f39c12",
                                             line=dict(color="#d68910", width=1)),
                                 hovertemplate="EXIT %{y:.2f}<extra></extra>"))

    # ── Manual levels ─────────────────────────────────────────────────────
    for lvl in st.session_state[_levels_key(symbol)]:
        color = "#2ecc71" if lvl["direction"] == "Buy" else "#e74c3c"
        lbl   = f"{lvl['direction']} {lvl['price']:.2f}"
        if lvl.get("note"):
            lbl += f" · {lvl['note']}"
        fig.add_trace(go.Scatter(
            x=[x0, x1], y=[lvl["price"], lvl["price"]],
            mode="lines", name=lbl,
            line=dict(color=color, width=1.3, dash="longdash"),
            hovertemplate=f"{lbl}<extra></extra>",
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
                    bgcolor="rgba(0,0,0,0)", itemclick="toggleothers"),
        hovermode="x unified",
    )

    st.plotly_chart(fig, use_container_width=True, config={
        "displayModeBar": True,
        "modeBarButtonsToRemove": ["select2d", "lasso2d"],
        "displaylogo": False,
    })

    # Compact status line
    d_ct = sum(1 for z in zones if z["type"] == "demand")
    s_ct = sum(1 for z in zones if z["type"] == "supply")
    trade_status = ""
    if last_trade:
        dir_lbl = "Long" if last_trade["type"] == "buy" else "Short"
        clr = "#2ecc71" if dir_lbl == "Long" else "#e74c3c"
        trade_status = (f' &nbsp;|&nbsp; <span style="color:{clr};">● {dir_lbl} open'
                        f' · SL {last_trade["sl"]:.2f} · TP {last_trade["tp"]:.2f}</span>')
    st.markdown(
        f'<div style="font-size:0.77em;color:#5577aa;margin-top:-6px;">'
        f'<span style="color:#2ecc71;">▲ {len(bt)}</span> buy &nbsp;'
        f'<span style="color:#e74c3c;">▼ {len(st2)}</span> sell &nbsp;·&nbsp; '
        f'Zones: <span style="color:#2ecc71;">{d_ct}D</span> '
        f'<span style="color:#e74c3c;">{s_ct}S</span>'
        f'{trade_status}</div>',
        unsafe_allow_html=True,
    )

    # ── Manual level input ────────────────────────────────────────────────
    with st.expander("➕ Add Level", expanded=False):
        c1, c2, c3, c4 = st.columns([1, 1, 2, 1])
        with c1:
            direction = st.selectbox("", ["Buy", "Sell"], key=f"lvl_dir_{symbol}",
                                     label_visibility="collapsed")
        with c2:
            price_val = st.number_input("Price", value=0.00, format="%.2f",
                                        step=0.01, key=f"lvl_price_{symbol}",
                                        label_visibility="collapsed")
        with c3:
            note = st.text_input("", placeholder="Note (optional)",
                                 key=f"lvl_note_{symbol}", label_visibility="collapsed")
        with c4:
            if st.button("Add", key=f"lvl_add_{symbol}"):
                if price_val > 0:
                    st.session_state[_levels_key(symbol)].append(
                        {"direction": direction, "price": price_val, "note": note.strip()})
                    st.rerun()

        levels = st.session_state[_levels_key(symbol)]
        if levels:
            for idx, lvl in enumerate(levels):
                clr = "#2ecc71" if lvl["direction"] == "Buy" else "#e74c3c"
                lc1, lc2 = st.columns([5, 1])
                with lc1:
                    nt = f" — {lvl['note']}" if lvl.get("note") else ""
                    st.markdown(
                        f'<span style="color:{clr};font-size:0.85em;font-weight:600;">'
                        f'{lvl["direction"]} @ {lvl["price"]:.2f}</span>'
                        f'<span style="color:#5577aa;font-size:0.82em;">{nt}</span>',
                        unsafe_allow_html=True)
                with lc2:
                    if st.button("✕", key=f"rm_{symbol}_{idx}"):
                        st.session_state[_levels_key(symbol)].pop(idx); st.rerun()
            if st.button(f"Clear all", key=f"clr_{symbol}"):
                st.session_state[_levels_key(symbol)] = []; st.rerun()
