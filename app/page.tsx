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

        {/* Idle / Error */}
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

        {/* Loading */}
        {state === 'loading' && (
          <div className="flex flex-col items-center py-16 animate-fade-up">
            <div className="w-12 h-12 rounded-2xl bg-brand-50 dark:bg-brand-950/50 border border-brand-200 dark:border-brand-800 flex items-center justify-center mb-6">
              <svg className="w-5 h-5 text-brand-500 dark:text-brand-400 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-1">Analyzing your report</h2>
            <p className="text-sm font-mono text-slate-400 dark:text-slate-500 mb-8 truncate max-w-xs">{fileName}</p>
            <div className="space-y-3 w-full max-w-xs">
              {LOADING_STEPS.map((s, i) => (
                <div key={s} className={`flex items-center gap-3 transition-opacity duration-500 ${i <= step ? 'opacity-100' : 'opacity-25'}`}>
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${i < step ? 'bg-brand-500 dark:bg-brand-400' : i === step ? 'bg-brand-400 animate-pulse' : 'bg-slate-200 dark:bg-slate-700'}`} />
                  <span className={`text-sm font-mono ${i <= step ? 'text-slate-700 dark:text-slate-300' : 'text-slate-300 dark:text-slate-600'}`}>{s}</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}