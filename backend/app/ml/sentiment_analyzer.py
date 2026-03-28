"""
FinBERT Sentiment Analyzer — Pre-trained financial sentiment model.
No custom training needed — uses ProsusAI/finbert from HuggingFace.
"""

from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch
import numpy as np

_model = None
_tokenizer = None


def _load_model():
    """Lazy-load FinBERT model (downloads on first use ~500MB)."""
    global _model, _tokenizer
    if _model is None:
        print("⏳ Loading FinBERT model (first time will download ~500MB)...")
        _tokenizer = AutoTokenizer.from_pretrained("ProsusAI/finbert")
        _model = AutoModelForSequenceClassification.from_pretrained("ProsusAI/finbert")
        _model.eval()
        print("✅ FinBERT loaded successfully!")


def analyze_sentiment(text: str) -> dict:
    """
    Analyze financial sentiment of text using FinBERT.
    
    Returns:
        {
            "label": "positive" | "negative" | "neutral",
            "score": float (confidence 0-1),
            "scores": {"positive": 0.8, "negative": 0.1, "neutral": 0.1}
        }
    """
    try:
        _load_model()

        inputs = _tokenizer(text, return_tensors="pt", truncation=True, max_length=512, padding=True)

        with torch.no_grad():
            outputs = _model(**inputs)
            probabilities = torch.nn.functional.softmax(outputs.logits, dim=-1)

        labels = ["positive", "negative", "neutral"]
        scores = probabilities[0].numpy()

        max_idx = np.argmax(scores)

        return {
            "label": labels[max_idx],
            "score": float(scores[max_idx]),
            "scores": {
                "positive": float(scores[0]),
                "negative": float(scores[1]),
                "neutral": float(scores[2]),
            },
        }
    except Exception as e:
        # Fallback if model fails to load
        print(f"⚠️ FinBERT error: {e}. Using simple fallback.")
        return _simple_sentiment_fallback(text)


def _simple_sentiment_fallback(text: str) -> dict:
    """Simple keyword-based fallback when FinBERT unavailable."""
    text_lower = text.lower()

    positive_words = ["growth", "profit", "surge", "gain", "rally", "bull", "upgrade",
                      "beat", "strong", "record", "optimistic", "recovery"]
    negative_words = ["crash", "loss", "decline", "bear", "downgrade", "miss", "weak",
                      "recession", "crisis", "sanctions", "war", "inflation", "risk",
                      "drop", "fall", "concern", "fear"]

    pos_count = sum(1 for w in positive_words if w in text_lower)
    neg_count = sum(1 for w in negative_words if w in text_lower)

    if pos_count > neg_count:
        label = "positive"
        score = min(0.5 + pos_count * 0.1, 0.95)
    elif neg_count > pos_count:
        label = "negative"
        score = min(0.5 + neg_count * 0.1, 0.95)
    else:
        label = "neutral"
        score = 0.5

    return {
        "label": label,
        "score": score,
        "scores": {
            "positive": score if label == "positive" else (1 - score) / 2,
            "negative": score if label == "negative" else (1 - score) / 2,
            "neutral": score if label == "neutral" else (1 - score) / 2,
        },
    }


def batch_analyze(texts: list) -> list:
    """Analyze sentiment for multiple texts."""
    return [analyze_sentiment(text) for text in texts]