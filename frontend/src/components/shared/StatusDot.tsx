import { cn } from '@/lib/utils';

interface Props {
  status: 'connected' | 'reconnecting' | 'disconnected';
  className?: string;
}

export function StatusDot({ status, className }: Props) {
  const getColors = () => {
    switch (status) {
      case 'connected': return 'bg-accent-sage';
      case 'reconnecting': return 'bg-accent-amber animate-pulse';
      case 'disconnected': return 'bg-accent-rose';
      default: return 'bg-border-strong';
    }
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={cn("w-2 h-2 rounded-full", getColors())} />
      <span className="text-secondary text-xs uppercase tracking-wider">{status}</span>
    </div>
  );
}
