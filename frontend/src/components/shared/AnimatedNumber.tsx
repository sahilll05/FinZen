"use client";

import { useEffect } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';

interface Props {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
}

export function AnimatedNumber({ value, prefix = '', suffix = '', decimals = 0, className = '' }: Props) {
  const spring = useSpring(0, { stiffness: 100, damping: 30 });
  const display = useTransform(spring, current => 
    `${prefix}${current.toFixed(decimals)}${suffix}`
  );

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  return <motion.span className={`font-mono ${className}`}>{display}</motion.span>;
}
