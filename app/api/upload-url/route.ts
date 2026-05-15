// ─── /api/upload-url Route Handler ───────────────────────────────────────────
// Step 1 of the PDF upload flow.
// Browser calls this to get a presigned S3 URL, then uploads directly to S3.
// Lambda never touches the file bytes — eliminates the 6MB payload limit.

import { NextRequest, NextResponse } from 'next/server';
import { generateUploadUrl } from '@/lib/s3';

export async function POST(req: NextRequest) {
    try {
        // In production: extract userId from the verified JWT
        // For now we use a placeholder
        const userId = 'user-anonymous';

        const { uploadUrl, s3Key } = await generateUploadUrl(userId);

        // Return the presigned URL and the S3 key
        // The browser needs the s3Key to tell Lambda where to find the file
        return NextResponse.json({ success: true, uploadUrl, s3Key });

    } catch (err) {
        console.error('[upload-url] error:', err);
        return NextResponse.json(
            { success: false, error: 'Failed to generate upload URL.' },
            { status: 500 }
        );
    }
}