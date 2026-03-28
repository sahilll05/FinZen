"use client";

import { useState, useRef, useEffect } from 'react';
import { SoftCard } from '@/components/shared/SoftCard';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { aiAPI, portfolioAPI } from '@/lib/api';

interface Message {
  role: 'user' | 'ai';
  content: string;
  sources?: string[];
  confidence?: number;
}

interface Portfolio {
  id: string;
  name: string;
}

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string | undefined>(undefined);
  const [includePortfolio, setIncludePortfolio] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    portfolioAPI.list()
      .then(res => {
        const data: Portfolio[] = res.data;
        setPortfolios(data);
        if (data.length > 0) setSelectedPortfolioId(data[0].id);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await aiAPI.chat({
        message: text,
        conversation_id: conversationId,
        portfolio_id: includePortfolio && selectedPortfolioId ? selectedPortfolioId : undefined,
      });
      const { response, sources, confidence, conversation_id } = res.data;
      setConversationId(conversation_id);
      setMessages(prev => [...prev, { role: 'ai', content: response, sources, confidence }]);
    } catch {
      setMessages(prev => [
        ...prev,
        {
          role: 'ai',
          content: 'Sorry, the AI assistant is currently unavailable. Please ensure the backend server is running at http://localhost:8000.',
          sources: ['System'],
          confidence: 0,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const QUICK_PROMPTS = [
    "Stress test my portfolio against a 20% oil price spike.",
    "What geopolitical risks are most relevant right now?",
    "Summarize today's trusted financial news.",
    "Identify hidden concentration risks in my tech holdings.",
  ];

  return (
    <div className="h-[calc(100vh-8rem)] flex animate-in fade-in duration-500 overflow-hidden bg-root -m-8 mr-[-2rem] mb-[-2rem]">
      {/* Sidebar */}
      <div className="w-72 bg-surface/50 border-r border-border-light p-6 flex flex-col h-full shadow-[2px_0_16px_rgba(28,25,23,0.02)]">
        <Button
          className="w-full bg-surface text-accent-indigo border border-accent-indigo hover:bg-accent-indigo-light shadow-xs justify-start h-11 px-4 mb-8"
          onClick={() => { setMessages([]); setConversationId(undefined); }}
        >
          + New Context Chat
        </Button>

        {portfolios.length > 0 && (
          <div className="mb-6">
            <span className="text-xs font-semibold uppercase tracking-widest text-text-secondary mb-2 block">Portfolio Context</span>
            <select
              value={selectedPortfolioId}
              onChange={(e) => setSelectedPortfolioId(e.target.value)}
              className="w-full bg-elevated border border-border-base rounded-lg px-3 py-2 text-sm text-text-primary"
            >
              {portfolios.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        )}

        <span className="text-xs font-semibold uppercase tracking-widest text-text-secondary mb-4 block">Quick Prompts</span>
        <div className="space-y-2 flex-1 overflow-y-auto">
          {QUICK_PROMPTS.map((prompt, i) => (
            <div
              key={i}
              onClick={() => setInput(prompt)}
              className="hover:bg-elevated px-4 py-3 rounded-lg text-sm text-text-secondary cursor-pointer transition-colors truncate border border-transparent hover:border-border-light"
            >
              {prompt}
            </div>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col relative h-full">
        <div className="flex-1 overflow-y-auto p-12 space-y-6">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center -mt-10">
              <h2 className="font-display text-4xl text-text-primary mb-3">Intelligence Assistant</h2>
              <p className="text-text-secondary mb-12 max-w-lg text-center leading-relaxed font-sans">
                Leverage the FinZen AI engine. Query market history, live news, and your portfolio's hidden correlations.
              </p>
              <div className="grid grid-cols-2 gap-4 max-w-2xl w-full">
                {QUICK_PROMPTS.map((prompt, i) => (
                  <SoftCard
                    key={i}
                    className={`cursor-pointer hover:border-accent-indigo bg-surface p-5 border-l-[3px] ${
                      i === 0 ? 'border-accent-indigo' : i === 1 ? 'border-accent-teal' : i === 2 ? 'border-accent-amber' : 'border-accent-rose'
                    }`}
                    onClick={() => setInput(prompt)}
                  >
                    <p className="text-sm font-semibold text-text-primary">{prompt}</p>
                  </SoftCard>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-8 pb-32">
              {messages.map((m, i) => (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={i}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {m.role === 'ai' && (
                    <div className="w-8 h-8 rounded bg-accent-indigo flex items-center justify-center text-white font-serif italic text-sm shadow-sm mt-1 mr-4 shrink-0">
                      AI
                    </div>
                  )}
                  <div
                    className={`p-5 rounded-2xl max-w-2xl text-sm leading-relaxed ${
                      m.role === 'user'
                        ? 'bg-accent-indigo text-white shadow-md rounded-tr-sm'
                        : 'bg-surface border border-border-base text-text-body shadow-sm rounded-tl-sm'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{m.content}</div>
                    {m.role === 'ai' && m.sources && m.sources.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-border-light/50 flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-mono uppercase tracking-widest text-text-secondary font-bold">Sources:</span>
                        {m.sources.map((src, j) => (
                          <span key={j} className="text-[10px] bg-elevated border border-border-strong px-2 py-0.5 rounded text-text-primary shadow-xs">
                            {src}
                          </span>
                        ))}
                        {m.confidence !== undefined && m.confidence > 0 && (
                          <span className="text-[10px] bg-accent-teal-light text-accent-teal border border-accent-teal/20 px-2 py-0.5 rounded shadow-xs font-bold tracking-wide ml-auto">
                            ✓ {Math.round(m.confidence * 100)}% confidence
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
              {isLoading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                  <div className="w-8 h-8 rounded bg-accent-indigo flex items-center justify-center text-white font-serif italic text-sm shadow-sm mt-1 mr-4 shrink-0">AI</div>
                  <div className="p-5 rounded-2xl bg-surface border border-border-base shadow-sm rounded-tl-sm">
                    <span className="animate-pulse text-text-secondary text-sm">Analyzing...</span>
                  </div>
                </motion.div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-root via-root to-transparent pb-10">
          <div className="max-w-4xl mx-auto relative bg-surface p-2 rounded-2xl shadow-lg border border-border-base flex items-end ring-2 ring-accent-indigo/10">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
              placeholder="Synthesize intelligence..."
              className="w-full bg-transparent resize-none h-14 p-4 focus:outline-none text-text-body font-sans placeholder-text-dim text-base leading-relaxed"
            />
            <Button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="m-2 rounded-xl h-10 w-10 p-0 shadow-sm shrink-0 bg-accent-indigo disabled:opacity-50"
            >
              ↑
            </Button>
          </div>
          <div className="max-w-4xl mx-auto flex gap-4 mt-3">
            <label className="flex items-center gap-2 text-xs font-semibold text-text-secondary cursor-pointer">
              <input
                type="checkbox"
                className="accent-accent-indigo w-3.5 h-3.5"
                checked={includePortfolio}
                onChange={e => setIncludePortfolio(e.target.checked)}
              />
              Include Portfolio Context
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
