// ─── StatusBadge Component ───────────────────────────────────────────────────
// Renders a small pill badge indicating a biomarker's classification status.
// Used in both the table rows and the sidebar summary counts.
// Supports three states: optimal (green), normal (blue), out_of_range (red).

'use client';

import { BiomarkerStatus } from '@/lib/types';

interface Props {
    status: BiomarkerStatus; // which classification state to display
    small?: boolean;         // renders a smaller variant for use inside table rows
}

// Maps each status to its Tailwind color classes for light and dark mode.
// Defined outside the component to avoid re-creating the object on every render.
const config: Record<BiomarkerStatus, { label: string; classes: string; dot: string }> = {
    optimal: {
        label: 'Optimal',
        // Green palette: soft green background, dark green text, subtle green border
        classes: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-900',
        dot: 'bg-green-500 dark:bg-green-400', // filled dot matching the text color
    },
    normal: {
        label: 'Normal',
        // Blue palette: soft blue background, dark blue text, subtle blue border
        classes: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-900',
        dot: 'bg-blue-500 dark:bg-blue-400',
    },
    out_of_range: {
        label: 'Out of Range',
        // Red palette: soft red background, dark red text, subtle red border
        classes: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-900',
        dot: 'bg-red-500 dark:bg-red-400',
    },
};

export default function StatusBadge({ status, small = false }: Props) {

    // Look up the display label and color classes for the given status.
    const c = config[status];

    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full border font-mono font-medium whitespace-nowrap ${small ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1'} ${c.classes}`}>
            <span className={`rounded-full flex-shrink-0 ${small ? 'w-1 h-1' : 'w-1.5 h-1.5'} ${c.dot}`} />
            {c.label}
        </span>
    );
}