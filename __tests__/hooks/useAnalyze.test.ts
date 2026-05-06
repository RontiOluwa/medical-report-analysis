// ─── Tests: useAnalyze hook ───────────────────────────────────────────────────
// Tests the state machine: idle → loading → result | error and the reset flow.
//
// Key fix: React 19 is stricter about state updates outside act().
// We use waitFor() instead of wrapping handleFile in act() — waitFor internally
// wraps each check in act(), which correctly handles async state flushes after
// fetch resolves.

import { renderHook, act, waitFor } from '@testing-library/react';
import { useAnalyze } from '@/app/hooks/useAnalyze';

// Mock global fetch so no real HTTP requests are made
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Minimal valid LabReport for success responses
const mockReport = {
    patient: { age: 48, sex: 'male', bloodType: 'A+' },
    reportDate: '2026-02-23',
    biomarkers: [],
};

// Sets up fetch to return a successful analysis response
function mockSuccess() {
    mockFetch.mockResolvedValueOnce({
        json: async () => ({ success: true, data: mockReport }),
    });
}

// Sets up fetch to return an API-level failure response
function mockFailure(error = 'Analysis failed.') {
    mockFetch.mockResolvedValueOnce({
        json: async () => ({ success: false, error }),
    });
}

// Creates a minimal File for upload simulation
function makeFile() {
    return new File(['pdf content'], 'report.pdf', { type: 'application/pdf' });
}

describe('useAnalyze', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    // ── Initial state ───────────────────────────────────────────────────────────

    it('starts in idle state with null report and empty strings', () => {
        const { result } = renderHook(() => useAnalyze());
        expect(result.current.state).toBe('idle');
        expect(result.current.report).toBeNull();
        expect(result.current.errorMsg).toBe('');
        expect(result.current.fileName).toBe('');
        expect(result.current.step).toBe(0);
    });

    // ── Loading state ───────────────────────────────────────────────────────────

    it('transitions to loading immediately when handleFile is called', () => {
        mockSuccess();
        const { result } = renderHook(() => useAnalyze());

        // Kick off the async handleFile — don't await so we can check the loading state
        act(() => { result.current.handleFile(makeFile()); });

        expect(result.current.state).toBe('loading');
        expect(result.current.fileName).toBe('report.pdf');
    });

    it('advances the step counter over time during loading', () => {
        mockSuccess();
        const { result } = renderHook(() => useAnalyze());

        act(() => { result.current.handleFile(makeFile()); });
        expect(result.current.step).toBe(0);

        // Each 1800ms interval advances the step by 1
        act(() => { jest.advanceTimersByTime(1800); });
        expect(result.current.step).toBe(1);

        act(() => { jest.advanceTimersByTime(1800); });
        expect(result.current.step).toBe(2);
    });

    it('clamps the step at the last step index', () => {
        mockSuccess();
        const { result } = renderHook(() => useAnalyze());

        act(() => { result.current.handleFile(makeFile()); });
        // Advance well past all steps
        act(() => { jest.advanceTimersByTime(20000); });

        // Should be clamped at index 3 (LOADING_STEPS.length - 1)
        expect(result.current.step).toBe(3);
    });

    // ── Success flow ────────────────────────────────────────────────────────────

    it('transitions to result state with report data on success', async () => {
        mockSuccess();
        const { result } = renderHook(() => useAnalyze());

        act(() => { result.current.handleFile(makeFile()); });

        // waitFor polls until the assertion passes, wrapping each check in act()
        // This correctly handles the async state updates after fetch resolves
        await waitFor(() => {
            expect(result.current.state).toBe('result');
        });

        expect(result.current.report).toEqual(mockReport);
        expect(result.current.errorMsg).toBe('');
    });

    // ── Error flow ──────────────────────────────────────────────────────────────

    it('transitions to error state when the API returns success: false', async () => {
        mockFailure('The AI service is temporarily overloaded.');
        const { result } = renderHook(() => useAnalyze());

        act(() => { result.current.handleFile(makeFile()); });

        await waitFor(() => {
            expect(result.current.state).toBe('error');
        });

        expect(result.current.errorMsg).toBe('The AI service is temporarily overloaded.');
        expect(result.current.report).toBeNull();
    });

    it('transitions to error state when fetch throws a network error', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Network error'));
        const { result } = renderHook(() => useAnalyze());

        act(() => { result.current.handleFile(makeFile()); });

        await waitFor(() => {
            expect(result.current.state).toBe('error');
        });

        expect(result.current.errorMsg).toBe('Network error');
    });

    // ── Reset ───────────────────────────────────────────────────────────────────

    it('resets all state back to idle when reset is called', async () => {
        mockSuccess();
        const { result } = renderHook(() => useAnalyze());

        // Reach result state first
        act(() => { result.current.handleFile(makeFile()); });
        await waitFor(() => { expect(result.current.state).toBe('result'); });

        // Now reset
        act(() => { result.current.reset(); });

        expect(result.current.state).toBe('idle');
        expect(result.current.report).toBeNull();
        expect(result.current.errorMsg).toBe('');
        expect(result.current.fileName).toBe('');
        expect(result.current.step).toBe(0);
    });

    it('can handle a new file after resetting from an error', async () => {
        // First attempt fails
        mockFailure();
        const { result } = renderHook(() => useAnalyze());
        act(() => { result.current.handleFile(makeFile()); });
        await waitFor(() => { expect(result.current.state).toBe('error'); });

        // Reset back to idle
        act(() => { result.current.reset(); });
        expect(result.current.state).toBe('idle');

        // Second attempt succeeds
        mockSuccess();
        act(() => { result.current.handleFile(makeFile()); });
        await waitFor(() => { expect(result.current.state).toBe('result'); });
        expect(result.current.report).toEqual(mockReport);
    });

    // ── fetch call ──────────────────────────────────────────────────────────────

    it('POSTs to /api/analyze with the file as FormData', async () => {
        mockSuccess();
        const { result } = renderHook(() => useAnalyze());

        act(() => { result.current.handleFile(makeFile()); });
        await waitFor(() => { expect(result.current.state).toBe('result'); });

        expect(mockFetch).toHaveBeenCalledWith('/api/analyze', expect.objectContaining({
            method: 'POST',
            body: expect.any(FormData),
        }));
    });
});