"""Macro overview: VIX, yields, DXY, Fed stance, economic calendar."""

import streamlit as st
import pandas as pd
from utils.helpers import (
    risk_badge, delta_color, fmt_change, RISK_COLORS, importance_dot
)


def render_macro_panel(macro: dict):
    st.markdown("## Macro / Headline Sentiment")

    # Top metrics strip
    m1, m2, m3, m4, m5 = st.columns(5)

    vix = macro["vix"]
    vix_ch = macro["vix_change"]
    vix_color = "#e74c3c" if vix > 20 else "#f39c12" if vix > 15 else "#2ecc71"

    yield_val = macro["ten_year_yield"]
    yield_ch = macro["ten_year_change"]

    dxy = macro["dollar_index"]
    dxy_ch = macro["dollar_change"]

    with m1:
        st.markdown("**VIX**")
        st.markdown(
            f'<span style="font-size:1.4em;font-weight:700;color:{vix_color};">{vix:.1f}</span>'
            f'<span style="font-size:0.85em;color:{delta_color(vix_ch)};"> {fmt_change(vix_ch, 1)}</span>',
            unsafe_allow_html=True,
        )
    with m2:
        st.markdown("**10Y Yield**")
        st.markdown(
            f'<span style="font-size:1.4em;font-weight:700;color:#dfe6e9;">{yield_val:.2f}%</span>'
            f'<span style="font-size:0.85em;color:{delta_color(yield_ch)};"> {fmt_change(yield_ch, 2)}</span>',
            unsafe_allow_html=True,
        )
    with m3:
        st.markdown("**DXY**")
        st.markdown(
            f'<span style="font-size:1.4em;font-weight:700;color:#dfe6e9;">{dxy:.2f}</span>'
            f'<span style="font-size:0.85em;color:{delta_color(dxy_ch)};"> {fmt_change(dxy_ch, 2)}</span>',
            unsafe_allow_html=True,
        )
    with m4:
        st.markdown("**Fed Stance**")
        fed_color = "#e74c3c" if macro["fed_stance"] == "Hawkish" else "#2ecc71" if macro["fed_stance"] == "Dovish" else "#f39c12"
        st.markdown(
            f'<span style="font-size:1.1em;font-weight:700;color:{fed_color};">{macro["fed_stance"]}</span>',
            unsafe_allow_html=True,
        )
    with m5:
        st.markdown("**Headline Risk**")
        st.markdown(risk_badge(macro["headline_risk"]), unsafe_allow_html=True)

    st.markdown("---")

    # Economic calendar
    st.markdown("**Economic Calendar — Today**")
    events = macro.get("economic_events", [])
    if events:
        rows = []
        for e in events:
            dot = importance_dot(e["importance"])
            rows.append({
                "Time": e["time"],
                "Event": e["event"],
                "Imp": e["importance"],
                "Forecast": e["forecast"],
                "Prior": e["prior"],
            })
        df = pd.DataFrame(rows)
        st.dataframe(df, hide_index=True, use_container_width=True)
    else:
        st.caption("No major events today.")
