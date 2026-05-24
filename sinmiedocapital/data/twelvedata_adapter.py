"""
Twelve Data adapter — free-tier fallback for futures price data.

Free tier: 800 API credits/day, 8 requests/minute.
Sign up (free): twelvedata.com

Symbol mapping:
  MCL → "CL/USD"   (WTI Crude Oil)
  MES → "ES/USD"   (E-mini S&P 500)

Usage here is minimal — only called when yfinance fails.
A /price call costs 1 credit. Used as price-only fallback.
"""

import urllib.request
import urllib.parse
import json

_BASE       = "https://api.twelvedata.com"
_SYMBOL_MAP = {"MCL": "CL/USD", "MES": "ES/USD"}


def _get(endpoint: str, params: dict) -> dict:
    url = f"{_BASE}/{endpoint}?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=10) as r:
        return json.loads(r.read())


def get_price(symbol: str, api_key: str) -> float:
    """
    Fetch the current price for MCL or MES from Twelve Data.
    Costs 1 API credit. Raises RuntimeError on failure.
    """
    if not api_key:
        raise RuntimeError("No Twelve Data API key configured")

    td_symbol = _SYMBOL_MAP.get(symbol, symbol)
    data = _get("price", {"symbol": td_symbol, "apikey": api_key})

    if "price" not in data:
        raise RuntimeError(
            f"Twelve Data error for {symbol}: {data.get('message', str(data))}"
        )
    return round(float(data["price"]), 2)
