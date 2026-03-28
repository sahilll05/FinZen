import { HeroSection } from '@/components/landing/HeroSection';
import { FeatureGrid } from '@/components/landing/FeatureGrid';
import { TickerTape } from '@/components/landing/TickerTape';
import { GrainOverlay } from '@/components/shared/GrainOverlay';
import { FloatingOrbs } from '@/components/landing/FloatingOrbs';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-root relative overflow-hidden flex flex-col items-center">
      <GrainOverlay />
      
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-accent-indigo-light rounded-full blur-[120px] mix-blend-multiply opacity-50 animate-float-blob" />
      <div className="absolute top-[20%] right-[-10%] w-[40%] h-[60%] bg-accent-teal-light rounded-full blur-[120px] mix-blend-multiply opacity-50 animate-float-blob" style={{ animationDelay: '2s' }} />
      <div className="absolute bottom-[-20%] left-[20%] w-[60%] h-[40%] bg-accent-amber-light rounded-full blur-[120px] mix-blend-multiply opacity-50 animate-float-blob" style={{ animationDelay: '4s' }} />
      
      <FloatingOrbs />

      <nav className="w-full fixed top-0 left-0 bg-root/90 backdrop-blur-[16px] border-b border-border-light z-50 flex items-center justify-between px-8 h-20 transition-all hover:shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-accent-indigo animate-pulse" />
          <span className="font-display text-2xl font-bold tracking-tight text-text-primary">FinZen</span>
        </div>
        
        <div className="hidden md:flex items-center gap-8 font-sans text-sm font-medium text-text-body">
          <Link href="#platform" className="hover:text-accent-indigo transition-colors">Platform</Link>
          <Link href="#intelligence" className="hover:text-accent-indigo transition-colors">Intelligence</Link>
          <Link href="#security" className="hover:text-accent-indigo transition-colors">Security</Link>
        </div>

        <div className="flex items-center gap-4">
          <Link href="/login">
            <Button variant="ghost" className="font-sans border border-accent-indigo text-accent-indigo hover:bg-accent-indigo hover:text-white transition-colors">
              Sign In
            </Button>
          </Link>
          <Link href="/register">
            <Button className="font-sans shadow-indigo">Get Access &rarr;</Button>
          </Link>
        </div>
      </nav>

      <main className="flex-1 w-full max-w-[1440px] px-8 pt-40 pb-20 relative z-10 flex flex-col items-center">
        <HeroSection />
        <FeatureGrid />
      </main>

      <TickerTape />
    </div>
  );
}
