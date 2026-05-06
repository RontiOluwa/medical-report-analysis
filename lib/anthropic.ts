// ─── Anthropic SDK Client ────────────────────────────────────────────────────
// Initializes a singleton instance of the Anthropic client.
// The apiKey is read from the ANTHROPIC_API_KEY environment variable at runtime.
// This file is imported by the API route and any other server-side code
// that needs to call the Anthropic API — keeping the key server-side only.

import Anthropic from '@anthropic-ai/sdk';

// Create and export a single shared Anthropic client instance.
// Reusing one instance across requests avoids re-initializing the SDK
// and its underlying HTTP connection pool on every API call.
export const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY, // loaded from .env.local — never exposed to the browser
});
