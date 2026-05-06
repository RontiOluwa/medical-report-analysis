// ─── Tests: useAnalyze hook ───────────────────────────────────────────────────
// Tests the state machine: idle → loading → result | error
// and the reset flow back to idle.
// The fetch API is mocked so no real HTTP requests are made.

import { renderHook, act, waitFor } from '@testing-library/react';
import { useAnalyze } from '@/app/hooks/useAnalyze';

// ── Mock fetch ────────────────────────────────────────────────────────────────
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Minimal valid LabReport for success responses
const mockReport = {
    patient: { age: 48, sex: 'male', bloodType: 'A+' },
    reportDate: '2026-02-23',
    biomarkers: [],
};

// Helper — sets up fetch to return a success response
function mockSuccess() {
    mockFetch.mockResolvedValueOnce({
        json: async () => ({ success: true, data: mockReport }),
    });
}

// Helper — sets up fetch to return an error response
function mockFailure(error = 'Analysis failed.') {
    mockFetch.mockResolvedValueOnce({
        json: async () => ({ success: false, error }),
    });
}

// Helper — creates a minimal File object for upload simulation
function makeFile() {
    return new File(['pdf content'], 'report.pdf', { type: 'application/pdf' });
}

describe('useAnalyze', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers(); // control the step interval timer
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

    it('transitions to loading state immediately when handleFile is called', async () => {
        mockSuccess();
        const { result } = renderHook(() => useAnalyze());

        act(() => {
            result.current.handleFile(makeFile());
        });

        // Should be in loading state before the fetch resolves
        expect(result.current.state).toBe('loading');
        expect(result.current.fileName).toBe('report.pdf');
    });

    it('advances the step counter over time during loading', async () => {
        mockSuccess();
        const { result } = renderHook(() => useAnalyze());

        act(() => { result.current.handleFile(makeFile()); });
        expect(result.current.step).toBe(0);

        // Advance 1.8s — the step interval fires once
        act(() => { jest.advanceTimersByTime(1800); });
        expect(result.current.step).toBe(1);

        // Advance another 1.8s — step advances again
        act(() => { jest.advanceTimersByTime(1800); });
        expect(result.current.step).toBe(2);
    });

    it('clamps the step at the last step index', async () => {
        mockSuccess();
        const { result } = renderHook(() => useAnalyze());

        act(() => { result.current.handleFile(makeFile()); });

        // Advance well past the number of steps
        act(() => { jest.advanceTimersByTime(20000); });

        // Step should not exceed LOADING_STEPS.length - 1 (index 3)
        expect(result.current.step).toBe(3);
    });

    // ── Success flow ────────────────────────────────────────────────────────────

    it('transitions to result state with report data on success', async () => {
        mockSuccess();
        const { result } = renderHook(() => useAnalyze());

        await act(async () => {
            await result.current.handleFile(makeFile());
        });

        expect(result.current.state).toBe('result');
        expect(result.current.report).toEqual(mockReport);
        expect(result.current.errorMsg).toBe('');
    });

    // ── Error flow ──────────────────────────────────────────────────────────────

    it('transitions to error state when the API returns success: false', async () => {
        mockFailure('The AI service is temporarily overloaded.');
        const { result } = renderHook(() => useAnalyze());

        await act(async () => {
            await result.current.handleFile(makeFile());
        });

        expect(result.current.state).toBe('error');
        expect(result.current.errorMsg).toBe('The AI service is temporarily overloaded.');
        expect(result.current.report).toBeNull();
    });

    it('transitions to error state when fetch throws a network error', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Network error'));
        const { result } = renderHook(() => useAnalyze());

        await act(async () => {
            await result.current.handleFile(makeFile());
        });

        expect(result.current.state).toBe('error');
        expect(result.current.errorMsg).toBe('Network error');
    });

    // ── Reset ───────────────────────────────────────────────────────────────────

    it('resets all state back to idle when reset is called', async () => {
        mockSuccess();
        const { result } = renderHook(() => useAnalyze());

        // Get to result state
        await act(async () => {
            await result.current.handleFile(makeFile());
        });
        expect(result.current.state).toBe('result');

        // Reset
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
        await act(async () => { await result.current.handleFile(makeFile()); });
        expect(result.current.state).toBe('error');

        // Reset
        act(() => { result.current.reset(); });
        expect(result.current.state).toBe('idle');

        // Second attempt succeeds
        mockSuccess();
        await act(async () => { await result.current.handleFile(makeFile()); });
        expect(result.current.state).toBe('result');
        expect(result.current.report).toEqual(mockReport);
    });

    // ── fetch call ──────────────────────────────────────────────────────────────

    it('POSTs to /api/analyze with the file as FormData', async () => {
        mockSuccess();
        const { result } = renderHook(() => useAnalyze());
        const file = makeFile();

        await act(async () => { await result.current.handleFile(file); });

        expect(mockFetch).toHaveBeenCalledWith('/api/analyze', expect.objectContaining({
            method: 'POST',
            body: expect.any(FormData),
        }));
    });
});