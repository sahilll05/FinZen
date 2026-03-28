"use client";

import { motion } from 'framer-motion';
import { SoftCard } from '@/components/shared/SoftCard';
import { ShieldCheck, Map, Network, Activity, RotateCw, BrainCircuit } from 'lucide-react';

const features = [
  {
    title: 'Trust-Scored News',
    desc: 'Every article rated 0-100 for source credibility',
    icon: ShieldCheck,
    color: 'amber' as const,
  },
  {
    title: 'Geopolitical Risk Heatmap',
    desc: 'Real-time composite risk scores across 193 countries',
    icon: Map,
    color: 'teal' as const,
  },
  {
    title: 'Causal Chain Engine',
    desc: 'Trace how global events propagate to your holdings',
    icon: Network,
    color: 'violet' as const,
  },
  {
    title: 'Knowledge Graph',
    desc: 'Company-sector-country relationship web',
    icon: BrainCircuit,
    color: 'indigo' as const,
  },
  {
    title: 'Portfolio X-Ray',
    desc: 'Decompose hidden correlations and concentration risk',
    icon: Activity,
    color: 'rose' as const,
  },
  {
    title: 'Monte Carlo Simulator',
    desc: '10,000-scenario stress testing in seconds',
    icon: RotateCw,
    color: 'sage' as const,
  },
];

export function FeatureGrid() {
  return (
    <div id="features" className="w-full py-32 z-10 relative">
      <div className="text-center mb-16">
        <h2 className="font-display text-3xl text-text-primary mb-4">Unmatched Intelligence Density</h2>
        <p className="text-text-secondary">Institutional capabilities, refined for the modern analyst.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((item, i) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ delay: i * 0.1, duration: 0.5 }}
          >
            <SoftCard accentColor={item.color} className="h-full flex flex-col bg-surface/90 backdrop-blur-md">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-6 bg-accent-${item.color}-light text-accent-${item.color} border border-accent-${item.color}/10 shadow-sm`}>
                <item.icon className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">{item.title}</h3>
              <p className="text-sm text-text-secondary leading-relaxed">{item.desc}</p>
            </SoftCard>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
