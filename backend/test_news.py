import json
from app.services.news_intelligence_service import fetch_news_for_country

articles = fetch_news_for_country("US", limit=2)
for article in articles:
    print(json.dumps(article, indent=2))
