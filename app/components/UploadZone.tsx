// ─── UploadZone Component ─────────────────────────────────────────────────────
// Renders a drag-and-drop PDF upload area with a file browser fallback.
// Validates the file type (PDF only) and size (10MB max) before passing
// the file up to the parent via the onFile callback.

'use client';

import { useCallback, useState } from 'react';

interface Props {
    onFile: (file: File) => void; // called with the validated file when the user uploads
    loading: boolean;             // disables interaction while an analysis is in progress
}

export default function UploadZone({ onFile, loading }: Props) {
    // Tracks whether the user is currently dragging a file over the drop zone.
    const [dragging, setDragging] = useState(false);

    // Validation error message shown below the drop zone on invalid file selection.
    const [error, setError] = useState<string | null>(null);

    // Validates the selected file and calls onFile if it passes.
    // Returns an error string if invalid, null if valid.
    const validate = (file: File): string | null => {
        if (file.type !== 'application/pdf') return 'Only PDF files are supported.';
        if (file.size > 10 * 1024 * 1024) return 'File must be under 10MB.';
        return null;
    };

    // Shared handler for both drag-drop and browse-click file selections.
    // Wrapped in useCallback so it's stable across renders (safe to pass as a prop).
    const handle = useCallback((file: File) => {
        const err = validate(file);
        if (err) { setError(err); return; } // show error and bail out without calling onFile
        setError(null);                      // clear any previous error
        onFile(file);                        // pass the valid file to the parent component
    }, [onFile]);

    return (
        <div className="w-full max-w-lg mx-auto">
            {/* Drop zone label — wraps a hidden <input> so clicking anywhere triggers file browse */}
            <label
                // Set dragging flag when a file enters the zone
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                // Clear dragging flag when the file leaves the zone
                onDragLeave={() => setDragging(false)}
                // Handle the file drop — extract the first file from the dataTransfer list
                onDrop={(e) => {
                    e.preventDefault();
                    setDragging(false);
                    const file = e.dataTransfer.files[0];
                    if (file) handle(file);
                }}
                className={`flex flex-col items-center justify-center gap-5 p-10 rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-200
          ${dragging
                        ? 'border-brand-500 bg-brand-50 dark:border-brand-400 dark:bg-brand-950/40'   // active drag highlight
                        : 'border-slate-300 bg-white hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600 dark:hover:bg-slate-800/50' // idle state
                    } ${loading ? 'pointer-events-none opacity-60' : ''}`} // disabled during loading
            >
                {/* Hidden file input — activated when the label is clicked */}
                <input
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    disabled={loading}
                    onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handle(file);
                        e.target.value = ''; // reset so the same file can be re-uploaded if needed
                    }}
                />

                {/* Icon container — color shifts when dragging */}
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors
          ${dragging ? 'bg-brand-100 dark:bg-brand-900' : 'bg-slate-100 dark:bg-slate-800'}`}>
                    {/* Upload / document icon */}
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
                        className={`transition-colors ${dragging ? 'stroke-brand-600 dark:stroke-brand-400' : 'stroke-slate-400 dark:stroke-slate-500'}`}
                        strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="12" y1="18" x2="12" y2="12" />
                        <line x1="9" y1="15" x2="15" y2="15" />
                    </svg>
                </div>

                {/* Instruction text */}
                <div className="text-center">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">
                        Drop your lab report here
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                        PDF only · up to 10MB · any language
                    </p>
                </div>

                {/* Browse files button — clicking the label opens the hidden file input */}
                <span className="text-xs font-medium px-4 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors">
                    Browse files
                </span>
            </label>

            {/* Validation error message shown below the zone */}
            {error && (
                <p className="mt-3 text-center text-xs font-mono text-red-500 dark:text-red-400">
                    {error}
                </p>
            )}
        </div>
    );
}