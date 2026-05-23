"""
Live data adapter using yfinance (free, no API key).

Symbol mapping:
  MCL → CL=F  (WTI Crude front-month; MCL is 1/10 the size, same price)
  MES → ES=F  (E-mini S&P 500; MES is 1/10 the size, same price)
  VIX → ^VIX
  10Y → ^TNX
  DXY → DX-Y.NYB

Data is ~15-min delayed on the free tier.
"""

import yfinance as yf
import pandas as pd
import xml.etree.ElementTree as ET
import urllib.request
from datetime import datetime, date
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# ---------------------------------------------------------------------------
# Sentiment keyword classifier
# ---------------------------------------------------------------------------

_BULL_WORDS = {
    "rises", "gains", "higher", "up", "beats", "strong", "rally", "surge",
    "jumps", "bullish", "draw", "draws", "positive", "recovery", "recovers",
    "climbs", "advances", "boost", "lifted", "buying", "soars", "rebounds",
}
_BEAR_WORDS = {
    "falls", "drops", "lower", "down", "misses", "weak", "decline", "slump",
    "plunges", "bearish", "build", "builds", "negative", "selling", "concern",
    "fears", "warning", "risk", "miss", "disappoints", "tumbles", "slides",
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


# ---------------------------------------------------------------------------
# News parsing — 5 strategies to handle all yfinance versions
# ---------------------------------------------------------------------------

def _parse_news_item(item) -> dict | None:
    title = None
    ts = 0

    try:
        # Strategy 1: plain dict (yfinance < 0.2)
        if isinstance(item, dict):
            title = item.get("title") or item.get("headline", "")
            ts = item.get("providerPublishTime", 0) or item.get("timestamp", 0)

        else:
            # Strategy 2: yfinance 1.x NewsArticle — content object
            content = getattr(item, "content", None)
            if content is not None and not isinstance(content, dict):
                title = getattr(content, "title", None)
                pub = getattr(content, "pubDate", None)
                if pub:
                    try:
                        ts = pub.timestamp() if hasattr(pub, "timestamp") else float(pub)
                    except Exception:
                        ts = 0

            # Strategy 3: content is a dict
            elif isinstance(content, dict):
                title = content.get("title", "")
                ts = content.get("pubDate", 0) or content.get("timestamp", 0)

            # Strategy 4: direct attributes
            if not title:
                title = (getattr(item, "title", None) or
                         getattr(item, "headline", None) or
                         getattr(item, "_title", None))

            # Strategy 5: __dict__ inspection
            if not title and hasattr(item, "__dict__"):
                d = vars(item)
                title = d.get("title") or d.get("headline", "")

    except Exception:
        return None

    if not title or not str(title).strip():
        return None

    title = str(title).strip()
    try:
        pub_time = datetime.fromtimestamp(float(ts)).strftime("%I:%M %p") if ts else ""
    except Exception:
        pub_time = ""

    return {"time": pub_time, "headline": title,
            "sentiment": _classify_sentiment(title), "contract": "MACRO"}


def _fetch_news_rss(yf_symbol: str, contract: str) -> list:
    """Yahoo Finance RSS feed — fallback when yfinance news returns empty."""
    from email.utils import parsedate_to_datetime
    encoded = yf_symbol.replace("=", "%3D").replace("^", "%5E")
    url = (f"https://feeds.finance.yahoo.com/rss/2.0/headline"
           f"?s={encoded}&region=US&lang=en-US")
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=8) as r:
            xml_data = r.read()
        root = ET.fromstring(xml_data)
        news = []
        for item in root.findall(".//item")[:6]:
            title = (item.findtext("title") or "").strip()
            pub = item.findtext("pubDate", "")
            if not title:
                continue
            try:
                time_str = parsedate_to_datetime(pub).strftime("%I:%M %p")
            except Exception:
                time_str = ""
            news.append({"time": time_str, "headline": title,
                         "sentiment": _classify_sentiment(title), "contract": contract})
        return news
    except Exception:
        return []


# ---------------------------------------------------------------------------
# Price fetching — most reliable first
# ---------------------------------------------------------------------------

def _get_current_price(ticker, daily: pd.DataFrame, decimals: int) -> float:
    # 1-min bars are the freshest source for futures
    for interval in ("1m", "2m", "5m"):
        try:
            h = ticker.history(period="1d", interval=interval)
            if not h.empty:
                price = float(h["Close"].iloc[-1])
                if price > 0:
                    return round(price, decimals)
        except Exception:
            continue

    # fast_info as secondary
    try:
        price = ticker.fast_info.last_price
        if price and price > 0:
            return round(float(price), decimals)
    except Exception:
        pass

    # Daily close as last resort
    return round(float(daily["Close"].iloc[-1]), decimals)


# ---------------------------------------------------------------------------
# Market status
# ---------------------------------------------------------------------------

def _market_status() -> dict:
    """Rough CME Globex open/closed indicator based on ET time."""
    try:
        import pytz
        et = pytz.timezone("America/New_York")
        now = datetime.now(et)
    except Exception:
        now = datetime.utcnow()

    wd = now.weekday()   # 0=Mon … 6=Sun
    h, m = now.hour, now.minute

    # Saturday all day, Sunday before 6PM ET → closed
    if wd == 5 or (wd == 6 and h < 18):
        return {"status": "Closed", "color": "#e74c3c", "note": "Weekend — markets closed"}
    # Friday after 5PM ET → closed
    if wd == 4 and (h > 17 or (h == 17 and m >= 0)):
        return {"status": "Closed", "color": "#e74c3c", "note": "Weekend — markets closed"}
    # Daily maintenance break 5–6PM ET
    if h == 17:
        return {"status": "Break", "color": "#f39c12", "note": "Daily maintenance break (5–6 PM ET)"}
    # Regular trading hours 9:30AM–4PM ET
    if (h == 9 and m >= 30) or (10 <= h <= 15) or (h == 16 and m == 0):
        return {"status": "RTH Open", "color": "#2ecc71", "note": "Regular trading hours"}
    # All other times = Globex overnight session
    return {"status": "Globex", "color": "#74b9ff", "note": "Overnight Globex session"}


# ---------------------------------------------------------------------------
# Core math helpers
# ---------------------------------------------------------------------------

def _calc_atr(daily: pd.DataFrame, period: int = 14) -> float:
    if len(daily) < 2:
        return 0.0
    closes = daily["Close"].values
    highs  = daily["High"].values
    lows   = daily["Low"].values
    trs = [max(highs[i] - lows[i],
               abs(highs[i] - closes[i - 1]),
               abs(lows[i] - closes[i - 1]))
           for i in range(1, len(daily))]
    return round(sum(trs[-period:]) / min(len(trs), period), 2)


def _calc_vwap(intraday: pd.DataFrame) -> float | None:
    try:
        today = date.today()
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


def _today_bars(intraday: pd.DataFrame) -> pd.DataFrame:
    today = date.today()
    try:
        return intraday[intraday.index.tz_convert("America/New_York").normalize().date == today]
    except Exception:
        return intraday[pd.Series(intraday.index).apply(lambda x: x.date() == today).values]


def _build_key_levels(price, prior_high, prior_low, sess_high, sess_low, is_crude):
    gap = 0.20 if is_crude else 5
    step = 1 if is_crude else 25
    base = round(price) if is_crude else round(price / step) * step

    resistance, support = [], []
    for offset in range(-3, 4):
        lvl = round(base + offset * step, 2)
        if abs(lvl - price) < 0.05:
            continue
        if lvl > price:
            resistance.append({"level": lvl, "note": "Round number"})
        else:
            support.append({"level": lvl, "note": "Round number"})

    resistance = [r for r in resistance if abs(r["level"] - prior_high) > gap]
    support    = [s for s in support    if abs(s["level"] - prior_low)  > gap]

    resistance.insert(0, {"level": round(prior_high, 2), "note": "Prior day high"})
    support.insert(0,    {"level": round(prior_low,  2), "note": "Prior day low"})

    if abs(sess_high - prior_high) > gap:
        resistance.append({"level": round(sess_high, 2), "note": "Session high"})
    if abs(sess_low - prior_low) > gap:
        support.append({"level": round(sess_low, 2), "note": "Session low"})

    resistance.sort(key=lambda x: x["level"])
    support.sort(key=lambda x: x["level"], reverse=True)
    return resistance[:3], support[:3]


def _generate_thesis(symbol: str, d: dict):
    price  = d["current_price"]
    vwap   = d["vwap"] or price
    change = d["change"]
    atr    = d["atr_14"] or 1
    ph, pl = d["prior_day_high"], d["prior_day_low"]
    sh, sl = d["overnight_high"],  d["overnight_low"]
    sr     = sh - sl
    fmt    = lambda v: f"{v:,.2f}"

    above_vwap = price > vwap
    trend  = ("Bullish" if change > atr * 0.25
              else "Bearish" if change < -atr * 0.25
              else "Neutral")
    vol    = ("High" if sr > atr * 1.3 else "Medium" if sr > atr * 0.6 else "Low")
    bias   = ("Long"  if trend == "Bullish" and above_vwap
              else "Short" if trend == "Bearish" and not above_vwap
              else "Neutral / Watch")
    setup  = ("Breakout"  if price > ph
              else "Breakdown" if price < pl
              else "Gap Fade"  if abs(change) / atr > 0.5
              else "Range / Fade")

    vwap_s  = "above" if above_vwap else "below"
    gap_dir = "up" if change >= 0 else "down"
    name    = "Crude" if symbol == "MCL" else "MES"
    t_bull  = fmt(ph + atr * 0.5)
    t_bear  = fmt(pl - atr * 0.5)
    inv_l   = fmt(sl)
    inv_s   = fmt(sh)

    thesis = (
        f"{name} is {gap_dir} {fmt(abs(change))} from prior close ({fmt(d['prev_close'])}). "
        f"Price is {vwap_s} VWAP ({fmt(vwap)}), session range {fmt(sl)}–{fmt(sh)} "
        f"({fmt(sr)} vs ATR {fmt(atr)}). Bias: {bias}."
    )
    bull = (f"Hold {vwap_s} VWAP ({fmt(vwap)}) and accept above {fmt(sh)}. "
            f"Target: prior day high {fmt(ph)}, extension toward {t_bull}.")
    bear = (f"Fail to hold VWAP ({fmt(vwap)}) and break {fmt(sl)}. "
            f"Target: prior day low {fmt(pl)}, extension toward {t_bear}.")

    if bias == "Long":
        plan = f"Long entry on reclaim of {fmt(vwap)} with stop below {inv_l}."
    elif bias == "Short":
        plan = f"Short entry on rejection at {fmt(vwap)} with stop above {inv_s}."
    else:
        plan = "Wait for VWAP acceptance or rejection before committing direction."

    watch = (f"Watch VWAP ({fmt(vwap)}) and session "
             f"{'high ' + fmt(sh) if bias == 'Long' else 'low ' + fmt(sl)} at the open. "
             f"Prior day {'high ' + fmt(ph) if bias != 'Short' else 'low ' + fmt(pl)} is key.")

    inv_level = float(inv_l) if bias == "Long" else float(inv_s) if bias == "Short" else float(sl)
    risk      = "High" if vol == "High" else "Medium"

    return trend, bias, vol, setup, thesis, bull, bear, plan, watch, inv_level, risk


# ---------------------------------------------------------------------------
# Per-contract fetch
# ---------------------------------------------------------------------------

def _fetch_contract(yf_symbol: str, display_symbol: str, display_name: str) -> dict:
    decimals = 2
    ticker   = yf.Ticker(yf_symbol)
    daily    = ticker.history(period="15d", interval="1d")
    intraday = ticker.history(period="2d",  interval="5m")
    today    = date.today()

    if daily.empty:
        raise RuntimeError(f"No data for {yf_symbol}")

    current_price = _get_current_price(ticker, daily, decimals)

    # Prior completed session (exclude any partial bar for today)
    try:
        prior_rows = daily[daily.index.tz_convert("America/New_York").normalize().date < today]
    except Exception:
        prior_rows = daily[pd.Series(daily.index).apply(lambda x: x.date() < today).values]
    if prior_rows.empty:
        prior_rows = daily.iloc[:-1] if len(daily) > 1 else daily

    prev_close     = round(float(prior_rows["Close"].iloc[-1]), decimals)
    prior_day_high = round(float(prior_rows["High"].iloc[-1]),  decimals)
    prior_day_low  = round(float(prior_rows["Low"].iloc[-1]),   decimals)

    # Today's session bars
    bars = _today_bars(intraday)
    if not bars.empty:
        sess_high = round(float(bars["High"].max()), decimals)
        sess_low  = round(float(bars["Low"].min()),  decimals)
        volume    = int(bars["Volume"].sum())
    else:
        # Market closed / pre-session — use prior day range as placeholder
        sess_high = prior_day_high
        sess_low  = prior_day_low
        volume    = int(prior_rows["Volume"].iloc[-1])

    vwap   = _calc_vwap(intraday)
    atr    = _calc_atr(prior_rows)
    change = round(current_price - prev_close, decimals)
    chg_pct = round(change / prev_close * 100, 2) if prev_close else 0
    gap    = "Gap Up" if change > 0.05 else "Gap Down" if change < -0.05 else "Flat"

    is_crude = display_symbol == "MCL"
    resistance, support = _build_key_levels(
        current_price, prior_day_high, prior_day_low,
        sess_high, sess_low, is_crude
    )

    base = {
        "symbol":          display_symbol,
        "name":            display_name,
        "current_price":   current_price,
        "prev_close":      prev_close,
        "change":          change,
        "change_pct":      chg_pct,
        "overnight_high":  sess_high,
        "overnight_low":   sess_low,
        "prior_day_high":  prior_day_high,
        "prior_day_low":   prior_day_low,
        "prior_day_close": prev_close,
        "vwap":            vwap or round((sess_high + sess_low) / 2, decimals),
        "atr_14":          atr,
        "volume":          volume,
        "gap":             gap,
        "gap_size":        change,
        "key_resistance":  resistance,
        "key_support":     support,
    }

    (trend, bias, vol, setup, thesis, bull, bear,
     plan, watch, inv_level, risk) = _generate_thesis(display_symbol, base)

    risk_reasons = []
    if vol == "High":
        risk_reasons.append(f"Elevated volatility — range {round(sess_high - sess_low, 2)} vs ATR {atr}")
    if abs(change) > atr * 0.4:
        risk_reasons.append(f"{gap} of {abs(change):.2f} — gap fade risk")

    base.update({
        "trend":          trend,
        "bias":           bias,
        "volatility":     vol,
        "setup_type":     setup,
        "thesis":         thesis,
        "bullish_scenario": bull,
        "bearish_scenario": bear,
        "trade_plan":     plan,
        "watch_next_open": watch,
        "invalidation":   inv_level,
        "risk_level":     risk,
        "risk_reasons":   risk_reasons or ["Standard market risk — monitor catalysts"],
    })
    return base


# ---------------------------------------------------------------------------
# Macro
# ---------------------------------------------------------------------------

def _fetch_macro() -> dict:
    macro = {
        "headline_risk": "Medium", "fed_stance": "Unknown",
        "equity_trend": "Unknown",
        "dollar_index": 0.0, "dollar_change": 0.0,
        "vix": 0.0,           "vix_change": 0.0,
        "ten_year_yield": 0.0, "ten_year_change": 0.0,
        "economic_events": [],
    }
    for symbol, val_key, chg_key in [
        ("^VIX",      "vix",            "vix_change"),
        ("^TNX",      "ten_year_yield",  "ten_year_change"),
        ("DX-Y.NYB",  "dollar_index",    "dollar_change"),
    ]:
        try:
            h = yf.Ticker(symbol).history(period="5d", interval="1d")
            if not h.empty:
                macro[val_key] = round(float(h["Close"].iloc[-1]), 2)
                if len(h) >= 2:
                    macro[chg_key] = round(float(h["Close"].diff().iloc[-1]), 2)
        except Exception:
            pass

    vix = macro["vix"]
    macro["headline_risk"] = ("High" if vix > 25
                              else "Medium" if vix > 18
                              else "Low" if vix > 0
                              else "Unknown")
    return macro


# ---------------------------------------------------------------------------
# News — yfinance primary, Yahoo RSS fallback
# ---------------------------------------------------------------------------

def _fetch_news() -> list:
    news = []
    seen = set()

    for yf_sym, contract in [("CL=F", "MCL"), ("ES=F", "MES")]:
        items_parsed = []

        # Primary: yfinance
        try:
            raw = yf.Ticker(yf_sym).news or []
            for item in raw[:8]:
                parsed = _parse_news_item(item)
                if parsed and parsed["headline"] not in seen:
                    seen.add(parsed["headline"])
                    parsed["contract"] = contract
                    items_parsed.append(parsed)
        except Exception:
            pass

        # Fallback: Yahoo RSS if yfinance returned nothing
        if not items_parsed:
            for item in _fetch_news_rss(yf_sym, contract):
                if item["headline"] not in seen:
                    seen.add(item["headline"])
                    items_parsed.append(item)

        news.extend(items_parsed)

    return news[:12]


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

def get_yfinance_data() -> dict:
    errors = []
    contracts = {}

    for yf_sym, disp_sym, disp_name in [
        ("CL=F", "MCL", "Micro Crude Oil"),
        ("ES=F", "MES", "Micro E-mini S&P 500"),
    ]:
        try:
            contracts[disp_sym] = _fetch_contract(yf_sym, disp_sym, disp_name)
        except Exception as e:
            errors.append(f"{disp_sym}: {e}")

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

    try:
        news = _fetch_news()
    except Exception as e:
        errors.append(f"news: {e}")
        news = []

    mkt = _market_status()
    result = {
        "timestamp":    datetime.now().strftime("%Y-%m-%d %H:%M:%S ET") + " (~15min delay)",
        "session_date": datetime.now().strftime("%A, %B %d, %Y"),
        "market_status": mkt,
        "macro":        macro,
        "news":         news,
        "contracts":    contracts,
    }
    if errors:
        result["live_warning"] = "Some data failed to load: " + " | ".join(errors)
    return result
