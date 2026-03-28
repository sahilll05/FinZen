"use client";

import { motion } from 'framer-motion';

export function FloatingOrbs() {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
      <motion.div
        animate={{ y: [0, -40, 0], x: [0, 30, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[15%] left-[10%] w-[500px] h-[500px] bg-accent-indigo-light opacity-10 blur-[80px] rounded-full"
      />
      <motion.div
        animate={{ y: [0, 50, 0], x: [0, -20, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        className="absolute top-[40%] right-[15%] w-[600px] h-[600px] bg-accent-teal-light opacity-[0.08] blur-[80px] rounded-full"
      />
      <motion.div
        animate={{ y: [0, -30, 0], x: [0, -40, 0] }}
        transition={{ duration: 25, repeat: Infinity, ease: "easeInOut", delay: 4 }}
        className="absolute bottom-[10%] left-[30%] w-[450px] h-[450px] bg-accent-amber-light opacity-[0.06] blur-[80px] rounded-full"
      />
    </div>
  );
}
