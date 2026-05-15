// ─── /api/analyze Route Handler ──────────────────────────────────────────────
// Receives the S3 key from the browser after the PDF has been uploaded to S3.
// Reads the PDF from S3 and delegates to the AI orchestrator.

import { NextRequest, NextResponse } from 'next/server';
import { getPDFBuffer } from '@/lib/s3';
import { analyzeLabReport } from '@/lib/claude';
import { AnalyzeResponse } from '@/lib/types';

interface AnalyzeResponseExtended extends AnalyzeResponse {
    provider?: 'claude' | 'openai';
}

export const maxDuration = 120;

export async function POST(req: NextRequest): Promise<NextResponse<AnalyzeResponseExtended>> {
    try {
        // Parse JSON body — browser sends { s3Key: "uploads/user/..." }
        const body = await req.json();
        const { s3Key } = body;

        if (!s3Key || typeof s3Key !== 'string') {
            return NextResponse.json(
                { success: false, error: 'Missing s3Key in request body.' },
                { status: 400 }
            );
        }

        // Read the PDF from S3 as a Buffer
        const pdfBuffer = await getPDFBuffer(s3Key);
        const base64 = pdfBuffer.toString('base64');

        // Run the AI analysis pipeline
        const data = await analyzeLabReport(base64);

        return NextResponse.json({ success: true, data });

    } catch (err) {
        console.error('[analyze] error:', err);

        if (err instanceof Error && err.message.includes('Both AI providers')) {
            return NextResponse.json({ success: false, error: err.message }, { status: 503 });
        }
        if (err instanceof Error && err.message.includes('not found in S3')) {
            return NextResponse.json(
                { success: false, error: 'PDF not found. Please upload again.' },
                { status: 404 }
            );
        }
        if (err instanceof SyntaxError) {
            return NextResponse.json(
                { success: false, error: 'Failed to parse AI response.' },
                { status: 500 }
            );
        }

        return NextResponse.json(
            { success: false, error: 'An unexpected error occurred.' },
            { status: 500 }
        );
    }
}