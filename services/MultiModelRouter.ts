/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * BW NEXUS AI — MULTI-MODEL ROUTER
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Routes AI tasks to the optimal model based on task type:
 *
 *  FAST  (3B)  — classification, extraction, summarization, yes/no
 *  MAIN  (70B) — reasoning, analysis, complex answers
 *  VISION(11B) — image/document understanding
 *
 * Also provides:
 *  • Automatic fallback: if preferred model fails, try next tier
 *  • Token budget estimation to prevent context overflow
 *  • Usage tracking for cost monitoring
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import {
  callTogether,
  TOGETHER_DEFAULT_MODEL,
  TOGETHER_FAST_MODEL,
  TOGETHER_VISION_MODEL,
  type TogetherMessage,
  type TogetherOptions,
} from './togetherAIService';
import { callGroq, isGroqAvailable, GROQ_DEFAULT_MODEL, GROQ_FAST_MODEL, GROQ_REASONING_MODEL } from './groqService';

// ─── Task Types ─────────────────────────────────────────────────────────────

export type AITaskType =
  | 'classify'       // Issue type classification, query routing
  | 'extract'        // Entity extraction, data parsing
  | 'summarize'      // Conversation/document summarization
  | 'reason'         // Multi-step reasoning, analysis
  | 'answer'         // Main user-facing response
  | 'debate'         // Multi-perspective adversarial analysis
  | 'plan'           // Task decomposition, strategy planning
  | 'evaluate'       // Quality assessment, meta-cognition
  | 'vision'         // Image/document understanding
  | 'function_call'; // Tool/function selection

// ─── Model Assignment ──────────────────────────────────────────────────────

const TASK_MODEL_MAP: Record<AITaskType, string> = {
  classify:      TOGETHER_FAST_MODEL,      // Fast: simple classification
  extract:       TOGETHER_FAST_MODEL,      // Fast: structured extraction
  summarize:     TOGETHER_FAST_MODEL,      // Fast: summarization
  reason:        TOGETHER_DEFAULT_MODEL,   // Main: complex reasoning
  answer:        TOGETHER_DEFAULT_MODEL,   // Main: user-facing answers
  debate:        TOGETHER_DEFAULT_MODEL,   // Main: multi-perspective analysis
  plan:          TOGETHER_DEFAULT_MODEL,   // Main: strategic planning
  evaluate:      TOGETHER_FAST_MODEL,      // Fast: evaluation/scoring
  vision:        TOGETHER_VISION_MODEL,    // Vision: image understanding
  function_call: TOGETHER_FAST_MODEL,      // Fast: tool selection
};

const TASK_DEFAULTS: Record<AITaskType, Partial<TogetherOptions>> = {
  classify:      { maxTokens: 200,  temperature: 0.1 },
  extract:       { maxTokens: 800,  temperature: 0.1 },
  summarize:     { maxTokens: 600,  temperature: 0.2 },
  reason:        { maxTokens: 1200, temperature: 0.3 },
  answer:        { maxTokens: 4096, temperature: 0.35 },
  debate:        { maxTokens: 2000, temperature: 0.4 },
  plan:          { maxTokens: 1500, temperature: 0.3 },
  evaluate:      { maxTokens: 400,  temperature: 0.1 },
  vision:        { maxTokens: 2000, temperature: 0.3 },
  function_call: { maxTokens: 500,  temperature: 0.0 },
};

// Fallback chain: if primary model fails, try these in order
// Groq models are prefixed with 'groq:' to distinguish providers
const FALLBACK_CHAIN: Record<string, string[]> = {
  [TOGETHER_FAST_MODEL]:    [TOGETHER_DEFAULT_MODEL, `groq:${GROQ_FAST_MODEL}`, `groq:${GROQ_DEFAULT_MODEL}`],
  [TOGETHER_DEFAULT_MODEL]: [TOGETHER_FAST_MODEL, `groq:${GROQ_REASONING_MODEL}`, `groq:${GROQ_DEFAULT_MODEL}`, `groq:${GROQ_FAST_MODEL}`],
  [TOGETHER_VISION_MODEL]:  [TOGETHER_DEFAULT_MODEL, TOGETHER_FAST_MODEL, `groq:${GROQ_DEFAULT_MODEL}`],
};

// ─── Usage Tracking ─────────────────────────────────────────────────────────

interface UsageRecord {
  model: string;
  taskType: AITaskType;
  tokensEstimated: number;
  latencyMs: number;
  success: boolean;
  timestamp: number;
}

const usageLog: UsageRecord[] = [];
const MAX_USAGE_LOG = 500;

function logUsage(record: UsageRecord): void {
  usageLog.push(record);
  if (usageLog.length > MAX_USAGE_LOG) {
    usageLog.splice(0, usageLog.length - MAX_USAGE_LOG);
  }
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Route an AI task to the optimal model with automatic fallback.
 */
export async function routeAITask(
  taskType: AITaskType,
  messages: TogetherMessage[],
  options?: Partial<TogetherOptions>,
  onToken?: (token: string) => void
): Promise<string> {
  const model = options?.model || TASK_MODEL_MAP[taskType];
  const defaults = TASK_DEFAULTS[taskType];
  const mergedOptions: TogetherOptions = {
    model,
    maxTokens: options?.maxTokens ?? defaults.maxTokens,
    temperature: options?.temperature ?? defaults.temperature,
    stream: options?.stream,
  };

  const start = Date.now();

  // Try primary model
  try {
    const result = await callTogether(messages, mergedOptions, onToken);
    logUsage({
      model,
      taskType,
      tokensEstimated: estimateTokens(messages, result),
      latencyMs: Date.now() - start,
      success: true,
      timestamp: Date.now(),
    });
    return result;
  } catch (primaryErr) {
    console.warn(`[MultiModelRouter] ${model} failed for ${taskType}:`, primaryErr);

    // Try fallback chain
    const fallbacks = FALLBACK_CHAIN[model] || [];
    for (const fallbackModel of fallbacks) {
      try {
        let fallbackResult: string;
        if (fallbackModel.startsWith('groq:')) {
          if (!isGroqAvailable()) continue;
          const groqModel = fallbackModel.replace('groq:', '');
          fallbackResult = await callGroq(
            messages,
            { model: groqModel, maxTokens: mergedOptions.maxTokens, temperature: mergedOptions.temperature },
            onToken
          );
        } else {
          fallbackResult = await callTogether(
            messages,
            { ...mergedOptions, model: fallbackModel },
            onToken
          );
        }
        logUsage({
          model: fallbackModel,
          taskType,
          tokensEstimated: estimateTokens(messages, fallbackResult),
          latencyMs: Date.now() - start,
          success: true,
          timestamp: Date.now(),
        });
        return fallbackResult;
      } catch {
        continue;
      }
    }

    logUsage({
      model,
      taskType,
      tokensEstimated: 0,
      latencyMs: Date.now() - start,
      success: false,
      timestamp: Date.now(),
    });
    throw primaryErr;
  }
}

// ── Convenience wrappers ──────────────────────────────────────────────────

/**
 * Fast classification — returns a short label or category.
 */
export async function classifyWithAI(prompt: string, systemPrompt?: string): Promise<string> {
  return routeAITask('classify', [
    { role: 'system', content: systemPrompt || 'You are a classification assistant. Return ONLY the category label, nothing else.' },
    { role: 'user', content: prompt },
  ]);
}

/**
 * Fast extraction — returns structured data from text.
 */
export async function extractWithAI(text: string, schema: string): Promise<string> {
  return routeAITask('extract', [
    { role: 'system', content: `Extract the requested data from the text. Return ONLY valid JSON matching this schema:\n${schema}` },
    { role: 'user', content: text },
  ]);
}

/**
 * Fast summarization.
 */
export async function summarizeWithAI(text: string, maxWords = 150): Promise<string> {
  return routeAITask('summarize', [
    { role: 'system', content: `Summarize the following in under ${maxWords} words. Be concise and factual.` },
    { role: 'user', content: text.slice(0, 12000) },
  ]);
}

/**
 * Full reasoning (main model).
 */
export async function reasonWithAI(
  messages: TogetherMessage[],
  onToken?: (token: string) => void
): Promise<string> {
  return routeAITask('answer', messages, { stream: Boolean(onToken) }, onToken);
}

// ─── Utilities ──────────────────────────────────────────────────────────────

function estimateTokens(messages: TogetherMessage[], response: string): number {
  const inputChars = messages.reduce((sum, m) => sum + m.content.length, 0);
  return Math.round((inputChars + response.length) / 4);
}

/**
 * Get usage statistics for cost monitoring.
 */
export function getUsageStats(): {
  totalCalls: number;
  successRate: number;
  avgLatencyMs: number;
  byModel: Record<string, number>;
  byTask: Record<string, number>;
  estimatedTokens: number;
} {
  const total = usageLog.length;
  if (total === 0) return {
    totalCalls: 0, successRate: 1, avgLatencyMs: 0,
    byModel: {}, byTask: {}, estimatedTokens: 0,
  };

  const successes = usageLog.filter(r => r.success).length;
  const avgLatency = usageLog.reduce((s, r) => s + r.latencyMs, 0) / total;
  const byModel: Record<string, number> = {};
  const byTask: Record<string, number> = {};
  let totalTokens = 0;

  for (const r of usageLog) {
    byModel[r.model] = (byModel[r.model] || 0) + 1;
    byTask[r.taskType] = (byTask[r.taskType] || 0) + 1;
    totalTokens += r.tokensEstimated;
  }

  return {
    totalCalls: total,
    successRate: successes / total,
    avgLatencyMs: Math.round(avgLatency),
    byModel,
    byTask,
    estimatedTokens: totalTokens,
  };
}

export default {
  routeAITask,
  classifyWithAI,
  extractWithAI,
  summarizeWithAI,
  reasonWithAI,
  getUsageStats,
};
