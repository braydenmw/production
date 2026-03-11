/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * BW NEXUS AI — AI ENGINE LAYER
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Wraps the existing heuristic engines with real LLM calls.
 *
 * Instead of modifying every engine file (fragile), this layer:
 *  1. Takes the heuristic output from an existing engine
 *  2. Sends it to the LLM for enhancement, validation, or deeper analysis
 *  3. Returns a richer, AI-augmented result
 *
 * Engines enhanced:
 *  • GlobalIssueResolver    → AI classification + root cause analysis
 *  • SituationAnalysisEngine → AI for each of the 7 perspectives
 *  • BayesianDebateEngine   → AI-generated debate positions
 *  • DeepThinkingEngine     → AI chain-of-thought reasoning
 *  • CompositeScoreService  → AI narrative interpretation of scores
 *
 * Uses MultiModelRouter to pick the right model per task:
 *  • Classification/extraction → Fast 3B model
 *  • Deep reasoning/debate     → Main 70B model
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { classifyWithAI, extractWithAI, summarizeWithAI, reasonWithAI } from './MultiModelRouter';
import { webSearch, formatResultsForPrompt } from './WebSearchGateway';

// ─── AI-Enhanced Issue Classification ───────────────────────────────────────

export interface AIClassification {
  category: string;
  subcategory: string;
  confidence: number;
  reasoning: string;
  relatedTopics: string[];
  suggestedApproaches: string[];
}

/**
 * Use AI to classify ANY user query into a structured issue category.
 * Far more accurate than keyword matching.
 */
export async function classifyIssue(userQuery: string): Promise<AIClassification> {
  const prompt = `Classify this user query into exactly ONE primary category and subcategory.

QUERY: "${userQuery}"

CATEGORIES:
- location_development (city/region analysis, geography, infrastructure)
- company_strategy (corporate, business planning, M&A)
- market_analysis (industry, sector, consumer, trade)
- investment_opportunity (venture, capital, ROI, funding)
- policy_impact (regulation, law, government, compliance)
- risk_assessment (threat, vulnerability, geopolitical risk)
- infrastructure (transport, port, utilities, logistics)
- environmental (sustainability, ESG, climate, carbon)
- geopolitical (trade relations, conflict, diplomacy, sanctions)
- financial_crisis (economic, debt, liquidity)
- innovation_gap (technology, digital transformation, AI)
- general_knowledge (history, culture, education, science)

Return ONLY valid JSON:
{"category":"...","subcategory":"...","confidence":0.95,"reasoning":"...","relatedTopics":["..."],"suggestedApproaches":["..."]}`;

  try {
    const raw = await classifyWithAI(prompt);
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch { /* fall through */ }

  // Fallback: basic keyword classification
  return {
    category: 'general_knowledge',
    subcategory: 'unclassified',
    confidence: 0.3,
    reasoning: 'Classified via fallback',
    relatedTopics: [],
    suggestedApproaches: ['general_analysis'],
  };
}

// ─── AI-Enhanced Situation Analysis ─────────────────────────────────────────

export interface AISituationPerspective {
  viewpoint: string;
  analysis: string;
  confidence: number;
  actionItems: string[];
}

export interface AISituationAnalysis {
  perspectives: AISituationPerspective[];
  blindSpots: string[];
  unconsideredNeeds: string[];
  recommendedQuestions: string[];
  synthesisNarrative: string;
}

/**
 * Run the 7-perspective situation analysis using real AI reasoning.
 */
export async function analyseWithAI(
  query: string,
  context: { country?: string; sector?: string; objective?: string } = {}
): Promise<AISituationAnalysis> {
  const contextStr = [
    context.country && `Country: ${context.country}`,
    context.sector && `Sector: ${context.sector}`,
    context.objective && `Objective: ${context.objective}`,
  ].filter(Boolean).join(' | ');

  try {
    const raw = await reasonWithAI([
      {
        role: 'system',
        content: `You are a senior strategic advisor with 60 years of experience across government, banking, and international development. Analyse this situation from SEVEN perspectives. Be specific, not generic.`,
      },
      {
        role: 'user',
        content: `SITUATION: ${query}
${contextStr ? `CONTEXT: ${contextStr}` : ''}

Analyse from these 7 perspectives and return ONLY valid JSON:
{
  "perspectives": [
    {"viewpoint":"Explicit Needs","analysis":"...","confidence":0.9,"actionItems":["..."]},
    {"viewpoint":"Implicit Needs","analysis":"...","confidence":0.8,"actionItems":["..."]},
    {"viewpoint":"Unconsidered Needs","analysis":"...","confidence":0.7,"actionItems":["..."]},
    {"viewpoint":"Contrarian View","analysis":"...","confidence":0.75,"actionItems":["..."]},
    {"viewpoint":"Historical Parallel","analysis":"...","confidence":0.8,"actionItems":["..."]},
    {"viewpoint":"Stakeholder View","analysis":"...","confidence":0.85,"actionItems":["..."]},
    {"viewpoint":"Time-Horizon Divergence","analysis":"...","confidence":0.8,"actionItems":["..."]}
  ],
  "blindSpots":["..."],
  "unconsideredNeeds":["..."],
  "recommendedQuestions":["..."],
  "synthesisNarrative":"A 2-3 sentence synthesis..."
}`,
      },
    ]);

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch { /* fall through */ }

  return {
    perspectives: [],
    blindSpots: [],
    unconsideredNeeds: [],
    recommendedQuestions: [],
    synthesisNarrative: 'Analysis could not be completed.',
  };
}

// ─── AI-Enhanced Root Cause Analysis ────────────────────────────────────────

export interface AIRootCauseAnalysis {
  rootCauses: Array<{ cause: string; evidence: string; severity: 'high' | 'medium' | 'low' }>;
  contributingFactors: string[];
  systemicPatterns: string[];
  interventionPoints: Array<{ point: string; expectedImpact: string; difficulty: string }>;
}

/**
 * Deep AI-powered root cause analysis of any problem.
 */
export async function analyseRootCauses(
  problem: string,
  context?: string
): Promise<AIRootCauseAnalysis> {
  try {
    const raw = await reasonWithAI([
      {
        role: 'system',
        content: 'You are an expert systems analyst. Perform a rigorous root cause analysis. Distinguish symptoms from causes. Identify systemic patterns. Return structured JSON.',
      },
      {
        role: 'user',
        content: `PROBLEM: ${problem}${context ? `\nCONTEXT: ${context}` : ''}

Return ONLY valid JSON:
{"rootCauses":[{"cause":"...","evidence":"...","severity":"high|medium|low"}],"contributingFactors":["..."],"systemicPatterns":["..."],"interventionPoints":[{"point":"...","expectedImpact":"...","difficulty":"easy|moderate|hard"}]}`,
      },
    ]);

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
  } catch { /* fall through */ }

  return { rootCauses: [], contributingFactors: [], systemicPatterns: [], interventionPoints: [] };
}

// ─── AI-Enhanced Web Research ──────────────────────────────────────────────

export interface AIResearchResult {
  query: string;
  searchResults: string;
  aiSynthesis: string;
  keyFindings: string[];
  dataPoints: Array<{ label: string; value: string; source: string }>;
  confidence: number;
}

/**
 * Research a topic: web search → extract key data → AI synthesis.
 * This is the "brain + Google" combo — the ability to research anything.
 */
export async function researchTopic(query: string): Promise<AIResearchResult> {
  // 1. Web search
  const results = await webSearch(query, { maxResults: 6 });
  const formattedResults = formatResultsForPrompt(results, 3000);

  // 2. AI synthesis of search results
  let aiSynthesis = '';
  let keyFindings: string[] = [];
  let dataPoints: Array<{ label: string; value: string; source: string }> = [];

  if (formattedResults) {
    try {
      const raw = await summarizeWithAI(
        `Based on these web search results, provide a factual synthesis and extract key data points.

${formattedResults}

TOPIC: ${query}

Return ONLY valid JSON:
{"synthesis":"A comprehensive 3-5 sentence summary with specific facts and numbers...","keyFindings":["Finding 1 with data","Finding 2"],"dataPoints":[{"label":"GDP Growth","value":"3.2%","source":"World Bank"}],"confidence":0.85}`
      );

      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        aiSynthesis = parsed.synthesis || '';
        keyFindings = parsed.keyFindings || [];
        dataPoints = parsed.dataPoints || [];
      }
    } catch {
      aiSynthesis = results.map(r => r.snippet).join(' ');
    }
  }

  return {
    query,
    searchResults: formattedResults,
    aiSynthesis,
    keyFindings,
    dataPoints,
    confidence: results.length > 0 ? 0.7 + (results.length * 0.03) : 0.2,
  };
}

// ─── AI Score Interpretation ────────────────────────────────────────────────

/**
 * Take numeric scores from CompositeScoreService and generate a
 * human-readable narrative interpretation using AI.
 */
export async function interpretScores(
  country: string,
  scores: Record<string, number>,
  context?: string
): Promise<string> {
  const scoreLines = Object.entries(scores)
    .map(([k, v]) => `${k}: ${typeof v === 'number' ? v.toFixed(1) : v}`)
    .join('\n');

  try {
    return await summarizeWithAI(
      `You are a senior analyst. Interpret these composite scores for ${country} into a concise executive narrative (3-4 sentences). Highlight strengths, weaknesses, and strategic implications.

SCORES:
${scoreLines}
${context ? `\nCONTEXT: ${context}` : ''}

Write a direct analytical narrative — no preamble, no bullet points.`
    );
  } catch {
    return `${country} scores: ${scoreLines}`;
  }
}

// ─── AI Debate Generator ────────────────────────────────────────────────────

export interface AIDebateResult {
  proposition: string;
  forArguments: Array<{ point: string; evidence: string; strength: number }>;
  againstArguments: Array<{ point: string; evidence: string; strength: number }>;
  synthesis: string;
  recommendation: string;
  confidenceLevel: number;
}

/**
 * Generate a structured debate on any proposition using AI.
 * Replaces the heuristic BayesianDebateEngine with real reasoning.
 */
export async function generateDebate(proposition: string, context?: string): Promise<AIDebateResult> {
  try {
    const raw = await reasonWithAI([
      {
        role: 'system',
        content: 'You are a balanced policy analyst. Generate a rigorous debate with evidence-based arguments on both sides. Be specific with data and examples.',
      },
      {
        role: 'user',
        content: `PROPOSITION: "${proposition}"
${context ? `CONTEXT: ${context}` : ''}

Generate a structured debate. Return ONLY valid JSON:
{"proposition":"...","forArguments":[{"point":"...","evidence":"...","strength":0.8}],"againstArguments":[{"point":"...","evidence":"...","strength":0.7}],"synthesis":"Balanced summary...","recommendation":"What should be done...","confidenceLevel":0.75}`,
      },
    ]);

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
  } catch { /* fall through */ }

  return {
    proposition,
    forArguments: [],
    againstArguments: [],
    synthesis: 'Debate could not be generated.',
    recommendation: '',
    confidenceLevel: 0,
  };
}

// ─── Unified Engine Entry Point ─────────────────────────────────────────────

export const AIEngineLayer = {
  classifyIssue,
  analyseWithAI,
  analyseRootCauses,
  researchTopic,
  interpretScores,
  generateDebate,
};

export default AIEngineLayer;
