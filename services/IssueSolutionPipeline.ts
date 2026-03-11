/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * BW NEXUS AI — ISSUE → SOLUTION PIPELINE
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * This is the missing connector between the user's issue and the AI answer.
 *
 * It runs all analysis engines IN PARALLEL the moment a user states an issue,
 * packages their output into a structured intelligence block, and injects it
 * into the ReasoningPipeline so the AI answers from real analysis — not guesswork.
 *
 * PIPELINE:
 *
 *   User Issue
 *       │
 *       ├─ [GlobalIssueResolver]        → Issue classification + root causes
 *       ├─ [SituationAnalysisEngine]    → 7-perspective situation analysis
 *       ├─ [ProblemToSolutionGraph]     → Problem graph → leverage points
 *       ├─ [HistoricalParallelMatcher]  → Real historical case matches
 *       ├─ [MotivationDetector]         → Hidden risks + intent signals
 *       ├─ [NSILIntelligenceHub]        → Quick strategic assessment score
 *       └─ [DecisionPipeline]           → Structured decision packet
 *           │
 *           ▼
 *     IntelligenceBlock (structured context)
 *           │
 *           ▼
 *     ReasoningPipeline (Think → Reason → Solve → Answer)
 *           │
 *           ▼
 *     AI Response (grounded in full analysis)
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import {
  classifyIssue,
  analyseWithAI,
  analyseRootCauses,
  researchTopic,
  generateDebate,
} from './AIEngineLayer';
import { LiveDataService } from './LiveDataService';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface IssuePipelineInput {
  /** The raw user issue / question */
  issue: string;
  /** Case context fields */
  country?: string;
  organizationName?: string;
  organizationType?: string;
  objectives?: string;
  currentMatter?: string;
  constraints?: string;
  sector?: string;
  uploadedDocuments?: string[];
}

export interface IntelligenceBlock {
  /** What type of issue this is */
  issueClassification: string;
  /** Root causes identified */
  rootCauses: string[];
  /** Key leverage points to solve it */
  leveragePoints: string[];
  /** 7-perspective situation summary */
  situationSummary: string;
  /** Historical parallels (real cases) */
  historicalParallels: string[];
  /** Hidden risks / motivations detected */
  hiddenRisks: string[];
  /** NSIL strategic score (0–100) */
  strategicScore: number;
  /** NSIL assessment summary */
  nsилSummary: string;
  /** Decision structure */
  decisionFrame: string;
  /** Recommended immediate actions */
  immediateActions: string[];
  /** Formatted prompt block for AI injection */
  promptBlock: string;
  /** Whether all engines ran successfully */
  complete: boolean;
}

// ─── Param builder ────────────────────────────────────────────────────────────

// ─── Pipeline ─────────────────────────────────────────────────────────────────

export async function runIssuePipeline(input: IssuePipelineInput): Promise<IntelligenceBlock> {
  const contextStr = [
    input.country && `Country: ${input.country}`,
    input.sector && `Sector: ${input.sector}`,
    input.objectives && `Objectives: ${input.objectives}`,
    input.constraints && `Constraints: ${input.constraints}`,
  ].filter(Boolean).join(' | ');

  const fullQuery = input.currentMatter
    ? `${input.issue}\n\nContext: ${input.currentMatter}`
    : input.issue;

  // ─── Run ALL AI engines in parallel — every one calls real LLM ────────────

  const [
    classificationResult,
    rootCauseResult,
    situationResult,
    researchResult,
    debateResult,
    liveDataResult,
  ] = await Promise.allSettled([

    // 1. AI Issue Classification (replaces GlobalIssueResolver keyword matching)
    classifyIssue(input.issue),

    // 2. AI Root Cause Analysis (replaces ProblemToSolutionGraph templates)
    analyseRootCauses(fullQuery, contextStr),

    // 3. AI 7-Perspective Situation Analysis (replaces SituationAnalysisEngine templates)
    analyseWithAI(fullQuery, {
      country: input.country,
      sector: input.sector,
      objective: input.objectives,
    }),

    // 4. AI Web Research for real data (replaces HistoricalParallelMatcher fake cases)
    researchTopic(
      input.country
        ? `${input.issue} ${input.country} regional development policy data`
        : `${input.issue} regional development policy`
    ),

    // 5. AI Debate — balanced arguments for/against (replaces PersonaEngine field validation)
    generateDebate(
      input.objectives || input.issue,
      contextStr
    ),

    // 6. Real live data from World Bank + Exchange Rate APIs
    (async () => {
      if (!input.country) return null;
      try { return await LiveDataService.getCountryIntelligence(input.country); } catch { return null; }
    })(),
  ]);

  // ─── Unpack results (all optional — any failures are non-blocking) ──────────

  const classification = classificationResult.status === 'fulfilled' ? classificationResult.value : null;
  const rootCause = rootCauseResult.status === 'fulfilled' ? rootCauseResult.value : null;
  const situation = situationResult.status === 'fulfilled' ? situationResult.value : null;
  const research = researchResult.status === 'fulfilled' ? researchResult.value : null;
  const debate = debateResult.status === 'fulfilled' ? debateResult.value : null;
  const liveData = liveDataResult.status === 'fulfilled' ? liveDataResult.value : null;

  // ─── Extract key intelligence from AI results ────────────────────────────

  const issueClassification: string =
    classification
      ? `${classification.category} / ${classification.subcategory} (AI confidence: ${(classification.confidence * 100).toFixed(0)}%)`
      : 'General advisory';

  const rootCauses: string[] =
    rootCause?.rootCauses?.slice(0, 4).map(rc => `${rc.cause} [${rc.severity}] — ${rc.evidence}`) || [];

  const leveragePoints: string[] =
    rootCause?.interventionPoints?.slice(0, 4).map(ip => `${ip.point} → Expected: ${ip.expectedImpact} (${ip.difficulty})`) || [];

  const situationSummary: string =
    situation?.synthesisNarrative ||
    situation?.perspectives?.map(p => `**${p.viewpoint}:** ${p.analysis}`).join('\n\n') ||
    '';

  // Real research replaces fake historical cases
  const historicalParallels: string[] =
    research?.keyFindings?.slice(0, 5) || [];

  // Debate "against" arguments serve as risk detection (replaces MotivationDetector)
  const hiddenRisks: string[] =
    debate?.againstArguments?.slice(0, 4).map(a => `[Risk] ${a.point} — ${a.evidence}`) || [];

  // Research confidence as strategic score
  const strategicScore: number = research
    ? Math.round(research.confidence * 100)
    : 0;

  // Live economic data as NSIL summary (replaces fake NSIL trust score)
  const econ = liveData?.economics;
  const nsилSummary: string = econ
    ? `Live data: GDP Growth ${econ.gdpGrowth?.toFixed(1) ?? 'N/A'}%, Inflation ${econ.inflation?.toFixed(1) ?? 'N/A'}%, FDI $${econ.fdiInflows ? (econ.fdiInflows / 1e9).toFixed(1) + 'B' : 'N/A'}, Population ${econ.population ? (econ.population / 1e6).toFixed(1) + 'M' : 'N/A'} (Source: World Bank)`
    : '';

  // Debate synthesis as decision frame
  const decisionFrame: string = debate
    ? `${debate.synthesis}\n\n**Recommendation:** ${debate.recommendation}`
    : '';

  const immediateActions: string[] = [
    ...(classification?.suggestedApproaches?.slice(0, 2) || []),
    ...(rootCause?.interventionPoints?.slice(0, 1).map(ip => ip.point) || []),
  ].slice(0, 3);

  // ─── Build the prompt block ─────────────────────────────────────────────────

  const sections: string[] = [];

  sections.push(`## ISSUE INTELLIGENCE BRIEF (AI-Analysed)`);
  sections.push(`**Issue type:** ${issueClassification}`);

  if (classification?.reasoning) {
    sections.push(`**AI reasoning:** ${classification.reasoning}`);
  }

  if (rootCauses.length) {
    sections.push(`\n**Root causes identified (AI analysis):**\n${rootCauses.map(c => `• ${c}`).join('\n')}`);
  }

  if (leveragePoints.length) {
    sections.push(`\n**Intervention points (ranked by impact):**\n${leveragePoints.map(l => `• ${l}`).join('\n')}`);
  }

  if (situationSummary) {
    sections.push(`\n**Situation analysis (7 AI perspectives):**\n${situationSummary}`);
  }

  if (situation?.blindSpots?.length) {
    sections.push(`\n**Blind spots identified:**\n${situation.blindSpots.map(b => `• ${b}`).join('\n')}`);
  }

  if (situation?.unconsideredNeeds?.length) {
    sections.push(`\n**Unconsidered needs:**\n${situation.unconsideredNeeds.map(n => `• ${n}`).join('\n')}`);
  }

  if (historicalParallels.length) {
    sections.push(`\n**Key research findings:**\n${historicalParallels.map(h => `• ${h}`).join('\n')}`);
  }

  if (research?.dataPoints?.length) {
    sections.push(`\n**Data points (from web research):**\n${research.dataPoints.map(d => `• ${d.label}: ${d.value} (${d.source})`).join('\n')}`);
  }

  if (hiddenRisks.length) {
    sections.push(`\n**Counter-arguments and risks:**\n${hiddenRisks.map(r => `• ${r}`).join('\n')}`);
  }

  if (debate?.forArguments?.length) {
    sections.push(`\n**Supporting arguments:**\n${debate.forArguments.slice(0, 3).map(a => `• ${a.point} — ${a.evidence}`).join('\n')}`);
  }

  if (nsилSummary) {
    sections.push(`\n**Live economic indicators:** ${nsилSummary}`);
  }

  if (strategicScore > 0) {
    sections.push(`\n**Research confidence:** ${strategicScore}/100`);
  }

  if (decisionFrame) {
    sections.push(`\n**Decision framework:**\n${decisionFrame}`);
  }

  if (immediateActions.length) {
    sections.push(`\n**Recommended immediate actions:**\n${immediateActions.map(a => `• ${a}`).join('\n')}`);
  }

  const promptBlock = sections.join('\n');

  const complete = [classification, rootCause, situation, research, debate].filter(Boolean).length >= 3;

  return {
    issueClassification,
    rootCauses,
    leveragePoints,
    situationSummary,
    historicalParallels,
    hiddenRisks,
    strategicScore,
    nsилSummary,
    decisionFrame,
    immediateActions,
    promptBlock,
    complete,
  };
}

export default { runIssuePipeline };
