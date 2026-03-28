"use client";

import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface Props {
  children: ReactNode;
  accentColor?: "indigo" | "teal" | "amber" | "rose" | "violet" | "sage";
  className?: string;
  onClick?: () => void;
}

export function SoftCard({ children, accentColor, className, onClick }: Props) {
  return (
    <motion.div
      onClick={onClick}
      whileHover={{ y: -2, boxShadow: 'var(--shadow-lg)' }}
      transition={{ duration: 0.2 }}
      className={cn(
        "bg-surface border border-base rounded-2xl p-6 shadow-sm transition-colors duration-200 hover:border-strong",
        accentColor && `border-l-[3px] border-l-accent-${accentColor}`,
        className
      )}
    >
      {children}
    </motion.div>
  );
}
