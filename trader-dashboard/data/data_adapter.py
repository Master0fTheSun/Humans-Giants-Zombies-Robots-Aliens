"""
Data adapter layer. Returns mock data or calls a live API depending on config.

To add a live provider:
1. Set DATA_MODE = "live" and LIVE_DATA_PROVIDER = "<name>" in config.py
2. Implement the provider function below following the same return schema as mock_data.
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import config
from data.mock_data import get_mock_data


def get_dashboard_data() -> dict:
    if config.DATA_MODE == "live":
        return _get_live_data()
    return get_mock_data()


def _get_live_data() -> dict:
    provider = config.LIVE_DATA_PROVIDER

    if provider == "yfinance":
        from data.yfinance_adapter import get_yfinance_data
        return get_yfinance_data()
    elif provider == "polygon":
        return _fetch_polygon()
    elif provider == "tradovate":
        return _fetch_tradovate()
    elif provider == "alpaca":
        return _fetch_alpaca()
    else:
        # No provider configured — fall back to mock with a warning flag.
        data = get_mock_data()
        data["live_warning"] = (
            "DATA_MODE is 'live' but no provider is configured. "
            "Set LIVE_DATA_PROVIDER in config.py. Showing mock data."
        )
        return data


# ---------------------------------------------------------------------------
# Provider stubs — replace these with real implementations
# ---------------------------------------------------------------------------

def _fetch_polygon() -> dict:
    """Fetch via Polygon.io REST API (futures require Stocks Starter+ plan)."""
    raise NotImplementedError(
        "Polygon adapter not implemented. "
        "See https://polygon.io/docs for API reference."
    )


def _fetch_tradovate() -> dict:
    """Fetch via Tradovate WebSocket / REST API."""
    raise NotImplementedError(
        "Tradovate adapter not implemented. "
        "See https://api.tradovate.com for API reference."
    )


def _fetch_alpaca() -> dict:
    """Fetch via Alpaca Markets data API."""
    raise NotImplementedError(
        "Alpaca adapter not implemented. "
        "See https://alpaca.markets/docs for API reference."
    )
