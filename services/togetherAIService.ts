/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * BW NEXUS AI — TOGETHER AI SERVICE
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Open-source LLM backend via Together.ai API.
 * Model: meta-llama/Llama-3.1-70B-Instruct-Turbo (default)
 *
 * Set VITE_TOGETHER_API_KEY in .env (browser) and
 *     TOGETHER_API_KEY in .env (server) to activate.
 *
 * All AI calls previously using AWS Bedrock now route here.
 * The awsBedrockService.ts exports are preserved as aliases.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export const TOGETHER_API_URL = 'https://api.together.xyz/v1/chat/completions';
export const TOGETHER_DEFAULT_MODEL = 'meta-llama/Llama-3.1-70B-Instruct-Turbo';
export const TOGETHER_FAST_MODEL    = 'meta-llama/Llama-3.2-3B-Instruct-Turbo';
export const TOGETHER_VISION_MODEL  = 'meta-llama/Llama-3.2-11B-Vision-Instruct-Turbo';

// Imported locally so it can be used as a default parameter in this file
import { SYSTEM_INSTRUCTION } from './aiPolicy';
import { monitoringService } from './MonitoringService';
export const TOGETHER_SYSTEM_PROMPT = SYSTEM_INSTRUCTION;

// ─── Client ───────────────────────────────────────────────────────────────────

export interface TogetherMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface TogetherOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
}

/**
 * Call Together.ai chat completions API.
 * - `onToken` triggers streaming mode via SSE.
 * - Without `onToken`, returns the full completion.
 */
export async function callTogether(
  messages: TogetherMessage[],
  options: TogetherOptions = {},
  onToken?: (token: string) => void
): Promise<string> {
  const key =
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_TOGETHER_API_KEY) ||
    (typeof process !== 'undefined' && process.env?.TOGETHER_API_KEY) ||
    '';

  // Reject placeholder keys
  const lower = key.toLowerCase();
  if (!key || key.length < 20 || lower.includes('your-') || lower.includes('your_') || lower.includes('key-here') || lower.includes('placeholder')) {
    throw new Error(
      '\n\n=== BW NEXUS AI — API KEY REQUIRED ===\n\n' +
      'No valid Together.ai API key found.\n\n' +
      '1. Get a FREE key at: https://api.together.xyz\n' +
      '2. Open .env and set: VITE_TOGETHER_API_KEY=<your-real-key>\n' +
      '3. Restart the dev server (npm run dev)\n\n' +
      'The system will fully activate once a real key is present.\n'
    );
  }

  const modelUsed = options.model ?? TOGETHER_DEFAULT_MODEL;
  const callStart = performance.now();

  const body = JSON.stringify({
    model:       modelUsed,
    messages,
    max_tokens:  options.maxTokens   ?? 4096,
    temperature: options.temperature ?? 0.4,
    stream:      Boolean(onToken),
  });

  let res: Response;
  try {
    res = await fetch(TOGETHER_API_URL, {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type':  'application/json',
      },
      body,
    });
  } catch (err) {
    monitoringService.trackAICall({
      timestamp: new Date().toISOString(),
      model: modelUsed,
      provider: 'together',
      latencyMs: Math.round(performance.now() - callStart),
      success: false,
      error: err instanceof Error ? err.message : 'Network error',
    });
    throw err;
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    monitoringService.trackAICall({
      timestamp: new Date().toISOString(),
      model: modelUsed,
      provider: 'together',
      latencyMs: Math.round(performance.now() - callStart),
      success: false,
      error: `${res.status}: ${errText.slice(0, 200)}`,
    });
    throw new Error(`Together.ai ${res.status}: ${errText}`);
  }

  // ── Non-streaming ──
  if (!onToken) {
    const data = await res.json();
    monitoringService.trackAICall({
      timestamp: new Date().toISOString(),
      model: modelUsed,
      provider: 'together',
      latencyMs: Math.round(performance.now() - callStart),
      success: true,
      inputTokens: data.usage?.prompt_tokens,
      outputTokens: data.usage?.completion_tokens,
    });
    return data.choices?.[0]?.message?.content || '';
  }

  // ── SSE streaming ──
  const reader = res.body?.getReader();
  if (!reader) throw new Error('No stream body from Together.ai');

  const dec = new TextDecoder();
  let full = '', buf = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() || '';
    for (const line of lines) {
      const trimmed = line.replace(/^data:\s*/, '').trim();
      if (!trimmed || trimmed === '[DONE]') continue;
      try {
        const tok = JSON.parse(trimmed).choices?.[0]?.delta?.content || '';
        if (tok) { full += tok; onToken(tok); }
      } catch { /* partial chunk */ }
    }
  }
  monitoringService.trackAICall({
    timestamp: new Date().toISOString(),
    model: modelUsed,
    provider: 'together',
    latencyMs: Math.round(performance.now() - callStart),
    success: true,
  });
  return full;
}

/**
 * Simple one-shot prompt with optional system instruction.
 * Used as a drop-in for `generateFn` in IntelligentDocumentGenerator.
 */
export async function generateWithTogether(
  prompt: string,
  systemInstruction = SYSTEM_INSTRUCTION,
  onToken?: (token: string) => void
): Promise<string> {
  return callTogether(
    [
      { role: 'system', content: systemInstruction },
      { role: 'user',   content: prompt },
    ],
    {},
    onToken
  );
}

export default { callTogether, generateWithTogether };
