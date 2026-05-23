"""
Live data adapter using yfinance (free, no API key).

Symbol mapping:
  MCL → CL=F  (WTI Crude front-month; MCL is 1/10 the size, same price)
  MES → ES=F  (E-mini S&P 500; MES is 1/10 the size, same price)
  VIX → ^VIX
  10Y → ^TNX  (divide by 10 to get percent)
  DXY → DX-Y.NYB

Data is ~15-min delayed on the free tier.
"""

import yfinance as yf
import pandas as pd
from datetime import datetime, date, timedelta
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# ---------------------------------------------------------------------------
# Sentiment keyword lists for news headline classification
# ---------------------------------------------------------------------------

_BULL_WORDS = {
    "rises", "gains", "higher", "up", "beats", "strong", "rally", "surge",
    "jumps", "bullish", "draw", "draws", "positive", "recovery", "recovers",
    "climbs", "advances", "boost", "lifted", "buying",
}
_BEAR_WORDS = {
    "falls", "drops", "lower", "down", "misses", "weak", "decline", "slump",
    "plunges", "bearish", "build", "builds", "negative", "selling", "concern",
    "fears", "warning", "risk", "miss", "disappoints",
}


def _classify_sentiment(headline: str) -> str:
    words = set(headline.lower().split())
    bull = len(words & _BULL_WORDS)
    bear = len(words & _BEAR_WORDS)
    if bull > bear:
        return "Bullish"
    if bear > bull:
        return "Bearish"
    return "Neutral"


def _parse_news_item(item) -> dict | None:
    """Handle both dict (old yfinance) and NewsArticle object (yfinance 1.x)."""
    try:
        if isinstance(item, dict):
            title = item.get("title", "")
            ts = item.get("providerPublishTime", 0)
            tickers = item.get("relatedTickers", [])
        else:
            # yfinance 1.x NewsArticle object
            content = getattr(item, "content", None) or {}
            if hasattr(content, "title"):
                title = content.title
                ts = getattr(content, "pubDate", 0)
                tickers = []
            else:
                title = str(getattr(item, "title", "") or "")
                ts = getattr(item, "providerPublishTime", 0) or 0
                tickers = list(getattr(item, "relatedTickers", []) or [])

        if not title:
            return None

        pub_time = datetime.fromtimestamp(int(ts)).strftime("%I:%M %p") if ts else ""
        tickers_str = [str(t).upper() for t in tickers]
        contract = "MCL" if "CL=F" in tickers_str else "MES" if "ES=F" in tickers_str else "MACRO"

        return {
            "time": pub_time,
            "headline": title,
            "sentiment": _classify_sentiment(title),
            "contract": contract,
        }
    except Exception:
        return None


# ---------------------------------------------------------------------------
# Core helpers
# ---------------------------------------------------------------------------

def _calc_atr(daily: pd.DataFrame, period: int = 14) -> float:
    if len(daily) < 2:
        return 0.0
    trs = []
    closes = daily["Close"].values
    highs = daily["High"].values
    lows = daily["Low"].values
    for i in range(1, len(daily)):
        tr = max(
            highs[i] - lows[i],
            abs(highs[i] - closes[i - 1]),
            abs(lows[i] - closes[i - 1]),
        )
        trs.append(tr)
    return round(sum(trs[-period:]) / min(len(trs), period), 2)


def _calc_vwap(intraday: pd.DataFrame) -> float | None:
    try:
        today = date.today()
        # Support both timezone-aware and naive index
        try:
            mask = intraday.index.tz_convert("America/New_York").normalize().date == today
        except Exception:
            mask = pd.Series(intraday.index).apply(lambda x: x.date() == today).values

        bars = intraday[mask]
        if bars.empty or bars["Volume"].sum() == 0:
            return None
        typical = (bars["High"] + bars["Low"] + bars["Close"]) / 3
        return round((typical * bars["Volume"]).sum() / bars["Volume"].sum(), 2)
    except Exception:
        return None


def _round_to_key_level(price: float, is_crude: bool) -> list[float]:
    """Generate nearby round-number key levels."""
    levels = []
    if is_crude:
        base = round(price)
        for offset in [-2, -1, 0, 1, 2]:
            lvl = base + offset
            if abs(lvl - price) > 0.1:
                levels.append(round(lvl, 2))
    else:
        base = round(price / 25) * 25
        for offset in [-2, -1, 0, 1, 2]:
            lvl = base + offset * 25
            if abs(lvl - price) > 2:
                levels.append(round(lvl, 2))
    return levels


def _build_key_levels(price, prior_high, prior_low, session_high, session_low, is_crude):
    resistance = []
    support = []

    round_lvls = _round_to_key_level(price, is_crude)
    for lvl in round_lvls:
        if lvl > price:
            resistance.append({"level": lvl, "note": "Round number"})
        else:
            support.append({"level": lvl, "note": "Round number"})

    # Prior day levels override round numbers if close
    resistance = [r for r in resistance if abs(r["level"] - prior_high) > (0.20 if is_crude else 5)]
    support = [s for s in support if abs(s["level"] - prior_low) > (0.20 if is_crude else 5)]

    resistance.insert(0, {"level": round(prior_high, 2), "note": "Prior day high"})
    support.insert(0, {"level": round(prior_low, 2), "note": "Prior day low"})

    if abs(session_high - prior_high) > (0.10 if is_crude else 3):
        resistance.append({"level": round(session_high, 2), "note": "Session high"})
    if abs(session_low - prior_low) > (0.10 if is_crude else 3):
        support.append({"level": round(session_low, 2), "note": "Session low"})

    resistance.sort(key=lambda x: x["level"])
    support.sort(key=lambda x: x["level"], reverse=True)

    return resistance[:3], support[:3]


def _generate_thesis(symbol: str, d: dict) -> tuple[str, str, str, str, str, str, str]:
    """Return (trend, bias, volatility, setup_type, thesis, bullish_scenario, bearish_scenario)."""
    price = d["current_price"]
    vwap = d["vwap"] or price
    change = d["change"]
    atr = d["atr_14"] or 1
    prior_high = d["prior_day_high"]
    prior_low = d["prior_day_low"]
    session_high = d["overnight_high"]
    session_low = d["overnight_low"]
    session_range = session_high - session_low

    above_vwap = price > vwap
    gap_pct = abs(change) / atr

    # Trend
    if change > atr * 0.25:
        trend = "Bullish"
    elif change < -atr * 0.25:
        trend = "Bearish"
    else:
        trend = "Neutral"

    # Volatility
    if session_range > atr * 1.3:
        volatility = "High"
    elif session_range > atr * 0.6:
        volatility = "Medium"
    else:
        volatility = "Low"

    # Bias
    if trend == "Bullish" and above_vwap:
        bias = "Long"
    elif trend == "Bearish" and not above_vwap:
        bias = "Short"
    else:
        bias = "Neutral / Watch"

    # Setup
    if price > prior_high:
        setup_type = "Breakout"
    elif price < prior_low:
        setup_type = "Breakdown"
    elif gap_pct > 0.5:
        setup_type = "Gap Fade"
    else:
        setup_type = "Range / Fade"

    vwap_str = "above" if above_vwap else "below"
    gap_dir = "up" if change >= 0 else "down"
    fmt = lambda v: f"{v:,.2f}"

    if symbol == "MCL":
        name = "Crude"
        inv_long = fmt(session_low)
        inv_short = fmt(session_high)
        target_bull = fmt(prior_high + atr * 0.5)
        target_bear = fmt(prior_low - atr * 0.5)
    else:
        name = "MES"
        inv_long = fmt(session_low)
        inv_short = fmt(session_high)
        target_bull = fmt(prior_high + atr * 0.5)
        target_bear = fmt(prior_low - atr * 0.5)

    thesis = (
        f"{name} is {gap_dir} {fmt(abs(change))} from prior close ({fmt(d['prev_close'])}). "
        f"Price is {vwap_str} VWAP ({fmt(vwap)}), "
        f"session range {fmt(session_low)}–{fmt(session_high)} "
        f"({fmt(session_range)} vs ATR {fmt(atr)}). "
        f"Bias: {bias}."
    )

    bull_scenario = (
        f"Hold {vwap_str} VWAP ({fmt(vwap)}) and accept above {fmt(session_high)}. "
        f"Target: prior day high {fmt(prior_high)}, extension toward {target_bull}."
    )

    bear_scenario = (
        f"Fail to hold VWAP ({fmt(vwap)}) and break below {fmt(session_low)}. "
        f"Target: prior day low {fmt(prior_low)}, extension toward {target_bear}."
    )

    trade_plan = (
        f"{'Long' if bias == 'Long' else 'Short' if bias == 'Short' else 'Watch'} bias. "
        f"{'Long entry on reclaim of ' + fmt(vwap) + ' with stop below ' + inv_long if bias == 'Long' else 'Short entry on rejection at ' + fmt(vwap) + ' with stop above ' + inv_short if bias == 'Short' else 'Wait for VWAP acceptance or rejection before committing direction.'}."
    )

    watch = (
        f"Watch VWAP ({fmt(vwap)}) and session {'high' if bias == 'Long' else 'low'} "
        f"({''+fmt(session_high) if bias == 'Long' else fmt(session_low)}) at the open. "
        f"Prior day {'high' if bias != 'Short' else 'low'} "
        f"({fmt(prior_high) if bias != 'Short' else fmt(prior_low)}) is the key level to clear."
    )

    inv_level = float(inv_long) if bias == "Long" else float(inv_short) if bias == "Short" else float(session_low)
    risk_level = "High" if volatility == "High" else "Medium"

    return trend, bias, volatility, setup_type, thesis, bull_scenario, bear_scenario, trade_plan, watch, inv_level, risk_level


# ---------------------------------------------------------------------------
# Per-contract fetch
# ---------------------------------------------------------------------------

def _fetch_contract(yf_symbol: str, display_symbol: str, display_name: str) -> dict:
    is_crude = display_symbol == "MCL"
    decimals = 2

    ticker = yf.Ticker(yf_symbol)
    daily = ticker.history(period="10d", interval="1d")
    intraday = ticker.history(period="2d", interval="5m")

    today = date.today()

    if daily.empty:
        raise RuntimeError(f"No daily data returned for {yf_symbol}")

    # Current price
    try:
        current_price = round(float(ticker.fast_info.last_price), decimals)
    except Exception:
        current_price = round(float(daily["Close"].iloc[-1]), decimals)

    # Prior day rows (exclude today's partial bar if present)
    prior_rows = daily[daily.index.normalize().date < today] if hasattr(daily.index, "normalize") else daily[pd.Series(daily.index).apply(lambda x: x.date() < today).values]
    if prior_rows.empty:
        prior_rows = daily.iloc[:-1] if len(daily) > 1 else daily

    prev_close = round(float(prior_rows["Close"].iloc[-1]), decimals)
    prior_day_high = round(float(prior_rows["High"].iloc[-1]), decimals)
    prior_day_low = round(float(prior_rows["Low"].iloc[-1]), decimals)
    prior_day_close = prev_close

    # Today's session range
    try:
        today_bars = intraday[intraday.index.tz_convert("America/New_York").normalize().date == today]
    except Exception:
        today_bars = intraday[pd.Series(intraday.index).apply(lambda x: x.date() == today).values]

    if not today_bars.empty:
        session_high = round(float(today_bars["High"].max()), decimals)
        session_low = round(float(today_bars["Low"].min()), decimals)
        volume = int(today_bars["Volume"].sum())
    else:
        session_high = round(float(daily["High"].iloc[-1]), decimals)
        session_low = round(float(daily["Low"].iloc[-1]), decimals)
        volume = int(daily["Volume"].iloc[-1])

    vwap = _calc_vwap(intraday)
    atr = _calc_atr(prior_rows)
    change = round(current_price - prev_close, decimals)
    change_pct = round(change / prev_close * 100, 2) if prev_close else 0

    gap_size = change
    gap = "Gap Up" if gap_size > 0.05 else "Gap Down" if gap_size < -0.05 else "Flat"

    resistance, support = _build_key_levels(
        current_price, prior_day_high, prior_day_low,
        session_high, session_low, is_crude
    )

    base = {
        "symbol": display_symbol,
        "name": display_name,
        "current_price": current_price,
        "prev_close": prev_close,
        "change": change,
        "change_pct": change_pct,
        "overnight_high": session_high,
        "overnight_low": session_low,
        "prior_day_high": prior_day_high,
        "prior_day_low": prior_day_low,
        "prior_day_close": prior_day_close,
        "vwap": vwap or round((session_high + session_low) / 2, decimals),
        "atr_14": atr,
        "volume": volume,
        "gap": gap,
        "gap_size": gap_size,
        "key_resistance": resistance,
        "key_support": support,
    }

    (trend, bias, volatility, setup_type, thesis,
     bull, bear, trade_plan, watch, inv_level, risk_level) = _generate_thesis(display_symbol, base)

    risk_reasons = []
    if volatility == "High":
        risk_reasons.append(f"Elevated volatility — session range {round(session_high - session_low, 2)} vs ATR {atr}")
    if abs(gap_size) > atr * 0.4:
        risk_reasons.append(f"{gap} of {abs(gap_size):.2f} — gap fade risk")

    base.update({
        "trend": trend,
        "bias": bias,
        "volatility": volatility,
        "setup_type": setup_type,
        "thesis": thesis,
        "bullish_scenario": bull,
        "bearish_scenario": bear,
        "trade_plan": trade_plan,
        "watch_next_open": watch,
        "invalidation": inv_level,
        "risk_level": risk_level,
        "risk_reasons": risk_reasons if risk_reasons else ["Standard market risk — monitor catalysts"],
    })
    return base


# ---------------------------------------------------------------------------
# Macro fetch
# ---------------------------------------------------------------------------

def _fetch_macro() -> dict:
    macro = {
        "headline_risk": "Medium",
        "fed_stance": "Unknown",
        "equity_trend": "Unknown",
        "dollar_index": 0.0,
        "dollar_change": 0.0,
        "vix": 0.0,
        "vix_change": 0.0,
        "ten_year_yield": 0.0,
        "ten_year_change": 0.0,
        "economic_events": [],
    }

    for symbol, key, scale in [
        ("^VIX", "vix", 1),
        ("^TNX", "ten_year_yield", 1),
        ("DX-Y.NYB", "dollar_index", 1),
    ]:
        try:
            t = yf.Ticker(symbol)
            h = t.history(period="2d", interval="1d")
            if len(h) >= 2:
                macro[key] = round(float(h["Close"].iloc[-1]) * scale, 2)
                macro[key.replace("vix", "vix").replace("ten_year_yield", "ten_year") + "_change"] = round(
                    float(h["Close"].iloc[-1] - h["Close"].iloc[-2]) * scale, 2
                )
            elif len(h) == 1:
                macro[key] = round(float(h["Close"].iloc[-1]) * scale, 2)
        except Exception:
            pass

    # Rename computed change keys correctly
    try:
        macro["vix_change"] = round(float(yf.Ticker("^VIX").history(period="2d", interval="1d")["Close"].diff().iloc[-1]), 2)
    except Exception:
        pass
    try:
        macro["ten_year_change"] = round(float(yf.Ticker("^TNX").history(period="2d", interval="1d")["Close"].diff().iloc[-1]), 2)
    except Exception:
        pass
    try:
        macro["dollar_change"] = round(float(yf.Ticker("DX-Y.NYB").history(period="2d", interval="1d")["Close"].diff().iloc[-1]), 2)
    except Exception:
        pass

    # Derived headline risk
    vix = macro["vix"]
    if vix > 25:
        macro["headline_risk"] = "High"
    elif vix > 18:
        macro["headline_risk"] = "Medium"
    else:
        macro["headline_risk"] = "Low"

    return macro


# ---------------------------------------------------------------------------
# News fetch
# ---------------------------------------------------------------------------

def _fetch_news() -> list:
    news = []
    seen = set()
    for yf_symbol, contract in [("CL=F", "MCL"), ("ES=F", "MES")]:
        try:
            items = yf.Ticker(yf_symbol).news or []
            for item in items[:8]:
                parsed = _parse_news_item(item)
                if parsed and parsed["headline"] not in seen:
                    seen.add(parsed["headline"])
                    parsed["contract"] = contract
                    news.append(parsed)
        except Exception:
            pass
    return news[:12]


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

def get_yfinance_data() -> dict:
    from datetime import datetime

    errors = []

    # Contracts
    contracts = {}
    for yf_sym, disp_sym, disp_name in [
        ("CL=F", "MCL", "Micro Crude Oil"),
        ("ES=F", "MES", "Micro E-mini S&P 500"),
    ]:
        try:
            contracts[disp_sym] = _fetch_contract(yf_sym, disp_sym, disp_name)
        except Exception as e:
            errors.append(f"{disp_sym}: {e}")

    macro = {}
    try:
        macro = _fetch_macro()
    except Exception as e:
        errors.append(f"macro: {e}")
        macro = {
            "headline_risk": "Unknown", "fed_stance": "Unknown",
            "equity_trend": "Unknown", "dollar_index": 0, "dollar_change": 0,
            "vix": 0, "vix_change": 0, "ten_year_yield": 0, "ten_year_change": 0,
            "economic_events": [],
        }

    news = []
    try:
        news = _fetch_news()
    except Exception as e:
        errors.append(f"news: {e}")

    result = {
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S ET") + " (~15min delay)",
        "session_date": datetime.now().strftime("%A, %B %d, %Y"),
        "macro": macro,
        "news": news,
        "contracts": contracts,
    }

    if errors:
        result["live_warning"] = "Some data failed to load: " + " | ".join(errors)

    return result
