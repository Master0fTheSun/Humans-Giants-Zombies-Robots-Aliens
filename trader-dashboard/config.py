# DATA_MODE: "manual" uses mock_data.py; "live" calls the configured API adapter.
DATA_MODE = "manual"

# When DATA_MODE == "live", set the provider and credentials here.
LIVE_DATA_PROVIDER = "none"   # options: "none" | "polygon" | "tradovate" | "alpaca"
API_KEY = ""
API_SECRET = ""

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
