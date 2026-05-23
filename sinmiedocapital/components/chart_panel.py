"""Native Plotly candlestick charts with VWAP, EMA, supply/demand zones, and manual levels."""

import streamlit as st
import pandas as pd
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


def _compute_vwap(df: pd.DataFrame) -> pd.Series:
    typical = (df["High"] + df["Low"] + df["Close"]) / 3
    cum_vol  = df["Volume"].cumsum()
    cum_tp   = (typical * df["Volume"]).cumsum()
    return cum_tp / cum_vol.replace(0, float("nan"))


def _find_zones(df: pd.DataFrame, max_per_type: int = 4) -> list:
    """
    Detect supply/demand zones using swing high/low pivot detection.

    A swing high is a bar whose High is the highest within pivot_bars on
    each side — marks a supply zone. A swing low marks a demand zone.
    Zone height = the candle's full range (High - Low), minimum 0.1% of price.
    """
    n = len(df)
    pivot_bars = max(3, min(8, n // 25))
    if n < pivot_bars * 2 + 1:
        return []

    highs  = df["High"].values
    lows   = df["Low"].values
    opens  = df["Open"].values
    closes = df["Close"].values
    idx    = df.index

    avg_range = (df["High"] - df["Low"]).mean()
    min_height = avg_range * 0.2  # zone must be at least 20% of avg bar range

    demand, supply = [], []

    for i in range(pivot_bars, n - pivot_bars):
        hi = highs[i]
        lo = lows[i]
        zone_h = max(hi - lo, min_height)

        # Swing high → supply zone
        if hi >= max(highs[i - pivot_bars: i + pivot_bars + 1]):
            supply.append({
                "type": "supply",
                "high": hi,
                "low":  hi - zone_h,
                "x_start": idx[i],
            })

        # Swing low → demand zone
        if lo <= min(lows[i - pivot_bars: i + pivot_bars + 1]):
            demand.append({
                "type": "demand",
                "high": lo + zone_h,
                "low":  lo,
                "x_start": idx[i],
            })

    def dedup(zones: list) -> list:
        """Keep most recent zones, drop those whose midpoint is within 0.15% of an already-kept zone."""
        out = []
        for z in reversed(zones):
            mid = (z["high"] + z["low"]) / 2
            if not any(abs(mid - (o["high"] + o["low"]) / 2) / mid < 0.0015 for o in out):
                out.append(z)
            if len(out) >= max_per_type:
                break
        return out

    return dedup(demand) + dedup(supply)


def _levels_key(symbol: str) -> str:
    return f"trade_levels_{symbol}"


def render_chart_panel(symbol: str, height: int = 500):
    ticker_sym = _TICKER_MAP.get(symbol, symbol)

    interval_key = f"chart_interval_{symbol}"
    if interval_key not in st.session_state:
        st.session_state[interval_key] = "5m"
    if _levels_key(symbol) not in st.session_state:
        st.session_state[_levels_key(symbol)] = []

    # Timeframe buttons
    btn_cols = st.columns(len(_INTERVAL_OPTIONS) + 2)
    with btn_cols[0]:
        st.markdown(
            '<span style="color:#5577aa;font-size:0.8em;line-height:2.4;">Timeframe:</span>',
            unsafe_allow_html=True,
        )
    for i, iv in enumerate(_INTERVAL_OPTIONS):
        with btn_cols[i + 1]:
            is_active = st.session_state[interval_key] == iv
            label = f"**{iv}**" if is_active else iv
            if st.button(label, key=f"btn_{symbol}_{iv}"):
                st.session_state[interval_key] = iv
                st.rerun()

    interval = st.session_state[interval_key]
    period   = _PERIOD_MAP[interval]

    with st.spinner(f"Loading {symbol} {interval} data…"):
        try:
            df = yf.download(
                ticker_sym,
                period=period,
                interval=interval,
                progress=False,
                auto_adjust=True,
            )
        except Exception as e:
            st.error(f"Could not load chart data: {e}")
            return

    if df is None or df.empty:
        st.warning(f"No chart data returned for {symbol}. Market may be closed.")
        return

    if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.get_level_values(0)
    df = df.dropna(subset=["Open", "High", "Low", "Close"])

    fig = go.Figure()

    # ── Supply / demand zones (drawn first so candles sit on top) ────────────
    zones = _find_zones(df)
    x_end = df.index[-1]
    for zone in zones:
        if zone["type"] == "demand":
            fill  = "rgba(46,204,113,0.12)"
            border = "#2ecc71"
            label  = "Demand"
        else:
            fill  = "rgba(231,76,60,0.12)"
            border = "#e74c3c"
            label  = "Supply"

        fig.add_shape(
            type="rect",
            x0=zone["x_start"], x1=x_end,
            y0=zone["low"],     y1=zone["high"],
            fillcolor=fill,
            line=dict(color=border, width=0.8),
            xref="x", yref="y",
            layer="below",
        )
        fig.add_annotation(
            x=x_end,
            y=(zone["high"] + zone["low"]) / 2,
            text=f"<b>{label}</b>",
            showarrow=False,
            xanchor="right",
            font=dict(color=border, size=9),
            bgcolor="rgba(255,255,255,0.75)",
            borderpad=2,
        )

    # ── Candlesticks ─────────────────────────────────────────────────────────
    fig.add_trace(go.Candlestick(
        x=df.index,
        open=df["Open"], high=df["High"],
        low=df["Low"],   close=df["Close"],
        name=symbol,
        increasing_line_color="#2ecc71",
        decreasing_line_color="#e74c3c",
        increasing_fillcolor="#2ecc71",
        decreasing_fillcolor="#e74c3c",
    ))

    # ── VWAP ─────────────────────────────────────────────────────────────────
    if interval in ("5m", "15m", "1h"):
        vwap = _compute_vwap(df)
        fig.add_trace(go.Scatter(
            x=df.index, y=vwap,
            mode="lines", name="VWAP",
            line=dict(color="#f39c12", width=1.5, dash="dot"),
        ))

    # ── EMA 20 ───────────────────────────────────────────────────────────────
    ema20 = df["Close"].ewm(span=20, adjust=False).mean()
    fig.add_trace(go.Scatter(
        x=df.index, y=ema20,
        mode="lines", name="EMA 20",
        line=dict(color="#1e40af", width=1.2),
    ))

    # ── Manual buy/sell level lines ──────────────────────────────────────────
    for lvl in st.session_state[_levels_key(symbol)]:
        color = "#2ecc71" if lvl["direction"] == "Buy" else "#e74c3c"
        label = f"{lvl['direction']} {lvl['price']:.2f}"
        if lvl.get("note"):
            label += f"  {lvl['note']}"
        fig.add_shape(
            type="line",
            x0=df.index[0], x1=x_end,
            y0=lvl["price"], y1=lvl["price"],
            line=dict(color=color, width=1.5, dash="dash"),
            xref="x", yref="y",
        )
        fig.add_annotation(
            x=x_end, y=lvl["price"],
            text=label, showarrow=False,
            xanchor="right",
            font=dict(color=color, size=10),
            bgcolor="rgba(255,255,255,0.8)",
            borderpad=2,
        )

    fig.update_layout(
        height=height,
        margin=dict(l=0, r=0, t=10, b=0),
        paper_bgcolor="#f5f8ff",
        plot_bgcolor="#ffffff",
        font=dict(color="#0a1428", size=11),
        xaxis=dict(
            gridcolor="#e8eef8", showgrid=True,
            rangeslider=dict(visible=False), type="date",
        ),
        yaxis=dict(gridcolor="#e8eef8", showgrid=True, side="right"),
        legend=dict(
            orientation="h", yanchor="bottom", y=1.01, xanchor="left", x=0,
            font=dict(size=10), bgcolor="rgba(0,0,0,0)",
        ),
        hovermode="x unified",
    )

    st.plotly_chart(fig, use_container_width=True, config={
        "displayModeBar": True,
        "modeBarButtonsToRemove": ["select2d", "lasso2d"],
        "displaylogo": False,
    })

    # ── Zone count badge ─────────────────────────────────────────────────────
    d_count = sum(1 for z in zones if z["type"] == "demand")
    s_count = sum(1 for z in zones if z["type"] == "supply")
    if zones:
        st.markdown(
            f'<div style="font-size:0.78em;color:#5577aa;margin-top:-8px;margin-bottom:4px;">'
            f'Auto-detected: '
            f'<span style="color:#2ecc71;font-weight:600;">{d_count} demand</span>'
            f' &nbsp;·&nbsp; '
            f'<span style="color:#e74c3c;font-weight:600;">{s_count} supply</span>'
            f' zones</div>',
            unsafe_allow_html=True,
        )

    # ── Manual buy/sell level input ──────────────────────────────────────────
    with st.expander("Add Buy / Sell Level", expanded=False):
        c1, c2, c3, c4 = st.columns([1, 1, 2, 1])
        with c1:
            direction = st.selectbox("Direction", ["Buy", "Sell"],
                                     key=f"lvl_dir_{symbol}")
        with c2:
            price_val = st.number_input("Price", value=0.00, format="%.2f",
                                        step=0.01, key=f"lvl_price_{symbol}")
        with c3:
            note = st.text_input("Note (optional)", value="",
                                 placeholder="e.g. VWAP reclaim",
                                 key=f"lvl_note_{symbol}")
        with c4:
            st.markdown('<div style="margin-top:24px;">', unsafe_allow_html=True)
            if st.button("Add", key=f"lvl_add_{symbol}"):
                if price_val > 0:
                    st.session_state[_levels_key(symbol)].append({
                        "direction": direction,
                        "price": price_val,
                        "note": note.strip(),
                    })
                    st.rerun()
            st.markdown('</div>', unsafe_allow_html=True)

        levels = st.session_state[_levels_key(symbol)]
        if levels:
            st.markdown(
                '<div style="font-size:0.8em;color:#5577aa;margin-top:4px;">Active levels:</div>',
                unsafe_allow_html=True,
            )
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
