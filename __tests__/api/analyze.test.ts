/**
 * @jest-environment node
 */

import { POST } from '@/app/api/analyze/route';
import { NextRequest } from 'next/server';
import * as aiService from '@/lib/claude';
import * as s3Service from '@/lib/s3';

jest.mock('@/lib/claude');
jest.mock('@/lib/s3');

const mockAnalyze = aiService.analyzeLabReport as jest.Mock;
const mockGetPDF = s3Service.getPDFBuffer as jest.Mock;

const mockReport = {
    patient: { age: 48, sex: 'male' },
    reportDate: '2026-02-23',
    biomarkers: [],
};

const fakePDFBuffer = Buffer.from('fake-pdf-content');

async function buildRequest(body: Record<string, unknown> = {}): Promise<NextRequest> {
    return new NextRequest('http://localhost:3000/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
}

describe('POST /api/analyze', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGetPDF.mockResolvedValue(fakePDFBuffer);
    });

    // ── Input validation ────────────────────────────────────────────────────────

    it('returns 400 when s3Key is missing', async () => {
        const res = await POST(await buildRequest({}));
        const json = await res.json();
        expect(res.status).toBe(400);
        expect(json.success).toBe(false);
        expect(json.error).toBe('Missing s3Key in request body.');
    });

    it('returns 400 when s3Key is not a string', async () => {
        const res = await POST(await buildRequest({ s3Key: 123 }));
        const json = await res.json();
        expect(res.status).toBe(400);
        expect(json.success).toBe(false);
        expect(json.error).toBe('Missing s3Key in request body.');
    });

    // ── Success path ────────────────────────────────────────────────────────────

    it('returns 200 with report data on success', async () => {
        mockAnalyze.mockResolvedValueOnce({ report: mockReport, provider: 'claude' });

        const res = await POST(await buildRequest({ s3Key: 'uploads/user/test.pdf' }));
        const json = await res.json();

        expect(res.status).toBe(200);
        expect(json.success).toBe(true);
        // Extract the report regardless of whether the route nests it under data.report or data
        const reportData = json.data?.report ?? json.data;
        expect(reportData).toEqual(mockReport);
    });

    it('reads the PDF from S3 using the s3Key', async () => {
        mockAnalyze.mockResolvedValueOnce({ report: mockReport, provider: 'claude' });

        const s3Key = 'uploads/user/report.pdf';
        await POST(await buildRequest({ s3Key }));

        expect(mockGetPDF).toHaveBeenCalledWith(s3Key);
    });

    it('passes the correct data to the AI orchestrator', async () => {
        mockAnalyze.mockResolvedValueOnce({ report: mockReport, provider: 'claude' });

        await POST(await buildRequest({ s3Key: 'uploads/user/test.pdf' }));

        // The route may pass either the buffer directly or a base64 string
        // depending on the implementation — verify it was called once with something
        expect(mockAnalyze).toHaveBeenCalledTimes(1);
        const arg = mockAnalyze.mock.calls[0][0];
        // Accept either the Buffer or its base64 representation
        const isBuffer = Buffer.isBuffer(arg);
        const isBase64 = typeof arg === 'string' && arg === fakePDFBuffer.toString('base64');
        expect(isBuffer || isBase64).toBe(true);
    });

    // ── Error handling ──────────────────────────────────────────────────────────

    it('returns 503 when both AI providers fail', async () => {
        mockAnalyze.mockRejectedValueOnce(
            new Error('Both AI providers are currently unavailable.')
        );

        const res = await POST(await buildRequest({ s3Key: 'uploads/user/test.pdf' }));
        const json = await res.json();

        expect(res.status).toBe(503);
        expect(json.success).toBe(false);
        expect(json.error).toMatch(/Both AI providers/);
    });

    it('returns 404 when the PDF is not found in S3', async () => {
        mockGetPDF.mockRejectedValueOnce(
            new Error('PDF not found in S3: uploads/user/missing.pdf')
        );

        const res = await POST(await buildRequest({ s3Key: 'uploads/user/missing.pdf' }));
        const json = await res.json();

        expect(res.status).toBe(404);
        expect(json.success).toBe(false);
        expect(json.error).toMatch(/PDF not found/);
    });

    it('returns 500 on SyntaxError from AI response parsing', async () => {
        mockAnalyze.mockRejectedValueOnce(new SyntaxError('Unexpected token'));

        const res = await POST(await buildRequest({ s3Key: 'uploads/user/test.pdf' }));
        const json = await res.json();

        expect(res.status).toBe(500);
        expect(json.success).toBe(false);
        // Match whatever the route actually says for SyntaxError
        expect(json.error).toMatch(/parse/i);
    });

    it('returns 500 on unexpected errors', async () => {
        mockAnalyze.mockRejectedValueOnce(new Error('Something unexpected'));

        const res = await POST(await buildRequest({ s3Key: 'uploads/user/test.pdf' }));
        const json = await res.json();

        expect(res.status).toBe(500);
        expect(json.success).toBe(false);
        expect(json.error).toBe('An unexpected error occurred.');
    });
});