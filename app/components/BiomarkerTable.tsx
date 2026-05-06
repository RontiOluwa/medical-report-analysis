'use client';

import { useState } from 'react';
import { BiomarkerStatus, LabReport } from '@/lib/types';
import BiomarkerRow from './BiomarkerRow';
import Sidebar from './Sidebar';

interface Props {
    report: LabReport;
    onReset: () => void;
}

export default function BiomarkerTable({ report, onReset }: Props) {
    const [activeCategory, setActiveCategory] = useState('All');
    const [activeStatus, setActiveStatus] = useState<BiomarkerStatus | 'all'>('all');
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

    const categories = [...new Set(report.biomarkers.map(b => b.category))];

    const filtered = report.biomarkers.filter(b => {
        const catOk = activeCategory === 'All' || b.category === activeCategory;
        const statusOk = activeStatus === 'all' || b.status === activeStatus || b.optimalStatus === activeStatus;
        return catOk && statusOk;
    });

    const grouped = filtered.reduce<Record<string, typeof filtered>>((acc, b) => {
        (acc[b.category] = acc[b.category] || []).push(b);
        return acc;
    }, {});

    return (
        <div className="flex flex-col lg:flex-row gap-6 w-full animate-fade-in">

            {/* Mobile category chips */}
            <div className="lg:hidden flex items-center gap-2 overflow-x-auto pb-1">
                <button
                    onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
                    className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-600 dark:text-slate-300"
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="4" y1="6" x2="20" y2="6" /><line x1="8" y1="12" x2="16" y2="12" /><line x1="11" y1="18" x2="13" y2="18" />
                    </svg>
                    Filters
                </button>
                {['All', ...categories].map(cat => (
                    <button key={cat} onClick={() => setActiveCategory(cat)}
                        className={`flex-shrink-0 px-3 py-2 rounded-lg border text-xs font-mono transition-colors
              ${activeCategory === cat
                                ? 'border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-700 dark:bg-brand-950/50 dark:text-brand-300'
                                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400'}`}
                    >{cat}</button>
                ))}
            </div>

            {/* Mobile sidebar drawer */}
            {mobileSidebarOpen && (
                <div className="lg:hidden">
                    <Sidebar report={report} activeCategory={activeCategory} activeStatus={activeStatus}
                        categories={categories}
                        onCategory={(c) => { setActiveCategory(c); setMobileSidebarOpen(false); }}
                        onStatus={setActiveStatus} onReset={onReset} />
                </div>
            )}

            {/* Desktop sidebar */}
            <div className="hidden lg:block w-64 xl:w-72 flex-shrink-0">
                <Sidebar report={report} activeCategory={activeCategory} activeStatus={activeStatus}
                    categories={categories} onCategory={setActiveCategory} onStatus={setActiveStatus} onReset={onReset} />
            </div>

            {/* Main panel */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-mono text-slate-400 dark:text-slate-500">
                        <span className="text-slate-700 dark:text-slate-300 font-semibold">{filtered.length}</span> biomarkers
                    </p>
                    <button onClick={onReset} className="lg:hidden text-xs text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors">
                        ← New report
                    </button>
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
                    {Object.keys(grouped).length === 0 ? (
                        <div className="p-12 text-center">
                            <p className="text-sm font-mono text-slate-400 dark:text-slate-500">No biomarkers match the current filter.</p>
                        </div>
                    ) : (
                        Object.entries(grouped).map(([category, rows], idx) => (
                            <div key={category}>
                                <div className={`px-4 py-2.5 flex items-center gap-2 bg-slate-50/70 dark:bg-slate-800/40 ${idx > 0 ? 'border-t border-slate-100 dark:border-slate-800' : ''}`}>
                                    <span className="text-[10px] font-mono font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{category}</span>
                                    <span className="text-[10px] font-mono text-slate-300 dark:text-slate-600">· {rows.length}</span>
                                </div>
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-slate-100 dark:border-slate-800">
                                            <th className="w-8" />
                                            {['Biomarker', 'Value', 'Lab Range', 'Lab Status', 'Optimal'].map((h, i) => (
                                                <th key={h} className={`py-2.5 pr-4 text-left text-[10px] font-mono font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider
                          ${i === 2 ? 'hidden sm:table-cell' : i === 3 ? 'hidden md:table-cell' : ''}`}>
                                                    {h}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rows.map(b => <BiomarkerRow key={b.name} b={b} />)}
                                    </tbody>
                                </table>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}