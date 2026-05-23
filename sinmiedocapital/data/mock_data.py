from datetime import datetime, date


def get_mock_data():
    return {
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S ET"),
        "session_date": date.today().strftime("%A, %B %d, %Y"),
        "macro": {
            "headline_risk": "Medium",
            "fed_stance": "Hawkish",
            "equity_trend": "Mixed",
            "dollar_index": 104.30,
            "dollar_change": +0.15,
            "vix": 18.4,
            "vix_change": -0.6,
            "ten_year_yield": 4.42,
            "ten_year_change": +0.03,
            "economic_events": [
                {
                    "time": "8:30 AM ET",
                    "event": "Initial Jobless Claims",
                    "importance": "Medium",
                    "forecast": "215K",
                    "prior": "211K",
                },
                {
                    "time": "10:00 AM ET",
                    "event": "ISM Manufacturing PMI",
                    "importance": "High",
                    "forecast": "49.5",
                    "prior": "50.3",
                },
                {
                    "time": "2:30 PM ET",
                    "event": "Fed Speaker: Williams",
                    "importance": "High",
                    "forecast": "—",
                    "prior": "—",
                },
            ],
        },
        "news": [
            {
                "time": "6:14 AM",
                "headline": "OPEC+ holds output steady; Brent crude edges higher on supply discipline",
                "sentiment": "Bullish",
                "contract": "MCL",
            },
            {
                "time": "5:58 AM",
                "headline": "US equity futures flat ahead of ISM data; tech sector leads pre-market",
                "sentiment": "Neutral",
                "contract": "MES",
            },
            {
                "time": "5:30 AM",
                "headline": "API crude inventories -2.1M bbl (est. -1.0M); inventory draw supports oil",
                "sentiment": "Bullish",
                "contract": "MCL",
            },
            {
                "time": "4:45 AM",
                "headline": "China PMI misses estimates at 49.1; demand outlook for crude under scrutiny",
                "sentiment": "Bearish",
                "contract": "MCL",
            },
            {
                "time": "4:20 AM",
                "headline": "S&P 500 futures recover as bond yields stabilize overnight",
                "sentiment": "Bullish",
                "contract": "MES",
            },
            {
                "time": "3:55 AM",
                "headline": "Dollar index holds 104 ahead of payrolls; yields inch higher",
                "sentiment": "Bearish",
                "contract": "MES",
            },
        ],
        "contracts": {
            "MCL": {
                "symbol": "MCL",
                "name": "Micro Crude Oil",
                "current_price": 78.45,
                "prev_close": 77.90,
                "change": 0.55,
                "change_pct": 0.71,
                "overnight_high": 79.20,
                "overnight_low": 77.80,
                "prior_day_high": 78.90,
                "prior_day_low": 76.50,
                "prior_day_close": 77.90,
                "vwap": 78.10,
                "atr_14": 1.85,
                "volume": 15420,
                "trend": "Bullish",
                "volatility": "Medium",
                "bias": "Long",
                "gap": "Gap Up",
                "gap_size": 0.55,
                "setup_type": "Breakout",
                "key_resistance": [
                    {"level": 79.50, "note": "Prior swing high"},
                    {"level": 80.00, "note": "Round number / psychological"},
                    {"level": 81.20, "note": "200-day MA"},
                ],
                "key_support": [
                    {"level": 78.00, "note": "VWAP / overnight low zone"},
                    {"level": 77.00, "note": "Prior support / breakout retest"},
                    {"level": 76.50, "note": "Prior day low"},
                ],
                "thesis": (
                    "Crude gapping up on bullish API draw (-2.1M bbl). Price is above VWAP and the prior session midpoint. "
                    "Bias is long on pullbacks to 78.00–78.20. Watch ISM at 10 AM — a miss could stall momentum. "
                    "China demand headline is the key bear risk; manage size accordingly."
                ),
                "bullish_scenario": (
                    "Hold above 78.20 (VWAP / overnight low area). Target: test 79.50, then 80.00 psychological level. "
                    "Breakout above 79.20 overnight high is the momentum trigger."
                ),
                "bearish_scenario": (
                    "Failure to hold 78.00 opens a 77.00 re-test. ISM miss or risk-off tone could push price back to "
                    "prior day low at 76.50. China demand fears compound the downside."
                ),
                "trade_plan": (
                    "Long trigger: pullback to 78.00–78.20 with acceptance (2–3 min candle close). "
                    "Add on clean break above 79.20. Risk below 77.80 (overnight low = invalidation)."
                ),
                "invalidation": 77.80,
                "risk_level": "Medium",
                "risk_reasons": [
                    "Gap-up entry risk — fading gaps favors experienced traders",
                    "ISM data at 10 AM could reverse trend",
                    "China demand headline unresolved",
                ],
                "watch_next_open": (
                    "Watch how price reacts to the 79.20 overnight high at the open. "
                    "If it accepts above → momentum long. If it rejects hard → fade setup toward VWAP."
                ),
            },
            "MES": {
                "symbol": "MES",
                "name": "Micro E-mini S&P 500",
                "current_price": 5312.50,
                "prev_close": 5295.00,
                "change": 17.50,
                "change_pct": 0.33,
                "overnight_high": 5325.00,
                "overnight_low": 5285.00,
                "prior_day_high": 5330.00,
                "prior_day_low": 5262.50,
                "prior_day_close": 5295.00,
                "vwap": 5305.00,
                "atr_14": 52.0,
                "volume": 84200,
                "trend": "Neutral",
                "volatility": "Medium",
                "bias": "Neutral / Watch",
                "gap": "Gap Up",
                "gap_size": 17.50,
                "setup_type": "Fade / Range",
                "key_resistance": [
                    {"level": 5325.00, "note": "Overnight high"},
                    {"level": 5330.00, "note": "Prior day high"},
                    {"level": 5350.00, "note": "All-time high area"},
                ],
                "key_support": [
                    {"level": 5305.00, "note": "VWAP"},
                    {"level": 5285.00, "note": "Overnight low"},
                    {"level": 5262.50, "note": "Prior day low"},
                ],
                "thesis": (
                    "MES gapping slightly higher but remains inside the prior day range — lower-conviction move. "
                    "VIX declining to 18.4 signals reduced fear. Market in wait-and-see mode ahead of ISM and a Fed speaker. "
                    "Fading extension at the overnight high (5325) is the primary setup unless ISM beats strongly."
                ),
                "bullish_scenario": (
                    "Break and hold above 5330 (prior day high) on strong ISM data or positive macro surprise. "
                    "Target: 5350 ATH area. Momentum buyers step in if S&P reclaims ATH zone with volume."
                ),
                "bearish_scenario": (
                    "Rejection at 5325–5330 double resistance. Drop below 5305 VWAP puts 5285 overnight low in play. "
                    "Hawkish Fed speaker + weak ISM = breakdown risk toward 5262."
                ),
                "trade_plan": (
                    "Short bias at 5325–5330 with stop above 5340. Long only on confirmed break above 5335 "
                    "with strong ISM close. Size down ahead of dual catalysts."
                ),
                "invalidation": 5340.00,
                "risk_level": "Medium",
                "risk_reasons": [
                    "Dual catalysts: ISM + Fed speaker (binary outcomes)",
                    "Inside prior day range — lower breakout conviction",
                    "Overnight high aligns with prior day high — strong resistance cluster",
                ],
                "watch_next_open": (
                    "Watch the 5325–5330 resistance zone at the open. Gap fill toward 5295 is possible if macro turns. "
                    "ISM number at 10 AM is the session catalyst — wait for the print before adding size."
                ),
            },
        },
    }
