"""
Plotly candlestick chart with drawing toolbar above the chart.

Modebar (top-right of chart): zoom, pan, drawline, freehand, rectangle,
  circle, eraser — all native Plotly interactive tools.

Toolbar row (above chart): Fibonacci | Position | Trend Line | Clear All
  Click a tool to open its input form inline. Click Draw to add to chart.
"""

import streamlit as st
import pandas as pd
import numpy as np
import plotly.graph_objects as go
import yfinance as yf

_TICKER_MAP      = {"MCL": "CL=F", "MES": "ES=F"}
_INTERVAL_OPTIONS = ["5m", "15m", "30m", "1h", "1d"]
_PERIOD_MAP      = {"5m": "5d", "15m": "5d", "30m": "1mo", "1h": "1mo", "1d": "6mo"}

_FIB_LEVELS = [
    (0.000, "#636e72", "0%"),
    (0.236, "#3498db", "23.6%"),
    (0.382, "#2ecc71", "38.2%"),
    (0.500, "#f39c12", "50%"),
    (0.618, "#e74c3c", "61.8%"),
    (0.786, "#9b59b6", "78.6%"),
    (1.000, "#636e72", "100%"),
]

_COLOR_MAP = {
    "Yellow": "#f1c40f",
    "White":  "#bdc3c7",
    "Cyan":   "#00bcd4",
    "Orange": "#f39c12",
    "Red":    "#e74c3c",
    "Green":  "#2ecc71",
}


# ── Data ──────────────────────────────────────────────────────────────────────

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


# ── State init ────────────────────────────────────────────────────────────────

def _init(s):
    defaults = {
        f"fibs_{s}":            [],
        f"positions_{s}":       [],
        f"trendlines_{s}":      [],
        f"active_tool_{s}":     None,
        f"chart_interval_{s}":  "5m",
        f"fi_gen_{s}":          0,   # incremented on add → resets form inputs
        f"po_gen_{s}":          0,
        f"tl_gen_{s}":          0,
    }
    for k, v in defaults.items():
        if k not in st.session_state:
            st.session_state[k] = v


# ── Drawing helpers ───────────────────────────────────────────────────────────

def _draw_fibs(fig, symbol, x0, x1):
    for fib in st.session_state[f"fibs_{symbol}"]:
        rng = fib["high"] - fib["low"]
        for lvl, color, label in _FIB_LEVELS:
            price = fib["low"] + (1 - lvl) * rng
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
        is_long = pos["direction"] == "Long"
        fig.add_trace(go.Scatter(
            x=[x0, x1, x1, x0, x0], y=[e, e, sl, sl, e],
            fill="toself", fillcolor="rgba(231,76,60,0.13)",
            line=dict(color="#e74c3c", width=0.8),
            mode="lines", showlegend=False, hoverinfo="skip",
        ))
        fig.add_trace(go.Scatter(
            x=[x0, x1, x1, x0, x0], y=[e, e, tp, tp, e],
            fill="toself", fillcolor="rgba(46,204,113,0.13)",
            line=dict(color="#2ecc71", width=0.8),
            mode="lines", showlegend=False, hoverinfo="skip",
        ))
        for price, color, lbl in [
            (e,  "#f39c12", f"{'▲ Long' if is_long else '▼ Short'} {e:.2f}"),
            (sl, "#e74c3c", f"SL {sl:.2f}"),
            (tp, "#2ecc71", f"TP {tp:.2f}"),
        ]:
            fig.add_trace(go.Scatter(
                x=[x0, x1], y=[price, price],
                mode="lines+text",
                text=["", f"  {lbl}"],
                textposition="middle right",
                textfont=dict(color=color, size=9),
                line=dict(color=color,
                          width=1.4 if "Long" in lbl or "Short" in lbl else 1,
                          dash="solid" if "Long" in lbl or "Short" in lbl else "dash"),
                showlegend=False,
                hovertemplate=f"{lbl}<extra></extra>",
            ))


def _draw_trendlines(fig, symbol, x0, x1):
    for tl in st.session_state[f"trendlines_{symbol}"]:
        p2 = tl["price1"] if tl.get("horizontal") else tl["price2"]
        fig.add_trace(go.Scatter(
            x=[x0, x1], y=[tl["price1"], p2],
            mode="lines",
            line=dict(color=tl["color"], width=1.5),
            showlegend=False,
            hovertemplate=f"Line {tl['price1']:.2f}→{p2:.2f}<extra></extra>",
        ))


# ── Active drawings panel (below chart) ──────────────────────────────────────

def _drawings_panel(symbol):
    fibs = st.session_state[f"fibs_{symbol}"]
    pos  = st.session_state[f"positions_{symbol}"]
    tls  = st.session_state[f"trendlines_{symbol}"]
    if not (fibs or pos or tls):
        return

    st.markdown(
        '<div style="font-size:0.78em;color:#5577aa;font-weight:600;'
        'margin:6px 0 3px 0;">Active Drawings</div>',
        unsafe_allow_html=True,
    )

    for i, fib in enumerate(list(fibs)):
        c1, c2, c3, c4 = st.columns([1.8, 2, 2, 0.4])
        with c1:
            st.markdown('<span style="color:#3498db;font-size:0.8em;">📐 Fib</span>',
                        unsafe_allow_html=True)
        with c2:
            nh = st.number_input("H", value=fib["high"], format="%.2f", step=0.01,
                                 key=f"fh_{symbol}_{i}", label_visibility="collapsed")
        with c3:
            nl = st.number_input("L", value=fib["low"], format="%.2f", step=0.01,
                                 key=f"fl_{symbol}_{i}", label_visibility="collapsed")
        with c4:
            if st.button("✕", key=f"frm_{symbol}_{i}"):
                fibs.pop(i); st.rerun()
        if nh != fib["high"] or nl != fib["low"]:
            fibs[i] = {"high": max(nh, nl), "low": min(nh, nl)}
            st.rerun()

    for i, p in enumerate(list(pos)):
        clr = "#2ecc71" if p["direction"] == "Long" else "#e74c3c"
        c1, c2, c3, c4, c5 = st.columns([1.2, 1.2, 1.2, 1.2, 0.4])
        with c1:
            st.markdown(
                f'<span style="color:{clr};font-size:0.8em;">'
                f'{"▲" if p["direction"]=="Long" else "▼"} {p["direction"]}</span>',
                unsafe_allow_html=True)
        with c2:
            p["entry"]  = st.number_input("E", value=p["entry"],  format="%.2f", step=0.01,
                                          key=f"pe_{symbol}_{i}", label_visibility="collapsed")
        with c3:
            p["stop"]   = st.number_input("S", value=p["stop"],   format="%.2f", step=0.01,
                                          key=f"ps_{symbol}_{i}", label_visibility="collapsed")
        with c4:
            p["target"] = st.number_input("T", value=p["target"], format="%.2f", step=0.01,
                                          key=f"pt_{symbol}_{i}", label_visibility="collapsed")
        with c5:
            if st.button("✕", key=f"prm_{symbol}_{i}"):
                pos.pop(i); st.rerun()

    for i, tl in enumerate(list(tls)):
        c1, c2 = st.columns([7, 0.4])
        with c1:
            if tl.get("horizontal"):
                label = f'📏 Horizontal at {tl["price1"]:.2f}'
            else:
                label = f'📏 {tl["price1"]:.2f} → {tl["price2"]:.2f}'
            st.markdown(
                f'<span style="color:{tl["color"]};font-size:0.8em;">{label}</span>',
                unsafe_allow_html=True)
        with c2:
            if st.button("✕", key=f"trm_{symbol}_{i}"):
                tls.pop(i); st.rerun()


# ── Main render ───────────────────────────────────────────────────────────────

def render_chart_panel(symbol: str, height: int = 520):
    ticker   = _TICKER_MAP.get(symbol, symbol)
    _init(symbol)
    iv_key   = f"chart_interval_{symbol}"
    tool_key = f"active_tool_{symbol}"

    # ── Timeframe row ──────────────────────────────────────────────────────
    tf_cols = st.columns([1.4] + [0.7] * len(_INTERVAL_OPTIONS))
    with tf_cols[0]:
        st.markdown(
            '<span style="color:#5577aa;font-size:0.8em;line-height:2.6;">Timeframe</span>',
            unsafe_allow_html=True)
    for i, iv in enumerate(_INTERVAL_OPTIONS):
        with tf_cols[i + 1]:
            selected = st.session_state[iv_key] == iv
            if st.button(f"**{iv}**" if selected else iv,
                         key=f"btn_{symbol}_{iv}", use_container_width=True):
                st.session_state[iv_key] = iv
                st.rerun()

    # ── Drawing toolbar row ────────────────────────────────────────────────
    st.markdown(
        '<div style="background:#eef3ff;border-radius:6px;padding:1px 8px 1px 8px;'
        'margin:4px 0 0 0;">'
        '<span style="color:#5577aa;font-size:0.76em;font-weight:600;">'
        'DRAWING TOOLS</span></div>',
        unsafe_allow_html=True,
    )

    tool_cols = st.columns([1.3, 1.3, 1.5, 0.2, 1])
    tool_defs = [
        ("📐 Fibonacci", "fib"),
        ("📊 Position",  "pos"),
        ("📏 Trend Line","tl"),
    ]
    for i, (label, tid) in enumerate(tool_defs):
        with tool_cols[i]:
            active = st.session_state[tool_key] == tid
            btn_label = f"**{label} ▾**" if active else label
            if st.button(btn_label, key=f"tool_{symbol}_{tid}",
                         use_container_width=True):
                st.session_state[tool_key] = None if active else tid
                st.rerun()
    with tool_cols[4]:
        if st.button("🗑 Clear All", key=f"clr_{symbol}",
                     use_container_width=True):
            for k in [f"fibs_{symbol}", f"positions_{symbol}", f"trendlines_{symbol}"]:
                st.session_state[k] = []
            st.session_state[tool_key] = None
            st.rerun()

    # ── Load data early (needed to pre-populate form defaults) ────────────
    interval = st.session_state[iv_key]
    intraday = interval in ("5m", "15m", "30m", "1h")

    with st.spinner(f"Loading {symbol}…"):
        df = _download(ticker, _PERIOD_MAP[interval], interval)

    if df.empty:
        st.warning(f"No data for {symbol}. Market may be closed.")
        return

    _chart_high  = round(float(df["High"].max()), 2)
    _chart_low   = round(float(df["Low"].min()),  2)
    _last_price  = round(float(df["Close"].iloc[-1]), 2)

    # ── Inline tool form / hint ────────────────────────────────────────────
    active_tool = st.session_state[tool_key]

    if active_tool == "fib":
        st.markdown(
            '<div style="background:#f0f4ff;border-left:3px solid #3498db;'
            'padding:6px 10px;border-radius:0 4px 4px 0;margin:4px 0;">'
            '<span style="color:#3498db;font-size:0.8em;font-weight:600;">'
            '📐 Fibonacci Retracement — adjust the pre-filled range or type custom prices</span></div>',
            unsafe_allow_html=True)
        _fg = st.session_state[f"fi_gen_{symbol}"]
        fc = st.columns([2, 2, 1.5, 3])
        with fc[0]:
            fh = st.number_input("Swing High", value=_chart_high, format="%.2f",
                                 step=0.01, key=f"fi_h_{symbol}_{_fg}",
                                 help="Top of the retracement range (swing high)")
        with fc[1]:
            fl = st.number_input("Swing Low", value=_chart_low, format="%.2f",
                                 step=0.01, key=f"fi_l_{symbol}_{_fg}",
                                 help="Bottom of the retracement range (swing low)")
        with fc[2]:
            st.write("")
            if st.button("✓ Add", key=f"fi_add_{symbol}",
                         use_container_width=True):
                if fh > 0 and fl > 0 and fh != fl:
                    st.session_state[f"fibs_{symbol}"].append(
                        {"high": max(fh, fl), "low": min(fh, fl)})
                    st.session_state[f"fi_gen_{symbol}"] += 1
                    st.session_state[tool_key] = None
                    st.rerun()
                else:
                    st.toast("Enter a valid high and low — both must be non-zero and different.", icon="⚠️")

    elif active_tool == "pos":
        st.markdown(
            '<div style="background:#f0f4ff;border-left:3px solid #2ecc71;'
            'padding:6px 10px;border-radius:0 4px 4px 0;margin:4px 0;">'
            '<span style="color:#2ecc71;font-size:0.8em;font-weight:600;">'
            '📊 Position — entry pre-filled from last price, set your stop & target</span></div>',
            unsafe_allow_html=True)
        _pg = st.session_state[f"po_gen_{symbol}"]
        pc = st.columns([1, 1.4, 1.4, 1.4, 1])
        with pc[0]:
            pd_ = st.selectbox("Direction", ["Long", "Short"],
                               key=f"po_d_{symbol}_{_pg}")
        with pc[1]:
            pe = st.number_input("Entry", value=_last_price, format="%.2f",
                                 step=0.01, key=f"po_e_{symbol}_{_pg}",
                                 help="Your planned entry price")
        with pc[2]:
            ps = st.number_input("Stop Loss", value=0.00, format="%.2f",
                                 step=0.01, key=f"po_s_{symbol}_{_pg}",
                                 help="Long: below entry  |  Short: above entry")
        with pc[3]:
            pt = st.number_input("Take Profit", value=0.00, format="%.2f",
                                 step=0.01, key=f"po_t_{symbol}_{_pg}",
                                 help="Long: above entry  |  Short: below entry")
        with pc[4]:
            st.write("")
            if st.button("✓ Add", key=f"po_add_{symbol}",
                         use_container_width=True):
                if pe > 0 and ps > 0 and pt > 0:
                    long_ok  = pd_ == "Long"  and ps < pe < pt
                    short_ok = pd_ == "Short" and pt < pe < ps
                    if not (long_ok or short_ok):
                        if pd_ == "Long":
                            st.toast("Long: Stop must be below Entry, Target above Entry.", icon="⚠️")
                        else:
                            st.toast("Short: Stop must be above Entry, Target below Entry.", icon="⚠️")
                    else:
                        risk   = abs(pe - ps)
                        reward = abs(pt - pe)
                        st.session_state[f"positions_{symbol}"].append({
                            "direction": pd_, "entry": pe, "stop": ps,
                            "target": pt, "rr": reward / risk if risk else 0,
                        })
                        st.session_state[f"po_gen_{symbol}"] += 1
                        st.session_state[tool_key] = None
                        st.rerun()
                else:
                    st.toast("Enter entry, stop, and target prices.", icon="⚠️")

    elif active_tool == "tl":
        st.markdown(
            '<div style="background:#f0f4ff;border-left:3px solid #f1c40f;'
            'padding:6px 10px;border-radius:0 4px 4px 0;margin:4px 0;">'
            '<span style="color:#b7960a;font-size:0.8em;font-weight:600;">'
            '📏 Trend Line active — click and drag directly on the chart to draw. '
            'Use the hand ✋ in the chart toolbar to switch back to pan mode. '
            'Erase with the ✕ eraser tool.</span></div>',
            unsafe_allow_html=True)

    # ── Build chart ────────────────────────────────────────────────────────

    x0, x1 = df.index[0], df.index[-1]
    fig = go.Figure()

    _draw_fibs(fig, symbol, x0, x1)
    _draw_positions(fig, symbol, x0, x1)
    _draw_trendlines(fig, symbol, x0, x1)

    fig.add_trace(go.Candlestick(
        x=df.index,
        open=df["Open"], high=df["High"],
        low=df["Low"],   close=df["Close"],
        name=symbol,
        increasing_line_color="#2ecc71", decreasing_line_color="#e74c3c",
        increasing_fillcolor="#2ecc71",  decreasing_fillcolor="#e74c3c",
    ))

    ema20 = df["Close"].ewm(span=20, adjust=False).mean()
    fig.add_trace(go.Scatter(
        x=df.index, y=ema20, mode="lines", name="EMA 20",
        line=dict(color="#1e40af", width=1.3),
    ))

    if intraday:
        vwap = _vwap_daily(df)
        fig.add_trace(go.Scatter(
            x=df.index, y=vwap, mode="lines", name="VWAP",
            line=dict(color="#f39c12", width=1.4, dash="dot"),
        ))

    drag_mode = "drawline" if active_tool == "tl" else "pan"

    fig.update_layout(
        height=height,
        margin=dict(l=0, r=0, t=10, b=0),
        paper_bgcolor="#f5f8ff",
        plot_bgcolor="#ffffff",
        font=dict(color="#0a1428", size=11),
        dragmode=drag_mode,
        xaxis=dict(
            gridcolor="#e8eef8", showgrid=True,
            rangeslider=dict(visible=False), type="date",
        ),
        yaxis=dict(gridcolor="#e8eef8", showgrid=True, side="right"),
        legend=dict(
            orientation="h", yanchor="bottom", y=1.01,
            xanchor="left", x=0, font=dict(size=10),
            bgcolor="rgba(0,0,0,0)",
        ),
        hovermode="x unified",
        newshape=dict(line=dict(color="#f1c40f", width=1.5)),
    )

    st.plotly_chart(fig, use_container_width=True, config={
        "displayModeBar":        True,
        "modeBarButtonsToAdd":   [
            "drawline",
            "drawopenpath",
            "drawcircle",
            "drawrect",
            "eraseshape",
        ],
        "modeBarButtonsToRemove": ["select2d", "lasso2d"],
        "displaylogo":           False,
        "scrollZoom":            True,
    })

    _drawings_panel(symbol)
