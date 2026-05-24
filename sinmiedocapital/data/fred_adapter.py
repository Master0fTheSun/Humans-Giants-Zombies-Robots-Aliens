"""
FRED (Federal Reserve Economic Data) macro adapter.

Free API — works without a key (120 req/day per IP) or with a free key
(unlimited). Sign up: fred.stlouisfed.org/docs/api/api_key.html

Series used:
  VIXCLS    — CBOE VIX daily close
  DGS10     — 10-Year Treasury Constant Maturity Rate (%)
  DTWEXBGS  — Trade Weighted U.S. Dollar Index: Broad (proxy for DXY)
"""

import urllib.request
import urllib.parse
import json

_BASE = "https://api.stlouisfed.org/fred/series/observations"


def get_fred_series(series_id: str, api_key: str = "") -> tuple:
    """
    Return (current_value, day_change) for a FRED series.
    Returns (0.0, 0.0) on any error so callers can safely check for zeros.
    """
    params = {
        "series_id":  series_id,
        "sort_order": "desc",
        "limit":      "5",
        "file_type":  "json",
    }
    if api_key:
        params["api_key"] = api_key

    url = f"{_BASE}?" + urllib.parse.urlencode(params)
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=8) as r:
            data = json.loads(r.read())

        obs = [o for o in data.get("observations", [])
               if o.get("value", ".") not in (".", "")]
        if not obs:
            return 0.0, 0.0

        current = round(float(obs[0]["value"]), 2)
        prior   = round(float(obs[1]["value"]), 2) if len(obs) > 1 else current
        return current, round(current - prior, 2)

    except Exception:
        return 0.0, 0.0


def get_fred_macro(api_key: str = "") -> dict:
    """
    Fetch VIX, 10Y yield, and dollar index from FRED.
    Returns a partial macro dict — caller merges with yfinance fallback.
    Zero values mean the fetch failed for that series.
    """
    vix,    vix_ch    = get_fred_series("VIXCLS",   api_key)
    yield_, yield_ch  = get_fred_series("DGS10",    api_key)
    dxy,    dxy_ch    = get_fred_series("DTWEXBGS", api_key)

    return {
        "vix":             vix,
        "vix_change":      vix_ch,
        "ten_year_yield":  yield_,
        "ten_year_change": yield_ch,
        "dollar_index":    dxy,
        "dollar_change":   dxy_ch,
    }
