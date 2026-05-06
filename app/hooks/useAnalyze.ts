// ─── useAnalyze Hook ─────────────────────────────────────────────────────────
// Custom React hook that encapsulates all state and logic for the PDF analysis flow.
// Extracted from page.tsx to keep the component focused on rendering only.
//
// Manages:
//   - App state machine: idle → loading → result | error
//   - File upload and API call to /api/analyze
//   - Animated loading step progression
//   - Reset back to idle state

'use client';

import { useState, useCallback } from 'react';
import { LabReport } from '@/lib/types';

// Union type representing each stage of the analysis lifecycle.
// The UI renders a different view for each state.
export type AppState = 'idle' | 'loading' | 'result' | 'error';

// Sequential step labels shown during loading to give the user
// a sense of progress while waiting for the Claude API response.
export const LOADING_STEPS = [
    'Reading lab report...',
    'Extracting biomarkers...',
    'Standardizing units...',
    'Applying longevity benchmarks...',
];

export function useAnalyze() {
    // Current stage of the analysis flow.
    const [state, setState] = useState<AppState>('idle');

    // The parsed LabReport returned by the API on success. Null until analysis completes.
    const [report, setReport] = useState<LabReport | null>(null);

    // Human-readable error message shown to the user on failure.
    const [errorMsg, setErrorMsg] = useState('');

    // Name of the uploaded file, shown in the loading state for user confirmation.
    const [fileName, setFileName] = useState('');

    // Index of the currently active loading step (0–3), advanced on a timer.
    const [step, setStep] = useState(0);

    // ── handleFile ─────────────────────────────────────────────────────────────
    // Called when the user selects or drops a PDF file.
    // Transitions to loading, kicks off the step timer, POSTs to /api/analyze,
    // then transitions to result or error based on the response.
    const handleFile = useCallback(async (file: File) => {
        // Transition to loading state and store the file name for display.
        setState('loading');
        setFileName(file.name);
        setStep(0);

        // Advance the loading step indicator every 1.8s to give the appearance
        // of progress while the API call runs in the background.
        const stepInterval = setInterval(() => {
            setStep(s => Math.min(s + 1, LOADING_STEPS.length - 1)); // clamp at last step
        }, 1800);

        try {
            // Wrap the file in FormData so it can be sent as a multipart upload.
            const formData = new FormData();
            formData.append('pdf', file);

            // POST the PDF to the server-side analysis route.
            const res = await fetch('/api/analyze', { method: 'POST', body: formData });

            // Parse the JSON response body.
            const json = await res.json();

            // Stop the step timer now that the response has arrived.
            clearInterval(stepInterval);

            // If the API returned a failure flag, throw to enter the catch block.
            if (!json.success) throw new Error(json.error || 'Analysis failed.');

            // Store the report and move to the result state.
            setReport(json.data);
            setState('result');

        } catch (err) {
            // Stop the step timer on error so it doesn't keep running in the background.
            clearInterval(stepInterval);

            // Extract a readable message from the error and transition to error state.
            setErrorMsg(err instanceof Error ? err.message : 'Something went wrong.');
            setState('error');
        }
    }, []); // no dependencies — this function never needs to be recreated

    // ── reset ──────────────────────────────────────────────────────────────────
    // Resets all state back to idle so the user can upload a new report.
    const reset = useCallback(() => {
        setState('idle');
        setReport(null);
        setErrorMsg('');
        setFileName('');
        setStep(0);
    }, []);

    // Expose all state values and actions needed by the consuming component.
    return { state, report, errorMsg, fileName, step, handleFile, reset };
}