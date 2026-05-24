"""
Plotly candlestick chart with form-based drawing tools:
  • Free draw line  — Plotly built-in modebar
  • Fibonacci       — enter high / low, draws 7 levels
  • Trend line      — two prices + horizontal lock (Shift equivalent)
  • Long / Short    — entry / stop / target draws risk & reward zones
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
    (0.000, "#636e72", "0%"),
    (0.236, "#3498db", "23.6%"),
    (0.382, "#2ecc71", "38.2%"),
    (0.500, "#f39c12", "50%"),
    (0.618, "#e74c3c", "61.8%"),
    (0.786, "#9b59b6", "78.6%"),
    (1.000, "#636e72", "100%"),
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


# ── State ─────────────────────────────────────────────────────────────────────

def _init(s):
    for k, v in [
        (f"fibs_{s}",       []),
        (f"positions_{s}",  []),
        (f"trendlines_{s}", []),
    ]:
        if k not in st.session_state:
            st.session_state[k] = v


# ── Chart drawing ─────────────────────────────────────────────────────────────

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
                line=dict(color=color, width=1.4 if "Long" in lbl or "Short" in lbl else 1,
                          dash="solid" if "Long" in lbl or "Short" in lbl else "dash"),
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


# ── Drawings management ───────────────────────────────────────────────────────

def _manage_drawings(symbol):
    fibs = st.session_state[f"fibs_{symbol}"]
    pos  = st.session_state[f"positions_{symbol}"]
    tls  = st.session_state[f"trendlines_{symbol}"]
    if not (fibs or pos or tls):
        return

    st.markdown('<div style="font-size:0.8em;color:#5577aa;margin-top:6px;'
                'margin-bottom:2px;">Active drawings — edit prices to move, ✕ to delete:</div>',
                unsafe_allow_html=True)

    for i, fib in enumerate(list(fibs)):
        c1, c2, c3, c4 = st.columns([2, 2, 1, 1])
        with c1:
            nh = st.number_input("H", value=fib["high"], format="%.2f", step=0.01,
                                 key=f"fh_{symbol}_{i}", label_visibility="collapsed")
        with c2:
            nl = st.number_input("L", value=fib["low"], format="%.2f", step=0.01,
                                 key=f"fl_{symbol}_{i}", label_visibility="collapsed")
        with c3:
            st.markdown('<span style="color:#3498db;font-size:0.82em;">📐 Fib</span>',
                        unsafe_allow_html=True)
        with c4:
            if st.button("✕", key=f"frm_{symbol}_{i}"):
                fibs.pop(i); st.rerun()
        if nh != fib["high"] or nl != fib["low"]:
            fibs[i] = {"high": max(nh, nl), "low": min(nh, nl)}; st.rerun()

    for i, p in enumerate(list(pos)):
        clr = "#2ecc71" if p["direction"] == "Long" else "#e74c3c"
        c1, c2, c3, c4, c5 = st.columns([1, 1, 1, 1, 1])
        with c1:
            st.markdown(f'<span style="color:{clr};font-size:0.82em;">'
                        f'{"▲" if p["direction"]=="Long" else "▼"} {p["direction"]}</span>',
                        unsafe_allow_html=True)
        with c2:
            p["entry"]  = st.number_input("E", value=p["entry"],  format="%.2f",
                                          step=0.01, key=f"pe_{symbol}_{i}",
                                          label_visibility="collapsed")
        with c3:
            p["stop"]   = st.number_input("S", value=p["stop"],   format="%.2f",
                                          step=0.01, key=f"ps_{symbol}_{i}",
                                          label_visibility="collapsed")
        with c4:
            p["target"] = st.number_input("T", value=p["target"], format="%.2f",
                                          step=0.01, key=f"pt_{symbol}_{i}",
                                          label_visibility="collapsed")
        with c5:
            if st.button("✕", key=f"prm_{symbol}_{i}"):
                pos.pop(i); st.rerun()

    for i, tl in enumerate(list(tls)):
        c1, c2 = st.columns([5, 1])
        with c1:
            p2 = tl["price1"] if tl.get("horizontal") else tl["price2"]
            st.markdown(
                f'<span style="color:{tl["color"]};font-size:0.82em;">📏 '
                f'{tl["price1"]:.2f}→{p2:.2f}'
                f'{"  (H)" if tl.get("horizontal") else ""}</span>',
                unsafe_allow_html=True)
        with c2:
            if st.button("✕", key=f"trm_{symbol}_{i}"):
                tls.pop(i); st.rerun()


# ── Main render ───────────────────────────────────────────────────────────────

def render_chart_panel(symbol: str, height: int = 500):
    ticker = _TICKER_MAP.get(symbol, symbol)
    _init(symbol)

    iv_key = f"chart_interval_{symbol}"
    if iv_key not in st.session_state:
        st.session_state[iv_key] = "5m"

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

    with st.spinner(f"Loading {symbol}…"):
        df = _download(ticker, _PERIOD_MAP[interval], interval)

    if df.empty:
        st.warning(f"No data for {symbol}. Market may be closed.")
        return

    x0, x1 = df.index[0], df.index[-1]
    fig = go.Figure()

    _draw_fibs(fig, symbol, x0, x1)
    _draw_positions(fig, symbol, x0, x1)
    _draw_trendlines(fig, symbol, x0, x1)

    fig.add_trace(go.Candlestick(
        x=df.index, open=df["Open"], high=df["High"],
        low=df["Low"], close=df["Close"], name=symbol,
        increasing_line_color="#2ecc71", decreasing_line_color="#e74c3c",
        increasing_fillcolor="#2ecc71",  decreasing_fillcolor="#e74c3c",
    ))

    ema20 = df["Close"].ewm(span=20, adjust=False).mean()
    fig.add_trace(go.Scatter(x=df.index, y=ema20, mode="lines", name="EMA 20",
                             line=dict(color="#1e40af", width=1.3)))

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

    st.plotly_chart(fig, use_container_width=True, config={
        "displayModeBar": True,
        "modeBarButtonsToAdd": ["drawline", "eraseshape"],
        "modeBarButtonsToRemove": ["select2d", "lasso2d"],
        "displaylogo": False,
        "scrollZoom": True,
    })

    # ── Drawing tools ─────────────────────────────────────────────────────
    with st.expander("🖊 Drawing Tools", expanded=False):
        tab_fib, tab_pos, tab_tl = st.tabs(["📐 Fibonacci", "📊 Position", "📏 Trend Line"])

        with tab_fib:
            f1, f2, f3 = st.columns([2, 2, 1])
            with f1:
                fh = st.number_input("High", value=0.00, format="%.2f", step=0.01,
                                     key=f"fi_h_{symbol}", label_visibility="collapsed",
                                     placeholder="High price")
            with f2:
                fl = st.number_input("Low", value=0.00, format="%.2f", step=0.01,
                                     key=f"fi_l_{symbol}", label_visibility="collapsed",
                                     placeholder="Low price")
            with f3:
                if st.button("Draw", key=f"fi_add_{symbol}"):
                    if fh > 0 and fl > 0 and fh != fl:
                        st.session_state[f"fibs_{symbol}"].append(
                            {"high": max(fh, fl), "low": min(fh, fl)})
                        st.rerun()
            st.caption("Draws 7 Fibonacci levels between high and low.")

        with tab_pos:
            p1, p2, p3, p4, p5 = st.columns([1, 1, 1, 1, 1])
            with p1:
                pd_ = st.selectbox("", ["Long", "Short"], key=f"po_d_{symbol}",
                                   label_visibility="collapsed")
            with p2:
                pe = st.number_input("Entry", value=0.00, format="%.2f", step=0.01,
                                     key=f"po_e_{symbol}", label_visibility="collapsed")
            with p3:
                ps = st.number_input("Stop", value=0.00, format="%.2f", step=0.01,
                                     key=f"po_s_{symbol}", label_visibility="collapsed")
            with p4:
                pt = st.number_input("Target", value=0.00, format="%.2f", step=0.01,
                                     key=f"po_t_{symbol}", label_visibility="collapsed")
            with p5:
                if st.button("Draw", key=f"po_add_{symbol}"):
                    if pe > 0 and ps > 0 and pt > 0:
                        risk = abs(pe - ps); reward = abs(pt - pe)
                        rr = reward / risk if risk else 0
                        st.session_state[f"positions_{symbol}"].append(
                            {"direction": pd_, "entry": pe, "stop": ps,
                             "target": pt, "rr": rr})
                        st.rerun()
            st.caption("Draws risk (red) and reward (green) zones with entry, SL, and TP lines.")

        with tab_tl:
            t1, t2, t3, t4, t5 = st.columns([1, 1, 1, 1, 1])
            with t1:
                tp1 = st.number_input("Price 1", value=0.00, format="%.2f", step=0.01,
                                      key=f"tl_p1_{symbol}", label_visibility="collapsed")
            with t2:
                tp2 = st.number_input("Price 2", value=0.00, format="%.2f", step=0.01,
                                      key=f"tl_p2_{symbol}", label_visibility="collapsed")
            with t3:
                tc = st.selectbox("", ["Yellow", "White", "Cyan", "Orange"],
                                  key=f"tl_c_{symbol}", label_visibility="collapsed")
                cmap = {"White": "#bdc3c7", "Yellow": "#f1c40f",
                        "Cyan": "#00bcd4", "Orange": "#f39c12"}
            with t4:
                th = st.checkbox("Horizontal ⇧", key=f"tl_h_{symbol}")
            with t5:
                if st.button("Draw", key=f"tl_add_{symbol}"):
                    if tp1 > 0:
                        st.session_state[f"trendlines_{symbol}"].append(
                            {"price1": tp1, "price2": tp2,
                             "horizontal": th, "color": cmap[tc]})
                        st.rerun()
            st.caption("Check Horizontal ⇧ to lock the line flat.")

    _manage_drawings(symbol)
