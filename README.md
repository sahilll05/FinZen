# FinZen: Geopolitical Portfolio Intelligence

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

### 4. FinZen AI Assistant
An integrated LLM assistant powered by **Llama-3.1-8b** (via the Groq API). It uses dynamic **Context-Injection**, pulling your live portfolio allocations and regional risk factors directly into the system prompt. It offers instantaneous, conversational, and highly personalized financial insights.

### 5. AI Risk Profiler
Uses a pre-trained **Random Forest classification model** (with heuristic fallbacks) to ingest user debt-to-income, experience, and goals, returning a recommended mathematical asset allocation (Conservative, Moderate, Aggressive).

---

## 🏗️ Architecture & Tech Stack

The project is strictly separated into a modern React frontend and a Python/FastAPI backend designed for heavy ML workloads.

### Frontend
- **Framework**: Next.js, React
- **Styling**: TailwindCSS, Framer Motion
- **Visualizations**: Globe.gl (Three.js), Recharts
- **State Management**: Zustand
- **Authentication**: Appwrite (via custom `authStore`)

### Backend (`/backend`)
- **API Framework**: FastAPI
- **Machine Learning**: 
  - `transformers` & `torch` (for FinBERT NLP)
  - `xgboost` & `scikit-learn` (for Risk and Trust prediction)
- **Knowledge Graph**: `networkx`
- **Generative AI**: `groq` (Llama 3.1)
- **Data Integrations**: `yfinance` (market data), `requests` (GDELT, News)

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- Python 3.10+
- An [Appwrite](https://appwrite.io/) instance for database & auth
- A [Groq](https://groq.com/) API Key for the AI Assistant

### 1. Backend Setup
Navigate to the backend directory and install the dependencies.
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Run the backend server:
```bash
uvicorn main:app --reload --port 8000
```

### 2. Frontend Setup
Open a new terminal, navigate to the frontend directory, and install the UI dependencies.
```bash
cd frontend
npm install
```

Run the development server:
```bash
npm run dev
```

Visit `http://localhost:3000` to interact with the dashboards.

---

## 📄 License
© 2026 FinZen Intelligence. All rights reserved.
