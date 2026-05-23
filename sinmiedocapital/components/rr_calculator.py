"""Risk:Reward calculator for MCL and MES micro futures."""

import streamlit as st


# Contract specs: (dollar_per_point, min_tick, tick_value)
_SPECS = {
    "MCL": {"per_point": 100.0, "tick": 0.01, "tick_val": 1.00, "label": "Micro Crude Oil"},
    "MES": {"per_point": 5.0,   "tick": 0.25, "tick_val": 1.25, "label": "Micro E-mini S&P"},
}


def render_rr_calculator():
    st.markdown("## Risk:Reward Calculator")

    col_sel, col_cts, _ = st.columns([1, 1, 2])
    with col_sel:
        contract = st.selectbox("Contract", ["MCL", "MES"], key="rr_contract")
    with col_cts:
        num_contracts = st.number_input("Contracts", min_value=1, max_value=50,
                                        value=1, step=1, key="rr_num_contracts")

    spec = _SPECS[contract]

    col1, col2, col3 = st.columns(3)
    with col1:
        entry = st.number_input("Entry Price", value=0.00, format="%.2f",
                                step=spec["tick"], key="rr_entry")
    with col2:
        stop = st.number_input("Stop Price", value=0.00, format="%.2f",
                               step=spec["tick"], key="rr_stop")
    with col3:
        target = st.number_input("Target Price", value=0.00, format="%.2f",
                                 step=spec["tick"], key="rr_target")

    # Display contract specs reference
    st.markdown(
        f'<div style="color:#5577aa;font-size:0.78em;margin-top:2px;">'
        f'{spec["label"]} — ${spec["per_point"]:.0f}/pt &nbsp;|&nbsp; '
        f'tick: {spec["tick"]} = ${spec["tick_val"]:.2f}'
        f'</div>',
        unsafe_allow_html=True,
    )

    if entry > 0 and stop > 0 and target > 0 and stop != entry:
        risk_pts = abs(entry - stop)
        reward_pts = abs(target - entry)
        direction = "Long" if target > entry else "Short"

        # Validate stop is on the correct side
        stop_ok = (direction == "Long" and stop < entry) or \
                  (direction == "Short" and stop > entry)

        if risk_pts > 0 and stop_ok:
            rr = reward_pts / risk_pts
            dollar_risk   = risk_pts   * spec["per_point"] * num_contracts
            dollar_profit = reward_pts * spec["per_point"] * num_contracts
            risk_ticks    = round(risk_pts / spec["tick"])
            reward_ticks  = round(reward_pts / spec["tick"])

            rr_color = "#2ecc71" if rr >= 2.0 else "#f39c12" if rr >= 1.5 else "#e74c3c"
            rr_note  = "Good" if rr >= 2.0 else "Acceptable" if rr >= 1.5 else "Below minimum"

            st.markdown("")

            r1, r2, r3, r4 = st.columns(4)
            with r1:
                st.markdown(
                    f'<div style="background:#eef3ff;border-radius:6px;padding:10px 14px;">'
                    f'<div style="color:#5577aa;font-size:0.78em;">R:R Ratio</div>'
                    f'<div style="font-size:1.6em;font-weight:700;color:{rr_color};">'
                    f'1 : {rr:.1f}</div>'
                    f'<div style="font-size:0.75em;color:{rr_color};">{rr_note}</div>'
                    f'</div>',
                    unsafe_allow_html=True,
                )
            with r2:
                st.markdown(
                    f'<div style="background:#faeaea;border-radius:6px;padding:10px 14px;">'
                    f'<div style="color:#5577aa;font-size:0.78em;">Max Risk</div>'
                    f'<div style="font-size:1.4em;font-weight:700;color:#e74c3c;">'
                    f'${dollar_risk:,.0f}</div>'
                    f'<div style="font-size:0.75em;color:#5577aa;">{risk_ticks} ticks</div>'
                    f'</div>',
                    unsafe_allow_html=True,
                )
            with r3:
                st.markdown(
                    f'<div style="background:#e8f5ec;border-radius:6px;padding:10px 14px;">'
                    f'<div style="color:#5577aa;font-size:0.78em;">Target Profit</div>'
                    f'<div style="font-size:1.4em;font-weight:700;color:#2ecc71;">'
                    f'${dollar_profit:,.0f}</div>'
                    f'<div style="font-size:0.75em;color:#5577aa;">{reward_ticks} ticks</div>'
                    f'</div>',
                    unsafe_allow_html=True,
                )
            with r4:
                dir_color = "#2ecc71" if direction == "Long" else "#e74c3c"
                st.markdown(
                    f'<div style="background:#eef3ff;border-radius:6px;padding:10px 14px;">'
                    f'<div style="color:#5577aa;font-size:0.78em;">Direction</div>'
                    f'<div style="font-size:1.4em;font-weight:700;color:{dir_color};">'
                    f'{direction}</div>'
                    f'<div style="font-size:0.75em;color:#5577aa;">{num_contracts} contract(s)</div>'
                    f'</div>',
                    unsafe_allow_html=True,
                )

            # Breakeven and sizing note
            st.markdown(
                f'<div style="color:#5577aa;font-size:0.8em;margin-top:8px;">'
                f'Entry {entry:.2f} &nbsp;→&nbsp; '
                f'Stop <span style="color:#e74c3c;">{stop:.2f}</span> &nbsp;|&nbsp; '
                f'Target <span style="color:#2ecc71;">{target:.2f}</span>'
                f'</div>',
                unsafe_allow_html=True,
            )
        else:
            st.warning("Check stop placement — stop should be below entry for longs, above for shorts.")
    else:
        st.caption("Enter entry, stop, and target prices above to calculate.")
