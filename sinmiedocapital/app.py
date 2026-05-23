"""
Sin Miedo Capital — MCL / MES Dashboard
Run: streamlit run app.py
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import streamlit as st

# --- Page config (must be first Streamlit call) ---
st.set_page_config(
    page_title="Sin Miedo Capital",
    page_icon="📊",
    layout="wide",
    initial_sidebar_state="collapsed",
)

# --- Dark theme CSS ---
st.markdown(
    """
    <style>
    /* Base — deep navy-black matching Sin Miedo Capital logo */
    .stApp { background-color: #070b18; color: #eef2ff; }
    section[data-testid="stSidebar"] { background-color: #0a1020; }

    /* Layout */
    .block-container { padding-top: 1rem; padding-bottom: 2rem; max-width: 1400px; }

    /* Headers */
    h1, h2, h3 { color: #eef2ff !important; }
    h2 { font-size: 1.1rem !important; border-bottom: 1px solid #162040; padding-bottom: 4px; }

    /* Alerts / info boxes */
    .stAlert { background-color: #0c1428 !important; border-radius: 6px; }

    /* DataFrames */
    .stDataFrame { background: #0c1428 !important; }
    [data-testid="stDataFrame"] table { background: #0c1428 !important; color: #eef2ff !important; }
    [data-testid="stDataFrame"] th {
        background: #111d38 !important; color: #4d8fff !important;
        font-size: 0.8em !important; text-transform: uppercase; letter-spacing: 0.05em;
    }
    [data-testid="stDataFrame"] td { font-size: 0.88em !important; }

    /* Expander */
    .streamlit-expanderHeader { background-color: #0c1428 !important; color: #eef2ff !important; }

    /* Metric labels */
    label[data-testid="stMetricLabel"] { color: #7a9cc7 !important; font-size: 0.8em !important; }

    /* Selectbox */
    .stSelectbox select { background: #111d38 !important; color: #eef2ff !important; }

    /* Text area */
    textarea { background: #0c1428 !important; color: #eef2ff !important; border-color: #162040 !important; }

    /* Number input */
    input[type="number"] { background: #0c1428 !important; color: #eef2ff !important; }

    /* Dividers */
    hr { border-color: #162040 !important; }

    /* Caption */
    .stCaption { color: #4d6d9a !important; }

    /* Button */
    .stButton button {
        background-color: #111d38 !important;
        color: #4d8fff !important;
        border: 1px solid #162040 !important;
        border-radius: 4px !important;
        font-size: 0.85em !important;
    }
    .stButton button:hover {
        background-color: #1a3060 !important;
        border-color: #4d8fff !important;
    }

    /* Scrollbar */
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: #070b18; }
    ::-webkit-scrollbar-thumb { background: #162040; border-radius: 3px; }
    </style>
    """,
    unsafe_allow_html=True,
)

# --- Imports after page config ---
import config
from data.data_adapter import get_dashboard_data
from components.contract_card import render_contract_card
from components.thesis import render_thesis
from components.macro_panel import render_macro_panel
from components.news_feed import render_news_feed
from components.manual_input import render_manual_input_panel
from utils.helpers import risk_badge

# ---------------------------------------------------------------------------
# Load data
# ---------------------------------------------------------------------------

if "data" not in st.session_state:
    st.session_state.data = get_dashboard_data()

data = st.session_state.data

# ---------------------------------------------------------------------------
# Header bar
# ---------------------------------------------------------------------------

hcol1, hcol2, hcol3 = st.columns([3, 1, 1])
with hcol1:
    st.markdown(
        f'<div style="padding:4px 0;">'
        f'<span style="font-size:1.4em;font-weight:700;color:#74b9ff;">Sin Miedo Capital</span>'
        f'<span style="color:#636e72;font-size:0.9em;"> &nbsp;MCL / MES Futures Dashboard</span>'
        f'</div>'
        f'<div style="color:#636e72;font-size:0.8em;">{data["session_date"]}</div>',
        unsafe_allow_html=True,
    )
with hcol2:
    st.markdown(
        f'<div style="padding-top:8px;color:#636e72;font-size:0.8em;text-align:right;">'
        f'Last updated<br>{data["timestamp"]}'
        f'</div>',
        unsafe_allow_html=True,
    )
with hcol3:
    st.markdown('<div style="padding-top:14px;">', unsafe_allow_html=True)
    if st.button("Refresh", key="refresh_btn"):
        st.session_state.data = get_dashboard_data()
        st.rerun()
    st.markdown('</div>', unsafe_allow_html=True)

# Live-mode warning
if data.get("live_warning"):
    st.warning(data["live_warning"])

mode_label = "LIVE" if config.DATA_MODE == "live" else "MOCK DATA"
mode_color = "#2ecc71" if config.DATA_MODE == "live" else "#f39c12"
mkt = data.get("market_status", {})
mkt_label = mkt.get("status", "")
mkt_color = mkt.get("color", "#95a5a6")
mkt_note  = mkt.get("note", "")
st.markdown(
    f'<div style="font-size:0.75em;text-align:right;margin-top:-10px;">'
    f'<span style="color:{mode_color};">● {mode_label}</span>'
    f'{"  &nbsp;|&nbsp;  <span style=color:" + mkt_color + ";> ● " + mkt_label + "</span>" if mkt_label else ""}'
    f'{"  <span style=color:#636e72;font-size:0.9em;> — " + mkt_note + "</span>" if mkt_note else ""}'
    f'</div>',
    unsafe_allow_html=True,
)

st.markdown("---")

# ---------------------------------------------------------------------------
# Main two-column layout: MCL | MES
# ---------------------------------------------------------------------------

mcl = data["contracts"]["MCL"]
mes = data["contracts"]["MES"]

col_mcl, col_sep, col_mes = st.columns([10, 1, 10])

with col_mcl:
    render_contract_card(mcl)

with col_sep:
    st.markdown(
        '<div style="border-left:1px solid #2d2d4e;height:100%;min-height:600px;margin:0 auto;width:1px;"></div>',
        unsafe_allow_html=True,
    )

with col_mes:
    render_contract_card(mes)

st.markdown("---")

# ---------------------------------------------------------------------------
# Thesis + Trade Plan row (two columns, one per contract)
# ---------------------------------------------------------------------------

t1, t2 = st.columns(2)

with t1:
    st.markdown("## MCL — Sin Miedo Capital Thesis & Trade Plan")
    render_thesis(mcl)

with t2:
    st.markdown("## MES — Sin Miedo Capital Thesis & Trade Plan")
    render_thesis(mes)

st.markdown("---")

# ---------------------------------------------------------------------------
# Macro panel + News feed (side by side)
# ---------------------------------------------------------------------------

mac_col, news_col = st.columns([5, 4])

with mac_col:
    render_macro_panel(data["macro"])

with news_col:
    render_news_feed(data["news"])

st.markdown("---")

# ---------------------------------------------------------------------------
# Notes area + Manual input
# ---------------------------------------------------------------------------

notes_col, manual_col = st.columns([1, 1])

with notes_col:
    st.markdown("## Sin Miedo Capital — Trade Notes")
    st.text_area(
        "notes",
        height=180,
        key="user_notes",
        placeholder=(
            "Type your own thesis here...\n\n"
            "e.g. Bias long MCL on API draw. Watch 78.00 VWAP reclaim. "
            "Size down before ISM. MES — fade 5325 unless ISM beats."
        ),
        label_visibility="collapsed",
    )

with manual_col:
    st.markdown("## Manual Data Input")
    render_manual_input_panel()

# ---------------------------------------------------------------------------
# Footer
# ---------------------------------------------------------------------------

st.markdown(
    '<div style="color:#2d2d4e;font-size:0.75em;text-align:center;padding-top:12px;">'
    'Sin Miedo Capital — For internal use only. Not financial advice. Data may be delayed.'
    '</div>',
    unsafe_allow_html=True,
)
