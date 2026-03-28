"use client";

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { AnimatedNumber } from '@/components/shared/AnimatedNumber';
import Link from 'next/link';

export function HeroSection() {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 24 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } }
  };

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="max-w-4xl mx-auto text-center flex flex-col items-center mt-12"
    >
      <motion.span variants={item} className="text-xs font-semibold tracking-[0.2em] text-accent-indigo uppercase mb-6 drop-shadow-sm">
        FINANCIAL INTELLIGENCE PLATFORM
      </motion.span>
      
      <motion.h1 variants={item} className="font-display text-[clamp(2.5rem,5vw,4.5rem)] leading-[1.1] text-text-primary mb-1">
        Clarity in Every
      </motion.h1>
      <motion.h1 variants={item} className="font-display text-[clamp(2.5rem,5vw,4.5rem)] leading-[1.1] text-accent-indigo mb-8 italic">
        Market Move.
      </motion.h1>

      <motion.p variants={item} className="text-lg text-text-secondary max-w-2xl mb-12 text-balance leading-relaxed">
        Aggregate fragmented data into a single institutional-grade dashboard.
        Monitor geopolitical risk, trust-scored news, and hidden portfolio correlations in real-time.
      </motion.p>

      <motion.div variants={item} className="flex flex-col sm:flex-row items-center gap-4 mb-20">
        <Link href="/register">
          <Button size="lg" className="font-sans text-base shadow-indigo group h-12 px-8">
            Start Investing Smarter 
            <span className="ml-2 group-hover:translate-x-1 transition-transform">&rarr;</span>
          </Button>
        </Link>
        <Link href="#features">
          <Button size="lg" variant="ghost" className="font-sans text-base h-12 px-8">
            See How It Works
          </Button>
        </Link>
      </motion.div>

      <motion.div variants={item} className="flex flex-wrap justify-center gap-12 sm:gap-24 border-t border-border-light pt-12">
        <div className="flex flex-col items-center">
          <AnimatedNumber value={847} className="text-3xl font-bold text-text-primary mb-1 shadow-sm" />
          <span className="text-sm text-text-secondary font-medium uppercase tracking-wider">Portfolios Analysed</span>
        </div>
        <div className="flex flex-col items-center">
          <AnimatedNumber value={193} className="text-3xl font-bold text-text-primary mb-1 shadow-sm" />
          <span className="text-sm text-text-secondary font-medium uppercase tracking-wider">Countries Monitored</span>
        </div>
        <div className="flex flex-col items-center">
          <AnimatedNumber value={12440} suffix="+" className="text-3xl font-bold text-text-primary mb-1 shadow-sm" />
          <span className="text-sm text-text-secondary font-medium uppercase tracking-wider">Articles Trust-Scored</span>
        </div>
      </motion.div>
    </motion.div>
  );
}
