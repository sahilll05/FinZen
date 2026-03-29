# FinZen Intelligence Platform - Project Overview

## 1. Project Summary
FinZen is an advanced, AI-powered geopolitical risk and financial portfolio management platform. It combines real-time financial tracking, macroeconomic risk analysis, and state-of-the-art machine learning models to provide "DNA-level" intelligent insights for global investors.

## 2. Core Technologies
### Frontend
- **React / Next.js 14**: Used Server-Side Rendering and fast reactive dynamic routing UIs.
- **Tailwind CSS & Framer Motion**: Deeply customized, responsive styling with smooth state transitions, glassmorphism, and premium banking UI themes.
- **Three.js & Globe.gl**: Renders high-performance 3D geopolitical visualizations, plotting conflict arcs and world market health.
- **Recharts**: For dynamic, real-time data visualization (portfolio growth, asset allocations).
- **Zustand**: Lightweight global state management across dashboard screens.
- **Server-Sent Events (SSE)**: Socket event streams to instantly update UI on geopolitical shifts or unauthorized login attempts.

### Backend
- **Python / FastAPI**: High-performance, asynchronous REST backend orchestrating all data endpoints and LLM pipelines.
- **Appwrite**: Handles User Authentication, Database Operations (Portfolios, Holdings), and Realtime push streams.
- **Scikit-learn / XGBoost**: ML models used for computing behavioral financial DNA (Risk Profiler) and evaluating news trustworthiness (News Intel).
- **CVXPY**: Used for advanced convex mathematical optimization in running optimal portfolio weights (Conservative, Moderate, Aggressive strategies).
- **NetworkX**: For mapping structural relationships and network paths in the Knowledge Graph engine.
- **Pandas / Numpy**: Heavy-lifting data analysis, statistical operations, and time-series DataFrame manipulation.

### External APIs & Data Engines
- **Groq API**: Blazing fast language model integration (Llama/Mixtral) powering the AI Assistant and generating dynamic "story-driven" scenarios for the simulator.
- **Yahoo Finance (`yfinance`)**: Powers real-time and historical stock index fetching, pulling 5-day and 1-day intraday aggregations to evaluate live market impact across countries.
- **GDELT API (Global Database of Events, Language, and Tone)**: Real-time global event and sentiment scraping to populate active conflict arcs and generate the baselines for geopolitical risk scores.

---

## 3. Features & Pages Architecture

### Overview (Dashboard Home) -> `/dashboard`
The central command center pulling a high-level summary of the user's connected Appwrite portfolio. It features active connection tracking, live geographic login maps (IP tracking), and overall account health summaries.

### Portfolio Management -> `/dashboard/portfolio/[id]`
- **How it works:** Pulls user-specific assets (stocks, bonds, cash) and visualizes their historical performance. Integrates interactive Recharts elements to show growth history over various periods (1W, 1M, 1Y).
- **Tech used:** Next.js dynamic routing, `yfinance`, and Appwrite database calls.

### Geopolitical Risk -> `/dashboard/geopolitical`
- **How it works:** Features a dual-engine view. A **3D Globe** (rendered via `globe.gl`) visually plots the world, marking conflict arcs and live market health tools with dynamic risk-tooltip popovers. A separate **2D Heatmap** organizes continents into responsive auto-CSS grids based on their active GDELT-derived threat severity (Low, Moderate, High risk scoring).
- **Tech used:** `Three.js`, `ResizeObserver`, GDELT API polling, `yfinance` history endpoints for real-time indexing.

### News Intel Engine -> `/dashboard/news`
- **How it works:** An interactive intelligence feed that scrapes real-time financial news and parses feeds into a proprietary **Trust Scoring Classifier**. It evaluates semantic data to predict if a news source is trustworthy or unverified.
- **Tech used:** `Feedparser`, `BeautifulSoup4`, `XGBoost/scikit` classifiers, and `Groq` LLM summarization on top of news content.

### AI Financial Assistant -> `/dashboard/ai-assistant`
- **How it works:** A smart chat interface where users query their portfolios, macro conditions, or ask for targeted recommendations. The backend handles Retrieval-Augmented Generation (RAG) by passing JSON states of the user's Appwrite-stored portfolio to the LLM to give hyper-relevant analysis.
- **Tech used:** Groq API instruction models.

### Risk Profiler (DNA Engine) -> `/dashboard/risk-profile`
- **How it works:** Establishes the psychological risk tolerance constraints of the investor. Under the hood, a backend behavioral ML service scores their risk threshold, emitting a mapped "DNA" score that directly affects how algorithms auto-balance the user's assets.
- **Tech used:** `scikit-learn` classification pipelines via FastAPI routes.

### Scenario Simulator -> `/dashboard/scenario`
- **How it works:** A predictive storytelling interface. Users select macroeconomic shocks (e.g., Oil Crisis, War, High Inflation). The backend simulates the blast radius of those shocks on precisely *their* portfolio by combining historical backtesting and LLM predictive reasoning (Worst/Expected/Best Case outputs).
- **Tech used:** Python `cvxpy` matrix operations, Groq API constraints.

### Knowledge Graph -> `/dashboard/knowledge-graph`
- **How it works:** An unconstrained interactive 2D/3D force-directed node graph mapping complex relationships in the finance world. Tracks how different assets, regions, and political entities (e.g. SEC, Bitcoin, Elon Musk) interconnect and influence each other.
- **Tech used:** `react-force-graph`, Python `NetworkX`.

### Portfolio X-Ray -> `/dashboard/xray`
- **How it works:** A deep-dive analytical tear-down of the user's holdings. Breaks down investments surgically by sector, geography, overlapping assets, and calculates ESG/Green scores and dividend yields.
- **Tech used:** Recharts radar components, recursive algorithm sweeps over user holdings.
