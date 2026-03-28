"""
FinSight AI — Smart Financial Intelligence Platform
Main entry point for the FastAPI application.

Run with: uvicorn main:app --reload --port 8000
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import engine, Base
from app.routers import (
    portfolio,
    geo_risk,
    trust_scoring,
    news_intelligence,
    causal_chain,
    ai_assistant,
    portfolio_xray,
    risk_profiling,
    knowledge_graph,
    scenario_simulator,
)

# Create database tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="FinSight AI",
    description="Smart Financial Intelligence Platform — Geopolitical-Aware, Trust-Scored, Causal Chain Reasoning",
    version="1.0.0",
    docs_url="/docs",       # Swagger UI at http://localhost:8000/docs
    redoc_url="/redoc",     # ReDoc at http://localhost:8000/redoc
)

# Allow frontend to connect (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # In production, restrict this to your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Register all 10 feature routers ──────────────────────────────
app.include_router(portfolio.router,          prefix="/api/v1/portfolio",    tags=["Portfolio"])
app.include_router(geo_risk.router,           prefix="/api/v1/geo",         tags=["Geopolitical Risk"])
app.include_router(trust_scoring.router,      prefix="/api/v1/trust",       tags=["Trust Scoring"])
app.include_router(news_intelligence.router,  prefix="/api/v1/news",        tags=["News Intelligence"])
app.include_router(causal_chain.router,       prefix="/api/v1/causal",      tags=["Causal Chain"])
app.include_router(ai_assistant.router,       prefix="/api/v1/ai",          tags=["AI Assistant"])
app.include_router(portfolio_xray.router,     prefix="/api/v1/xray",        tags=["Portfolio X-Ray"])
app.include_router(risk_profiling.router,     prefix="/api/v1/risk-profile", tags=["Risk Profiling"])
app.include_router(knowledge_graph.router,    prefix="/api/v1/graph",       tags=["Knowledge Graph"])
app.include_router(scenario_simulator.router, prefix="/api/v1/scenario",    tags=["Scenario Simulator"])


@app.get("/", tags=["Health"])
def root():
    return {
        "platform": "FinSight AI",
        "status": "running",
        "version": "1.0.0",
        "docs": "/docs",
        "features": [
            "Geopolitical Investment Engine",
            "Information Trust Scoring Engine",
            "Multi-Constraint Portfolio Optimizer",
            "Causal Chain Reasoning Engine",
            "Real-Time News Intelligence Pipeline",
            "AI Financial Assistant",
            "Portfolio X-Ray & Hidden Risk",
            "Dynamic Risk Profiling",
            "Financial Knowledge Graph",
            "Scenario Simulator",
        ],
    }


@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "healthy"}