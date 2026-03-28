"""
SQLAlchemy ORM models — all database tables.
"""

from sqlalchemy import Column, Integer, String, Float, DateTime, Text, JSON, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    country_code = Column(String(3), default="US")
    created_at = Column(DateTime, default=datetime.utcnow)

    portfolios = relationship("Portfolio", back_populates="user")


class Portfolio(Base):
    __tablename__ = "portfolios"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String, default="My Portfolio")
    currency = Column(String(3), default="USD")
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="portfolios")
    holdings = relationship("Holding", back_populates="portfolio")


class Holding(Base):
    __tablename__ = "holdings"

    id = Column(Integer, primary_key=True, index=True)
    portfolio_id = Column(Integer, ForeignKey("portfolios.id"))
    ticker = Column(String, index=True)
    company_name = Column(String, default="")
    exchange = Column(String, default="")
    country = Column(String(3), default="US")
    sector = Column(String, default="")
    quantity = Column(Float, default=0)
    avg_cost = Column(Float, default=0)

    portfolio = relationship("Portfolio", back_populates="holdings")


class NewsArticle(Base):
    __tablename__ = "news_articles"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    source = Column(String)
    url = Column(String)
    content = Column(Text, default="")
    country = Column(String(3), default="")
    sentiment = Column(String, default="neutral")       # positive / negative / neutral
    sentiment_score = Column(Float, default=0.0)
    trust_score = Column(Float, default=50.0)
    entities = Column(JSON, default=list)                # extracted entities
    published_at = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)


class CountryRiskScore(Base):
    __tablename__ = "country_risk_scores"

    id = Column(Integer, primary_key=True, index=True)
    country_code = Column(String(3), index=True)
    war_risk = Column(Float, default=0.0)
    sanctions_risk = Column(Float, default=0.0)
    regulatory_risk = Column(Float, default=0.0)
    economic_risk = Column(Float, default=0.0)
    political_risk = Column(Float, default=0.0)
    currency_risk = Column(Float, default=0.0)
    overall_score = Column(Float, default=0.0)
    updated_at = Column(DateTime, default=datetime.utcnow)


class SourceAccuracy(Base):
    __tablename__ = "source_accuracy"

    id = Column(Integer, primary_key=True, index=True)
    source_name = Column(String, index=True)
    sector = Column(String, default="general")
    accuracy_rate = Column(Float, default=0.5)
    total_predictions = Column(Integer, default=0)
    correct_predictions = Column(Integer, default=0)
    updated_at = Column(DateTime, default=datetime.utcnow)