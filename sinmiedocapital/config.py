# DATA_MODE: "manual" uses mock_data.py; "live" calls the configured API adapter.
DATA_MODE = "live"

# When DATA_MODE == "live", set the provider and credentials here.
# "yfinance" is free with no API key — ~15min delayed data.
LIVE_DATA_PROVIDER = "yfinance"  # options: "yfinance" | "polygon" | "tradovate" | "alpaca"
API_KEY = ""
API_SECRET = ""

# --- Free data source API keys (optional but recommended) ---

# Twelve Data: free tier, 800 credits/day — used as price fallback when yfinance fails.
# Sign up free at: https://twelvedata.com
# On Streamlit Community Cloud, set via: Settings → Secrets → TWELVEDATA_API_KEY = "your_key"
TWELVEDATA_API_KEY = ""

# FRED (Federal Reserve Economic Data): free, no rate limits with a key.
# Used for reliable 10Y yield, VIX, and DXY macro data.
# Sign up free at: https://fred.stlouisfed.org/docs/api/api_key.html
# On Streamlit Community Cloud, set via: Settings → Secrets → FRED_API_KEY = "your_key"
FRED_API_KEY = ""

CONTRACTS = {
    "MCL": {
        "name": "Micro Crude Oil",
        "description": "NYMEX WTI Light Sweet Crude Oil (Micro)",
        "tick_size": 0.01,
        "tick_value": 1.00,
        "unit": "USD/bbl",
    },
    "MES": {
        "name": "Micro E-mini S&P 500",
        "description": "CME Micro E-mini S&P 500 Index",
        "tick_size": 0.25,
        "tick_value": 1.25,
        "unit": "Index pts",
    },
}

# Auto-refresh interval in seconds (only applies in live mode).
REFRESH_INTERVAL = 60

# Dashboard display preferences
SHOW_VWAP = True
SHOW_ATR = True
SHOW_VOLUME = True
