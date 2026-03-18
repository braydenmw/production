/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * BW NEXUS AI - AI SERVICE (AWS BEDROCK - Claude 3.5 Sonnet)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Gemini has been removed. All AI calls now route to:
 *   1. Backend API  (/api/ai/*)  - primary path when server is running
 *   2. AWS Bedrock direct (SigV4) - browser fallback, no server needed
 *
 * All exports preserve their original function signatures so every component
 * import continues to work without any changes.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { CopilotInsight, ReportParameters, LiveOpportunityItem, DeepReasoningAnalysis, GeopoliticalAnalysisResult, GovernanceAuditResult } from '../types';
import { config } from './config';
import { invokeBedrockDirect, invokeBedrockDirectStream, extractFileViaBedrock, isDirectBedrockConfigured } from './awsBedrockService';
import { callTogether, generateWithTogether } from './togetherAIService';
import { SYSTEM_INSTRUCTION, SYSTEM_INSTRUCTION_SHORT } from './aiPolicy';

const API_BASE = '/api';

// ─── Shared helpers ───────────────────────────────────────────────────────────

/** POST to backend API, return parsed JSON or null on failure */
async function apiPost(path: string, body: object): Promise<any> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.ok) return await res.json();
  } catch { /* backend unavailable */ }
  return null;
}

/** Check if a REAL Together.ai API key is present (rejects placeholders) */
function isTogetherConfigured(): boolean {
  const key = String((typeof process !== 'undefined' && process.env?.TOGETHER_API_KEY) || '')
    .trim()
    .replace(/^['"]|['"]$/g, '');
  if (key.length < 20) return false;
  const lower = key.toLowerCase();
  if (lower.includes('your-') || lower.includes('your_') || lower.includes('placeholder') || lower.includes('key-here')) return false;
  return true;
}

/**
 * Primary AI call - Together.ai (Llama 3.1 70B).
 * Falls back to Bedrock only if Together is not configured.
 */
/**
 * Primary AI call — routes through server /api/ai/chat.
 * Falls back to direct Together/Bedrock only if server is unreachable.
 */
async function ai(prompt: string, system = SYSTEM_INSTRUCTION): Promise<string> {
  // 1. Server backend (primary — keys live there)
  const data = await apiPost('/ai/chat', { message: prompt, systemInstruction: system });
  if (data?.text) return data.text;

  // 2. Direct Together.ai (only works if key is somehow in process.env)
  if (isTogetherConfigured()) {
    return generateWithTogether(prompt, system);
  }
  // 3. Direct Bedrock (only works with browser-side AWS creds)
  if (isDirectBedrockConfigured()) {
    return invokeBedrockDirect(prompt, system);
  }
  throw new Error('AI backend unavailable. Ensure the server is running and AI keys are configured in the server .env.');
}

/**
 * Streaming AI call — routes through server /api/ai/generate-stream.
 * Falls back to direct Together/Bedrock only if server is unreachable.
 */
async function aiStream(prompt: string, system = SYSTEM_INSTRUCTION, onToken?: (t: string) => void): Promise<string> {
  // 1. Server backend streaming (primary)
  try {
    const res = await fetch(`${API_BASE}/ai/generate-stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, systemInstruction: system }),
    });
    if (res.ok && res.body) {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const raw = decoder.decode(value, { stream: true });
        const lines = raw.split('\n').filter(l => l.startsWith('data: '));
        for (const line of lines) {
          try {
            const chunk = JSON.parse(line.slice(6)).text || '';
            if (chunk) { full += chunk; onToken?.(chunk); }
          } catch { /* partial SSE chunk */ }
        }
      }
      if (full) return full;
    }
  } catch { /* server unreachable, try direct */ }

  // 2. Direct fallback (requires keys in browser env — rare)
  if (isTogetherConfigured()) {
    return callTogether(
      [{ role: 'system', content: system }, { role: 'user', content: prompt }],
      {},
      onToken
    );
  }
  if (isDirectBedrockConfigured()) {
    let acc = '';
    await invokeBedrockDirectStream(prompt, system, (tok) => { acc += tok; onToken?.(acc); });
    return acc;
  }
  throw new Error('AI backend unavailable.');
}

// ─── Session tracking (kept for compat with BWConsultantOS chatSession.current) ──

let _sessionId: string | null = null;

// ─── getChatSession ───────────────────────────────────────────────────────────

export const getChatSession = (): {
  sendMessage: (msg: { message: string }) => Promise<{ text: string }>;
  sendMessageStream: (msg: { message: string }) => Promise<AsyncIterable<{ text: string }>>;
} => {
  return {
    sendMessage: async (msg) => {
      // 1. Backend
      const data = await apiPost('/ai/chat', { message: msg.message, sessionId: _sessionId, systemInstruction: SYSTEM_INSTRUCTION });
      if (data?.text) { _sessionId = data.sessionId ?? _sessionId; return { text: data.text }; }

      // 2. Together.ai / Bedrock
      try {
        const text = await ai(msg.message);
        return { text };
      } catch (aiErr) {
        console.warn('[AI] sendMessage failed:', aiErr);
      }

      return { text: '' };
    },

    sendMessageStream: async (msg) => {
      // 1. Backend SSE
      try {
        const res = await fetch(`${API_BASE}/ai/generate-stream`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: msg.message, sessionId: _sessionId, systemInstruction: SYSTEM_INSTRUCTION }),
        });
        if (res.ok && res.body) {
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          return {
            [Symbol.asyncIterator]: () => ({
              async next() {
                const { done, value } = await reader.read();
                if (done) return { done: true as const, value: undefined };
                const raw = decoder.decode(value);
                const combined = raw.split('\n').filter(l => l.startsWith('data: ')).map(l => {
                  try { return JSON.parse(l.slice(6)).text || ''; } catch { return ''; }
                }).join('');
                return { done: false as const, value: { text: combined } };
              }
            })
          };
        }
      } catch { /* fall through */ }

      // 2. Together.ai streaming (SSE), wrapped as async iterable
      if (isTogetherConfigured() || isDirectBedrockConfigured()) {
        try {
          const chunks: string[] = [];
          await aiStream(msg.message, SYSTEM_INSTRUCTION, (tok) => chunks.push(tok));
          // Emit the full text in one chunk (Together delivers full delta accumulation)
          const fullText = chunks[chunks.length - 1] || '';
          let yielded = false;
          return {
            [Symbol.asyncIterator]: () => ({
              async next() {
                if (yielded) return { done: true as const, value: undefined };
                yielded = true;
                return { done: false as const, value: { text: fullText } };
              }
            })
          };
        } catch (aiErr) {
          console.warn('[AI] sendMessageStream failed:', aiErr);
        }
      }

      return { [Symbol.asyncIterator]: () => ({ async next() { return { done: true as const, value: undefined }; } }) };
    },
  };
};

// ─── sendMessageStream ────────────────────────────────────────────────────────

export const sendMessageStream = async (message: string) => {
  const chat = getChatSession();
  return chat.sendMessageStream({ message });
};

// ─── generateCopilotInsights ──────────────────────────────────────────────────

export const generateCopilotInsights = async (params: ReportParameters): Promise<CopilotInsight[]> => {
  const data = await apiPost('/ai/insights', {
    organizationName: params.organizationName,
    country: params.country,
    strategicIntent: params.strategicIntent,
    specificOpportunity: params.specificOpportunity,
  });
  if (data) return Array.isArray(data) ? data : (data.insights || []);

  const prompt = `${SYSTEM_INSTRUCTION}

Generate 5 strategic intelligence insights for:
- Organization: ${params.organizationName || 'Unknown'}
- Country: ${params.country || 'Global'}
- Opportunity: ${params.specificOpportunity || 'General advisory'}
- Strategic Intent: ${(params.strategicIntent || []).join(', ')}

Return a JSON array of objects with fields: id, type ("strategy"|"risk"|"opportunity"|"insight"), title, description, content, confidence (0-100).
Only return the JSON array, no other text.`;

  try {
    const raw = await ai(prompt);
    const match = raw.match(/\[[\s\S]*\]/);
    if (match) return JSON.parse(match[0]) as CopilotInsight[];
  } catch { /* fall through */ }

  return [];
};

// ─── askCopilot ───────────────────────────────────────────────────────────────

export const askCopilot = async (query: string, params: ReportParameters): Promise<CopilotInsight> => {
  const data = await apiPost('/ai/chat', { message: query, context: { organizationName: params.organizationName, country: params.country } });
  if (data?.text) return { id: Date.now().toString(), type: 'strategy', title: 'Copilot Response', description: data.text, content: data.text, confidence: 85 };

  const prompt = `${SYSTEM_INSTRUCTION}\n\nContext:\n- Organization: ${params.organizationName || 'Unknown'}\n- Country: ${params.country || 'Global'}\n- Opportunity: ${params.specificOpportunity || 'General advisory'}\n\nQuery: ${query}\n\nProvide a detailed, actionable response with specific data and next steps.`;
  try {
    const text = await ai(prompt);
    return { id: Date.now().toString(), type: 'strategy', title: 'AI Copilot Response', description: text, content: text, confidence: 85 };
  } catch { /* fall through */ }

  return { id: Date.now().toString(), type: 'insight', title: 'System Status', description: 'Backend AI is not configured. Set TOGETHER_API_KEY (or OPENAI_API_KEY / GEMINI_API_KEY) in server .env and restart the API server.', content: 'AI provider key required on server backend.', confidence: 0 };
};

// ─── generateReportSectionStream ──────────────────────────────────────────────

export const generateReportSectionStream = async (
  section: string,
  params: ReportParameters,
  onChunk: (chunk: string) => void
): Promise<void> => {
  // 1. Backend
  if (config.useRealAI) {
    try {
      const res = await fetch(`${API_BASE}/ai/generate-section`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section, params }),
      });
      if (res.ok && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const lines = decoder.decode(value).split('\n').filter(l => l.startsWith('data: '));
          for (const line of lines) {
            try { const j = JSON.parse(line.slice(6)); if (j.text) onChunk(j.text); } catch { /* partial */ }
          }
        }
        return;
      }
    } catch { /* fall through */ }
  }

  // 2. Together.ai / Bedrock stream
  const prompt = `Write the "${section}" section for a BW Global Advisory strategic report.\n\nCase context:\n- Organization: ${params.organizationName}\n- Country: ${params.country}\n- Opportunity: ${params.specificOpportunity}\n\nWrite in full, professional advisory prose. Be thorough and specific.`;
  try {
    await aiStream(prompt, SYSTEM_INSTRUCTION, onChunk);
    return;
  } catch (err) {
    console.warn('generateReportSectionStream failed:', err);
  }

  onChunk('AI backend not configured. Set TOGETHER_API_KEY (or OPENAI_API_KEY / GEMINI_API_KEY) in server .env and restart the API server.');
};

// ─── generateAnalysisStream ───────────────────────────────────────────────────

export const generateAnalysisStream = async (item: LiveOpportunityItem, region: string): Promise<ReadableStream> => {
  const prompt = `${SYSTEM_INSTRUCTION}\n\nAnalyse this opportunity in ${region}:\n\nTitle: ${item.title}\nSector: ${item.sector}\nCountry: ${item.country}\nDescription: ${item.description}\n\nProvide a comprehensive strategic analysis including opportunity assessment, key risks, recommended entry approach, and BW Advisory value proposition.`;

  const data = await apiPost('/ai/chat', { message: prompt });
  let text: string;
  if (data?.text) {
    text = data.text;
  } else {
    try { text = await ai(prompt); } catch { text = 'AI backend not configured. Set TOGETHER_API_KEY (or OPENAI_API_KEY / GEMINI_API_KEY) in server .env.'; }
  }

  return new ReadableStream({
    start(controller) {
      const chunks = text.match(/.{1,80}(?:\s|$)/g) || [text];
      let i = 0;
      const tick = () => {
        if (i >= chunks.length) { controller.close(); return; }
        controller.enqueue(new TextEncoder().encode(chunks[i++]));
        setTimeout(tick, 12);
      };
      tick();
    }
  });
};

// ─── generateDeepReasoning ────────────────────────────────────────────────────

export const generateDeepReasoning = async (userOrg: string, targetEntity: string, context: string): Promise<DeepReasoningAnalysis> => {
  const prompt = `${SYSTEM_INSTRUCTION}\n\nPerform a deep strategic reasoning analysis:\n- Our organization: ${userOrg}\n- Target entity: ${targetEntity}\n- Context: ${context}\n\nReturn valid JSON with this structure:\n{"executiveSummary":"...","keyFindings":["..."],"strategicRecommendations":["..."],"riskAssessment":{"overall":"...","factors":[{"risk":"...","likelihood":"...","impact":"...","mitigation":"..."}]},"opportunityScore":85,"confidenceLevel":"HIGH","nextSteps":["..."]}\n\nOnly return JSON.`;

  const data = await apiPost('/ai/chat', { message: prompt });
  let raw: string;
  if (data?.text) {
    raw = data.text;
  } else {
    try { raw = await ai(prompt); } catch { raw = '{}'; }
  }

  try {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]) as DeepReasoningAnalysis;
  } catch { /* fall through */ }

  return {
    executiveSummary: raw,
    keyFindings: [],
    strategicRecommendations: [],
    riskAssessment: { overall: 'Assessment pending', factors: [] },
    opportunityScore: 0,
    confidenceLevel: 'LOW',
    nextSteps: [],
  } as unknown as DeepReasoningAnalysis;
};

// ─── generateSearchGroundedContent ───────────────────────────────────────────

export const generateSearchGroundedContent = async (query: string): Promise<{ text: string; sources: any[] }> => {
  const data = await apiPost('/ai/search', { query });
  if (data?.text) return { text: data.text, sources: data.sources || [] };

  const prompt = `${SYSTEM_INSTRUCTION}\n\nResearch and answer the following query with depth and precision:\n\n${query}\n\nInclude specific facts, data, and cite any key sources or institutions.`;
  try {
    const text = await ai(prompt);
    return { text, sources: [] };
  } catch { /* fall through */ }

  return { text: 'AI backend not configured. Set TOGETHER_API_KEY (or OPENAI_API_KEY / GEMINI_API_KEY) in server .env.', sources: [] };
};

// ─── runAI_Agent ─────────────────────────────────────────────────────────────

export const runAI_Agent = async (
  task: string,
  context: object,
  onProgress?: (step: string) => void
): Promise<string> => {
  onProgress?.('Initialising NSIL Agentic Runtime...');
  const prompt = `${SYSTEM_INSTRUCTION}\n\nTask: ${task}\n\nContext:\n${JSON.stringify(context, null, 2)}\n\nExecute this task with full advisory rigour. Provide a structured, comprehensive result.`;

  const data = await apiPost('/ai/agent', { task, context });
  if (data?.text) { onProgress?.('Complete.'); return data.text; }

  try {
    onProgress?.('Routing to Together.ai (Llama 3.1 70B)...');
    const result = await ai(prompt);
    onProgress?.('Complete.');
    return result;
  } catch (err) {
    console.warn('runAI_Agent Together.ai failed:', err);
  }

  return 'AI agent requires a server-side provider key (TOGETHER_API_KEY, OPENAI_API_KEY, or GEMINI_API_KEY).';
};

// ─── runGeopoliticalAnalysis ──────────────────────────────────────────────────

export const runGeopoliticalAnalysis = async (params: ReportParameters): Promise<GeopoliticalAnalysisResult> => {
  const prompt = `${SYSTEM_INSTRUCTION}\n\nConduct a comprehensive geopolitical analysis for:\n- Country: ${params.country}\n- Organization: ${params.organizationName}\n- Sector: ${params.specificOpportunity || 'General'}\n\nReturn valid JSON matching the GeopoliticalAnalysisResult schema: {"politicalStability":{"score":0,"trend":"","keyFactors":[]},"economicConditions":{"gdpGrowth":0,"inflationRate":0,"businessClimate":""},"regulatoryEnvironment":{"ease":0,"keyRisks":[],"opportunities":[]},"security":{"riskLevel":"","keyThreats":[]},"internationalRelations":{"allies":[],"tensions":[]},"recommendations":[],"overallRisk":"","confidenceScore":0}\n\nReturn only JSON.`;

  const data = await apiPost('/ai/geopolitical', { params });
  if (data) return data as GeopoliticalAnalysisResult;

  try {
    const raw = await ai(prompt);
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]) as GeopoliticalAnalysisResult;
  } catch { /* fall through */ }

  return { politicalStability: { score: 0, trend: '', keyFactors: [] }, economicConditions: { gdpGrowth: 0, inflationRate: 0, businessClimate: '' }, regulatoryEnvironment: { ease: 0, keyRisks: [], opportunities: [] }, security: { riskLevel: 'Unknown', keyThreats: [] }, internationalRelations: { allies: [], tensions: [] }, recommendations: [], overallRisk: 'Unknown', confidenceScore: 0 } as unknown as GeopoliticalAnalysisResult;
};

// ─── runGovernanceAudit ───────────────────────────────────────────────────────

export const runGovernanceAudit = async (params: ReportParameters): Promise<GovernanceAuditResult> => {
  const prompt = `${SYSTEM_INSTRUCTION}\n\nConduct a governance and compliance audit for:\n- Organization: ${params.organizationName}\n- Country: ${params.country}\n- Sector: ${params.specificOpportunity || 'General'}\n\nReturn valid JSON matching the GovernanceAuditResult schema with fields: overallScore, governanceFramework, complianceStatus, keyRisks, recommendations, auditSummary. Return only JSON.`;

  const data = await apiPost('/ai/governance-audit', { params });
  if (data) return data as GovernanceAuditResult;

  try {
    const raw = await ai(prompt);
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]) as GovernanceAuditResult;
  } catch { /* fall through */ }

  return { overallScore: 0, auditSummary: 'Governance audit requires server-side provider keys (TOGETHER_API_KEY, OPENAI_API_KEY, or GEMINI_API_KEY).' } as unknown as GovernanceAuditResult;
};

// ─── runCopilotAnalysis ───────────────────────────────────────────────────────

export const runCopilotAnalysis = async (query: string, context: string): Promise<{ summary: string; options: any[]; followUp: string }> => {
  const data = await apiPost('/ai/copilot-analysis', { query, context });
  if (data?.summary) return data;

  const prompt = `${SYSTEM_INSTRUCTION}\n\nContext: ${context}\n\nQuery: ${query}\n\nProvide a concise advisory analysis. Return JSON: {"summary":"...","options":[{"label":"...","description":"...","priority":"high|medium|low"}],"followUp":"..."}\n\nReturn only JSON.`;
  try {
    const raw = await ai(prompt);
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]);
    return { summary: raw, options: [], followUp: '' };
  } catch { /* fall through */ }

  return { summary: 'Copilot analysis requires server-side provider keys (TOGETHER_API_KEY, OPENAI_API_KEY, or GEMINI_API_KEY).', options: [], followUp: '' };
};

// ─── extractFileTextViaAI ─────────────────────────────────────────────────────

const SUPPORTED_MIME_TYPES: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.txt': 'text/plain',
  '.md': 'text/markdown',
  '.csv': 'text/csv',
};

export const extractFileTextViaAI = async (file: File): Promise<string> => {
  const lowerName = file.name.toLowerCase();
  const MAX_BYTES = 18 * 1024 * 1024;

  if (file.size > MAX_BYTES) {
    return `[${file.name}] - File too large for extraction (${(file.size / 1024 / 1024).toFixed(1)} MB). Please reduce to under 18 MB.`;
  }

  // 1. Bedrock vision/document API (PDF, images)
  if (isDirectBedrockConfigured()) {
    try {
      const extracted = await extractFileViaBedrock(file);
      if (extracted) return `[${file.name}]\n${extracted}`;
    } catch (err) {
      console.warn('Bedrock file extraction failed:', err);
    }
  }

  // 2. Client-side PDF text extraction (browser-native, no credentials needed)
  if (lowerName.endsWith('.pdf')) {
    try {
      const pdfjsLib = await import('pdfjs-dist');
      // Point the worker at the bundled file in pdfjs-dist - Vite resolves this at build time
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.min.mjs',
        import.meta.url
      ).toString();
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const pages: string[] = [];
      const maxPages = Math.min(pdf.numPages, 120);
      for (let i = 1; i <= maxPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items
          .map((item: Record<string, unknown>) => (typeof item['str'] === 'string' ? item['str'] : ''))
          .join(' ');
        if (pageText.trim()) pages.push(pageText);
      }
      const fullText = pages.join('\n\n').trim();
      if (fullText.length > 50) {
        return `[${file.name}] (${pdf.numPages} pages - client extracted)\n${fullText.slice(0, 60000)}`;
      }
    } catch (pdfErr) {
      console.warn('Client-side PDF extraction failed, falling back:', pdfErr);
    }
  }

  // 3. Plain text fallback (txt, md, csv, xml - anything readable as text)
  const isTextLike = ['.txt', '.md', '.csv', '.xml', '.json', '.html', '.htm', '.log'].some(e => lowerName.endsWith(e));
  const ext = Object.keys(SUPPORTED_MIME_TYPES).find(e => lowerName.endsWith(e));
  if (isTextLike || (ext && SUPPORTED_MIME_TYPES[ext]?.startsWith('text/'))) {
    try {
      const raw = await file.text();
      if (raw.trim().length > 20) {
        return `[${file.name}] (text read)\n${raw.slice(0, 32000)}`;
      }
    } catch { /* ignore */ }
  }

  return `[${file.name}] - File content could not be extracted. Please convert to plain text (.txt) and re-upload, or paste the content directly into the chat.`;
};

