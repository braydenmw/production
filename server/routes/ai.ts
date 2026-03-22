import { Router, Request, Response } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { AdaptiveControlLearning } from '../services/AdaptiveControlLearning.js';
import {
  deriveControlDecision,
  type ControlProvider,
  type RequestEnvelope,
} from '../../shared/cognitiveControl.js';
import {
  shouldRequireOutputClarification,
  buildOutputClarificationResponse
} from './consultantBehavior.js';
import { deriveConsultantCapabilityProfile } from './consultantCapabilities.js';
import {
  buildAugmentedAISnapshot,
  getAugmentedAITools,
  getRecommendedAugmentedToolsForMode
} from './augmentedAISupport.js';
import { buildOverlookedIntelligenceSnapshot } from './overlookedFirstEngine.js';
import { runStrategicIntelligencePipeline } from './strategicIntelligencePipeline.js';
import { buildBrainCoverageReport } from './brainCoverageAudit.js';
import { buildPerceptionDeltaIndex } from '../services/PerceptionDeltaIndex.js';
import { runFiveEngineTribunal } from '../services/FiveEngineTribunal.js';

const router = Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');
const CONSULTANT_AUDIT_FILE = path.join(DATA_DIR, 'consultant-audit.jsonl');
const CONSULTANT_REPLAY_FILE = path.join(DATA_DIR, 'consultant-replay.jsonl');

// ─── Together.ai config ────────────────────────────────────────────────────────
const TOGETHER_API_URL  = 'https://api.together.xyz/v1/chat/completions';
const TOGETHER_MODEL_ID = process.env.TOGETHER_MODEL || 'meta-llama/Llama-3.1-70B-Instruct-Turbo';
const getTogetherKey    = () => String(process.env.TOGETHER_API_KEY || '').trim().replace(/^['"]|['"]$/g, '');

// ─── Groq config ───────────────────────────────────────────────────────────────
const GROQ_API_URL  = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL_ID = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
const getGroqKey    = () => String(process.env.GROQ_API_KEY || '').trim().replace(/^['"]|['"]$/g, '');
const BEDROCK_REGION = process.env.AWS_REGION || 'us-east-1';
const BEDROCK_MODEL_ID = process.env.BEDROCK_CONSULTANT_MODEL_ID || 'anthropic.claude-3-5-sonnet-20241022-v2:0';
const bedrockClient = new BedrockRuntimeClient({ region: BEDROCK_REGION });
type AIMessageRole = 'system' | 'user' | 'assistant';
interface AIMessage {
  role: AIMessageRole;
  content: string;
}

// ─── Unified AI helper: Bedrock → OpenAI → Together ──
const getOpenAIKey = () => String(process.env.OPENAI_API_KEY || '').trim().replace(/^['"]|['"]$/g, '');
const hasBedrockSignal = () => Boolean(process.env.AWS_REGION || process.env.BEDROCK_CONSULTANT_MODEL_ID || process.env.AWS_ACCESS_KEY_ID || process.env.AWS_PROFILE);

const invokeBedrockMessages = async (messages: AIMessage[], systemInstruction?: string): Promise<string> => {
  const normalizedMessages = messages
    .filter((m) => m && typeof m?.content === 'string' && (m.role === 'user' || m.role === 'assistant'))
    .map((m) => ({
      role: m.role,
      content: [{ type: 'text', text: String(m.content) }]
    }));

  if (normalizedMessages.length === 0) {
    throw new Error('Bedrock request has no valid messages');
  }

  const payload = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 1800,
    temperature: 0.4,
    ...(systemInstruction ? { system: systemInstruction } : {}),
    messages: normalizedMessages,
  };

  const command = new InvokeModelCommand({
    modelId: BEDROCK_MODEL_ID,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify(payload),
  });

  const response = await bedrockClient.send(command);
  const raw = new TextDecoder().decode(response.body);
  const data = JSON.parse(raw) as { content?: Array<{ type?: string; text?: string }> };
  const text = (data.content || [])
    .filter((part) => part?.type === 'text' && typeof part?.text === 'string')
    .map((part) => part.text)
    .join('\n')
    .trim();

  if (!text) {
    throw new Error('Bedrock returned empty response');
  }

  return text;
};

const _isAIAvailable = (): boolean => {
  if (hasBedrockSignal()) return true;
  if (getOpenAIKey()) return true;
  if (getGroqKey()) return true;
  if (getTogetherKey()) return true;
  return false;
};

const generateWithAI = async (input: string | AIMessage[], systemInstruction?: string): Promise<string> => {
  const openaiKey = getOpenAIKey();
  const groqKey = getGroqKey();
  const togetherKey = getTogetherKey();
  const providerConfigured = Boolean(hasBedrockSignal() || openaiKey || groqKey || togetherKey);

  const baseMessages: AIMessage[] = typeof input === 'string'
    ? [{ role: 'user', content: input }]
    : input
        .filter((msg): msg is AIMessage =>
          Boolean(msg) &&
          typeof msg.content === 'string' &&
          (msg.role === 'system' || msg.role === 'user' || msg.role === 'assistant')
        );

  const fullMessages: AIMessage[] = systemInstruction
    ? [{ role: 'system', content: systemInstruction }, ...baseMessages]
    : baseMessages;

  // 1. AWS Bedrock (primary for AWS live deployments)
  if (hasBedrockSignal()) {
    try {
      const text = await invokeBedrockMessages(fullMessages, systemInstruction);
      if (text) return text;
    } catch (bedrockErr) {
      console.warn('[AI Routes] Bedrock failed, trying OpenAI:', bedrockErr instanceof Error ? bedrockErr.message : bedrockErr);
    }
  }

  // 2. OpenAI fallback
  if (openaiKey) {
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: fullMessages,
          max_tokens: 4096,
          temperature: 0.4,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const text = (data.choices?.[0]?.message?.content || '').trim();
        if (text) return text;
      } else {
        console.warn('[AI Routes] OpenAI error:', res.status);
      }
    } catch (openaiErr) {
      console.warn('[AI Routes] OpenAI failed, trying Groq:', openaiErr instanceof Error ? openaiErr.message : openaiErr);
    }
  }

  // 3. Groq fallback
  if (groqKey) {
    try {
      const res = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: GROQ_MODEL_ID,
          messages: fullMessages,
          max_tokens: 4096,
          temperature: 0.4,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const text = (data.choices?.[0]?.message?.content || '').trim();
        if (text) return text;
      } else {
        console.warn('[AI Routes] Groq error:', res.status);
      }
    } catch (groqErr) {
      console.warn('[AI Routes] Groq failed, trying Together:', groqErr instanceof Error ? groqErr.message : groqErr);
    }
  }

  // 4. Together.ai fallback
  if (togetherKey) {
    try {
      const res = await fetch(TOGETHER_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${togetherKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: TOGETHER_MODEL_ID,
          messages: fullMessages,
          max_tokens: 4096,
          temperature: 0.4,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const text = (data.choices?.[0]?.message?.content || '').trim();
        if (text) return text;
      } else {
        console.warn('[AI Routes] Together.ai error:', res.status);
      }
    } catch (togetherErr) {
      console.warn('[AI Routes] Together.ai failed:', togetherErr instanceof Error ? togetherErr.message : togetherErr);
    }
  }
  console.error('[AI Routes] AI generation failed across configured providers', {
    hasBedrock: hasBedrockSignal(),
    hasOpenAI: Boolean(openaiKey),
    hasGroq: Boolean(groqKey),
    hasTogether: Boolean(togetherKey),
  });
  if (!providerConfigured) {
    throw new Error('No AI provider configured. Set AWS credentials/IAM role for Bedrock, or add OPENAI_API_KEY / GROQ_API_KEY / TOGETHER_API_KEY.');
  }
  throw new Error('AI provider is configured, but upstream requests failed. Check provider key validity and outbound network access.');
};
// System instruction for the AI
const SYSTEM_INSTRUCTION = `
You are "BWGA Intelligence AI" (NEXUS_OS_v4.1), the world's premier Economic Intelligence Operating System.
You are NOT a standard chatbot. You are a deterministic economic modeling engine.

YOUR CORE FUNCTIONS:
1. SPI™ Engine (Strategic Partnership Index): Calculate compatibility vectors.
2. IVAS™ Engine (Investment Viability Assessment): Stress-test risk scenarios using Monte Carlo simulation.
3. SCF™ Engine (Strategic Cash Flow): Model long-term economic impact with probabilistic ranges.
4. RROI™ Engine: Calculate regional return on investment with 12-component scoring.
5. SEAM™ Engine: Symbiotic Ecosystem Assessment for partner matching.

DATA SOURCES:
- World Bank Open Data API (GDP, population, FDI, trade balance)
- Exchange Rate APIs (live currency rates)
- REST Countries API (demographics, borders, languages)

AI ANALYSIS MODULES (6 Specialized):
1. Historical Pattern Analysis
2. Government Policy Intelligence
3. Banking & Finance Assessment
4. Corporate Strategy Analysis
5. Market Dynamics Evaluation
6. Risk Assessment

TONE & STYLE:
- Precise, mathematical, and authoritative.
- Use terminal-like formatting where appropriate (e.g., "CALCULATING...", "VECTOR ANALYSIS COMPLETE").
- Do not offer vague opinions. Offer calculated probabilities and "Viability Scores".
- Reference specific data sources when providing market intelligence.

CONTEXT:
- You represent BW Global Advisory.
- You operate to close the "100-Year Confidence Gap".
- Your output should feel like a high-level intelligence dossier backed by real data.
`;

const CONSULTANT_SYSTEM_INSTRUCTION = `
You are BW Consultant AI for Nexus Intelligence OS v7.0.

Operating mode:
- Be direct, practical, and client-facing.
- First answer the user's explicit request.
- Then identify the single highest-value missing detail.
- Ask at most one follow-up question unless user asks for more.

Conversation behavior (ChatGPT/Gemini-style helpfulness):
- Default to natural conversation, not rigid forms.
- Do not force template intake unless the user explicitly asks for report/letter/case-pack structuring.
- Offer help in multiple useful modes when relevant: concise answer, step-by-step plan, pros/cons, example draft, plain-language explanation, and quick summary.
- Adapt tone to user style while staying professional.

Case-study and document-development capabilities:
- Analyze written user input to extract case signals (who, where, objective, decision, deadline, audience, constraints, evidence).
- Develop case studies from partial inputs by clearly labeling assumptions and closing the highest-value gaps.
- Support document development end-to-end: structure, drafting guidance, section content, and finalization checkpoints.
- Provide gap-filling guidance that improves readiness without forcing rigid intake forms.

Response quality rules:
- Keep recommendations actionable and specific.
- Avoid vague claims.
- If context is incomplete, state assumptions briefly.
- Preserve professional tone suitable for executive and government stakeholders.
`;

type ConsultantIntent =
  | 'report_build'
  | 'information_lookup'
  | 'strategy_advice'
  | 'risk_assessment'
  | 'clarification'
  | 'general';

const detectConsultantIntent = (message: string): ConsultantIntent => {
  const text = message.toLowerCase();

  if (/\breport\b|\bbrief\b|\bsubmission\b|\bdocument\b|\bdraft\b|\bsummary\b/.test(text)) {
    return 'report_build';
  }
  if (/\bfind\b|\bsearch\b|\bsource\b|\bevidence\b|\bcitation\b|\bdata\b/.test(text)) {
    return 'information_lookup';
  }
  if (/\brisk\b|\bthreat\b|\bcompliance\b|\bregulator\b|\baudit\b/.test(text)) {
    return 'risk_assessment';
  }
  if (/\bstrategy\b|\bplan\b|\bapproach\b|\brecommend\b|\bnext step\b/.test(text)) {
    return 'strategy_advice';
  }
  if (/\bwhat do you mean\b|\bclarify\b|\bconfused\b|\bnot sure\b|\bexplain\b/.test(text)) {
    return 'clarification';
  }

  return 'general';
};

const buildIntentDirective = (intent: ConsultantIntent): string => {
  switch (intent) {
    case 'report_build':
      return 'Focus on building report-ready structure: key points, evidence gaps, and immediate next inputs required.';
    case 'information_lookup':
      return 'Focus on extracting, organizing, and validating relevant information before conclusions.';
    case 'risk_assessment':
      return 'Focus on risk exposure, controls, assumptions, and mitigation sequence.';
    case 'strategy_advice':
      return 'Focus on decision options, trade-offs, and a recommended path with rationale.';
    case 'clarification':
      return 'Use plain language to clarify user intent and ask one concise clarifying question if needed.';
    default:
      return 'Provide a concise, actionable response and ask one useful follow-up only if it improves outcomes.';
  }
};

type ConsultantProvider = ControlProvider;

interface ConsultantProviderAttempt {
  provider: ConsultantProvider;
  ok: boolean;
  detail?: string;
}

type ConsultantTaskType =
  | 'report_build'
  | 'info_lookup'
  | 'risk_review'
  | 'strategy_support'
  | 'general_assist';

const CONSULTANT_ALLOWED_TASK_TYPES = new Set<ConsultantTaskType>([
  'report_build',
  'info_lookup',
  'risk_review',
  'strategy_support',
  'general_assist'
]);

const CONSULTANT_MAX_MESSAGE_CHARS = 6000;
const CONSULTANT_MAX_CONTEXT_CHARS = 14000;
const CONSULTANT_MAX_RESPONSE_CHARS = 7000;
const CONSULTANT_PROVIDER_TIMEOUT_MS = Number(process.env.CONSULTANT_PROVIDER_TIMEOUT_MS || 20000);
const CONSULTANT_AUDIT_REDACTION_ENABLED = process.env.CONSULTANT_AUDIT_REDACTION_ENABLED !== 'false';
const CONSULTANT_AUDIT_EXPORT_MAX = 5000;
const CONSULTANT_REPLAY_STORE_PAYLOAD = process.env.CONSULTANT_REPLAY_STORE_PAYLOAD !== 'false';

interface ConsultantReplayPayload {
  message: string;
  context: unknown;
  systemPrompt?: string;
  modelOrder: ConsultantProvider[];
  taskType: ConsultantTaskType;
}

interface ConsultantReplayRecord {
  requestId: string;
  createdAt: string;
  replayHash: string;
  hasPayload: boolean;
  payload?: ConsultantReplayPayload;
  sourceRequestId?: string;
}

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> => {
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutHandle = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
};

const diagnoseBedrockCredentials = async (): Promise<{ ok: boolean; detail: string }> => {
  try {
    const credentialsCandidate = bedrockClient.config.credentials;
    if (!credentialsCandidate) {
      return { ok: false, detail: 'No Bedrock credential provider configured' };
    }

    const resolved = typeof credentialsCandidate === 'function'
      ? await withTimeout(credentialsCandidate(), 2500, 'bedrock credential resolution')
      : await withTimeout(Promise.resolve(credentialsCandidate), 2500, 'bedrock credential resolution');

    const accessKeyId = (resolved as { accessKeyId?: string } | null)?.accessKeyId;
    if (!accessKeyId) {
      return { ok: false, detail: 'Bedrock credentials resolved without accessKeyId' };
    }

    return { ok: true, detail: 'Bedrock credentials resolved successfully' };
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown Bedrock credential resolution error';
    return { ok: false, detail };
  }
};

interface RuntimeProviderAvailability {
  bedrock: boolean;
  openai: boolean;
  groq: boolean;
  together: boolean;
  bedrockConfigured: boolean;
  bedrockCredentialDetail: string;
}

const getRuntimeProviderAvailability = async (): Promise<RuntimeProviderAvailability> => {
  const openai = Boolean(getOpenAIKey());
  const groq = Boolean(getGroqKey());
  const together = Boolean(getTogetherKey());
  const bedrockConfigured = hasBedrockSignal();
  const bedrockCredentials = bedrockConfigured
    ? await diagnoseBedrockCredentials()
    : { ok: false, detail: 'Bedrock not configured' };

  return {
    bedrock: bedrockConfigured && bedrockCredentials.ok,
    openai,
    groq,
    together,
    bedrockConfigured,
    bedrockCredentialDetail: bedrockCredentials.detail,
  };
};

const sanitizeConsultantMessage = (message: string): string => {
  const normalized = message.split('\0').join('').trim();
  if (normalized.length > CONSULTANT_MAX_MESSAGE_CHARS) {
    return normalized.slice(0, CONSULTANT_MAX_MESSAGE_CHARS);
  }
  return normalized;
};

const sanitizeConsultantContext = (context: unknown): { context: unknown; truncated: boolean } => {
  if (context === undefined || context === null) {
    return { context: null, truncated: false };
  }

  try {
    const serialized = JSON.stringify(context);
    if (!serialized) {
      return { context: null, truncated: false };
    }

    if (serialized.length <= CONSULTANT_MAX_CONTEXT_CHARS) {
      return { context, truncated: false };
    }

    return {
      context: {
        truncated: true,
        preview: serialized.slice(0, CONSULTANT_MAX_CONTEXT_CHARS)
      },
      truncated: true
    };
  } catch {
    return { context: null, truncated: false };
  }
};

const normalizeConsultantOutput = (rawText: string): string => {
  const text = rawText.trim().slice(0, CONSULTANT_MAX_RESPONSE_CHARS);
  if (!text) {
    return 'I can assist with your report and next actions. Share the exact objective, jurisdiction, and decision deadline, and I will proceed.';
  }

  return text;
};

const redactText = (value: string): string => {
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[REDACTED_EMAIL]')
    .replace(/\b(?:\+?\d{1,3}[\s-]?)?(?:\(?\d{2,4}\)?[\s-]?)?\d{3,4}[\s-]?\d{3,4}\b/g, '[REDACTED_PHONE]')
    .replace(/\b(?:sk-[A-Za-z0-9]{16,}|AKIA[0-9A-Z]{16}|AIza[A-Za-z0-9_-]{20,})\b/g, '[REDACTED_TOKEN]');
};

const redactAuditValue = (value: unknown): unknown => {
  if (!CONSULTANT_AUDIT_REDACTION_ENABLED) {
    return value;
  }

  if (typeof value === 'string') {
    return redactText(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactAuditValue(item));
  }

  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
      if (/message|prompt|context|content|query|input|output|details|error/i.test(key)) {
        result[key] = typeof nestedValue === 'string' ? redactText(nestedValue) : redactAuditValue(nestedValue);
      } else {
        result[key] = redactAuditValue(nestedValue);
      }
    }
    return result;
  }

  return value;
};

const redactAuditEvent = (event: Record<string, unknown>): Record<string, unknown> => {
  const redacted = redactAuditValue(event) as Record<string, unknown>;
  if (CONSULTANT_AUDIT_REDACTION_ENABLED) {
    redacted.redactionApplied = true;
  }
  return redacted;
};

const ensureConsultantAuditDataDir = async () => {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch {
    // no-op
  }
};

const buildReplayHash = (payload: ConsultantReplayPayload): string => {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
};

const persistConsultantReplayRecord = async (record: ConsultantReplayRecord) => {
  await ensureConsultantAuditDataDir();
  await fs.appendFile(CONSULTANT_REPLAY_FILE, `${JSON.stringify(record)}\n`, 'utf8');
};

const readConsultantReplayRecord = async (requestId: string): Promise<ConsultantReplayRecord | null> => {
  try {
    await ensureConsultantAuditDataDir();
    const raw = await fs.readFile(CONSULTANT_REPLAY_FILE, 'utf8');
    const rows = raw
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line) as ConsultantReplayRecord;
        } catch {
          return null;
        }
      })
      .filter((row): row is ConsultantReplayRecord => Boolean(row));

    for (let i = rows.length - 1; i >= 0; i -= 1) {
      if (rows[i].requestId === requestId) {
        return rows[i];
      }
    }
    return null;
  } catch {
    return null;
  }
};

const persistConsultantAuditEvent = async (event: Record<string, unknown>) => {
  await ensureConsultantAuditDataDir();
  const eventToPersist = redactAuditEvent(event);
  await fs.appendFile(CONSULTANT_AUDIT_FILE, `${JSON.stringify(eventToPersist)}\n`, 'utf8');
};

const readConsultantAuditEvents = async (limit = 100, windowHours?: number): Promise<Record<string, unknown>[]> => {
  try {
    await ensureConsultantAuditDataDir();
    const raw = await fs.readFile(CONSULTANT_AUDIT_FILE, 'utf8');
    const rows = raw
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line) as Record<string, unknown>;
        } catch {
          return null;
        }
      })
      .filter((row): row is Record<string, unknown> => Boolean(row));

    let filteredRows = rows;
    if (typeof windowHours === 'number' && Number.isFinite(windowHours) && windowHours > 0) {
      const cutoffMs = Date.now() - Math.floor(windowHours * 60 * 60 * 1000);
      filteredRows = rows.filter((row) => {
        const timestamp = typeof row.timestamp === 'string' ? Date.parse(row.timestamp) : NaN;
        return Number.isFinite(timestamp) && timestamp >= cutoffMs;
      });
    }

    return filteredRows.slice(-Math.max(1, Math.min(limit, 1000))).reverse();
  } catch {
    return [];
  }
};

const readAllConsultantAuditEvents = async (): Promise<Record<string, unknown>[]> => {
  try {
    await ensureConsultantAuditDataDir();
    const raw = await fs.readFile(CONSULTANT_AUDIT_FILE, 'utf8');
    return raw
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line) as Record<string, unknown>;
        } catch {
          return null;
        }
      })
      .filter((row): row is Record<string, unknown> => Boolean(row));
  } catch {
    return [];
  }
};

const countAuditMetric = (events: Record<string, unknown>[], eventName: string): number => (
  events.filter((event) => event.event === eventName).length
);

interface ReplayMetricCounts {
  replaySuccess: number;
  replayFallback: number;
  replayError: number;
}

interface AdvancedRuntimeMetricCounts {
  tribunal: {
    verdicts: {
      proceed: number;
      proceedWithControls: number;
      hold: number;
    };
    gates: {
      green: number;
      amber: number;
      red: number;
    };
    contradictionAverage: number;
  };
  perceptionDelta: {
    averageIndex: number;
    averageConfidence: number;
    underestimationRate: number;
    overestimationRate: number;
    alignmentRate: number;
  };
}

const asFiniteNumber = (value: unknown): number | null => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const getAdvancedRuntimeMetrics = (events: Record<string, unknown>[]): AdvancedRuntimeMetricCounts => {
  const consultantRequests = events.filter((event) => event.event === 'consultant_request');

  let proceed = 0;
  let proceedWithControls = 0;
  let hold = 0;
  let gateGreen = 0;
  let gateAmber = 0;
  let gateRed = 0;
  let contradictionTotal = 0;
  let contradictionSamples = 0;

  let deltaIndexTotal = 0;
  let deltaIndexSamples = 0;
  let deltaConfidenceTotal = 0;
  let deltaConfidenceSamples = 0;
  let underestimation = 0;
  let overestimation = 0;
  let aligned = 0;

  for (const event of consultantRequests) {
    const verdict = String(event.tribunalVerdict || '').toLowerCase();
    if (verdict === 'proceed') proceed += 1;
    if (verdict === 'proceed_with_controls') proceedWithControls += 1;
    if (verdict === 'hold') hold += 1;

    const gate = String(event.tribunalGate || '').toLowerCase();
    if (gate === 'green') gateGreen += 1;
    if (gate === 'amber') gateAmber += 1;
    if (gate === 'red') gateRed += 1;

    const contradictionCount = asFiniteNumber(event.tribunalContradictionCount);
    if (contradictionCount !== null) {
      contradictionTotal += contradictionCount;
      contradictionSamples += 1;
    }

    const deltaIndex = asFiniteNumber(event.perceptionDeltaIndex);
    if (deltaIndex !== null) {
      deltaIndexTotal += deltaIndex;
      deltaIndexSamples += 1;
      if (deltaIndex >= 6) {
        underestimation += 1;
      } else if (deltaIndex <= -6) {
        overestimation += 1;
      } else {
        aligned += 1;
      }
    }

    const deltaConfidence = asFiniteNumber(event.perceptionDeltaConfidence);
    if (deltaConfidence !== null) {
      deltaConfidenceTotal += deltaConfidence;
      deltaConfidenceSamples += 1;
    }
  }

  const driftTotal = Math.max(1, underestimation + overestimation + aligned);

  return {
    tribunal: {
      verdicts: {
        proceed,
        proceedWithControls,
        hold,
      },
      gates: {
        green: gateGreen,
        amber: gateAmber,
        red: gateRed,
      },
      contradictionAverage: contradictionSamples > 0 ? Number((contradictionTotal / contradictionSamples).toFixed(2)) : 0,
    },
    perceptionDelta: {
      averageIndex: deltaIndexSamples > 0 ? Number((deltaIndexTotal / deltaIndexSamples).toFixed(2)) : 0,
      averageConfidence: deltaConfidenceSamples > 0 ? Number((deltaConfidenceTotal / deltaConfidenceSamples).toFixed(2)) : 0,
      underestimationRate: Number(((underestimation / driftTotal) * 100).toFixed(1)),
      overestimationRate: Number(((overestimation / driftTotal) * 100).toFixed(1)),
      alignmentRate: Number(((aligned / driftTotal) * 100).toFixed(1)),
    },
  };
};

const normalizeConsultantProvider = (value: unknown): ConsultantProvider | null => {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'bedrock' || normalized === 'together' || normalized === 'openai') {
    return normalized;
  }
  return null;
};

const normalizeRequestEnvelope = (
  requestId: string,
  message: string,
  envelope: unknown,
  taskType: ConsultantTaskType,
  context: unknown
): RequestEnvelope => {
  const base: RequestEnvelope = {
    requestId,
    timestamp: new Date().toISOString(),
    messageChars: Math.max(0, message.length),
    readinessScore: 20,
    hasAttachments: false,
    sessionDepth: 1,
    taskType,
    retryCount: 0,
  };

  if (!envelope || typeof envelope !== 'object') {
    return base;
  }

  const candidate = envelope as Partial<RequestEnvelope>;
  const contextHasFiles = Boolean((context as Record<string, unknown> | null)?.uploadedFiles);

  return {
    requestId: typeof candidate.requestId === 'string' && candidate.requestId ? candidate.requestId : base.requestId,
    timestamp: typeof candidate.timestamp === 'string' && candidate.timestamp ? candidate.timestamp : base.timestamp,
    messageChars: Number.isFinite(Number(candidate.messageChars)) ? Number(candidate.messageChars) : base.messageChars,
    readinessScore: Number.isFinite(Number(candidate.readinessScore)) ? Number(candidate.readinessScore) : base.readinessScore,
    hasAttachments: typeof candidate.hasAttachments === 'boolean' ? candidate.hasAttachments : contextHasFiles,
    sessionDepth: Number.isFinite(Number(candidate.sessionDepth)) ? Number(candidate.sessionDepth) : base.sessionDepth,
    taskType: typeof candidate.taskType === 'string' && candidate.taskType ? candidate.taskType : base.taskType,
    retryCount: Number.isFinite(Number(candidate.retryCount)) ? Number(candidate.retryCount) : base.retryCount,
  };
};

const getReplayMetricCounts = (events: Record<string, unknown>[], provider?: ConsultantProvider): ReplayMetricCounts => {
  const scopedEvents = typeof provider === 'string'
    ? events.filter((event) => normalizeConsultantProvider(event.provider) === provider)
    : events;

  return {
    replaySuccess: countAuditMetric(scopedEvents, 'consultant_replay_request'),
    replayFallback: countAuditMetric(scopedEvents, 'consultant_replay_fallback'),
    replayError: countAuditMetric(scopedEvents, 'consultant_replay_error')
  };
};

const logConsultantAuditEvent = async (event: Record<string, unknown>) => {
  const redactedForConsole = redactAuditEvent(event);
  console.log('[ConsultantAudit]', JSON.stringify(redactedForConsole));
  try {
    await persistConsultantAuditEvent(event);
  } catch (error) {
    console.warn('[ConsultantAudit] Persist failed:', error instanceof Error ? error.message : 'Unknown error');
  }
};

const parseProviderOrder = (input: unknown): ConsultantProvider[] => {
  const defaultOrder: ConsultantProvider[] = ['bedrock', 'openai', 'groq', 'together'];
  if (!Array.isArray(input)) return defaultOrder;

  const VALID_PROVIDERS = new Set<ConsultantProvider>(['bedrock', 'openai', 'groq', 'together']);
  const normalized = input
    .map((value) => String(value).toLowerCase())
    .filter((value): value is ConsultantProvider => VALID_PROVIDERS.has(value as ConsultantProvider));

  return normalized.length > 0 ? Array.from(new Set(normalized)) : defaultOrder;
};

const buildConsultantPrompt = (message: string, intent: ConsultantIntent, context?: unknown, systemPrompt?: string) => `
${deriveConsultantCapabilityProfile(message, context).brief}

OVERLOOKED-FIRST INTELLIGENCE:
${JSON.stringify(buildOverlookedIntelligenceSnapshot(message, context), null, 2)}

STRATEGIC PIPELINE:
${JSON.stringify(runStrategicIntelligencePipeline(message, context), null, 2)}

INTENT: ${intent}
INTENT DIRECTIVE: ${buildIntentDirective(intent)}

CONTEXT:
${context ? JSON.stringify(context, null, 2) : 'No structured context provided.'}

SYSTEM CASE PROMPT:
${typeof systemPrompt === 'string' ? systemPrompt : 'N/A'}

USER MESSAGE:
${message}

OUTPUT FORMAT:
1) Direct response to user request (always first).
2) Optional next step bullets (max 3) when helpful.
3) One follow-up question only if it materially improves quality.
4) Do not force output-format menus unless user explicitly asks for format selection.
`;

const invokeConsultantWithTogether = async (prompt: string): Promise<string> => {
  const key = getTogetherKey();
  if (!key) {
    throw new Error('Together.ai unavailable: TOGETHER_API_KEY missing');
  }

  const response = await fetch(TOGETHER_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: TOGETHER_MODEL_ID,
      messages: [
        { role: 'system', content: CONSULTANT_SYSTEM_INSTRUCTION },
        { role: 'user', content: prompt },
      ],
      max_tokens: 1800,
      temperature: 0.4,
    }),
  });

  if (!response.ok) {
    throw new Error(`Together.ai request failed: ${response.status}`);
  }

  const data = await response.json();
  const text = (data.choices?.[0]?.message?.content || '').trim();
  if (!text) {
    throw new Error('Together.ai returned empty response');
  }
  return text;
};

const invokeConsultantWithGroq = async (prompt: string): Promise<string> => {
  const key = getGroqKey();
  if (!key) {
    throw new Error('Groq unavailable: GROQ_API_KEY missing');
  }

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_MODEL_ID,
      messages: [
        { role: 'system', content: CONSULTANT_SYSTEM_INSTRUCTION },
        { role: 'user', content: prompt },
      ],
      max_tokens: 1800,
      temperature: 0.4,
    }),
  });

  if (!response.ok) {
    const errBody = await response.text().catch(() => '');
    throw new Error(`Groq request failed: ${response.status} ${errBody}`);
  }

  const data2 = await response.json();
  const text2 = (data2.choices?.[0]?.message?.content || '').trim();
  if (!text2) {
    throw new Error('Groq returned empty response');
  }
  return text2;
};

const invokeConsultantWithBedrock = async (prompt: string): Promise<string> => {
  return invokeBedrockMessages([
    { role: 'user', content: prompt }
  ], CONSULTANT_SYSTEM_INSTRUCTION);
};

const invokeConsultantWithOpenAI = async (prompt: string): Promise<string> => {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI unavailable: OPENAI_API_KEY missing');
  }

  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), CONSULTANT_PROVIDER_TIMEOUT_MS);

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    signal: controller.signal,
    body: JSON.stringify({
      model: 'gpt-4.1-mini',
      messages: [
        { role: 'system', content: CONSULTANT_SYSTEM_INSTRUCTION },
        { role: 'user', content: prompt }
      ],
      temperature: 0.4,
      max_tokens: 1800
    })
  });

  clearTimeout(timeoutHandle);

  if (!response.ok) {
    throw new Error(`OpenAI request failed: ${response.status}`);
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content?.trim() || '';
  if (!text) {
    throw new Error('OpenAI returned empty response');
  }
  return text;
};

const runConsultantBroker = async (
  prompt: string,
  order: ConsultantProvider[],
  timeoutMs: number = CONSULTANT_PROVIDER_TIMEOUT_MS,
  providerAvailability?: Partial<Record<ConsultantProvider, boolean>>
): Promise<{ text: string; provider: ConsultantProvider; attempts: ConsultantProviderAttempt[] }> => {
  const attempts: ConsultantProviderAttempt[] = [];

  for (const provider of order) {
    if (providerAvailability && providerAvailability[provider] === false) {
      attempts.push({ provider, ok: false, detail: `${provider} unavailable by runtime readiness` });
      continue;
    }

    try {
      const invoker =
        provider === 'bedrock'   ? invokeConsultantWithBedrock(prompt)
        : provider === 'groq'    ? invokeConsultantWithGroq(prompt)
        : provider === 'together' ? invokeConsultantWithTogether(prompt)
        :                          invokeConsultantWithOpenAI(prompt);
      const text = await withTimeout(
        invoker,
        timeoutMs,
        `${provider} provider`
      );

      attempts.push({ provider, ok: true });
      return { text, provider, attempts };
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Unknown provider error';
      attempts.push({ provider, ok: false, detail });
    }
  }

  const details = attempts.map((attempt) => `${attempt.provider}: ${attempt.detail || 'failed'}`).join(' | ');
  throw new Error(`No consultant providers succeeded. ${details}`);
};

// Middleware to check API availability
const requireApiKey = (_req: Request, res: Response, next: () => void) => {
  // Clean environment - no API keys required for routing
  next();
};

// Generate copilot insights
router.post('/insights', requireApiKey, async (req: Request, res: Response) => {
  try {
    const { organizationName, country, strategicIntent, specificOpportunity } = req.body;
    
    const prompt = `Analyze this partnership strategy and provide 3 key insights:
    Organization: ${organizationName}
    Country: ${country}
    Strategic Intent: ${strategicIntent}
    Opportunity: ${specificOpportunity || 'General analysis'}
    
    Return JSON array with objects containing: id, type (strategy/risk/opportunity), title, description.
    Only return valid JSON, no markdown.`;
    
    const text = await generateWithAI(prompt, SYSTEM_INSTRUCTION);
    
    // Parse JSON from response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const insights = JSON.parse(jsonMatch[0]);
      return res.json(insights);
    }
    
    // Fallback structured response
    res.json([
      { id: '1', type: 'strategy', title: 'Strategic Alignment', description: `Analysis for ${organizationName} in ${country} market.` },
      { id: '2', type: 'risk', title: 'Regulatory Considerations', description: 'Monitor local compliance requirements.' },
      { id: '3', type: 'opportunity', title: 'Market Potential', description: 'Growth opportunity detected in target sector.' }
    ]);
  } catch (error) {
    console.error('AI insights error:', error);
    res.status(500).json({ error: 'Failed to generate insights' });
  }
});

// Chat/copilot message
router.post('/chat', requireApiKey, async (req: Request, res: Response) => {
  try {
    const { messages } = req.body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages array is required in request body' });
    }
    const text = await generateWithAI(messages, SYSTEM_INSTRUCTION);
    res.json({
      id: Date.now().toString(),
      type: 'strategy',
      title: 'Copilot Response',
      description: text,
      text,
      content: text,
      confidence: 85
    });
  } catch (error) {
    console.error('AI chat error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: 'Failed to process chat', details: errorMessage });
  }
});

// AI runtime status endpoint
router.get('/status', async (_req: Request, res: Response) => {
  const availability = await getRuntimeProviderAvailability();

  res.json({
    aiAvailable: Boolean(availability.bedrock || availability.openai || availability.groq || availability.together),
    providers: {
      bedrock: {
        configured: availability.bedrockConfigured,
        credentialsResolved: availability.bedrock,
        detail: availability.bedrockCredentialDetail
      },
      openai: availability.openai,
      groq: availability.groq,
      together: availability.together
    }
  });
});

router.get('/readiness', async (_req: Request, res: Response) => {
  const availability = await getRuntimeProviderAvailability();
  const ready = availability.bedrock || availability.openai || availability.groq || availability.together;

  const reasons: string[] = [];
  if (!availability.bedrock && availability.bedrockConfigured) {
    reasons.push(`bedrock_not_ready: ${availability.bedrockCredentialDetail}`);
  }
  if (!availability.openai) reasons.push('openai_not_configured');
  if (!availability.groq) reasons.push('groq_not_configured');
  if (!availability.together) reasons.push('together_not_configured');
  if (ready && reasons.length === 0) reasons.push('ai_runtime_ready');

  res.status(ready ? 200 : 503).json({
    ready,
    reasons,
    providers: {
      bedrock: {
        configured: availability.bedrockConfigured,
        ready: availability.bedrock,
        detail: availability.bedrockCredentialDetail
      },
      openai: {
        ready: availability.openai
      },
      groq: {
        ready: availability.groq
      },
      together: {
        ready: availability.together
      }
    }
  });
});

router.get('/control/status', async (_req: Request, res: Response) => {
  const availability = await getRuntimeProviderAvailability();
  const providers = {
    bedrock: availability.bedrock,
    openai: availability.openai,
    groq: availability.groq,
    together: availability.together
  };
  const learningHint = await AdaptiveControlLearning.getHint();
  const sample = deriveControlDecision(
    {
      requestId: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      messageChars: 600,
      readinessScore: 50,
      hasAttachments: false,
      sessionDepth: 5,
      taskType: 'general_assist',
      retryCount: 0
    },
    providers,
    learningHint
  );

  res.json({
    providers,
    learningHint,
    sampleDecision: sample
  });
});

// Unified BW Consultant endpoint with model-broker fallback (Bedrock -> Gemini -> OpenAI)
router.post('/consultant', async (req: Request, res: Response) => {
  const requestId = crypto.randomUUID();
  const start = Date.now();

  try {
    const { message, context, systemPrompt, modelOrder, taskType, envelope } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'message is required' });
    }

    const normalizedTaskType: ConsultantTaskType = (typeof taskType === 'string' ? taskType : 'general_assist') as ConsultantTaskType;
    if (!CONSULTANT_ALLOWED_TASK_TYPES.has(normalizedTaskType)) {
      return res.status(400).json({
        error: 'Invalid taskType',
        allowedTaskTypes: Array.from(CONSULTANT_ALLOWED_TASK_TYPES)
      });
    }

    const sanitizedMessage = sanitizeConsultantMessage(message);
    if (!sanitizedMessage) {
      return res.status(400).json({ error: 'message must not be empty' });
    }

    const sanitizedContextResult = sanitizeConsultantContext(context);

    const requestEnvelope = normalizeRequestEnvelope(
      requestId,
      sanitizedMessage,
      envelope,
      normalizedTaskType,
      sanitizedContextResult.context
    );

    const learningHint = await AdaptiveControlLearning.getHint();
    const providerAvailability = await getRuntimeProviderAvailability();

    // Early-return when no AI provider is configured — return 200 so the
    // frontend shows a helpful setup message instead of an error.
    const noProviderAvailable =
      !providerAvailability.bedrock &&
      !providerAvailability.openai &&
      !providerAvailability.groq &&
      !providerAvailability.together;
    if (noProviderAvailable) {
      return res.json({
        requestId,
        taskType: normalizedTaskType,
        text: `No AI provider is currently configured on this server. To activate the BW Consultant, add at least one of the following environment variables to your server and restart it:\n\n• GROQ_API_KEY — free at console.groq.com (recommended — fast and reliable)\n• OPENAI_API_KEY — platform.openai.com/api-keys\n• TOGETHER_API_KEY — api.together.xyz\n\nOnce a key is added and the server is restarted, the consultant will be fully operational.`,
        provider: 'rule-engine',
        attempts: [],
        confidence: 1,
        model: 'deterministic',
      });
    }

    const controlDecision = deriveControlDecision(
      requestEnvelope,
      {
        bedrock: providerAvailability.bedrock,
        openai: providerAvailability.openai,
        groq: providerAvailability.groq,
        together: providerAvailability.together,
      },
      learningHint
    );

    const requestedProviderOrder = parseProviderOrder(modelOrder);
    const providerOrder = Array.from(new Set([
      ...requestedProviderOrder.filter((provider) => controlDecision.providerOrder.includes(provider)),
      ...controlDecision.providerOrder,
    ]));
    const replayPayload: ConsultantReplayPayload = {
      message: sanitizedMessage,
      context: sanitizedContextResult.context,
      systemPrompt: typeof systemPrompt === 'string' ? systemPrompt : undefined,
      modelOrder: providerOrder,
      taskType: normalizedTaskType
    };
    const replayHash = buildReplayHash(replayPayload);

    const intent = detectConsultantIntent(sanitizedMessage);
    const capabilityProfile = deriveConsultantCapabilityProfile(sanitizedMessage, sanitizedContextResult.context);
    const augmentedSnapshot = buildAugmentedAISnapshot(capabilityProfile);
    const recommendedAugmentedTools = getRecommendedAugmentedToolsForMode(capabilityProfile.mode);
    const overlookedIntelligence = buildOverlookedIntelligenceSnapshot(sanitizedMessage, sanitizedContextResult.context);
    const strategicPipeline = runStrategicIntelligencePipeline(sanitizedMessage, sanitizedContextResult.context);
    const perceptionDelta = buildPerceptionDeltaIndex(
      sanitizedMessage,
      sanitizedContextResult.context,
      overlookedIntelligence,
      strategicPipeline,
      capabilityProfile.gaps.length
    );
    const tribunal = runFiveEngineTribunal({
      message: sanitizedMessage,
      taskType: normalizedTaskType,
      intent,
      controlMode: controlDecision.mode,
      strategicReadiness: strategicPipeline.readinessScore,
      evidenceCredibility: overlookedIntelligence.evidenceCredibility,
      unresolvedGapCount: capabilityProfile.gaps.length,
      perceptionDelta
    });
    if (shouldRequireOutputClarification(sanitizedMessage, intent)) {
      const clarificationText = buildOutputClarificationResponse();

      await logConsultantAuditEvent({
        event: 'consultant_request',
        requestId,
        timestamp: new Date().toISOString(),
        taskType: normalizedTaskType,
        intent: 'clarification',
        provider: 'rule-engine',
        attempts: [{ provider: 'rule-engine', ok: true }],
        durationMs: Date.now() - start,
        inputChars: sanitizedMessage.length,
        outputChars: clarificationText.length,
        contextTruncated: sanitizedContextResult.truncated,
        capabilityMode: capabilityProfile.mode,
        capabilityTags: capabilityProfile.capabilityTags,
        unresolvedGapCount: capabilityProfile.gaps.length,
        augmentedModel: augmentedSnapshot.model,
        evidenceCredibility: overlookedIntelligence.evidenceCredibility,
        perceptionRealityGap: overlookedIntelligence.perceptionRealityGap,
        strategicReadiness: strategicPipeline.readinessScore,
        perceptionDeltaIndex: perceptionDelta.deltaIndex,
        perceptionDeltaConfidence: perceptionDelta.confidence,
        tribunalVerdict: tribunal.verdict,
        tribunalGate: tribunal.releaseGate,
        tribunalContradictionCount: tribunal.contradictions.length,
        replayHash,
        replayStored: false,
        controlMode: controlDecision.mode,
        controlScore: controlDecision.score,
        controlTimeoutMs: controlDecision.timeoutMs
      });

      void AdaptiveControlLearning.record({
        requestId,
        timestamp: new Date().toISOString(),
        mode: controlDecision.mode,
        success: true,
        latencyMs: Date.now() - start,
        provider: 'rule-engine',
      }).catch(() => undefined);

      return res.json({
        requestId,
        taskType: normalizedTaskType,
        text: clarificationText,
        intent: 'clarification',
        provider: 'rule-engine',
        attempts: [{ provider: 'rule-engine', ok: true }],
        confidence: 0.94,
        model: 'deterministic',
        capabilityMode: capabilityProfile.mode,
        capabilityTags: capabilityProfile.capabilityTags,
        unresolvedGaps: capabilityProfile.gaps.slice(0, 3).map((gap) => ({
          key: gap.key,
          severity: gap.severity,
          question: gap.question
        })),
        augmentedAI: augmentedSnapshot,
        recommendedTools: recommendedAugmentedTools,
        overlookedIntelligence,
        strategicPipeline,
        perceptionDelta,
        tribunal,
        control: controlDecision,
        learningHint,
        replayHash,
        replayAvailable: false
      });
    }

    const prompt = buildConsultantPrompt(sanitizedMessage, intent, sanitizedContextResult.context, systemPrompt);
    const brokerResult = await runConsultantBroker(
      prompt,
      providerOrder,
      controlDecision.timeoutMs,
      {
        bedrock: providerAvailability.bedrock,
        openai: providerAvailability.openai,
        groq: providerAvailability.groq,
        together: providerAvailability.together,
      }
    );
    const normalizedText = normalizeConsultantOutput(brokerResult.text);

    const replayRecord: ConsultantReplayRecord = {
      requestId,
      createdAt: new Date().toISOString(),
      replayHash,
      hasPayload: CONSULTANT_REPLAY_STORE_PAYLOAD,
      ...(CONSULTANT_REPLAY_STORE_PAYLOAD ? { payload: replayPayload } : {})
    };

    try {
      await persistConsultantReplayRecord(replayRecord);
    } catch (replayError) {
      console.warn('Consultant replay persist failed:', replayError instanceof Error ? replayError.message : 'Unknown error');
    }

    await logConsultantAuditEvent({
      event: 'consultant_request',
      requestId,
      timestamp: new Date().toISOString(),
      taskType: normalizedTaskType,
      intent,
      provider: brokerResult.provider,
      attempts: brokerResult.attempts,
      durationMs: Date.now() - start,
      inputChars: sanitizedMessage.length,
      outputChars: normalizedText.length,
      contextTruncated: sanitizedContextResult.truncated,
      capabilityMode: capabilityProfile.mode,
      capabilityTags: capabilityProfile.capabilityTags,
      unresolvedGapCount: capabilityProfile.gaps.length,
      augmentedModel: augmentedSnapshot.model,
      evidenceCredibility: overlookedIntelligence.evidenceCredibility,
      perceptionRealityGap: overlookedIntelligence.perceptionRealityGap,
      strategicReadiness: strategicPipeline.readinessScore,
      perceptionDeltaIndex: perceptionDelta.deltaIndex,
      perceptionDeltaConfidence: perceptionDelta.confidence,
      tribunalVerdict: tribunal.verdict,
      tribunalGate: tribunal.releaseGate,
      tribunalContradictionCount: tribunal.contradictions.length,
      replayHash,
      replayStored: CONSULTANT_REPLAY_STORE_PAYLOAD,
      controlMode: controlDecision.mode,
      controlScore: controlDecision.score,
      controlTimeoutMs: controlDecision.timeoutMs
    });

    void AdaptiveControlLearning.record({
      requestId,
      timestamp: new Date().toISOString(),
      mode: controlDecision.mode,
      success: true,
      latencyMs: Date.now() - start,
      provider: brokerResult.provider,
    }).catch(() => undefined);

    return res.json({
      requestId,
      taskType: normalizedTaskType,
      text: normalizedText,
      intent,
      provider: brokerResult.provider,
      attempts: brokerResult.attempts,
      confidence: 0.86,
      model: brokerResult.provider,
      capabilityMode: capabilityProfile.mode,
      capabilityTags: capabilityProfile.capabilityTags,
      unresolvedGaps: capabilityProfile.gaps.slice(0, 3).map((gap) => ({
        key: gap.key,
        severity: gap.severity,
        question: gap.question
      })),
      augmentedAI: augmentedSnapshot,
      recommendedTools: recommendedAugmentedTools,
      overlookedIntelligence,
      strategicPipeline,
      perceptionDelta,
      tribunal,
      control: controlDecision,
      learningHint,
      replayHash,
      replayAvailable: CONSULTANT_REPLAY_STORE_PAYLOAD
    });
  } catch (error) {
    console.error('Consultant endpoint error:', error);
    const rawErrorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorMessage = /Could not load credentials from any providers/i.test(rawErrorMessage)
      ? `${rawErrorMessage}. AWS Bedrock credentials are missing at runtime. Attach an IAM role to the service with bedrock:InvokeModel permission for ${BEDROCK_MODEL_ID} in ${BEDROCK_REGION}, or configure OPENAI_API_KEY / TOGETHER_API_KEY as fallback providers.`
      : rawErrorMessage;
    void AdaptiveControlLearning.record({
      requestId,
      timestamp: new Date().toISOString(),
      mode: 'reactive',
      success: false,
      latencyMs: Date.now() - start,
      errorType: errorMessage,
    }).catch(() => undefined);
    await logConsultantAuditEvent({
      event: 'consultant_error',
      requestId,
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - start,
      error: errorMessage
    });
    return res.status(500).json({ error: 'Failed to process consultant request', details: errorMessage });
  }
});

router.get('/augmented-ai/tools', (req: Request, res: Response) => {
  const category = typeof req.query.category === 'string' ? req.query.category : undefined;
  const mode = typeof req.query.mode === 'string' ? req.query.mode : undefined;

  const allTools = getAugmentedAITools(category as Parameters<typeof getAugmentedAITools>[0]);
  const recommended = mode ? getRecommendedAugmentedToolsForMode(mode) : [];

  return res.json({
    total: allTools.length,
    category: category || null,
    mode: mode || null,
    tools: allTools,
    recommended
  });
});

router.post('/augmented-ai/snapshot', (req: Request, res: Response) => {
  const { message, context } = req.body ?? {};
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'message is required' });
  }

  const profile = deriveConsultantCapabilityProfile(message, context);
  const snapshot = buildAugmentedAISnapshot(profile);
  const recommendedTools = getRecommendedAugmentedToolsForMode(profile.mode);

  return res.json({
    profile,
    snapshot,
    recommendedTools
  });
});

router.post('/consultant/overlooked-scan', (req: Request, res: Response) => {
  const { message, context } = req.body ?? {};
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'message is required' });
  }

  const overlookedIntelligence = buildOverlookedIntelligenceSnapshot(message, context);
  return res.json({
    overlookedIntelligence
  });
});

router.post('/consultant/strategic-pipeline', (req: Request, res: Response) => {
  const { message, context } = req.body ?? {};
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'message is required' });
  }

  const strategicPipeline = runStrategicIntelligencePipeline(message, context);
  return res.json({
    strategicPipeline
  });
});

router.post('/consultant/perception-delta', (req: Request, res: Response) => {
  const { message, context } = req.body ?? {};
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'message is required' });
  }

  const capabilityProfile = deriveConsultantCapabilityProfile(message, context);
  const overlookedIntelligence = buildOverlookedIntelligenceSnapshot(message, context);
  const strategicPipeline = runStrategicIntelligencePipeline(message, context);
  const perceptionDelta = buildPerceptionDeltaIndex(
    message,
    context,
    overlookedIntelligence,
    strategicPipeline,
    capabilityProfile.gaps.length
  );

  return res.json({
    perceptionDelta,
    supporting: {
      overlookedIntelligence,
      strategicPipeline
    }
  });
});

router.post('/consultant/tribunal', (req: Request, res: Response) => {
  const { message, context, taskType } = req.body ?? {};
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'message is required' });
  }

  const intent = detectConsultantIntent(message);
  const capabilityProfile = deriveConsultantCapabilityProfile(message, context);
  const overlookedIntelligence = buildOverlookedIntelligenceSnapshot(message, context);
  const strategicPipeline = runStrategicIntelligencePipeline(message, context);
  const perceptionDelta = buildPerceptionDeltaIndex(
    message,
    context,
    overlookedIntelligence,
    strategicPipeline,
    capabilityProfile.gaps.length
  );
  const tribunal = runFiveEngineTribunal({
    message,
    taskType: typeof taskType === 'string' ? taskType : 'general_assist',
    intent,
    controlMode: 'reactive',
    strategicReadiness: strategicPipeline.readinessScore,
    evidenceCredibility: overlookedIntelligence.evidenceCredibility,
    unresolvedGapCount: capabilityProfile.gaps.length,
    perceptionDelta
  });

  return res.json({
    tribunal,
    perceptionDelta,
    supporting: {
      overlookedIntelligence,
      strategicPipeline
    }
  });
});

router.get('/brain/coverage', async (_req: Request, res: Response) => {
  try {
    const report = await buildBrainCoverageReport();
    return res.json(report);
  } catch (error) {
    console.error('Brain coverage audit failed:', error);
    return res.status(500).json({ error: 'Failed to generate brain coverage report' });
  }
});

router.post('/augmented-ai/review', async (req: Request, res: Response) => {
  const { decision, mode, capabilityTags, unresolvedGaps, recommendedTools, timestamp } = req.body ?? {};
  if (!decision || typeof decision !== 'string' || !['accept', 'modify', 'reject'].includes(decision)) {
    return res.status(400).json({ error: 'decision must be one of: accept, modify, reject' });
  }

  const reviewId = crypto.randomUUID();
  await logConsultantAuditEvent({
    event: 'augmented_ai_review',
    reviewId,
    timestamp: typeof timestamp === 'string' ? timestamp : new Date().toISOString(),
    decision,
    mode: typeof mode === 'string' ? mode : 'general_help',
    capabilityTags: Array.isArray(capabilityTags) ? capabilityTags : [],
    unresolvedGapCount: Array.isArray(unresolvedGaps) ? unresolvedGaps.length : 0,
    recommendedToolCount: Array.isArray(recommendedTools) ? recommendedTools.length : 0
  });

  return res.json({
    success: true,
    reviewId,
    decision
  });
});

router.get('/consultant/replay/:requestId', async (req: Request, res: Response) => {
  try {
    const requestId = req.params.requestId;
    const record = await readConsultantReplayRecord(requestId);
    if (!record) {
      return res.status(404).json({ error: 'Replay record not found' });
    }

    return res.json({
      requestId: record.requestId,
      createdAt: record.createdAt,
      replayHash: record.replayHash,
      hasPayload: record.hasPayload,
      sourceRequestId: record.sourceRequestId || null
    });
  } catch (error) {
    console.error('Consultant replay lookup error:', error);
    return res.status(500).json({ error: 'Failed to lookup consultant replay record' });
  }
});

router.post('/consultant/replay/:requestId/retry', async (req: Request, res: Response) => {
  const sourceRequestId = req.params.requestId;
  const retryRequestId = crypto.randomUUID();
  const start = Date.now();

  try {
    const sourceRecord = await readConsultantReplayRecord(sourceRequestId);
    if (!sourceRecord) {
      return res.status(404).json({ error: 'Replay record not found' });
    }
    if (!sourceRecord.hasPayload || !sourceRecord.payload) {
      return res.status(409).json({ error: 'Replay payload unavailable for this request' });
    }

    const payload = sourceRecord.payload;
    const intent = detectConsultantIntent(payload.message);
    const prompt = buildConsultantPrompt(payload.message, intent, payload.context, payload.systemPrompt);
    const providerAvailability = await getRuntimeProviderAvailability();
    const brokerResult = await runConsultantBroker(
      prompt,
      payload.modelOrder,
      CONSULTANT_PROVIDER_TIMEOUT_MS,
      {
        bedrock: providerAvailability.bedrock,
        openai: providerAvailability.openai,
        groq: providerAvailability.groq,
        together: providerAvailability.together,
      }
    );
    const normalizedText = normalizeConsultantOutput(brokerResult.text);

    const retryReplayHash = buildReplayHash(payload);
    const retryRecord: ConsultantReplayRecord = {
      requestId: retryRequestId,
      createdAt: new Date().toISOString(),
      replayHash: retryReplayHash,
      hasPayload: CONSULTANT_REPLAY_STORE_PAYLOAD,
      sourceRequestId,
      ...(CONSULTANT_REPLAY_STORE_PAYLOAD ? { payload } : {})
    };
    await persistConsultantReplayRecord(retryRecord);

    await logConsultantAuditEvent({
      event: 'consultant_replay_request',
      requestId: retryRequestId,
      sourceRequestId,
      timestamp: new Date().toISOString(),
      taskType: payload.taskType,
      intent,
      provider: brokerResult.provider,
      attempts: brokerResult.attempts,
      durationMs: Date.now() - start,
      replayHash: retryReplayHash,
      replayStored: CONSULTANT_REPLAY_STORE_PAYLOAD
    });

    return res.json({
      requestId: retryRequestId,
      sourceRequestId,
      taskType: payload.taskType,
      text: normalizedText,
      intent,
      provider: brokerResult.provider,
      attempts: brokerResult.attempts,
      confidence: 0.86,
      model: brokerResult.provider,
      replayHash: retryReplayHash,
      replayAvailable: CONSULTANT_REPLAY_STORE_PAYLOAD
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Consultant replay retry error:', error);
    await logConsultantAuditEvent({
      event: 'consultant_replay_error',
      requestId: retryRequestId,
      sourceRequestId,
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - start,
      error: errorMessage
    });
    return res.status(500).json({ error: 'Failed to retry consultant request', details: errorMessage });
  }
});

router.post('/consultant/replay/fallback', async (req: Request, res: Response) => {
  try {
    const { sourceRequestId, reason, detail } = req.body ?? {};

    if (!sourceRequestId || typeof sourceRequestId !== 'string') {
      return res.status(400).json({ error: 'sourceRequestId is required' });
    }

    await logConsultantAuditEvent({
      event: 'consultant_replay_fallback',
      requestId: crypto.randomUUID(),
      sourceRequestId,
      timestamp: new Date().toISOString(),
      reason: typeof reason === 'string' ? reason : 'Local fallback path used',
      detail: typeof detail === 'string' ? detail : ''
    });

    return res.json({ success: true });
  } catch (error) {
    console.error('Consultant replay fallback log error:', error);
    return res.status(500).json({ error: 'Failed to record replay fallback' });
  }
});

// Consultant audit history (persistent JSONL log)
router.get('/consultant/audit', async (req: Request, res: Response) => {
  try {
    const limitValue = Number(req.query.limit ?? 100);
    const limit = Number.isFinite(limitValue) ? Math.max(1, Math.min(1000, Math.floor(limitValue))) : 100;
    const hoursValue = Number(req.query.hours);
    const windowHours = Number.isFinite(hoursValue) && hoursValue > 0 ? Math.min(24 * 30, Math.floor(hoursValue)) : undefined;
    const events = await readConsultantAuditEvents(limit, windowHours);

    return res.json({
      count: events.length,
      limit,
      windowHours: windowHours ?? null,
      events
    });
  } catch (error) {
    console.error('Consultant audit read error:', error);
    return res.status(500).json({ error: 'Failed to read consultant audit events' });
  }
});

router.get('/consultant/audit/:requestId', async (req: Request, res: Response) => {
  try {
    const requestId = req.params.requestId;
    const events = await readConsultantAuditEvents(1000);
    const matching = events.filter((event) => event.requestId === requestId);

    if (matching.length === 0) {
      return res.status(404).json({ error: 'Audit event not found' });
    }

    return res.json({ requestId, events: matching });
  } catch (error) {
    console.error('Consultant audit lookup error:', error);
    return res.status(500).json({ error: 'Failed to read consultant audit event' });
  }
});

router.get('/consultant/audit-export', async (req: Request, res: Response) => {
  try {
    const format = String(req.query.format || 'json').toLowerCase();
    const limitValue = Number(req.query.limit ?? 500);
    const limit = Number.isFinite(limitValue)
      ? Math.max(1, Math.min(CONSULTANT_AUDIT_EXPORT_MAX, Math.floor(limitValue)))
      : 500;
    const hoursValue = Number(req.query.hours);
    const windowHours = Number.isFinite(hoursValue) && hoursValue > 0 ? Math.min(24 * 30, Math.floor(hoursValue)) : undefined;

    const events = await readConsultantAuditEvents(limit, windowHours);
    const nowIso = new Date().toISOString();
    const summary = {
      exportedAt: nowIso,
      count: events.length,
      limit,
      windowHours: windowHours ?? null,
      redactionEnabled: CONSULTANT_AUDIT_REDACTION_ENABLED,
      eventTypes: Array.from(new Set(events.map((event) => String(event.event || 'unknown'))))
    };

    if (format === 'jsonl') {
      const rows = [JSON.stringify({ summary }), ...events.map((event) => JSON.stringify(event))].join('\n');
      res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="consultant-audit-export-${Date.now()}.jsonl"`);
      return res.send(rows);
    }

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.json({ summary, events });
  } catch (error) {
    console.error('Consultant audit export error:', error);
    return res.status(500).json({ error: 'Failed to export consultant audit events' });
  }
});

router.get('/consultant/audit-metrics', async (req: Request, res: Response) => {
  try {
    const hoursValue = Number(req.query.hours ?? 24);
    const windowHours = Number.isFinite(hoursValue) && hoursValue > 0
      ? Math.min(24 * 30, Math.floor(hoursValue))
      : 24;

    const allEvents = await readAllConsultantAuditEvents();
    const nowMs = Date.now();
    const currentCutoffMs = nowMs - windowHours * 60 * 60 * 1000;
    const previousCutoffMs = nowMs - (windowHours * 2) * 60 * 60 * 1000;

    const currentWindowEvents = allEvents.filter((event) => {
      const timestamp = typeof event.timestamp === 'string' ? Date.parse(event.timestamp) : NaN;
      return Number.isFinite(timestamp) && timestamp >= currentCutoffMs;
    });

    const previousWindowEvents = allEvents.filter((event) => {
      const timestamp = typeof event.timestamp === 'string' ? Date.parse(event.timestamp) : NaN;
      return Number.isFinite(timestamp) && timestamp >= previousCutoffMs && timestamp < currentCutoffMs;
    });

    const current = getReplayMetricCounts(currentWindowEvents);
    const previous = getReplayMetricCounts(previousWindowEvents);
    const advancedCurrent = getAdvancedRuntimeMetrics(currentWindowEvents);
    const advancedPrevious = getAdvancedRuntimeMetrics(previousWindowEvents);

    const providers: ConsultantProvider[] = ['bedrock', 'openai'];
    const providerMetrics = providers.reduce<Record<ConsultantProvider, {
      current: ReplayMetricCounts;
      previous: ReplayMetricCounts;
      delta: ReplayMetricCounts;
    }>>((acc, provider) => {
      const providerCurrent = getReplayMetricCounts(currentWindowEvents, provider);
      const providerPrevious = getReplayMetricCounts(previousWindowEvents, provider);
      acc[provider] = {
        current: providerCurrent,
        previous: providerPrevious,
        delta: {
          replaySuccess: providerCurrent.replaySuccess - providerPrevious.replaySuccess,
          replayFallback: providerCurrent.replayFallback - providerPrevious.replayFallback,
          replayError: providerCurrent.replayError - providerPrevious.replayError
        }
      };
      return acc;
    }, {} as Record<ConsultantProvider, {
      current: ReplayMetricCounts;
      previous: ReplayMetricCounts;
      delta: ReplayMetricCounts;
    }>);

    return res.json({
      windowHours,
      current,
      previous,
      advanced: {
        current: advancedCurrent,
        previous: advancedPrevious
      },
      providerMetrics,
      delta: {
        replaySuccess: current.replaySuccess - previous.replaySuccess,
        replayFallback: current.replayFallback - previous.replayFallback,
        replayError: current.replayError - previous.replayError
      }
    });
  } catch (error) {
    console.error('Consultant audit metrics error:', error);
    return res.status(500).json({ error: 'Failed to compute consultant audit metrics' });
  }
});

// Generate report section
router.post('/generate-section', requireApiKey, async (req: Request, res: Response) => {
  try {
    const { section, params } = req.body;
    
    const opportunityContext = params.specificOpportunity ? `Focused on: ${params.specificOpportunity}` : '';
    const prompt = `Generate the '${section}' section for a strategic report on ${params.organizationName}. 
    Target Market: ${params.country}. 
    Intent: ${params.strategicIntent}.
    ${opportunityContext}
    Format: Professional markdown, concise executive style.`;
    
    const text = await generateWithAI(prompt, SYSTEM_INSTRUCTION);
    
    res.json({ content: text });
  } catch (error) {
    console.error('AI section generation error:', error);
    res.status(500).json({ error: 'Failed to generate section' });
  }
});

// Streaming generation (Server-Sent Events)
router.post('/generate-stream', requireApiKey, async (req: Request, res: Response) => {
  try {
    const { section, params, prompt } = req.body;
    
    const opportunityContext = params?.specificOpportunity ? `Focused on: ${params.specificOpportunity}` : '';
    const streamPrompt = prompt || `Generate the '${section || 'analysis'}' section for a strategic report on ${params?.organizationName || 'the organization'}. 
    Target Market: ${params?.country || 'unspecified'}. 
    Intent: ${params?.strategicIntent || 'analysis'}.
    ${opportunityContext}
    Format: Professional markdown, concise executive style.`;
    
    // Set up SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    // generateWithAI (Bedrock or Gemini) — send as single SSE chunk
    const streamText = await generateWithAI(streamPrompt, SYSTEM_INSTRUCTION);
    res.write(`data: ${JSON.stringify({ text: streamText })}\n\n`);
    
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    console.error('AI stream error:', error);
    res.write(`data: ${JSON.stringify({ error: 'Stream failed' })}\n\n`);
    res.end();
  }
});

// Deep reasoning analysis
router.post('/deep-reasoning', requireApiKey, async (req: Request, res: Response) => {
  try {
    const { userOrg, targetEntity, context } = req.body;
    
    const prompt = `
    Perform a deep reasoning analysis on a potential partnership/deal between ${userOrg} and ${targetEntity}.
    Context: ${context}
    
    Provide JSON with:
    - verdict: "Strong Buy" | "Consider" | "Hard Pass"
    - dealKillers: string[] (negative risks)
    - hiddenGems: string[] (positive upsides)
    - reasoningChain: string[] (step by step logic)
    - counterIntuitiveInsight: string
    
    Only return valid JSON.`;
    
    const text = await generateWithAI(prompt, SYSTEM_INSTRUCTION);
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const analysis = JSON.parse(jsonMatch[0]);
      return res.json(analysis);
    }
    
    res.status(500).json({ error: 'Failed to parse analysis' });
  } catch (error) {
    console.error('Deep reasoning error:', error);
    res.status(500).json({ error: 'Failed to generate reasoning' });
  }
});

// Geopolitical analysis
router.post('/geopolitical', requireApiKey, async (req: Request, res: Response) => {
  try {
    const { country, region, intent } = req.body;
    
    const prompt = `Assess geopolitical risks for market entry:
    Country: ${country}
    Region: ${region}
    Intent: ${JSON.stringify(intent)}
    
    Return JSON with:
    - stabilityScore: number (0-100)
    - currencyRisk: "Low" | "Moderate" | "High"
    - inflationTrend: string
    - forecast: string
    - regionalConflictRisk: number (0-100)
    - tradeBarriers: string[]
    
    Only return valid JSON.`;
    
    const text = await generateWithAI(prompt, SYSTEM_INSTRUCTION);
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return res.json(JSON.parse(jsonMatch[0]));
    }
    
    // Fallback
    res.json({
      stabilityScore: 70,
      currencyRisk: 'Moderate',
      inflationTrend: 'Stable',
      forecast: 'Standard market conditions expected.',
      regionalConflictRisk: 30,
      tradeBarriers: ['Standard tariffs']
    });
  } catch (error) {
    console.error('Geopolitical analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze' });
  }
});

// Governance audit
router.post('/governance', requireApiKey, async (req: Request, res: Response) => {
  try {
    const { country, organizationType } = req.body;
    
    const prompt = `Perform governance audit for:
    Country: ${country}
    Organization Type: ${organizationType}
    
    Return JSON with:
    - governanceScore: number (0-100)
    - corruptionRisk: "Low" | "Moderate" | "High"
    - regulatoryFriction: number (0-100)
    - transparencyIndex: number (0-100)
    - redFlags: string[]
    - complianceRoadmap: string[]
    
    Only return valid JSON.`;
    
    const text = await generateWithAI(prompt, SYSTEM_INSTRUCTION);
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return res.json(JSON.parse(jsonMatch[0]));
    }
    
    res.json({
      governanceScore: 70,
      corruptionRisk: 'Moderate',
      regulatoryFriction: 30,
      transparencyIndex: 70,
      redFlags: [],
      complianceRoadmap: ['Standard compliance review recommended']
    });
  } catch (error) {
    console.error('Governance audit error:', error);
    res.status(500).json({ error: 'Failed to audit' });
  }
});

// Agent endpoint for generic AI agent tasks
router.post('/agent', requireApiKey, async (req: Request, res: Response) => {
  try {
    const { agentName, roleDefinition, context } = req.body;
    
    const prompt = `
    ROLE: You are the ${agentName}.
    MISSION: ${roleDefinition}
    
    CONTEXT_DATA: ${JSON.stringify(context)}
    
    TASK: Analyze the provided context data and generate strategic findings and recommendations.
    
    Return JSON with:
    - findings: string[] (specific, numeric where possible)
    - recommendations: string[]
    - confidence: number (0-100)
    - gaps: string[] (missing info)
    
    Only return valid JSON.`;
    
    const text = await generateWithAI(prompt, SYSTEM_INSTRUCTION);
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return res.json(JSON.parse(jsonMatch[0]));
    }
    
    res.json({
      findings: ['Analysis completed'],
      recommendations: ['Review full data set'],
      confidence: 60,
      gaps: []
    });
  } catch (error) {
    console.error('Agent error:', error);
    res.status(500).json({ error: 'Agent failed' });
  }
});

// Search grounded content
router.post('/search-grounded', requireApiKey, async (req: Request, res: Response) => {
  try {
    const { query } = req.body;
    
    const text = await generateWithAI(query, SYSTEM_INSTRUCTION);
    
    res.json({
      text,
      sources: [] // Google search grounding requires specific API setup
    });
  } catch (error) {
    console.error('Search grounded error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Copilot analysis
router.post('/copilot-analysis', requireApiKey, async (req: Request, res: Response) => {
  try {
    const { query, context } = req.body;
    
    const prompt = `Analyze: ${query}
    Context: ${context}
    
    Return JSON with:
    - summary: string (brief analysis)
    - options: array of {id, title, rationale}
    - followUp: string (suggested next question)
    
    Only return valid JSON.`;
    
    const text = await generateWithAI(prompt, SYSTEM_INSTRUCTION);
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return res.json(JSON.parse(jsonMatch[0]));
    }
    
    res.json({
      summary: `Analysis of "${query}" suggests focusing on strategic opportunities.`,
      options: [
        { id: '1', title: 'Primary Strategy', rationale: 'Based on context analysis.' }
      ],
      followUp: 'Shall we explore specific implementation steps?'
    });
  } catch (error) {
    console.error('Copilot analysis error:', error);
    res.status(500).json({ error: 'Analysis failed' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// MULTI-AGENT AI ENDPOINT - Orchestrates multiple AI models (Bedrock priority)
// ═══════════════════════════════════════════════════════════════════════════════

router.post('/multi-agent', requireApiKey, async (req: Request, res: Response) => {
  try {
    const { model: _requestedModel, prompt, context, systemInstruction } = req.body;
    void _requestedModel; // Reserved for future multi-model support
    
    const enrichedPrompt = `
SYSTEM INSTRUCTION: ${systemInstruction || MULTI_AGENT_SYSTEM_INSTRUCTION}

TASK: ${prompt}

CONTEXT:
${JSON.stringify(context, null, 2)}

INSTRUCTIONS:
- Analyze using 200+ years of economic patterns as reference
- Identify regional city opportunities if relevant
- Provide specific, data-backed recommendations
- Include confidence scores for all assessments
- Reference historical precedents where applicable

Return structured JSON response with:
{
  "text": "Main analysis content",
  "confidence": 0.0-1.0,
  "reasoning": ["step1", "step2", ...],
  "historicalReferences": ["pattern1", "pattern2"],
  "recommendations": ["rec1", "rec2"]
}
`;
    
    // Priority: Use available AI provider
    const bedrockReady = hasBedrockSignal();
    const openaiKey = getOpenAIKey();
    const togetherKey = getTogetherKey();

    // Try Bedrock first
    if (bedrockReady) {
      try {
        console.log('[Multi-Agent] Using AWS Bedrock (Primary)...');
        const bedrockText = await invokeBedrockMessages(
          [{ role: 'user', content: enrichedPrompt }],
          systemInstruction || MULTI_AGENT_SYSTEM_INSTRUCTION
        );

        if (bedrockText) {
          try {
            const jsonMatch = bedrockText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              return res.json({
                ...parsed,
                agentId: 'bedrock-claude',
                model: 'bedrock'
              });
            }
          } catch {
            // Return as plain text response
          }

          return res.json({
            text: bedrockText,
            confidence: 0.92,
            reasoning: ['AWS Bedrock analysis completed'],
            agentId: 'bedrock-claude',
            model: 'bedrock'
          });
        }
      } catch (bedrockError) {
        console.warn('[Multi-Agent] Bedrock error:', bedrockError instanceof Error ? bedrockError.message : 'Unknown error');
      }
    }
    
    // Try OpenAI first
    if (openaiKey) {
      try {
        console.log('[Multi-Agent] Using OpenAI (gpt-4o)...');
        
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              ...(systemInstruction ? [{ role: 'system', content: systemInstruction || MULTI_AGENT_SYSTEM_INSTRUCTION }] : []),
              { role: 'user', content: enrichedPrompt }
            ],
            max_tokens: 4096,
            temperature: 0.7,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const text = (data.choices?.[0]?.message?.content || '').trim();
          
          if (text) {
            // Try to parse as JSON
            try {
              const jsonMatch = text.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return res.json({
                  ...parsed,
                  agentId: 'openai-gpt4',
                  model: 'openai'
                });
              }
            } catch {
              // Return as plain text response
            }
            
            return res.json({
              text: text,
              confidence: 0.90,
              reasoning: ['OpenAI gpt-4o analysis completed'],
              agentId: 'openai-gpt4',
              model: 'openai'
            });
          }
        }
      } catch (openaiError) {
        console.warn('[Multi-Agent] OpenAI error:', openaiError instanceof Error ? openaiError.message : 'Unknown error');
      }
    }
    
    // Final fallback to Together.ai
    if (togetherKey) {
      try {
        console.log('[Multi-Agent] Using Together.ai (Final Fallback)...');
        
        const response = await fetch(TOGETHER_API_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${togetherKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: TOGETHER_MODEL_ID,
            messages: [
              ...(systemInstruction ? [{ role: 'system', content: systemInstruction || MULTI_AGENT_SYSTEM_INSTRUCTION }] : []),
              { role: 'user', content: enrichedPrompt }
            ],
            max_tokens: 4096,
            temperature: 0.7,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const text = (data.choices?.[0]?.message?.content || '').trim();
          
          if (text) {
            return res.json({
              text: text,
              confidence: 0.80,
              reasoning: ['Together.ai Llama analysis completed'],
              agentId: 'together-llama',
              model: 'together'
            });
          }
        }
      } catch (togetherError) {
        console.warn('[Multi-Agent] Together.ai error:', togetherError instanceof Error ? togetherError.message : 'Unknown error');
      }
    }
    
    // No AI available
    res.status(503).json({ error: 'No AI service available (Bedrock/OpenAI/Together all failed)' });
  } catch (error) {
    console.error('Multi-agent error:', error);
    res.status(500).json({ error: 'Multi-agent processing failed' });
  }
});

// Learning endpoint - store outcomes for pattern learning
router.post('/learning/outcome', async (req: Request, res: Response) => {
  try {
    const { key, outcome, factors, timestamp } = req.body;
    
    // In production, this would persist to a database
    console.log(`Learning: ${key} -> ${outcome} at ${timestamp}`);
    console.log('Factors:', factors);
    
    res.json({ success: true, message: 'Outcome recorded for learning' });
  } catch (error) {
    console.error('Learning error:', error);
    res.status(500).json({ error: 'Failed to record learning' });
  }
});

// Regional cities endpoint
router.post('/regional-cities', requireApiKey, async (req: Request, res: Response) => {
  try {
    const { region, industries } = req.body;
    
    const prompt = `Identify the top 5 emerging regional cities for ${industries?.join(', ') || 'business expansion'} in ${region || 'global markets'}.

For each city provide:
- City and country
- Opportunity score (0-100)
- Key advantages
- Risks
- Historical comparable (similar city that succeeded in past)
- Recommended entry strategy

Return as JSON array.`;
    
    const text = await generateWithAI(prompt, SYSTEM_INSTRUCTION);
    
    try {
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return res.json(JSON.parse(jsonMatch[0]));
      }
    } catch {
      // Continue with fallback
    }
    
    res.json({ cities: [], message: 'Analysis in progress' });
  } catch (error) {
    console.error('Regional cities error:', error);
    res.status(500).json({ error: 'Failed to analyze regional cities' });
  }
});

const MULTI_AGENT_SYSTEM_INSTRUCTION = `
You are the BWGA Intelligence AI Multi-Agent Brain v6.0 (Nexus Intelligence OS) - a self-learning economic intelligence system with NSIL v3.2 and Human Cognition Engine Active.

CORE CAPABILITIES:
1. Analyze 200+ years of global economic patterns (1820-2025)
2. Identify regional cities as emerging market opportunities
3. Learn from historical outcomes to improve predictions
4. Generate real-time strategic assessments

HISTORICAL KNOWLEDGE SPANS:
- Industrial Revolution (1820-1880)
- Colonial/Trade Era (1880-1920)
- Great Depression & Recovery (1929-1945)
- Post-War Boom (1945-1973)
- Oil Shocks & Stagflation (1973-1985)
- Asian Financial Crisis (1997-1999)
- China Rise (1990-2020)
- Global Financial Crisis (2008-2012)
- COVID-19 Era (2020-2025)
- Regional City Success Stories (Shenzhen, Bangalore, Dubai, Ho Chi Minh City, etc.)

ALWAYS:
- Reference specific historical patterns when relevant
- Provide confidence scores (0-1) with assessments
- Cite data sources (World Bank, IMF, UNCTAD, etc.)
- Give actionable, specific recommendations
- Identify risks and mitigation strategies

NEVER:
- Provide generic or vague responses
- Make claims without data backing
- Ignore historical precedent
`;

// ═══════════════════════════════════════════════════════════════════════════════
// OPENAI TTS — PREMIUM VOICE (server-side, consistent across all environments)
// ═══════════════════════════════════════════════════════════════════════════════

router.post('/tts', async (req: Request, res: Response) => {
  try {
    const { text, voice = 'nova', model = 'tts-1-hd' } = req.body as {
      text: string;
      voice?: string;
      model?: string;
    };

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ error: 'text is required' });
    }

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
      return res.status(503).json({ error: 'TTS unavailable — OPENAI_API_KEY not configured' });
    }

    // Sanitise: strip markdown, cap at 4096 chars (OpenAI TTS limit)
    const clean = text
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/#{1,6}\s/g, '')
      .replace(/\n/g, ' ')
      .trim()
      .slice(0, 4096);

    const ttsResponse = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,          // tts-1-hd — highest quality
        input: clean,
        voice,          // nova: warm, natural, professional
        response_format: 'mp3',
        speed: 0.95,    // Slightly measured — consultant delivery
      }),
    });

    if (!ttsResponse.ok) {
      const errBody = await ttsResponse.text().catch(() => '');
      console.error('[TTS] OpenAI error:', ttsResponse.status, errBody);
      return res.status(502).json({ error: 'TTS upstream error' });
    }

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-store');
    // Stream audio bytes directly to client
    const reader = ttsResponse.body?.getReader();
    if (!reader) return res.status(500).json({ error: 'TTS stream unavailable' });
    const pump = async () => {
      const { done, value } = await reader.read();
      if (done) { res.end(); return; }
      res.write(Buffer.from(value));
      await pump();
    };
    await pump();
  } catch (error) {
    console.error('[TTS] Error:', error);
    res.status(500).json({ error: 'TTS request failed' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// OPENAI GPT-4 INTEGRATION
// ═══════════════════════════════════════════════════════════════════════════════

router.post('/openai', async (req: Request, res: Response) => {
  try {
    const {
      prompt,
      context,
      model = 'gpt-4o-mini',
      messages,
      temperature = 0.4,
      maxTokens = 2000,
      systemInstruction,
    } = req.body;
    
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    
    if (!OPENAI_API_KEY) {
      return res.status(503).json({ 
        error: 'OpenAI service unavailable',
        message: 'OPENAI_API_KEY not configured',
        fallback: true
      });
    }

    const normalizedMessages = Array.isArray(messages)
      ? messages
          .filter((message) => message && typeof message.content === 'string' && typeof message.role === 'string')
          .slice(-40)
          .map((message) => ({
            role: ['system', 'user', 'assistant'].includes(message.role) ? message.role : 'user',
            content: String(message.content).slice(0, 16000),
          }))
      : [];

    const requestMessages = normalizedMessages.length > 0
      ? normalizedMessages
      : [
          {
            role: 'system',
            content: typeof systemInstruction === 'string' && systemInstruction.trim()
              ? systemInstruction.slice(0, 12000)
              : MULTI_AGENT_SYSTEM_INSTRUCTION,
          },
          {
            role: 'user',
            content: context
              ? `Context: ${JSON.stringify(context)}\n\nQuery: ${String(prompt || '').slice(0, 12000)}`
              : String(prompt || '').slice(0, 12000),
          }
        ];

    if (requestMessages.length === 0 || !requestMessages.some((message) => message.role === 'user' || message.role === 'assistant')) {
      return res.status(400).json({ error: 'prompt or messages are required' });
    }
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages: requestMessages,
        temperature,
        max_tokens: maxTokens
      })
    });
    
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }
    
    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';
    
    res.json({
      text,
      response: text,
      model: data.model,
      usage: data.usage
    });
  } catch (error) {
    console.error('OpenAI error:', error);
    res.status(500).json({ error: 'OpenAI request failed' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ANTHROPIC CLAUDE INTEGRATION
// ═══════════════════════════════════════════════════════════════════════════════

router.post('/claude', async (req: Request, res: Response) => {
  try {
    const { prompt, context, model = 'claude-3-opus-20240229' } = req.body;
    
    const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
    
    if (!ANTHROPIC_API_KEY) {
      return res.status(503).json({ 
        error: 'Claude service unavailable',
        message: 'ANTHROPIC_API_KEY not configured',
        fallback: true
      });
    }
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        max_tokens: 2000,
        system: MULTI_AGENT_SYSTEM_INSTRUCTION,
        messages: [
          {
            role: 'user',
            content: context 
              ? `Context: ${JSON.stringify(context)}\n\nQuery: ${prompt}`
              : prompt
          }
        ]
      })
    });
    
    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`);
    }
    
    const data = await response.json();
    const text = data.content?.[0]?.text || '';
    
    res.json({
      text,
      response: text,
      model: data.model,
      usage: data.usage
    });
  } catch (error) {
    console.error('Claude error:', error);
    res.status(500).json({ error: 'Claude request failed' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// PERPLEXITY AI SEARCH INTEGRATION
// ═══════════════════════════════════════════════════════════════════════════════

router.post('/perplexity', async (req: Request, res: Response) => {
  try {
    const { query, context, model = 'pplx-7b-online' } = req.body;
    
    const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
    
    if (!PERPLEXITY_API_KEY) {
      return res.status(503).json({ 
        error: 'Perplexity service unavailable',
        message: 'PERPLEXITY_API_KEY not configured',
        fallback: true
      });
    }
    
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: 'You are a research assistant. Provide accurate, well-sourced answers with citations.'
          },
          {
            role: 'user',
            content: context ? `Context: ${JSON.stringify(context)}\n\nQuery: ${query}` : query
          }
        ],
        max_tokens: 1024,
        temperature: 0.2,
        return_citations: true
      })
    });
    
    if (!response.ok) {
      throw new Error(`Perplexity API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    res.json({
      text: data.choices?.[0]?.message?.content || '',
      response: data.choices?.[0]?.message?.content || '',
      citations: data.citations || [],
      model: data.model
    });
  } catch (error) {
    console.error('Perplexity error:', error);
    res.status(500).json({ error: 'Perplexity request failed' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// REACTIVE INTELLIGENCE ENDPOINT
// ═══════════════════════════════════════════════════════════════════════════════

router.post('/reactive', requireApiKey, async (req: Request, res: Response) => {
  try {
    const { situation, params, options } = req.body;
    
    const reactiveSystemPrompt = `You are a reactive intelligence engine that thinks on its feet.
      
Analyze the situation and provide:
1. Rapid assessment (2-3 sentences)
2. Key opportunities detected
3. Critical risks identified
4. Recommended immediate actions
5. Confidence level (0-1)

Be decisive and actionable. No hedging.`;
    
    const prompt = `SITUATION: ${situation}

CONTEXT: ${JSON.stringify(params)}

OPTIONS: ${JSON.stringify(options)}

Provide reactive intelligence analysis with specific, actionable recommendations.`;
    
    const text = await generateWithAI(prompt, reactiveSystemPrompt);
    
    res.json({
      analysis: text,
      timestamp: new Date().toISOString(),
      confidence: 0.85
    });
  } catch (error) {
    console.error('Reactive intelligence error:', error);
    res.status(500).json({ error: 'Reactive analysis failed' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// SELF-SOLVE ENDPOINT
// ═══════════════════════════════════════════════════════════════════════════════

router.post('/solve', requireApiKey, async (req: Request, res: Response) => {
  try {
    const { problem, context } = req.body;
    
    const solveSystemPrompt = `You are a self-solving AI system. Given a problem, you:
1. Analyze the root cause
2. Search your knowledge for similar solved problems
3. Generate 3-5 specific, actionable solutions
4. Rank solutions by confidence and feasibility

Return JSON with:
{
  "analysis": "Root cause analysis",
  "solutions": [
    {
      "action": "Specific action to take",
      "reasoning": "Why this will work",
      "expectedOutcome": "What will happen",
      "confidence": 0.85
    }
  ],
  "recommendedSolution": 0
}`;
    
    const prompt = `PROBLEM: ${problem}

CONTEXT: ${JSON.stringify(context)}

Solve this problem. Be specific and actionable.`;
    
    const text = await generateWithAI(prompt, solveSystemPrompt);
    
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return res.json(JSON.parse(jsonMatch[0]));
      }
    } catch {
      // Continue with raw response
    }
    
    res.json({
      analysis: text,
      solutions: [],
      recommendedSolution: null
    });
  } catch (error) {
    console.error('Self-solve error:', error);
    res.status(500).json({ error: 'Self-solve failed' });
  }
});

export default router;
