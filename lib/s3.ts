// ─── S3 Service ───────────────────────────────────────────────────────────────
// Two responsibilities:
//   1. Generate presigned upload URLs so the browser uploads directly to S3
//   2. Read PDFs from S3 as a Buffer for AI analysis

import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

// The S3 client automatically picks up credentials from:
//   - Lambda execution role (in production — no keys needed)
//   - ~/.aws/credentials (locally)
//   - Environment variables AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY
const s3 = new S3Client({
    region: process.env.AWS_REGION
});

const BUCKET = process.env.S3_PDF_BUCKET!;

// ── generateUploadUrl ─────────────────────────────────────────────────────────
// Generates a temporary presigned URL that allows the browser to PUT a file
// directly into S3 without any AWS credentials.
// The URL expires after 5 minutes — enough time for any upload.
export async function generateUploadUrl(userId: string): Promise<{
    uploadUrl: string;
    s3Key: string;
}> {
    // Each PDF gets a unique key scoped to the user
    // Format: uploads/userId/timestamp-uuid.pdf
    const s3Key = `uploads/${userId}/${Date.now()}-${randomUUID()}.pdf`;

    const command = new PutObjectCommand({
        Bucket: BUCKET,
        Key: s3Key,
        ContentType: 'application/pdf',
    });

    // Sign the command — creates a URL with the signature embedded
    // Anyone with this URL can PUT a file to this exact S3 key for 5 minutes
    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });

    return { uploadUrl, s3Key };
}

// ── getPDFBuffer ──────────────────────────────────────────────────────────────
// Reads a PDF from S3 and returns it as a Buffer.
// Called by the analyze route after the browser confirms the upload is done.
export async function getPDFBuffer(s3Key: string): Promise<Buffer> {
    const command = new GetObjectCommand({
        Bucket: BUCKET,
        Key: s3Key,
    });

    const response = await s3.send(command);

    if (!response.Body) {
        throw new Error(`PDF not found in S3: ${s3Key}`);
    }

    // transformToByteArray() is the recommended AWS SDK v3 method for
    // reading the response body — more reliable than manual chunk iteration
    const bytes = await response.Body.transformToByteArray();

    // Wrap in Buffer.from() to guarantee a proper Node.js Buffer
    // before it is converted to base64 in ai.ts
    return Buffer.from(bytes);
}