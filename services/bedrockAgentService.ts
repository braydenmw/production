/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * BW NEXUS AI - AWS BEDROCK AGENT SERVICE
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Client-side driver for AWS Bedrock Agents.
 * This replaces the Together.ai backend when Bedrock Agents are deployed.
 *
 * Architecture:
 *   Browser → BedrockAgentRuntime SDK → Bedrock Supervisor Agent
 *                                              ↓
 *                                    Action Groups (Lambda)
 *                                       ├─ bw-research-handler
 *                                       ├─ bw-analysis-handler
 *                                       ├─ bw-document-handler
 *                                       ├─ bw-risk-handler
 *                                       └─ bw-partner-handler
 *
 * Requirements (add to .env):
 *   VITE_AWS_REGION=us-east-1
 *   VITE_AWS_ACCESS_KEY_ID=<your-key>
 *   VITE_AWS_SECRET_ACCESS_KEY=<your-secret>
 *   VITE_BEDROCK_AGENT_ID=<agent-id from AWS console>
 *   VITE_BEDROCK_AGENT_ALIAS_ID=<alias-id from AWS console>
 *
 * Falls back to Together.ai if agent vars are not set.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { generateWithTogether, TOGETHER_SYSTEM_PROMPT } from './togetherAIService';

// ─── Config ───────────────────────────────────────────────────────────────────

type BedrockWindowEnv = Window & { __ENV__?: Record<string, string | undefined> };
type BedrockImportMeta = ImportMeta & {
  env?: {
    VITE_AWS_REGION?: string;
    VITE_AWS_ACCESS_KEY_ID?: string;
    VITE_AWS_SECRET_ACCESS_KEY?: string;
    VITE_BEDROCK_AGENT_ID?: string;
    VITE_BEDROCK_AGENT_ALIAS_ID?: string;
  };
};

const _env = () => {
  const runtimeEnv = typeof window !== 'undefined' ? (window as BedrockWindowEnv).__ENV__ || {} : {};
  const viteEnv = ((import.meta as BedrockImportMeta).env || {});
  return {
    VITE_AWS_REGION: runtimeEnv.VITE_AWS_REGION || viteEnv.VITE_AWS_REGION,
    VITE_AWS_ACCESS_KEY_ID: runtimeEnv.VITE_AWS_ACCESS_KEY_ID || viteEnv.VITE_AWS_ACCESS_KEY_ID,
    VITE_AWS_SECRET_ACCESS_KEY: runtimeEnv.VITE_AWS_SECRET_ACCESS_KEY || viteEnv.VITE_AWS_SECRET_ACCESS_KEY,
    VITE_BEDROCK_AGENT_ID: runtimeEnv.VITE_BEDROCK_AGENT_ID || viteEnv.VITE_BEDROCK_AGENT_ID,
    VITE_BEDROCK_AGENT_ALIAS_ID: runtimeEnv.VITE_BEDROCK_AGENT_ALIAS_ID || viteEnv.VITE_BEDROCK_AGENT_ALIAS_ID,
  };
};

const cfg = {
  region:      () => _env().VITE_AWS_REGION          || 'us-east-1',
  accessKeyId: () => _env().VITE_AWS_ACCESS_KEY_ID   || '',
  secretKey:   () => _env().VITE_AWS_SECRET_ACCESS_KEY || '',
  agentId:     () => _env().VITE_BEDROCK_AGENT_ID    || '',
  aliasId:     () => _env().VITE_BEDROCK_AGENT_ALIAS_ID || 'TSTALIASID',
};

export const isBedrockAgentConfigured = (): boolean => {
  const key = cfg.accessKeyId();
  const secret = cfg.secretKey();
  const agentId = cfg.agentId();
  return Boolean(
    key && key.length > 10 && !key.includes('YOUR_') &&
    secret && secret.length > 10 &&
    agentId && agentId.length > 4
  );
};

// ─── SigV4 signing for Bedrock Agent Runtime ─────────────────────────────────

async function _sha256Hex(data: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function _hmac(key: ArrayBuffer, data: string): Promise<ArrayBuffer> {
  const k = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return crypto.subtle.sign('HMAC', k, new TextEncoder().encode(data));
}

async function _signRequest(
  body: string,
  path: string,
  region: string,
  accessKeyId: string,
  secretKey: string
): Promise<Record<string, string>> {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\..*/g, '').slice(0, 15) + 'Z';
  const dateStamp = amzDate.slice(0, 8);
  const service = 'bedrock';
  const host = `bedrock-agent-runtime.${region}.amazonaws.com`;

  const payloadHash = await _sha256Hex(body);
  const canonicalRequest = [
    'POST', path, '',
    `content-type:application/json\nhost:${host}\nx-amz-date:${amzDate}\n`,
    'content-type;host;x-amz-date',
    payloadHash,
  ].join('\n');

  const scope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, await _sha256Hex(canonicalRequest)].join('\n');

  let k: ArrayBuffer = new TextEncoder().encode(`AWS4${secretKey}`).buffer as ArrayBuffer;
  k = await _hmac(k, dateStamp);
  k = await _hmac(k, region);
  k = await _hmac(k, service);
  k = await _hmac(k, 'aws4_request');
  const sigBuf = await _hmac(k, stringToSign);
  const signature = Array.from(new Uint8Array(sigBuf)).map(b => b.toString(16).padStart(2, '0')).join('');

  return {
    'Content-Type': 'application/json',
    'X-Amz-Date': amzDate,
    Authorization: `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${scope}, SignedHeaders=content-type;host;x-amz-date, Signature=${signature}`,
  };
}

// ─── Session management ───────────────────────────────────────────────────────

/** Generate a session ID that persists for the lifetime of the page */
export const getAgentSessionId = (() => {
  let _id: string | null = null;
  return () => {
    if (!_id) _id = `bw-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    return _id;
  };
})();

export const resetAgentSession = () => {
  // Force a new session on next call by resetting the closure
  (getAgentSessionId as any)._id = null;
};

// ─── Core invoke ─────────────────────────────────────────────────────────────

export interface AgentInvokeOptions {
  /** Overrides default session; use to run isolated sub-tasks */
  sessionId?: string;
  /** If true, streams tokens via onToken callback */
  stream?: boolean;
  /** Called for each streamed token */
  onToken?: (token: string) => void;
  /** Max wait per chunk in ms (default 60000) */
  timeoutMs?: number;
}

/**
 * Invoke the Bedrock Supervisor Agent.
 * Falls back to Together.ai if agent credentials are not configured.
 */
export async function invokeBedrockAgent(
  inputText: string,
  options: AgentInvokeOptions = {}
): Promise<string> {
  // ── Fallback to Together.ai if unconfigured ────────────────────────────────
  if (!isBedrockAgentConfigured()) {
    console.info('[BedrockAgent] Not configured - falling back to Together.ai');
    return generateWithTogether(inputText, TOGETHER_SYSTEM_PROMPT, options.onToken);
  }

  const region      = cfg.region();
  const accessKeyId = cfg.accessKeyId();
  const secretKey   = cfg.secretKey();
  const agentId     = cfg.agentId();
  const aliasId     = cfg.aliasId();
  const sessionId   = options.sessionId ?? getAgentSessionId();

  const path = `/agents/${agentId}/agentAliases/${aliasId}/sessions/${sessionId}/text`;
  const url  = `https://bedrock-agent-runtime.${region}.amazonaws.com${path}`;
  const body = JSON.stringify({ inputText });

  const headers = await _signRequest(body, path, region, accessKeyId, secretKey);

  let res: Response;
  try {
    res = await fetch(url, { method: 'POST', headers, body });
  } catch (err) {
    console.warn('[BedrockAgent] Network error, falling back to Together.ai:', err);
    return generateWithTogether(inputText, TOGETHER_SYSTEM_PROMPT, options.onToken);
  }

  if (!res.ok) {
    console.warn(`[BedrockAgent] HTTP ${res.status}, falling back to Together.ai`);
    return generateWithTogether(inputText, TOGETHER_SYSTEM_PROMPT, options.onToken);
  }

  // ── Parse event-stream response ───────────────────────────────────────────
  const reader = res.body?.getReader();
  if (!reader) {
    return generateWithTogether(inputText, TOGETHER_SYSTEM_PROMPT, options.onToken);
  }

  const dec = new TextDecoder();
  let fullText = '';
  let buf = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });

    // Bedrock Agent streams multi-event payloads separated by \r\n
    const lines = buf.split('\r\n');
    buf = lines.pop() || '';

    for (const line of lines) {
      // Look for the chunk payload
      const match = line.match(/"bytes"\s*:\s*"([^"]+)"/);
      if (match) {
        try {
          const decoded = atob(match[1]);
          const json = JSON.parse(decoded);
          const tok = json?.bytes
            ? new TextDecoder().decode(Uint8Array.from(atob(json.bytes), c => c.charCodeAt(0)))
            : (json?.text || json?.output?.text || '');
          if (tok) {
            fullText += tok;
            options.onToken?.(tok);
          }
        } catch { /* partial event */ }
      }

      // Fallback: plain text line
      if (!line.startsWith(':') && !line.startsWith('event:') && !line.startsWith('{')) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('"')) {
          fullText += trimmed;
          options.onToken?.(trimmed);
        }
      }
    }
  }

  if (!fullText) {
    // Agent returned empty - fallback
    return generateWithTogether(inputText, TOGETHER_SYSTEM_PROMPT, options.onToken);
  }

  return fullText;
}

// ─── Typed action shortcuts ──────────────────────────────────────────────────

/** Ask the agent to run the full autonomous pipeline for a case */
export async function runAutonomousPipeline(params: {
  organizationName: string;
  country: string;
  sector: string;
  objectives: string;
  documentTypes?: string[];
  onToken?: (t: string) => void;
}): Promise<string> {
  const prompt = `
Run the full BW NEXUS autonomous pipeline for this case:

Organization: ${params.organizationName}
Country: ${params.country}
Sector: ${params.sector}
Objectives: ${params.objectives}
${params.documentTypes?.length ? `Priority Documents: ${params.documentTypes.join(', ')}` : ''}

Instructions:
1. CALL ResearchAction - gather country/market intelligence
2. CALL AnalysisAction - run brain engines and get context
3. CALL DocumentAction - generate each requested document type
4. CALL RiskAction - identify key risks
5. CALL PartnerAction - identify strategic partners
6. Return all generated content with section headings

Do not stop until all documents are complete.
`.trim();

  return invokeBedrockAgent(prompt, { onToken: params.onToken });
}

/** Quick single-question chat via the agent */
export async function agentChat(
  message: string,
  sessionId: string,
  onToken?: (t: string) => void
): Promise<string> {
  return invokeBedrockAgent(message, { sessionId, onToken });
}

export default {
  invokeBedrockAgent,
  runAutonomousPipeline,
  agentChat,
  isBedrockAgentConfigured,
  getAgentSessionId,
  resetAgentSession,
};
