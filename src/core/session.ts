/**
 * Holds the decrypted Gemini key for the current browser session only.
 * Never written to disk.
 */
let geminiKey: string | null = null;

export function setSessionGeminiKey(key: string | null) {
  geminiKey = key?.trim() || null;
}

export function getSessionGeminiKey(): string | null {
  return geminiKey;
}
