"""Clean Plotly candlestick chart — TradingView-style with price + volume subplots."""

import streamlit as st
import pandas as pd
import numpy as np
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import yfinance as yf

_TICKER_MAP = {"MCL": "CL=F", "MES": "ES=F"}
_INTERVAL_OPTIONS = ["5m", "15m", "1h", "1d"]
_PERIOD_MAP = {"5m": "5d", "15m": "5d", "1h": "1mo", "1d": "6mo"}


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


def _compute_rsi(close: pd.Series, period: int = 14) -> pd.Series:
    delta = close.diff()
    gain  = delta.clip(lower=0).ewm(span=period, adjust=False).mean()
    loss  = (-delta.clip(upper=0)).ewm(span=period, adjust=False).mean()
    rs    = gain / loss.replace(0, np.nan)
    return 100 - (100 / (1 + rs))


def _signals(df: pd.DataFrame, vwap: pd.Series) -> tuple:
    """
    Buy/sell signals: VWAP crossover confirmed by EMA 20 direction and RSI filter.
    Returns (buy_times, buy_prices, sell_times, sell_prices).
    """
    close   = df["Close"]
    ema20   = close.ewm(span=20, adjust=False).mean()
    rsi     = _compute_rsi(close)
    avg_vol = df["Volume"].rolling(20, min_periods=5).mean()

    above      = close > vwap
    cross_up   = above  & ~above.shift(1).fillna(False)
    cross_down = ~above &  above.shift(1).fillna(False)

    buy_mask  = cross_up   & (close > ema20) & (rsi < 65) & (df["Volume"] > avg_vol * 1.05)
    sell_mask = cross_down & (close < ema20) & (rsi > 35) & (df["Volume"] > avg_vol * 1.05)

    return (df.index[buy_mask],  df["Low"][buy_mask]  * 0.9995,
            df.index[sell_mask], df["High"][sell_mask] * 1.0005)


def render_chart_panel(symbol: str, height: int = 560):
    ticker = _TICKER_MAP.get(symbol, symbol)

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
    intraday = interval in ("5m", "15m", "1h")

    with st.spinner(f"Loading {symbol}…"):
        df = _download(ticker, _PERIOD_MAP[interval], interval)

    if df.empty:
        st.warning(f"No data for {symbol}. Market may be closed.")
        return

    # Two-pane layout: price (80%) + volume (20%)
    fig = make_subplots(
        rows=2, cols=1,
        shared_xaxes=True,
        vertical_spacing=0.02,
        row_heights=[0.78, 0.22],
    )

    # ── Price pane ────────────────────────────────────────────────────────
    fig.add_trace(go.Candlestick(
        x=df.index, open=df["Open"], high=df["High"],
        low=df["Low"], close=df["Close"], name=symbol,
        increasing_line_color="#26a69a", decreasing_line_color="#ef5350",
        increasing_fillcolor="#26a69a",  decreasing_fillcolor="#ef5350",
    ), row=1, col=1)

    ema20 = df["Close"].ewm(span=20, adjust=False).mean()
    fig.add_trace(go.Scatter(
        x=df.index, y=ema20, mode="lines", name="EMA 20",
        line=dict(color="#2196f3", width=1.3),
    ), row=1, col=1)

    if intraday:
        vwap = _vwap_daily(df)
        fig.add_trace(go.Scatter(
            x=df.index, y=vwap, mode="lines", name="VWAP",
            line=dict(color="#ff9800", width=1.4, dash="dot"),
        ), row=1, col=1)

        bt, bp, st2, sp = _signals(df, vwap)
        if len(bt):
            fig.add_trace(go.Scatter(
                x=bt, y=bp, mode="markers", name="Buy",
                marker=dict(symbol="triangle-up", size=13, color="#26a69a",
                            line=dict(color="#1a7a72", width=1)),
                hovertemplate="Buy %{y:.2f}<extra></extra>",
            ), row=1, col=1)
        if len(st2):
            fig.add_trace(go.Scatter(
                x=st2, y=sp, mode="markers", name="Sell",
                marker=dict(symbol="triangle-down", size=13, color="#ef5350",
                            line=dict(color="#b71c1c", width=1)),
                hovertemplate="Sell %{y:.2f}<extra></extra>",
            ), row=1, col=1)

    # ── Volume pane ───────────────────────────────────────────────────────
    vol_colors = [
        "#26a69a" if c >= o else "#ef5350"
        for c, o in zip(df["Close"], df["Open"])
    ]
    fig.add_trace(go.Bar(
        x=df.index, y=df["Volume"],
        name="Volume",
        marker_color=vol_colors,
        marker_line_width=0,
        showlegend=False,
        hovertemplate="Vol %{y:,.0f}<extra></extra>",
    ), row=2, col=1)

    # ── Shared layout ─────────────────────────────────────────────────────
    grid   = "#2a2e39"
    bg     = "#131722"   # TradingView dark chart background
    text_c = "#d1d4dc"

    fig.update_layout(
        height=height,
        margin=dict(l=0, r=0, t=10, b=0),
        paper_bgcolor="#f5f8ff",   # outer page stays light
        plot_bgcolor=bg,
        font=dict(color=text_c, size=11),
        legend=dict(
            orientation="h", yanchor="bottom", y=1.01,
            xanchor="left", x=0, font=dict(size=10, color="#0a1428"),
            bgcolor="rgba(0,0,0,0)",
        ),
        hovermode="x unified",
        hoverlabel=dict(bgcolor="#1e2330", font_color="#d1d4dc"),
        xaxis=dict(showgrid=True, gridcolor=grid, zeroline=False,
                   rangeslider=dict(visible=False), type="date",
                   showticklabels=False),
        xaxis2=dict(showgrid=True, gridcolor=grid, zeroline=False,
                    type="date", tickfont=dict(color=text_c, size=9)),
        yaxis=dict(showgrid=True, gridcolor=grid, zeroline=False,
                   side="right", tickfont=dict(color=text_c)),
        yaxis2=dict(showgrid=False, zeroline=False,
                    side="right", tickfont=dict(color=text_c, size=9)),
    )

    st.plotly_chart(fig, use_container_width=True, config={
        "displayModeBar": True,
        "modeBarButtonsToRemove": ["select2d", "lasso2d"],
        "displaylogo": False,
        "scrollZoom": True,
    })
