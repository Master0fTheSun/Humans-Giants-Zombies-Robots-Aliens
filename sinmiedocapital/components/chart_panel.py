"""TradingView chart embeds for MCL and MES — iframe URL approach (more reliable in Streamlit)."""

import streamlit.components.v1 as components

_TV_SYMBOLS = {
    "MCL": "MCL1!",
    "MES": "MES1!",
}


def render_chart_panel(symbol: str, height: int = 500):
    tv_symbol = _TV_SYMBOLS.get(symbol, symbol)

    iframe_src = (
        "https://s.tradingview.com/widgetembed/"
        f"?symbol={tv_symbol}"
        "&interval=5"
        "&timezone=America%2FNew_York"
        "&theme=light"
        "&style=1"
        "&locale=en"
        "&toolbar_bg=%23eef3ff"
        "&hide_side_toolbar=0"
        "&allow_symbol_change=1"
        "&enable_publishing=false"
        "&save_image=false"
    )

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{ background: #f5f8ff; overflow: hidden; }}
        iframe {{ display: block; width: 100%; height: {height}px; border: none; }}
      </style>
    </head>
    <body>
      <iframe
        src="{iframe_src}"
        width="100%"
        height="{height}"
        frameborder="0"
        allowfullscreen
      ></iframe>
    </body>
    </html>
    """
    components.html(html, height=height + 10, scrolling=False)
