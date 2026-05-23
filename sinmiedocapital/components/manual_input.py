"""Manual data input panel — paste in your own price/summary when live data is unavailable."""

import streamlit as st


def render_manual_input_panel():
    with st.expander("Manual Data Input", expanded=False):
        st.caption(
            "Paste in raw data or a broker summary here. "
            "This does not auto-parse — use it as a scratch pad alongside the dashboard."
        )
        col1, col2 = st.columns(2)
        with col1:
            st.markdown("**MCL Manual Override**")
            mcl_price = st.number_input("MCL Current Price", value=0.0, format="%.2f", key="mcl_manual_price")
            mcl_notes = st.text_area("MCL Raw Data / Notes", height=120, key="mcl_manual_notes",
                                     placeholder="Paste broker quote, level2, or your own notes here...")
        with col2:
            st.markdown("**MES Manual Override**")
            mes_price = st.number_input("MES Current Price", value=0.0, format="%.2f", key="mes_manual_price")
            mes_notes = st.text_area("MES Raw Data / Notes", height=120, key="mes_manual_notes",
                                     placeholder="Paste broker quote, level2, or your own notes here...")

        st.markdown("**Market Summary (paste text)**")
        st.text_area(
            "Summary",
            height=100,
            key="market_summary_text",
            placeholder="Paste a morning briefing, news summary, or anything else here...",
            label_visibility="collapsed",
        )
