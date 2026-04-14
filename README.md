# FinZen: Geopolitical Portfolio Intelligence

![FinZen Dashboard Preview](https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop)

**FinZen** is a highly advanced, next-generation financial portfolio intelligence platform. It moves beyond standard stock tracking to offer **Geopolitically-Aware Analysis**, actively scanning the globe for macro-economic risks, conflicts, and regulatory shifts, and mathematically mapping how those global events impact your specific stock portfolio.

## 🌟 Key Features

### 1. The Geopolitical Risk Engine
A 3D interactive globe and 2D regional heatmap powered by real-time open-source global event tracking (GDELT) and an **XGBoost Classifier**. It evaluates nations across 6 macro dimensions (War, Sanctions, Regulatory, Economic, Political, Currency) and maps these risks directly to exposed sectors.

### 2. Live News Intelligence & Trust Scoring
- **Real-Time Pipeline**: Pulls live global financial news via Google News RSS fallbacks.
- **FinBERT Sentiment Analysis**: Reads news article headlines and descriptions using an NLP model (ProsusAI/finbert) to categorize market impact as Positive, Negative, or Neutral.
- **AI Trust Scoring**: An XGBoost model evaluates the trustworthiness of articles, filtering out hype terminology, verifying source credibility, and cross-referencing consensus.

### 3. Causal Chain "Hidden Risk" Engine
Utilizes **Directed Knowledge Graphs** (via NetworkX) to model the global economy. By tracing causal chains (e.g., *US Sanctions → Oil Export Block → Currency Depreciation*), the platform can calculate the hidden exposure percentage of your specific holdings to seemingly unrelated macro events. 

### 4. FinSight AI Assistant
An integrated LLM assistant powered by **Llama-3.1-8b** (via the Groq API). It uses dynamic **Context-Injection**, pulling your live portfolio allocations and regional risk factors directly into the system prompt. It offers instantaneous, conversational, and highly personalized financial insights.

### 5. AI Risk Profiler
Uses a pre-trained **Random Forest classification model** (with heuristic fallbacks) to ingest user debt-to-income, experience, and goals, returning a recommended mathematical asset allocation (Conservative, Moderate, Aggressive).

---

## 🏗️ Architecture & Tech Stack

The project is architected for speed and cloud scalability, utilizing a Python/FastAPI backend for ML and an Appwrite Cloud backend for persistence.

### Persistence & Data Layer
- **Primary Database**: **Appwrite Cloud** (Unified storage for Portfolios, Holdings, and User Metadata).
- **Caching Engine**: High-performance **In-Memory Caching** (via `cachetools`) for sub-second geopolitical risk computations.

### Frontend
- **Framework**: Next.js (React)
- **Styling**: TailwindCSS, Framer Motion
- **Visualizations**: Globe.gl (Three.js), Recharts
- **State Management**: Zustand
- **Backend Communication**: Appwrite SDK (Direct) & FastAPI (ML Processing)

### Backend (`/backend`)
- **API Framework**: FastAPI
- **Machine Learning**: 
  - `transformers` & `torch` (FinBERT NLP)
  - `xgboost` & `scikit-learn` (Risk and Trust prediction)
- **Knowledge Graph**: `networkx`
- **Data Integrations**: `yfinance` (market data), `requests` (GDELT, News)

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- Python 3.10+
- An [Appwrite Cloud](https://appwrite.io/) account
- A [Groq](https://groq.com/) API Key for the AI Assistant

### 1. Appwrite Configuration
Create a database named `finzen` and the following collections:
- `portfolios`
- `holdings`
- `users`
- `news_articles`

Ensure the collection permissions are set to "Any" or "All users" for Read/Write during development.

### 2. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create a `.env` file in the `backend` folder:
```env
APPWRITE_ENDPOINT=https://sgp.cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=your_project_id
APPWRITE_DATABASE_ID=finzen
GROQ_API_KEY=your_groq_api_key
NEWS_API_KEY=your_news_api_key
```

**To run the backend server:**
```bash
cd backend
venv\Scripts\activate  # On Windows (or `source venv/bin/activate` on macOS/Linux)
uvicorn main:app --reload --port 8000
```

The backend will start at `http://localhost:8000`. Access the interactive API docs at `http://localhost:8000/docs`.

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:3000` to interact with the platform.

---

## 📄 License
© 2026 FinZen Intelligence. All rights reserved.
