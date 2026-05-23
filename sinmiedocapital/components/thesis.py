"""Daily thesis, bullish/bearish scenarios, trade plan, and next-open watchlist."""

import streamlit as st
from utils.helpers import risk_badge
from components.consistency_box import render_consistency_box


def render_thesis(contract: dict):
    symbol = contract["symbol"]

    # Daily thesis
    st.markdown("**Daily Thesis**")
    st.info(contract["thesis"])

    col_bull, col_bear = st.columns(2)
    with col_bull:
        st.markdown(
            '<div style="color:#2ecc71;font-weight:700;margin-bottom:4px;">Bullish Scenario</div>',
            unsafe_allow_html=True,
        )
        st.markdown(
            f'<div style="background:#1a2e1a;border-left:3px solid #2ecc71;padding:8px 12px;'
            f'border-radius:4px;font-size:0.88em;">{contract["bullish_scenario"]}</div>',
            unsafe_allow_html=True,
        )
    with col_bear:
        st.markdown(
            '<div style="color:#e74c3c;font-weight:700;margin-bottom:4px;">Bearish Scenario</div>',
            unsafe_allow_html=True,
        )
        st.markdown(
            f'<div style="background:#2e1a1a;border-left:3px solid #e74c3c;padding:8px 12px;'
            f'border-radius:4px;font-size:0.88em;">{contract["bearish_scenario"]}</div>',
            unsafe_allow_html=True,
        )

    st.markdown("")

    # Trade plan + invalidation
    st.markdown("**Trade Plan**")
    st.markdown(
        f'<div style="background:#1e1e2e;border-left:3px solid #a29bfe;padding:8px 12px;'
        f'border-radius:4px;font-size:0.88em;">{contract["trade_plan"]}</div>',
        unsafe_allow_html=True,
    )
    decimals = 2
    inv = contract["invalidation"]
    st.markdown(
        f'<div style="color:#e74c3c;font-size:0.85em;margin-top:6px;">'
        f'🚫 Invalidation level: <strong>{inv:,.{decimals}f}</strong></div>',
        unsafe_allow_html=True,
    )

    # Next session open watchlist
    if contract.get("watch_next_open"):
        st.markdown("")
        st.markdown("**Watch at Next Open**")
        st.markdown(
            f'<div style="background:#1e2e2e;border-left:3px solid #74b9ff;padding:8px 12px;'
            f'border-radius:4px;font-size:0.88em;">{contract["watch_next_open"]}</div>',
            unsafe_allow_html=True,
        )

    st.markdown("")
    render_consistency_box(contract)
