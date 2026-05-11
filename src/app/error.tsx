'use client';

import { useEffect } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[app error]', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-6">
      <div className="bg-white border border-red-200 rounded-2xl p-8 max-w-md w-full shadow-lg text-center">
        <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-6 h-6 text-red-500" />
        </div>
        <h1 className="text-navy font-black text-lg mb-2">Something went wrong</h1>
        <p className="text-slate-500 text-sm mb-1">{error.message}</p>
        {error.digest && (
          <p className="text-xxs font-mono text-slate-300 mb-6">{error.digest}</p>
        )}
        <button
          type="button"
          onClick={reset}
          className="flex items-center gap-2 mx-auto bg-navy text-white text-xs font-bold px-5 py-2.5 rounded-lg hover:bg-navy-light transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Try again
        </button>
      </div>
    </div>
  );
}
