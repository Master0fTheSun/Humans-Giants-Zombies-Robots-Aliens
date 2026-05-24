"""
Plotly candlestick chart with drawing tools:
  • Plotly built-in drawline (modebar)
  • Fibonacci retracement (form-based)
  • Trend line / horizontal line (form-based)
  • Long / Short position tool (form-based)
"""

import streamlit as st
import pandas as pd
import numpy as np
import plotly.graph_objects as go
import yfinance as yf

_TICKER_MAP = {"MCL": "CL=F", "MES": "ES=F"}
_INTERVAL_OPTIONS = ["5m", "15m", "30m", "1h", "1d"]
_PERIOD_MAP = {"5m": "5d", "15m": "5d", "30m": "1mo", "1h": "1mo", "1d": "6mo"}

_FIB_LEVELS = [
    (0.000, "#95a5a6", "0%"),
    (0.236, "#3498db", "23.6%"),
    (0.382, "#2ecc71", "38.2%"),
    (0.500, "#f39c12", "50%"),
    (0.618, "#e74c3c", "61.8%"),
    (0.786, "#9b59b6", "78.6%"),
    (1.000, "#95a5a6", "100%"),
]


# ── Data ─────────────────────────────────────────────────────────────────────

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


def _vwap_daily(df: pd.DataFrame) -> pd.Series:
    typical = (df["High"] + df["Low"] + df["Close"]) / 3
    tv = typical * df["Volume"]
    try:
        dates = df.index.normalize()
    except Exception:
        dates = pd.Series(df.index.date, index=df.index)
    return (tv.groupby(dates).cumsum() /
            df["Volume"].groupby(dates).cumsum().replace(0, np.nan))


# ── Session state helpers ─────────────────────────────────────────────────────

def _dk(symbol, key):
    return f"draw_{symbol}_{key}"


def _init_state(symbol):
    for k, v in [("fibs", []), ("trendlines", []), ("positions", [])]:
        if _dk(symbol, k) not in st.session_state:
            st.session_state[_dk(symbol, k)] = v


# ── Chart traces for drawings ─────────────────────────────────────────────────

def _add_fibs(fig, symbol, x0, x1):
    for fib in st.session_state[_dk(symbol, "fibs")]:
        rng  = fib["high"] - fib["low"]
        base = fib["low"] if fib["direction"] == "Up" else fib["high"]
        sign = 1 if fib["direction"] == "Up" else -1
        for lvl, color, label in _FIB_LEVELS:
            price = base + sign * lvl * rng
            fig.add_trace(go.Scatter(
                x=[x0, x1], y=[price, price],
                mode="lines+text",
                text=["", f"  {label}  {price:.2f}"],
                textposition="middle right",
                textfont=dict(color=color, size=9),
                line=dict(color=color, width=1, dash="dot"),
                showlegend=False,
                hovertemplate=f"Fib {label}: {price:.2f}<extra></extra>",
            ))


def _add_trendlines(fig, symbol, x0, x1):
    for tl in st.session_state[_dk(symbol, "trendlines")]:
        p1 = tl["price1"]
        p2 = tl["price1"] if tl["horizontal"] else tl["price2"]
        fig.add_trace(go.Scatter(
            x=[x0, x1], y=[p1, p2],
            mode="lines",
            line=dict(color=tl["color"], width=1.5),
            showlegend=False,
            hovertemplate=f"Line {p1:.2f}→{p2:.2f}<extra></extra>",
        ))


def _add_positions(fig, symbol, x0, x1):
    for pos in st.session_state[_dk(symbol, "positions")]:
        entry  = pos["entry"]
        stop   = pos["stop"]
        target = pos["target"]
        is_long = pos["direction"] == "Long"

        # Risk zone (entry → stop)
        fig.add_trace(go.Scatter(
            x=[x0, x1, x1, x0, x0],
            y=[entry, entry, stop, stop, entry],
            fill="toself",
            fillcolor="rgba(231,76,60,0.15)",
            line=dict(color="#e74c3c", width=0.8),
            mode="lines", showlegend=False, hoverinfo="skip",
        ))
        # Reward zone (entry → target)
        fig.add_trace(go.Scatter(
            x=[x0, x1, x1, x0, x0],
            y=[entry, entry, target, target, entry],
            fill="toself",
            fillcolor="rgba(46,204,113,0.15)",
            line=dict(color="#2ecc71", width=0.8),
            mode="lines", showlegend=False, hoverinfo="skip",
        ))
        # Entry line
        fig.add_trace(go.Scatter(
            x=[x0, x1], y=[entry, entry],
            mode="lines+text",
            text=["", f"  {'▲ Long' if is_long else '▼ Short'} entry {entry:.2f}"],
            textposition="middle right",
            textfont=dict(color="#f39c12", size=9),
            line=dict(color="#f39c12", width=1.5),
            showlegend=False,
        ))
        # Stop line
        fig.add_trace(go.Scatter(
            x=[x0, x1], y=[stop, stop],
            mode="lines+text",
            text=["", f"  SL {stop:.2f}"],
            textposition="middle right",
            textfont=dict(color="#e74c3c", size=9),
            line=dict(color="#e74c3c", width=1, dash="dash"),
            showlegend=False,
        ))
        # Target line
        fig.add_trace(go.Scatter(
            x=[x0, x1], y=[target, target],
            mode="lines+text",
            text=["", f"  TP {target:.2f}"],
            textposition="middle right",
            textfont=dict(color="#2ecc71", size=9),
            line=dict(color="#2ecc71", width=1, dash="dash"),
            showlegend=False,
        ))


# ── Drawing tools UI ──────────────────────────────────────────────────────────

def _drawing_tools_ui(symbol):
    st.markdown(
        '<div style="font-size:0.8em;color:#5577aa;margin-bottom:6px;">'
        '💡 <b>Free draw</b>: use the <b>Draw Line</b> button in the chart toolbar above. '
        'Structured tools below.</div>',
        unsafe_allow_html=True,
    )

    tab_fib, tab_tl, tab_pos = st.tabs(["📐 Fibonacci", "📏 Trend Line", "📊 Position"])

    # ── Fibonacci ─────────────────────────────────────────────────────────
    with tab_fib:
        f1, f2, f3, f4 = st.columns([1, 1, 1, 1])
        with f1:
            fib_high = st.number_input("High", value=0.00, format="%.2f",
                                       step=0.01, key=f"fib_high_{symbol}")
        with f2:
            fib_low = st.number_input("Low", value=0.00, format="%.2f",
                                      step=0.01, key=f"fib_low_{symbol}")
        with f3:
            fib_dir = st.selectbox("Direction", ["Up", "Down"],
                                   key=f"fib_dir_{symbol}")
        with f4:
            st.markdown('<div style="margin-top:24px;">', unsafe_allow_html=True)
            if st.button("Draw", key=f"fib_add_{symbol}"):
                if fib_high > 0 and fib_low > 0 and fib_high != fib_low:
                    st.session_state[_dk(symbol, "fibs")].append(
                        {"high": max(fib_high, fib_low),
                         "low":  min(fib_high, fib_low),
                         "direction": fib_dir})
                    st.rerun()
            st.markdown('</div>', unsafe_allow_html=True)

        if st.session_state[_dk(symbol, "fibs")]:
            if st.button("Clear Fibs", key=f"fib_clear_{symbol}"):
                st.session_state[_dk(symbol, "fibs")] = []
                st.rerun()

    # ── Trend Line ────────────────────────────────────────────────────────
    with tab_tl:
        st.caption("Enter two prices. Check 'Horizontal' to lock flat (like Shift in TradingView).")
        t1, t2, t3, t4, t5 = st.columns([1, 1, 1, 1, 1])
        with t1:
            tl_p1 = st.number_input("Price 1", value=0.00, format="%.2f",
                                    step=0.01, key=f"tl_p1_{symbol}")
        with t2:
            tl_p2 = st.number_input("Price 2", value=0.00, format="%.2f",
                                    step=0.01, key=f"tl_p2_{symbol}")
        with t3:
            tl_color = st.selectbox("Color", ["White", "Yellow", "Cyan", "Orange"],
                                    key=f"tl_color_{symbol}")
            color_map = {"White": "#ffffff", "Yellow": "#f1c40f",
                         "Cyan": "#00bcd4", "Orange": "#f39c12"}
        with t4:
            tl_horiz = st.checkbox("Horizontal\n(Shift ⇧)", key=f"tl_horiz_{symbol}")
        with t5:
            st.markdown('<div style="margin-top:24px;">', unsafe_allow_html=True)
            if st.button("Draw", key=f"tl_add_{symbol}"):
                if tl_p1 > 0:
                    st.session_state[_dk(symbol, "trendlines")].append(
                        {"price1": tl_p1, "price2": tl_p2,
                         "horizontal": tl_horiz,
                         "color": color_map[tl_color]})
                    st.rerun()
            st.markdown('</div>', unsafe_allow_html=True)

        if st.session_state[_dk(symbol, "trendlines")]:
            if st.button("Clear Lines", key=f"tl_clear_{symbol}"):
                st.session_state[_dk(symbol, "trendlines")] = []
                st.rerun()

    # ── Position Tool ─────────────────────────────────────────────────────
    with tab_pos:
        st.caption("Draws risk (red) and reward (green) zones with entry, SL, and TP lines.")
        p1, p2, p3, p4, p5 = st.columns([1, 1, 1, 1, 1])
        with p1:
            pos_dir = st.selectbox("Direction", ["Long", "Short"],
                                   key=f"pos_dir_{symbol}")
        with p2:
            pos_entry = st.number_input("Entry", value=0.00, format="%.2f",
                                        step=0.01, key=f"pos_entry_{symbol}")
        with p3:
            pos_stop = st.number_input("Stop", value=0.00, format="%.2f",
                                       step=0.01, key=f"pos_stop_{symbol}")
        with p4:
            pos_target = st.number_input("Target", value=0.00, format="%.2f",
                                         step=0.01, key=f"pos_target_{symbol}")
        with p5:
            st.markdown('<div style="margin-top:24px;">', unsafe_allow_html=True)
            if st.button("Draw", key=f"pos_add_{symbol}"):
                if pos_entry > 0 and pos_stop > 0 and pos_target > 0:
                    risk   = abs(pos_entry - pos_stop)
                    reward = abs(pos_target - pos_entry)
                    rr     = reward / risk if risk > 0 else 0
                    st.session_state[_dk(symbol, "positions")].append(
                        {"direction": pos_dir, "entry": pos_entry,
                         "stop": pos_stop, "target": pos_target, "rr": rr})
                    st.rerun()
            st.markdown('</div>', unsafe_allow_html=True)

        positions = st.session_state[_dk(symbol, "positions")]
        if positions:
            for i, pos in enumerate(positions):
                clr = "#2ecc71" if pos["direction"] == "Long" else "#e74c3c"
                c1, c2 = st.columns([5, 1])
                with c1:
                    st.markdown(
                        f'<span style="color:{clr};font-size:0.85em;font-weight:600;">'
                        f'{pos["direction"]}</span>'
                        f'<span style="color:#5577aa;font-size:0.82em;"> '
                        f'Entry {pos["entry"]:.2f} · SL {pos["stop"]:.2f} '
                        f'· TP {pos["target"]:.2f} · R:R 1:{pos["rr"]:.1f}</span>',
                        unsafe_allow_html=True,
                    )
                with c2:
                    if st.button("✕", key=f"pos_rm_{symbol}_{i}"):
                        st.session_state[_dk(symbol, "positions")].pop(i)
                        st.rerun()


# ── Main render ───────────────────────────────────────────────────────────────

def render_chart_panel(symbol: str, height: int = 500):
    ticker = _TICKER_MAP.get(symbol, symbol)
    _init_state(symbol)

    iv_key = f"chart_interval_{symbol}"
    if iv_key not in st.session_state:
        st.session_state[iv_key] = "5m"

    # Timeframe buttons
    cols = st.columns(len(_INTERVAL_OPTIONS) + 2)
    with cols[0]:
        st.markdown(
            '<span style="color:#5577aa;font-size:0.8em;line-height:2.4;">Timeframe:</span>',
            unsafe_allow_html=True,
        )
    for i, iv in enumerate(_INTERVAL_OPTIONS):
        with cols[i + 1]:
            if st.button(f"**{iv}**" if st.session_state[iv_key] == iv else iv,
                         key=f"btn_{symbol}_{iv}"):
                st.session_state[iv_key] = iv
                st.rerun()

    interval = st.session_state[iv_key]
    intraday = interval in ("5m", "15m", "30m", "1h")

    with st.spinner(f"Loading {symbol}…"):
        df = _download(ticker, _PERIOD_MAP[interval], interval)

    if df.empty:
        st.warning(f"No data for {symbol}. Market may be closed.")
        return

    x0, x1 = df.index[0], df.index[-1]
    fig = go.Figure()

    # ── Drawings (below candles) ──────────────────────────────────────────
    _add_fibs(fig, symbol, x0, x1)
    _add_trendlines(fig, symbol, x0, x1)
    _add_positions(fig, symbol, x0, x1)

    # ── Candlesticks ──────────────────────────────────────────────────────
    fig.add_trace(go.Candlestick(
        x=df.index, open=df["Open"], high=df["High"],
        low=df["Low"], close=df["Close"], name=symbol,
        increasing_line_color="#2ecc71", decreasing_line_color="#e74c3c",
        increasing_fillcolor="#2ecc71",  decreasing_fillcolor="#e74c3c",
    ))

    # EMA 20
    ema20 = df["Close"].ewm(span=20, adjust=False).mean()
    fig.add_trace(go.Scatter(
        x=df.index, y=ema20, mode="lines", name="EMA 20",
        line=dict(color="#1e40af", width=1.3),
    ))

    # VWAP
    if intraday:
        vwap = _vwap_daily(df)
        fig.add_trace(go.Scatter(
            x=df.index, y=vwap, mode="lines", name="VWAP",
            line=dict(color="#f39c12", width=1.4, dash="dot"),
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
        newshape=dict(line=dict(color="#f1c40f", width=1.5)),
    )

    st.plotly_chart(fig, use_container_width=True, config={
        "displayModeBar": True,
        "modeBarButtonsToAdd": ["drawline", "eraseshape"],
        "modeBarButtonsToRemove": ["select2d", "lasso2d"],
        "displaylogo": False,
        "scrollZoom": True,
    })

    # ── Drawing tools panel ───────────────────────────────────────────────
    with st.expander("🖊 Drawing Tools", expanded=False):
        _drawing_tools_ui(symbol)
