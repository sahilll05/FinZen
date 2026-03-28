"""
AI Financial Assistant Service.
Uses Groq API (free tier: 14,400 requests/day).
"""

from app.config import settings

try:
    from groq import Groq
    GROQ_AVAILABLE = True
except ImportError:
    GROQ_AVAILABLE = False


def chat(message: str, portfolio_context: str = "", country: str = "US") -> dict:
    """
    Chat with the AI Financial Assistant.
    Uses Groq free API for fast LLM inference.
    """
    if not GROQ_AVAILABLE or not settings.GROQ_API_KEY:
        return _fallback_response(message)

    try:
        client = Groq(api_key=settings.GROQ_API_KEY)

        system_prompt = f"""You are FinSight AI, an expert financial assistant.
You are portfolio-aware and geopolitically conscious.

User's country: {country}
Portfolio context: {portfolio_context if portfolio_context else 'No portfolio loaded'}

Guidelines:
- Provide specific, actionable financial insights
- Always mention relevant geopolitical risks
- Cite your reasoning clearly
- Mention trust scores and confidence levels when relevant
- Give specific sector and stock-level recommendations when asked
- Always add a disclaimer that this is not financial advice

Be concise but thorough. Use data-driven reasoning."""

        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",  # Free model on Groq
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": message},
            ],
            temperature=0.7,
            max_tokens=1024,
        )

        answer = response.choices[0].message.content

        return {
            "response": answer,
            "sources": ["FinSight AI Analysis", "Groq/Llama-3.1"],
            "confidence": 0.8,
        }

    except Exception as e:
        print(f"Groq API error: {e}")
        return _fallback_response(message)


def _fallback_response(message: str) -> dict:
    """Fallback when Groq API is unavailable."""
    message_lower = message.lower()

    if "risk" in message_lower:
        response = (
            "Based on current geopolitical conditions, I recommend reviewing your portfolio's "
            "exposure to high-risk regions. Key risks include: sanctions impact, currency volatility, "
            "and regional conflicts. Consider diversifying into defensive sectors like healthcare "
            "and consumer staples. Note: Set up your GROQ_API_KEY in .env for full AI assistance."
        )
    elif "portfolio" in message_lower or "stock" in message_lower:
        response = (
            "To analyze your portfolio, please upload it first using the /api/v1/portfolio/upload endpoint. "
            "I can then provide personalized analysis including geo risk exposure, hidden risks, "
            "and optimization recommendations. Note: Set up your GROQ_API_KEY for full AI assistance."
        )
    else:
        response = (
            f"I received your question: '{message}'. For full AI-powered analysis, "
            "please set up your GROQ_API_KEY in the .env file. You can get a free API key at "
            "https://console.groq.com — it provides 14,400 free requests per day."
        )

    return {
        "response": response,
        "sources": ["FinSight AI Fallback"],
        "confidence": 0.5,
    }