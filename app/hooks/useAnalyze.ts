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
        setState('loading');
        setFileName(file.name);
        setStep(0);

        const stepInterval = setInterval(() => {
            setStep(s => Math.min(s + 1, LOADING_STEPS.length - 1));
        }, 1800);

        try {
            // ── Step 1: Get a presigned upload URL from Lambda ──────────────────────
            const urlRes = await fetch('/api/upload-url', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });

            if (!urlRes.ok) throw new Error('Failed to get upload URL.');
            const { uploadUrl, s3Key } = await urlRes.json();

            // ── Step 2: Upload PDF directly to S3 ──────────────────────────────────
            // This request goes directly from the browser to S3 — Lambda is not involved.
            // No file size limit. Large PDFs upload without any issues.
            const uploadRes = await fetch(uploadUrl, {
                method: 'PUT',
                body: file,
                headers: { 'Content-Type': 'application/pdf' },
            });

            if (!uploadRes.ok) throw new Error('Failed to upload PDF to storage.');

            // ── Step 3: Trigger AI analysis with the S3 key ─────────────────────────
            const res = await fetch('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ s3Key }),
            });

            const json = await res.json();
            clearInterval(stepInterval);

            if (!json.success) throw new Error(json.error || 'Analysis failed.');
            setReport(json.data);
            setState('result');

        } catch (err) {
            clearInterval(stepInterval);
            setErrorMsg(err instanceof Error ? err.message : 'Something went wrong.');
            setState('error');
        }
    }, []);

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