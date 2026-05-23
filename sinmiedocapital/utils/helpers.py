"""Formatting helpers and traffic-light risk labels."""

# Traffic light colors mapped to risk level labels
RISK_COLORS = {
    "Low": "#2ecc71",     # green
    "Medium": "#f39c12",  # amber
    "High": "#e74c3c",    # red
}

SENTIMENT_COLORS = {
    "Bullish": "#2ecc71",
    "Neutral": "#95a5a6",
    "Bearish": "#e74c3c",
}

TREND_COLORS = {
    "Bullish": "#2ecc71",
    "Bearish": "#e74c3c",
    "Neutral": "#f39c12",
}

IMPORTANCE_COLORS = {
    "High": "#e74c3c",
    "Medium": "#f39c12",
    "Low": "#95a5a6",
}


def risk_badge(level: str) -> str:
    """Return an HTML badge for a risk level."""
    color = RISK_COLORS.get(level, "#95a5a6")
    return (
        f'<span style="background:{color};color:#111;padding:2px 10px;'
        f'border-radius:4px;font-weight:700;font-size:0.85em;">{level.upper()}</span>'
    )


def sentiment_badge(sentiment: str) -> str:
    color = SENTIMENT_COLORS.get(sentiment, "#95a5a6")
    return (
        f'<span style="background:{color};color:#111;padding:1px 8px;'
        f'border-radius:4px;font-weight:600;font-size:0.8em;">{sentiment}</span>'
    )


def trend_badge(trend: str) -> str:
    color = TREND_COLORS.get(trend, "#95a5a6")
    return (
        f'<span style="background:{color};color:#111;padding:1px 8px;'
        f'border-radius:4px;font-weight:600;font-size:0.8em;">{trend}</span>'
    )


def importance_dot(importance: str) -> str:
    color = IMPORTANCE_COLORS.get(importance, "#95a5a6")
    return f'<span style="color:{color};font-weight:700;">●</span>'


def delta_color(value: float) -> str:
    if value > 0:
        return "#2ecc71"
    if value < 0:
        return "#e74c3c"
    return "#95a5a6"


def fmt_price(value: float, decimals: int = 2) -> str:
    return f"{value:,.{decimals}f}"


def fmt_change(value: float, decimals: int = 2) -> str:
    sign = "+" if value >= 0 else ""
    return f"{sign}{value:.{decimals}f}"


def fmt_pct(value: float) -> str:
    sign = "+" if value >= 0 else ""
    return f"{sign}{value:.2f}%"
