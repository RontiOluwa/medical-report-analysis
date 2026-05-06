// ─── Claude Analysis Service ──────────────────────────────────────────────────
// Handles all direct communication with the Anthropic API.
// Encapsulates the Claude API call, retry logic, response parsing, and sanitization.
// Imported by the /api/analyze route handler, keeping the route lean and focused
// purely on HTTP concerns (request validation, response formatting).

import { anthropic } from '@/lib/anthropic';
import { SYSTEM_PROMPT } from '@/lib/prompt';
import { LabReport } from '@/lib/types';

// Maximum number of retry attempts on a 529 Overloaded response.
const MAX_RETRIES = 3;

// Base delay in milliseconds before the first retry.
// Subsequent retries double this: 2000ms → 4000ms → 8000ms.
const RETRY_BASE_DELAY = 2000;

// Returns true if the error is a 529 Overloaded response from the Anthropic API.
// Only 529s warrant a retry — all other errors should propagate immediately.
function isOverloaded(err: unknown): boolean {
    return (
        typeof err === 'object' &&
        err !== null &&
        'status' in err &&
        (err as { status: number }).status === 529
    );
}

// Pauses execution for the given number of milliseconds.
// Used to implement the wait period between retry attempts.
async function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Sends the base64-encoded PDF to Claude with the extraction system prompt,
// retrying up to MAX_RETRIES times on 529 Overloaded responses.
// Returns the raw text content of Claude's response on success.
// Throws on non-retriable errors or if all retries are exhausted.
async function callClaude(base64: string): Promise<string> {
    let lastError: unknown;

    // Attempt the API call up to MAX_RETRIES + 1 times total.
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {

        // On retry attempts, wait before calling the API again.
        if (attempt > 0) {
            const delay = RETRY_BASE_DELAY * Math.pow(2, attempt - 1); // exponential backoff
            console.log(`[claude] overloaded — retry ${attempt}/${MAX_RETRIES} in ${delay}ms`);
            await sleep(delay);
        }

        try {
            // Send the PDF as a native document block alongside the extraction instruction.
            // Claude reads the full PDF natively — no separate parsing library required.
            const message = await anthropic.messages.create({
                model: 'claude-sonnet-4-20250514', // latest Sonnet for speed and accuracy
                max_tokens: 8192,                  // high limit for dense multi-panel reports
                system: SYSTEM_PROMPT,             // extraction, classification, and output schema
                messages: [
                    {
                        role: 'user',
                        content: [
                            {
                                // PDF attached as a base64-encoded document block.
                                type: 'document',
                                source: {
                                    type: 'base64',
                                    media_type: 'application/pdf',
                                    data: base64,
                                },
                            },
                            {
                                // Instruction that triggers the extraction task.
                                type: 'text',
                                text: 'Extract all biomarkers from this lab report and return the structured JSON as instructed.',
                            },
                        ],
                    },
                ],
            });

            // Extract the first text block from the response content array.
            const textBlock = message.content.find(block => block.type === 'text');

            // Guard against unexpected response shapes with no text content.
            if (!textBlock || textBlock.type !== 'text') {
                throw new Error('No text block in Claude response.');
            }

            // Return the raw text — parsing is handled by the caller.
            return textBlock.text;

        } catch (err) {
            lastError = err;

            // Only retry on 529 Overloaded. Any other error (auth, bad request,
            // malformed input) should fail immediately without waiting.
            if (!isOverloaded(err)) throw err;
        }
    }

    // All retries exhausted — throw the last recorded error.
    console.error('[claude] all retries exhausted');
    throw lastError;
}

// Extracts the JSON object from Claude's raw response text,
// sanitizes problematic Unicode characters, and parses it into a LabReport.
// Throws a SyntaxError if no valid JSON object is found.
function parseLabReport(raw: string): LabReport {
    // Use a regex to pull the outermost { } block from the response.
    // Handles cases where Claude prepends prose or wraps the JSON in markdown fences.
    const jsonMatch = raw.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
        console.error('[claude] no JSON found in response:', raw.slice(0, 300));
        throw new SyntaxError('AI response did not contain a valid JSON object.');
    }

    // Replace Unicode arrow characters with safe ASCII equivalents.
    // Multi-byte characters can corrupt JSON strings at high token counts.
    const sanitized = jsonMatch[0]
        .replace(/↑/g, 'HIGH')
        .replace(/↓/g, 'LOW');

    // Parse and return the typed LabReport structure.
    return JSON.parse(sanitized) as LabReport;
}

// ─── Public API ───────────────────────────────────────────────────────────────
// The single export consumed by the /api/analyze route.
// Orchestrates the full pipeline: API call → response extraction → JSON parsing.
export async function analyzeLabReport(base64: string): Promise<LabReport> {
    const raw = await callClaude(base64);     // call Claude with retry logic
    return parseLabReport(raw);              // extract and parse the JSON response
}