"""Native Plotly candlestick charts with VWAP — no external iframe dependencies."""

import streamlit as st
import pandas as pd
import plotly.graph_objects as go
import yfinance as yf
from datetime import datetime, timedelta

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


def render_chart_panel(symbol: str, height: int = 480):
    ticker_sym = _TICKER_MAP.get(symbol, symbol)

    interval_key = f"chart_interval_{symbol}"
    if interval_key not in st.session_state:
        st.session_state[interval_key] = "5m"

    # Interval buttons
    btn_cols = st.columns(len(_INTERVAL_OPTIONS) + 2)
    with btn_cols[0]:
        st.markdown(
            f'<span style="color:#5577aa;font-size:0.8em;line-height:2.4;">Timeframe:</span>',
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

    # Flatten MultiIndex columns if present
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.get_level_values(0)

    df = df.dropna(subset=["Open", "High", "Low", "Close"])

    fig = go.Figure()

    # Candlesticks
    fig.add_trace(go.Candlestick(
        x=df.index,
        open=df["Open"],
        high=df["High"],
        low=df["Low"],
        close=df["Close"],
        name=symbol,
        increasing_line_color="#2ecc71",
        decreasing_line_color="#e74c3c",
        increasing_fillcolor="#2ecc71",
        decreasing_fillcolor="#e74c3c",
    ))

    # VWAP overlay (only meaningful on intraday)
    if interval in ("5m", "15m", "1h"):
        vwap = _compute_vwap(df)
        fig.add_trace(go.Scatter(
            x=df.index,
            y=vwap,
            mode="lines",
            name="VWAP",
            line=dict(color="#f39c12", width=1.5, dash="dot"),
        ))

    # 20-period EMA
    ema20 = df["Close"].ewm(span=20, adjust=False).mean()
    fig.add_trace(go.Scatter(
        x=df.index,
        y=ema20,
        mode="lines",
        name="EMA 20",
        line=dict(color="#1e40af", width=1.2),
    ))

    fig.update_layout(
        height=height,
        margin=dict(l=0, r=0, t=10, b=0),
        paper_bgcolor="#f5f8ff",
        plot_bgcolor="#ffffff",
        font=dict(color="#0a1428", size=11),
        xaxis=dict(
            gridcolor="#e8eef8",
            showgrid=True,
            rangeslider=dict(visible=False),
            type="date",
        ),
        yaxis=dict(
            gridcolor="#e8eef8",
            showgrid=True,
            side="right",
        ),
        legend=dict(
            orientation="h",
            yanchor="bottom", y=1.01,
            xanchor="left", x=0,
            font=dict(size=10),
            bgcolor="rgba(0,0,0,0)",
        ),
        hovermode="x unified",
    )

    st.plotly_chart(fig, use_container_width=True, config={
        "displayModeBar": True,
        "modeBarButtonsToRemove": ["select2d", "lasso2d"],
        "displaylogo": False,
    })
