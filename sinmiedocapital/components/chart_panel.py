"""TradingView chart embeds for MCL and MES."""

import streamlit.components.v1 as components


# TradingView symbol map
_TV_SYMBOLS = {
    "MCL": "NYMEX:MCL1!",
    "MES": "CME_MINI:MES1!",
}


def render_chart_panel(symbol: str, height: int = 480):
    tv_symbol = _TV_SYMBOLS.get(symbol, symbol)
    container_id = f"tv_chart_{symbol.lower()}"

    widget_html = f"""
    <!DOCTYPE html>
    <html>
    <head><style>
      body {{ margin: 0; padding: 0; background: #f5f8ff; }}
      #container {{ width: 100%; height: {height}px; }}
    </style></head>
    <body>
      <div id="{container_id}" style="width:100%;height:{height}px;"></div>
      <script type="text/javascript" src="https://s3.tradingview.com/tv.js"></script>
      <script type="text/javascript">
        new TradingView.widget({{
          "autosize": true,
          "symbol": "{tv_symbol}",
          "interval": "5",
          "timezone": "America/New_York",
          "theme": "light",
          "style": "1",
          "locale": "en",
          "toolbar_bg": "#eef3ff",
          "enable_publishing": false,
          "hide_side_toolbar": false,
          "allow_symbol_change": true,
          "studies": ["RSI@tv-basicstudies", "VWAP@tv-basicstudies"],
          "container_id": "{container_id}"
        }});
      </script>
    </body>
    </html>
    """
    components.html(widget_html, height=height + 20, scrolling=False)
