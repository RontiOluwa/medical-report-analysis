// ─── BiomarkerRow Component ───────────────────────────────────────────────────
// Renders a single biomarker as a table row with an expandable detail panel.
// Clicking the row toggles an inline expanded view showing the range bar,
// range values side by side, and the clinical note from the AI.

'use client';

import { useState } from 'react';
import { Biomarker } from '@/lib/types';
import StatusBadge from './StatusBadge';
import RangeBar from './RangeBar';

// Formats a ReferenceRange into a human-readable string.
// Handles all four combinations of min/max nullability.
function fmtRange(min: number | null, max: number | null): string {
    if (min !== null && max !== null) return `${min} – ${max}`; // bounded range
    if (max !== null) return `< ${max}`;                        // upper limit only
    if (min !== null) return `> ${min}`;                        // lower limit only
    return '—';                                                  // no range defined
}

export default function BiomarkerRow({ b }: { b: Biomarker }) {
    // Controls whether the expanded detail panel is visible below this row.
    const [open, setOpen] = useState(false);

    // Color class for the HIGH/LOW flag indicator shown before the biomarker name.
    const flagColor = b.flag === 'HIGH'
        ? 'text-red-500 dark:text-red-400'   // above range — red
        : b.flag === 'LOW'
            ? 'text-blue-500 dark:text-blue-400' // below range — blue
            : '';

    return (
        <>
            {/* ── Main row ──────────────────────────────────────────────────────── */}
            <tr
                onClick={() => setOpen(!open)} // clicking anywhere on the row toggles expanded view
                className="group cursor-pointer border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
                {/* Expand/collapse chevron — rotates 90° when the row is open */}
                <td className="w-8 pl-4 py-3.5">
                    <svg
                        width="14" height="14" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        className={`text-slate-300 dark:text-slate-600 group-hover:text-slate-400 transition-all duration-200 ${open ? 'rotate-90' : ''}`}
                    >
                        <polyline points="9 18 15 12 9 6" />
                    </svg>
                </td>

                {/* Biomarker name — with optional HIGH/LOW arrow prefix */}
                <td className="py-3.5 pr-4">
                    <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                        {/* Show directional flag if the value is outside the lab reference range */}
                        {b.flag && (
                            <span className={`mr-1.5 text-xs font-mono ${flagColor}`}>
                                {b.flag === 'HIGH' ? '↑' : '↓'} {/* render visual arrow from safe ASCII flag */}
                            </span>
                        )}
                        {b.name}
                    </span>
                </td>

                {/* Numeric value with unit — monospaced for alignment across rows */}
                <td className="py-3.5 pr-4 font-mono text-sm font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
                    {b.value}
                    <span className="ml-1 text-xs text-slate-400 dark:text-slate-500 font-normal">{b.unit}</span>
                </td>

                {/* Lab reference range — hidden on mobile to avoid horizontal overflow */}
                <td className="py-3.5 pr-4 font-mono text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap hidden sm:table-cell">
                    {fmtRange(b.referenceRange.min, b.referenceRange.max)}
                </td>

                {/* Lab status badge — hidden on small screens */}
                <td className="py-3.5 pr-2 hidden md:table-cell">
                    <StatusBadge status={b.status} small />
                </td>

                {/* Optimal status badge — always visible, this is the key longevity insight */}
                <td className="py-3.5 pr-4">
                    <StatusBadge status={b.optimalStatus} small />
                </td>
            </tr>{open && (
                <tr className="border-b border-slate-100 dark:border-slate-800">
                    <td />{/* empty cell to align with the chevron column */}
                    <td colSpan={5} className="pb-5 pr-4">
                        <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-4">

                            {/* Visual range bar showing where the value sits relative to both ranges */}
                            <RangeBar b={b} />

                            {/* Legend explaining the two colored bars */}
                            <div className="flex gap-4 mt-3 mb-4 flex-wrap">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-4 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700" />
                                    <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">Lab range</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-4 h-1.5 rounded-full bg-brand-200 dark:bg-brand-900" />
                                    <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">Optimal range</span>
                                </div>
                            </div>

                            {/* Range value cards — lab reference on left, longevity-optimal on right */}
                            <div className="grid grid-cols-2 gap-3 mb-4">
                                {/* Lab reference range card */}
                                <div className="p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                                    <p className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Lab Reference</p>
                                    <p className="text-sm font-mono font-medium text-slate-700 dark:text-slate-300">
                                        {fmtRange(b.referenceRange.min, b.referenceRange.max)}
                                        <span className="text-xs text-slate-400 ml-1">{b.unit}</span>
                                    </p>
                                </div>

                                {/* Longevity-optimal range card — highlighted in brand color */}
                                <div className="p-3 rounded-lg bg-brand-50 dark:bg-brand-950/40 border border-brand-100 dark:border-brand-900">
                                    <p className="text-[10px] font-mono text-brand-500 dark:text-brand-400 uppercase tracking-wider mb-1">Longevity Optimal</p>
                                    <p className="text-sm font-mono font-medium text-brand-700 dark:text-brand-300">
                                        {fmtRange(b.optimalRange.min, b.optimalRange.max)}
                                        <span className="text-xs text-brand-400 ml-1">{b.unit}</span>
                                    </p>
                                </div>
                            </div>

                            {/* Clinical note — one-sentence AI-generated insight for this biomarker */}
                            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800 pt-3">
                                {b.note}
                            </p>
                        </div>
                    </td>
                </tr>
            )}
        </>
    );
}