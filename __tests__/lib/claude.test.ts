// ─── Tests: lib/claude.ts ────────────────────────────────────────────────────
// Tests the JSON extraction, sanitization, and parsing logic inside claude.ts.
// The Claude API call itself is mocked — we test our code, not Anthropic's.

import { analyzeLabReport } from '@/lib/claude';
import { anthropic } from '@/lib/anthropic';

// Mock the Anthropic SDK client so no real API calls are made during tests
jest.mock('@/lib/anthropic', () => ({
    anthropic: {
        messages: {
            create: jest.fn(),
        },
    },
}));

// Convenience reference to the mocked create function
const mockCreate = anthropic.messages.create as jest.Mock;

// ── Shared test fixtures ──────────────────────────────────────────────────────

// A minimal valid LabReport JSON that Claude would return
const validReport = {
    patient: { age: 48, sex: 'male', bloodType: 'A+' },
    reportDate: '2026-02-23',
    biomarkers: [
        {
            name: 'Total Cholesterol',
            category: 'Lipid Panel',
            value: 209,
            unit: 'mg/dL',
            referenceRange: { min: null, max: 200 },
            optimalRange: { min: null, max: 180 },
            status: 'out_of_range',
            optimalStatus: 'out_of_range',
            flag: 'HIGH',
            note: 'Slightly elevated; consider reducing saturated fat intake.',
        },
    ],
};

// Helper — sets up mockCreate to return a given text response
function mockClaudeResponse(text: string) {
    mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text }],
    });
}

// ── Test suites ───────────────────────────────────────────────────────────────

describe('analyzeLabReport', () => {
    beforeEach(() => {
        jest.clearAllMocks(); // reset mock state between tests
    });

    // ── Happy path ─────────────────────────────────────────────────────────────

    it('parses a clean JSON response correctly', async () => {
        // Arrange: Claude returns a clean JSON string
        mockClaudeResponse(JSON.stringify(validReport));

        // Act
        const result = await analyzeLabReport('base64pdf==');

        // Assert: the parsed report matches the fixture
        expect(result.patient.age).toBe(48);
        expect(result.patient.sex).toBe('male');
        expect(result.biomarkers).toHaveLength(1);
        expect(result.biomarkers[0].name).toBe('Total Cholesterol');
        expect(result.biomarkers[0].status).toBe('out_of_range');
    });

    it('extracts JSON from a response wrapped in markdown fences', async () => {
        // Arrange: Claude sometimes wraps JSON in ```json ... ``` blocks
        mockClaudeResponse('```json\n' + JSON.stringify(validReport) + '\n```');

        // Act
        const result = await analyzeLabReport('base64pdf==');

        // Assert: JSON is still parsed correctly despite the fences
        expect(result.patient.age).toBe(48);
        expect(result.biomarkers).toHaveLength(1);
    });

    it('extracts JSON when Claude adds prose before the object', async () => {
        // Arrange: Claude sometimes adds an explanation before the JSON
        mockClaudeResponse('Here is the extracted data:\n\n' + JSON.stringify(validReport));

        // Act
        const result = await analyzeLabReport('base64pdf==');

        // Assert: the leading prose is ignored and JSON is parsed correctly
        expect(result.reportDate).toBe('2026-02-23');
    });

    it('sanitizes Unicode arrow characters before parsing', async () => {
        // Arrange: Claude uses ↑ and ↓ arrows in the flag field — these can corrupt JSON
        const reportWithArrows = JSON.stringify(validReport).replace('"HIGH"', '"↑"');
        mockClaudeResponse(reportWithArrows);

        // Act
        const result = await analyzeLabReport('base64pdf==');

        // Assert: arrows are converted to HIGH/LOW before parsing
        expect(result.biomarkers[0].flag).toBe('HIGH');
    });

    it('passes the base64 string to the Claude API', async () => {
        // Arrange
        mockClaudeResponse(JSON.stringify(validReport));
        const testBase64 = 'dGVzdHBkZg==';

        // Act
        await analyzeLabReport(testBase64);

        // Assert: the SDK was called with the correct base64 data
        const callArgs = mockCreate.mock.calls[0][0];
        const documentBlock = callArgs.messages[0].content[0];
        expect(documentBlock.source.data).toBe(testBase64);
        expect(documentBlock.source.media_type).toBe('application/pdf');
    });

    // ── Error cases ────────────────────────────────────────────────────────────

    it('throws SyntaxError when Claude returns no JSON object', async () => {
        // Arrange: Claude returns plain text with no JSON
        mockClaudeResponse('I cannot process this document.');

        // Act & Assert
        await expect(analyzeLabReport('base64pdf==')).rejects.toThrow(SyntaxError);
    });

    it('throws immediately on non-529 API errors without retrying', async () => {
        // Arrange: Claude returns a 401 Unauthorized error
        const authError = Object.assign(new Error('Unauthorized'), { status: 401 });
        mockCreate.mockRejectedValueOnce(authError);

        // Act & Assert: error propagates immediately, create is only called once
        await expect(analyzeLabReport('base64pdf==')).rejects.toThrow('Unauthorized');
        expect(mockCreate).toHaveBeenCalledTimes(1);
    });

    it('retries up to 3 times on 529 Overloaded errors', async () => {
        // Arrange: first 3 calls return 529, 4th succeeds
        const overloadedError = Object.assign(new Error('Overloaded'), { status: 529 });
        mockCreate
            .mockRejectedValueOnce(overloadedError) // attempt 1 — fail
            .mockRejectedValueOnce(overloadedError) // attempt 2 — fail
            .mockRejectedValueOnce(overloadedError) // attempt 3 — fail
            .mockResolvedValueOnce({                // attempt 4 — succeed
                content: [{ type: 'text', text: JSON.stringify(validReport) }],
            });

        // Act
        const result = await analyzeLabReport('base64pdf==');

        // Assert: succeeded after 4 total attempts
        expect(result.patient.age).toBe(48);
        expect(mockCreate).toHaveBeenCalledTimes(4);
    }, 30000); // extended timeout — test includes simulated retry delays

    it('throws after exhausting all retries on persistent 529 errors', async () => {
        // Arrange: all 4 attempts return 529
        const overloadedError = Object.assign(new Error('Overloaded'), { status: 529 });
        mockCreate.mockRejectedValue(overloadedError);

        // Act & Assert
        await expect(analyzeLabReport('base64pdf==')).rejects.toThrow('Overloaded');
        expect(mockCreate).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
    }, 30000);
});