// ─── Sidebar Component ────────────────────────────────────────────────────────
// The left panel of the results layout, visible on desktop (lg+).
// Contains three sections:
//   1. Patient card — demographics + longevity score ring
//   2. Summary stats — clickable status filter buttons with counts
//   3. Category filters — list of biomarker panel names to drill into

'use client';

import { BiomarkerStatus, LabReport } from '@/lib/types';
import StatusBadge from './StatusBadge';

interface Props {
    report: LabReport;                         // full lab report data
    activeCategory: string;                    // currently selected category filter ('All' or a panel name)
    activeStatus: BiomarkerStatus | 'all';     // currently selected status filter
    categories: string[];                      // unique list of categories present in this report
    onCategory: (c: string) => void;           // called when the user selects a category
    onStatus: (s: BiomarkerStatus | 'all') => void; // called when the user selects a status
    onReset: () => void;                       // called when the user clicks "Upload new report"
}

export default function Sidebar({
    report, activeCategory, activeStatus, categories,
    onCategory, onStatus, onReset,
}: Props) {
    const { patient, biomarkers } = report;

    // ── Summary counts ──────────────────────────────────────────────────────────
    // Count how many biomarkers fall into each optimal status category.
    // These drive the summary cards and the longevity score ring.
    const counts = {
        optimal: biomarkers.filter(b => b.optimalStatus === 'optimal').length,
        normal: biomarkers.filter(b => b.optimalStatus === 'normal').length,
        out_of_range: biomarkers.filter(b => b.status === 'out_of_range').length,
    };

    // ── Longevity score ─────────────────────────────────────────────────────────
    // Percentage of biomarkers classified as optimal — shown as a circular progress ring.
    // Simple ratio: optimal count / total count, rounded to the nearest integer.
    const score = Math.round((counts.optimal / biomarkers.length) * 100);

    return (
        <aside className="flex flex-col gap-5">

            {/* ── Patient card ───────────────────────────────────────────────────── */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
                <div className="flex items-center justify-between mb-4">

                    {/* Patient demographics extracted from the report */}
                    <div>
                        <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Patient</p>
                        <p className="text-base font-semibold text-slate-800 dark:text-slate-100">
                            {patient.sex === 'male' ? 'Male' : 'Female'}, {patient.age} yrs
                            {/* Blood type shown inline if present on the report */}
                            {patient.bloodType && (
                                <span className="ml-2 text-xs font-mono font-normal text-slate-400 dark:text-slate-500">
                                    {patient.bloodType}
                                </span>
                            )}
                        </p>
                    </div>

                    {/* Circular longevity score ring — SVG drawn counter-clockwise from the top */}
                    <div className="relative w-14 h-14">
                        <svg viewBox="0 0 48 48" className="w-full h-full -rotate-90">
                            {/* Background track circle */}
                            <circle cx="24" cy="24" r="20" fill="none" strokeWidth="4"
                                className="stroke-slate-100 dark:stroke-slate-800" />
                            {/* Foreground progress arc — strokeDasharray drives the fill amount */}
                            {/* Full circumference at r=20 is ~125.7px; score% of that is filled */}
                            <circle cx="24" cy="24" r="20" fill="none" strokeWidth="4"
                                strokeLinecap="round"
                                className="stroke-brand-500 dark:stroke-brand-400 transition-all duration-700"
                                strokeDasharray={`${score * 1.257} 125.7`} />
                        </svg>
                        {/* Percentage label centered inside the ring */}
                        <span className="absolute inset-0 flex items-center justify-center text-xs font-mono font-semibold text-brand-600 dark:text-brand-400">
                            {score}%
                        </span>
                    </div>
                </div>

                {/* Report date from the lab document */}
                <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Report date</p>
                <p className="text-sm text-slate-600 dark:text-slate-400 font-mono">{report.reportDate}</p>
            </div>

            {/* ── Summary stats ──────────────────────────────────────────────────── */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
                <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">
                    Summary · {biomarkers.length} biomarkers
                </p>

                {/* One button per status — clicking filters the table to that status.
            Clicking the already-active status clears the filter back to 'all'. */}
                <div className="space-y-2">
                    {[
                        { status: 'out_of_range' as BiomarkerStatus, count: counts.out_of_range },
                        { status: 'normal' as BiomarkerStatus, count: counts.normal },
                        { status: 'optimal' as BiomarkerStatus, count: counts.optimal },
                    ].map(({ status, count }) => (
                        <button
                            key={status}
                            onClick={() => onStatus(activeStatus === status ? 'all' : status)} // toggle filter on/off
                            className={`w-full flex items-center justify-between p-2.5 rounded-xl border transition-all text-left
                ${activeStatus === status
                                    ? 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800'   // active highlight
                                    : 'border-transparent hover:border-slate-100 dark:hover:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/30' // idle hover
                                }`}
                        >
                            <StatusBadge status={status} small />
                            {/* Count shown on the right side of the button */}
                            <span className="text-sm font-mono font-semibold text-slate-700 dark:text-slate-300">
                                {count}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Category filters ────────────────────────────────────────────────── */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
                <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Categories</p>

                {/* "All" option always appears first, followed by the report's unique categories */}
                <div className="space-y-0.5">
                    {['All', ...categories].map((cat) => (
                        <button
                            key={cat}
                            onClick={() => onCategory(cat)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors
                ${activeCategory === cat
                                    ? 'bg-brand-50 text-brand-700 font-medium dark:bg-brand-950/60 dark:text-brand-300' // active state
                                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200' // idle state
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Reset link — clears the report and returns to the upload screen */}
            <button
                onClick={onReset}
                className="w-full text-sm text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors py-1"
            >
                ← Upload new report
            </button>
        </aside>
    );
}