'use client';

import Navbar from './components/Navbar';
import UploadZone from './components/UploadZone';
import { useAnalyze, LOADING_STEPS } from './hooks/useAnalyze';

export default function Home() {
  const { state, report, errorMsg, fileName, step, handleFile, reset } = useAnalyze();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans">

      {/* Header */}
      <Navbar />

      {/* Main */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {(state === 'idle' || state === 'error') && (
          <div className="flex flex-col items-center">
            <div className="text-center mb-10 animate-fade-up">
              <p className="text-xs font-mono font-semibold text-brand-600 dark:text-brand-400 uppercase tracking-[0.2em] mb-4">
                Performance for a lifetime
              </p>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-slate-100 leading-tight mb-4 tracking-tight">
                Turn lab results into<br />
                <span className="text-brand-600 dark:text-brand-400">actionable insights</span>
              </h1>
              <p className="text-base text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                Upload any lab report PDF. AI extracts every biomarker, standardizes units,
                and classifies results against longevity-optimal ranges.
              </p>
            </div>

            <UploadZone onFile={handleFile} loading={false} />

            {state === 'error' && (
              <div className="mt-5 px-4 py-3 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 text-sm text-red-600 dark:text-red-400 font-mono">
                {errorMsg}
              </div>
            )}

            <div className="flex flex-wrap justify-center gap-3 mt-8">
              {['Any language', 'All biomarkers extracted', 'Longevity-optimal ranges', 'Age & sex adjusted'].map(f => (
                <span key={f} className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-500 dark:bg-brand-400" />
                  {f}
                </span>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}