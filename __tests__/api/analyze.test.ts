// ─── Tests: /api/analyze route ───────────────────────────────────────────────
// Tests HTTP-level concerns: input validation (missing file, wrong type, too
// large), and the success path. The Claude service is mocked so no real API
// calls are made.

import { POST } from '@/app/api/analyze/route';
import { NextRequest } from 'next/server';
import * as claudeService from '@/lib/claude';

// Mock the entire Claude service module
jest.mock('@/lib/claude');
const mockAnalyze = claudeService.analyzeLabReport as jest.Mock;

// Minimal valid LabReport returned by the mocked service
const mockReport = {
    patient: { age: 48, sex: 'male' },
    reportDate: '2026-02-23',
    biomarkers: [],
};

// Helper — builds a NextRequest with a multipart form body
async function buildRequest(file?: File): Promise<NextRequest> {
    const formData = new FormData();
    if (file) formData.append('pdf', file);
    return new NextRequest('http://localhost:3000/api/analyze', {
        method: 'POST',
        body: formData,
    });
}

// Helper — creates a File with given size and type
function makeFile(name: string, sizeBytes: number, type: string): File {
    const content = new Uint8Array(sizeBytes);
    return new File([content], name, { type });
}

const validPDF = makeFile('report.pdf', 1024, 'application/pdf');
const largePDF = makeFile('large.pdf', 11 * 1024 * 1024, 'application/pdf');
const imageFile = makeFile('photo.png', 1024, 'image/png');

describe('POST /api/analyze', () => {
    beforeEach(() => jest.clearAllMocks());

    // ── Input validation ────────────────────────────────────────────────────────

    it('returns 400 when no file is attached', async () => {
        const req = await buildRequest(); // no file appended
        const res = await POST(req);
        const json = await res.json();

        expect(res.status).toBe(400);
        expect(json.success).toBe(false);
        expect(json.error).toBe('No PDF file provided.');
    });

    it('returns 400 when a non-PDF file is uploaded', async () => {
        const req = await buildRequest(imageFile);
        const res = await POST(req);
        const json = await res.json();

        expect(res.status).toBe(400);
        expect(json.success).toBe(false);
        expect(json.error).toBe('File must be a PDF.');
    });

    it('returns 400 when the PDF exceeds 10MB', async () => {
        const req = await buildRequest(largePDF);
        const res = await POST(req);
        const json = await res.json();

        expect(res.status).toBe(400);
        expect(json.success).toBe(false);
        expect(json.error).toBe('File size must be under 10MB.');
    });

    // ── Success path ────────────────────────────────────────────────────────────

    it('returns 200 with report data on success', async () => {
        mockAnalyze.mockResolvedValueOnce(mockReport);

        const req = await buildRequest(validPDF);
        const res = await POST(req);
        const json = await res.json();

        expect(res.status).toBe(200);
        expect(json.success).toBe(true);
        expect(json.data).toEqual(mockReport);
    });

    it('calls analyzeLabReport with a base64 string', async () => {
        mockAnalyze.mockResolvedValueOnce(mockReport);

        const req = await buildRequest(validPDF);
        await POST(req);

        // analyzeLabReport should be called once with a non-empty base64 string
        expect(mockAnalyze).toHaveBeenCalledTimes(1);
        const base64Arg = mockAnalyze.mock.calls[0][0];
        expect(typeof base64Arg).toBe('string');
        expect(base64Arg.length).toBeGreaterThan(0);
    });

    // ── Error handling ──────────────────────────────────────────────────────────

    it('returns 503 when the Claude service throws a 529 error', async () => {
        const overloadedError = Object.assign(new Error('Overloaded'), { status: 529 });
        mockAnalyze.mockRejectedValueOnce(overloadedError);

        const req = await buildRequest(validPDF);
        const res = await POST(req);
        const json = await res.json();

        expect(res.status).toBe(503);
        expect(json.success).toBe(false);
        expect(json.error).toMatch(/overloaded/i);
    });

    it('returns 500 with a parse error message on SyntaxError', async () => {
        mockAnalyze.mockRejectedValueOnce(new SyntaxError('Unexpected token'));

        const req = await buildRequest(validPDF);
        const res = await POST(req);
        const json = await res.json();

        expect(res.status).toBe(500);
        expect(json.success).toBe(false);
        expect(json.error).toBe('Failed to parse AI response as JSON.');
    });

    it('returns 500 with a generic message on unexpected errors', async () => {
        mockAnalyze.mockRejectedValueOnce(new Error('Something unexpected'));

        const req = await buildRequest(validPDF);
        const res = await POST(req);
        const json = await res.json();

        expect(res.status).toBe(500);
        expect(json.success).toBe(false);
        expect(json.error).toBe('An unexpected error occurred.');
    });
});