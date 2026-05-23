"""News feed with sentiment tags and contract filter."""

import streamlit as st
from utils.helpers import sentiment_badge, SENTIMENT_COLORS


def render_news_feed(news: list):
    st.markdown("## News Summary")

    # Filter controls
    col_filter, _ = st.columns([1, 3])
    with col_filter:
        filter_opt = st.selectbox(
            "Filter",
            options=["All", "MCL", "MES", "Bullish", "Bearish"],
            key="news_filter",
            label_visibility="collapsed",
        )

    filtered = news
    if filter_opt == "MCL":
        filtered = [n for n in news if n["contract"] == "MCL"]
    elif filter_opt == "MES":
        filtered = [n for n in news if n["contract"] == "MES"]
    elif filter_opt in ("Bullish", "Bearish"):
        filtered = [n for n in news if n["sentiment"] == filter_opt]

    if not filtered:
        st.caption("No headlines match this filter.")
        return

    for item in filtered:
        sentiment = item["sentiment"]
        color = SENTIMENT_COLORS.get(sentiment, "#95a5a6")
        contract_tag = item.get("contract", "")
        contract_color = "#4d8fff" if contract_tag == "MES" else "#fdcb6e"

        st.markdown(
            f'<div style="border-left:3px solid {color};padding:6px 12px;margin-bottom:6px;'
            f'background:#f0f5ff;border-radius:0 4px 4px 0;">'
            f'<span style="color:#5577aa;font-size:0.78em;">{item["time"]}</span>'
            f'&nbsp;&nbsp;<span style="color:{contract_color};font-size:0.78em;font-weight:700;">{contract_tag}</span>'
            f'&nbsp;&nbsp;{sentiment_badge(sentiment)}'
            f'<br><span style="font-size:0.9em;">{item["headline"]}</span>'
            f'</div>',
            unsafe_allow_html=True,
        )
