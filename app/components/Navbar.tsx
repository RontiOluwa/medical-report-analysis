import { ThemeToggle } from './ThemeToggle';

function Navbar() {
    return (
        <header className="sticky top-0 z-50 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-brand-500 dark:bg-brand-400 flex items-center justify-center">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                        </svg>
                    </div>
                    <span className="font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
                        Axo <span className="text-brand-600 dark:text-brand-400">Lab</span>
                    </span>
                    <span className="hidden sm:inline text-[10px] font-mono text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5 ml-1">
                        ANALYZER
                    </span>
                </div>
                <ThemeToggle />
            </div>
        </header>
    )
}

export default Navbar