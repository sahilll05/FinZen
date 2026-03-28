"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/authStore';
import Link from 'next/link';

export default function RegisterPage() {
  const [formData, setFormData] = useState({ fullName: 'FinZen Demo Admin', email: 'demo@finzen.app', password: 'password123', country: 'US' });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register } = useAuthStore();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await register({
        full_name: formData.fullName,
        email: formData.email,
        password: formData.password,
        country_code: formData.country,
      });
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
      setIsSubmitting(false);
    }
  };

  const getStrength = (pass: string) => {
    if (!pass) return { width: '0%', color: 'transparent', w: 0 };
    if (pass.length < 5) return { width: '33%', color: 'var(--accent-rose)', w: 33 };
    if (pass.length < 8) return { width: '66%', color: 'var(--accent-amber)', w: 66 };
    return { width: '100%', color: 'var(--accent-sage)', w: 100 };
  };

  return (
    <div className="min-h-screen flex text-text-body bg-surface">
      {/* Left Panel */}
      <div className="hidden lg:flex flex-col justify-center w-[55%] bg-gradient-to-br from-[#0f766e] to-[#042f2e] p-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2564&auto=format&fit=crop')] opacity-10 mix-blend-overlay bg-cover bg-center" />
        <div className="relative z-10 flex flex-col h-full justify-between max-w-xl text-white">
          <Link href="/" className="font-display text-3xl font-bold tracking-tight text-white hover:text-white/90">FinZen</Link>
          <div className="my-auto">
            <h1 className="font-display text-5xl leading-tight mb-6 text-white font-medium">Build your thesis.<br/>With confidence.</h1>
            <p className="text-teal-100/80 text-lg mb-12 font-sans font-light">Join institutions using FinZen to outmaneuver global risk.</p>
          </div>
          <div className="text-sm text-teal-200 font-sans tracking-wide">© 2026 FinZen Intelligence</div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex flex-col justify-center px-8 sm:px-16 lg:px-24 bg-surface relative overflow-y-auto py-12">
        <div className="w-full max-w-md mx-auto">
          <div className="lg:hidden mb-12">
            <Link href="/" className="font-display text-3xl font-bold text-accent-indigo">FinZen</Link>
          </div>

          <h2 className="font-display text-4xl text-text-primary mb-2 shadow-sm">Create Account</h2>
          <p className="text-text-secondary mb-8 text-sm font-sans">Join the next generation of intelligence.</p>

          <form onSubmit={handleRegister} className="space-y-4 flex flex-col font-sans">
            <div>
              <label className="block text-sm font-semibold text-text-primary mb-1.5 focus-within:text-accent-indigo transition-colors" htmlFor="fullName">Full Name</label>
              <input 
                id="fullName" 
                required
                value={formData.fullName}
                onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full h-11 bg-elevated border border-border-base rounded-lg px-4 focus:outline-none focus:ring-2 focus:ring-accent-indigo focus:bg-surface focus:border-transparent transition-all shadow-xs" 
                placeholder="Jane Doe" 
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-text-primary mb-1.5 focus-within:text-accent-indigo transition-colors" htmlFor="email">Email</label>
              <input 
                id="email" 
                type="email" 
                required
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                className="w-full h-11 bg-elevated border border-border-base rounded-lg px-4 focus:outline-none focus:ring-2 focus:ring-accent-indigo focus:bg-surface focus:border-transparent transition-all shadow-xs" 
                placeholder="jane@company.com" 
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-text-primary mb-1.5 focus-within:text-accent-indigo transition-colors" htmlFor="country">Country</label>
              <select 
                id="country" 
                required
                value={formData.country}
                onChange={e => setFormData({ ...formData, country: e.target.value })}
                className="w-full h-11 bg-elevated border border-border-base rounded-lg px-4 focus:outline-none focus:ring-2 focus:ring-accent-indigo focus:bg-surface focus:border-transparent transition-all shadow-xs"
              >
                <option value="US">🇺🇸 United States</option>
                <option value="GB">🇬🇧 United Kingdom</option>
                <option value="IN">🇮🇳 India</option>
                <option value="SG">🇸🇬 Singapore</option>
                <option value="AU">🇦🇺 Australia</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-text-primary mb-1.5 focus-within:text-accent-indigo transition-colors" htmlFor="password">Password</label>
              <input 
                id="password" 
                type="password" 
                required
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
                className="w-full h-11 bg-elevated border border-border-base rounded-lg px-4 focus:outline-none focus:ring-2 focus:ring-accent-indigo focus:bg-surface focus:border-transparent transition-all shadow-xs" 
                placeholder="••••••••" 
              />
              <div className="mt-2 h-1 bg-elevated rounded-full overflow-hidden flex border border-border-base shadow-xs">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: getStrength(formData.password).width, backgroundColor: getStrength(formData.password).color }}
                  className="h-full rounded-full transition-colors duration-300"
                />
              </div>
            </div>

            {error && <div className="text-sm text-accent-rose font-medium bg-accent-rose-light px-3 py-2 border border-accent-rose/20 shadow-sm rounded-md">{error}</div>}

            <Button type="submit" className="w-full h-11 text-base shadow-indigo mt-6" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Register Account'}
            </Button>
          </form>

          <div className="mt-8 text-center font-sans">
            <p className="text-sm text-text-secondary">
              Already have an account?{' '}
              <Link href="/login" className="text-accent-indigo font-semibold hover:underline">
                Sign In &rarr;
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
