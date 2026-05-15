// ─── Tests: useAnalyze hook ───────────────────────────────────────────────────
// Tests the state machine: idle → loading → result | error.
//
// The hook now makes THREE fetch calls per analysis:
//   1. POST /api/upload-url  → get presigned S3 URL
//   2. PUT  {uploadUrl}      → upload directly to S3
//   3. POST /api/analyze     → trigger AI analysis with s3Key
//
// All three are mocked — no real network or S3 calls.

import { renderHook, act, waitFor } from '@testing-library/react';
import { useAnalyze } from '@/app/hooks/useAnalyze';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Minimal valid LabReport for success responses
const mockReport = {
    patient: { age: 48, sex: 'male', bloodType: 'A+' },
    reportDate: '2026-02-23',
    biomarkers: [],
};

// Sets up all three fetch calls for a successful analysis flow:
//   1. /api/upload-url → presigned URL + s3Key
//   2. S3 PUT          → ok
//   3. /api/analyze    → report data
function mockSuccess() {
    mockFetch
        .mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                success: true,
                uploadUrl: 'https://s3.amazonaws.com/bucket/test.pdf?signature=abc',
                s3Key: 'uploads/user/test.pdf',
            }),
        })
        .mockResolvedValueOnce({
            ok: true, // S3 PUT response — no json body needed
        })
        .mockResolvedValueOnce({
            ok: true,
            json: async () => ({ success: true, data: mockReport }),
        });
}

// Sets up the upload-url call to succeed, then the analyze call to return failure
function mockFailure(error = 'Analysis failed.') {
    mockFetch
        .mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                success: true,
                uploadUrl: 'https://s3.amazonaws.com/bucket/test.pdf?signature=abc',
                s3Key: 'uploads/user/test.pdf',
            }),
        })
        .mockResolvedValueOnce({ ok: true }) // S3 PUT
        .mockResolvedValueOnce({
            ok: true,
            json: async () => ({ success: false, error }),
        });
}

// Sets up the upload-url call itself to fail
function mockUploadUrlFailure() {
    mockFetch.mockResolvedValueOnce({
        ok: false,
    });
}

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

        act(() => { result.current.handleFile(makeFile()); });

        expect(result.current.state).toBe('loading');
        expect(result.current.fileName).toBe('report.pdf');
    });

    it('advances the step counter over time during loading', () => {
        mockSuccess();
        const { result } = renderHook(() => useAnalyze());

        act(() => { result.current.handleFile(makeFile()); });
        expect(result.current.step).toBe(0);

        act(() => { jest.advanceTimersByTime(1800); });
        expect(result.current.step).toBe(1);

        act(() => { jest.advanceTimersByTime(1800); });
        expect(result.current.step).toBe(2);
    });

    it('clamps the step at the last step index', () => {
        mockSuccess();
        const { result } = renderHook(() => useAnalyze());

        act(() => { result.current.handleFile(makeFile()); });
        act(() => { jest.advanceTimersByTime(20000); });

        expect(result.current.step).toBe(3);
    });

    // ── Success flow ────────────────────────────────────────────────────────────

    it('transitions to result state with report data on success', async () => {
        mockSuccess();
        const { result } = renderHook(() => useAnalyze());

        act(() => { result.current.handleFile(makeFile()); });

        await waitFor(() => {
            expect(result.current.state).toBe('result');
        });

        expect(result.current.report).toEqual(mockReport);
        expect(result.current.errorMsg).toBe('');
    });

    // ── Error flows ─────────────────────────────────────────────────────────────

    it('transitions to error state when upload-url call fails', async () => {
        mockUploadUrlFailure();
        const { result } = renderHook(() => useAnalyze());

        act(() => { result.current.handleFile(makeFile()); });

        await waitFor(() => {
            expect(result.current.state).toBe('error');
        });

        expect(result.current.errorMsg).toBe('Failed to get upload URL.');
    });

    it('transitions to error state when the analyze API returns success: false', async () => {
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

        act(() => { result.current.handleFile(makeFile()); });
        await waitFor(() => { expect(result.current.state).toBe('result'); });

        act(() => { result.current.reset(); });

        expect(result.current.state).toBe('idle');
        expect(result.current.report).toBeNull();
        expect(result.current.errorMsg).toBe('');
        expect(result.current.fileName).toBe('');
        expect(result.current.step).toBe(0);
    });

    it('can handle a new file after resetting from an error', async () => {
        mockUploadUrlFailure();
        const { result } = renderHook(() => useAnalyze());

        act(() => { result.current.handleFile(makeFile()); });
        await waitFor(() => { expect(result.current.state).toBe('error'); });

        act(() => { result.current.reset(); });
        expect(result.current.state).toBe('idle');

        mockSuccess();
        act(() => { result.current.handleFile(makeFile()); });
        await waitFor(() => { expect(result.current.state).toBe('result'); });
        expect(result.current.report).toEqual(mockReport);
    });

    // ── fetch call order ────────────────────────────────────────────────────────

    it('makes three fetch calls in the correct order', async () => {
        mockSuccess();
        const { result } = renderHook(() => useAnalyze());

        act(() => { result.current.handleFile(makeFile()); });
        await waitFor(() => { expect(result.current.state).toBe('result'); });

        // Call 1: get presigned URL
        expect(mockFetch.mock.calls[0][0]).toBe('/api/upload-url');
        expect(mockFetch.mock.calls[0][1].method).toBe('POST');

        // Call 2: upload to S3 (presigned URL, PUT method)
        expect(mockFetch.mock.calls[1][0]).toContain('s3.amazonaws.com');
        expect(mockFetch.mock.calls[1][1].method).toBe('PUT');

        // Call 3: trigger analysis with s3Key
        expect(mockFetch.mock.calls[2][0]).toBe('/api/analyze');
        expect(mockFetch.mock.calls[2][1].method).toBe('POST');
    });
});