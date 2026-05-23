"""Native Plotly candlestick charts with VWAP and manual buy/sell level markers."""

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


def _levels_key(symbol: str) -> str:
    return f"trade_levels_{symbol}"


def _add_level_traces(fig: go.Figure, symbol: str, x_start, x_end):
    levels = st.session_state.get(_levels_key(symbol), [])
    for lvl in levels:
        color = "#2ecc71" if lvl["direction"] == "Buy" else "#e74c3c"
        label = f"{lvl['direction']} {lvl['price']:.2f}"
        if lvl.get("note"):
            label += f"  {lvl['note']}"
        fig.add_shape(
            type="line",
            x0=x_start, x1=x_end,
            y0=lvl["price"], y1=lvl["price"],
            line=dict(color=color, width=1.5, dash="dash"),
            xref="x", yref="y",
        )
        fig.add_annotation(
            x=x_end,
            y=lvl["price"],
            text=label,
            showarrow=False,
            xanchor="right",
            font=dict(color=color, size=10),
            bgcolor="rgba(255,255,255,0.7)",
            borderpad=2,
        )


def render_chart_panel(symbol: str, height: int = 480):
    ticker_sym = _TICKER_MAP.get(symbol, symbol)

    # Init session state
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

    # VWAP
    if interval in ("5m", "15m", "1h"):
        vwap = _compute_vwap(df)
        fig.add_trace(go.Scatter(
            x=df.index, y=vwap,
            mode="lines", name="VWAP",
            line=dict(color="#f39c12", width=1.5, dash="dot"),
        ))

    # EMA 20
    ema20 = df["Close"].ewm(span=20, adjust=False).mean()
    fig.add_trace(go.Scatter(
        x=df.index, y=ema20,
        mode="lines", name="EMA 20",
        line=dict(color="#1e40af", width=1.2),
    ))

    # Buy/sell level lines
    _add_level_traces(fig, symbol, df.index[0], df.index[-1])

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

    # ── Buy / Sell level input ───────────────────────────────────────────────
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

        # Current levels list with remove buttons
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
