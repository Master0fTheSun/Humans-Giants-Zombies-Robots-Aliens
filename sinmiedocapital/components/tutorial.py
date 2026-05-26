"""
Beginner-friendly tutorial page.
Explains what the dashboard does, futures basics, and how to use each feature.
No prior trading knowledge assumed.
"""

import streamlit as st


def render_tutorial():
    # ── Welcome ───────────────────────────────────────────────────────────────
    st.markdown(
        '<div style="background:#eef3ff;border-radius:10px;padding:20px 24px;margin-bottom:20px;">'
        '<div style="font-size:1.5em;font-weight:700;color:#1a3060;margin-bottom:6px;">'
        '📚 New to trading? Start here.</div>'
        '<div style="color:#5577aa;font-size:0.95em;line-height:1.6;">'
        'This dashboard helps you monitor two micro futures contracts — '
        '<strong>MCL (Micro Crude Oil)</strong> and <strong>MES (Micro E-mini S&P 500)</strong> — '
        'in real time. It shows live prices, key price levels, trade ideas, risk tools, '
        'and market news all in one place. This tutorial will walk you through everything.'
        '</div>'
        '</div>',
        unsafe_allow_html=True,
    )

    # ── What are futures? ─────────────────────────────────────────────────────
    st.markdown("## What are futures?")
    st.markdown(
        '<div style="background:#f0f5ff;border-left:4px solid #1a3060;'
        'padding:14px 18px;border-radius:0 6px 6px 0;line-height:1.7;">'
        'A <strong>futures contract</strong> is an agreement to buy or sell something '
        '(like oil or a stock index) at a specific price on a future date. '
        'You don\'t actually own barrels of oil or shares — you\'re trading the <em>price movement</em>.<br><br>'
        '"<strong>Micro</strong>" contracts are the smallest available size, '
        'designed for individual traders. They let you participate in the same markets '
        'as large institutions but with a fraction of the cost and risk.<br><br>'
        'Price data on this dashboard is <strong>~15 minutes delayed</strong> '
        '(standard for free data sources). For live execution you\'d use a broker.'
        '</div>',
        unsafe_allow_html=True,
    )

    # ── MCL vs MES ────────────────────────────────────────────────────────────
    st.markdown("## The two contracts")
    c1, c2 = st.columns(2)

    with c1:
        st.markdown(
            '<div style="background:#fff9ed;border:1px solid #f39c12;'
            'border-radius:8px;padding:16px 18px;height:100%;">'
            '<div style="font-size:1.2em;font-weight:700;color:#b7700a;">🛢 MCL — Micro Crude Oil</div>'
            '<div style="color:#636e72;font-size:0.82em;margin-bottom:10px;">NYMEX WTI Light Sweet Crude Oil</div>'
            '<table style="width:100%;font-size:0.88em;border-collapse:collapse;">'
            '<tr><td style="color:#5577aa;padding:3px 0;">Tick size</td>'
            '<td style="font-weight:600;">$0.01 per barrel</td></tr>'
            '<tr><td style="color:#5577aa;padding:3px 0;">Tick value</td>'
            '<td style="font-weight:600;">$1.00 per tick</td></tr>'
            '<tr><td style="color:#5577aa;padding:3px 0;">1 point move</td>'
            '<td style="font-weight:600;">$100 profit or loss</td></tr>'
            '</table>'
            '<div style="margin-top:12px;font-size:0.85em;color:#5577aa;line-height:1.6;">'
            '<strong>What moves MCL:</strong> OPEC production decisions, '
            'EIA weekly oil inventory reports (Wednesdays), '
            'geopolitical events in oil-producing regions, '
            'U.S. dollar strength, and global demand outlook.'
            '</div>'
            '</div>',
            unsafe_allow_html=True,
        )

    with c2:
        st.markdown(
            '<div style="background:#eef6ff;border:1px solid #3498db;'
            'border-radius:8px;padding:16px 18px;height:100%;">'
            '<div style="font-size:1.2em;font-weight:700;color:#1a3060;">📈 MES — Micro E-mini S&P 500</div>'
            '<div style="color:#636e72;font-size:0.82em;margin-bottom:10px;">CME Micro E-mini S&P 500 Index</div>'
            '<table style="width:100%;font-size:0.88em;border-collapse:collapse;">'
            '<tr><td style="color:#5577aa;padding:3px 0;">Tick size</td>'
            '<td style="font-weight:600;">0.25 index points</td></tr>'
            '<tr><td style="color:#5577aa;padding:3px 0;">Tick value</td>'
            '<td style="font-weight:600;">$1.25 per tick</td></tr>'
            '<tr><td style="color:#5577aa;padding:3px 0;">1 point move</td>'
            '<td style="font-weight:600;">$5 profit or loss</td></tr>'
            '</table>'
            '<div style="margin-top:12px;font-size:0.85em;color:#5577aa;line-height:1.6;">'
            '<strong>What moves MES:</strong> Federal Reserve interest rate decisions, '
            'major earnings reports (Apple, Microsoft, etc.), '
            'inflation data (CPI, PCE), jobs reports (NFP), '
            'and overall investor risk sentiment.'
            '</div>'
            '</div>',
            unsafe_allow_html=True,
        )

    # ── Reading each tab ──────────────────────────────────────────────────────
    st.markdown("## Reading the dashboard")
    st.caption("Click any tab below to learn what each section shows.")

    with st.expander("📊 Overview tab — live price snapshot", expanded=True):
        st.markdown(
            "The Overview tab is your **at-a-glance summary** for both contracts. Here's what each item means:\n\n"
            "| Term | What it means |\n"
            "|------|---------------|\n"
            "| **Price** | The current market price (delayed ~15 min) |\n"
            "| **Change / %** | How much the price moved since yesterday's close |\n"
            "| **Gap Up / Gap Down** | When the market opens significantly higher or lower than where it closed |\n"
            "| **ATR (14)** | Average True Range — the average daily price swing over the last 14 days. Bigger ATR = more volatile. |\n"
            "| **VWAP** | Volume Weighted Average Price — the average price weighted by trading volume. Traders watch whether price is above or below VWAP as a trend signal. VWAP resets at the start of every session. |\n"
            "| **Trend** | Whether price action is Bullish (rising), Bearish (falling), or Neutral |\n"
            "| **Volatility** | Low / Medium / High — how much the price is swinging relative to its ATR |\n"
            "| **Key Levels** | R = Resistance (price levels where selling tends to occur) and S = Support (levels where buying tends to occur) |\n"
            "| **Bias** | The dashboard's read on direction — Long (expecting higher prices), Short (expecting lower), or Neutral |\n"
            "| **Risk** | A summary risk rating based on current volatility and gap conditions |"
        )

    with st.expander("📈 Charts tab — candlestick charts with drawing tools"):
        st.markdown(
            "The Charts tab shows interactive price charts for both MCL and MES.\n\n"
            "**Reading a candlestick:**\n"
            "- 🟢 **Green candle** — price closed *higher* than it opened (buyers won that period)\n"
            "- 🔴 **Red candle** — price closed *lower* than it opened (sellers won that period)\n"
            "- The thin lines (wicks) show the high and low reached during that period\n\n"
            "**Indicators on the chart:**\n\n"
            "| Indicator | Color | What it shows |\n"
            "|-----------|-------|---------------|\n"
            "| **EMA 20** | Blue line | 20-period exponential moving average — a smoothed trend line |\n"
            "| **VWAP** | Orange dotted | Volume-weighted average price for the current session (intraday only) |\n\n"
            "**Timeframes** — buttons above the chart (5m, 15m, 30m, 1h, 1d). "
            "Start with 15m or 1h for a broader view, then zoom into 5m when planning an entry.\n\n"
            "> **Quick mental model:** Use **1d** to see the bigger picture → **1h or 30m** to spot the trend "
            "→ **5m** to pick your exact entry. Most beginners only use 5m and miss the context.\n\n"
            "**Drawing tools** (toolbar above the chart):\n"
            "> **Skill order:** Start with **📏 Trend Line** (mark support/resistance). "
            "Then **📊 Position** (visualize the trade before taking it). "
            "Use **📐 Fibonacci** last — it's powerful but takes practice to read.\n\n"
            "- **📏 Trend Line** — draws a straight line between two price points to show a trend or level.\n"
            "- **📊 Position** — marks a planned trade with entry, stop loss, and take profit levels on the chart.\n"
            "- **📐 Fibonacci** — draws retracement levels between a swing high and swing low. "
            "Key levels (38.2%, 50%, 61.8%) often act as support/resistance.\n"
            "- **🗑 Clear All** — removes all drawings.\n\n"
            "**How to use click-to-draw** (when available):\n"
            "1. Click a drawing tool button\n"
            "2. Follow the hint that appears (e.g., \"click swing HIGH\")\n"
            "3. Click directly on the chart at the price you want\n"
            "4. For Fibonacci and Trend Line, click a second point to complete the drawing"
        )

    with st.expander("📋 Thesis & Plan tab — daily trade ideas"):
        st.markdown(
            "The Thesis & Plan tab shows the dashboard's automatically generated **daily trade idea** for each contract.\n\n"
            "**Daily Thesis** — A plain-language summary of where price is relative to key levels "
            "and what the bias is going into the session.\n\n"
            "**Bullish Scenario** — What would need to happen for price to move higher. "
            "Example: 'Hold above VWAP and break above the session high.'\n\n"
            "**Bearish Scenario** — What would cause price to move lower. "
            "Example: 'Fail to hold VWAP and break below the session low.'\n\n"
            "**Trade Plan** — A specific action based on the bias: entry trigger, stop level.\n\n"
            "**Invalidation Level** — The price at which the thesis is wrong. "
            "When price crosses this level, **exit immediately** — your thesis is wrong. "
            "This is not a failure, it's risk management. "
            "The capital you save becomes your next trade.\n\n"
            "**Thesis Consistency Check** — Compare the dashboard's read to your own. "
            "If they conflict, consider reducing position size or waiting for confirmation."
        )

    with st.expander("🧮 Risk Tools tab — position sizing & readiness"):
        st.markdown(
            "The Risk Tools tab has two key tools every trader should use before placing a trade.\n\n"
            "**R:R Calculator (Risk:Reward)**\n\n"
            "This calculates whether a trade is worth taking before you enter.\n\n"
            "**MCL example:**\n"
            "- Entry: 80.00 · Stop: 79.50 · Target: 81.00\n"
            "- Risk = 0.50 pts × $100/pt = **$50** at risk\n"
            "- Reward = 1.00 pt × $100/pt = **$100** potential profit\n"
            "- R:R = **1 : 2.0** ✓\n\n"
            "**MES example:**\n"
            "- Entry: 5320 · Stop: 5315 · Target: 5335\n"
            "- Risk = 5 pts × $5/pt = **$25** at risk\n"
            "- Reward = 15 pts × $5/pt = **$75** potential profit\n"
            "- R:R = **1 : 3.0** ✓✓ (excellent)\n\n"
            "A ratio below 1.5 means the potential reward doesn't justify the risk — "
            "skip the trade and wait for a better setup.\n\n"
            "**Pre-Session Checklist**\n\n"
            "A readiness checklist to complete before trading each session. "
            "Categories: Market Context, Macro & News, Thesis & Plan, Risk Management, Mindset. "
            "The progress bar at the top shows how prepared you are. "
            "Aim for 90%+ before placing any trade — "
            "most trading mistakes happen when traders skip preparation."
        )

    with st.expander("🗒️ Pre-Session Checklist — why each category matters"):
        st.markdown(
            "The Pre-Session Checklist (in the Risk Tools tab) is the single most important habit "
            "you can build as a trader. Here's why each category exists:\n\n"
            "**Market Context** — Know where price was overnight before you trade. "
            "If you don't know the overnight high and low, you're trading blind.\n\n"
            "**Macro & News** — A surprise economic report can move MCL or MES 10× faster than normal. "
            "Always check the calendar before the session opens — know what's coming.\n\n"
            "**Thesis & Plan** — If you don't have a written plan, you'll make it up in the moment "
            "when your emotions are highest. Undisciplined entries are the #1 cause of avoidable losses.\n\n"
            "**Risk Management** — Decide your maximum loss for the day *before* the market opens. "
            "Once you're in a losing trade, the number will feel different and you'll be tempted to move your stop.\n\n"
            "**Mindset** — Tired, angry, or distracted traders lose money faster than a bad setup does. "
            "If you're not in the right headspace, the best trade is no trade.\n\n"
            "> **Aim for 90%+ before placing any trade.** The progress bar in the Risk Tools tab "
            "turns green when you're ready. Most mistakes happen when traders skip this step."
        )

    with st.expander("📰 News & Macro tab — market environment"):
        st.markdown(
            "The News & Macro tab shows the broader forces driving both contracts.\n\n"
            "**Macro Metrics:**\n\n"
            "| Metric | What it is | Why it matters |\n"
            "|--------|-----------|----------------|\n"
            "| **VIX** | The 'fear gauge' — measures expected volatility in the S&P 500 | Above 20 = elevated fear, choppy markets. Below 15 = calm, trending conditions. |\n"
            "| **10Y Yield** | Interest rate on 10-year U.S. Treasury bonds (%) | Rising yields often pressure stocks (MES). Can support the dollar. |\n"
            "| **DXY** | U.S. Dollar Index — strength of USD vs a basket of currencies | Strong dollar often pressures crude oil (MCL) since oil is priced in USD. |\n"
            "| **Fed Stance** | Whether the Federal Reserve is Hawkish (raising rates) or Dovish (cutting) | Hawkish = higher rates = pressure on stocks. Dovish = lower rates = supports stocks. |\n\n"
            "**Economic Calendar** — lists scheduled data releases for the day. "
            "High-importance events (red) can cause sharp price moves — "
            "be cautious holding positions into them unless you have a clear plan."
        )

    # ── Drawing tools quick-reference ─────────────────────────────────────────
    st.markdown("## Drawing tools quick reference")
    st.markdown(
        '<table style="width:100%;border-collapse:collapse;font-size:0.9em;">'
        '<thead><tr style="background:#1a3060;color:#fff;">'
        '<th style="padding:8px 12px;text-align:left;">Tool</th>'
        '<th style="padding:8px 12px;text-align:left;">What it draws</th>'
        '<th style="padding:8px 12px;text-align:left;">When to use it</th>'
        '</tr></thead>'
        '<tbody>'
        '<tr style="background:#f5f8ff;">'
        '<td style="padding:8px 12px;"><strong>📐 Fibonacci</strong></td>'
        '<td style="padding:8px 12px;">7 horizontal retracement levels between a high and low</td>'
        '<td style="padding:8px 12px;">After a strong move — find where price might pull back to before continuing</td>'
        '</tr>'
        '<tr style="background:#eef3ff;">'
        '<td style="padding:8px 12px;"><strong>📊 Position</strong></td>'
        '<td style="padding:8px 12px;">Entry, stop loss, and take profit lines with colored zones</td>'
        '<td style="padding:8px 12px;">Before entering a trade — visualize your risk/reward on the chart</td>'
        '</tr>'
        '<tr style="background:#f5f8ff;">'
        '<td style="padding:8px 12px;"><strong>📏 Trend Line</strong></td>'
        '<td style="padding:8px 12px;">A straight line between two price points</td>'
        '<td style="padding:8px 12px;">Mark a trend, a horizontal support/resistance level, or a diagonal channel</td>'
        '</tr>'
        '<tr style="background:#eef3ff;">'
        '<td style="padding:8px 12px;"><strong>🗑 Clear All</strong></td>'
        '<td style="padding:8px 12px;">Removes all drawings</td>'
        '<td style="padding:8px 12px;">Start fresh for a new session or after your analysis is complete</td>'
        '</tr>'
        '</tbody>'
        '</table>',
        unsafe_allow_html=True,
    )

    # ── Glossary ──────────────────────────────────────────────────────────────
    st.markdown("")
    with st.expander("📖 Glossary — trading terms explained"):
        glossary = [
            ("ATR (Average True Range)", "A measure of how much a price typically moves in a given period. Higher ATR = more volatile market."),
            ("Bias", "A trader's directional opinion — Long (expecting price to rise), Short (expecting price to fall), or Neutral (no clear edge)."),
            ("Candlestick", "A bar on a price chart showing the open, high, low, and close for a time period. Green = price went up, Red = price went down."),
            ("DXY", "The U.S. Dollar Index — how strong the dollar is compared to major world currencies."),
            ("EMA (Exponential Moving Average)", "A smoothed average of past prices that weights recent prices more heavily. Used to identify trend direction."),
            ("Gap Up / Gap Down", "When a market opens significantly higher or lower than the previous close, leaving a 'gap' on the chart."),
            ("Globex", "The overnight electronic trading session for CME futures contracts (runs from Sunday evening to Friday afternoon ET)."),
            ("Invalidation Level", "The price at which your trade idea is proven wrong. Always set this before entering — it tells you when to exit a losing trade."),
            ("R:R (Risk:Reward Ratio)", "How much you could lose vs. how much you could gain. A 1:2 ratio means risking $50 to potentially make $100. Aim for 1:2 or better."),
            ("Resistance", "A price level where sellers tend to step in and push prices lower. Often a previous high or a round number."),
            ("RTH (Regular Trading Hours)", "The standard trading session: 9:30 AM – 4:00 PM Eastern Time for equity-linked futures."),
            ("Support", "A price level where buyers tend to step in and push prices higher. Often a previous low or a round number."),
            ("Thesis", "Your written reason for wanting to make a trade. Forces you to think through the idea before risking money."),
            ("Tick", "The smallest price increment a futures contract can move. MCL tick = $0.01 = $1.00 profit/loss. MES tick = 0.25 points = $1.25 profit/loss."),
            ("VIX", "The CBOE Volatility Index — measures expected market volatility over the next 30 days. Often called the 'fear gauge.' High VIX = fearful markets."),
            ("VWAP (Volume-Weighted Average Price)", "The average price paid for the day, weighted by how much volume traded at each price. Resets to zero at the start of each session. Price above VWAP = generally bullish; below = bearish. Only shown on intraday charts (5m, 15m, 30m, 1h)."),
        ]

        rows_html = ""
        for i, (term, definition) in enumerate(glossary):
            bg = "#f5f8ff" if i % 2 == 0 else "#eef3ff"
            rows_html += (
                f'<tr style="background:{bg};">'
                f'<td style="padding:7px 12px;font-weight:600;color:#1a3060;'
                f'white-space:nowrap;vertical-align:top;">{term}</td>'
                f'<td style="padding:7px 12px;color:#0a1428;line-height:1.5;">{definition}</td>'
                f'</tr>'
            )

        st.markdown(
            '<table style="width:100%;border-collapse:collapse;font-size:0.87em;">'
            '<thead><tr style="background:#1a3060;color:#fff;">'
            '<th style="padding:8px 12px;text-align:left;width:30%;">Term</th>'
            '<th style="padding:8px 12px;text-align:left;">Definition</th>'
            '</tr></thead>'
            f'<tbody>{rows_html}</tbody>'
            '</table>',
            unsafe_allow_html=True,
        )

    # ── Disclaimer ────────────────────────────────────────────────────────────
    st.markdown("")
    st.markdown(
        '<div style="background:#f0f0f0;border-radius:6px;padding:12px 16px;'
        'color:#7f8c8d;font-size:0.78em;line-height:1.6;">'
        '⚠️ <strong>Disclaimer:</strong> This dashboard is for informational and educational purposes only. '
        'It is not financial advice and does not constitute a recommendation to buy or sell any security or futures contract. '
        'Price data is delayed approximately 15 minutes and may not reflect current market conditions. '
        'Futures trading involves substantial risk of loss and is not appropriate for all investors. '
        'Past performance is not indicative of future results. '
        'Always consult a licensed financial advisor before making any trading decisions.'
        '</div>',
        unsafe_allow_html=True,
    )
