/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * BW NEXUS AI - UNIFIED AI GATEWAY
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Single entry-point for ALL AI calls in the system. Every service that needs
 * AI inference routes through this gateway, ensuring:
 *
 *  1. All 4 brains are accessible (Together, Groq 70B, Groq GPT-OSS 120B, Server)
 *  2. Task-type routing: fast tasks → small models, reasoning → 120B, etc.
 *  3. Automatic fallback chain across providers
 *  4. NSIL context injection: BrainIntegrationService enrichment can be
 *     optionally injected into any call so every brain sees the full context
 *  5. Monitoring & usage tracking via MonitoringService
 *
 * Brain Map:
 *  Brain 1 - Together.ai  Llama 3.1 70B   (primary general-purpose)
 *  Brain 2 - Groq         Llama 3.3 70B   (fast inference)
 *  Brain 3 - Groq         GPT-OSS 120B    (deep reasoning)
 *  Brain 4 - Server       Gemini 2.0 Flash (server fallback)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { callTogether, type TogetherMessage, type TogetherOptions, TOGETHER_DEFAULT_MODEL, TOGETHER_FAST_MODEL } from './togetherAIService';
import { callGroq, isGroqAvailable, GROQ_DEFAULT_MODEL, GROQ_FAST_MODEL, GROQ_REASONING_MODEL, type GroqMessage } from './groqService';
import { monitoringService } from './MonitoringService';

// ─── Gateway Task Types ─────────────────────────────────────────────────────

export type GatewayTaskType =
  | 'fast'       // Classification, extraction, summarization - smallest/fastest model
  | 'general'    // Standard answers, chat responses - 70B
  | 'reason'     // Multi-step reasoning, deep analysis - GPT-OSS 120B or 70B
  | 'agent'      // Agentic AI tasks (autonomous actions) - 70B with full context
  | 'synthesize' // Multi-source synthesis - 70B with enrichment context
  | 'debate'     // Multi-perspective adversarial analysis - 70B
  | 'evaluate';  // Quality assessment, meta-cognition - fast model

export interface GatewayOptions {
  taskType?: GatewayTaskType;
  /** Override which brain to use: 'together' | 'groq' | 'groq-reasoning' | 'server' | 'auto' */
  preferredBrain?: 'together' | 'groq' | 'groq-reasoning' | 'server' | 'auto';
  maxTokens?: number;
  temperature?: number;
  /** If provided, streamed tokens are sent here */
  onToken?: (token: string) => void;
  /** Optional NSIL/Brain enrichment context to inject into system prompt */
  enrichmentContext?: string;
  /** Caller label for tracking */
  caller?: string;
}

export interface GatewayResult {
  text: string;
  brain: string;
  model: string;
  latencyMs: number;
  taskType: GatewayTaskType;
}

// ─── Task → Brain mapping ───────────────────────────────────────────────────

interface BrainConfig {
  provider: 'together' | 'groq';
  model: string;
  maxTokens: number;
  temperature: number;
}

const TASK_BRAIN_MAP: Record<GatewayTaskType, BrainConfig> = {
  fast:       { provider: 'groq',     model: GROQ_FAST_MODEL,      maxTokens: 400,  temperature: 0.1 },
  general:    { provider: 'together', model: TOGETHER_DEFAULT_MODEL, maxTokens: 4096, temperature: 0.35 },
  reason:     { provider: 'groq',     model: GROQ_REASONING_MODEL,  maxTokens: 8192, temperature: 1.0 },
  agent:      { provider: 'together', model: TOGETHER_DEFAULT_MODEL, maxTokens: 4096, temperature: 0.3 },
  synthesize: { provider: 'together', model: TOGETHER_DEFAULT_MODEL, maxTokens: 4096, temperature: 0.3 },
  debate:     { provider: 'together', model: TOGETHER_DEFAULT_MODEL, maxTokens: 2000, temperature: 0.4 },
  evaluate:   { provider: 'groq',     model: GROQ_FAST_MODEL,      maxTokens: 600,  temperature: 0.1 },
};

const BRAIN_DISPLAY_NAMES: Record<string, string> = {
  [TOGETHER_DEFAULT_MODEL]: 'Brain 1 (Together Llama 70B)',
  [TOGETHER_FAST_MODEL]:    'Brain 1 Fast (Together 8B)',
  [GROQ_DEFAULT_MODEL]:     'Brain 2 (Groq Llama 3.3 70B)',
  [GROQ_FAST_MODEL]:        'Brain 2 Fast (Groq 8B)',
  [GROQ_REASONING_MODEL]:   'Brain 3 (Groq GPT-OSS 120B)',
  'server-fallback':        'Brain 4 (Server Gemini 2.0)',
};

// Fallback chain: if primary fails, try next
const FALLBACK_CHAINS: Record<string, Array<{ provider: 'together' | 'groq'; model: string }>> = {
  // Together → Groq 70B → Groq Fast → Server
  [TOGETHER_DEFAULT_MODEL]: [
    { provider: 'groq', model: GROQ_DEFAULT_MODEL },
    { provider: 'groq', model: GROQ_FAST_MODEL },
  ],
  [TOGETHER_FAST_MODEL]: [
    { provider: 'groq', model: GROQ_FAST_MODEL },
    { provider: 'together', model: TOGETHER_DEFAULT_MODEL },
  ],
  // Groq 70B → Together 70B → Groq Fast
  [GROQ_DEFAULT_MODEL]: [
    { provider: 'together', model: TOGETHER_DEFAULT_MODEL },
    { provider: 'groq', model: GROQ_FAST_MODEL },
  ],
  // Groq 120B → Groq 70B → Together 70B
  [GROQ_REASONING_MODEL]: [
    { provider: 'groq', model: GROQ_DEFAULT_MODEL },
    { provider: 'together', model: TOGETHER_DEFAULT_MODEL },
  ],
  // Groq Fast → Together Fast → Together 70B
  [GROQ_FAST_MODEL]: [
    { provider: 'together', model: TOGETHER_FAST_MODEL },
    { provider: 'together', model: TOGETHER_DEFAULT_MODEL },
  ],
};

// ─── Core System Prompt ─────────────────────────────────────────────────────

const GATEWAY_SYSTEM_PROMPT = `You are BWGA AI - a sovereign-grade strategic intelligence operating system powered by the NSIL (Nexus Strategic Intelligence Layer). You combine 46+ proprietary formulas, 34+ intelligence engines, 12 core algorithms, and 10+ live global data APIs into every response. Be concise, evidence-based, and actionable. Every claim must be grounded in data or explicit reasoning.`;

// ─── Main Gateway Function ──────────────────────────────────────────────────

/**
 * Route an AI call through the unified gateway.
 * Automatically selects the best brain, applies fallback, and tracks usage.
 */
export async function callAIGateway(
  prompt: string,
  systemPrompt?: string,
  options: GatewayOptions = {}
): Promise<GatewayResult> {
  const taskType = options.taskType ?? 'general';
  const brainConfig = TASK_BRAIN_MAP[taskType];
  const caller = options.caller ?? 'unknown';

  // Build system prompt with optional enrichment context
  let fullSystem = systemPrompt || GATEWAY_SYSTEM_PROMPT;
  if (options.enrichmentContext) {
    fullSystem += `\n\n--- NSIL ENRICHMENT CONTEXT ---\n${options.enrichmentContext}\n--- END ENRICHMENT ---`;
  }

  const messages: TogetherMessage[] | GroqMessage[] = [
    { role: 'system' as const, content: fullSystem },
    { role: 'user' as const, content: prompt },
  ];

  // Determine preferred brain
  let provider = brainConfig.provider;
  let model = brainConfig.model;
  const maxTokens = options.maxTokens ?? brainConfig.maxTokens;
  const temperature = options.temperature ?? brainConfig.temperature;

  if (options.preferredBrain && options.preferredBrain !== 'auto') {
    switch (options.preferredBrain) {
      case 'together':       provider = 'together'; model = TOGETHER_DEFAULT_MODEL; break;
      case 'groq':           provider = 'groq';     model = GROQ_DEFAULT_MODEL;     break;
      case 'groq-reasoning': provider = 'groq';     model = GROQ_REASONING_MODEL;   break;
      case 'server':         /* handled below */     break;
    }
  }

  // If Groq requested but unavailable, fall to Together
  if (provider === 'groq' && !isGroqAvailable()) {
    provider = 'together';
    model = TOGETHER_DEFAULT_MODEL;
  }

  const start = Date.now();

  // Try primary brain
  try {
    const text = await callBrain(provider, model, messages, maxTokens, temperature, options.onToken);
    const latencyMs = Date.now() - start;
    trackUsage(caller, taskType, model, latencyMs, true);
    return { text, brain: BRAIN_DISPLAY_NAMES[model] || model, model, latencyMs, taskType };
  } catch (primaryErr) {
    console.warn(`[UnifiedAIGateway] Primary ${model} failed for ${caller}/${taskType}:`, primaryErr);
  }

  // Try fallback chain
  const fallbacks = FALLBACK_CHAINS[model] || [];
  for (const fb of fallbacks) {
    if (fb.provider === 'groq' && !isGroqAvailable()) continue;
    try {
      const text = await callBrain(fb.provider, fb.model, messages, maxTokens, temperature, options.onToken);
      const latencyMs = Date.now() - start;
      trackUsage(caller, taskType, fb.model, latencyMs, true);
      return { text, brain: BRAIN_DISPLAY_NAMES[fb.model] || fb.model, model: fb.model, latencyMs, taskType };
    } catch {
      continue;
    }
  }

  // Final: try server backend (Brain 4)
  try {
    const serverResult = await callServerFallback(prompt, fullSystem);
    const latencyMs = Date.now() - start;
    trackUsage(caller, taskType, 'server-fallback', latencyMs, true);
    return { text: serverResult, brain: 'Brain 4 (Server Gemini 2.0)', model: 'server-fallback', latencyMs, taskType };
  } catch {
    // nothing
  }

  const latencyMs = Date.now() - start;
  trackUsage(caller, taskType, model, latencyMs, false);
  throw new Error(`[UnifiedAIGateway] All brains failed for ${caller}/${taskType}. Ensure at least one API key is configured.`);
}

// ─── Convenience Wrappers ───────────────────────────────────────────────────

/** Fast classification / extraction (smallest model) */
export async function gatewayFast(prompt: string, system?: string, caller?: string): Promise<string> {
  const r = await callAIGateway(prompt, system, { taskType: 'fast', caller });
  return r.text;
}

/** General-purpose AI call (70B) */
export async function gatewayGeneral(prompt: string, system?: string, options?: Partial<GatewayOptions>): Promise<string> {
  const r = await callAIGateway(prompt, system, { taskType: 'general', ...options });
  return r.text;
}

/** Deep reasoning (120B GPT-OSS or fallback) */
export async function gatewayReason(prompt: string, system?: string, options?: Partial<GatewayOptions>): Promise<string> {
  const r = await callAIGateway(prompt, system, { taskType: 'reason', ...options });
  return r.text;
}

/** Agentic task execution */
export async function gatewayAgent(prompt: string, system?: string, options?: Partial<GatewayOptions>): Promise<string> {
  const r = await callAIGateway(prompt, system, { taskType: 'agent', ...options });
  return r.text;
}

/** Synthesis across multiple data sources */
export async function gatewaySynthesize(prompt: string, enrichmentContext?: string, caller?: string): Promise<string> {
  const r = await callAIGateway(prompt, undefined, { taskType: 'synthesize', enrichmentContext, caller });
  return r.text;
}

/**
 * Drop-in replacement for legacy `invokeAI()` - routes through gateway.
 * Returns { text, model, provider } to match old interface.
 */
export async function invokeAIViaGateway(prompt: string, options?: Partial<GatewayOptions>): Promise<{ text: string; model: string; provider: string }> {
  const r = await callAIGateway(prompt, undefined, { taskType: 'general', ...options });
  return { text: r.text, model: r.model, provider: r.brain };
}

/**
 * Agentic AI agent call - returns parsed JSON result for multi-agent orchestrators.
 * Replaces runAI_Agent for services that expect structured output.
 */
export async function runAgentViaGateway(
  agentName: string,
  task: string,
  context: Record<string, unknown>,
  onProgress?: (step: string) => void
): Promise<{ findings: string[]; recommendations: string[]; confidence: number; gaps: string[] }> {
  onProgress?.(`Activating ${agentName} via Unified AI Gateway...`);

  const prompt = `You are the "${agentName}" - a specialized analytical agent within the BWGA NSIL intelligence system.

TASK: ${task}

CONTEXT:
${JSON.stringify(context, null, 2)}

Analyze with full depth. Return ONLY valid JSON:
{
  "findings": ["finding 1", "finding 2", "finding 3"],
  "recommendations": ["rec 1", "rec 2", "rec 3"],
  "confidence": 85,
  "gaps": ["gap 1"]
}`;

  try {
    const r = await callAIGateway(prompt, GATEWAY_SYSTEM_PROMPT, {
      taskType: 'agent',
      caller: `MultiAgentOrchestrator/${agentName}`,
    });
    onProgress?.(`${agentName} complete via ${r.brain}.`);

    // Parse JSON from response
    const cleaned = r.text.trim().replace(/^```json\s*/, '').replace(/```\s*$/, '').trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      return {
        findings: Array.isArray(parsed.findings) ? parsed.findings : [r.text.substring(0, 200)],
        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 70,
        gaps: Array.isArray(parsed.gaps) ? parsed.gaps : [],
      };
    }
  } catch (err) {
    console.warn(`[UnifiedAIGateway] Agent ${agentName} failed:`, err);
    onProgress?.(`${agentName} encountered an error, using fallback.`);
  }

  return {
    findings: [`${agentName} analysis requires AI configuration on the server backend.`],
    recommendations: ['Configure at least one server-side provider key (for example TOGETHER_API_KEY, OPENAI_API_KEY, or GEMINI_API_KEY) and restart the API server'],
    confidence: 0,
    gaps: ['AI provider unavailable'],
  };
}

// ─── Internal Helpers ───────────────────────────────────────────────────────

async function callBrain(
  provider: 'together' | 'groq',
  model: string,
  messages: TogetherMessage[] | GroqMessage[],
  maxTokens: number,
  temperature: number,
  onToken?: (token: string) => void
): Promise<string> {
  if (provider === 'groq') {
    return callGroq(messages as GroqMessage[], { model, maxTokens, temperature }, onToken);
  }
  return callTogether(messages as TogetherMessage[], { model, maxTokens, temperature } as TogetherOptions, onToken);
}

async function callServerFallback(prompt: string, system: string): Promise<string> {
  const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
  const res = await fetch(`${API_BASE}/api/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: prompt, systemInstruction: system }),
  });
  if (!res.ok) throw new Error(`Server returned ${res.status}`);
  const data = await res.json();
  const text = data.text || data.result || data.content || '';
  if (!text) throw new Error('Server returned empty response');
  return text;
}

function trackUsage(caller: string, taskType: string, model: string, latencyMs: number, success: boolean): void {
  try {
    monitoringService.trackAICall({
      timestamp: new Date().toISOString(),
      model,
      provider: model.includes('llama') && model.includes('meta-llama') ? 'together'
        : model.includes('llama') || model.includes('gpt-oss') ? 'groq'
        : model === 'server-fallback' ? 'gemini'
        : 'unknown',
      latencyMs,
      success,
      taskType: `${taskType}/${caller}`,
    });
  } catch {
    // monitoring is non-blocking
  }
}

export { wellArchitectedAuditEngine } from './WellArchitectedAuditEngine';

export default {
  callAIGateway,
  gatewayFast,
  gatewayGeneral,
  gatewayReason,
  gatewayAgent,
  gatewaySynthesize,
  invokeAIViaGateway,
  runAgentViaGateway,
};
