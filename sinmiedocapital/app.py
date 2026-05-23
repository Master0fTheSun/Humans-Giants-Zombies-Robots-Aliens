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

# --- Theme CSS ---
st.markdown(
    """
    <style>
    /* Light theme — off-white background, deep navy text, royal blue accents */
    .stApp { background-color: #f5f8ff; color: #0a1428; }
    section[data-testid="stSidebar"] { background-color: #eef3ff; }

    /* Layout */
    .block-container { padding-top: 4rem; padding-bottom: 2rem; max-width: 1400px; }

    /* Match Streamlit top bar to our theme so it blends in */
    header[data-testid="stHeader"] {
        background-color: #f5f8ff !important;
        border-bottom: 1px solid #c5d5ee;
    }
    header[data-testid="stHeader"] * { color: #0a1428 !important; }

    /* Headers */
    h1, h2, h3 { color: #0a1428 !important; }
    h2 { font-size: 1.1rem !important; border-bottom: 1px solid #c5d5ee; padding-bottom: 4px; }

    /* Tabs */
    .stTabs [data-baseweb="tab-list"] {
        gap: 4px;
        background-color: #eef3ff;
        border-radius: 8px;
        padding: 4px;
    }
    .stTabs [data-baseweb="tab"] {
        background-color: transparent;
        border-radius: 6px;
        color: #5577aa;
        font-weight: 600;
        font-size: 0.88em;
        padding: 6px 16px;
    }
    .stTabs [aria-selected="true"] {
        background-color: #1a3060 !important;
        color: #ffffff !important;
    }
    .stTabs [data-baseweb="tab-panel"] { padding-top: 1rem; }

    /* Alerts / info boxes */
    .stAlert { background-color: #eef3ff !important; border-radius: 6px; }

    /* DataFrames */
    .stDataFrame { background: #ffffff !important; }
    [data-testid="stDataFrame"] table { background: #ffffff !important; color: #0a1428 !important; }
    [data-testid="stDataFrame"] th {
        background: #1a3060 !important; color: #ffffff !important;
        font-size: 0.8em !important; text-transform: uppercase; letter-spacing: 0.05em;
    }
    [data-testid="stDataFrame"] td { font-size: 0.88em !important; }

    /* Expander */
    .streamlit-expanderHeader { background-color: #eef3ff !important; color: #0a1428 !important; }

    /* Metric labels */
    label[data-testid="stMetricLabel"] { color: #5577aa !important; font-size: 0.8em !important; }

    /* Selectbox */
    .stSelectbox select { background: #ffffff !important; color: #0a1428 !important; }

    /* Text area */
    textarea { background: #ffffff !important; color: #0a1428 !important; border-color: #c5d5ee !important; }

    /* Number input */
    input[type="number"] { background: #ffffff !important; color: #0a1428 !important; }

    /* Checkboxes */
    .stCheckbox label { color: #0a1428 !important; }

    /* Dividers */
    hr { border-color: #c5d5ee !important; }

    /* Caption */
    .stCaption { color: #5577aa !important; }

    /* Button */
    .stButton button {
        background-color: #1a3060 !important;
        color: #ffffff !important;
        border: 1px solid #1a3060 !important;
        border-radius: 4px !important;
        font-size: 0.85em !important;
    }
    .stButton button:hover {
        background-color: #2d5090 !important;
        border-color: #2d5090 !important;
    }

    /* Scrollbar */
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: #f5f8ff; }
    ::-webkit-scrollbar-thumb { background: #c5d5ee; border-radius: 3px; }
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
from components.chart_panel import render_chart_panel
from components.rr_calculator import render_rr_calculator
from components.pre_session_checklist import render_pre_session_checklist
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
        f'<span style="font-size:1.4em;font-weight:700;color:#1a3060;">Sin Miedo Capital</span>'
        f'<span style="color:#5577aa;font-size:0.9em;"> &nbsp;MCL / MES Futures Dashboard</span>'
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

# Live-mode / market status strip
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
# Contracts
# ---------------------------------------------------------------------------

mcl = data["contracts"]["MCL"]
mes = data["contracts"]["MES"]

# ---------------------------------------------------------------------------
# Tabs
# ---------------------------------------------------------------------------

tab_overview, tab_charts, tab_thesis, tab_risk, tab_news = st.tabs([
    "📊 Overview",
    "📈 Charts",
    "📋 Thesis & Plan",
    "🧮 Risk Tools",
    "📰 News & Macro",
])

# ── Tab 1: Overview ─────────────────────────────────────────────────────────
with tab_overview:
    col_mcl, col_sep, col_mes = st.columns([10, 1, 10])

    with col_mcl:
        render_contract_card(mcl)

    with col_sep:
        st.markdown(
            '<div style="border-left:1px solid #c5d5ee;height:100%;'
            'min-height:600px;margin:0 auto;width:1px;"></div>',
            unsafe_allow_html=True,
        )

    with col_mes:
        render_contract_card(mes)

# ── Tab 2: Charts ────────────────────────────────────────────────────────────
with tab_charts:
    st.markdown(
        '<div style="color:#5577aa;font-size:0.8em;margin-bottom:8px;">'
        'Live TradingView charts — 5-min bars with VWAP & RSI. '
        'Use the toolbar to change timeframe, draw levels, or switch symbols.'
        '</div>',
        unsafe_allow_html=True,
    )
    ch1, ch2 = st.columns(2)
    with ch1:
        st.markdown("### MCL — Micro Crude Oil")
        render_chart_panel("MCL")
    with ch2:
        st.markdown("### MES — Micro E-mini S&P")
        render_chart_panel("MES")

# ── Tab 3: Thesis & Plan ─────────────────────────────────────────────────────
with tab_thesis:
    t1, t2 = st.columns(2)
    with t1:
        st.markdown("## MCL — Thesis & Trade Plan")
        render_thesis(mcl)
    with t2:
        st.markdown("## MES — Thesis & Trade Plan")
        render_thesis(mes)

# ── Tab 4: Risk Tools ─────────────────────────────────────────────────────────
with tab_risk:
    rr_col, chk_col = st.columns([1, 1])

    with rr_col:
        render_rr_calculator()

        st.markdown("---")
        st.markdown("## Trade Notes")
        st.text_area(
            "notes",
            height=160,
            key="user_notes",
            placeholder=(
                "Type your own thesis here...\n\n"
                "e.g. Bias long MCL on API draw. Watch 78.00 VWAP reclaim. "
                "Size down before ISM. MES — fade 5325 unless ISM beats."
            ),
            label_visibility="collapsed",
        )

        st.markdown("---")
        render_manual_input_panel()

    with chk_col:
        render_pre_session_checklist()

# ── Tab 5: News & Macro ───────────────────────────────────────────────────────
with tab_news:
    mac_col, news_col = st.columns([5, 4])
    with mac_col:
        render_macro_panel(data["macro"])
    with news_col:
        render_news_feed(data["news"])

# ---------------------------------------------------------------------------
# Footer
# ---------------------------------------------------------------------------

st.markdown(
    '<div style="color:#5577aa;font-size:0.75em;text-align:center;padding-top:12px;">'
    'Sin Miedo Capital — For internal use only. Not financial advice. Data may be delayed.'
    '</div>',
    unsafe_allow_html=True,
)
