// ─── RangeBar Component ───────────────────────────────────────────────────────
// Renders a horizontal bar visualization showing where a biomarker value sits
// relative to both the lab reference range and the longevity-optimal range.
//
// Visual layers (back to front):
//   1. Grey bar  — lab reference range
//   2. Green bar — longevity-optimal range (overlaid on the grey bar)
//   3. Dot       — the patient's actual value, color-coded by status

'use client';

import { Biomarker } from '@/lib/types';

export default function RangeBar({ b }: { b: Biomarker }) {
    const { value, referenceRange, optimalRange } = b;

    // Use whichever range is available to determine the visible axis bounds.
    const min = referenceRange.min ?? optimalRange.min;
    const max = referenceRange.max ?? optimalRange.max;

    // If neither bound is defined, there's nothing to draw — return nothing.
    if (min === null && max === null) return null;

    // ── Axis calculation ──────────────────────────────────────────────────────
    // Extend the axis 30% beyond the reference range on each side so the dot
    // remains visible even when the value is significantly out of range.
    const lo = min ?? value * 0.5;        // left edge of the reference range
    const hi = max ?? value * 1.5;        // right edge of the reference range
    const span = hi - lo || 1;            // total width of the reference range (avoid div/0)
    const padding = span * 0.3;           // 30% padding on each side of the axis
    const viewLo = lo - padding;          // leftmost visible point on the axis
    const viewSpan = (hi + padding) - viewLo; // total axis width in data units

    // Converts a data value to a percentage position along the axis (0–100%).
    const pct = (v: number) =>
        `${Math.max(0, Math.min(100, ((v - viewLo) / viewSpan) * 100)).toFixed(1)}%`;

    // ── Reference range bar dimensions ───────────────────────────────────────
    const refLeft = pct(lo);                                                       // left edge of grey bar
    const refWidth = `${Math.max(0, Math.min(100, ((hi - lo) / viewSpan) * 100)).toFixed(1)}%`; // width of grey bar

    // ── Optimal range bar dimensions ─────────────────────────────────────────
    // Fall back to the reference range bounds if optimal bounds are not defined.
    const optL = optimalRange.min !== null ? optimalRange.min : lo;
    const optR = optimalRange.max !== null ? optimalRange.max : hi;
    const optLeft = pct(optL);                                                      // left edge of green bar
    const optWidth = `${Math.max(0, Math.min(100, ((optR - optL) / viewSpan) * 100)).toFixed(1)}%`; // width of green bar

    // ── Value dot position ────────────────────────────────────────────────────
    const dotPos = pct(value); // horizontal position of the patient's value dot

    // Dot color reflects the combined classification:
    // red = out of lab range, green = optimal, blue = normal but not optimal
    const dotColor =
        b.status === 'out_of_range'
            ? 'bg-red-500 dark:bg-red-400 shadow-red-500/40'
            : b.optimalStatus === 'optimal'
                ? 'bg-brand-500 dark:bg-brand-400 shadow-brand-500/40'
                : 'bg-blue-500 dark:bg-blue-400 shadow-blue-500/40';

    return (
        // Track — full-width grey base that all bars are positioned relative to
        <div className="relative h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-visible mt-3">

            {/* Lab reference range bar — grey, represents the printed lab normal range */}
            <div
                className="absolute h-full bg-slate-200 dark:bg-slate-700 rounded-full"
                style={{ left: refLeft, width: refWidth }}
            />

            {/* Longevity-optimal range bar — brand color, overlaid on the grey bar */}
            <div
                className="absolute h-full bg-brand-200 dark:bg-brand-900 rounded-full opacity-80"
                style={{ left: optLeft, width: optWidth }}
            />

            {/* Value dot — represents the patient's actual result, color-coded by status */}
            <div
                className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 shadow-md z-10 ${dotColor}`}
                style={{ left: dotPos }}
            />
        </div>
    );
}