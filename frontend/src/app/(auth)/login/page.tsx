"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/authStore';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('demo@finzen.app');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Invalid credentials. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex text-text-body bg-surface">
      {/* Left Panel */}
      <div className="hidden lg:flex flex-col justify-center w-[55%] bg-gradient-to-br from-[#4338ca] to-[#6d28d9] p-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop')] opacity-10 mix-blend-overlay bg-cover bg-center" />
        
        <div className="relative z-10 flex flex-col h-full justify-between max-w-xl text-white">
          <Link href="/" className="font-display text-3xl font-bold tracking-tight text-white hover:text-white/90">FinZen</Link>
          
          <div className="my-auto">
            <h1 className="font-display text-5xl leading-tight mb-6 text-white font-medium">Your portfolio.<br/>Intelligently managed.</h1>
            <p className="text-indigo-100/80 text-lg mb-12 font-sans font-light">Stop trading on noise. FinZen contextualizes every market movement.</p>
            
            {/* Animated Cards Demo */}
            <div className="space-y-4 relative">
              <motion.div 
                animate={{ y: [0, -10, 0] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-xl flex items-center justify-between shadow-xl"
              >
                <span className="font-semibold tracking-wide text-sm font-sans text-white">REUTERS</span>
                <div className="bg-accent-sage/20 text-accent-sage-light px-2 py-1 rounded text-xs font-mono font-bold border border-accent-sage/30 shadow-sm">
                  ✓ VERIFIED 94
                </div>
              </motion.div>
              <motion.div 
                animate={{ y: [0, -10, 0] }} transition={{ duration: 5, delay: 1, repeat: Infinity, ease: 'easeInOut' }}
                className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-xl w-3/4 shadow-xl flex items-center gap-4"
              >
                <div className="w-3 h-3 rounded-full bg-accent-sage animate-pulse shadow-sm" />
                <span className="text-sm font-sans text-white">Geopolitical Risk: <strong>LOW</strong></span>
              </motion.div>
            </div>
          </div>
          
          <div className="text-sm text-indigo-200 font-sans tracking-wide">© 2026 FinZen Intelligence</div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex flex-col justify-center px-8 sm:px-16 lg:px-24 bg-surface relative">
        <div className="w-full max-w-md mx-auto">
          <div className="lg:hidden mb-12">
            <Link href="/" className="font-display text-3xl font-bold text-accent-indigo">FinZen</Link>
          </div>

          <h2 className="font-display text-4xl text-text-primary mb-2 shadow-sm">Welcome back.</h2>
          <p className="text-text-secondary mb-8 text-sm font-sans">Sign in to access your intelligence dashboard.</p>

          <form onSubmit={handleSubmit} className="space-y-5 flex flex-col font-sans">
            <div>
              <label className="block text-sm font-semibold text-text-primary mb-1.5 focus-within:text-accent-indigo transition-colors" htmlFor="email">Email</label>
              <input 
                id="email" 
                type="email" 
                autoComplete="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full h-11 bg-elevated border border-border-base rounded-lg px-4 focus:outline-none focus:ring-2 focus:ring-accent-indigo focus:bg-surface focus:border-transparent transition-all shadow-xs" 
                placeholder="name@company.com" 
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-text-primary mb-1.5 focus-within:text-accent-indigo transition-colors" htmlFor="password">Password</label>
              <div className="relative">
                <input 
                  id="password" 
                  type={showPassword ? 'text' : 'password'} 
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full h-11 bg-elevated border border-border-base rounded-lg pl-4 pr-12 focus:outline-none focus:ring-2 focus:ring-accent-indigo focus:bg-surface focus:border-transparent transition-all shadow-xs" 
                  placeholder="••••••••" 
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary text-sm font-medium"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {error && (
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="text-sm text-accent-rose font-medium bg-accent-rose-light px-3 py-2 border border-accent-rose/20 shadow-sm rounded-md">
                {error}
              </motion.div>
            )}

            <Button type="submit" className="w-full h-11 text-base shadow-indigo mt-4" disabled={isSubmitting} variant="default">
              {isSubmitting ? 'Authenticating...' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-8 text-center bg-surface font-sans">
            <p className="text-sm text-text-secondary">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="text-accent-indigo font-semibold hover:underline">
                Register &rarr;
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
