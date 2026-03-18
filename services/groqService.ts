/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * BW NEXUS AI - GROQ SERVICE (Free Secondary AI Provider)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Ultra-fast LLM inference via Groq's LPU hardware.
 * Model: llama-3.3-70b-versatile (default - full reasoning + answering)
 * Fast:  llama-3.1-8b-instant
 *
 * Free tier: ~30 req/min, 14,400 req/day
 * Get a FREE key at: https://console.groq.com
 *
 * Set VITE_GROQ_API_KEY in .env (browser) and
 *     GROQ_API_KEY in .env (server) to activate.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { monitoringService } from './MonitoringService';

export const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
export const GROQ_DEFAULT_MODEL = 'llama-3.3-70b-versatile';
export const GROQ_FAST_MODEL = 'llama-3.1-8b-instant';
export const GROQ_REASONING_MODEL = 'openai/gpt-oss-120b';

// Re-use the same message shape as Together for interoperability
export interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GroqToolSchema {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, { type: string; description: string; enum?: string[] }>;
      required?: string[];
    };
  };
}

export interface GroqToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

export interface GroqOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
  tools?: GroqToolSchema[];
  toolChoice?: 'auto' | 'none' | { type: 'function'; function: { name: string } };
}

function getGroqKey(): string {
  return (
    (typeof process !== 'undefined' && process.env?.GROQ_API_KEY) ||
    ''
  );
}

/** Returns true if a valid Groq API key is configured. */
export function isGroqAvailable(): boolean {
  const key = getGroqKey();
  if (!key || key.length < 20) return false;
  const lower = key.toLowerCase();
  return !(
    lower.includes('your-') ||
    lower.includes('your_') ||
    lower.includes('key-here') ||
    lower.includes('placeholder')
  );
}

/**
 * Call Groq chat completions API.
 * OpenAI-compatible format - same message structure as Together.ai.
 *
 * - `onToken` triggers streaming mode via SSE.
 * - Without `onToken`, returns the full completion.
 */
export async function callGroq(
  messages: GroqMessage[],
  options: GroqOptions = {},
  onToken?: (token: string) => void
): Promise<string> {
  const key = getGroqKey();

  const lower = key.toLowerCase();
  if (
    !key ||
    key.length < 20 ||
    lower.includes('your-') ||
    lower.includes('your_') ||
    lower.includes('key-here') ||
    lower.includes('placeholder')
  ) {
    throw new Error('GROQ_API_KEY not configured - get a free key at https://console.groq.com');
  }

  const modelUsed = options.model ?? GROQ_DEFAULT_MODEL;
  const callStart = performance.now();

  const isReasoningModel = modelUsed === GROQ_REASONING_MODEL;

  const body: Record<string, unknown> = {
    model: modelUsed,
    messages,
    max_completion_tokens: isReasoningModel ? (options.maxTokens ?? 8192) : (options.maxTokens ?? 1024),
    temperature: options.temperature ?? 1,
    top_p: 1,
    stream: Boolean(onToken),
    stop: null,
    ...(isReasoningModel ? { reasoning_effort: 'medium' } : {}),
    ...(options.tools?.length ? { tools: options.tools, tool_choice: options.toolChoice ?? 'auto' } : {}),
  };

  let res: Response;
  try {
    res = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    monitoringService.trackAICall({
      timestamp: new Date().toISOString(),
      model: modelUsed,
      provider: 'groq',
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
      provider: 'groq',
      latencyMs: Math.round(performance.now() - callStart),
      success: false,
      error: `${res.status}: ${errText.slice(0, 200)}`,
    });
    throw new Error(`Groq ${res.status}: ${errText}`);
  }

  // ── Non-streaming ──
  if (!onToken) {
    const data = await res.json();
    monitoringService.trackAICall({
      timestamp: new Date().toISOString(),
      model: modelUsed,
      provider: 'groq',
      latencyMs: Math.round(performance.now() - callStart),
      success: true,
      inputTokens: data.usage?.prompt_tokens,
      outputTokens: data.usage?.completion_tokens,
    });
    // Expose tool_calls on the returned string as a hidden property so callers
    // can detect when the model wants to invoke a tool.
    const text = data.choices?.[0]?.message?.content || '';
    const toolCalls = data.choices?.[0]?.message?.tool_calls as GroqToolCall[] | undefined;
    if (toolCalls && toolCalls.length > 0) {
      (text as any).__toolCalls = toolCalls;
    }
    return text;
  }

  // ── SSE streaming ──
  const reader = res.body?.getReader();
  if (!reader) throw new Error('No stream body from Groq');

  const dec = new TextDecoder();
  let full = '',
    buf = '';

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
        if (tok) {
          full += tok;
          onToken(tok);
        }
      } catch {
        /* partial chunk */
      }
    }
  }
  monitoringService.trackAICall({
    timestamp: new Date().toISOString(),
    model: modelUsed,
    provider: 'groq',
    latencyMs: Math.round(performance.now() - callStart),
    success: true,
  });
  return full;
}

/**
 * Simple one-shot prompt via Groq.
 * Drop-in replacement for generateWithTogether when Groq is available.
 */
export async function generateWithGroq(
  prompt: string,
  systemInstruction?: string,
  onToken?: (token: string) => void
): Promise<string> {
  const msgs: GroqMessage[] = [];
  if (systemInstruction) msgs.push({ role: 'system', content: systemInstruction });
  msgs.push({ role: 'user', content: prompt });
  return callGroq(msgs, {}, onToken);
}

export default { callGroq, isGroqAvailable, generateWithGroq };

/**
 * Execute a Groq function-calling loop.
 *
 * 1. Sends messages + tool schemas to Groq.
 * 2. If the model emits tool_calls, runs `executeTool(name, args)` for each.
 * 3. Feeds results back as tool-role messages and loops (max 3 rounds).
 * 4. Returns the final text answer.
 */
export async function callGroqWithTools(
  messages: GroqMessage[],
  tools: GroqToolSchema[],
  executeTool: (name: string, args: Record<string, unknown>) => Promise<string>,
  options: Omit<GroqOptions, 'tools' | 'toolChoice'> = {}
): Promise<{ text: string; toolsUsed: string[] }> {
  const conversation: GroqMessage[] = [...messages];
  const toolsUsed: string[] = [];
  const MAX_ROUNDS = 3;

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const result = await callGroq(conversation, {
      ...options,
      tools,
      toolChoice: 'auto',
      stream: false,
    });

    const toolCalls = (result as any).__toolCalls as GroqToolCall[] | undefined;
    if (!toolCalls || toolCalls.length === 0) {
      return { text: result, toolsUsed };
    }

    // Add assistant message (with tool_calls) to conversation
    conversation.push({ role: 'assistant', content: result || '' });

    for (const tc of toolCalls) {
      let args: Record<string, unknown> = {};
      try { args = JSON.parse(tc.function.arguments); } catch { /* empty */ }

      toolsUsed.push(tc.function.name);
      const toolResult = await executeTool(tc.function.name, args);

      // Groq expects a 'user' message with tool result (OpenAI compat)
      conversation.push({
        role: 'user' as const,
        content: `[Tool Result: ${tc.function.name}]\n${toolResult}`,
      });
    }
  }

  // Max rounds exceeded — do a final call without tools
  const final = await callGroq(conversation, { ...options, stream: false });
  return { text: final, toolsUsed };
}
