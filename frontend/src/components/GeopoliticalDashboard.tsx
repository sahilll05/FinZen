/**
 * Example Component: GeopoliticalDashboard
 * 
 * Demonstrates how to use the wired backend APIs in your FinZen frontend.
 * This component pulls country risk data and trust scores for news articles.
 */

'use client';

import { useState } from 'react';
import { useCountryRisk, useSectorImpact } from '@/hooks/useGeopolitical';
import { useScoreArticle, useCalculateConsensus } from '@/hooks/useTrust';

export function GeopoliticalDashboard() {
  const [selectedCountry, setSelectedCountry] = useState('US');
  const [articleContent, setArticleContent] = useState('');

  // Load country risk data
  const { data: riskData, isLoading: riskLoading } = useCountryRisk(selectedCountry);
  const { data: sectorData, isLoading: sectorLoading } = useSectorImpact(selectedCountry);

  // Trust scoring mutation
  const { mutate: scoreArticle, data: trustScore, isPending: scoringArticle } = useScoreArticle();

  // Consensus mutation
  const { mutate: calculateConsensus, data: consensusData, isPending: calculatingConsensus } = useCalculateConsensus();

  // Example: Score an article
  const handleScoreArticle = () => {
    const today = new Date().toISOString().split('T')[0];
    scoreArticle({
      source: 'Reuters',
      content: articleContent,
      sentiment: 'neutral',
      timestamp: today,
      peer_articles: [
        { source: 'Bloomberg', sentiment: 'positive' },
        { source: 'CNBC', sentiment: 'neutral' },
      ],
    });
  };

  // Example: Calculate consensus
  const handleCalculateConsensus = () => {
    calculateConsensus([
      { source: 'Reuters', sentiment: 'negative' },
      { source: 'Bloomberg', sentiment: 'negative' },
      { source: 'BlogX', sentiment: 'positive' },
    ]);
  };

  return (
    <div className="grid grid-cols-1 gap-6 p-6">
      {/* Country Selection & Risk Analysis */}
      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-4">Geopolitical Risk Analysis</h2>
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Select Country</label>
          <select
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            <option>US</option>
            <option>CN</option>
            <option>RU</option>
            <option>IN</option>
            <option>GB</option>
          </select>
        </div>

        {/* Risk Score */}
        {riskLoading ? (
          <p>Loading risk data...</p>
        ) : riskData ? (
          <div className="bg-blue-50 p-4 rounded border border-blue-200">
            <p className="text-lg font-semibold">
              Risk Score: <span className="text-2xl text-blue-600">{riskData.risk_score?.toFixed(1)}</span>
            </p>
            <p className="text-sm text-gray-600 mt-2">Country: {riskData.country}</p>
            {riskData.risk_level && (
              <p className="text-sm font-medium mt-2">
                Level: <span className="text-red-600 capitalize">{riskData.risk_level}</span>
              </p>
            )}
            {riskData.dimensions && (
              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <p>War: {riskData.dimensions.war?.toFixed(1)}</p>
                <p>Sanctions: {riskData.dimensions.sanctions?.toFixed(1)}</p>
                <p>Economic: {riskData.dimensions.economic?.toFixed(1)}</p>
                <p>Political: {riskData.dimensions.political?.toFixed(1)}</p>
                <p>Currency: {riskData.dimensions.currency?.toFixed(1)}</p>
                <p>Regulatory: {riskData.dimensions.regulatory?.toFixed(1)}</p>
              </div>
            )}
          </div>
        ) : null}

        {/* Sector Impact */}
        {sectorLoading ? (
          <p className="mt-4">Loading sector data...</p>
        ) : sectorData?.length ? (
          <div className="mt-4">
            <h3 className="font-semibold mb-2">Affected Sectors</h3>
            <div className="space-y-2">
              {sectorData.slice(0, 5).map((sector, idx) => (
                <div key={idx} className="flex justify-between bg-gray-50 p-2 rounded">
                  <div>
                    <span className="font-medium">{sector.sector}</span>
                    <p className="text-xs text-gray-600">{sector.rationale}</p>
                  </div>
                  <span className={`font-semibold ${
                    sector.impact === 'bullish' ? 'text-green-600' : 
                    sector.impact === 'bearish' ? 'text-red-600' : 
                    'text-gray-600'
                  }`}>
                    {sector.impact.toUpperCase()} ({(sector.strength * 100).toFixed(0)}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      {/* Trust Scoring Engine */}
      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-4">Information Trust Scoring</h2>

        {/* Article Scoring */}
        <div className="mb-6">
          <h3 className="font-semibold mb-3">Score Article Trustworthiness</h3>
          <textarea
            value={articleContent}
            onChange={(e) => setArticleContent(e.target.value)}
            placeholder="Paste article content here..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md h-24"
          />
          <button
            onClick={handleScoreArticle}
            disabled={scoringArticle || !articleContent}
            className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
          >
            {scoringArticle ? 'Scoring...' : 'Score Article'}
          </button>

          {trustScore && (
            <div className="mt-4 bg-green-50 p-4 rounded border border-green-200">
              <p className="text-lg font-semibold">
                Trust Score: <span className="text-2xl text-green-600">{trustScore.trust_score?.toFixed(1)}</span>
              </p>
              {trustScore.is_outlier && (
                <p className="text-sm text-red-600 font-medium mt-2">⚠️ This article is an outlier</p>
              )}
              {trustScore.breakdown && (
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <p>Source Score: {trustScore.breakdown.source_score?.toFixed(1)}</p>
                  <p>Consensus: {trustScore.breakdown.consensus_score?.toFixed(1)}</p>
                  <p>Recency: {trustScore.breakdown.recency_score?.toFixed(1)}</p>
                  <p>Sentiment: {trustScore.breakdown.sentiment_score?.toFixed(1)}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Consensus Calculation */}
        <div>
          <h3 className="font-semibold mb-3">Calculate Consensus</h3>
          <button
            onClick={handleCalculateConsensus}
            disabled={calculatingConsensus}
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400"
          >
            {calculatingConsensus ? 'Calculating...' : 'Analyze Consensus'}
          </button>

          {consensusData && (
            <div className="mt-4 bg-purple-50 p-4 rounded border border-purple-200">
              <p className="font-semibold">
                Consensus Score: <span className="text-2xl text-purple-600">{consensusData.consensus_score?.toFixed(1)}</span>
              </p>
              <p className="text-sm text-gray-600 mt-2">
                Sentiment: <span className="font-medium capitalize">{consensusData.consensus_sentiment}</span>
              </p>
              <p className="text-sm text-gray-600">
                Agreement Level: <span className="font-medium capitalize">{consensusData.agreement_level}</span>
              </p>
              {consensusData.outliers?.length > 0 && (
                <div className="mt-3 bg-red-50 p-2 rounded">
                  <p className="text-sm font-medium text-red-700">Outlier Sources:</p>
                  <ul className="text-sm text-red-600 mt-1">
                    {consensusData.outliers.map((outlier, idx) => (
                      <li key={idx}>
                        • {outlier.source} - {outlier.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
