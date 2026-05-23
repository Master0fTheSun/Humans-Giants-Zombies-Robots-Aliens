"""Pre-session readiness checklist with progress tracking."""

import streamlit as st

_CHECKLIST = {
    "Market Context": [
        "Checked overnight session range (high / low)",
        "Noted prior day close and gap direction",
        "Reviewed VWAP position for both contracts",
        "Identified key support and resistance levels",
    ],
    "Macro & News": [
        "Reviewed economic calendar — any high-impact events today?",
        "Checked pre-market news for MCL (crude / energy)",
        "Checked pre-market news for MES (equities / macro)",
        "Noted VIX level and trend",
        "Checked 10Y yield and DXY direction",
    ],
    "Thesis & Plan": [
        "Written daily thesis for MCL",
        "Written daily thesis for MES",
        "Bullish and bearish scenarios defined",
        "Invalidation levels set",
        "Consistency check done (my bias vs dashboard)",
    ],
    "Risk Management": [
        "Max daily loss limit defined before first trade",
        "Position size calculated (R:R calculator run)",
        "Stop levels defined — not moved once in trade",
        "R:R ≥ 2:1 confirmed for any planned entry",
    ],
    "Mindset": [
        "Well rested and focused",
        "Not carrying P&L anxiety from prior session",
        "Reviewed yesterday's trades (what worked / what didn't)",
        "Trading plan written — not winging it",
    ],
}


def render_pre_session_checklist():
    st.markdown("## Pre-Session Checklist")

    # Count totals for progress
    total_items = sum(len(v) for v in _CHECKLIST.values())
    checked_keys = [
        k for section, items in _CHECKLIST.items()
        for i, item in enumerate(items)
        for k in [f"chk_{section}_{i}"]
        if st.session_state.get(k, False)
    ]
    checked_count = len(checked_keys)

    pct = checked_count / total_items if total_items else 0
    bar_color = "#2ecc71" if pct >= 0.9 else "#f39c12" if pct >= 0.6 else "#e74c3c"
    bar_width = int(pct * 100)

    st.markdown(
        f'<div style="margin-bottom:12px;">'
        f'<div style="display:flex;justify-content:space-between;font-size:0.82em;color:#5577aa;margin-bottom:4px;">'
        f'<span>Readiness</span><span>{checked_count}/{total_items} complete</span>'
        f'</div>'
        f'<div style="background:#c5d5ee;border-radius:4px;height:8px;">'
        f'<div style="background:{bar_color};width:{bar_width}%;height:8px;border-radius:4px;'
        f'transition:width 0.3s;"></div></div>'
        f'</div>',
        unsafe_allow_html=True,
    )

    if pct >= 0.9:
        st.success("Ready to trade. All critical boxes checked.")
    elif pct >= 0.6:
        st.warning("Almost ready — complete the remaining items before entering a trade.")
    else:
        st.error("Not ready — work through the checklist before trading.")

    st.markdown("")

    for section, items in _CHECKLIST.items():
        with st.expander(f"**{section}**", expanded=(section in ("Market Context", "Thesis & Plan"))):
            for i, item in enumerate(items):
                key = f"chk_{section}_{i}"
                st.checkbox(item, key=key)

    # Reset button
    st.markdown("")
    if st.button("Reset Checklist", key="chk_reset"):
        for section, items in _CHECKLIST.items():
            for i in range(len(items)):
                key = f"chk_{section}_{i}"
                if key in st.session_state:
                    del st.session_state[key]
        st.rerun()
