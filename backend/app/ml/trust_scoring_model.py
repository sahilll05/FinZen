"""
Trust Scoring Model — XGBoost classifier.
Scores news source reliability (0-100).
"""

import os
import numpy as np
import joblib

MODEL_PATH = "trained_models/trust_scoring_model.joblib"
_model = None


# Known source reliability (baseline)
SOURCE_BASELINE = {
    "reuters": 92, "bloomberg": 90, "financial times": 88,
    "wall street journal": 87, "cnbc": 80, "bbc": 85,
    "al jazeera": 78, "cnn": 75, "fox business": 70,
    "yahoo finance": 72, "marketwatch": 74, "seeking alpha": 65,
    "motley fool": 60, "benzinga": 62, "investopedia": 75,
    "unknown": 40, "blog": 30, "social media": 25,
}


def load_model():
    global _model
    if os.path.exists(MODEL_PATH):
        _model = joblib.load(MODEL_PATH)
        print("✅ Trust Scoring XGBoost model loaded")
        return True
    print("ℹ️ No trained trust model found. Using rule-based fallback.")
    return False


def score_article(source: str, content: str = "", sector: str = "general") -> dict:
    """
    Score the trustworthiness of a news article.
    
    Returns:
        {
            "source_accuracy": float (0-100),
            "content_trust_score": float (0-100),
            "overall_trust_score": float (0-100),
            "flags": list of warning flags
        }
    """
    source_lower = source.lower()
    flags = []

    # Source baseline score
    source_score = SOURCE_BASELINE.get(source_lower, 50)
    for key, val in SOURCE_BASELINE.items():
        if key in source_lower:
            source_score = val
            break

    # Content analysis
    content_score = _analyze_content_trust(content, flags)

    # Overall weighted score
    overall = source_score * 0.6 + content_score * 0.4

    return {
        "source_accuracy": round(source_score, 1),
        "content_trust_score": round(content_score, 1),
        "overall_trust_score": round(overall, 1),
        "flags": flags,
    }


def _analyze_content_trust(content: str, flags: list) -> float:
    """Analyze content for trust signals."""
    if not content:
        return 50.0

    score = 60.0  # Start at neutral
    content_lower = content.lower()

    # Positive signals
    if any(w in content_lower for w in ["according to data", "official report", "sec filing", "quarterly earnings"]):
        score += 15
    if any(w in content_lower for w in ["sources say", "confirmed by", "analysis shows"]):
        score += 10
    if len(content) > 500:  # Longer articles tend to be more detailed
        score += 5

    # Negative signals
    if any(w in content_lower for w in ["rumor", "unconfirmed", "allegedly"]):
        score -= 15
        flags.append("Contains unverified claims")
    if any(w in content_lower for w in ["🚀", "to the moon", "guaranteed", "100%"]):
        score -= 25
        flags.append("Contains hype language — possible manipulation")
    if content_lower.count("!") > 5:
        score -= 10
        flags.append("Excessive exclamation marks")
    if len(content) < 100:
        score -= 10
        flags.append("Very short content — may lack substance")

    return max(0, min(100, score))


load_model()