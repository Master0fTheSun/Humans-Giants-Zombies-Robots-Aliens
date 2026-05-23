"""Contract overview card: price, gap, levels, VWAP, overnight/prior session ranges."""

import streamlit as st
import pandas as pd
from utils.helpers import (
    risk_badge, trend_badge, delta_color,
    fmt_price, fmt_change, fmt_pct, RISK_COLORS, TREND_COLORS
)
import config


def render_contract_card(contract: dict):
    symbol = contract["symbol"]
    name = contract["name"]
    price = contract["current_price"]
    change = contract["change"]
    change_pct = contract["change_pct"]
    decimals = 2 if symbol == "MCL" else 2

    # --- Header row: symbol + live price ---
    col_sym, col_price = st.columns([1, 2])
    with col_sym:
        st.markdown(f"### {symbol}")
        st.caption(name)
    with col_price:
        price_color = delta_color(change)
        st.markdown(
            f'<div style="text-align:right">'
            f'<span style="font-size:2em;font-weight:700;color:{price_color};">'
            f'{fmt_price(price, decimals)}</span>'
            f'<br><span style="font-size:0.9em;color:{price_color};">'
            f'{fmt_change(change, decimals)} ({fmt_pct(change_pct)})'
            f'</span></div>',
            unsafe_allow_html=True,
        )

    # --- Bias / Trend / Setup strip ---
    b1, b2, b3, b4 = st.columns(4)
    with b1:
        st.markdown("**Bias**")
        bias_color = TREND_COLORS.get(
            "Bullish" if "Long" in contract["bias"] else
            "Bearish" if "Short" in contract["bias"] else "Neutral",
            "#95a5a6"
        )
        st.markdown(
            f'<span style="color:{bias_color};font-weight:700;">{contract["bias"]}</span>',
            unsafe_allow_html=True,
        )
    with b2:
        st.markdown("**Trend**")
        st.markdown(trend_badge(contract["trend"]), unsafe_allow_html=True)
    with b3:
        st.markdown("**Volatility**")
        vol_color = RISK_COLORS.get(contract["volatility"], "#95a5a6")
        st.markdown(
            f'<span style="color:{vol_color};font-weight:600;">{contract["volatility"]}</span>',
            unsafe_allow_html=True,
        )
    with b4:
        st.markdown("**Setup**")
        st.markdown(
            f'<span style="color:#1e40af;font-weight:600;">{contract["setup_type"]}</span>',
            unsafe_allow_html=True,
        )

    st.markdown("---")

    # --- Ranges table ---
    gap_color = delta_color(contract["gap_size"])
    ranges_data = {
        "": ["Overnight High", "Overnight Low", "Prior Day High", "Prior Day Low", "Prior Close"],
        "Level": [
            fmt_price(contract["overnight_high"], decimals),
            fmt_price(contract["overnight_low"], decimals),
            fmt_price(contract["prior_day_high"], decimals),
            fmt_price(contract["prior_day_low"], decimals),
            fmt_price(contract["prior_day_close"], decimals),
        ],
    }
    df_ranges = pd.DataFrame(ranges_data)

    # VWAP row
    if config.SHOW_VWAP and contract.get("vwap"):
        vwap_vs = "Above" if price > contract["vwap"] else "Below"
        vwap_color = "#2ecc71" if vwap_vs == "Above" else "#e74c3c"
        vwap_label = f'VWAP ({vwap_vs})'
        ranges_data[""].append(vwap_label)
        ranges_data["Level"].append(fmt_price(contract["vwap"], decimals))
        df_ranges = pd.DataFrame(ranges_data)

    st.dataframe(df_ranges, hide_index=True, use_container_width=True)

    # Gap callout
    if contract.get("gap") and contract.get("gap_size", 0) != 0:
        g_color = delta_color(contract["gap_size"])
        st.markdown(
            f'<div style="color:{g_color};font-size:0.85em;margin-top:-8px;">'
            f'⚡ {contract["gap"]} &nbsp;{fmt_change(contract["gap_size"], decimals)}'
            f'</div>',
            unsafe_allow_html=True,
        )

    if config.SHOW_ATR and contract.get("atr_14"):
        st.markdown(
            f'<div style="color:#1e40af;font-size:0.82em;">ATR(14): {fmt_price(contract["atr_14"], decimals)}</div>',
            unsafe_allow_html=True,
        )

    st.markdown("---")

    # --- Key Levels ---
    st.markdown("**Key Levels**")
    levels = []
    for r in contract["key_resistance"]:
        levels.append({
            "Type": "R",
            "Level": fmt_price(r["level"], decimals),
            "Note": r["note"],
        })
    for s in contract["key_support"]:
        levels.append({
            "Type": "S",
            "Level": fmt_price(s["level"], decimals),
            "Note": s["note"],
        })

    df_levels = pd.DataFrame(levels)
    st.dataframe(df_levels, hide_index=True, use_container_width=True)

    # --- Risk Label ---
    st.markdown("---")
    risk_col, _ = st.columns([1, 2])
    with risk_col:
        st.markdown(
            f'**Risk** &nbsp; {risk_badge(contract["risk_level"])}',
            unsafe_allow_html=True,
        )
    if contract.get("risk_reasons"):
        for r in contract["risk_reasons"]:
            st.markdown(f'<div style="color:#5577aa;font-size:0.82em;">• {r}</div>', unsafe_allow_html=True)
