// ─── /api/analyze Route Handler ──────────────────────────────────────────────
// POST endpoint responsible solely for HTTP concerns:
//   1. Parse and validate the incoming multipart form data
//   2. Encode the PDF as base64
//   3. Delegate to the Claude analysis service
//   4. Format and return the HTTP response
//
// All Claude API logic (model call, retry, parsing) lives in lib/claude.ts.

import { NextRequest, NextResponse } from 'next/server';
import { analyzeLabReport } from '@/lib/claude';
import { AnalyzeResponse } from '@/lib/types';

// Extend the default Next.js function timeout to 120s to accommodate
// Claude inference time plus up to 3 retry delays (max ~14s of wait).
export const maxDuration = 120;

export async function POST(req: NextRequest): Promise<NextResponse<AnalyzeResponse>> {
    try {
        // ── Input validation ────────────────────────────────────────────────────

        // Parse the incoming multipart form data from the client upload.
        const formData = await req.formData();

        // Extract the PDF file field — returns null if the field is missing.
        const file = formData.get('pdf') as File | null;

        // Reject requests with no file attached.
        if (!file) {
            return NextResponse.json({ success: false, error: 'No PDF file provided.' }, { status: 400 });
        }

        // Reject non-PDF files — Claude's document input only supports PDF.
        if (file.type !== 'application/pdf') {
            return NextResponse.json({ success: false, error: 'File must be a PDF.' }, { status: 400 });
        }

        // Reject files over 10MB to prevent excessive base64 payload sizes.
        if (file.size > 10 * 1024 * 1024) {
            return NextResponse.json({ success: false, error: 'File size must be under 10MB.' }, { status: 400 });
        }

        // ── PDF encoding ────────────────────────────────────────────────────────

        // Read the file into a binary buffer then encode as base64.
        // This format is required by the Anthropic document input API.
        const arrayBuffer = await file.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');

        // ── Analysis ────────────────────────────────────────────────────────────

        // Delegate to the Claude service — handles the API call, retry logic,
        // response parsing, and JSON sanitization.
        const data = await analyzeLabReport(base64);

        // Return the structured LabReport to the client.
        return NextResponse.json({ success: true, data });

    } catch (err) {
        // ── Error handling ──────────────────────────────────────────────────────
        console.error('[analyze] error:', err);

        // 529 Overloaded — all retries in the Claude service were exhausted.
        if (typeof err === 'object' && err !== null && 'status' in err && (err as { status: number }).status === 529) {
            return NextResponse.json(
                { success: false, error: 'The AI service is temporarily overloaded. Please try again in a moment.' },
                { status: 503 }
            );
        }

        // SyntaxError — Claude returned a response that couldn't be parsed as JSON.
        if (err instanceof SyntaxError) {
            return NextResponse.json(
                { success: false, error: 'Failed to parse AI response as JSON.' },
                { status: 500 }
            );
        }

        // Catch-all for any other unexpected errors.
        return NextResponse.json({ success: false, error: 'An unexpected error occurred.' }, { status: 500 });
    }
}