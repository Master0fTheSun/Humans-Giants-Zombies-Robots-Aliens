"""
Plotly candlestick chart with interactive drawing tools.
  • Fibonacci retracement  — click HIGH then LOW on the chart
  • Long / Short position  — click ENTRY then STOP, target auto 2:1
  • Trend line             — form-based with horizontal lock
  • Free draw line         — Plotly built-in modebar tool
All drawings are editable (price inputs) and deletable (✕ button).
"""

import streamlit as st
import pandas as pd
import numpy as np
import plotly.graph_objects as go
import yfinance as yf

try:
    from streamlit_plotly_events import plotly_events
    _HAS_EVENTS = True
except ImportError:
    _HAS_EVENTS = False

_TICKER_MAP = {"MCL": "CL=F", "MES": "ES=F"}
_INTERVAL_OPTIONS = ["5m", "15m", "30m", "1h", "1d"]
_PERIOD_MAP = {"5m": "5d", "15m": "5d", "30m": "1mo", "1h": "1mo", "1d": "6mo"}

_FIB_LEVELS = [
    (0.000, "#636e72", "0%"),
    (0.236, "#3498db", "23.6%"),
    (0.382, "#2ecc71", "38.2%"),
    (0.500, "#f39c12", "50%"),
    (0.618, "#e74c3c", "61.8%"),
    (0.786, "#9b59b6", "78.6%"),
    (1.000, "#636e72", "100%"),
]

_STATUS = {
    "fib1":      "📐 Click the HIGH on the chart",
    "fib2":      "📐 Now click the LOW on the chart",
    "pos_entry": "📊 Click the ENTRY price on the chart",
    "pos_stop":  "📊 Click the STOP price on the chart",
}


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


# ── State ─────────────────────────────────────────────────────────────────────

def _init(s):
    for k, v in [
        (f"mode_{s}",      "none"),
        (f"temp_{s}",      {}),
        (f"fibs_{s}",      []),
        (f"positions_{s}", []),
        (f"trendlines_{s}", []),
        (f"pos_dir_{s}",   "Long"),
    ]:
        if k not in st.session_state:
            st.session_state[k] = v


def _mode(s):    return st.session_state[f"mode_{s}"]
def _setmode(s, m): st.session_state[f"mode_{s}"] = m
def _temp(s):    return st.session_state[f"temp_{s}"]


# ── Click handler ─────────────────────────────────────────────────────────────

def _handle_click(symbol: str, y: float):
    m = _mode(symbol)
    t = _temp(symbol)

    if m == "fib1":
        t["pt1"] = y
        _setmode(symbol, "fib2")

    elif m == "fib2":
        pt1 = t.get("pt1", y)
        st.session_state[f"fibs_{symbol}"].append(
            {"high": max(pt1, y), "low": min(pt1, y)})
        st.session_state[f"temp_{symbol}"] = {}
        _setmode(symbol, "none")

    elif m == "pos_entry":
        t["entry"] = y
        _setmode(symbol, "pos_stop")

    elif m == "pos_stop":
        entry     = t.get("entry", y)
        direction = st.session_state[f"pos_dir_{symbol}"]
        risk      = abs(entry - y)
        target    = (entry + risk * 2) if direction == "Long" else (entry - risk * 2)
        st.session_state[f"positions_{symbol}"].append({
            "direction": direction,
            "entry":  entry,
            "stop":   y,
            "target": target,
        })
        st.session_state[f"temp_{symbol}"] = {}
        _setmode(symbol, "none")


# ── Chart drawing helpers ─────────────────────────────────────────────────────

def _draw_fibs(fig, symbol, x0, x1):
    for fib in st.session_state[f"fibs_{symbol}"]:
        rng = fib["high"] - fib["low"]
        for lvl, color, label in _FIB_LEVELS:
            price = fib["low"] + (1 - lvl) * rng  # draw from high down
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


def _draw_positions(fig, symbol, x0, x1):
    for pos in st.session_state[f"positions_{symbol}"]:
        e, sl, tp = pos["entry"], pos["stop"], pos["target"]
        is_long   = pos["direction"] == "Long"
        # Risk zone
        fig.add_trace(go.Scatter(
            x=[x0, x1, x1, x0, x0], y=[e, e, sl, sl, e],
            fill="toself", fillcolor="rgba(231,76,60,0.13)",
            line=dict(color="#e74c3c", width=0.8),
            mode="lines", showlegend=False, hoverinfo="skip",
        ))
        # Reward zone
        fig.add_trace(go.Scatter(
            x=[x0, x1, x1, x0, x0], y=[e, e, tp, tp, e],
            fill="toself", fillcolor="rgba(46,204,113,0.13)",
            line=dict(color="#2ecc71", width=0.8),
            mode="lines", showlegend=False, hoverinfo="skip",
        ))
        # Entry / SL / TP lines
        for price, color, lbl in [(e, "#f39c12", f"{'▲ Long' if is_long else '▼ Short'} {e:.2f}"),
                                   (sl, "#e74c3c", f"SL {sl:.2f}"),
                                   (tp, "#2ecc71", f"TP {tp:.2f}")]:
            fig.add_trace(go.Scatter(
                x=[x0, x1], y=[price, price],
                mode="lines+text",
                text=["", f"  {lbl}"],
                textposition="middle right",
                textfont=dict(color=color, size=9),
                line=dict(color=color, width=1.4 if lbl.startswith(("▲", "▼")) else 1,
                          dash="solid" if lbl.startswith(("▲", "▼")) else "dash"),
                showlegend=False,
                hovertemplate=f"{lbl}<extra></extra>",
            ))


def _draw_trendlines(fig, symbol, x0, x1):
    for tl in st.session_state[f"trendlines_{symbol}"]:
        p2 = tl["price1"] if tl.get("horizontal") else tl["price2"]
        fig.add_trace(go.Scatter(
            x=[x0, x1], y=[tl["price1"], p2],
            mode="lines", line=dict(color=tl["color"], width=1.5),
            showlegend=False,
            hovertemplate=f"Line {tl['price1']:.2f}→{p2:.2f}<extra></extra>",
        ))


# ── Drawings management UI ────────────────────────────────────────────────────

def _manage_drawings(symbol):
    fibs  = st.session_state[f"fibs_{symbol}"]
    pos   = st.session_state[f"positions_{symbol}"]
    tls   = st.session_state[f"trendlines_{symbol}"]

    if not (fibs or pos or tls):
        return

    st.markdown('<div style="font-size:0.8em;color:#5577aa;margin-top:4px;'
                'margin-bottom:2px;">Active drawings:</div>', unsafe_allow_html=True)

    # Fibonacci — editable + deletable
    for i, fib in enumerate(fibs):
        c1, c2, c3, c4 = st.columns([2, 2, 1, 1])
        with c1:
            new_h = st.number_input("High", value=fib["high"], format="%.2f",
                                    step=0.01, key=f"fib_h_{symbol}_{i}",
                                    label_visibility="collapsed")
        with c2:
            new_l = st.number_input("Low", value=fib["low"], format="%.2f",
                                    step=0.01, key=f"fib_l_{symbol}_{i}",
                                    label_visibility="collapsed")
        with c3:
            st.markdown(f'<span style="color:#3498db;font-size:0.82em;">📐 Fib</span>',
                        unsafe_allow_html=True)
        with c4:
            if st.button("✕", key=f"fib_rm_{symbol}_{i}"):
                fibs.pop(i); st.rerun()
        # Apply edits
        if new_h != fib["high"] or new_l != fib["low"]:
            fibs[i] = {"high": max(new_h, new_l), "low": min(new_h, new_l)}
            st.rerun()

    # Positions — editable + deletable
    for i, p in enumerate(pos):
        c1, c2, c3, c4, c5 = st.columns([1, 1, 1, 1, 1])
        clr = "#2ecc71" if p["direction"] == "Long" else "#e74c3c"
        with c1:
            st.markdown(f'<span style="color:{clr};font-size:0.82em;">'
                        f'{"▲" if p["direction"]=="Long" else "▼"} {p["direction"]}</span>',
                        unsafe_allow_html=True)
        with c2:
            p["entry"]  = st.number_input("Entry",  value=p["entry"],  format="%.2f",
                                          step=0.01, key=f"pos_e_{symbol}_{i}",
                                          label_visibility="collapsed")
        with c3:
            p["stop"]   = st.number_input("Stop",   value=p["stop"],   format="%.2f",
                                          step=0.01, key=f"pos_s_{symbol}_{i}",
                                          label_visibility="collapsed")
        with c4:
            p["target"] = st.number_input("Target", value=p["target"], format="%.2f",
                                          step=0.01, key=f"pos_t_{symbol}_{i}",
                                          label_visibility="collapsed")
        with c5:
            if st.button("✕", key=f"pos_rm_{symbol}_{i}"):
                pos.pop(i); st.rerun()

    # Trend lines — deletable
    for i, tl in enumerate(tls):
        c1, c2 = st.columns([5, 1])
        with c1:
            p2 = tl["price1"] if tl.get("horizontal") else tl["price2"]
            st.markdown(
                f'<span style="color:{tl["color"]};font-size:0.82em;">📏 Line '
                f'{tl["price1"]:.2f} → {p2:.2f}'
                f'{"  (H)" if tl.get("horizontal") else ""}</span>',
                unsafe_allow_html=True)
        with c2:
            if st.button("✕", key=f"tl_rm_{symbol}_{i}"):
                tls.pop(i); st.rerun()


# ── Main render ───────────────────────────────────────────────────────────────

def render_chart_panel(symbol: str, height: int = 500):
    ticker = _TICKER_MAP.get(symbol, symbol)
    _init(symbol)

    iv_key = f"chart_interval_{symbol}"
    if iv_key not in st.session_state:
        st.session_state[iv_key] = "5m"

    # Timeframe buttons
    cols = st.columns(len(_INTERVAL_OPTIONS) + 2)
    with cols[0]:
        st.markdown('<span style="color:#5577aa;font-size:0.8em;line-height:2.4;">Timeframe:</span>',
                    unsafe_allow_html=True)
    for i, iv in enumerate(_INTERVAL_OPTIONS):
        with cols[i + 1]:
            if st.button(f"**{iv}**" if st.session_state[iv_key] == iv else iv,
                         key=f"btn_{symbol}_{iv}"):
                st.session_state[iv_key] = iv
                st.rerun()

    interval = st.session_state[iv_key]
    intraday = interval in ("5m", "15m", "30m", "1h")
    mode     = _mode(symbol)

    with st.spinner(f"Loading {symbol}…"):
        df = _download(ticker, _PERIOD_MAP[interval], interval)

    if df.empty:
        st.warning(f"No data for {symbol}. Market may be closed.")
        return

    x0, x1 = df.index[0], df.index[-1]
    fig = go.Figure()

    # ── Drawings ──────────────────────────────────────────────────────────
    _draw_fibs(fig, symbol, x0, x1)
    _draw_positions(fig, symbol, x0, x1)
    _draw_trendlines(fig, symbol, x0, x1)

    # ── Invisible hit targets for click capture ───────────────────────────
    for y_col in ["High", "Low", "Open", "Close"]:
        fig.add_trace(go.Scatter(
            x=df.index, y=df[y_col],
            mode="markers",
            marker=dict(size=6, opacity=0, color="rgba(0,0,0,0)"),
            showlegend=False,
            hovertemplate="%{y:.2f}<extra></extra>",
            name=f"_hit_{y_col}",
        ))

    # ── Candlesticks ──────────────────────────────────────────────────────
    fig.add_trace(go.Candlestick(
        x=df.index, open=df["Open"], high=df["High"],
        low=df["Low"], close=df["Close"], name=symbol,
        increasing_line_color="#2ecc71", decreasing_line_color="#e74c3c",
        increasing_fillcolor="#2ecc71",  decreasing_fillcolor="#e74c3c",
    ))

    # EMA 20
    ema20 = df["Close"].ewm(span=20, adjust=False).mean()
    fig.add_trace(go.Scatter(x=df.index, y=ema20, mode="lines", name="EMA 20",
                             line=dict(color="#1e40af", width=1.3)))

    # VWAP
    if intraday:
        vwap = _vwap_daily(df)
        fig.add_trace(go.Scatter(x=df.index, y=vwap, mode="lines", name="VWAP",
                                 line=dict(color="#f39c12", width=1.4, dash="dot")))

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

    # ── Mode status banner ────────────────────────────────────────────────
    if mode in _STATUS:
        st.info(_STATUS[mode] + "   —   or click **Cancel** below to exit")

    # ── Render chart (events-enabled when tool is active) ─────────────────
    if _HAS_EVENTS:
        clicked = plotly_events(
            fig, click_event=True,
            override_height=height + 20,
            override_width="100%",
            key=f"chart_ev_{symbol}",
        )
        if clicked and mode != "none":
            _handle_click(symbol, clicked[0]["y"])
            st.rerun()
    else:
        st.plotly_chart(fig, use_container_width=True, config={
            "displayModeBar": True,
            "modeBarButtonsToAdd": ["drawline", "eraseshape"],
            "modeBarButtonsToRemove": ["select2d", "lasso2d"],
            "displaylogo": False,
            "scrollZoom": True,
        })

    # ── Drawing toolbar ───────────────────────────────────────────────────
    st.markdown("")
    tool_cols = st.columns([1, 1, 1, 1, 1, 1, 1])

    with tool_cols[0]:
        if st.button("📐 Fib", key=f"start_fib_{symbol}",
                     help="Click HIGH then LOW on chart"):
            _setmode(symbol, "fib1")
            st.rerun()

    with tool_cols[1]:
        if st.button("▲ Long", key=f"start_long_{symbol}",
                     help="Click entry then stop on chart"):
            st.session_state[f"pos_dir_{symbol}"] = "Long"
            _setmode(symbol, "pos_entry")
            st.rerun()

    with tool_cols[2]:
        if st.button("▼ Short", key=f"start_short_{symbol}",
                     help="Click entry then stop on chart"):
            st.session_state[f"pos_dir_{symbol}"] = "Short"
            _setmode(symbol, "pos_entry")
            st.rerun()

    with tool_cols[3]:
        if mode != "none" and st.button("✕ Cancel", key=f"cancel_{symbol}"):
            _setmode(symbol, "none")
            st.session_state[f"temp_{symbol}"] = {}
            st.rerun()

    # Trend line (form-based — user liked this)
    with st.expander("📏 Trend Line / Horizontal", expanded=False):
        t1, t2, t3, t4, t5 = st.columns([1, 1, 1, 1, 1])
        with t1:
            tl_p1 = st.number_input("Price 1", value=0.00, format="%.2f",
                                    step=0.01, key=f"tl_p1_{symbol}",
                                    label_visibility="collapsed")
        with t2:
            tl_p2 = st.number_input("Price 2", value=0.00, format="%.2f",
                                    step=0.01, key=f"tl_p2_{symbol}",
                                    label_visibility="collapsed")
        with t3:
            tl_color = st.selectbox("", ["White", "Yellow", "Cyan", "Orange"],
                                    key=f"tl_col_{symbol}",
                                    label_visibility="collapsed")
            cmap = {"White": "#bdc3c7", "Yellow": "#f1c40f",
                    "Cyan": "#00bcd4", "Orange": "#f39c12"}
        with t4:
            tl_horiz = st.checkbox("Horizontal ⇧", key=f"tl_h_{symbol}")
        with t5:
            if st.button("Draw", key=f"tl_add_{symbol}"):
                if tl_p1 > 0:
                    st.session_state[f"trendlines_{symbol}"].append(
                        {"price1": tl_p1, "price2": tl_p2,
                         "horizontal": tl_horiz, "color": cmap[tl_color]})
                    st.rerun()

    # Manage existing drawings
    _manage_drawings(symbol)
