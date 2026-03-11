/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * BW NEXUS AI — REGIONAL INTELLIGENCE AGENT
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * A self-thinking, autonomous research agent that can:
 *
 *  1. PLAN — Break a complex regional question into sub-tasks
 *  2. RESEARCH — Gather real-time data via web search + live APIs
 *  3. ANALYSE — Run AI-powered multi-perspective analysis
 *  4. SYNTHESIZE — Produce a comprehensive intelligence brief
 *
 * This is the "give me a full brief on Region X" capability.
 *
 * Uses:
 *  - WebSearchGateway for live web data
 *  - AIEngineLayer for AI-powered analysis
 *  - MultiModelRouter for optimal model selection
 *  - ConversationMemoryManager for context retention
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { searchNews, searchGovernment, formatResultsForPrompt } from './WebSearchGateway';
import { classifyIssue, researchTopic, analyseRootCauses } from './AIEngineLayer';
import { reasonWithAI } from './MultiModelRouter';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface RegionalBrief {
  region: string;
  timestamp: string;
  executiveSummary: string;
  sections: BriefSection[];
  keyDataPoints: DataPoint[];
  riskAssessment: RiskItem[];
  opportunities: OpportunityItem[];
  recommendations: string[];
  sourcesUsed: number;
  confidenceScore: number;
}

export interface BriefSection {
  title: string;
  content: string;
  sources: string[];
  confidence: number;
}

export interface DataPoint {
  label: string;
  value: string;
  source: string;
  date?: string;
}

export interface RiskItem {
  risk: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  likelihood: string;
  mitigation: string;
}

export interface OpportunityItem {
  opportunity: string;
  sector: string;
  timeframe: string;
  rationale: string;
}

export interface AgentStep {
  step: number;
  action: string;
  status: 'pending' | 'running' | 'done' | 'failed';
  result?: string;
}

// ─── Agent Core ─────────────────────────────────────────────────────────────

/**
 * Run the Regional Intelligence Agent for a given region/topic.
 * Streams progress via onStep callback.
 */
export async function generateRegionalBrief(
  query: string,
  options: {
    country?: string;
    sector?: string;
    depth?: 'quick' | 'standard' | 'deep';
    onStep?: (step: AgentStep) => void;
  } = {}
): Promise<RegionalBrief> {
  const { country, sector, depth = 'standard', onStep } = options;
  const region = country || extractRegionFromQuery(query);
  const steps: AgentStep[] = [];

  function reportStep(action: string, status: AgentStep['status'], result?: string): void {
    const step: AgentStep = { step: steps.length + 1, action, status, result };
    steps.push(step);
    onStep?.(step);
  }

  // ── STEP 1: Plan research sub-tasks ───────────────────────────────────
  reportStep('Planning research tasks', 'running');

  const classification = await classifyIssue(query);
  const researchTopics = planResearchTopics(query, region, sector, classification.category, depth);
  reportStep('Planning research tasks', 'done', `${researchTopics.length} tasks planned`);

  // ── STEP 2: Gather data in parallel ───────────────────────────────────
  reportStep('Gathering live data', 'running');

  const gatherPromises: Promise<{ topic: string; data: string; sources: string[] }>[] = [];

  for (const topic of researchTopics) {
    gatherPromises.push(gatherTopicData(topic, region));
  }

  // Also gather news and government data
  gatherPromises.push(gatherNewsData(region, sector));
  if (region) {
    gatherPromises.push(gatherGovernmentData(region, sector));
  }

  const gatheredData = await Promise.all(gatherPromises.map(p => p.catch(() => null)));
  const validData = gatheredData.filter((d): d is NonNullable<typeof d> => d !== null);
  reportStep('Gathering live data', 'done', `${validData.length} data sources collected`);

  // ── STEP 3: AI Analysis ───────────────────────────────────────────────
  reportStep('Running AI analysis', 'running');

  const combinedData = validData.map(d => `## ${d.topic}\n${d.data}`).join('\n\n');

  // Run root cause analysis if the query implies a problem
  let rootCauseAnalysis = '';
  if (classification.category.includes('risk') || classification.category.includes('crisis') || query.match(/problem|challenge|issue|threat/i)) {
    const rca = await analyseRootCauses(query, combinedData.slice(0, 3000));
    if (rca.rootCauses.length > 0) {
      rootCauseAnalysis = rca.rootCauses.map(rc => `- ${rc.cause} (${rc.severity}): ${rc.evidence}`).join('\n');
    }
  }

  reportStep('Running AI analysis', 'done');

  // ── STEP 4: Synthesize into brief ─────────────────────────────────────
  reportStep('Synthesizing intelligence brief', 'running');

  const brief = await synthesizeBrief(query, region, sector, validData, rootCauseAnalysis, classification);
  reportStep('Synthesizing intelligence brief', 'done');

  return brief;
}

// ─── Research Planning ──────────────────────────────────────────────────────

function planResearchTopics(
  query: string,
  region: string,
  sector: string | undefined,
  category: string,
  depth: string
): string[] {
  const topics: string[] = [];

  // Core topic
  topics.push(query);

  // Category-specific research
  if (category.includes('location') || category.includes('infrastructure')) {
    topics.push(`${region} economic development indicators`);
    topics.push(`${region} infrastructure investment opportunities`);
    if (depth !== 'quick') topics.push(`${region} governance and regulatory environment`);
  } else if (category.includes('market') || category.includes('investment')) {
    topics.push(`${region} ${sector || 'market'} investment climate`);
    topics.push(`${region} economic growth forecast`);
    if (depth !== 'quick') topics.push(`${region} foreign direct investment trends`);
  } else if (category.includes('risk') || category.includes('geopolitical')) {
    topics.push(`${region} political stability risk assessment`);
    topics.push(`${region} security and conflict analysis`);
    if (depth !== 'quick') topics.push(`${region} economic vulnerability indicators`);
  } else if (category.includes('policy')) {
    topics.push(`${region} government policy reforms`);
    topics.push(`${region} regulatory environment business`);
  } else {
    topics.push(`${region} current situation analysis`);
    if (depth !== 'quick') topics.push(`${region} development challenges opportunities`);
  }

  if (sector && depth === 'deep') {
    topics.push(`${region} ${sector} sector analysis`);
    topics.push(`${region} ${sector} competitive landscape`);
  }

  // Limit based on depth
  const maxTopics = depth === 'quick' ? 3 : depth === 'standard' ? 5 : 8;
  return topics.slice(0, maxTopics);
}

// ─── Data Gathering ─────────────────────────────────────────────────────────

async function gatherTopicData(topic: string, region: string): Promise<{ topic: string; data: string; sources: string[] }> {
  const research = await researchTopic(`${topic} ${region}`);
  return {
    topic,
    data: research.aiSynthesis || research.searchResults || 'No data found.',
    sources: research.keyFindings,
  };
}

async function gatherNewsData(region: string, sector?: string): Promise<{ topic: string; data: string; sources: string[] }> {
  const q = sector ? `${region} ${sector} news` : `${region} latest news developments`;
  const results = await searchNews(q);
  const formatted = formatResultsForPrompt(results, 2000);
  return {
    topic: 'Recent News & Developments',
    data: formatted || 'No recent news found.',
    sources: results.map(r => r.source),
  };
}

async function gatherGovernmentData(region: string, sector?: string): Promise<{ topic: string; data: string; sources: string[] }> {
  const q = sector ? `${region} ${sector} government policy` : `${region} government development`;
  const results = await searchGovernment(q);
  const formatted = formatResultsForPrompt(results, 1500);
  return {
    topic: 'Government & Policy Sources',
    data: formatted || 'No government sources found.',
    sources: results.map(r => r.source),
  };
}

// ─── Brief Synthesis ────────────────────────────────────────────────────────

async function synthesizeBrief(
  query: string,
  region: string,
  sector: string | undefined,
  data: Array<{ topic: string; data: string; sources: string[] }>,
  rootCauseAnalysis: string,
  classification: { category: string; confidence: number }
): Promise<RegionalBrief> {
  const combinedInsights = data.map(d => `### ${d.topic}\n${d.data.slice(0, 1500)}`).join('\n\n');

  try {
    const raw = await reasonWithAI([
      {
        role: 'system',
        content: `You are a senior intelligence analyst producing a Regional Intelligence Brief. Use ONLY the provided research data. Be specific with facts, numbers, and sources. Do not invent data.`,
      },
      {
        role: 'user',
        content: `QUERY: ${query}
REGION: ${region}
${sector ? `SECTOR: ${sector}` : ''}
CATEGORY: ${classification.category}
${rootCauseAnalysis ? `ROOT CAUSE ANALYSIS:\n${rootCauseAnalysis}` : ''}

RESEARCH DATA:
${combinedInsights.slice(0, 6000)}

Produce a Regional Intelligence Brief. Return ONLY valid JSON:
{
  "executiveSummary": "3-4 sentence executive summary with specific facts...",
  "sections": [
    {"title": "Section Title", "content": "Detailed analysis...", "sources": ["source1"], "confidence": 0.8}
  ],
  "keyDataPoints": [
    {"label": "GDP Growth", "value": "3.2%", "source": "World Bank"}
  ],
  "riskAssessment": [
    {"risk": "...", "severity": "high", "likelihood": "probable", "mitigation": "..."}
  ],
  "opportunities": [
    {"opportunity": "...", "sector": "...", "timeframe": "short-term", "rationale": "..."}
  ],
  "recommendations": ["Specific recommendation 1...", "Specific recommendation 2..."],
  "confidenceScore": 0.75
}`,
      },
    ]);

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        region,
        timestamp: new Date().toISOString(),
        executiveSummary: parsed.executiveSummary || 'Brief generated.',
        sections: parsed.sections || [],
        keyDataPoints: parsed.keyDataPoints || [],
        riskAssessment: parsed.riskAssessment || [],
        opportunities: parsed.opportunities || [],
        recommendations: parsed.recommendations || [],
        sourcesUsed: data.reduce((n, d) => n + d.sources.length, 0),
        confidenceScore: parsed.confidenceScore || 0.5,
      };
    }
  } catch { /* fall through */ }

  // Fallback: simple brief from raw data
  return {
    region,
    timestamp: new Date().toISOString(),
    executiveSummary: data.map(d => d.data.slice(0, 200)).join(' '),
    sections: data.map(d => ({ title: d.topic, content: d.data, sources: d.sources, confidence: 0.5 })),
    keyDataPoints: [],
    riskAssessment: [],
    opportunities: [],
    recommendations: [],
    sourcesUsed: data.length,
    confidenceScore: 0.3,
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function extractRegionFromQuery(query: string): string {
  // Try to find a country/region name in the query
  const words = query.split(/\s+/);
  // Capitalize first letter of each word as a heuristic for proper nouns
  const properNouns = words.filter(w => w.length > 2 && w[0] === w[0].toUpperCase());
  return properNouns.join(' ') || query.split(/\s+/).slice(0, 3).join(' ');
}

/**
 * Quick regional intel — less depth, faster results.
 */
export async function quickRegionalIntel(
  query: string,
  country?: string
): Promise<{ summary: string; keyFacts: string[]; sources: number }> {
  const brief = await generateRegionalBrief(query, {
    country,
    depth: 'quick',
  });

  return {
    summary: brief.executiveSummary,
    keyFacts: brief.keyDataPoints.map(dp => `${dp.label}: ${dp.value}`),
    sources: brief.sourcesUsed,
  };
}

export default {
  generateRegionalBrief,
  quickRegionalIntel,
};
