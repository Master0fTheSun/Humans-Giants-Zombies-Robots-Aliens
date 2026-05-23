"""Thesis consistency check — compares dashboard bias against the trader's own read."""

import streamlit as st


def render_consistency_box(contract: dict):
    symbol    = contract["symbol"]
    auto_bias = contract.get("bias", "Neutral / Watch")

    if "Long" in auto_bias:
        auto_cat, auto_color = "Bullish", "#2ecc71"
    elif "Short" in auto_bias:
        auto_cat, auto_color = "Bearish", "#e74c3c"
    else:
        auto_cat, auto_color = "Neutral", "#f39c12"

    st.markdown("**Thesis Consistency Check**")

    col_dash, col_you = st.columns([1, 1])
    with col_dash:
        st.markdown(
            f'<div style="font-size:0.82em;color:#b2bec3;margin-bottom:2px;">Dashboard says</div>'
            f'<div style="font-size:1.15em;font-weight:700;color:{auto_color};">{auto_cat}</div>',
            unsafe_allow_html=True,
        )
    with col_you:
        st.markdown(
            '<div style="font-size:0.82em;color:#b2bec3;margin-bottom:2px;">Your bias</div>',
            unsafe_allow_html=True,
        )
        user_bias = st.selectbox(
            "bias",
            options=["Bullish", "Neutral", "Bearish"],
            key=f"consistency_{symbol}",
            label_visibility="collapsed",
        )

    # Evaluate consistency
    if user_bias == auto_cat:
        color  = "#2ecc71"
        icon   = "✓"
        msg    = "Aligned with the tape"
        detail = "Your read matches the data. Trade with normal size."
    elif (user_bias == "Bullish" and auto_cat == "Bearish") or \
         (user_bias == "Bearish" and auto_cat == "Bullish"):
        color  = "#e74c3c"
        icon   = "⚠"
        msg    = "Against the tape"
        detail = "Your bias opposes the data. Reduce size or wait for confirmation before entering."
    else:
        color  = "#f39c12"
        icon   = "~"
        msg    = "Mixed signal"
        detail = "Partial alignment. Wait for a clear catalyst or price acceptance before committing."

    st.markdown(
        f'<div style="background:#1e1e2e;border-left:3px solid {color};'
        f'padding:8px 12px;border-radius:4px;margin-top:6px;">'
        f'<span style="color:{color};font-weight:700;">{icon} {msg}</span><br>'
        f'<span style="color:#b2bec3;font-size:0.82em;">{detail}</span>'
        f'</div>',
        unsafe_allow_html=True,
    )
