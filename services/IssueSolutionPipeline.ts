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

import { GlobalIssueResolver } from './GlobalIssueResolver';
import { SituationAnalysisEngine } from './SituationAnalysisEngine';
import { ProblemToSolutionGraphService } from './ProblemToSolutionGraphService';
import { HistoricalParallelMatcher } from './HistoricalParallelMatcher';
import MotivationDetector from './MotivationDetector';
import { NSILIntelligenceHub } from './NSILIntelligenceHub';
import { DecisionPipeline } from './DecisionPipeline';
import type { ReportParameters } from '../types';

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

function toReportParams(input: IssuePipelineInput): ReportParameters {
  return {
    organizationName: input.organizationName || 'Unknown Organisation',
    country: input.country || '',
    specificOpportunity: input.currentMatter || input.issue,
    strategicIntent: input.objectives ? [input.objectives] : [],
    sector: input.sector || input.organizationType || 'General',
    organizationType: input.organizationType || '',
    currentMatter: input.currentMatter || input.issue,
    objectives: input.objectives || '',
    constraints: input.constraints || '',
    uploadedDocuments: input.uploadedDocuments || [],
  } as unknown as ReportParameters;
}

// ─── Pipeline ─────────────────────────────────────────────────────────────────

export async function runIssuePipeline(input: IssuePipelineInput): Promise<IntelligenceBlock> {
  const params = toReportParams(input);

  // Run all engines in parallel — none block each other
  const [
    issueResult,
    situationResult,
    problemGraph,
    historicalResult,
    motivationResult,
    nsилResult,
    decisionResult,
  ] = await Promise.allSettled([

    // 1. GlobalIssueResolver — what kind of issue is this?
    //    Instance method — must instantiate
    (async () => {
      try { return await new GlobalIssueResolver().resolveIssue(input.issue); } catch { return null; }
    })(),

    // 2. SituationAnalysisEngine — 7 perspectives on the situation
    Promise.resolve().then(() => {
      try { return SituationAnalysisEngine.analyse(params); } catch { return null; }
    }),

    // 3. ProblemToSolutionGraphService — root causes → leverage points
    Promise.resolve().then(() => {
      try {
        return ProblemToSolutionGraphService.buildGraph({
          currentMatter: input.currentMatter || input.issue,
          objectives: input.objectives || '',
          constraints: input.constraints || '',
          evidenceNotes: input.uploadedDocuments || [],
        });
      } catch { return null; }
    }),

    // 4. HistoricalParallelMatcher — real historical cases
    Promise.resolve().then(() => {
      try { return HistoricalParallelMatcher.match(params); } catch { return null; }
    }),

    // 5. MotivationDetector — scans all case context text for risk signals
    //    Takes ReportParameters (not raw string)
    Promise.resolve().then(() => {
      try { return MotivationDetector.scanForTriggers(params as unknown as ReportParameters); } catch { return null; }
    }),

    // 6. NSILIntelligenceHub — quick strategic assessment score
    Promise.resolve().then(() => {
      try { return NSILIntelligenceHub.quickAssess(params); } catch { return null; }
    }),

    // 7. DecisionPipeline — structured decision packet
    (async () => {
      try { return await DecisionPipeline.run(params as unknown as ReportParameters); } catch { return null; }
    })(),
  ]);

  // ─── Unpack results (all optional — any failures are non-blocking) ──────────

  const issue = issueResult.status === 'fulfilled' ? issueResult.value : null;
  const situation = situationResult.status === 'fulfilled' ? situationResult.value : null;
  const graph = problemGraph.status === 'fulfilled' ? problemGraph.value : null;
  const historical = historicalResult.status === 'fulfilled' ? historicalResult.value : null;
  const motivation = motivationResult.status === 'fulfilled' ? motivationResult.value : null;
  const nsил = nsилResult.status === 'fulfilled' ? nsилResult.value : null;
  const decision = decisionResult.status === 'fulfilled' ? decisionResult.value : null;

  // ─── Extract key intelligence ───────────────────────────────────────────────

  const issueClassification: string =
    (issue as unknown as Record<string, string>)?.issueCategory ||
    (issue as unknown as Record<string, string>)?.issueType ||
    'General advisory';

  type R = Record<string, unknown>;

  const rootCauses: string[] =
    ((graph as R)?.rootCauses as R[] | undefined)?.map((n: R) => String(n.description || n)).filter(Boolean).slice(0, 4) ||
    ((issue as R)?.rootCauses as string[] | undefined)?.slice(0, 4) ||
    [];

  const leveragePoints: string[] =
    ((graph as R)?.leveragePoints as R[] | undefined)?.map((n: R) => String(n.description || n)).filter(Boolean).slice(0, 4) ||
    ((issue as R)?.strategicRecommendations as string[] | undefined)?.slice(0, 4) ||
    [];

  const situationSummary: string =
    String((situation as R)?.executiveSummary || (situation as R)?.summary || '');

  const historicalParallels: string[] = (() => {
    const raw = (historical as R);
    const matches = (raw?.matches as R[] | undefined) || (raw?.topMatches as R[] | undefined) || [];
    return matches.slice(0, 3).map((m: R) =>
      `${String(m.caseName || m.name || 'Historical case')} (${String(m.country || '')}, ${String(m.year || '')}) — ${String(m.outcome || m.lesson || '')}`
    ).filter(Boolean);
  })();

  type Signal = { riskLevel?: string; implication?: string; recommendation?: string };
  const hiddenRisks: string[] =
    Array.isArray(motivation)
      ? (motivation as Signal[]).filter(s => s.riskLevel === 'high' || s.riskLevel === 'critical').slice(0, 3)
          .map((s: Signal) => `[${s.riskLevel?.toUpperCase()}] ${s.implication} — ${s.recommendation}`)
      : [];

  const strategicScore: number = ((nsил as R)?.trustScore as number | undefined) ?? 0;
  const nsилSummary: string = String((nsил as R)?.headline || '');

  const dec = decision as R;
  const pkt = dec?.packet as R | undefined;
  const decisionFrame: string = String(pkt?.summary || pkt?.recommendation || dec?.summary || '');

  const immediateActions: string[] =
    (pkt?.immediateActions as string[] | undefined)?.slice(0, 3) ||
    ((issue as R)?.implementationRoadmap as R[] | undefined)?.[0]
      ? (((issue as R).implementationRoadmap as R[])[0].keyActions as string[] | undefined)?.slice(0, 3) || []
      : [];

  // ─── Build the prompt block ─────────────────────────────────────────────────

  const sections: string[] = [];

  sections.push(`## ISSUE INTELLIGENCE BRIEF`);
  sections.push(`**Issue type:** ${issueClassification}`);

  if (rootCauses.length) {
    sections.push(`\n**Root causes identified:**\n${rootCauses.map(c => `• ${c}`).join('\n')}`);
  }

  if (leveragePoints.length) {
    sections.push(`\n**Key leverage points (where intervention has highest impact):**\n${leveragePoints.map(l => `• ${l}`).join('\n')}`);
  }

  if (situationSummary) {
    sections.push(`\n**Situation analysis (7 perspectives):**\n${situationSummary}`);
  }

  if (historicalParallels.length) {
    sections.push(`\n**Historical parallels (matched cases):**\n${historicalParallels.map(h => `• ${h}`).join('\n')}`);
  }

  if (hiddenRisks.length) {
    sections.push(`\n**Hidden risks / signals detected:**\n${hiddenRisks.map(r => `• ${r}`).join('\n')}`);
  }

  if (strategicScore > 0) {
    sections.push(`\n**NSIL strategic score:** ${strategicScore}/100${nsилSummary ? `\n${nsилSummary}` : ''}`);
  }

  if (decisionFrame) {
    sections.push(`\n**Decision framework:** ${decisionFrame}`);
  }

  if (immediateActions.length) {
    sections.push(`\n**Recommended immediate actions:**\n${immediateActions.map(a => `• ${a}`).join('\n')}`);
  }

  const promptBlock = sections.join('\n');

  const complete = [issue, situation, graph, historical, nsил].filter(Boolean).length >= 3;

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
