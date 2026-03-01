import { deriveConsultantCapabilityProfile } from './consultantCapabilities.js';
import { buildAugmentedAISnapshot, getRecommendedAugmentedToolsForMode } from './augmentedAISupport.js';
import { buildOverlookedIntelligenceSnapshot } from './overlookedFirstEngine.js';

export interface StrategicPipelineStage {
  stage: string;
  detail: string;
  score?: number;
}

export interface StrategicPipelineOutput {
  model: 'nsil_strategic_pipeline_v8';
  objective: string;
  readinessScore: number;
  stages: StrategicPipelineStage[];
  recommendedPath: {
    targetRegion: string;
    strategy: string;
    rationale: string[];
  };
  engagementDraftHints: {
    governmentLetterFocus: string[];
    partnerLetterFocus: string[];
    investorBriefFocus: string[];
  };
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const extractObjective = (message: string, context?: unknown): string => {
  const root = context && typeof context === 'object' ? context as Record<string, unknown> : {};
  const caseStudy = root.caseStudy && typeof root.caseStudy === 'object' ? root.caseStudy as Record<string, unknown> : {};
  const explicitObjective = typeof caseStudy.objectives === 'string' ? caseStudy.objectives.trim() : '';
  if (explicitObjective.length >= 10) return explicitObjective;
  return message.trim().slice(0, 180) || 'Regional partnership and market expansion objective';
};

const choosePrimaryRegion = (opportunities: Array<{ place: string; score: number }>): string => {
  if (!opportunities.length) return 'Regional opportunity scan pending';
  return opportunities[0].place;
};

export const runStrategicIntelligencePipeline = (message: string, context?: unknown): StrategicPipelineOutput => {
  const capabilityProfile = deriveConsultantCapabilityProfile(message, context);
  const augmented = buildAugmentedAISnapshot(capabilityProfile);
  const overlooked = buildOverlookedIntelligenceSnapshot(message, context);
  const tools = getRecommendedAugmentedToolsForMode(capabilityProfile.mode);

  const gapPenalty = capabilityProfile.gaps.length * 8;
  const readinessScore = clamp(
    Math.round((overlooked.evidenceCredibility * 0.45) + ((100 - Math.max(0, -overlooked.perceptionRealityGap)) * 0.2) + ((100 - gapPenalty) * 0.35)),
    0,
    100
  );

  const targetRegion = choosePrimaryRegion(overlooked.topRegionalOpportunities.map((item) => ({ place: item.place, score: item.score })));
  const topReasons = overlooked.topRegionalOpportunities[0]?.reason || ['Early signal indicates overlooked upside potential.'];

  const strategicTools = tools.slice(0, 3).map((tool) => `${tool.name} (${tool.category})`);

  return {
    model: 'nsil_strategic_pipeline_v8',
    objective: extractObjective(message, context),
    readinessScore,
    stages: [
      {
        stage: 'Stage 1 — Intake Distillation',
        detail: `Detected mode ${capabilityProfile.mode} with ${capabilityProfile.gaps.length} unresolved gap(s).`,
        score: clamp(100 - gapPenalty, 0, 100)
      },
      {
        stage: 'Stage 2 — Evidence Credibility',
        detail: `Credibility scored from available narrative/doc evidence.`,
        score: overlooked.evidenceCredibility
      },
      {
        stage: 'Stage 3 — Perception vs Reality',
        detail: `Bias gap computed as ${overlooked.perceptionRealityGap}; positive values indicate overlooked markets may be undervalued.`,
        score: clamp(50 + overlooked.perceptionRealityGap, 0, 100)
      },
      {
        stage: 'Stage 4 — Overlooked Regional Mining',
        detail: `Top opportunities ranked with saturation/policy/logistics/talent/risk blend.`,
        score: overlooked.topRegionalOpportunities[0]?.score ?? 0
      },
      {
        stage: 'Stage 5 — Human-in-the-loop Assurance',
        detail: augmented.steps.map((step) => step.title).join(' → '),
        score: 78
      },
      {
        stage: 'Stage 6 — Engagement Conversion',
        detail: `Prepare targeted letter/report strategy for government, partner, and investor audiences using ${strategicTools.join(', ')}.`
      }
    ],
    recommendedPath: {
      targetRegion,
      strategy: 'Lead with a phased regional pilot in the top-ranked overlooked market, then expand via verified local partnerships and policy-backed execution milestones.',
      rationale: topReasons
    },
    engagementDraftHints: {
      governmentLetterFocus: [
        'Policy alignment and compliance pathway',
        'Regional socioeconomic impact and execution governance',
        'Institutional counterpart and approval sequence'
      ],
      partnerLetterFocus: [
        'Mutual value proposition and delivery capability fit',
        'Risk sharing, governance roles, and phased milestones',
        'Local legitimacy and stakeholder strategy'
      ],
      investorBriefFocus: [
        'Risk-adjusted upside in overlooked regional market',
        'Evidence credibility and downside controls',
        'Phased capital deployment and measurable KPI gates'
      ]
    }
  };
};