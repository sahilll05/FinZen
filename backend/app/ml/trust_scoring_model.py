"""
Trust Scoring Model — XGBoost classifier.
Scores news source reliability (0-100).
"""

from pathlib import Path
import numpy as np
import joblib

MODEL_PATH = Path(__file__).resolve().parents[2] / "trained_models" / "trust_scoring_model.joblib"
_model = None


# Known source reliability (baseline)
SOURCE_BASELINE = {
    # Top Tier Financial & General News
    "reuters": 95, "bloomberg": 95, "financial times": 92, "economist": 90,
    "wall street journal": 90, "wsj": 90, "associated press": 88, "ap news": 88, "the associated press": 88,
    "bbc": 88, "npr": 86, "pbs": 86, "the guardian": 84, "new york times": 86,
    "nytimes": 86, "washington post": 85, "the washington post": 85, "the times info": 80,
    
    # Established News & Business
    "cnbc": 82, "fortune": 80, "forbes": 75, "business insider": 70, 
    "al jazeera": 78, "cnn": 76, "fox business": 72, "fox news": 68,
    "yahoo finance": 75, "marketwatch": 75, "seeking alpha": 65,
    "techcrunch": 80, "wired": 80, "the verge": 78, "politico": 80, "axios": 82,
    "the times of india": 75, "times of india": 75, "hindustan times": 72,
    "usa today": 75, "us news": 75, "nbc news": 80, "cbs news": 80, "abc news": 80,
    
    # Mixed / Retail Finance / Niche
    "motley fool": 60, "benzinga": 65, "investopedia": 78, "zacks": 65,
    "foreign policy": 80, "the atlantic": 80, "phoenix new times": 60,
    
    # Low Trust / Generic / Untrustworthy
    "activistpost": 30, "unknown": 40, "blog": 30, "social media": 25, 
    "zerohedge": 40, "zero hedge": 40, "infowars": 10, "breitbart": 30
}


def load_model():
    global _model
    if MODEL_PATH.exists():
        _model = joblib.load(MODEL_PATH)
        print("Success: Trust Scoring XGBoost model loaded")
        return True
    print("Info: No trained trust model found. Using rule-based fallback.")
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
    source_score = 50.0  # Default for unknown sources is unverified/untrusted
    is_known_source = False
    for key, val in SOURCE_BASELINE.items():
        if key in source_lower:
            source_score = val
            is_known_source = True
            break
            
    # If the source domain is completely generic but we got it from NewsAPI or GDELT, bump it slightly.
    if not is_known_source and len(source_lower) > 3 and "." in source_lower:
        source_score = 55.0

    # Content analysis
    content_score = _analyze_content_trust(content, flags)
    
    # Compute rule-based baseline
    rule_overall = source_score * 0.6 + content_score * 0.4

    # Overall weighted score
    if _model is not None:
        try:
            # Prepare feature vector for XGBoost 
            # Features: ["source_historical_accuracy", "article_length", "has_citations", "sentiment_extremity", "cross_source_agreement", "author_credibility", "recency_hours", "hype_word_count"]
            content_lower = content.lower() if content else ""
            article_length = len(content) if content else 0
            has_citations = 1 if any(w in content_lower for w in ["according to", "citing", "reported by", "research", "study", "official"]) else 0
            hype_word_count = sum(content_lower.count(w) for w in ["🚀", "guaranteed", "100%", "moon", "massive", "unbelievable"])
            
            features = np.array([[
                source_score,      # source_historical_accuracy
                article_length,    # article_length
                has_citations or 1, # has_citations (assume 1 for NewsAPI sources to bridge gap from short descriptions)
                0.3,               # sentiment_extremity (assume relatively objective)
                0.8,               # cross_source_agreement (assume widely reported)
                source_score,      # author_credibility (using source as proxy)
                2.0,               # recency_hours 
                hype_word_count,   # hype_word_count
            ]])
            
            xgb_overall = float(_model.predict(features)[0])
            
            # Blend the XGBoost prediction with our rule-based score
            # The original XGBoost model often undervalues trusted news
            if is_known_source:
                # If we know the source is strong, trust our baseline more
                overall = max(xgb_overall, rule_overall)
            else:
                overall = (xgb_overall + rule_overall) / 2
                
            overall = max(0.0, min(100.0, overall))
        except Exception as e:
            print(f"Model prediction failed: {e}")
            overall = rule_overall
    else:
        overall = rule_overall

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