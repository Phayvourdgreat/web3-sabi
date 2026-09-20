import { Loader2 } from 'lucide-react';

export function FullScreenLoader() {
  return (
    <div className="min-h-screen bg-ink-950 flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-lime-500 animate-spin" />
    </div>
  );
}

export function ProgressBar({
  value,
  className = '',
}: {
  value: number;
  className?: string;
}) {
  return (
    <div className={`bg-ink-700 rounded-full h-2 overflow-hidden ${className}`}>
      <div
        className="h-full bg-lime-500 rounded-full transition-all duration-500 ease-out"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}
