/**
 * BW CONSULTANT OS - Case Study Builder
 * 
 * Flow:
 * 1. Baseline Intake - Who are you? What do you need?
 * 2. Case Building - AI asks follow-up questions to understand the matter
 * 3. Case Summary - AI synthesizes understanding
 * 4. Document Recommendations - Based on case, suggest reports/letters
 * 5. Document Generation - Create the recommended outputs
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { 
  Bot, Send, Paperclip, Loader2, X,
  FileText, Mail, Briefcase, Shield, BarChart3, Users, Scale, 
  Globe, FileCheck, PenTool, Download, Copy, Check,
  HelpCircle,
  ThumbsUp, ThumbsDown, Languages, Zap, AlertTriangle, CheckCircle2, PlayCircle,
  Mic, MicOff,
} from 'lucide-react';
import { OutcomeLearningService } from '../services/OutcomeLearningService';
import { LiveDataService } from '../services/LiveDataService';
import { extractFileTextViaAI } from '../services/geminiService';
import { AgentToolRegistry, AgentMemoryStore, registerBuiltInTools } from '../services/agent';
import { ProfessionalDocumentExporter } from '../services/ProfessionalDocumentExporter';
import type { ProfessionalDocument, DocumentSection } from '../services/ProfessionalDocumentExporter';
import { downloadAsDocx } from '../services/DocxExporter';
import type { DocxDocumentMeta } from '../services/DocxExporter';
import AdaptiveQuestionnaire from '../services/AdaptiveQuestionnaire';
import { BWConsultantAgenticAI } from '../services/BWConsultantAgenticAI';
import CaseStudyAnalyzer from '../services/CaseStudyAnalyzer';
import CaseGraphBuilder, { type CaseGraph } from '../services/CaseGraphBuilder';
import RecommendationScorer, { type RecommendationScore } from '../services/RecommendationScorer';
import MissionGraphService from '../services/autonomy/MissionGraphService';
import type { MissionSnapshot } from '../types/autonomy';
import { RegionalDevelopmentOrchestrator } from '../services/RegionalDevelopmentOrchestrator';
import BrainIntegrationService, { type BrainContext } from '../services/BrainIntegrationService';
import { PersistentMemorySystem } from '../services/PersistentMemorySystem';
import { DocumentTypeRouter } from '../services/DocumentTypeRouter';
import { IntelligentDocumentGenerator } from '../services/IntelligentDocumentGenerator';
import LettersCatalogModal from './LettersCatalogModal';
import { InputValidationEngine } from '../services/InputValidationEngine';
import ReportOptionsPanel from './ReportOptionsPanel';
import { ReportLengthRouter, type ReportOptionsMenu, type ReportTierKey } from '../services/ReportLengthRouter';
import { PDFAnnotationService } from '../services/PDFAnnotationService';
import { automaticSearchService } from '../services/AutomaticSearchService';
import { ReportOrchestrator } from '../services/ReportOrchestrator';
import AgentOrchestrator, { type OrchestratorProgress } from '../services/AgentOrchestrator';
import { runReasoningPipelineStream, runReasoningPipeline } from '../services/ReasoningPipeline';
import { runIssuePipeline } from '../services/IssueSolutionPipeline';
import { ttsService } from '../services/ttsService';
import HistoricalParallelMatcher, { type ParallelMatchResult } from '../services/HistoricalParallelMatcher';
import { UnbiasedAnalysisEngine, type FullUnbiasedAnalysis } from '../services/UnbiasedAnalysisEngine';
import { CounterfactualEngine, type CounterfactualAnalysis } from '../services/CounterfactualEngine';
import { SituationAnalysisEngine, type SituationAnalysisResult } from '../services/SituationAnalysisEngine';
import NSILIntelligenceHub, { type QuickAssessment, type IntelligenceReport } from '../services/NSILIntelligenceHub';
import MotivationDetector from '../services/MotivationDetector';
import { UserSignalDecoder, type UserSignalReport, type UserInputSnapshot } from '../services/reflexive/UserSignalDecoder';
import AdversarialReasoningService, { type AdversarialOutputs } from '../services/AdversarialReasoningService';
import { locationResearchManager } from '../services/agenticLocationIntelligence';
import { DecisionPipeline, type DecisionPacket } from '../services/DecisionPipeline';
import { EventBus } from '../services/EventBus';
import { autonomousScheduler } from '../services/AutonomousScheduler';
import { MultiAgentOrchestrator, type SynthesizedAnalysis } from '../services/MultiAgentOrchestrator';
import { PartnerIntelligenceEngine, type PartnerCandidate } from '../services/PartnerIntelligenceEngine';
import { ReactiveIntelligenceEngine } from '../services/ReactiveIntelligenceEngine';
import { selfLearningEngine } from '../services/selfLearningEngine';
import { selfImprovementEngine } from '../services/SelfImprovementEngine';
import { conversationMemoryManager } from '../services/ConversationMemoryManager';
import { conversationStore } from '../services/ConversationStore';
import { learnFromConversation } from '../services/SelfLearningLoop';
import { webSearch, formatResultsForPrompt } from '../services/WebSearchGateway';
import { runWithFunctionCalling } from '../services/NativeFunctionCalling';
import { quickRegionalIntel } from '../services/RegionalIntelligenceAgent';
import { outputModerationService } from '../services/OutputModerationService';
import { piiDetectionService } from '../services/PIIDetectionService';
import { evaluationFramework } from '../services/EvaluationFramework';
import { monitoringService } from '../services/MonitoringService';
import { persistentVectorStore } from '../services/PersistentVectorStore';
import { securityService } from '../services/SecurityHardeningService';
import { gradientRankingEngine } from '../services/algorithms/GradientRankingEngine';
import { FailureModeGovernanceService } from '../services/FailureModeGovernanceService';
import type { ReportParameters } from '../types';

// ============================================================================
// TYPES
// ============================================================================

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  phase?: CasePhase;
  provenance?: {
    confidence: number;
    confidenceBand: 'low' | 'medium' | 'high';
    sources: string[];
  };
}

type ExecutionTaskStatus = 'queued' | 'running' | 'completed' | 'failed' | 'skipped';

interface ExecutionTask {
  id: 'ingestion' | 'response' | 'insight' | 'followup';
  label: string;
  status: ExecutionTaskStatus;
  detail?: string;
}

interface CaseStudy {
  userName: string;
  organizationName: string;
  organizationType: string;
  contactRole: string;
  country: string;
  jurisdiction: string;
  organizationMandate: string;
  targetAudience: string;
  decisionDeadline: string;
  situationType: string;
  currentMatter: string;
  objectives: string;
  constraints: string;
  timeline: string;
  additionalContext: string[];
  uploadedDocuments: string[];
  aiInsights: string[];
}

type CasePhase = 'intake' | 'discovery' | 'analysis' | 'recommendations' | 'generation';

interface DocumentOption {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  category: 'report' | 'letter';
  relevance: number; // 0-100 based on case
  rationale: string;
  pageRange: string;
  supportingDocuments: string[];
  contactLetterFor?: string;
}

interface JurisdictionPolicyPack {
  id: string;
  label: string;
  triggers: string[];
  regulatoryTone: 'government-formal' | 'investor-formal' | 'legal-defensive' | 'executive-brief';
  requiredSupportDocuments: string[];
  requiredLetters: string[];
  complianceFocus: string[];
}

type CriticalGapSeverity = 'critical' | 'high' | 'medium';

interface PendingAction {
  id: string;
  label: string;
  description: string;
  category: 'document' | 'notify' | 'submit' | 'escalate';
  status: 'pending' | 'approved' | 'executing' | 'done' | 'rejected';
}

interface ConsultantAuditEvent {
  event?: string;
  requestId?: string;
  timestamp?: string;
  provider?: string;
  intent?: string;
  taskType?: string;
  durationMs?: number;
  error?: string;
  attempts?: Array<{ provider?: string; ok?: boolean; detail?: string }>;
  [key: string]: unknown;
}

interface ConsultantReplayMeta {
  requestId: string;
  createdAt?: string;
  replayHash?: string;
  hasPayload?: boolean;
  sourceRequestId?: string | null;
}

interface ConsultantAuditTrendMetrics {
  windowHours: number;
  current: { replaySuccess: number; replayFallback: number; replayError: number };
  previous: { replaySuccess: number; replayFallback: number; replayError: number };
  delta: { replaySuccess: number; replayFallback: number; replayError: number };
  providerMetrics?: {
    bedrock: {
      current: { replaySuccess: number; replayFallback: number; replayError: number };
      previous: { replaySuccess: number; replayFallback: number; replayError: number };
      delta: { replaySuccess: number; replayFallback: number; replayError: number };
    };
    gemini: {
      current: { replaySuccess: number; replayFallback: number; replayError: number };
      previous: { replaySuccess: number; replayFallback: number; replayError: number };
      delta: { replaySuccess: number; replayFallback: number; replayError: number };
    };
    openai: {
      current: { replaySuccess: number; replayFallback: number; replayError: number };
      previous: { replaySuccess: number; replayFallback: number; replayError: number };
      delta: { replaySuccess: number; replayFallback: number; replayError: number };
    };
  };
}

type ConsultantAuditEventFilter =
  | 'all'
  | 'replay_events'
  | 'consultant_request'
  | 'consultant_error'
  | 'consultant_replay_request'
  | 'consultant_replay_error'
  | 'consultant_replay_fallback';

type ConsultantAuditProviderFilter = 'all' | 'bedrock' | 'gemini' | 'openai';

const LOCALES: { code: string; label: string }[] = [
  { code: 'en', label: 'EN' },
  { code: 'fr', label: 'FR' },
  { code: 'es', label: 'ES' },
  { code: 'ar', label: 'AR' },
  { code: 'zh', label: 'ZH' },
];

interface CriticalCaseGap {
  missing: boolean;
  label: string;
  question: string;
  severity: CriticalGapSeverity;
  weight: number;
}

type ExtractedEntityKey = 'audience' | 'country' | 'jurisdiction' | 'deadline' | 'evidenceNote';
type EntityConfidence = 'high' | 'medium' | 'low';

interface ExtractedEntitySuggestion {
  key: ExtractedEntityKey;
  label: string;
  value: string;
  confidence: EntityConfidence;
}

type PilotModeFocus = 'new-markets' | 'government-entry' | 'partnerships' | 'risk-compliance' | 'investment-readiness' | 'operations-delivery' | 'trade-export' | 'regional-development' | 'fundraising-capital' | 'licensing-approvals' | 'joint-ventures' | 'supply-chain';

type PilotOptionPreference = 'include' | 'exclude';

interface PilotIssueArea {
  id: string;
  focus: PilotModeFocus;
  title: string;
  description: string;
  whyItMatters: string;
  recommendedMoves: string[];
}

interface PilotOption {
  id: string;
  label: string;
  prompt: string;
  stage: CasePhase;
  focus?: PilotModeFocus;
}

interface GlobalIssuePack {
  id: string;
  label: string;
  personas: string[];
  archetypes: string[];
  formulas: string[];
  requiredOutputs: string[];
}

type LiveInsightBucket = 'government' | 'finance' | 'news' | 'entities';
type LiveInsightFilter = 'all' | LiveInsightBucket;

interface LiveInsightResult {
  title: string;
  link: string;
  snippet: string;
  source: string;
  publishedAt?: string;
  bucket: LiveInsightBucket;
}

interface AugmentedLoopStep {
  title: 'Understand' | 'Interpret' | 'Reason' | 'Learn' | 'Assure';
  detail: string;
}

interface AugmentedAISnapshot {
  model: string;
  mode: string;
  steps: AugmentedLoopStep[];
  humanControls?: {
    decisionOwnerRequired?: boolean;
    approvalOptions?: Array<'accept' | 'modify' | 'reject'>;
    assuranceChecks?: string[];
  };
}

interface AugmentedRecommendedTool {
  id: string;
  name: string;
  category: string;
  primaryUse: string;
  bwUseCase: string;
  deployment: 'cloud' | 'self_hosted' | 'hybrid';
  integrationPriority: 'high' | 'medium' | 'low';
}

interface AugmentedGap {
  key: string;
  severity: 'critical' | 'high' | 'medium';
  question: string;
}

interface OverlookedOpportunity {
  place: string;
  score: number;
  reason?: string[];
}

interface OverlookedIntelligence {
  evidenceCredibility: number;
  perceptionRealityGap: number;
  topRegionalOpportunities: OverlookedOpportunity[];
}

interface StrategicPipeline {
  model: string;
  objective: string;
  readinessScore: number;
  recommendedPath?: {
    targetRegion: string;
    strategy: string;
    rationale: string[];
  };
  engagementDraftHints?: {
    governmentLetterFocus?: string[];
    partnerLetterFocus?: string[];
    investorBriefFocus?: string[];
  };
}

const JURISDICTION_POLICY_PACKS: JurisdictionPolicyPack[] = [
  {
    id: 'australia',
    label: 'Australia Regulatory Pack',
    triggers: ['australia', 'au', 'queensland', 'nsw', 'victoria', 'wa'],
    regulatoryTone: 'government-formal',
    requiredSupportDocuments: ['Regulatory obligations matrix', 'Risk register', 'Financial model'],
    requiredLetters: ['Agency submission letter', 'Stakeholder engagement letter'],
    complianceFocus: ['Environmental compliance', 'Procurement governance', 'State/federal approvals']
  },
  {
    id: 'philippines',
    label: 'Philippines Compliance Pack',
    triggers: ['philippines', 'ph', 'manila', 'cebu', 'mindanao'],
    regulatoryTone: 'government-formal',
    requiredSupportDocuments: ['LGU alignment note', 'Implementation roadmap', 'Socioeconomic impact annex'],
    requiredLetters: ['LGU coordination letter', 'National agency submission letter'],
    complianceFocus: ['National/local permitting', 'PPP alignment', 'Community impact']
  },
  {
    id: 'eu',
    label: 'EU Governance Pack',
    triggers: ['european union', 'eu', 'germany', 'france', 'italy', 'spain', 'netherlands'],
    regulatoryTone: 'legal-defensive',
    requiredSupportDocuments: ['Data protection note', 'Compliance control matrix', 'Assurance checklist'],
    requiredLetters: ['Regulatory notice letter', 'Partner compliance undertaking letter'],
    complianceFocus: ['Cross-border compliance', 'Transparency controls', 'Data/privacy obligations']
  },
  {
    id: 'mena',
    label: 'MENA Investment Pack',
    triggers: ['saudi', 'uae', 'qatar', 'oman', 'bahrain', 'kuwait', 'middle east'],
    regulatoryTone: 'investor-formal',
    requiredSupportDocuments: ['Investment structure brief', 'Sovereign risk profile', 'Execution governance plan'],
    requiredLetters: ['Investor submission letter', 'Government liaison letter'],
    complianceFocus: ['Investment approvals', 'Institutional counterpart alignment', 'Execution governance']
  }
];

const LEARNING_SIGNALS_STORAGE_KEY = 'bw-consultant-learning-signals-v1';
const LEARNING_PROFILE_VERSION = 1;

// ── Thinking orb component ───────────────────────────────────────────────────
const ThinkingOrb: React.FC = () => (
  <div className="relative flex items-center justify-center" style={{ width: 60, height: 60 }}>
    <div className="thinking-orb-ring" />
    <div className="thinking-orb" />
  </div>
);

// ── Typewriter text component ────────────────────────────────────────────────
const TypewriterText: React.FC<{ text: string; speed?: number; onStart?: () => void; onComplete?: () => void }> = ({ text, speed = 68, onStart, onComplete }) => {
  const [displayed, setDisplayed] = React.useState('');
  const [done, setDone] = React.useState(false);
  const indexRef = React.useRef(0);
  const rafRef = React.useRef<number | null>(null);
  const lastRef = React.useRef(0);
  const startedRef = React.useRef(false);
  // Use refs for callbacks so inline arrow functions from parent JSX
  // don't cause the animation useEffect to restart on every parent re-render.
  const onStartRef = React.useRef(onStart);
  const onCompleteRef = React.useRef(onComplete);
  React.useEffect(() => { onStartRef.current = onStart; });
  React.useEffect(() => { onCompleteRef.current = onComplete; });

  React.useEffect(() => {
    indexRef.current = 0;
    setDisplayed('');
    setDone(false);
    lastRef.current = 0;
    startedRef.current = false;

    const step = (ts: number) => {
      if (!startedRef.current) {
        startedRef.current = true;
        onStartRef.current?.();
      }
      if (!lastRef.current) lastRef.current = ts;
      const elapsed = ts - lastRef.current;
      if (elapsed >= speed) {
        const chars = Math.min(Math.floor(elapsed / speed), 2);
        const nextIdx = Math.min(indexRef.current + chars, text.length);
        indexRef.current = nextIdx;
        setDisplayed(text.slice(0, nextIdx));
        lastRef.current = ts;
        if (nextIdx >= text.length) {
          setDone(true);
          onCompleteRef.current?.();
          return;
        }
      }
      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [text, speed]); // ← callbacks intentionally excluded; stable via refs above

  const html = displayed
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
    .replace(/\n/g, '<br />');

  return (
    <span>
      <span dangerouslySetInnerHTML={{ __html: html }} />
      {!done && <span className="inline-block w-[7px] h-[14px] bg-blue-500 ml-0.5 animate-pulse" aria-hidden="true" />}
    </span>
  );
};

// ── Pick the most natural-sounding voice available (kept as browser fallback reference) ──────────
const _pickHumanVoice = (): SpeechSynthesisVoice | null => {
  const voices = window.speechSynthesis?.getVoices() ?? [];
  // Prefer natural / premium English voices
  const preferred = ['Google UK English Female', 'Google UK English Male', 'Microsoft Zira', 'Microsoft Mark', 'Samantha', 'Karen', 'Daniel', 'Moira', 'Fiona'];
  for (const name of preferred) {
    const v = voices.find(v => v.name.includes(name) && v.lang.startsWith('en'));
    if (v) return v;
  }
  // Fallback: any English voice
  return voices.find(v => v.lang.startsWith('en')) ?? null;
};

const PILOT_GLOBAL_ISSUE_AREAS: PilotIssueArea[] = [
  {
    id: 'market-access-barriers',
    focus: 'new-markets',
    title: 'Entering a New Market',
    description: 'Understand what approvals, restrictions, or local requirements you may face before entering a new market.',
    whyItMatters: 'Knowing the rules upfront saves time and avoids costly surprises.',
    recommendedMoves: [
      'Show me what approvals and local requirements I need for market entry.',
      'Help me plan the best order to enter each country based on difficulty.'
    ]
  },
  {
    id: 'government-procurement-fit',
    focus: 'government-entry',
    title: 'Working with Government',
    description: 'Find out how to align with government priorities and what they need to see in a proposal.',
    whyItMatters: 'Government decisions follow strict processes - knowing them early gives you an edge.',
    recommendedMoves: [
      'Help me understand what this government department is looking for.',
      'Prepare a briefing and proposal outline that fits their requirements.'
    ]
  },
  {
    id: 'partner-selection-risk',
    focus: 'partnerships',
    title: 'Finding the Right Partners',
    description: 'Evaluate potential partners - their strengths, risks, and whether they can deliver what you need.',
    whyItMatters: 'The wrong partner costs more than no partner. Get this right early.',
    recommendedMoves: [
      'Help me evaluate potential partners with a clear checklist.',
      'Create a phased partnership plan with checkpoints along the way.'
    ]
  },
  {
    id: 'cross-border-compliance',
    focus: 'risk-compliance',
    title: 'Legal & Compliance Requirements',
    description: 'Understand the legal, data, anti-corruption, and reporting obligations for your situation.',
    whyItMatters: 'Compliance gaps can block deals, cause fines, or damage your reputation.',
    recommendedMoves: [
      'Show me what legal and compliance requirements apply to my situation.',
      'Help me track compliance evidence for each major decision.'
    ]
  },
  {
    id: 'capital-readiness',
    focus: 'new-markets',
    title: 'Funding & Capital Planning',
    description: 'Plan your funding approach - how much, when, and what happens if things change.',
    whyItMatters: 'Running out of money mid-expansion is the most common reason projects fail.',
    recommendedMoves: [
      'Help me build a funding plan with best-case and worst-case scenarios.',
      'Show me what funding triggers and backup plans I should have in place.'
    ]
  },
  {
    id: 'stakeholder-legitimacy',
    focus: 'government-entry',
    title: 'Building Trust & Support',
    description: 'Understand who the key stakeholders are and how to earn their support.',
    whyItMatters: 'Even good projects fail without community and stakeholder buy-in.',
    recommendedMoves: [
      'Help me identify the key people I need to convince and their concerns.',
      'Create a clear message about the value and impact of what I\'m doing.'
    ]
  },
  {
    id: 'investment-readiness-structure',
    focus: 'investment-readiness',
    title: 'Getting Investment-Ready',
    description: 'Prepare your case so it meets what investors and funders actually look for.',
    whyItMatters: 'Investors say no when assumptions, numbers, and risk protections are unclear.',
    recommendedMoves: [
      'Help me prepare a clear investment case with realistic numbers.',
      'Show me what investors will ask about and how to answer them.'
    ]
  },
  {
    id: 'operations-delivery-readiness',
    focus: 'operations-delivery',
    title: 'Planning How to Deliver',
    description: 'Turn your strategy into an actionable plan with clear owners, timelines, and checkpoints.',
    whyItMatters: 'A great plan is worthless without someone accountable for each part.',
    recommendedMoves: [
      'Help me break this into workstreams with clear owners and deadlines.',
      'Create a progress tracker so I know when things are off track.'
    ]
  }
];

const PILOT_ADAPTIVE_OPTION_CATALOG: PilotOption[] = [
  {
    id: 'startup-case-skeleton',
    label: 'Help me get started',
    prompt: 'Create a startup case skeleton with person, organization, jurisdiction, objective, decision audience, and deadline fields.',
    stage: 'intake'
  },
  {
    id: 'startup-proof-pack',
    label: 'What documents do I need?',
    prompt: 'Create an initial evidence pack checklist (source documents, baseline metrics, and mandatory annexes) needed to open this case correctly.',
    stage: 'intake'
  },
  {
    id: 'startup-risk-baseline',
    label: 'What are my biggest risks?',
    prompt: 'Create a startup risk baseline with top regulatory, funding, timeline, and stakeholder risks for this matter.',
    stage: 'intake'
  },
  {
    id: 'discovery-market-scan',
    label: 'Compare markets for me',
    prompt: 'Add a comparative regional market scan with top 3 expansion candidates and entry barriers.',
    stage: 'discovery',
    focus: 'new-markets'
  },
  {
    id: 'discovery-gov-pack',
    label: 'Help me approach government',
    prompt: 'Add a government engagement pack including ministry brief, submission path, and compliance annex list.',
    stage: 'discovery',
    focus: 'government-entry'
  },
  {
    id: 'discovery-partner-map',
    label: 'Map potential partners',
    prompt: 'Add partner landscape map with shortlist criteria and due-diligence checkpoints.',
    stage: 'discovery',
    focus: 'partnerships'
  },
  {
    id: 'discovery-risk-stress',
    label: 'Test my plan against risks',
    prompt: 'Add risk stress test covering regulatory, funding, and execution downside scenarios.',
    stage: 'discovery',
    focus: 'risk-compliance'
  },
  {
    id: 'analysis-gap-map',
    label: 'What information am I missing?',
    prompt: 'Map missing data points, why each is required, and assign owner/deadline for closure before recommendations.',
    stage: 'analysis'
  },
  {
    id: 'analysis-scenario-pack',
    label: 'Show me best/worst case outcomes',
    prompt: 'Add base/upside/downside scenarios with implications for market entry, government pathway, and partnership structure.',
    stage: 'analysis'
  },
  {
    id: 'analysis-investment-readiness',
    label: 'Get me investor-ready',
    prompt: 'Add investor-readiness assumptions, return guardrails, term-sheet priorities, and downside protections.',
    stage: 'analysis',
    focus: 'investment-readiness'
  },
  {
    id: 'analysis-operations-plan',
    label: 'Build my delivery plan',
    prompt: 'Add execution workstreams, accountable owners, operational checkpoints, and delivery-risk mitigants.',
    stage: 'analysis',
    focus: 'operations-delivery'
  },
  {
    id: 'recommendations-letter-plan',
    label: 'Draft letters I need to send',
    prompt: 'Add a stakeholder contact-letter plan with counterparts, purpose, and required support annexes for each letter.',
    stage: 'recommendations'
  },
  {
    id: 'recommendations-report-plan',
    label: 'Plan my reports and documents',
    prompt: 'Add a report package plan covering decision brief, memo, and full report with audience-specific structure.',
    stage: 'recommendations'
  },
  {
    id: 'generation-quality-check',
    label: 'Check everything before I send',
    prompt: 'Add final output quality checks for audience fit, jurisdiction compliance, evidence traceability, and implementation readiness.',
    stage: 'generation'
  }
];

const GLOBAL_ISSUE_PACKS: GlobalIssuePack[] = [
  {
    id: 'water-security',
    label: 'Water Security',
    personas: ['Regional Water Authority', 'Infrastructure Bank', 'Community Utility Partner'],
    archetypes: ['Utility operator', 'Development financier', 'Local engineering consortium'],
    formulas: ['SPI', 'RROI', 'RRI', 'CCS', 'RFI', 'SRA'],
    requiredOutputs: ['Water Security Strategy', 'Funding Structure Brief', 'Regulatory Compliance Letter']
  },
  {
    id: 'logistics-corridor',
    label: 'Logistics and Trade Corridor',
    personas: ['Trade Ministry', 'Port Authority', 'Commercial Operator'],
    archetypes: ['Port/logistics operator', 'Trade finance bank', 'Government corridor unit'],
    formulas: ['MPI', 'CAI', 'TAM', 'SAM', 'SRCI', 'DCS'],
    requiredOutputs: ['Corridor Investment Case', 'Partner Due-Diligence Report', 'Government Submission Letter']
  },
  {
    id: 'energy-transition',
    label: 'Energy Transition',
    personas: ['Energy Regulator', 'Sovereign/Development Fund', 'Independent Power Partner'],
    archetypes: ['IPP developer', 'Grid operator', 'Climate finance partner'],
    formulas: ['SPI', 'RROI', 'ESG', 'PSS', 'FRS', 'CCS'],
    requiredOutputs: ['Transition Roadmap', 'Risk Stress-Test Report', 'Stakeholder Alignment Letters']
  },
  {
    id: 'housing-systems',
    label: 'Housing Systems',
    personas: ['Urban Development Authority', 'Mortgage/Banking Partner', 'Delivery Consortium'],
    archetypes: ['Housing developer', 'Municipal authority', 'Banking/credit partner'],
    formulas: ['ORS', 'TCS', 'EEI', 'DSCR', 'FMS', 'GCI'],
    requiredOutputs: ['Housing Delivery Blueprint', 'Financing Readiness Pack', 'Implementation Governance Letter']
  },
  {
    id: 'health-systems',
    label: 'Health Systems',
    personas: ['Health Ministry', 'Hospital Network', 'Public Finance Partner'],
    archetypes: ['Hospital operator', 'Public health agency', 'Development bank'],
    formulas: ['SPI', 'IVAS', 'CCS', 'ARI', 'SRA', 'FRS'],
    requiredOutputs: ['Health System Modernization Report', 'Procurement and Compliance Pack', 'Institutional Coordination Letters']
  },
  {
    id: 'digital-infrastructure',
    label: 'Digital Infrastructure',
    personas: ['Digital Transformation Unit', 'Telecom/Tech Partner', 'Regulatory Authority'],
    archetypes: ['Digital infra provider', 'Tech platform partner', 'Regulatory counterpart'],
    formulas: ['AGI', 'VCI', 'ATI', 'RFI', 'CIS', 'CCS'],
    requiredOutputs: ['Digital Infrastructure Case', 'Partner Technical Evaluation', 'Regulatory Engagement Letter']
  },
  {
    id: 'workforce-transition',
    label: 'Workforce Transition',
    personas: ['Labor/Education Authority', 'Industry Alliance', 'Training Partner'],
    archetypes: ['Skills provider', 'Industry coalition', 'Regional employment agency'],
    formulas: ['LCI', 'TCS', 'CGI', 'RRI', 'SEQ', 'ORS'],
    requiredOutputs: ['Workforce Transition Strategy', 'Capability Gap Analysis', 'Partnership Activation Letters']
  },
  {
    id: 'climate-resilience',
    label: 'Climate Resilience',
    personas: ['Resilience Office', 'Infrastructure/Insurance Partner', 'Community Institutions'],
    archetypes: ['Resilience planner', 'Risk financing partner', 'Local implementation coalition'],
    formulas: ['ESI', 'CRPS', 'RME', 'PSS', 'RRI', 'GCI'],
    requiredOutputs: ['Resilience Investment Portfolio', 'Scenario Risk Annex', 'Government and Partner Letters']
  },
  {
    id: 'agriculture-food',
    label: 'Agriculture & Food Security',
    personas: ['Agriculture Ministry', 'Agribusiness Operator', 'Export Council'],
    archetypes: ['Agri processor', 'Food security agency', 'Trade facilitation partner'],
    formulas: ['SPI', 'RRI', 'CCS', 'TAM', 'MPI', 'FRS'],
    requiredOutputs: ['Food Security Investment Case', 'Supply Chain Risk Report', 'Market Access Letters']
  },
  {
    id: 'mining-resources',
    label: 'Mining & Natural Resources',
    personas: ['Resources Ministry', 'Mining Operator', 'Environmental Regulator'],
    archetypes: ['Extractives operator', 'Sovereign wealth manager', 'Community license partner'],
    formulas: ['RROI', 'ESG', 'RME', 'PSS', 'CCS', 'SRA'],
    requiredOutputs: ['Resource Development Strategy', 'Environmental Compliance Pack', 'Stakeholder Agreement Letters']
  },
  {
    id: 'tourism-hospitality',
    label: 'Tourism & Hospitality',
    personas: ['Tourism Authority', 'Hotel/Resort Developer', 'Cultural Heritage Body'],
    archetypes: ['Destination developer', 'Hospitality operator', 'Regional promotion agency'],
    formulas: ['MPI', 'TAM', 'VCI', 'ORS', 'CGI', 'RFI'],
    requiredOutputs: ['Tourism Development Blueprint', 'Investment Attraction Brief', 'Partnership Engagement Letters']
  },
  {
    id: 'education-training',
    label: 'Education & Training',
    personas: ['Education Ministry', 'University/College Network', 'Industry Skills Council'],
    archetypes: ['Education provider', 'Vocational training body', 'Skills policy authority'],
    formulas: ['LCI', 'TCS', 'CGI', 'ORS', 'SEQ', 'RRI'],
    requiredOutputs: ['Education Modernization Plan', 'Skills Gap Analysis', 'Institutional Partnership Letters']
  },
  {
    id: 'financial-services',
    label: 'Financial Services & Banking',
    personas: ['Central Bank', 'Commercial Bank Network', 'Fintech Regulator'],
    archetypes: ['Banking operator', 'Insurance/pension partner', 'Payment system provider'],
    formulas: ['DSCR', 'FMS', 'RFI', 'CIS', 'FRS', 'CCS'],
    requiredOutputs: ['Financial Infrastructure Report', 'Regulatory Readiness Pack', 'Banking Partnership Letters']
  },
  {
    id: 'defence-security',
    label: 'Defence & Security',
    personas: ['Defence Ministry', 'Security Contractor', 'Intelligence/Cyber Agency'],
    archetypes: ['Defence supplier', 'Security platform operator', 'Sovereign systems partner'],
    formulas: ['SPI', 'PSS', 'RME', 'CCS', 'SRA', 'AGI'],
    requiredOutputs: ['Defence Capability Strategy', 'Procurement Compliance Report', 'Government Engagement Letters']
  },
  {
    id: 'manufacturing',
    label: 'Manufacturing & Industry',
    personas: ['Industry Ministry', 'Manufacturing Operator', 'Export Promotion Agency'],
    archetypes: ['Factory operator', 'Industrial zone developer', 'Trade facilitation partner'],
    formulas: ['MPI', 'ORS', 'TAM', 'SAM', 'TCS', 'RROI'],
    requiredOutputs: ['Industrial Development Case', 'Manufacturing Feasibility Report', 'Supply Chain Partnership Letters']
  }
];

const REGIONAL_PARTNER_CANDIDATES: PartnerCandidate[] = [
  { id: 'gov-development-agency', name: 'National/Regional Development Agency', type: 'government', countries: ['philippines', 'australia', 'united kingdom', 'new zealand'], sectors: ['infrastructure', 'policy', 'regional development'] },
  { id: 'multilateral-bank', name: 'Multilateral Development Bank', type: 'multilateral', countries: ['philippines', 'australia', 'united kingdom', 'new zealand', 'united states'], sectors: ['infrastructure', 'energy', 'housing', 'health', 'digital'] },
  { id: 'commercial-bank', name: 'Commercial Banking Consortium', type: 'bank', countries: ['philippines', 'australia', 'united kingdom', 'new zealand'], sectors: ['banking', 'trade', 'housing', 'energy'] },
  { id: 'delivery-corporate', name: 'Delivery and Operations Corporate Partner', type: 'corporate', countries: ['philippines', 'australia', 'united kingdom', 'new zealand'], sectors: ['logistics', 'energy', 'digital', 'housing', 'health'] },
  { id: 'community-anchor', name: 'Community Anchor Institution', type: 'community', countries: ['philippines', 'australia', 'united kingdom', 'new zealand'], sectors: ['regional development', 'workforce', 'social license'] }
];

// ============================================================================
// COMPONENT
// ============================================================================

interface BWConsultantOSProps {
  onOpenWorkspace?: (payload?: { query?: string; results?: Record<string, unknown>[] }) => void;
  /** Navigate to other OS modules (viewModes defined in App.tsx) */
  onNavigate?: (viewMode: string) => void;
  embedded?: boolean;
  initialConsultantQuery?: string;
  onInitialConsultantQueryHandled?: () => void;
  initialContext?: {
    city?: string;
    country?: string;
    summary?: string;
    profile?: Record<string, unknown>;
    research?: object | null;
  } | null;
  onInitialContextHandled?: () => void;
}

const BWConsultantOS: React.FC<BWConsultantOSProps> = ({ onOpenWorkspace, onNavigate, embedded = false, initialConsultantQuery, onInitialConsultantQueryHandled, initialContext, onInitialContextHandled }) => {
  // ─── Mobile Detection ───────────────────────────────────────────────
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const [showToolsMenu, setShowToolsMenu] = useState(false);
  // Core state
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreamingResponse, setIsStreamingResponse] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(() => ttsService.isEnabled());
  const voiceSpeakingRef = useRef(false);
  const displayedMsgIds = useRef<Set<string>>(new Set());
  const spokenMsgIds = useRef<Set<string>>(new Set());
  const locationSessionIdRef = useRef<string | null>(null);
  const locationProfileContextRef = useRef<string>('');
  const eventBusInsightsRef = useRef<string>('');
  const multiAgentContextRef = useRef<string>('');
  const multiAgentRunningRef = useRef(false);

  // ── TTS: fires whenever a new assistant message arrives and loading is done ──
  // Completely decoupled from TypewriterText so it always triggers regardless
  // of animation state, user interactions, or mid-animation unmounts.
  useEffect(() => {
    if (!voiceEnabled || isLoading) return;
    const last = messages[messages.length - 1];
    if (!last || last.role !== 'assistant') return;
    if (spokenMsgIds.current.has(last.id)) return;
    spokenMsgIds.current.add(last.id);
    voiceSpeakingRef.current = true;
    ttsService.speak(last.content).finally(() => {
      voiceSpeakingRef.current = false;
    });
  }, [messages, isLoading, voiceEnabled]);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<{ stop(): void } | null>(null);
  // Background brain context - updated on every enrichment pass
  const brainCtxRef = useRef<BrainContext | null>(null);
  // Persistent cross-session memory (survives page reload via localStorage)
  const memoryRef = useRef<PersistentMemorySystem>(new PersistentMemorySystem());
  // Latest CaseStudyAnalyzer output - written synchronously in handleSend,
  // read by buildNaturalFallbackReply (bypasses React async state lag)
  const latestDocAnalysisRef = useRef<{
    title: string;
    country: string;
    sector: string;
    summary: string;
    keyIssues: string[];
    stakeholders: string[];
    historicalParallels: string[];
    scores: Record<string, number>;
  } | null>(null);

  // Case study state - declared early so useEffects below can reference it without TDZ
  const [caseStudy, setCaseStudy] = useState<CaseStudy>({
    userName: '',
    organizationName: '',
    organizationType: '',
    contactRole: '',
    country: '',
    jurisdiction: '',
    organizationMandate: '',
    targetAudience: '',
    decisionDeadline: '',
    situationType: '',
    currentMatter: '',
    objectives: '',
    constraints: '',
    timeline: '',
    additionalContext: [],
    uploadedDocuments: [],
    aiInsights: []
  });

  // Preload browser voices (Chrome loads them async) and sync ttsService on unmount
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => { window.speechSynthesis.getVoices(); };
    }

    // ── Start AutonomousScheduler (polls background tasks every tick) ────────────
    autonomousScheduler.start();
    selfImprovementEngine.analyzeAndImprove().catch(() => null); // self-tune on mount

    // ── Initialize ConversationMemoryManager - restores cross-session context ────
    conversationMemoryManager.startConversation().catch(() => {/* non-fatal */});

    // ── Initialize PersistentVectorStore - loads persisted embeddings from IndexedDB ──
    persistentVectorStore.initialize().catch(() => {/* non-fatal */});
    monitoringService.info('system', 'BWConsultantOS initialized - all safety & evaluation services active');

    // ── Subscribe to EventBus - capture intelligence from all background services ──
    const unsubscribeHandlers: Array<() => void> = [];

    const appendEventInsight = (label: string, content: string) => {
      const entry = `[${label}] ${content.slice(0, 300)}`;
      eventBusInsightsRef.current = [
        ...eventBusInsightsRef.current.split('\n').slice(-12), // keep last 12 entries
        entry
      ].join('\n');
    };

    unsubscribeHandlers.push(
      EventBus.subscribe('consultantInsightsGenerated', e => {
        if (e.insights?.length) {
          appendEventInsight('CONSULTANT_INSIGHTS', e.insights.map((i: { content?: string; text?: string }) => i.content ?? i.text ?? String(i)).join(' | '));
        }
      }),
      EventBus.subscribe('learningUpdate', e => {
        if (e.message) appendEventInsight('LEARNING_UPDATE', e.message);
      }),
      EventBus.subscribe('searchResultReady', e => {
        if (e.result?.summary) appendEventInsight('SEARCH_RESULT', `${e.query}: ${e.result.summary}`);
      }),
      EventBus.subscribe('fullyAutonomousRunComplete', e => {
        const summary = e.deepThinking?.summary ?? e.deepThinking?.insight ?? '';
        if (summary) appendEventInsight('AUTONOMOUS_RUN', summary);
      }),
      EventBus.subscribe('ecosystemPulse', e => {
        const pulse = e.signals;
        if (pulse?.opportunities?.length) appendEventInsight('ECOSYSTEM_PULSE', `Alignment: ${pulse.alignment}% | Opportunities: ${pulse.opportunities.slice(0, 2).join('; ')}`);
      }),
      EventBus.subscribe('proactiveDiscovery', e => {
        if (e.actions?.length) appendEventInsight('PROACTIVE_DISCOVERY', e.actions.slice(0, 3).join('; '));
      })
    );

    return () => {
      ttsService.stop();
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null;
      }
      autonomousScheduler.stop();
      unsubscribeHandlers.forEach(unsub => unsub());
    };
  }, []);

  // ── Auto-inject initial consultant query (from command-centre / other modules) ──
  useEffect(() => {
    if (!initialConsultantQuery) return;
    setInputValue(initialConsultantQuery);
    onInitialConsultantQueryHandled?.();
  }, [initialConsultantQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── AutomaticSearchService - trigger on country / org change ───────────────
  useEffect(() => {
    const country = caseStudy.country.trim();
    const org = caseStudy.organizationName.trim();
    if (!country && !org) return;
    const query = [country, org].filter(Boolean).join(' ');
    automaticSearchService.triggerSearch(
      query,
      `BWConsultantOS case build: ${query}`,
      'medium'
    ).catch(() => { /* non-critical */ });
  }, [caseStudy.country, caseStudy.organizationName]);

  // ── Auto-inject location context pushed from Live Research ──────────────────
  useEffect(() => {
    if (!initialContext) return;
    const locationLabel = [initialContext.city, initialContext.country].filter(Boolean).join(', ');
    const locationNote = [
      locationLabel ? `📍 **${locationLabel}**` : '',
      initialContext.summary || '',
    ].filter(Boolean).join('\n\n');
    setMessages(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: 'system' as const,
        content: `Location intelligence pushed from Live Research:\n\n${locationNote}\n\nI've loaded this location profile. Tell me what you're trying to achieve here and I'll immediately begin building your advisory case.`,
        timestamp: new Date(),
        phase: 'discovery' as const,
      },
    ]);
    if (initialContext.country || initialContext.city) {
      setCaseStudy(prev => ({
        ...prev,
        country: prev.country || initialContext.country || '',
        jurisdiction: prev.jurisdiction || initialContext.country || '',
        currentMatter: prev.currentMatter.length < 40 ? (initialContext.summary?.substring(0, 200) || prev.currentMatter) : prev.currentMatter,
        additionalContext: [
          ...prev.additionalContext,
          `Location intelligence: ${locationLabel}`,
        ],
      }));
    }
    onInitialContextHandled?.();
  }, [initialContext]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Voice Input (Speech-to-Text) ──────────────────────────────────────────
  const toggleVoiceInput = useCallback(() => {
    if (typeof window === 'undefined') return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SR) {
      alert('Voice input is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      return;
    }

    // Stop any ongoing speech output so the mic doesn't pick up the AI voice
    if (window.speechSynthesis) window.speechSynthesis.cancel();

    const rec = new SR();
    recognitionRef.current = rec;
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';

    let interimTranscript = '';

    rec.onstart = () => setIsListening(true);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (event: any) => {
      interimTranscript = '';
      let finalFragment = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalFragment += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }
      if (finalFragment) {
        setInputValue(prev => (prev.trim() ? prev.trim() + ' ' + finalFragment.trim() : finalFragment.trim()));
        interimTranscript = '';
      } else if (interimTranscript) {
        // Show interim in the textarea live (will be replaced by final)
        setInputValue(prev => {
          const withoutInterim = prev.replace(/\[….*?\]$/, '').trimEnd();
          return withoutInterim ? withoutInterim + ' [… ' + interimTranscript.trim() + ']' : '[… ' + interimTranscript.trim() + ']';
        });
      }
    };

    rec.onerror = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    rec.onend = () => {
      // Strip any leftover interim placeholder
      setInputValue(prev => prev.replace(/\s*\[….*?\]$/, '').trim());
      setIsListening(false);
      recognitionRef.current = null;
    };

    rec.start();
  }, [isListening]);
  const [reactiveDraftStatus, setReactiveDraftStatus] = useState('');
  const [reactiveDraftHint, setReactiveDraftHint] = useState('');
  const [executionTimeline, setExecutionTimeline] = useState<ExecutionTask[]>([]);
  const [showExecutionTimeline, setShowExecutionTimeline] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<CasePhase>('intake');
  

  // File upload
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const learningProfileInputRef = useRef<HTMLInputElement>(null);
  const quickSyncSignatureRef = useRef('');
  const strategicApplySignatureRef = useRef('');
  
  // Workspace modal
  const [showWorkspaceModal, setShowWorkspaceModal] = useState(false);
  const [pilotModeEnabled, _setPilotModeEnabled] = useState(true);
  const [showPilotWindow, setShowPilotWindow] = useState(false);
  const [showPilotHowTo, setShowPilotHowTo] = useState(false);
  const [showAboutBWGA, setShowAboutBWGA] = useState(false);
  const [showFinalReport, setShowFinalReport] = useState(false);
  const [showFullCatalog, setShowFullCatalog] = useState(false);
  const [pilotFocus, setPilotFocus] = useState<PilotModeFocus>('new-markets');
  const [pilotFocusSelections, setPilotFocusSelections] = useState<PilotModeFocus[]>(['new-markets']);
  const [pilotSelectedAddOns, setPilotSelectedAddOns] = useState<string[]>([]);
  const [pilotOptionPreferences, setPilotOptionPreferences] = useState<Record<string, PilotOptionPreference>>({});
  const [customPilotOptionInput, setCustomPilotOptionInput] = useState('');
  const [customPilotOptions, setCustomPilotOptions] = useState<Array<{ id: string; label: string; prompt: string }>>([]);
  const [pilotOptionMemory, setPilotOptionMemory] = useState<Record<string, { label: string; prompt: string }>>({});
  const [activeGlobalIssuePack] = useState<string>(''); // not pre-set - resolved from conversation
  const [quickCountryFocus, setQuickCountryFocus] = useState('');
  const [quickBusinessTarget, setQuickBusinessTarget] = useState('');
  const [quickCustomSector] = useState('');
  const [quickCustomFocus] = useState('');
  const [quickDraftLines, setQuickDraftLines] = useState('');
  const [strategicAutoApplyEnabled] = useState(true);
  const [strategicApplyLoading, setStrategicApplyLoading] = useState(false);
  const [strategicApplyError, setStrategicApplyError] = useState('');
  const [, setStrategicApplyUpdatedAt] = useState('');
  const [liveInsightQuery, setLiveInsightQuery] = useState('');
  const [liveInsightLoading, setLiveInsightLoading] = useState(false);
  const [liveInsightError, setLiveInsightError] = useState('');
  const [liveInsightResults, setLiveInsightResults] = useState<LiveInsightResult[]>([]);
  const [, setLiveInsightUpdatedAt] = useState('');
  const [, setLiveInsightQueryUsed] = useState('');
  const [, setLiveInsightProviderStatus] = useState('');
  const [, setLiveInsightRunReason] = useState('');
  const [liveInsightFilter, setLiveInsightFilter] = useState<LiveInsightFilter>('all');
  const [liveInsightsRequested, setLiveInsightsRequested] = useState(false);
  const [lastLiveInsightSearchSignature, setLastLiveInsightSearchSignature] = useState('');
  
  // Document generation
  const [recommendedDocs, setRecommendedDocs] = useState<DocumentOption[]>([]);
  // Report options panel - shown after document upload
  const [reportOptionsMenu, setReportOptionsMenu] = useState<ReportOptionsMenu | null>(null);
  const [reportOptionsDocTitle, setReportOptionsDocTitle] = useState('');
  const [reportOptionsDocType, setReportOptionsDocType] = useState('');
  const [showReportOptions, setShowReportOptions] = useState(false);
  const [uploadedFileContentsRef, setUploadedFileContentsRef] = useState<string[]>([]);
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [generationScope, setGenerationScope] = useState<'selected' | 'letters-only' | 'reports-only' | 'case-study-only' | 'full-pack'>('selected');
  const [preferredOutputMode, setPreferredOutputMode] = useState<'auto' | 'letter' | 'document' | 'case-study' | 'full-pack'>('auto');
  const [enableFullCaseTreeMatching, setEnableFullCaseTreeMatching] = useState(true);
  const [fullSpectrumReasoningMode, setFullSpectrumReasoningMode] = useState(true);
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
  const [generatedDocuments, setGeneratedDocuments] = useState<Array<{id: string; title: string; content: string; category: 'report'|'letter'; htmlContent: string}>>([]);
  const [generatingProgress, setGeneratingProgress] = useState<{current: number; total: number} | null>(null);
  // ── Autonomous Agent state ──────────────────────────────────────────────────────
  const [isAutonomousRunning, setIsAutonomousRunning] = useState(false);
  const [autonomousProgress, setAutonomousProgress] = useState<OrchestratorProgress | null>(null);
  const [copied, setCopied] = useState(false);
  const [allowAllDocumentAccess, setAllowAllDocumentAccess] = useState(true);
  const [outputDepth, setOutputDepth] = useState<'brief-1' | 'memo-5' | 'report-20'>('memo-5');
  const [_adaptiveQuestionsAsked, _setAdaptiveQuestionsAsked] = useState(0);
  const [_skillLevel, setSkillLevel] = useState<'beginner' | 'intermediate' | 'advanced' | 'expert' | 'custom'>('beginner');
  const [readinessScore, setReadinessScore] = useState(0);
  const [_caseGraph, setCaseGraph] = useState<CaseGraph | null>(null);
  const [recommendationRationaleMap, setRecommendationRationaleMap] = useState<Record<string, string>>({});
  const [recommendationScoreMap, setRecommendationScoreMap] = useState<Record<string, RecommendationScore>>({});
  const [recommendationBoostMap, setRecommendationBoostMap] = useState<Record<string, number>>({});
  const [feedbackSignal, setFeedbackSignal] = useState<'positive' | 'partial' | 'negative' | null>(null);
  const [feedbackNote, setFeedbackNote] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [strictLearningImport, setStrictLearningImport] = useState(false);
  const [topGapQuickInput, setTopGapQuickInput] = useState('');
  const [entityDecisions, setEntityDecisions] = useState<Partial<Record<ExtractedEntityKey, 'accepted' | 'rejected'>>>({} as Partial<Record<ExtractedEntityKey, 'accepted' | 'rejected'>>);
  const [missionSnapshot, setMissionSnapshot] = useState<MissionSnapshot | null>(null);

  // Institutional OS layers: feedback, live data, actions, governance, locale, onboarding
  const [feedbackMap, setFeedbackMap] = useState<Record<string, 'up' | 'down'>>({});
  const [locale, setLocale] = useState<string>('en');
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);
  const [approvalGateAction, setApprovalGateAction] = useState<PendingAction | null>(null);
  const [liveDataCache, setLiveDataCache] = useState<Record<string, { country: string; gdpGrowth?: number|null; exchangeRate?: number|null; lastUpdated: string }>>({});
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [complianceWarnings, setComplianceWarnings] = useState<string[]>([]);
  const [consultantAuditEvents, setConsultantAuditEvents] = useState<ConsultantAuditEvent[]>([]);
  const [consultantAuditMeta, setConsultantAuditMeta] = useState<{ count: number; limit: number } | null>(null);
  const [consultantAuditLoading, setConsultantAuditLoading] = useState(false);
  const [consultantAuditError, setConsultantAuditError] = useState('');
  const [consultantAuditExporting, setConsultantAuditExporting] = useState(false);
  const [consultantAuditEventFilter, setConsultantAuditEventFilter] = useState<ConsultantAuditEventFilter>('all');
  const [consultantAuditProviderFilter, setConsultantAuditProviderFilter] = useState<ConsultantAuditProviderFilter>('all');
  const [consultantAuditSearch, setConsultantAuditSearch] = useState('');
  const [consultantAuditWindowMode, setConsultantAuditWindowMode] = useState<'all' | '24h'>('all');
  const [consultantAuditPage, setConsultantAuditPage] = useState(1);
  const [consultantAuditCopiedRequestId, setConsultantAuditCopiedRequestId] = useState('');
  const [consultantAuditTrends, setConsultantAuditTrends] = useState<ConsultantAuditTrendMetrics | null>(null);
  const [consultantAuditAutoRefresh, setConsultantAuditAutoRefresh] = useState(false);
  const [consultantAuditLookupRequestId, setConsultantAuditLookupRequestId] = useState('');
  const [consultantAuditLookupLoading, setConsultantAuditLookupLoading] = useState(false);
  const [consultantAuditLookupEvents, setConsultantAuditLookupEvents] = useState<ConsultantAuditEvent[]>([]);
  const [consultantReplayMeta, setConsultantReplayMeta] = useState<ConsultantReplayMeta | null>(null);
  const [consultantRetryLoading, setConsultantRetryLoading] = useState(false);
  const [consultantRetrySource, setConsultantRetrySource] = useState<'none' | 'backend-replay' | 'local-fallback'>('none');
  const [consultantRetryReason, setConsultantRetryReason] = useState('');
  const [augmentedAISnapshot, setAugmentedAISnapshot] = useState<AugmentedAISnapshot | null>(null);
  const [augmentedRecommendedTools, setAugmentedRecommendedTools] = useState<AugmentedRecommendedTool[]>([]);
  const [augmentedUnresolvedGaps, setAugmentedUnresolvedGaps] = useState<AugmentedGap[]>([]);
  const [augmentedCapabilityMode, setAugmentedCapabilityMode] = useState('');
  const [augmentedCapabilityTags, setAugmentedCapabilityTags] = useState<string[]>([]);
  const [augmentedReviewState, setAugmentedReviewState] = useState<'idle' | 'accept' | 'modify' | 'reject'>('idle');
  const [augmentedReviewLoading, setAugmentedReviewLoading] = useState(false);
  const [overlookedIntelligence, setOverlookedIntelligence] = useState<OverlookedIntelligence | null>(null);
  const [strategicPipeline, setStrategicPipeline] = useState<StrategicPipeline | null>(null);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const lastKernelSignalRef = useRef<string>('');
  const agenticAIRef = useRef(new BWConsultantAgenticAI());
  const sessionId = useRef(crypto.randomUUID());
  const agentRegistry = useRef((() => {
    const r = new AgentToolRegistry();
    registerBuiltInTools(r);
    return r;
  })());
  const agentMemory = useRef(new AgentMemoryStore());

  const initializeExecutionTimeline = useCallback(() => {
    setExecutionTimeline([
      { id: 'ingestion', label: 'Context ingest', status: 'queued' },
      { id: 'response', label: 'Consultant response stream', status: 'queued' },
      { id: 'insight', label: 'NSIL insight scan', status: 'queued' },
      { id: 'followup', label: 'High-value follow-up planning', status: 'queued' }
    ]);
  }, []);

  const setExecutionTaskStatus = useCallback((id: ExecutionTask['id'], status: ExecutionTaskStatus, detail?: string) => {
    setExecutionTimeline((prev) => prev.map((task) => (
      task.id === id ? { ...task, status, detail } : task
    )));
  }, []);

  const handleMessageFeedback = useCallback((msgId: string, signal: 'up' | 'down') => {
    const message = messages.find((entry) => entry.id === msgId);
    setFeedbackMap((prev) => ({ ...prev, [msgId]: signal }));

    const rankingQuery: ReportParameters = {
      country: caseStudy.country,
      region: caseStudy.jurisdiction || caseStudy.country,
      industry: [],
      strategicIntent: [caseStudy.objectives, caseStudy.organizationMandate, caseStudy.currentMatter].filter(Boolean),
      organizationType: caseStudy.organizationType,
      problemStatement: caseStudy.currentMatter,
    } as ReportParameters;

    const learnedFeatures = gradientRankingEngine.recordRelevanceSignal(
      msgId,
      rankingQuery,
      {
        id: msgId,
        country: caseStudy.country,
        region: caseStudy.jurisdiction || caseStudy.country,
        strategicIntent: rankingQuery.strategicIntent,
        organizationType: caseStudy.organizationType,
        problemStatement: caseStudy.currentMatter,
        outcome: signal === 'up' ? 'success' : 'failure',
        accessCount: signal === 'up' ? 5 : 0,
        userRating: signal === 'up' ? 1 : 0,
        timestamp: message?.timestamp?.toISOString() || new Date().toISOString(),
      },
      signal,
    );

    void memoryRef.current.remember('consultant_feedback', {
      action: `Consultant response marked ${signal === 'up' ? 'helpful' : 'unhelpful'}`,
      context: {
        messageId: msgId,
        country: caseStudy.country,
        jurisdiction: caseStudy.jurisdiction,
        objectives: caseStudy.objectives,
        organizationType: caseStudy.organizationType,
        currentMatter: caseStudy.currentMatter,
        responsePreview: message?.content?.slice(0, 400) || '',
        rankingFeatures: learnedFeatures,
      },
      outcome: {
        success: signal === 'up',
        signal,
      },
      lessonsLearned: [
        signal === 'up'
          ? 'Similar response patterns should rank higher for comparable advisory contexts.'
          : 'Similar response patterns should be deprioritized or challenged before surfacing again.'
      ],
      confidence: message?.provenance?.confidence ? Math.max(0.2, Math.min(0.95, message.provenance.confidence / 100)) : 0.6,
    });

    OutcomeLearningService.recordOutcome({
      caseId: msgId,
      timestamp: new Date().toISOString(),
      recommendedInterventions: ['consultant-response'],
      successfulInterventions: signal === 'up' ? ['consultant-response'] : [],
      governanceThreshold: 80,
      rankingDelta: signal === 'up' ? 1 : -1
    });
    // Feed selfLearningEngine via EventBus so it can adapt performance weights
    EventBus.publish({
      type: 'outcomeRecorded',
      reportId: msgId,
      outcome: { success: signal === 'up', notes: `User feedback: ${signal}` }
    });

    FailureModeGovernanceService.recordOutcomeFeedback(signal === 'up' ? 'positive' : 'negative');
  }, [caseStudy.country, caseStudy.currentMatter, caseStudy.jurisdiction, caseStudy.objectives, caseStudy.organizationMandate, caseStudy.organizationType, messages]);

  const queueAction = useCallback((action: Omit<PendingAction, 'status'>) => {
    setPendingActions((prev) => [
      ...prev.filter((a) => a.id !== action.id),
      { ...action, status: 'pending' }
    ]);
  }, []);

  const captureAugmentedAIFromPayload = useCallback((payload: Record<string, unknown>) => {
    const snapshot = payload?.augmentedAI as AugmentedAISnapshot | undefined;
    const tools = Array.isArray(payload?.recommendedTools)
      ? payload.recommendedTools as AugmentedRecommendedTool[]
      : [];
    const unresolved = Array.isArray(payload?.unresolvedGaps)
      ? payload.unresolvedGaps as AugmentedGap[]
      : [];
    const capabilityMode = typeof payload?.capabilityMode === 'string' ? payload.capabilityMode : '';
    const capabilityTags = Array.isArray(payload?.capabilityTags)
      ? payload.capabilityTags.filter((item): item is string => typeof item === 'string')
      : [];
    const overlooked = payload?.overlookedIntelligence as OverlookedIntelligence | undefined;
    const strategic = payload?.strategicPipeline as StrategicPipeline | undefined;

    if (snapshot) {
      setAugmentedAISnapshot(snapshot);
    }
    setAugmentedRecommendedTools(tools.slice(0, 6));
    setAugmentedUnresolvedGaps(unresolved.slice(0, 5));
    setAugmentedCapabilityMode(capabilityMode);
    setAugmentedCapabilityTags(capabilityTags);
    if (overlooked) setOverlookedIntelligence(overlooked);
    if (strategic) setStrategicPipeline(strategic);

    const topCriticalGap = unresolved.find((gap) => gap.severity === 'critical');
    if (topCriticalGap) {
      queueAction({
        id: 'augmented-ai-critical-gap',
        label: 'Close critical Augmented AI gap',
        description: topCriticalGap.question,
        category: 'escalate'
      });
    }
  }, [queueAction]);

  const submitAugmentedReview = useCallback(async (decision: 'accept' | 'modify' | 'reject') => {
    setAugmentedReviewLoading(true);
    setAugmentedReviewState(decision);

    try {
      await fetch('/api/ai/augmented-ai/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision,
          mode: augmentedCapabilityMode || augmentedAISnapshot?.mode || 'general_help',
          capabilityTags: augmentedCapabilityTags,
          unresolvedGaps: augmentedUnresolvedGaps,
          recommendedTools: augmentedRecommendedTools.map((tool) => ({ id: tool.id, name: tool.name, category: tool.category })),
          timestamp: new Date().toISOString()
        })
      });

      setMessages((prev) => ([
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'system',
          content: `Augmented AI review recorded: ${decision.toUpperCase()}${decision === 'modify' ? ' (human override requested)' : ''}.`,
          timestamp: new Date(),
          phase: 'analysis'
        }
      ]));
    } catch (error) {
      console.warn('Failed to submit Augmented AI review:', error);
      setMessages((prev) => ([
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'system',
          content: 'Augmented AI review could not be recorded right now. Please retry.',
          timestamp: new Date(),
          phase: 'analysis'
        }
      ]));
    } finally {
      setAugmentedReviewLoading(false);
    }
  }, [augmentedCapabilityMode, augmentedAISnapshot, augmentedCapabilityTags, augmentedUnresolvedGaps, augmentedRecommendedTools]);

  // ── AUTO-APPLY AUGMENTED REVIEW ────────────────────────────────────────────
  // Whenever a new augmented snapshot arrives, automatically accept it.
  // The human-in-the-loop gate is informational only - the system automatically
  // applies its augmented reasoning without requiring manual Accept/Modify/Reject.
  useEffect(() => {
    if (augmentedAISnapshot && augmentedReviewState === 'idle') {
      submitAugmentedReview('accept');
    }
  }, [augmentedAISnapshot, augmentedReviewState, submitAugmentedReview]);

  const executeAction = useCallback(async (action: PendingAction) => {
    setPendingActions((prev) => prev.map((a) => a.id === action.id ? { ...a, status: 'executing' } : a));
    // Execute immediately - no artificial delay
    setPendingActions((prev) => prev.map((a) => a.id === action.id ? { ...a, status: 'done' } : a));
    setApprovalGateAction(null);
  }, []);

  const fetchLiveIntelForCountry = useCallback(async (country: string) => {
    if (!country || liveDataCache[country.toLowerCase()]) return;
    try {
      const result = await LiveDataService.getCountryIntelligence(country);
      if (result) {
        setLiveDataCache((prev) => ({
          ...prev,
          [country.toLowerCase()]: {
            country,
            gdpGrowth: result.economics?.gdpGrowth ?? null,
            exchangeRate: result.currency?.rate ?? null,
            lastUpdated: result.dataQuality.lastUpdated
          }
        }));
      }
    } catch {
      // silent - live data is enrichment, not critical
    }
  }, [liveDataCache]);

  const resolvePolicyPack = useCallback((draft: CaseStudy): JurisdictionPolicyPack => {
    const context = `${draft.country} ${draft.jurisdiction}`.toLowerCase();
    const matched = JURISDICTION_POLICY_PACKS.find((pack) =>
      pack.triggers.some((trigger) => context.includes(trigger))
    );

    return matched || {
      id: 'global-default',
      label: 'Global Advisory Pack',
      triggers: [],
      regulatoryTone: 'executive-brief',
      requiredSupportDocuments: ['Decision brief', 'Risk register', 'Stakeholder map'],
      requiredLetters: ['Primary counterpart letter'],
      complianceFocus: ['Cross-jurisdiction consistency', 'Traceable assumptions']
    };
  }, []);

  const buildMessageProvenance = useCallback((draft: CaseStudy, readiness: number, additionalSources: string[] = []) => {
    const sources: string[] = [];

    if (draft.uploadedDocuments.length > 0) {
      sources.push(`Uploaded evidence: ${draft.uploadedDocuments.slice(0, 3).join(', ')}${draft.uploadedDocuments.length > 3 ? '…' : ''}`);
    }

    // Compliance gate: check jurisdiction-specific warnings
    const jurisdiction = (draft.jurisdiction || draft.country || '').toLowerCase();
    const complianceFlags: string[] = [];
    if (/eu|germany|france|netherlands|gdpr/i.test(jurisdiction)) {
      complianceFlags.push('GDPR data handling obligations apply');
    }
    if (/switzerland|cayman|singapore|banking secrecy/i.test(jurisdiction)) {
      complianceFlags.push('Banking secrecy jurisdiction - data-handling review required');
    }
    if (/saudi|uae|qatar|mena/i.test(jurisdiction)) {
      complianceFlags.push('MENA investment review controls - verify counterparty alignment');
    }
    if (complianceFlags.length > 0) {
      setComplianceWarnings(complianceFlags);
      sources.push(...complianceFlags.map((f) => `⚠ Compliance: ${f}`));
    }

    if (draft.additionalContext.length > 0) {
      sources.push(`Conversation context notes: ${draft.additionalContext.length}`);
    }

    if (draft.aiInsights.length > 0) {
      sources.push(`Prior AI/NSIL insights: ${draft.aiInsights.length}`);
    }

    sources.push(`Policy pack: ${resolvePolicyPack(draft).label}`);
    sources.push(...additionalSources.filter(Boolean));

    const evidenceSignals = Math.min(5, draft.uploadedDocuments.length + (draft.additionalContext.length > 0 ? 1 : 0) + (draft.aiInsights.length > 0 ? 1 : 0));
    const confidence = Math.max(35, Math.min(95, Math.round(readiness * 0.6 + evidenceSignals * 8)));
    const confidenceBand: 'low' | 'medium' | 'high' = confidence >= 75 ? 'high' : confidence >= 55 ? 'medium' : 'low';

    return {
      confidence,
      confidenceBand,
      sources
    };
  }, [resolvePolicyPack]);

  // Scroll to bottom on new messages — debounced so streaming doesn't cause
  // constant jarring scrolling. Only scrolls if user is near the bottom already.
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const timer = setTimeout(() => {
      // Only auto-scroll if user is within 300px of the bottom (not scrolled up reading)
      const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
      if (distanceFromBottom < 300) {
        container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
      }
    }, 120);
    return () => clearTimeout(timer);
  }, [messages]);

  const computeReadiness = useCallback((draft: CaseStudy) => {
    const weightedChecks = [
      { ok: draft.userName.length > 1, weight: 8 },
      { ok: draft.organizationName.length > 1, weight: 8 },
      { ok: draft.organizationType.length > 2, weight: 8 },
      { ok: draft.contactRole.length > 2, weight: 8 },
      { ok: draft.country.length > 1, weight: 8 },
      { ok: draft.jurisdiction.length > 1, weight: 8 },
      { ok: draft.organizationMandate.length > 2, weight: 8 },
      { ok: draft.currentMatter.length > 40, weight: 14 },
      { ok: draft.objectives.length > 20, weight: 10 },
      { ok: draft.constraints.length > 10, weight: 8 },
      { ok: draft.targetAudience.length > 2, weight: 8 },
      { ok: draft.decisionDeadline.length > 2, weight: 4 }
    ];

    const baseScore = weightedChecks.reduce((sum, item) => sum + (item.ok ? item.weight : 0), 0);
    const evidenceBoost = Math.min(10, draft.uploadedDocuments.length * 5);
    const contextBoost = Math.min(10, draft.additionalContext.length * 2);
    return Math.min(100, baseScore + evidenceBoost + contextBoost);
  }, []);

  const hasUserEngaged = useMemo(() => {
    const hasUserMessage = messages.some((message) => message.role === 'user' && message.content.trim().length > 0);
    const hasUploads = caseStudy.uploadedDocuments.length > 0;

    return hasUserMessage || hasUploads;
  }, [caseStudy.uploadedDocuments.length, messages]);

  const toAgenticParams = useCallback((draft: CaseStudy, userQuery?: string) => ({
    organizationName: draft.organizationName,
    organizationType: draft.organizationType,
    role: draft.contactRole,
    country: draft.country,
    region: draft.jurisdiction,
    problemStatement: draft.currentMatter,
    strategicObjective: draft.objectives,
    audience: draft.targetAudience,
    constraints: draft.constraints,
    mandate: draft.organizationMandate,
    timeline: draft.decisionDeadline,
    context: draft.additionalContext,
    userQuery: userQuery || '',
    forceFullSpectrum: fullSpectrumReasoningMode
  }), [fullSpectrumReasoningMode]);

  const consultantCaseProfile = useMemo(() => {
    const hasIdentity = Boolean(caseStudy.userName.trim() || caseStudy.contactRole.trim() || caseStudy.organizationName.trim());
    const personSummary = [
      caseStudy.userName || 'Client identity missing',
      caseStudy.contactRole ? `(${caseStudy.contactRole})` : '',
      caseStudy.organizationName ? `at ${caseStudy.organizationName}` : '',
      caseStudy.organizationType ? `[${caseStudy.organizationType}]` : ''
    ]
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim() || 'Client identity missing';

    const originSummary = [caseStudy.country, caseStudy.jurisdiction].filter(Boolean).join(' / ') || 'Jurisdiction data missing';
    const achievementSummary = caseStudy.objectives.trim() || 'Objective data missing';
    const decisionContext = caseStudy.currentMatter.trim() || 'Decision context missing';
    const keyConstraints = caseStudy.constraints.trim() || 'Constraint data missing';

    const missingPriorities = [
      !caseStudy.userName.trim() || !caseStudy.contactRole.trim() ? 'Clarify decision owner and authority' : null,
      !caseStudy.country.trim() || !caseStudy.jurisdiction.trim() ? 'Confirm country and legal/regulatory jurisdiction' : null,
      caseStudy.objectives.trim().length < 20 ? 'Define measurable outcome and success criteria' : null,
      caseStudy.currentMatter.trim().length < 60 ? 'Expand the problem statement with actors, stakes, and decision point' : null,
      caseStudy.targetAudience.trim().length < 3 ? 'Specify final decision audience (board, ministry, regulator, investor, etc.)' : null,
      caseStudy.decisionDeadline.trim().length < 3 ? 'Confirm decision deadline and urgency consequences' : null
    ].filter(Boolean) as string[];

    const nextConsultantActions = missingPriorities.length > 0
      ? missingPriorities.slice(0, 3)
      : [
          'Convert objectives into KPI-backed decision criteria',
          'Align recommended documents to audience expectations and mandate',
          'Translate evidence into an execution-ready narrative and annex plan'
        ];

    return {
      personSummary,
      hasIdentity,
      originSummary,
      achievementSummary,
      decisionContext,
      keyConstraints,
      evidenceSummary: `${caseStudy.uploadedDocuments.length} files • ${caseStudy.additionalContext.length} context notes • ${caseStudy.aiInsights.length} AI insights`,
      nextConsultantActions,
      missingPriorities
    };
  }, [caseStudy]);

  const consultantCaseBrief = useMemo(() => {
    return [
      `Client: ${consultantCaseProfile.personSummary}`,
      `Origin/Jurisdiction: ${consultantCaseProfile.originSummary}`,
      `Wants to achieve: ${consultantCaseProfile.achievementSummary}`,
      `Decision context: ${consultantCaseProfile.decisionContext}`,
      `Constraints: ${consultantCaseProfile.keyConstraints}`,
      `Evidence footprint: ${consultantCaseProfile.evidenceSummary}`,
      `Top consultant actions: ${consultantCaseProfile.nextConsultantActions.join(' | ')}`
    ].join('\n');
  }, [consultantCaseProfile]);

  const liveDraftReadiness = useMemo(() => {
    if (!hasUserEngaged) return 0;
    return computeReadiness(caseStudy);
  }, [caseStudy, computeReadiness, hasUserEngaged]);
  const CASE_COMPLETION_THRESHOLD = 100;
  const isCaseStudyComplete = liveDraftReadiness >= CASE_COMPLETION_THRESHOLD;

  const liveDraftStatus = useMemo(() => {
    if (isCaseStudyComplete) return 'Case Complete - Evaluation Active';
    if (liveDraftReadiness >= 75) return 'Final Inputs in Progress';
    if (liveDraftReadiness >= 45) return 'Case Build in Progress';
    return 'Building Initial Draft';
  }, [isCaseStudyComplete, liveDraftReadiness]);

  const fullCaseTreeMatchingSignals = useMemo(() => {
    if (!enableFullCaseTreeMatching) return [] as string[];

    const focusText = [
      caseStudy.objectives,
      caseStudy.currentMatter,
      caseStudy.constraints,
      caseStudy.targetAudience,
      caseStudy.country,
      caseStudy.jurisdiction,
      quickCountryFocus,
      quickBusinessTarget,
      quickCustomSector,
      quickCustomFocus
    ].join(' ').toLowerCase();

    const focusTokens = Array.from(new Set(
      focusText
        .split(/[^a-z0-9]+/i)
        .map((token) => token.trim())
        .filter((token) => token.length >= 4)
    ));

    const docMatches = recommendedDocs
      .map((doc) => {
        const haystack = `${doc.title} ${doc.description} ${doc.rationale} ${doc.supportingDocuments.join(' ')}`.toLowerCase();
        const overlap = focusTokens.filter((token) => haystack.includes(token));
        return { doc, overlapCount: overlap.length, overlap: overlap.slice(0, 3) };
      })
      .filter((item) => item.overlapCount > 0)
      .sort((a, b) => b.overlapCount - a.overlapCount)
      .slice(0, 4)
      .map((item) => `${item.doc.title} matches ${item.overlapCount} case signals (${item.overlap.join(', ')})`);

    const evidenceMatches = [
      caseStudy.uploadedDocuments.length > 0
        ? `${caseStudy.uploadedDocuments.length} uploaded file(s) available for evidence extraction and citation mapping`
        : null,
      caseStudy.additionalContext.length > 0
        ? `${caseStudy.additionalContext.length} conversation context note(s) available for scenario analysis`
        : null,
      caseStudy.aiInsights.length > 0
        ? `${caseStudy.aiInsights.length} prior AI/NSIL insight signal(s) available for cross-checking`
        : null,
      null
    ].filter(Boolean) as string[];

    const merged = [...docMatches, ...evidenceMatches];
    if (merged.length > 0) {
      return merged.slice(0, 6);
    }

    return ['Case-tree scan active: waiting for more objective/context/evidence inputs to compute key matches'];
  }, [
    enableFullCaseTreeMatching,
    caseStudy,
    recommendedDocs,
    quickCountryFocus,
    quickBusinessTarget,
    quickCustomSector,
    quickCustomFocus
  ]);

  const fullCaseTreeMatchingSummary = useMemo(() => (
    fullCaseTreeMatchingSignals.map((signal) => `- ${signal}`).join('\n')
  ), [fullCaseTreeMatchingSignals]);

  const _liveDraftExecutiveSummary = useMemo(() => {
    const organization = caseStudy.organizationName.trim();
    const objective = caseStudy.objectives.trim();
    const country = caseStudy.country.trim();
    const jurisdiction = caseStudy.jurisdiction.trim();
    const location = [country, jurisdiction].filter(Boolean).join(' / ');
    const context = caseStudy.currentMatter.trim();
    const constraints = caseStudy.constraints.trim();

    // Only show real data - no placeholder filler
    const parts: string[] = [];
    if (organization) parts.push(`**${organization}** is being assessed for a strategic decision${location ? ` in ${location}` : ''}.`);
    if (objective) parts.push(`Objective: ${objective}.`);
    if (context) parts.push(`Active context: ${context}.`);
    if (constraints) parts.push(`Key constraints: ${constraints}.`);

    if (parts.length === 0) return '';
    return parts.join(' ');
  }, [caseStudy]);

  const hasLiveDraftSignals = useMemo(() => {
    // Only true when the user has provided real structured case data
    // Not just additionalContext from chat messages
    return Boolean(
      caseStudy.organizationName.trim()
      || caseStudy.objectives.trim()
      || (caseStudy.currentMatter.trim() && caseStudy.currentMatter.trim().length >= 60)
      || caseStudy.country.trim()
      || caseStudy.jurisdiction.trim()
      || caseStudy.targetAudience.trim()
      || caseStudy.uploadedDocuments.length > 0
    );
  }, [caseStudy]);

  const classifyConsultantInput = useCallback((input: string) => {
    const normalized = input.trim();
    const tokens = normalized
      .toLowerCase()
      .replace(/[^a-z0-9\s'-]/g, ' ')
      .split(/\s+/)
      .filter(Boolean);

    const greetingOnly = /^(hi|hello|hey|yo|sup|good\s+(morning|afternoon|evening)|greetings|howdy)[!.,\s]*$/i.test(normalized);
    const smallTalkOnly = /^(thanks|thank\s+you|ok|okay|cool|nice|great|yes|yep|no|nope)[!.,\s]*$/i.test(normalized);
    const inferredName = normalized.match(/\b(?:i am|i'm|my name is|this is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\b/i)?.[1] || null;
    const hasStrategicIntent = /\b(help|assist|decision|objective|goal|need|market|entry|investment|compliance|risk|jurisdiction|country|deadline|timeline|partner|proposal|report|letter|document|strategy|problem|issue|opportunity)\b/i.test(normalized);
    const hasEntityHint = /\b(my name is|i am|i'm|from|in|at|for|company|organization|agency|ministry|board|investor|regulator)\b/i.test(normalized);

    const isLowSignal = Boolean(
      normalized && (
        greetingOnly
        || smallTalkOnly
        || (!hasStrategicIntent && !hasEntityHint && tokens.length <= 4)
      )
    );

    return {
      normalized,
      tokens,
      inferredName,
      greetingOnly,
      smallTalkOnly,
      hasStrategicIntent,
      isLowSignal
    };
  }, []);

  // buildLowSignalReply kept as safety fallback - pipeline bypass removed; AI handles all inputs directly
  const _buildLowSignalReply = useCallback((_detectedName: string | null) => {
    return "What are you working on? I'm ready to help.";
  }, []);

  const extractConsultantSignals = useCallback((input: string) => {
    const normalized = input.trim();
    if (!normalized) {
      return {
        userName: null as string | null,
        country: null as string | null,
        jurisdiction: null as string | null,
        organizationName: null as string | null,
        organizationType: null as string | null,
        contactRole: null as string | null,
        objectives: null as string | null,
        currentMatter: null as string | null,
        constraints: null as string | null,
        targetAudience: null as string | null,
        decisionDeadline: null as string | null,
        evidenceNote: null as string | null
      };
    }

    const inputSignal = classifyConsultantInput(normalized);

    if (inputSignal.isLowSignal && !inputSignal.inferredName) {
      return {
        userName: null as string | null,
        country: null as string | null,
        jurisdiction: null as string | null,
        organizationName: null as string | null,
        organizationType: null as string | null,
        contactRole: null as string | null,
        objectives: null as string | null,
        currentMatter: null as string | null,
        constraints: null as string | null,
        targetAudience: null as string | null,
        decisionDeadline: null as string | null,
        evidenceNote: null as string | null
      };
    }

    const userName = normalized.match(/\b(?:i am|i'm|my name is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\b/i)?.[1] || inputSignal.inferredName;
    const organizationName = (
      normalized.match(/\b(?:organization|company|agency|institution|we are|i represent|from)\s*(?:is|:)?\s*([A-Z][A-Za-z0-9&.,\-\s]{2,80})\b/i)?.[1]?.trim()
      // Accept bare department/ministry/agency names (user answering a follow-up like "department of industry")
      || normalized.match(/^\s*((?:department|ministry|agency|bureau|office|commission|authority|division|council)\s+(?:of|for)\s+[\w\s&\-']+)/i)?.[1]?.trim()
      // Accept short bare org names when user is directly answering the "which organisation" question
      || (normalized.trim().split(/\s+/).length <= 6 && /^[A-Z]/.test(normalized.trim()) ? normalized.trim() : null)
      || null
    );
    const organizationType = normalized.match(/\b(government agency|private company|ngo|non-profit|investor|bank|development bank|regional council|legal advisory|ministry|public sector|multilateral)\b/i)?.[1] || null;
    const contactRole = normalized.match(/\b(?:i am the|my role is|i serve as|i am)\s+([A-Za-z\s\-/]{3,60})\b/i)?.[1]?.trim() || null;
    // Country extraction: only match explicitly named countries, not regions/cities
    // Uses an explicit allow-list to avoid matching sub-national regions like "Mindanao"
    const _knownCountries = [
      'Afghanistan','Albania','Algeria','Angola','Argentina','Armenia','Australia','Austria',
      'Azerbaijan','Bangladesh','Belarus','Belgium','Belize','Benin','Bolivia','Bosnia','Botswana',
      'Brazil','Bulgaria','Burkina Faso','Burundi','Cambodia','Cameroon','Canada','Chad','Chile',
      'China','Colombia','Congo','Costa Rica','Croatia','Cuba','Cyprus','Czech Republic',
      'Denmark','Dominican Republic','Ecuador','Egypt','El Salvador','Ethiopia','Fiji','Finland',
      'France','Gabon','Gambia','Georgia','Germany','Ghana','Greece','Guatemala','Guinea',
      'Honduras','Hungary','India','Indonesia','Iran','Iraq','Ireland','Israel','Italy',
      'Jamaica','Japan','Jordan','Kazakhstan','Kenya','Kuwait','Kyrgyzstan','Laos','Latvia',
      'Lebanon','Libya','Lithuania','Luxembourg','Madagascar','Malawi','Malaysia','Mali','Malta',
      'Mauritania','Mauritius','Mexico','Moldova','Mongolia','Morocco','Mozambique','Myanmar',
      'Namibia','Nepal','Netherlands','New Zealand','Nicaragua','Niger','Nigeria','North Korea',
      'Norway','Oman','Pakistan','Palestine','Panama','Papua New Guinea','Paraguay','Peru',
      'Philippines','Poland','Portugal','Qatar','Romania','Russia','Rwanda','Saudi Arabia',
      'Senegal','Serbia','Sierra Leone','Singapore','Slovakia','Slovenia','Somalia','South Africa',
      'South Korea','South Sudan','Spain','Sri Lanka','Sudan','Sweden','Switzerland','Syria',
      'Taiwan','Tajikistan','Tanzania','Thailand','Timor-Leste','Togo','Tunisia','Turkey',
      'Turkmenistan','Uganda','Ukraine','United Arab Emirates','UAE','United Kingdom','UK',
      'United States','USA','Uruguay','Uzbekistan','Venezuela','Vietnam','Yemen','Zambia','Zimbabwe',
    ];
    const _countryRegex = new RegExp(
      `\\b(?:in|from|operating in|country[:\\s]+)\\s*(${_knownCountries.map(c => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`,
      'i'
    );
    const country = normalized.match(_countryRegex)?.[1]?.trim() || null;
    const jurisdiction = normalized.match(/\b(?:jurisdiction|regulatory regime|legal framework)\s*(?:is|:)?\s*([A-Za-z\s\-/]{3,60})\b/i)?.[1]?.trim() || null;
    const objectives = normalized.match(/\b(?:objective is|goal is|we aim to|we want to|wish to achieve)\s+([^\n.]{12,220})/i)?.[1]?.trim() || null;
    const currentMatter = inputSignal.isLowSignal ? null : (normalized.length >= 40 ? normalized : null);
    const constraints = normalized.match(/\b(?:constraint|limit|limitation|budget|timeline|deadline|compliance|resource|political)\b/i)
      ? (inputSignal.isLowSignal ? null : normalized)
      : null;
    const targetAudience = normalized.match(/\b(?:for|to|audience|decision makers?)\s+(board|investors?|regulator[s]?|ministry|government|court|executive team|partners?)\b/i)?.[1] || null;
    const decisionDeadline = normalized.match(/\b(?:deadline|due|by|before)\s*[:-]?\s*([^\n.]{3,60})/i)?.[1]?.trim() || null;
    const evidenceNote = /\b(evidence|annex|dataset|source|kpi|metric|report|attachment)\b/i.test(normalized)
      ? (inputSignal.isLowSignal ? null : normalized)
      : null;

    return {
      userName,
      organizationName,
      organizationType,
      contactRole,
      country,
      jurisdiction,
      objectives,
      currentMatter,
      constraints,
      targetAudience,
      decisionDeadline,
      evidenceNote
    };
  }, [classifyConsultantInput]);

  const consultantGateMissing = useMemo(() => {
    const missing: string[] = [];

    if (!caseStudy.userName.trim() || !caseStudy.contactRole.trim()) {
      missing.push('Decision owner identity and role');
    }
    if (!caseStudy.country.trim() || !caseStudy.jurisdiction.trim()) {
      missing.push('Country and jurisdiction');
    }
    if (caseStudy.objectives.trim().length < 20) {
      missing.push('Measurable objective');
    }
    if (caseStudy.currentMatter.trim().length < 60) {
      missing.push('Decision context and stakes');
    }
    if (caseStudy.targetAudience.trim().length < 3) {
      missing.push('Decision audience');
    }
    if (caseStudy.decisionDeadline.trim().length < 3) {
      missing.push('Decision deadline');
    }

    return missing;
  }, [caseStudy]);

  const consultantGateReady = consultantGateMissing.length === 0;

  const caseMethodGaps = useMemo(() => {
    const gaps: string[] = [];

    if (caseStudy.currentMatter.trim().length < 60) gaps.push('Boundary clarity');
    if (caseStudy.objectives.trim().length < 20) gaps.push('Objective quality');
    if (caseStudy.uploadedDocuments.length === 0 && !caseStudy.additionalContext.some((item) => item.toLowerCase().includes('evidence'))) {
      gaps.push('Evidence sufficiency');
    }
    if (!caseStudy.additionalContext.some((item) => /counterfactual|alternative|rival|other option/i.test(item))) {
      gaps.push('Rival explanations');
    }
    if (!caseStudy.additionalContext.some((item) => /owner|timeline|implementation|delivery/i.test(item)) && caseStudy.constraints.trim().length < 20) {
      gaps.push('Implementation feasibility');
    }

    return gaps;
  }, [caseStudy]);

  const activeIssuePack = useMemo(
    () => GLOBAL_ISSUE_PACKS.find((pack) => pack.id === activeGlobalIssuePack) || GLOBAL_ISSUE_PACKS[0],
    [activeGlobalIssuePack]
  );

  const normalizedPilotFocusSelections = useMemo(() => (
    pilotFocusSelections.length > 0 ? pilotFocusSelections : [pilotFocus]
  ), [pilotFocusSelections, pilotFocus]);

  const selectedPilotFocusLabel = useMemo(() => (
    normalizedPilotFocusSelections.map((focus) => focus.replace(/-/g, ' ')).join(' • ')
  ), [normalizedPilotFocusSelections]);

  const effectivePilotFocusText = useMemo(() => {
    const custom = quickCustomFocus.trim();
    if (custom) return custom;
    return selectedPilotFocusLabel || pilotFocus.replace(/-/g, ' ');
  }, [quickCustomFocus, selectedPilotFocusLabel, pilotFocus]);

  const liveInsightBaseQuery = useMemo(() => {
    const focus = effectivePilotFocusText.trim();
    const sector = (quickCustomSector.trim() || activeIssuePack.label).trim();
    const parts = [focus, sector];

    if (quickCountryFocus.trim()) parts.push(quickCountryFocus.trim());
    if (quickBusinessTarget.trim()) parts.push(quickBusinessTarget.trim());

    return parts.filter(Boolean).join(' - ');
  }, [effectivePilotFocusText, quickCustomSector, activeIssuePack.label, quickCountryFocus, quickBusinessTarget]);

  const currentLiveInsightInputSignature = useMemo(() => {
    return JSON.stringify({
      query: liveInsightQuery.trim() || liveInsightBaseQuery,
      country: quickCountryFocus.trim(),
      target: quickBusinessTarget.trim(),
      focus: effectivePilotFocusText,
      sector: quickCustomSector.trim() || activeIssuePack.label
    });
  }, [liveInsightQuery, liveInsightBaseQuery, quickCountryFocus, quickBusinessTarget, effectivePilotFocusText, quickCustomSector, activeIssuePack.label]);

  const _liveInsightInputsChanged = useMemo(() => {
    if (!liveInsightsRequested || !lastLiveInsightSearchSignature) return false;
    return currentLiveInsightInputSignature !== lastLiveInsightSearchSignature;
  }, [liveInsightsRequested, lastLiveInsightSearchSignature, currentLiveInsightInputSignature]);

  const liveInsightVisibleResults = useMemo(() => {
    if (liveInsightFilter === 'all') return liveInsightResults;
    return liveInsightResults.filter((item) => item.bucket === liveInsightFilter);
  }, [liveInsightResults, liveInsightFilter]);

  const liveInsightPinnedLinks = useMemo(() => {
    const pinned = new Set<string>();

    caseStudy.additionalContext.forEach((entry) => {
      const marker = '| ';
      if (!entry.startsWith('Pinned live source')) return;
      const index = entry.lastIndexOf(marker);
      if (index < 0) return;
      const link = entry.slice(index + marker.length).trim();
      if (link) pinned.add(link);
    });

    return pinned;
  }, [caseStudy.additionalContext]);

  const _liveInsightPinnedEntries = useMemo(() => {
    const entries = caseStudy.additionalContext
      .filter((entry) => entry.startsWith('Pinned live source ('))
      .map((entry) => {
        const bucketMatch = entry.match(/^Pinned live source \(([^)]+)\):\s*/i);
        const bucketRaw = (bucketMatch?.[1] || '').toLowerCase();
        const bucket: LiveInsightBucket = bucketRaw === 'government' || bucketRaw === 'finance' || bucketRaw === 'news' || bucketRaw === 'entities'
          ? bucketRaw
          : 'news';

        const body = entry.replace(/^Pinned live source \([^)]+\):\s*/i, '');
        const [titleAndSource, linkRaw] = body.split(' | ');
        const [titleRaw, sourceRaw] = titleAndSource.split(' - ');

        return {
          bucket,
          title: (titleRaw || '').trim(),
          source: (sourceRaw || '').trim(),
          link: (linkRaw || '').trim()
        };
      })
      .filter((item) => item.title && item.link);

    if (liveInsightFilter === 'all') {
      return entries.slice(-6).reverse();
    }

    return entries.filter((item) => item.bucket === liveInsightFilter).slice(-6).reverse();
  }, [caseStudy.additionalContext, liveInsightFilter]);

  const _liveInsightLeads = useMemo(() => ({
    global: liveInsightVisibleResults.find((item) => item.bucket === 'news') || null,
    funding: liveInsightVisibleResults.find((item) => item.bucket === 'finance') || null,
    regulatory: liveInsightVisibleResults.find((item) => item.bucket === 'government') || null,
    opportunity: liveInsightVisibleResults.find((item) => item.bucket === 'entities') || null
  }), [liveInsightVisibleResults]);

  const regionalKernel = useMemo(() => {
    return RegionalDevelopmentOrchestrator.run({
      regionProfile: caseStudy.organizationMandate || caseStudy.currentMatter,
      sector: caseStudy.situationType || activeIssuePack.label,
      constraints: caseStudy.constraints,
      fundingEnvelope: caseStudy.additionalContext.find((item) => /fund|budget|capex|financ/i.test(item)) || 'Not yet defined',
      governanceContext: `${caseStudy.jurisdiction} ${caseStudy.organizationType} ${caseStudy.targetAudience}`,
      country: caseStudy.country || 'unspecified',
      jurisdiction: caseStudy.jurisdiction || 'unspecified',
      objective: caseStudy.objectives,
      currentMatter: caseStudy.currentMatter,
      evidenceNotes: caseStudy.additionalContext.slice(0, 10),
      partnerCandidates: REGIONAL_PARTNER_CANDIDATES
    });
  }, [caseStudy, activeIssuePack]);

  const _pilotFocusIssues = useMemo(
    () => PILOT_GLOBAL_ISSUE_AREAS.filter((issue) => normalizedPilotFocusSelections.includes(issue.focus)),
    [normalizedPilotFocusSelections]
  );

  const pilotAdaptiveOptions = useMemo(() => {
    return PILOT_ADAPTIVE_OPTION_CATALOG.filter((option) => {
      if (option.stage !== currentPhase) return false;
      if (option.focus && !normalizedPilotFocusSelections.includes(option.focus)) return false;
      return true;
    }).map((option) => ({ id: option.id, label: option.label, prompt: option.prompt }));
  }, [currentPhase, normalizedPilotFocusSelections]);

  const pilotMissingRecommendationOptions = useMemo(() => {
    const options: Array<{ id: string; label: string; prompt: string }> = [];

    if (currentPhase !== 'intake') {
      const hasLetter = recommendedDocs.some((doc) => doc.category === 'letter');
      const hasReport = recommendedDocs.some((doc) => doc.category === 'report');

      if (!hasLetter) {
        options.push({
          id: 'recovery-letter-missing',
          label: 'Help me draft the letters I need',
          prompt: 'The current recommendation set is missing letters. Add the most relevant counterpart/stakeholder letters required for this case and explain why each is needed.'
        });
      }

      if (!hasReport) {
        options.push({
          id: 'recovery-report-missing',
          label: 'Help me create the reports I need',
          prompt: 'The current recommendation set is missing reports. Add decision-grade reports needed for this case and justify each selection.'
        });
      }
    }

    if (!consultantGateReady) {
      options.push({
        id: 'recovery-consultant-gate',
        label: 'Fill in missing details for me',
        prompt: `Consultant gate is blocked. Collect and structure missing essentials: ${consultantGateMissing.slice(0, 4).join(', ')}.`
      });
    }

    if (caseStudy.uploadedDocuments.length === 0) {
      options.push({
        id: 'recovery-evidence-seed',
        label: 'Tell me what documents to upload',
        prompt: 'No source documents are uploaded. Add an evidence seed list with required files, expected data fields, and owner assignments.'
      });
    }

    return options;
  }, [currentPhase, recommendedDocs, consultantGateReady, consultantGateMissing, caseStudy.uploadedDocuments.length]);

  const pilotAllOptions = useMemo(() => {
    const map = new Map<string, { id: string; label: string; prompt: string }>();

    [...pilotAdaptiveOptions, ...pilotMissingRecommendationOptions, ...customPilotOptions].forEach((option) => {
      map.set(option.id, option);
    });

    Object.entries(pilotOptionMemory).forEach(([id, payload]) => {
      if (!map.has(id)) {
        map.set(id, { id, label: payload.label, prompt: payload.prompt });
      }
    });

    return map;
  }, [pilotAdaptiveOptions, pilotMissingRecommendationOptions, customPilotOptions, pilotOptionMemory]);

  const _pilotIncludedOptionLabels = useMemo(() => {
    return pilotSelectedAddOns
      .filter((id) => pilotOptionPreferences[id] === 'include')
      .map((id) => pilotAllOptions.get(id)?.label || id);
  }, [pilotSelectedAddOns, pilotOptionPreferences, pilotAllOptions]);

  const _pilotExcludedOptionLabels = useMemo(() => {
    return pilotSelectedAddOns
      .filter((id) => pilotOptionPreferences[id] === 'exclude')
      .map((id) => pilotAllOptions.get(id)?.label || id);
  }, [pilotSelectedAddOns, pilotOptionPreferences, pilotAllOptions]);

  const customResearchTopics = useMemo(() => {
    return customPilotOptions.map((o) => o.label);
  }, [customPilotOptions]);

  const _pilotFailureAlerts = useMemo(() => {
    if (!pilotModeEnabled) return [] as string[];

    const alerts: string[] = [];

    if (!caseStudy.country.trim() || !caseStudy.jurisdiction.trim()) {
      alerts.push('Global comparison risk: country/jurisdiction is incomplete.');
    }
    if (!caseStudy.objectives.trim() || caseStudy.objectives.trim().length < 20) {
      alerts.push('Strategy risk: objective is too weak for market and partnership scoring.');
    }
    if (caseStudy.uploadedDocuments.length === 0 && !caseStudy.additionalContext.some((item) => item.toLowerCase().includes('evidence'))) {
      alerts.push('Evidence risk: no uploaded source material or evidence note detected.');
    }
    if (!consultantGateReady) {
      alerts.push(`Consultant gate blocked: ${consultantGateMissing.slice(0, 2).join('; ')}.`);
    }
    if (caseMethodGaps.length > 0) {
      alerts.push(`Case study method gaps: ${caseMethodGaps.slice(0, 2).join('; ')}.`);
    }
    if (regionalKernel.governanceReadiness < 75) {
      alerts.push(`Regional kernel readiness ${regionalKernel.governanceReadiness}% is below deployment threshold.`);
    }
    if (regionalKernel.dataFabric.overallFreshnessHours > 14) {
      alerts.push('Global data fabric signals are aging and should be refreshed before final commitments.');
    }

    return alerts;
  }, [pilotModeEnabled, caseStudy, consultantGateReady, consultantGateMissing, caseMethodGaps, regionalKernel]);

  const _pilotReadiness = useMemo(() => {
    if (!pilotModeEnabled) return 0;
    const base = consultantGateReady ? 70 : 35;
    const evidence = Math.min(20, caseStudy.uploadedDocuments.length * 5 + caseStudy.additionalContext.length * 2);
    const mission = missionSnapshot ? 10 : 0;
    const methodPenalty = caseMethodGaps.length > 0 ? Math.min(20, caseMethodGaps.length * 4) : 0;
    return Math.min(100, Math.max(0, base + evidence + mission - methodPenalty));
  }, [pilotModeEnabled, consultantGateReady, caseStudy.uploadedDocuments.length, caseStudy.additionalContext.length, missionSnapshot, caseMethodGaps.length]);

  useEffect(() => {
    const signalKey = `${Math.round(regionalKernel.dataFabric.overallConfidence * 100)}-${regionalKernel.dataFabric.overallFreshnessHours}-${regionalKernel.governanceReadiness}`;
    if (lastKernelSignalRef.current === signalKey) return;

    if (regionalKernel.dataFabric.overallFreshnessHours > 14 || regionalKernel.governanceReadiness < 75) {
      lastKernelSignalRef.current = signalKey;
      // Background signal only - silent kernel refresh, no chat injection
    }
  }, [regionalKernel, currentPhase]);

  const _realLifeMatterPack = useMemo(() => {
    const lines = [
      `Person: ${caseStudy.userName || 'Not provided'} (${caseStudy.contactRole || 'Role not provided'})`,
      `Organization: ${caseStudy.organizationName || 'Not provided'} (${caseStudy.organizationType || 'Type not provided'})`,
      `Where: ${caseStudy.country || 'Country missing'} / ${caseStudy.jurisdiction || 'Jurisdiction missing'}`,
      `Mandate: ${caseStudy.organizationMandate || 'Mandate not provided'}`,
      `Situation: ${caseStudy.currentMatter || 'Situation missing'}`,
      `Objective: ${caseStudy.objectives || 'Objective missing'}`,
      `Audience: ${caseStudy.targetAudience || 'Audience missing'}`,
      `Deadline: ${caseStudy.decisionDeadline || 'Deadline missing'}`,
      `Constraints: ${caseStudy.constraints || 'Constraints missing'}`,
      `Evidence assets: ${caseStudy.uploadedDocuments.length} uploaded file(s), ${caseStudy.additionalContext.length} context note(s), ${caseStudy.aiInsights.length} AI insight(s)`,
      `Custom research topics: ${customResearchTopics.length > 0 ? customResearchTopics.join(', ') : 'none'}`,
      `Global issue pack: ${activeIssuePack.label}`,
      `Case method gaps: ${caseMethodGaps.length > 0 ? caseMethodGaps.join(', ') : 'none'}`,
      `Regional kernel readiness: ${regionalKernel.governanceReadiness}%`
    ];
    return lines.join('\n');
  }, [caseStudy, customResearchTopics, activeIssuePack.label, caseMethodGaps, regionalKernel.governanceReadiness]);

  const _pilotSelectedAddOnPrompts = useMemo(() => {
    return pilotSelectedAddOns
      .map((id) => pilotAllOptions.get(id))
      .filter((option): option is { id: string; label: string; prompt: string } => Boolean(option))
      .map((option) => `- ${option.prompt}`)
      .join('\n');
  }, [pilotSelectedAddOns, pilotAllOptions]);

  const outputDepthSpec = useMemo(() => {
    if (outputDepth === 'brief-1') {
      return {
        label: '1-Page Brief',
        instruction: 'Generate a concise one-page executive brief (approximately 450-700 words) with only critical decision facts and immediate next actions.'
      };
    }

    if (outputDepth === 'report-20') {
      return {
        label: '20-Page Report',
        instruction: 'Generate a deep strategic report equivalent of up to 20 pages (approximately 7000-10000 words) with full analysis, scenarios, implementation roadmap, risks, and annex-ready structure.'
      };
    }

    return {
      label: '5-Page Memo',
      instruction: 'Generate a mid-depth strategic memo of about 5 pages (approximately 1800-2800 words) balancing decision clarity and actionable detail.'
    };
  }, [outputDepth]);

  const _handlePilotApplyMove = useCallback((move: string) => {
    setCurrentPhase('discovery');
    setInputValue(move);
    setCaseStudy((prev) => ({
      ...prev,
      additionalContext: [...prev.additionalContext, `Pilot recommendation: ${move}`]
    }));
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Added to your case: ${move}`,
        timestamp: new Date(),
        phase: 'discovery'
      }
    ]);
  }, []);

  const _handleSetPilotOptionPreference = useCallback((optionId: string, preference: PilotOptionPreference) => {
    const option = pilotAllOptions.get(optionId);
    if (!option) return;

    setCurrentPhase('discovery');
    setInputValue(option.prompt);

    setPilotSelectedAddOns((prev) => (prev.includes(optionId) ? prev : [...prev, optionId]));
    setPilotOptionPreferences((prev) => ({
      ...prev,
      [optionId]: preference
    }));
    setPilotOptionMemory((prev) => ({
      ...prev,
      [optionId]: {
        label: option.label,
        prompt: option.prompt
      }
    }));

    setCaseStudy((prev) => ({
      ...prev,
      additionalContext: prev.additionalContext.includes(`Pilot add-on: ${option.label}`)
        ? prev.additionalContext
        : [...prev.additionalContext, `Pilot add-on: ${option.label}`]
    }));

    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Pilot option set to ${preference === 'include' ? 'Include' : 'Without'}: ${option.label}`,
        timestamp: new Date(),
        phase: 'discovery'
      }
    ]);
  }, [pilotAllOptions]);

  const syncQuickConsultantToCaseStudy = useCallback((
    trigger: string,
    overrides?: {
      country?: string;
      businessTarget?: string;
      focus?: string;
      sector?: string;
      topicLabel?: string;
    }
  ) => {
    const country = (overrides?.country ?? quickCountryFocus).trim();
    const businessTarget = (overrides?.businessTarget ?? quickBusinessTarget).trim();
    const focus = (overrides?.focus ?? effectivePilotFocusText).trim();
    const sector = (overrides?.sector ?? (quickCustomSector.trim() || activeIssuePack.label)).trim();
    const topicLabel = (overrides?.topicLabel ?? '').trim();

    if (!country && !businessTarget && !focus && !sector && !topicLabel) return;

    const signature = JSON.stringify({ country, businessTarget, focus, sector, topicLabel });
    if (quickSyncSignatureRef.current === signature) return;
    quickSyncSignatureRef.current = signature;

    const syncLine = `Live Research sync (${trigger}): Focus=${focus || 'n/a'}; Country=${country || 'n/a'}; Target=${businessTarget || 'n/a'}; Sector=${sector || 'n/a'}${topicLabel ? `; Topic=${topicLabel}` : ''}`;

    setCaseStudy((prev) => {
      const additionalContext = prev.additionalContext.includes(syncLine)
        ? prev.additionalContext
        : [...prev.additionalContext, syncLine];

      return {
        ...prev,
        country: country || prev.country,
        jurisdiction: prev.jurisdiction || country || prev.jurisdiction,
        targetAudience: businessTarget || prev.targetAudience,
        organizationType: prev.organizationType || sector || prev.organizationType,
        situationType: focus || prev.situationType,
        objectives: prev.objectives.trim().length >= 20
          ? prev.objectives
          : (focus ? `Advance ${focus}` : prev.objectives),
        currentMatter: prev.currentMatter.trim().length >= 40
          ? prev.currentMatter
          : (focus ? `Live Research context: ${focus}${country ? ` in ${country}` : ''}${businessTarget ? ` targeting ${businessTarget}` : ''}` : prev.currentMatter),
        additionalContext
      };
    });

    if (trigger === 'manual-sync') {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'system',
          content: `Live Research synced to BW Consultant context${topicLabel ? ` (topic: ${topicLabel})` : ''}. This has been added to the live draft report inputs.`,
          timestamp: new Date(),
          phase: 'discovery'
        }
      ]);
    }
  }, [quickCountryFocus, quickBusinessTarget, effectivePilotFocusText, quickCustomSector, activeIssuePack.label]);

  const applyStrategicFactors = useCallback(async (
    trigger: 'auto-intake' | 'manual'
  ) => {
    const country = quickCountryFocus.trim();
    const businessTarget = quickBusinessTarget.trim();
    const focus = effectivePilotFocusText.trim();
    const sector = (quickCustomSector.trim() || activeIssuePack.label).trim();

    if (!country && !businessTarget && focus.length < 4 && sector.length < 3) {
      return;
    }

    const message = [
      `Live Research strategic intake: ${focus || 'General expansion objective'}`,
      country ? `Country/region: ${country}` : '',
      businessTarget ? `Business target: ${businessTarget}` : '',
      `Sector: ${sector}`
    ].filter(Boolean).join(' | ');

    const signature = JSON.stringify({
      message,
      country,
      businessTarget,
      focus,
      sector
    });

    if (trigger !== 'manual' && strategicApplySignatureRef.current === signature) {
      return;
    }
    strategicApplySignatureRef.current = signature;

    setStrategicApplyLoading(true);
    setStrategicApplyError('');

    try {
      const contextCaseStudy: CaseStudy = {
        ...caseStudy,
        country: country || caseStudy.country,
        jurisdiction: caseStudy.jurisdiction || country || caseStudy.jurisdiction,
        targetAudience: businessTarget || caseStudy.targetAudience,
        situationType: focus || caseStudy.situationType,
        organizationType: caseStudy.organizationType || sector || caseStudy.organizationType
      };

      const [overlookedRes, strategicRes] = await Promise.all([
        fetch('/api/ai/consultant/overlooked-scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message, context: { caseStudy: contextCaseStudy } })
        }),
        fetch('/api/ai/consultant/strategic-pipeline', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message, context: { caseStudy: contextCaseStudy } })
        })
      ]);

      if (!overlookedRes.ok || !strategicRes.ok) {
        throw new Error('Strategic services did not return success status.');
      }

      const overlookedData = await overlookedRes.json();
      const strategicData = await strategicRes.json();
      const overlooked = overlookedData?.overlookedIntelligence as OverlookedIntelligence | undefined;
      const strategic = strategicData?.strategicPipeline as StrategicPipeline | undefined;

      if (overlooked) setOverlookedIntelligence(overlooked);
      if (strategic) setStrategicPipeline(strategic);

      const appliedAt = new Date().toISOString();
      setStrategicApplyUpdatedAt(appliedAt);

      setCaseStudy((prev) => {
        const nextContext = [...prev.additionalContext];
        const readinessLine = `Strategic factors applied (${trigger}): readiness=${typeof strategic?.readinessScore === 'number' ? strategic.readinessScore : 'n/a'}%; evidence=${typeof overlooked?.evidenceCredibility === 'number' ? overlooked.evidenceCredibility : 'n/a'}%; gap=${typeof overlooked?.perceptionRealityGap === 'number' ? overlooked.perceptionRealityGap : 'n/a'}`;
        if (!nextContext.includes(readinessLine)) {
          nextContext.push(readinessLine);
        }

        const topRegionalLines = (overlooked?.topRegionalOpportunities || [])
          .slice(0, 2)
          .map((item) => `Overlooked regional target: ${item.place} (score ${item.score})`);
        topRegionalLines.forEach((line) => {
          if (!nextContext.includes(line)) nextContext.push(line);
        });

        const strategicHintLines = [
          ...(strategic?.engagementDraftHints?.governmentLetterFocus || []),
          ...(strategic?.engagementDraftHints?.partnerLetterFocus || []),
          ...(strategic?.engagementDraftHints?.investorBriefFocus || [])
        ].slice(0, 3).map((line) => `Strategic draft hint: ${line}`);

        strategicHintLines.forEach((line) => {
          if (!nextContext.includes(line)) nextContext.push(line);
        });

        if (nextContext.length === prev.additionalContext.length) {
          return prev;
        }

        return {
          ...prev,
          additionalContext: nextContext
        };
      });

      if (trigger === 'manual') {
        setMessages((prev) => ([
          ...prev,
          {
            id: crypto.randomUUID(),
            role: 'system',
            content: `Strategic factors applied to Live Research inputs. ${strategic?.recommendedPath?.targetRegion ? `Top regional target: ${strategic.recommendedPath.targetRegion}.` : ''}`,
            timestamp: new Date(),
            phase: 'analysis'
          }
        ]));
      }
    } catch (error) {
      console.warn('Failed to apply strategic factors:', error);
      setStrategicApplyError('Strategic factor application failed. Please retry.');
    } finally {
      setStrategicApplyLoading(false);
    }
  }, [quickCountryFocus, quickBusinessTarget, effectivePilotFocusText, quickCustomSector, activeIssuePack.label, caseStudy]);

  useEffect(() => {
    if (!strategicAutoApplyEnabled) return;

    const country = quickCountryFocus.trim();
    const businessTarget = quickBusinessTarget.trim();
    const focus = effectivePilotFocusText.trim();
    const sector = (quickCustomSector.trim() || activeIssuePack.label).trim();
    const hasStrategicInputs = country.length > 0 || businessTarget.length > 0 || focus.length >= 4 || sector.length >= 4;

    if (!hasStrategicInputs) return;

    const timer = window.setTimeout(() => {
      syncQuickConsultantToCaseStudy('auto-intake');
      void applyStrategicFactors('auto-intake');
    }, 900);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    strategicAutoApplyEnabled,
    quickCountryFocus,
    quickBusinessTarget,
    effectivePilotFocusText,
    quickCustomSector,
    activeIssuePack.label,
    syncQuickConsultantToCaseStudy,
    applyStrategicFactors
  ]);

  const handleTogglePilotFocus = useCallback((focus: PilotModeFocus) => {
    const nextSelections = pilotFocusSelections.includes(focus)
      ? pilotFocusSelections.filter((item) => item !== focus)
      : [...pilotFocusSelections, focus];

    const safeSelections = nextSelections.length > 0 ? nextSelections : [focus];
    setPilotFocusSelections(safeSelections);
    setPilotFocus(focus);

    syncQuickConsultantToCaseStudy('focus-button', {
      focus: safeSelections.map((item) => item.replace(/-/g, ' ')).join(' • ')
    });
  }, [pilotFocusSelections, syncQuickConsultantToCaseStudy]);

  const _handleAddCustomPilotOption = useCallback(() => {
    const text = customPilotOptionInput.trim();
    if (!text) return;

    const optionId = `custom-${Date.now()}`;
    const option = {
      id: optionId,
      label: text.length > 48 ? `${text.slice(0, 45)}...` : text,
      prompt: text
    };

    setCustomPilotOptions((prev) => [option, ...prev]);
    setCustomPilotOptionInput('');
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Research topic noted: "${option.label}" - this will be factored into your consultation.`,
        timestamp: new Date(),
        phase: 'discovery'
      }
    ]);
    syncQuickConsultantToCaseStudy('research-topic', { topicLabel: option.label });
  }, [customPilotOptionInput, syncQuickConsultantToCaseStudy]);

  const handleConvertQuickLinesToDraft = useCallback(() => {
    const raw = quickDraftLines.trim();
    if (!raw) return;

    const lines = raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    const labeledValue = (patterns: RegExp[]) => {
      const row = lines.find((line) => patterns.some((pattern) => pattern.test(line)));
      if (!row) return '';
      return row
        .replace(/^\s*(who|organisation|organization|org|country|jurisdiction|decision|objective|goal|deadline|audience|sector|focus|target)\s*[:-]\s*/i, '')
        .trim();
    };

      const inferredCountry = labeledValue([/^country\s*[:-]/i, /^location\s*[:-]/i]) || quickCountryFocus;
      const inferredTarget = labeledValue([/^target\s*[:-]/i, /^audience\s*[:-]/i, /^who\s*[:-]/i]) || quickBusinessTarget;
      const inferredSector = labeledValue([/^sector\s*[:-]/i, /^industry\s*[:-]/i]) || quickCustomSector;
      const inferredFocus = labeledValue([/^focus\s*[:-]/i, /^objective\s*[:-]/i, /^goal\s*[:-]/i]) || quickCustomFocus || lines[0] || '';
      const inferredDecision = labeledValue([/^decision\s*[:-]/i]) || lines.slice(1, 3).join(' ');
      const inferredDeadline = labeledValue([/^deadline\s*[:-]/i, /^timeline\s*[:-]/i]);

    setCaseStudy((prev) => ({
      ...prev,
      country: inferredCountry || prev.country,
      jurisdiction: prev.jurisdiction || inferredCountry || prev.jurisdiction,
      targetAudience: inferredTarget || prev.targetAudience,
      organizationType: prev.organizationType || inferredSector || prev.organizationType,
      situationType: inferredFocus || prev.situationType,
      objectives: prev.objectives.trim().length >= 20
        ? prev.objectives
        : (inferredFocus || prev.objectives),
      currentMatter: prev.currentMatter.trim().length >= 60
        ? prev.currentMatter
        : (inferredDecision || raw),
      decisionDeadline: prev.decisionDeadline || inferredDeadline,
      additionalContext: prev.additionalContext.includes(`Quick lines conversion: ${raw}`)
        ? prev.additionalContext
        : [...prev.additionalContext, `Quick lines conversion: ${raw}`]
    }));

    syncQuickConsultantToCaseStudy('quick-lines-conversion', {
      country: inferredCountry,
      businessTarget: inferredTarget,
      focus: inferredFocus,
      sector: inferredSector
    });

    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Quick lines converted into BW Consultant baseline context and added to the live draft report.',
        timestamp: new Date(),
        phase: 'discovery'
      }
    ]);

    setQuickDraftLines('');
  }, [quickDraftLines, quickCountryFocus, quickBusinessTarget, quickCustomSector, quickCustomFocus, syncQuickConsultantToCaseStudy]);

  const fetchLiveWorldInsights = useCallback(async (overrideQuery?: string, silent = false) => {
    const manualQuery = (overrideQuery ?? liveInsightQuery).trim();
    const contextDerivedQuery = [
      liveInsightBaseQuery,
      effectivePilotFocusText,
      quickCustomSector.trim() || activeIssuePack.label,
      quickCountryFocus.trim(),
      quickBusinessTarget.trim()
    ].filter(Boolean).join(' ').trim();

    const query = (manualQuery.length >= 4 ? manualQuery : contextDerivedQuery) || 'regional investment partnerships government finance';
    if (!query.trim()) return;

    const getSourceFromLink = (link: string) => {
      try {
        return new URL(link).hostname.replace(/^www\./i, '');
      } catch {
        return 'live-source';
      }
    };

    type SerperLikeItem = { title?: string; link?: string; snippet?: string; date?: string; source?: string };

    const toInsightResults = (items: SerperLikeItem[], bucket: LiveInsightBucket, limit: number) => {
      return items
        .filter((item) => item.title && item.link)
        .slice(0, limit)
        .map((item) => ({
          title: item.title || '',
          link: item.link || '',
          snippet: item.snippet || '',
          source: item.source || getSourceFromLink(item.link || ''),
          publishedAt: item.date,
          bucket
        } as LiveInsightResult));
    };

    setLiveInsightLoading(true);
    setLiveInsightError('');
    setLiveInsightRunReason('');
    setLiveInsightQueryUsed(query);

    if (!silent || !liveInsightQuery.trim()) {
      setLiveInsightQuery(query);
    }

    try {
      const [newsRes, govRes, financeRes, entityRes] = await Promise.all([
        fetch('/api/search/news', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `${query} energy transition government policy investment partnership`,
            country: quickCountryFocus || undefined
          })
        }),
        fetch('/api/search/serper', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `${query} government incentives ministry regulator compliance development bank`,
            num: 6,
            type: 'search'
          })
        }),
        fetch('/api/search/serper', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `${query} development finance bilateral aid venture private equity project finance`,
            num: 6,
            type: 'search'
          })
        }),
        fetch('/api/search/serper', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `${query} partnership company government agency investor announcement`,
            num: 6,
            type: 'search'
          })
        })
      ]);

      const newsData = newsRes.ok ? await newsRes.json() : { articles: [] as Array<{ title?: string; description?: string; url?: string; source?: string; publishedAt?: string }>, reason: 'News request failed' };
      const govData = govRes.ok ? await govRes.json() : { organic: [] as SerperLikeItem[], providerStatus: { serper: 'error' }, reason: 'Government search failed' };
      const financeData = financeRes.ok ? await financeRes.json() : { organic: [] as SerperLikeItem[], providerStatus: { serper: 'error' }, reason: 'Finance search failed' };
      const entityData = entityRes.ok ? await entityRes.json() : { organic: [] as SerperLikeItem[], providerStatus: { serper: 'error' }, reason: 'Entity search failed' };

      const providerStatuses = [govData, financeData, entityData]
        .map((item) => item?.providerStatus?.serper)
        .filter((status): status is string => Boolean(status));
      setLiveInsightProviderStatus(providerStatuses.length > 0 ? Array.from(new Set(providerStatuses)).join(' • ') : 'unknown');

      const reasonMessages = [newsData?.reason, govData?.reason, financeData?.reason, entityData?.reason]
        .filter((reason): reason is string => Boolean(reason && reason !== 'Provider returned zero matches for this query.'));

      const newsInsights: LiveInsightResult[] = (Array.isArray(newsData.articles) ? newsData.articles : [])
        .filter((article) => article.title && article.url)
        .slice(0, 4)
        .map((article) => ({
          title: article.title || '',
          link: article.url || '',
          snippet: article.description || '',
          source: article.source || getSourceFromLink(article.url || ''),
          publishedAt: article.publishedAt,
          bucket: 'news' as LiveInsightBucket
        }));

      const merged = [
        ...newsInsights,
        ...toInsightResults(Array.isArray(govData.organic) ? govData.organic : [], 'government', 3),
        ...toInsightResults(Array.isArray(financeData.organic) ? financeData.organic : [], 'finance', 3),
        ...toInsightResults(Array.isArray(entityData.organic) ? entityData.organic : [], 'entities', 3)
      ].slice(0, 12);

      setLiveInsightResults(merged);
      setLiveInsightUpdatedAt(new Date().toISOString());
      setLastLiveInsightSearchSignature(JSON.stringify({
        query,
        country: quickCountryFocus.trim(),
        target: quickBusinessTarget.trim(),
        focus: effectivePilotFocusText,
        sector: quickCustomSector.trim() || activeIssuePack.label
      }));

      if (merged.length === 0) {
        const noResultReason = reasonMessages[0] || 'No live search results were returned yet. Try adding a country, company, or government target.';
        setLiveInsightError(noResultReason);
        setLiveInsightRunReason(noResultReason);

        setCaseStudy((prev) => {
          const missLine = `Live search run returned no direct results: ${noResultReason}`;
          const queryLine = `Live search query used: ${query}`;
          const additionalContext = [...prev.additionalContext];

          if (!additionalContext.includes(queryLine)) {
            additionalContext.push(queryLine);
          }
          if (!additionalContext.includes(missLine)) {
            additionalContext.push(missLine);
          }

          if (additionalContext.length === prev.additionalContext.length) return prev;
          return { ...prev, additionalContext };
        });
        return;
      }

      setLiveInsightRunReason(reasonMessages[0] || '');

      setCaseStudy((prev) => {
        const newLines = merged.slice(0, 6).map((item) => {
          const snippet = item.snippet?.trim();
          return `Live search finding (${item.bucket}): ${item.title} - ${item.source}${snippet ? ` | ${snippet}` : ''} | ${item.link}`;
        });
        const queryLine = `Live search query used: ${query}`;
        const providerLine = `Live search provider status: ${providerStatuses.length > 0 ? Array.from(new Set(providerStatuses)).join(' • ') : 'unknown'}`;
        const additionalContext = [...prev.additionalContext];

        if (!additionalContext.includes(queryLine)) {
          additionalContext.push(queryLine);
        }
        if (!additionalContext.includes(providerLine)) {
          additionalContext.push(providerLine);
        }

        newLines.forEach((line) => {
          if (!additionalContext.includes(line)) {
            additionalContext.push(line);
          }
        });

        if (additionalContext.length === prev.additionalContext.length) {
          return prev;
        }

        return {
          ...prev,
          additionalContext
        };
      });
    } catch (error) {
      console.error('Live world insights search failed:', error);
      setLiveInsightError('Live search failed. Please try again in a moment.');
    } finally {
      setLiveInsightLoading(false);
    }
  }, [liveInsightQuery, liveInsightBaseQuery, quickCountryFocus, quickBusinessTarget, effectivePilotFocusText, quickCustomSector, activeIssuePack.label]);

  const _handleResearchTopicFromIssue = useCallback((issue: PilotIssueArea) => {
    const topicTitle = issue.title.trim();
    if (!topicTitle) return;

    const query = [
      topicTitle,
      effectivePilotFocusText,
      quickCountryFocus.trim(),
      quickBusinessTarget.trim(),
      quickCustomSector.trim() || activeIssuePack.label
    ].filter(Boolean).join(' ').trim();

    syncQuickConsultantToCaseStudy('issue-topic', { topicLabel: topicTitle });

    setCaseStudy((prev) => {
      const line = `Live Research topic activated: ${topicTitle}`;
      if (prev.additionalContext.includes(line)) return prev;
      return {
        ...prev,
        additionalContext: [...prev.additionalContext, line]
      };
    });

    setMessages((prev) => ([
      ...prev,
      {
        id: crypto.randomUUID(),
        role: 'system',
        content: `Research topic activated: ${topicTitle}. Live search and case draft context were updated.`,
        timestamp: new Date(),
        phase: 'discovery'
      }
    ]));

    setLiveInsightsRequested(true);
    void fetchLiveWorldInsights(query, true);
  }, [
    effectivePilotFocusText,
    quickCountryFocus,
    quickBusinessTarget,
    quickCustomSector,
    activeIssuePack.label,
    syncQuickConsultantToCaseStudy,
    fetchLiveWorldInsights
  ]);

  const handlePinLiveInsightToDraft = useCallback((item: LiveInsightResult) => {
    const evidenceLine = `Pinned live source (${item.bucket}): ${item.title} - ${item.source} | ${item.link}`;

    setCaseStudy((prev) => {
      if (prev.additionalContext.includes(evidenceLine)) {
        return prev;
      }

      return {
        ...prev,
        additionalContext: [...prev.additionalContext, evidenceLine]
      };
    });

    setMessages((prev) => {
      const pinMessage = `Pinned to live draft evidence: ${item.title} (${item.source}).`;
      const alreadyNoted = prev.some((msg) => msg.content === pinMessage);
      if (alreadyNoted) return prev;

      return [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'system',
          content: pinMessage,
          timestamp: new Date(),
          phase: 'discovery'
        }
      ];
    });
  }, []);

  const _handleUnpinLiveInsightFromDraft = useCallback((item: { title: string; link: string; source?: string; bucket?: LiveInsightBucket }) => {
    setCaseStudy((prev) => {
      const nextContext = prev.additionalContext.filter((entry) => {
        if (!entry.startsWith('Pinned live source (')) return true;
        const hasSameLink = entry.includes(`| ${item.link}`);
        const hasSameTitle = entry.includes(`: ${item.title} -`);
        return !(hasSameLink || hasSameTitle);
      });

      if (nextContext.length === prev.additionalContext.length) {
        return prev;
      }

      return {
        ...prev,
        additionalContext: nextContext
      };
    });

    setMessages((prev) => ([
      ...prev,
      {
        id: crypto.randomUUID(),
        role: 'system',
        content: `Removed pinned source from draft evidence: ${item.title}.`,
        timestamp: new Date(),
        phase: 'discovery'
      }
    ]));
  }, []);

  const _handleClearAllPinnedLiveInsights = useCallback(() => {
    if (typeof window !== 'undefined') {
      const approved = window.confirm('Clear all pinned live sources from draft evidence?');
      if (!approved) return;
    }

    setCaseStudy((prev) => {
      const nextContext = prev.additionalContext.filter((entry) => !entry.startsWith('Pinned live source ('));
      if (nextContext.length === prev.additionalContext.length) {
        return prev;
      }

      return {
        ...prev,
        additionalContext: nextContext
      };
    });

    setMessages((prev) => ([
      ...prev,
      {
        id: crypto.randomUUID(),
        role: 'system',
        content: 'Cleared all pinned live sources from draft evidence.',
        timestamp: new Date(),
        phase: 'discovery'
      }
    ]));
  }, []);

  useEffect(() => {
    setReadinessScore(computeReadiness(caseStudy));
    const detected = AdaptiveQuestionnaire.detectSkillLevel({
      organizationName: caseStudy.organizationName,
      strategicIntent: caseStudy.objectives,
      customData: {
        mandate: caseStudy.organizationMandate,
        audience: caseStudy.targetAudience,
        jurisdiction: caseStudy.jurisdiction,
        constraints: caseStudy.constraints
      }
    });
    setSkillLevel(detected);
  }, [caseStudy, computeReadiness]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const raw = window.localStorage.getItem(LEARNING_SIGNALS_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const sanitized = Object.entries(parsed).reduce<Record<string, number>>((acc, [key, value]) => {
        if (typeof value !== 'number' || Number.isNaN(value)) return acc;
        acc[key] = Math.max(-12, Math.min(12, value));
        return acc;
      }, {});
      setRecommendationBoostMap(sanitized);
    } catch (storageError) {
      console.warn('Unable to restore learning signals from local storage:', storageError);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      if (Object.keys(recommendationBoostMap).length === 0) {
        window.localStorage.removeItem(LEARNING_SIGNALS_STORAGE_KEY);
        return;
      }
      window.localStorage.setItem(
        LEARNING_SIGNALS_STORAGE_KEY,
        JSON.stringify(recommendationBoostMap)
      );
    } catch (storageError) {
      console.warn('Unable to persist learning signals to local storage:', storageError);
    }
  }, [recommendationBoostMap]);

  // Start with onboarding welcome message
  useEffect(() => {
    if (messages.length === 0) {
      const initialMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: [
          'Welcome - I\'m glad you\'re here.',
          '',
          'I\'m your BW Consultant - think of me as a senior advisor in your corner. I help leaders like you navigate complex opportunities with clarity and confidence.',
          '',
          'As we talk, the system verifies and refines information in real time. You may see a fast first response, then a corrected version a moment later as checks complete. That is intentional: speed first, then validation.',
          '',
          'Whether you\'re exploring a new market, evaluating a partnership, approaching government, or structuring an investment - you don\'t need to have everything figured out before we start.',
          '',
          'Just tell me what you\'re working on, and we\'ll build your case together.'
        ].join('\n'),
        timestamp: new Date(),
        phase: 'discovery'
      };
      setMessages([initialMessage]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Read file content - uses Gemini multimodal for binary documents (PDF, DOCX, etc.)
  const readFileContent = useCallback(async (file: File): Promise<string> => {
    const lowerName = file.name.toLowerCase();

    // Binary/structured documents that Gemini can read natively via multimodal
    const useAIExtraction = [
      '.pdf', '.docx', '.doc', '.pptx', '.xlsx', '.png', '.jpg', '.jpeg', '.webp', '.gif'
    ].some(ext => lowerName.endsWith(ext));

    if (useAIExtraction) {
      return extractFileTextViaAI(file);
    }

    // Plain-text formats - read directly and truncate
    const isText = file.type.startsWith('text/') || 
      ['.txt', '.md', '.csv', '.json', '.html', '.xml', '.ts', '.tsx', '.js', '.jsx'].some(ext => lowerName.endsWith(ext));

    if (isText) {
      try {
        const text = await file.text();
        return `[${file.name}]\n${text.slice(0, 32000)}${text.length > 32000 ? '\n...(truncated)' : ''}`;
      } catch {
        return `[${file.name}] - Unable to read file content`;
      }
    }

    return `[${file.name}] - File type not supported. Please convert to PDF or plain text (.txt).`;
  }, []);

  const buildConsultantPrompt = useCallback((userInput: string, context: string) => {
    const policyPack = resolvePolicyPack(caseStudy);
    const caseReadiness = computeReadiness(caseStudy);
    return `You are BW Consultant AI, an expert business intelligence consultant. Operate in mixed-initiative autonomous mode.

Current case context:
${JSON.stringify(caseStudy, null, 2)}

Applicable policy pack:
${JSON.stringify(policyPack, null, 2)}

Consultant intelligence profile:
${consultantCaseBrief}

Consultant gate status:
${consultantGateReady ? 'READY - all case fields populated' : `ENRICHING - some fields still being collected in background: ${consultantGateMissing.join('; ')}. Do NOT refuse to answer or loop on intake questions. Always respond to the user's actual request first.`}

User's latest input: "${userInput}"
Phase context: ${context}

Case enrichment mode:
- Case readiness is currently ${caseReadiness}%.
- Maintain direct-answer-first behavior in every turn.
- Enrich profile fields silently from conversation context when available.
- Ask at most one concise follow-up only when it materially improves the current answer.

Autonomous operating instructions:
- First, answer the user's actual request directly (including non-case or off-topic questions).
- Second, infer and update useful case facts from the conversation context.
- Third, if critical information is missing, ask only one highest-value follow-up question.
- Never force a rigid scripted questionnaire.
- Be natural, concise, and decision-focused.

Policy pack execution rules:
- Respect regulatory tone: ${policyPack.regulatoryTone}
- Ensure required support docs are reflected: ${policyPack.requiredSupportDocuments.join(', ')}
- Ensure required letters are reflected: ${policyPack.requiredLetters.join(', ')}
- Emphasize compliance focus: ${policyPack.complianceFocus.join(', ')}

Consultant operating rules:
- Always anchor advice on WHO the client is, WHERE they operate, and WHAT they want to achieve.
- Build the case file like a consultant: facts, assumptions, risks, options, recommendation.
- If data is incomplete, ask the single highest-value question that improves decision quality.
- Convert provided information into action-oriented outputs, not generic commentary.

${(quickCountryFocus || quickBusinessTarget || quickCustomSector || customResearchTopics.length > 0) ? `Live Research context (user-configured in Pilot panel):
${quickCountryFocus ? `- Country/region of focus: ${quickCountryFocus}` : ''}
${quickBusinessTarget ? `- Business target: ${quickBusinessTarget}` : ''}
${quickCustomSector ? `- Custom sector: ${quickCustomSector}` : (activeIssuePack.id ? `- Issue pack selected: ${activeIssuePack.label}` : '')}
${customResearchTopics.length > 0 ? `- Custom research topics: ${customResearchTopics.join(', ')}` : ''}` : '(Pilot panel not configured - operating from conversation context only)'}

Output intent and matching mode:
- Preferred output mode: ${preferredOutputMode}
- Full case-tree matching scan: ${enableFullCaseTreeMatching ? 'ENABLED' : 'DISABLED'}
${enableFullCaseTreeMatching ? `- Key matching signals:\n${fullCaseTreeMatchingSummary}` : ''}

When the user has specified a country or region, proactively reference:
- Government investment attraction programs and incentive schemes
- Relevant development bank and multilateral finance programs
- Regional business conditions and market access factors
- Key stakeholders and institutional counterparts

Respond naturally and helpfully. Keep responses focused and actionable.

${agentRegistry.current.toManifest()}`;
  }, [caseStudy, resolvePolicyPack, consultantCaseBrief, consultantGateReady, consultantGateMissing, computeReadiness, quickCountryFocus, quickBusinessTarget, activeIssuePack, quickCustomSector, customResearchTopics, preferredOutputMode, enableFullCaseTreeMatching, fullCaseTreeMatchingSummary]);

  const _buildNaturalFallbackReply = useCallback((userInput: string) => {
    const trimmed = userInput.trim();

    // ── GREETING ──────────────────────────────────────────────────────────────
    if (/^(hi|hello|hey|good\s+(morning|afternoon|evening)|yo|sup)[!.\s]*$/i.test(trimmed)) {
      return 'Good to hear from you. Tell me what you\'re working on - a deal, a market, a partner, a pitch - and I\'ll help you build a clear path forward.';
    }

    // ── DOCUMENT UPLOAD AWARENESS ──────────────────────────────────────────────
    const hasDocContent = /\*\*Uploaded Documents:\*\*/.test(trimmed);
    const refAnalysis = latestDocAnalysisRef.current;

    if (hasDocContent || refAnalysis !== null) {
      if (refAnalysis) {
        const lines: string[] = [];
        lines.push(`**Document reviewed:** ${refAnalysis.title || 'Uploaded document'}`);
        if (refAnalysis.country) lines.push(`**Country/Region:** ${refAnalysis.country}`);
        if (refAnalysis.sector) lines.push(`**Domain:** ${refAnalysis.sector}`);
        if (refAnalysis.stakeholders.length) lines.push(`**Key actors:** ${refAnalysis.stakeholders.slice(0, 4).join(', ')}`);

        let reply = `**I have reviewed the uploaded document. Here is what the NSIL engines identified:**\n\n`;
        reply += lines.join('\n') + '\n\n';

        if (refAnalysis.keyIssues.length > 0) {
          reply += `**Key issues surfaced from this document:**\n`;
          reply += refAnalysis.keyIssues.map(i => `\u2022 ${i}`).join('\n');
          reply += '\n\n';
        }

        const scores = refAnalysis.scores;
        if (Object.keys(scores).length > 0) {
          reply += `**NSIL Diagnostic Scores (0\u2013100):**\n`;
          reply += `\u2022 Governance Quality: ${scores.governance ?? 'N/A'}\n`;
          reply += `\u2022 Stakeholder Alignment: ${scores.stakeholderAlignment ?? 'N/A'}\n`;
          reply += `\u2022 Implementation Readiness: ${scores.implementationReadiness ?? 'N/A'}\n`;
          reply += `\u2022 Overall Viability: ${scores.overallViability ?? 'N/A'}\n\n`;
        }

        if (refAnalysis.historicalParallels.length > 0) {
          reply += `**Historical parallels matched:**\n`;
          reply += refAnalysis.historicalParallels.map(h => `\u2022 ${h}`).join('\n');
          reply += '\n\n';
        }

        reply += `Tell me what specific aspect you want to focus on and I will build that analysis now.`;
        return reply;
      }

      let reply = `**Document received.** Tell me what specific aspect you want to focus on and I will produce the analysis.`;
      return reply;
    }

    // ── INFORMATION / RESEARCH QUESTION ───────────────────────────────────────
    // "tell me about X", "what is X", "explain X", "describe X", etc.
    // These are questions, not intake answers - respond to what was actually asked.
    const isInfoQuestion = /^(tell me about|tell me more about|more about|what is|what are|who is|explain|describe|give me info|can you tell me|i want to know about|i want to know more about|what do you know about|research|find out about|background on|background about)\b/i.test(trimmed);

    // ── BRAIN CONTEXT is available via brainCtxRef for AI system prompts ──
    // Note: brain intelligence is injected into the AI system prompt (effectiveSystemPrompt)
    // and should NOT be shown directly in the visible chat response.

    if (isInfoQuestion) {
      // Extract the topic from the question for a direct response
      const topicMatch = trimmed.match(/^(?:tell me(?:\s+more)?\s+about|more about|what is|what are|who is|explain|describe|give me info(?: on| about)?|can you tell me about|i want to know(?:\s+more)?\s+about|what do you know about|research|find out about|background (?:on|about))\s+(.+)/i);
      const topic = topicMatch?.[1]?.trim() || trimmed;

      return `Good question. Let me pull together what I know about **${topic}** and cross-reference it with current data.\n\n` +
        `If you want me to focus on a specific angle - investment feasibility, political risk, regulatory landscape, or market entry - let me know.`;
    }

    // ── GENERAL FALLBACK - ANSWER DIRECTLY, never deflect ─────────────────────
    const lc = trimmed.toLowerCase();

    // Quick fresh-signal extraction from the current input
    const freshCountryMap: Record<string, string[]> = {
      'Philippines': ['philippines', 'manila', 'cebu', 'mindanao', 'pagadian', 'davao', 'zamboanga', 'luzon', 'visayas'],
      'Vietnam': ['vietnam', 'hanoi', 'ho chi minh'], 'Indonesia': ['indonesia', 'jakarta', 'bali'],
      'Australia': ['australia', 'sydney', 'melbourne', 'brisbane'], 'India': ['india', 'mumbai', 'delhi', 'bangalore'],
      'Kenya': ['kenya', 'nairobi'], 'Nigeria': ['nigeria', 'lagos', 'abuja'],
      'Japan': ['japan', 'tokyo', 'osaka'], 'South Korea': ['south korea', 'seoul'],
      'China': ['china', 'beijing', 'shanghai'], 'Singapore': ['singapore'],
      'Thailand': ['thailand', 'bangkok'], 'Malaysia': ['malaysia', 'kuala lumpur'],
      'United Kingdom': ['united kingdom', 'uk', 'london', 'england'], 'United States': ['united states', 'usa', 'washington'],
    };
    let freshCountry = '';
    for (const [c, kws] of Object.entries(freshCountryMap)) {
      if (kws.some(k => lc.includes(k))) { freshCountry = c; break; }
    }

    // ── Detect sector keywords for a more specific acknowledgment ──
    const sectorHints: Record<string, string[]> = {
      'manufacturing': ['factory', 'manufactur', 'plant', 'assembly', 'production'],
      'agriculture & fisheries': ['farm', 'agri', 'food', 'crop', 'fish', 'aquaculture', 'livestock'],
      'energy': ['solar', 'wind', 'renewable', 'energy', 'battery', 'hydrogen'],
      'technology': ['tech', 'software', 'digital', 'fintech', 'ai', 'data'],
      'mining': ['mining', 'mineral', 'ore', 'coal', 'gas', 'petroleum'],
      'logistics & trade': ['logistics', 'freight', 'shipping', 'port', 'supply chain', 'supply'],
      'tourism': ['tourism', 'hotel', 'resort', 'hospitality'],
      'health': ['hospital', 'pharma', 'medical', 'healthcare'],
      'financial services': ['bank', 'finance', 'investment', 'insurance'],
    };
    let freshSector = '';
    for (const [sector, kws] of Object.entries(sectorHints)) {
      if (kws.some(k => lc.includes(k))) { freshSector = sector; break; }
    }

    // Build a direct, conversational acknowledgment that reflects the user's actual input
    if (trimmed.length >= 20) {
      const parts: string[] = [];
      if (freshCountry && freshSector) {
        parts.push(`Understood - you're looking at **${freshSector}** opportunities in **${freshCountry}**.`);
      } else if (freshCountry) {
        parts.push(`Understood - let me focus on **${freshCountry}** for you.`);
      } else if (freshSector) {
        parts.push(`Understood - I'll look into the **${freshSector}** angle.`);
      } else {
        parts.push(`Understood. Let me work through this for you.`);
      }
      parts.push(`I'm pulling together market intelligence, regulatory landscape, and strategic options now. The full analysis will follow shortly.`);
      parts.push(`\nWhile that runs - is there a specific angle you want me to prioritise? For example: market entry strategy, regulatory requirements, investment incentives, or risk assessment.`);
      return parts.join(' ');
    }

    const reply = `Understood. What specific topic, country, or situation would you like me to analyse? I can cover market entry, regulatory landscape, investment feasibility, risk assessment, and stakeholder mapping across any sector or geography.`;
    return reply;
  }, []);

  type DeliverableIntent = 'background' | 'quick_answer' | 'report' | 'letter' | 'full_case' | 'unknown';

  const classifyDeliverableIntent = useCallback((input: string): DeliverableIntent => {
    const text = input.toLowerCase();

    if (/\b(full report|board report|case study|dossier|submission|business case)\b/.test(text)) return 'report';
    if (/\b(letter|loi|mou|email draft|submission letter|cover letter)\b/.test(text)) return 'letter';
    if (/\b(full pack|document pack|report \+ letter|end-to-end|complete package)\b/.test(text)) return 'full_case';
    if (/\b(background|overview|intel brief|briefing|research only)\b/.test(text)) return 'background';
    if (/\b(quick answer|simple answer|just tell me|next step|recommendation)\b/.test(text)) return 'quick_answer';

    return 'unknown';
  }, []);

  const shouldAskOutputClarification = useCallback((draft: CaseStudy, input: string, intent: DeliverableIntent): boolean => {
    void draft;
    if (intent !== 'unknown') return false;

    const explicitFormatSelectionRequest = /\b(choose format|output format|which format|pick a format|not sure which format|what format should i use|a\)|b\)|c\)|d\)|e\)|f\))\b/i.test(input);
    return explicitFormatSelectionRequest;
  }, []);

  const buildOutputClarificationPrompt = useCallback((draft: CaseStudy) => {
    const knownIdentity = draft.organizationName || draft.userName || 'Not provided yet';
    const knownLocation = draft.country || draft.jurisdiction || 'Not provided yet';

    return `I can format this a few ways-pick one and I'll generate it now:\n\nA) Quick background insight (3-5 bullets)\nB) Concrete next-step recommendation\nC) Full report (board-ready)\nD) Letter/document draft\nE) Full case pack (report + letters)\nF) Not sure - recommend best format\n\nReply with A-F (or say "just answer normally").\n\nKnown so far:\n- Identity: ${knownIdentity}\n- Location: ${knownLocation}`;
  }, []);

  const isLowSignalInsight = useCallback((title: string, content: string, confidence?: number): boolean => {
    const combined = `${title} ${content}`.toLowerCase();
    const placeholderPattern = /(pending verification|not applicable|\bn\/a\b|unknown|\bvarious\b|who can help set|information pending|tbd)/i;
    const tooShort = title.trim().length < 8 || content.trim().length < 24;
    const lowConfidence = typeof confidence === 'number' && confidence < 0.6;

    return tooShort || placeholderPattern.test(combined) || lowConfidence;
  }, []);

  const filterActionableInsights = useCallback((
    insights: Array<{ title: string; content: string; confidence?: number; sources?: string[] }>,
    userQuery: string,
    countryHint?: string
  ) => {
    const query = (userQuery || '').toLowerCase();
    const country = (countryHint || '').toLowerCase();
    const investmentOrDisruptionIntent = /\b(invest|investment|market|trade|tariff|supply\s*chain|logistics|partnership|opportunity|risk|strategy|finance|funding|regulatory|compliance|disruption|sanction|geopolitical|arbitrage)\b/i.test(query);

    return insights.filter((insight) => {
      if (isLowSignalInsight(insight.title, insight.content, insight.confidence)) {
        return false;
      }

      const title = insight.title.toLowerCase();
      const content = insight.content.toLowerCase();
      const combined = `${title} ${content}`;

      // Suppress meta/noise cards that do not add user-facing value.
      if (title.includes('research & background intelligence') && /general information query detected/i.test(content)) {
        return false;
      }

      // Show global disruption only when the user intent is relevant OR the disruption mentions the current country.
      if (title.includes('global disruption monitor')) {
        const mentionsCountry = country.length > 1 && combined.includes(country);
        if (!investmentOrDisruptionIntent && !mentionsCountry) {
          return false;
        }
      }

      return true;
    });
  }, [isLowSignalInsight]);

  // Process user input through real AI
  const processWithAI = useCallback(async (userInput: string, context: string): Promise<string> => {
    try {
      const systemPrompt = buildConsultantPrompt(userInput, context);
      try {
        const endpointResponse = await fetch('/api/ai/consultant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: userInput,
            context: {
              phase: context,
              caseStudy,
              consultantCaseBrief,
              consultantGateReady,
              consultantGateMissing
            },
            systemPrompt
          })
        });

        if (endpointResponse.ok) {
          const payload = await endpointResponse.json() as Record<string, unknown>;
          captureAugmentedAIFromPayload(payload);
          const endpointText = String(payload?.text || '').trim();
          if (endpointText) {
            return endpointText;
          }
        }
      } catch (endpointError) {
        console.warn('Unified consultant endpoint unavailable, using ReasoningPipeline:', endpointError);
      }

      // ── Fallback: ReasoningPipeline (non-streaming) ─────────────────────────────
      //  Run engines + full 4-step reasoning before returning answer.
      //  Use only the typed query (before any document separator) for the engines.
      const _docSep = userInput.indexOf('\n\n**Uploaded Documents:**');
      const _focusedIssue = _docSep > -1 ? userInput.slice(0, _docSep).trim() : userInput;
      const intelligenceBlock = await runIssuePipeline({
        issue: _focusedIssue || userInput.slice(0, 500),
        country: caseStudy.country || undefined,
        organizationName: caseStudy.organizationName || undefined,
        organizationType: caseStudy.organizationType || undefined,
        objectives: caseStudy.objectives || undefined,
        currentMatter: caseStudy.currentMatter || undefined,
      }).catch(() => undefined);

      const _docMatch = userInput.match(/\*\*Uploaded Documents:\*\*\n([\s\S]+)/i);
      const _docCtx = _docMatch ? (_docMatch[1] ?? undefined) : undefined;

      const reasoningResult = await runReasoningPipeline({
        userMessage: _focusedIssue || userInput,
        documentContext: _docCtx,
        caseContext: {
          ...(caseStudy.organizationName ? { Organization: caseStudy.organizationName } : {}),
          ...(caseStudy.country ? { Country: caseStudy.country } : {}),
          ...(caseStudy.currentMatter ? { Matter: caseStudy.currentMatter } : {}),
        },
        brainBlock: context || undefined,
        intelligenceBlock: intelligenceBlock || undefined,
      });

      if (reasoningResult.answer?.trim()) return reasoningResult.answer.trim();
      // All AI providers failed to return content - surface clear error
      return 'I was unable to generate a response right now. Please check that your AI API keys are configured in the `.env` file and try again.';
    } catch (error) {
      console.error('AI processing error:', error);
      return 'I encountered an error processing your request. Please try again in a moment.';
    }
  }, [buildConsultantPrompt, caseStudy, consultantCaseBrief, consultantGateReady, consultantGateMissing, captureAugmentedAIFromPayload]);

  const processWithAIStream = useCallback(async (
    userInput: string,
    context: string,
    onChunk: (text: string) => void
  ): Promise<string> => {
    try {
      // ── Step 1: Try backend (Railway / Render / running Express server) ──────
      const systemPrompt = buildConsultantPrompt(userInput, context);
      try {
        const endpointResponse = await fetch('/api/ai/consultant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: userInput,
            context: { phase: context, caseStudy, consultantCaseBrief, consultantGateReady, consultantGateMissing },
            systemPrompt
          })
        });
        if (endpointResponse.ok) {
          const payload = await endpointResponse.json() as Record<string, unknown>;
          captureAugmentedAIFromPayload(payload);
          const endpointText = String(payload?.text || '').trim();
          if (endpointText) {
            const chunks = endpointText.match(/.{1,120}(?:\s|$)/g) || [endpointText];
            let aggregate = '';
            for (const chunk of chunks) {
              aggregate += chunk;
              onChunk(aggregate.trim());
              await new Promise<void>((resolve) => setTimeout(resolve, 30));
            }
            return endpointText;
          }
        }
      } catch { /* backend unavailable - use reasoning pipeline below */ }

      // ── Steps 2-4: THINK → REASON → SOLVE → ANSWER (ReasoningPipeline) ─────
      //
      //   Step 2 (Thought)   - AI classifies and reasons through the problem
      //   Step 3 (Solution)  - AI determines best response approach
      //   Step 4 (Answer)    - AI streams the grounded final answer
      //
      // Extract document content from the user's message for Step 2 context.
      // Use capture group [1] to get the raw document body - not the header prefix.
      const docContentMatch = userInput.match(/\*\*Uploaded Documents:\*\*\n([\s\S]+)/i)
        || userInput.match(/\[([^\]]+\.pdf[^\]]*?)\]/i);
      const documentContext = docContentMatch ? (docContentMatch[1] ?? docContentMatch[0]) : undefined;

      // Build a clean case context map for the reasoning engine
      const caseContextMap: Record<string, string> = {
        ...(caseStudy.organizationName ? { Organization: caseStudy.organizationName } : {}),
        ...(caseStudy.country ? { Country: caseStudy.country } : {}),
        ...(caseStudy.organizationType ? { Type: caseStudy.organizationType } : {}),
        ...(caseStudy.objectives ? { Objective: caseStudy.objectives } : {}),
        ...(caseStudy.currentMatter ? { Matter: caseStudy.currentMatter } : {}),
        ...(caseStudy.targetAudience ? { Audience: caseStudy.targetAudience } : {}),
        ...(caseStudy.jurisdiction ? { Jurisdiction: caseStudy.jurisdiction } : {}),
      };

      // ── IssueSolutionPipeline - run AI analysis engines in parallel ──────────
      //
      // Runs 5 AI-powered analyses in parallel:
      //  1. AI Issue Classification (category, confidence, reasoning)
      //  2. AI Root Cause Analysis (deep systemic analysis)
      //  3. AI 7-Perspective Situation Analysis
      //  4. AI Web Research (live data, current findings)
      //  5. AI Debate (for/against arguments + synthesis)
      // Plus live World Bank economic data for the target country.
      //
      const docSeparatorIdx = userInput.indexOf('\n\n**Uploaded Documents:**');
      const typedQuery = docSeparatorIdx > -1
        ? userInput.slice(0, docSeparatorIdx).trim()
        : userInput;
      // Build a short issue description from ref analysis if available
      const docRef = latestDocAnalysisRef.current;
      const docIssueSummary = docRef
        ? `Document analysis - ${docRef.title} (${docRef.country}, ${docRef.sector}).` +
          ` Key issues: ${docRef.keyIssues.slice(0, 3).join('; ')}.`
        : documentContext?.slice(0, 500) ?? '';
      const issueForPipeline = typedQuery
        ? `${typedQuery}${docIssueSummary ? ` Context: ${docIssueSummary}` : ''}`
        : (docIssueSummary || userInput.slice(0, 500));

      const intelligenceBlock = await runIssuePipeline({
        issue: issueForPipeline,
        country: caseStudy.country || docRef?.country || undefined,
        organizationName: caseStudy.organizationName || undefined,
        organizationType: caseStudy.organizationType || docRef?.sector || undefined,
        objectives: caseStudy.objectives || undefined,
        currentMatter: caseStudy.currentMatter || docRef?.title || undefined,
        constraints: caseStudy.constraints || undefined,
        sector: caseStudy.organizationType || docRef?.sector || undefined,
        uploadedDocuments: [],
      }).catch(() => undefined);

      // Build conversation history using the ConversationMemoryManager.
      // This provides a rolling summary of older turns + recent verbatim turns
      // instead of the old .slice(-8) with 400-char limits (~3200 chars total).
      let conversationHistory = messages
        .filter(m => (m.role === 'user' || m.role === 'assistant') && m.content?.trim())
        .slice(-8)
        .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content.slice(0, 400) }));

      // Enhance brainBlock with memory manager context (rolling summary + cross-session learnings)
      let enhancedContext = context || '';
      try {
        const memoryContext = await conversationMemoryManager.formatForPrompt();
        if (memoryContext) {
          enhancedContext = (enhancedContext ? enhancedContext + '\n\n' : '') + memoryContext;
        }
      } catch { /* memory enhancement is optional */ }

      // Inject live web search results if the query seems to need current data
      const needsSearch = /\b(latest|current|recent|today|2024|2025|news|what is happening|update)\b/i.test(typedQuery || userInput);
      if (needsSearch) {
        try {
          const searchResults = await webSearch(typedQuery || userInput, { maxResults: 4 });
          if (searchResults.length > 0) {
            const searchBlock = formatResultsForPrompt(searchResults, 2000);
            enhancedContext = (enhancedContext ? enhancedContext + '\n\n' : '') + searchBlock;
          }
        } catch { /* web search is optional */ }
      }

      const result = await runReasoningPipelineStream(
        {
          userMessage: typedQuery || userInput,
          documentContext,
          caseContext: Object.keys(caseContextMap).length ? caseContextMap : undefined,
          brainBlock: enhancedContext || undefined,
          intelligenceBlock: intelligenceBlock || undefined,
          conversationHistory: conversationHistory.length ? conversationHistory : undefined,
        },
        (streamedAnswer) => onChunk(streamedAnswer)
      );

      if (result.answer?.trim()) return result.answer.trim();

      // ── Last resort: all streaming providers failed - return clear error ──────
      const errorMsg = 'I was unable to generate a response. Please verify your API keys (OpenAI, Together.ai, or Groq) are configured in the `.env` file and restart the dev server.';
      onChunk(errorMsg);
      return errorMsg;

    } catch (error) {
      console.warn('[processWithAIStream] Pipeline failed:', error);
      const fallbackText = await processWithAI(userInput, context);
      onChunk(fallbackText);
      return fallbackText;
    }
  }, [buildConsultantPrompt, processWithAI, caseStudy, consultantCaseBrief, consultantGateReady, consultantGateMissing, captureAugmentedAIFromPayload, messages]);

  const getHighestValueFollowUp = useCallback((draft: CaseStudy) => {
    if (!draft.organizationName.trim()) return 'Which organization is the decision owner for this matter?';
    if (!draft.country.trim() || !draft.jurisdiction.trim()) return 'Which country and legal jurisdiction should this analysis follow?';
    if (draft.objectives.trim().length < 20) return 'What exact outcome do you need, and how will success be measured?';
    if (draft.currentMatter.trim().length < 60) return 'What exactly is happening now, who is involved, and what decision must be made next?';
    if (draft.targetAudience.trim().length < 3) return 'Who is the primary decision audience (board, ministry, regulator, investor, or partner)?';
    if (draft.decisionDeadline.trim().length < 3) return 'What is the decision deadline and what happens if it slips?';
    return null;
  }, []);

  useEffect(() => {
    const draftInput = inputValue.trim();
    if (!draftInput || isLoading) {
      setReactiveDraftStatus('');
      setReactiveDraftHint('');
      return;
    }

    setReactiveDraftStatus('Reactive analysis: scanning your draft...');
    const timeout = window.setTimeout(() => {
      const extracted = extractConsultantSignals(draftInput);
      const draft: CaseStudy = {
        ...caseStudy,
        userName: extracted.userName && !caseStudy.userName.trim() ? extracted.userName : caseStudy.userName,
        organizationName: extracted.organizationName && !caseStudy.organizationName.trim() ? extracted.organizationName : caseStudy.organizationName,
        organizationType: extracted.organizationType && !caseStudy.organizationType.trim() ? extracted.organizationType : caseStudy.organizationType,
        contactRole: extracted.contactRole && !caseStudy.contactRole.trim() ? extracted.contactRole : caseStudy.contactRole,
        country: extracted.country && !caseStudy.country.trim() ? extracted.country : caseStudy.country,
        jurisdiction: extracted.jurisdiction && !caseStudy.jurisdiction.trim() ? extracted.jurisdiction : caseStudy.jurisdiction,
        objectives: extracted.objectives && caseStudy.objectives.trim().length < 20 ? extracted.objectives : caseStudy.objectives,
        currentMatter: extracted.currentMatter && caseStudy.currentMatter.trim().length < 60 ? extracted.currentMatter : caseStudy.currentMatter,
        constraints: extracted.constraints && caseStudy.constraints.trim().length < 20 ? extracted.constraints : caseStudy.constraints,
        targetAudience: extracted.targetAudience && !caseStudy.targetAudience.trim() ? extracted.targetAudience : caseStudy.targetAudience,
        decisionDeadline: extracted.decisionDeadline && !caseStudy.decisionDeadline.trim() ? extracted.decisionDeadline : caseStudy.decisionDeadline,
      };

      const detectedSignals: string[] = [];
      if (extracted.organizationName) detectedSignals.push(`Org detected: ${extracted.organizationName}`);
      if (extracted.country || extracted.jurisdiction) detectedSignals.push('Jurisdiction signal detected');
      if (extracted.objectives) detectedSignals.push('Objective signal detected');
      if (extracted.targetAudience) detectedSignals.push(`Audience: ${extracted.targetAudience}`);

      const nextFollowUp = getHighestValueFollowUp(draft);
      const status = detectedSignals.length > 0
        ? `Reactive analysis ready (${detectedSignals.length} signal${detectedSignals.length === 1 ? '' : 's'})`
        : 'Reactive analysis ready';
      const hint = nextFollowUp
        ? `${detectedSignals.slice(0, 2).join(' • ')}${detectedSignals.length > 0 ? ' • ' : ''}Likely next question: ${nextFollowUp}`
        : detectedSignals.slice(0, 2).join(' • ');

      setReactiveDraftStatus(status);
      setReactiveDraftHint(hint || 'Keep typing - the consultant will continue building your case context in the background.');
    }, 450);

    return () => window.clearTimeout(timeout);
  }, [inputValue, isLoading, caseStudy, extractConsultantSignals, getHighestValueFollowUp]);

  // Generate document recommendations based on case
  const generateRecommendations = useCallback(() => {
    const docs: DocumentOption[] = [];
    const caseType = caseStudy.situationType.toLowerCase();
    const audience = caseStudy.targetAudience.toLowerCase();
    const policyPack = resolvePolicyPack(caseStudy);
    const hasRegulatoryAudience = /regulator|ministry|government|court|compliance/.test(audience);
    const hasInvestorAudience = /investor|board|fund|vc|capital/.test(audience);
    
    // Investment/funding situations
    if (caseType.includes('invest') || caseType.includes('fund')) {
      docs.push(
        {
          id: 'investment-memo',
          title: 'Investment Memorandum',
          description: 'Structured funding proposal for decision makers',
          icon: <BarChart3 size={18} />,
          category: 'report',
          relevance: 95,
          rationale: 'Best fit for capital allocation decisions and investor due diligence.',
          pageRange: '12-25 pages',
          supportingDocuments: ['Financial model', 'Market assumptions', 'Risk register'],
          contactLetterFor: 'Investor committee'
        },
        {
          id: 'due-diligence',
          title: 'Due Diligence Report',
          description: 'Comprehensive risk, compliance, and viability analysis',
          icon: <Shield size={18} />,
          category: 'report',
          relevance: 90,
          rationale: 'Required to validate claims, risks, and assumptions before commitment.',
          pageRange: '15-30 pages',
          supportingDocuments: ['Corporate filings', 'Ownership records', 'Contracts'],
          contactLetterFor: 'External reviewer'
        },
        {
          id: 'investor-update',
          title: 'Investor Update Letter',
          description: 'Formal communication for investor/stakeholder updates',
          icon: <FileText size={18} />,
          category: 'letter',
          relevance: 70,
          rationale: 'Keeps decision stakeholders aligned with current case status and asks.',
          pageRange: '1-2 pages',
          supportingDocuments: ['Executive summary'],
          contactLetterFor: 'Investors and board'
        }
      );
    }
    
    // Partnership situations
    if (caseType.includes('partner') || caseType.includes('joint') || caseType.includes('jv')) {
      docs.push(
        {
          id: 'partnership-letter',
          title: 'Partnership Proposal Letter',
          description: 'Formal outreach letter for counterpart engagement',
          icon: <Mail size={18} />,
          category: 'letter',
          relevance: 95,
          rationale: 'Creates structured first contact with clear terms and value proposition.',
          pageRange: '1-3 pages',
          supportingDocuments: ['One-page project brief', 'Counterparty profile'],
          contactLetterFor: 'Target partner leadership'
        },
        {
          id: 'stakeholder-report',
          title: 'Stakeholder Analysis Report',
          description: 'Relationship map, influence matrix, and alignment plan',
          icon: <Users size={18} />,
          category: 'report',
          relevance: 85,
          rationale: 'Reduces partnership execution risk by clarifying influence and incentives.',
          pageRange: '8-14 pages',
          supportingDocuments: ['Stakeholder list', 'Engagement history'],
          contactLetterFor: 'Stakeholder outreach'
        },
        {
          id: 'due-diligence',
          title: 'Partner Due Diligence',
          description: 'Counterparty vetting and risk profile',
          icon: <Shield size={18} />,
          category: 'report',
          relevance: 80,
          rationale: 'Validates partner credibility, track record, and legal exposure.',
          pageRange: '10-20 pages',
          supportingDocuments: ['Legal records', 'Financial statements'],
          contactLetterFor: 'Compliance / legal counterpart'
        }
      );
    }
    
    // Market entry
    if (caseType.includes('market') || caseType.includes('entry') || caseType.includes('expan')) {
      docs.push(
        {
          id: 'country-brief',
          title: 'Market Intelligence Brief',
          description: 'Country/region analysis for entry decisions',
          icon: <Globe size={18} />,
          category: 'report',
          relevance: 95,
          rationale: 'Assesses jurisdiction, market dynamics, and entry barriers by location.',
          pageRange: '10-18 pages',
          supportingDocuments: ['Regulatory profile', 'Competitor map', 'Demand indicators'],
          contactLetterFor: 'Trade/investment authority'
        },
        {
          id: 'executive-report',
          title: 'Executive Summary',
          description: 'Decision-ready summary for leadership',
          icon: <Briefcase size={18} />,
          category: 'report',
          relevance: 85,
          rationale: 'Provides concise direction for go/no-go or phase-gate decisions.',
          pageRange: '3-6 pages',
          supportingDocuments: ['Core case facts', 'Risk summary'],
          contactLetterFor: 'Board or executive team'
        }
      );
    }
    
    // Regulatory/compliance
    if (caseType.includes('regul') || caseType.includes('compli') || caseType.includes('legal')) {
      docs.push(
        {
          id: 'compliance-report',
          title: 'Compliance Assessment',
          description: 'Regulatory obligations, gaps, and mitigation plan',
          icon: <Scale size={18} />,
          category: 'report',
          relevance: 95,
          rationale: 'Essential when regulatory exposure influences approval or viability.',
          pageRange: '12-24 pages',
          supportingDocuments: ['Applicable laws', 'Licensing checklist', 'Control matrix'],
          contactLetterFor: 'Regulator / legal counsel'
        },
        {
          id: 'govt-submission',
          title: 'Government Submission Letter',
          description: 'Official submission letter for agencies and regulators',
          icon: <FileCheck size={18} />,
          category: 'letter',
          relevance: 90,
          rationale: 'Required formal communication to initiate or support official review.',
          pageRange: '1-3 pages',
          supportingDocuments: ['Compliance report', 'Annexures'],
          contactLetterFor: 'Agency focal point'
        }
      );
    }

    if (hasRegulatoryAudience && !docs.find(d => d.id === 'govt-submission')) {
      docs.push({
        id: 'govt-submission',
        title: 'Government Submission Letter',
        description: 'Formal agency/regulator communication',
        icon: <FileCheck size={18} />,
        category: 'letter',
        relevance: 86,
        rationale: 'Audience includes regulator/ministry, so formal submission letter is advised.',
        pageRange: '1-2 pages',
        supportingDocuments: ['Executive summary', 'Compliance annex'],
        contactLetterFor: 'Regulatory authority'
      });
    }

    if (hasInvestorAudience && !docs.find(d => d.id === 'investment-memo')) {
      docs.push({
        id: 'investment-memo',
        title: 'Investment Memorandum',
        description: 'Investor decision package',
        icon: <BarChart3 size={18} />,
        category: 'report',
        relevance: 88,
        rationale: 'Audience includes investment decision makers requiring structured rationale.',
        pageRange: '10-20 pages',
        supportingDocuments: ['Financial model', 'Risk appendix'],
        contactLetterFor: 'Investment committee'
      });
    }
    
    // Always offer executive summary and custom
    if (!docs.find(d => d.id === 'executive-report')) {
      docs.push({
        id: 'executive-report',
        title: 'Executive Summary',
        description: 'Leadership overview',
        icon: <Briefcase size={18} />,
        category: 'report',
        relevance: 60,
        rationale: 'Universal output to summarize findings and recommended action.',
        pageRange: '2-5 pages',
        supportingDocuments: ['Key findings', 'Decision options']
      });
    }
    if (!docs.find(d => d.id === 'case-study-report')) {
      docs.push({
        id: 'case-study-report',
        title: 'Full Case Study Report',
        description: 'End-to-end case study document with evidence, evaluation, and action steps',
        icon: <FileText size={18} />,
        category: 'report',
        relevance: 82,
        rationale: 'Best fit when the user needs a complete narrative from context to recommendations.',
        pageRange: '15-30 pages',
        supportingDocuments: ['Executive summary', 'Evidence appendix', 'Risk and action plan']
      });
    }
    docs.push({
      id: 'custom',
      title: 'Custom Document',
      description: 'Specify your needs',
      icon: <PenTool size={18} />,
      category: 'report',
      relevance: 50,
      rationale: 'Use when specialized format or policy template is required.',
      pageRange: '1-40 pages (user defined)',
      supportingDocuments: ['User-provided outline']
    });
    
    // Policy-pack required outputs (documents)
    policyPack.requiredSupportDocuments.forEach((requiredDoc, index) => {
      if (!docs.find(d => d.title.toLowerCase() === requiredDoc.toLowerCase())) {
        docs.push({
          id: `policy-doc-${index}`,
          title: requiredDoc,
          description: `${policyPack.label} required support document`,
          icon: <FileText size={18} />,
          category: 'report',
          relevance: 84 - index,
          rationale: `Required by ${policyPack.label} for jurisdictional completeness.`,
          pageRange: '2-8 pages',
          supportingDocuments: ['Jurisdiction notes', 'Case facts'],
          contactLetterFor: 'Review authority'
        });
      }
    });

    // Policy-pack required outputs (letters)
    policyPack.requiredLetters.forEach((requiredLetter, index) => {
      if (!docs.find(d => d.title.toLowerCase() === requiredLetter.toLowerCase())) {
        docs.push({
          id: `policy-letter-${index}`,
          title: requiredLetter,
          description: `${policyPack.label} required letter`,
          icon: <Mail size={18} />,
          category: 'letter',
          relevance: 82 - index,
          rationale: `Required by ${policyPack.label} to support formal communication.`,
          pageRange: '1-2 pages',
          supportingDocuments: policyPack.requiredSupportDocuments,
          contactLetterFor: requiredLetter.replace(/letter/i, '').trim() || 'Primary counterpart'
        });
      }
    });

    const graph = CaseGraphBuilder.build(caseStudy);
    setCaseGraph(graph);

    const scored = RecommendationScorer.rank({
      candidates: docs.map((doc) => ({
        id: doc.id,
        title: doc.title,
        category: doc.category,
        relevance: doc.relevance,
        rationale: doc.rationale,
        supportingDocuments: doc.supportingDocuments
      })),
      graph,
      context: {
        targetAudience: caseStudy.targetAudience,
        jurisdiction: `${caseStudy.country} ${caseStudy.jurisdiction}`,
        decisionDeadline: caseStudy.decisionDeadline,
        situationType: caseStudy.situationType,
        constraints: caseStudy.constraints
      }
    });

    const scoreMap = new Map(scored.map((item) => [item.id, item]));
    const enrichedDocs = docs
      .map((doc) => {
        const score = scoreMap.get(doc.id);
        const learnedBoost = recommendationBoostMap[doc.id] ?? 0;
        if (!score) return doc;
        return {
          ...doc,
          relevance: Math.max(0, Math.min(100, Math.round(score.total + learnedBoost))),
          rationale: `${doc.rationale} ${score.rationale}`
        };
      })
      .sort((a, b) => b.relevance - a.relevance);

    const preferenceBoost = (doc: DocumentOption): number => {
      const title = doc.title.toLowerCase();
      if (preferredOutputMode === 'auto') return 0;
      if (preferredOutputMode === 'letter') return doc.category === 'letter' ? 25 : 0;
      if (preferredOutputMode === 'document') return doc.category === 'report' ? 20 : 0;
      if (preferredOutputMode === 'case-study') {
        return /case study|executive summary|assessment|memorandum/.test(title) ? 24 : (doc.category === 'report' ? 8 : 0);
      }
      if (preferredOutputMode === 'full-pack') {
        return doc.category === 'letter' ? 10 : 12;
      }
      return 0;
    };

    const preferenceAwareDocs = enrichedDocs
      .map((doc) => ({
        ...doc,
        relevance: Math.max(0, Math.min(100, doc.relevance + preferenceBoost(doc)))
      }))
      .sort((a, b) => b.relevance - a.relevance);

    // ─── Inject FULL 247-doc + 156-letter catalog from DocumentTypeRouter ────
    // Brain-recommended IDs rise to the top; the rest become 'available'
    const catalogEntries = IntelligentDocumentGenerator.recommendForCase({
      country: caseStudy.country || '',
      sector: caseStudy.organizationType || caseStudy.situationType || '',
      organizationName: caseStudy.organizationName || '',
      organizationType: caseStudy.targetAudience || '',
      strategicIntent: [caseStudy.situationType, caseStudy.currentMatter].filter(Boolean),
      readiness: readinessScore,
      brainContext: brainCtxRef.current,
      question: caseStudy.currentMatter || caseStudy.situationType,
    });

    const existingIds = new Set(preferenceAwareDocs.map(d => d.id));

    const catalogMapped: DocumentOption[] = catalogEntries
      .filter(e => !existingIds.has(e.id))
      .map(e => ({
        id: e.id,
        title: e.name,
        description: e.description,
        icon: e.type === 'letter' ? <Mail size={18} /> : <FileText size={18} />,
        category: e.type === 'letter' ? 'letter' : 'report',
        relevance: e.recommended ? Math.min(95, 45 + (e.relevanceScore ?? 60)) : Math.min(50, (e.relevanceScore ?? 40)),
        rationale: e.rationale || `Available from the ${e.category} catalog`,
        pageRange: e.estimatedWords ? `~${Math.round(e.estimatedWords / 250)} pages` : '2-15 pages',
        supportingDocuments: [],
        contactLetterFor: e.type === 'letter' ? (e.audience || 'Primary counterpart') : undefined,
      }));

    // Brain-boosted entries float above non-recommended existing items
    const fullList = [...preferenceAwareDocs, ...catalogMapped]
      .sort((a, b) => b.relevance - a.relevance);

    setRecommendationRationaleMap(
      scored.reduce<Record<string, string>>((acc, item) => {
        acc[item.id] = item.rationale;
        return acc;
      }, {})
    );

    setRecommendationScoreMap(
      scored.reduce<Record<string, RecommendationScore>>((acc, item) => {
        acc[item.id] = item;
        return acc;
      }, {})
    );

    setRecommendedDocs(fullList);
  }, [caseStudy, resolvePolicyPack, recommendationBoostMap, preferredOutputMode, readinessScore]);

  useEffect(() => {
    if (isCaseStudyComplete && recommendedDocs.length > 0) {
      generateRecommendations();
    }
  }, [recommendationBoostMap, recommendedDocs.length, generateRecommendations, isCaseStudyComplete]);

  // Handle send message
  const handleSend = useCallback(async () => {
    if (!inputValue.trim() && uploadedFiles.length === 0) return;

    // ── Security gate: validate input before AI pipeline ────────────────────
    const securityCheck = securityService.validateInput(inputValue, 'chat');
    if (securityCheck.blocked) {
      const threatNames = securityCheck.threats.map(t => t.description).join(', ');
      setMessages(prev => [
        ...prev,
        {
          id: `sec-${Date.now()}`,
          role: 'assistant' as const,
          content: `**Security Notice:** Your message was blocked for safety reasons (${threatNames}). Please rephrase your question.`,
          timestamp: new Date(),
        },
      ]);
      return;
    }

    let userContent = securityCheck.sanitizedInput || inputValue.trim();
    const inputSignal = classifyConsultantInput(userContent);
    const extractedSignals = extractConsultantSignals(userContent);

    // ── Sector inference from raw input text ───────────────────────────────
    const _sectorKeywords: Record<string, string[]> = {
      'Manufacturing & Industry': ['manufactur', 'factory', 'plant', 'assembly', 'production', 'automotive', 'car', 'vehicle', 'steel', 'cement', 'industrial'],
      'Agriculture & Food Security': ['farm', 'agri', 'food', 'crop', 'livestock', 'fisheri', 'aquaculture'],
      'Energy Transition': ['solar', 'wind', 'renewable', 'clean energy', 'battery', 'hydrogen', 'geothermal'],
      'Digital Infrastructure': ['tech', 'software', 'data centre', 'fintech', 'saas', 'cloud', 'digital', 'ai platform'],
      'Health Systems': ['hospital', 'pharma', 'medical', 'clinic', 'healthcare', 'health system'],
      'Mining & Natural Resources': ['mining', 'mineral', 'ore', 'coal', 'gas', 'petroleum', 'lithium', 'copper'],
      'Logistics & Trade': ['logistics', 'freight', 'shipping', 'port', 'supply chain', 'warehouse', 'corridor'],
      'Tourism & Hospitality': ['tourism', 'hotel', 'resort', 'hospitality', 'travel'],
      'Water Security': ['water', 'desalin', 'irrigation', 'sewage', 'sanitation'],
      'Housing & Construction': ['housing', 'real estate', 'construction', 'property', 'affordable housing'],
      'Financial Services': ['bank', 'finance', 'investment fund', 'insurance', 'capital market'],
      'Defence & Security': ['defence', 'defense', 'military', 'security'],
    };
    const _lcInput = userContent.toLowerCase();
    let inferredSector = '';
    let _bestMatch = 0;
    for (const [sector, kws] of Object.entries(_sectorKeywords)) {
      const hits = kws.filter(k => _lcInput.includes(k)).length;
      if (hits > _bestMatch) { _bestMatch = hits; inferredSector = sector; }
    }

    // ── Country inference augmented with regions ──────────────────────────
    const _countryMap: Record<string, string[]> = {
      'Philippines': ['philippines', 'philippine', 'manila', 'cebu', 'mindanao'],
      'Vietnam': ['vietnam', 'viet nam', 'hanoi', 'ho chi minh'],
      'Indonesia': ['indonesia', 'jakarta', 'bali'],
      'Thailand': ['thailand', 'bangkok', 'thai'],
      'Malaysia': ['malaysia', 'kuala lumpur'],
      'Singapore': ['singapore'],
      'India': ['india', 'mumbai', 'delhi', 'bangalore'],
      'China': ['china', 'beijing', 'shanghai', 'shenzhen'],
      'Japan': ['japan', 'tokyo', 'osaka'],
      'South Korea': ['south korea', 'korea', 'seoul'],
      'Australia': ['australia', 'sydney', 'melbourne', 'brisbane', 'perth'],
      'Bangladesh': ['bangladesh', 'dhaka'],
      'Cambodia': ['cambodia', 'phnom penh'],
      'Myanmar': ['myanmar', 'yangon'],
      'Saudi Arabia': ['saudi', 'riyadh'],
      'UAE': ['uae', 'dubai', 'abu dhabi', 'emirates'],
      'Kenya': ['kenya', 'nairobi'],
      'Nigeria': ['nigeria', 'lagos'],
      'South Africa': ['south africa', 'johannesburg', 'cape town'],
      'Brazil': ['brazil', 'sao paulo'],
      'Mexico': ['mexico city', 'mexico'],
      'USA': ['united states', 'america', '\busa\b'],
      'UK': ['united kingdom', 'britain', 'london', '\buk\b'],
      'Germany': ['germany', 'berlin', 'munich'],
    };
    let inferredCountry = '';
    for (const [c, kws] of Object.entries(_countryMap)) {
      if (kws.some(k => _lcInput.includes(k))) { inferredCountry = c; break; }
    }
    // Use region as country fallback
    const _regionHints: Record<string, string> = {
      'southeast asia': 'Southeast Asia', 'asean': 'Southeast Asia', 'asia': 'Asia',
      'africa': 'Africa', 'middle east': 'Middle East', 'pacific': 'Pacific',
      'latin america': 'Latin America', 'europe': 'Europe',
    };
    if (!inferredCountry) {
      for (const [k, v] of Object.entries(_regionHints)) {
        if (_lcInput.includes(k)) { inferredCountry = v; break; }
      }
    }

    // ── Re-run signal extraction on COMBINED content (including uploaded doc text) ──
    // The original extractConsultantSignals only ran on typed text. Now capture
    // country, objectives, org names, etc. from the full message including docs.
    if (uploadedFiles.length > 0 && userContent.length > inputValue.trim().length + 100) {
      const docSignals = extractConsultantSignals(userContent);
      if (docSignals.country && !extractedSignals.country) extractedSignals.country = docSignals.country;
      if (docSignals.organizationName && !extractedSignals.organizationName) extractedSignals.organizationName = docSignals.organizationName;
      if (docSignals.objectives && !extractedSignals.objectives) extractedSignals.objectives = docSignals.objectives;
      if (docSignals.currentMatter && !extractedSignals.currentMatter) extractedSignals.currentMatter = docSignals.currentMatter;
      if (docSignals.jurisdiction && !extractedSignals.jurisdiction) extractedSignals.jurisdiction = docSignals.jurisdiction;
      if (docSignals.targetAudience && !extractedSignals.targetAudience) extractedSignals.targetAudience = docSignals.targetAudience;
    }

    // Capture before files are cleared - used to defer showing ReportOptionsPanel until after AI responds
    const hadFileUpload = uploadedFiles.length > 0;
    const discoveredDocs: DocumentOption[] = [];

    // Process uploaded files
    if (uploadedFiles.length > 0) {
      const fileContents = await Promise.all(uploadedFiles.map(readFileContent));
      userContent += `\n\n**Uploaded Documents:**\n${fileContents.join('\n\n')}`;

      for (let index = 0; index < uploadedFiles.length; index += 1) {
        const file = uploadedFiles[index];
        const fileContent = fileContents[index] || '';
        // Skip only if too short - PDFs are now included if text was successfully extracted via AI
        if (fileContent.length < 400) {
          continue;
        }

        try {
          const analysis = CaseStudyAnalyzer.analyze(file.name, fileContent);
          const summary = CaseStudyAnalyzer.toConsultantSummary(analysis);

          // ── Store analysis in ref synchronously so buildNaturalFallbackReply
          //    can read it immediately - React setCaseStudy is async and won't
          //    be visible in the same render cycle ──────────────────────────────
          const keyIssues: string[] = [
            ...analysis.weaknesses.slice(0, 5).map(w => `${w.category}: ${w.description}`),
            ...analysis.historicalParallels.slice(0, 2).map(h => `Historical parallel - ${h.name} (${h.country}): ${h.lesson}`),
          ];
          latestDocAnalysisRef.current = {
            title: analysis.title,
            country: analysis.country,
            sector: analysis.sector,
            summary,
            keyIssues,
            stakeholders: analysis.stakeholders,
            historicalParallels: analysis.historicalParallels.map(h => `${h.name} (${h.country}, ${h.outcome})`),
            scores: {
              governance: analysis.scores.governanceQuality,
              stakeholderAlignment: analysis.scores.stakeholderAlignment,
              implementationReadiness: analysis.scores.implementationReadiness,
              overallViability: analysis.scores.overallViability,
            },
          };

          setCaseStudy(prev => {
            const next = {
              ...prev,
              aiInsights: [...prev.aiInsights, summary],
              additionalContext: [...prev.additionalContext, `Uploaded analysis: ${analysis.title}`]
            };
            // ── Wire CaseStudyAnalyzer results into main case fields ──
            if (analysis.country && !next.country.trim()) next.country = analysis.country;
            if (analysis.sector && !next.organizationType.trim()) next.organizationType = analysis.sector;
            if (analysis.title && next.currentMatter.trim().length < 60) next.currentMatter = analysis.title;
            if (analysis.stakeholders?.length && !next.targetAudience.trim()) next.targetAudience = analysis.stakeholders.slice(0, 3).join(', ');
            if (analysis.timeframe && !next.decisionDeadline.trim()) next.decisionDeadline = analysis.timeframe;
            return next;
          });

          analysis.suggestedDocuments.slice(0, 3).forEach((docName, suggestionIndex) => {
            discoveredDocs.push({
              id: `case-doc-${index}-${suggestionIndex}`,
              title: docName,
              description: `Suggested from uploaded case study (${analysis.country} / ${analysis.sector})`,
              icon: <FileText size={18} />,
              category: 'report',
              relevance: Math.max(65, analysis.scores.overallViability - suggestionIndex * 5),
              rationale: 'Derived from uploaded case-study analysis and NSIL-style scoring diagnostics.',
              pageRange: '8-20 pages',
              supportingDocuments: ['Uploaded case evidence', 'Historical parallels'],
              contactLetterFor: analysis.stakeholders[0]
            });
          });

          analysis.suggestedLetters.slice(0, 2).forEach((letterName, suggestionIndex) => {
            discoveredDocs.push({
              id: `case-letter-${index}-${suggestionIndex}`,
              title: letterName,
              description: `Stakeholder letter generated from case analysis`,
              icon: <Mail size={18} />,
              category: 'letter',
              relevance: 72 - suggestionIndex * 4,
              rationale: 'Recommended to support contact and alignment with key counterparties.',
              pageRange: '1-2 pages',
              supportingDocuments: ['Executive summary', 'Case-specific annexures'],
              contactLetterFor: analysis.stakeholders[suggestionIndex] || 'Primary stakeholder'
            });
          });
        } catch (analysisError) {
          console.warn('CaseStudyAnalyzer skipped file:', file.name, analysisError);
        }
      }

      setCaseStudy(prev => ({
        ...prev,
        uploadedDocuments: [...prev.uploadedDocuments, ...uploadedFiles.map(f => f.name)]
      }));

      if (discoveredDocs.length > 0) {
        setRecommendedDocs(prev => {
          const existing = new Set(prev.map(item => item.title.toLowerCase()));
          const merged = [...prev];
          discoveredDocs.forEach(item => {
            if (!existing.has(item.title.toLowerCase())) {
              merged.push(item);
            }
          });
          return merged.sort((a, b) => b.relevance - a.relevance);
        });
      }

      // ── Report Options Menu - computed from uploaded document richness ──────
      const combinedUploadText = fileContents.join('\n\n');
      const uploadWordCount = ReportLengthRouter.estimateWordCount(combinedUploadText);
      const textLower = combinedUploadText.toLowerCase();
      const uploadMenu = ReportLengthRouter.computeOptions({
        sourceWordCount: uploadWordCount,
        caseReadiness: 0,
        enginesActivated: brainCtxRef.current ? 12 : 3,
        jurisdiction: caseStudy.country || 'Unknown',
        sector: caseStudy.organizationType || 'Government / Policy',
        hasConflict: textLower.includes('conflict') || textLower.includes('insurgency') || textLower.includes('rebel'),
        hasMultipleRegions: textLower.includes('regions') || textLower.includes('provincial') || textLower.includes('municipalities'),
        hasMultistakeholder: textLower.includes('stakeholder') || textLower.includes('donor') || textLower.includes('multilateral'),
      });
      setUploadedFileContentsRef(fileContents);
      setReportOptionsDocTitle(uploadedFiles[0]?.name.replace(/\.[^/.]+$/, '') ?? 'Uploaded Document');
      setReportOptionsDocType('Uploaded Document');
      setReportOptionsMenu(uploadMenu);
      // showReportOptions is deferred - shown AFTER the AI has responded with its document analysis
    }

    const userMessagePhase = readinessScore < 55 ? 'discovery' : readinessScore < 80 ? 'analysis' : 'recommendations';

    // Apply extracted + inferred signals to case state
    setCaseStudy(prev => {
      const next = { ...prev };
      if (extractedSignals.userName && !next.userName.trim()) next.userName = extractedSignals.userName;
      if (extractedSignals.organizationName && !next.organizationName.trim()) next.organizationName = extractedSignals.organizationName;
      // organizationType: prefer inferred sector over entity-type label
      if (inferredSector && !next.organizationType.trim()) next.organizationType = inferredSector;
      else if (extractedSignals.organizationType && !next.organizationType.trim()) next.organizationType = extractedSignals.organizationType;
      if (extractedSignals.contactRole && !next.contactRole.trim()) next.contactRole = extractedSignals.contactRole;
      // country: prefer regex extract, fall back to NLP infer
      const bestCountry = extractedSignals.country || inferredCountry;
      if (bestCountry && !next.country.trim()) next.country = bestCountry;
      if (extractedSignals.jurisdiction && !next.jurisdiction.trim()) next.jurisdiction = extractedSignals.jurisdiction;
      if (extractedSignals.targetAudience && !next.targetAudience.trim()) next.targetAudience = extractedSignals.targetAudience;
      if (extractedSignals.decisionDeadline && !next.decisionDeadline.trim()) next.decisionDeadline = extractedSignals.decisionDeadline;
      if (extractedSignals.objectives && next.objectives.trim().length < 20) next.objectives = extractedSignals.objectives;
      if (extractedSignals.currentMatter && next.currentMatter.trim().length < 60) next.currentMatter = extractedSignals.currentMatter;
      if (extractedSignals.constraints && next.constraints.trim().length < 20) next.constraints = extractedSignals.constraints;
      if (extractedSignals.evidenceNote && !next.additionalContext.some((entry) => entry === `Evidence Note: ${extractedSignals.evidenceNote}`)) {
        next.additionalContext = [...next.additionalContext, `Evidence Note: ${extractedSignals.evidenceNote}`];
      }
      return next;
    });

    // Add user message
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: userContent,
      timestamp: new Date(),
      phase: userMessagePhase
    };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setUploadedFiles([]);

    setIsLoading(true);
    initializeExecutionTimeline();
    setExecutionTaskStatus('ingestion', 'running', 'Parsing user input and updating case draft');

    try {
      setCaseStudy(prev => ({
        ...prev,
        additionalContext: [...prev.additionalContext, userContent]
      }));

      // caseDraft: merge stale React state with THIS turn's extracted+inferred signals
      // (React state won't have updated yet - we build a local merged copy for the AI call)
      const caseDraft: CaseStudy = {
        ...caseStudy,
        userName: extractedSignals.userName && !caseStudy.userName.trim() ? extractedSignals.userName : caseStudy.userName,
        organizationName: extractedSignals.organizationName && !caseStudy.organizationName.trim() ? extractedSignals.organizationName : caseStudy.organizationName,
        organizationType: (
          inferredSector && !caseStudy.organizationType.trim()
            ? inferredSector
            : extractedSignals.organizationType && !caseStudy.organizationType.trim()
              ? extractedSignals.organizationType
              : caseStudy.organizationType
        ),
        contactRole: extractedSignals.contactRole && !caseStudy.contactRole.trim() ? extractedSignals.contactRole : caseStudy.contactRole,
        country: (
          extractedSignals.country && !caseStudy.country.trim()
            ? extractedSignals.country
            : inferredCountry && !caseStudy.country.trim()
              ? inferredCountry
              : caseStudy.country
        ),
        jurisdiction: extractedSignals.jurisdiction && !caseStudy.jurisdiction.trim() ? extractedSignals.jurisdiction : caseStudy.jurisdiction,
        objectives: extractedSignals.objectives && caseStudy.objectives.trim().length < 20 ? extractedSignals.objectives : caseStudy.objectives,
        currentMatter: extractedSignals.currentMatter && caseStudy.currentMatter.trim().length < 60 ? extractedSignals.currentMatter : caseStudy.currentMatter,
        constraints: extractedSignals.constraints && caseStudy.constraints.trim().length < 20 ? extractedSignals.constraints : caseStudy.constraints,
        targetAudience: extractedSignals.targetAudience && !caseStudy.targetAudience.trim() ? extractedSignals.targetAudience : caseStudy.targetAudience,
        decisionDeadline: extractedSignals.decisionDeadline && !caseStudy.decisionDeadline.trim() ? extractedSignals.decisionDeadline : caseStudy.decisionDeadline,
        additionalContext: [...caseStudy.additionalContext, userContent]
      };

      const liveReadiness = computeReadiness(caseDraft);
      const inferredPhase: CasePhase = liveReadiness < 55 ? 'discovery' : liveReadiness < 80 ? 'analysis' : 'recommendations';
      setCurrentPhase(inferredPhase);
      const extractedFieldCount = [
        extractedSignals.userName, extractedSignals.organizationName, extractedSignals.organizationType,
        extractedSignals.contactRole, extractedSignals.country, extractedSignals.jurisdiction,
        extractedSignals.objectives, extractedSignals.currentMatter, extractedSignals.constraints,
        extractedSignals.targetAudience, extractedSignals.decisionDeadline
      ].filter(v => v && String(v).trim().length > 0).length;
      const ingestionDetail = extractedFieldCount > 0
        ? `${extractedFieldCount} field${extractedFieldCount !== 1 ? 's' : ''} extracted - readiness ${liveReadiness}% (${inferredPhase})`
        : liveReadiness < 15
          ? `Conversation captured - profile enrichment continues in background (readiness ${liveReadiness}%)`
          : `Readiness ${liveReadiness}% (${inferredPhase}) - background enrichment active`;
      setExecutionTaskStatus('ingestion', 'completed', ingestionDetail);
      let responseProvenance = buildMessageProvenance(caseDraft, liveReadiness);

      const assistantMessageId = crypto.randomUUID();
      setMessages(prev => [...prev, {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        phase: userMessagePhase
      }]);

      const trimmedUserContent = userContent.trim();
      const isGreetingOnly = inputSignal.greetingOnly || inputSignal.smallTalkOnly;
      const deliverableIntent = classifyDeliverableIntent(trimmedUserContent);
      const shouldPromptForOutputClarification = shouldAskOutputClarification(caseDraft, trimmedUserContent, deliverableIntent);
      const isFastFactQuery = /^(tell me about|tell me more about|more about|what is|what are|who is|explain|describe|give me info|can you tell me|i want to know about|i want to know more about|what do you know about|research|find out about|background on|background about|i want to learn|what can you tell me)\b/i.test(trimmedUserContent)
        && !/\b(strategy|investment|risk|analysis|evaluate|assess|compare|market entry|partnership|joint venture|government engagement|fund|financing|regulatory|compliance|due diligence|feasibility|opportunity|scenario|forecast|projection|letter|report|case study)\b/i.test(trimmedUserContent);
      const shouldRunInsights = !isGreetingOnly && !shouldPromptForOutputClarification && (fullSpectrumReasoningMode || liveReadiness >= 25) && (fullSpectrumReasoningMode || !isFastFactQuery);
      // ── BACKGROUND BRAIN ENRICHMENT (runs in parallel) ──
      // Fire brain on ANY substantive query - even with zero readiness on first turn.
      // The brain can still contribute country data, governance indices, sanctions checks, etc.
      const shouldFireBrain = !isGreetingOnly && !shouldPromptForOutputClarification && (fullSpectrumReasoningMode || !isFastFactQuery) && (fullSpectrumReasoningMode || liveReadiness >= 15 || trimmedUserContent.length > 20);
      const brainEnrichmentPromise = shouldFireBrain
        ? BrainIntegrationService.enrich(
            { country: caseDraft.country, organizationName: caseDraft.organizationName, organizationType: caseDraft.organizationType || undefined },
            Math.max(liveReadiness, 15),
            trimmedUserContent
          ).catch((e) => { console.warn('[Brain] non-fatal:', e); return null; })
        : Promise.resolve(null);
      const agenticInsightsPromise = shouldRunInsights
        ? (async () => {
            setExecutionTaskStatus('insight', 'running', 'Running NSIL signal extraction in parallel');
            try {
              const insights = await agenticAIRef.current.consult(toAgenticParams(caseDraft, trimmedUserContent), 'case_discovery');
              setExecutionTaskStatus('insight', 'completed', `${insights.length} insight${insights.length === 1 ? '' : 's'} generated`);
              return insights;
            } catch (agenticError) {
              console.warn('Agentic insight generation failed:', agenticError);
              setExecutionTaskStatus('insight', 'failed', 'Insight scan unavailable for this turn');
              return [];
            }
          })()
        : (() => {
            setExecutionTaskStatus('insight', 'skipped',
              shouldPromptForOutputClarification
                ? 'Insight scan deferred until output type is clarified'
                : liveReadiness < 25
                ? `Background analysis deferred until more context is available`
                : 'Greeting turn - intelligence scan deferred'
            );
            return Promise.resolve([]);
          })();

      let responseContent = '';
      const isReportGeneration = userContent.startsWith('GENERATE_REPORT_NOW::');
      const reportTierLabel = isReportGeneration ? userContent.split('\n')[0].replace('GENERATE_REPORT_NOW::', '').trim() : '';
      if (shouldPromptForOutputClarification) {
        responseContent = buildOutputClarificationPrompt(caseDraft);
        displayedMsgIds.current.add(assistantMessageId);
        setMessages(prev => prev.map((msg) => (
          msg.id === assistantMessageId ? { ...msg, content: responseContent } : msg
        )));
        setExecutionTaskStatus('response', 'completed', 'Clarification menu delivered before deep analysis');
      } else {
        setExecutionTaskStatus('response', 'running', 'Streaming consultant response');
        const brainCtx = await brainEnrichmentPromise;
        if (brainCtx) {
          brainCtxRef.current = brainCtx;
          setExecutionTaskStatus('insight', 'completed', `Brain: ${BrainIntegrationService.summarise(brainCtx)}`);
        }
        const brainBlock = brainCtxRef.current?.promptBlock ?? '';

        // ── ADVANCED DECISION INTELLIGENCE (parallel, readiness-gated) ─────────
        // Engines not normally used in standard AI advisory - run synchronously
        // (all are pure computation, no async I/O) and inject as context blocks.
        let advancedIntelligenceBlock = '';
        if (!isGreetingOnly && !shouldPromptForOutputClarification) {
          try {
            const partialParams = {
              organizationName: caseDraft.organizationName || undefined,
              organizationType: caseDraft.organizationType || undefined,
              country: caseDraft.country || undefined,
              region: caseDraft.jurisdiction || undefined,
              problemStatement: caseDraft.currentMatter || undefined,
              strategicIntent: caseDraft.objectives ? [caseDraft.objectives] : undefined,
              industry: caseDraft.organizationType ? [caseDraft.organizationType] : undefined,
              targetPartner: caseDraft.organizationName || undefined,
            };

            // Build UserInputSnapshot for UserSignalDecoder
            const userSnapshot: UserInputSnapshot = {
              missionSummary: caseDraft.currentMatter || trimmedUserContent,
              problemStatement: caseDraft.currentMatter || trimmedUserContent,
              strategicIntent: caseDraft.objectives ? [caseDraft.objectives] : [],
              additionalContext: '',
              country: caseDraft.country || '',
              region: caseDraft.jurisdiction || '',
              sector: caseDraft.organizationType ? [caseDraft.organizationType] : [],
              riskConcerns: '',
              partnerProfile: caseDraft.organizationName || '',
              collaborativeNotes: '',
              politicalSensitivities: [],
              priorityThemes: [],
            };

            // ── Background MultiAgentOrchestrator (fire-and-forget, enriches next turn) ──
            if (liveReadiness >= 40 && !multiAgentRunningRef.current && (caseDraft.country || caseDraft.currentMatter)) {
              multiAgentRunningRef.current = true;
              const agentProfile = {
                organizationName: caseDraft.organizationName || undefined,
                country: caseDraft.country || undefined,
                region: caseDraft.jurisdiction || undefined,
                organizationType: caseDraft.organizationType || undefined,
                industry: caseDraft.organizationType ? [caseDraft.organizationType] : undefined,
                problemStatement: caseDraft.currentMatter || undefined,
                strategicIntent: caseDraft.objectives ? [caseDraft.objectives] : undefined,
              } as Parameters<typeof MultiAgentOrchestrator.synthesizeAnalysis>[0]['organizationProfile'];
              MultiAgentOrchestrator.synthesizeAnalysis({
                organizationProfile: agentProfile,
                query: caseDraft.currentMatter || trimmedUserContent,
                dataScope: 'comprehensive',
                includeCustomData: true,
              }).then((result: SynthesizedAnalysis) => {
                const synthesis = result.synthesis;
                const historical = result.historicalPatterns;
                multiAgentContextRef.current = [
                  `## MULTI-AGENT SYNTHESIS (6 specialist AI agents - historical, government, banking, corporate, market, risk)`,
                  synthesis.primaryInsight ? `Primary insight: ${synthesis.primaryInsight}` : '',
                  synthesis.alternativeViewpoints.length ? `Alternative viewpoints: ${synthesis.alternativeViewpoints.slice(0, 2).join('; ')}` : '',
                  synthesis.recommendedNextSteps.length ? `Multi-agent recommended next steps: ${synthesis.recommendedNextSteps.slice(0, 3).join('; ')}` : '',
                  historical.similarCases ? `Similar cases analysed: ${historical.similarCases} | Success rate: ${historical.successRate}% | Typical timeline: ${historical.timeline}` : '',
                  historical.failurePatterns.length ? `Common failure patterns: ${historical.failurePatterns.slice(0, 2).join('; ')}` : '',
                  synthesis.dataGaps.length ? `Data gaps flagged by agents: ${synthesis.dataGaps.slice(0, 2).join('; ')}` : '',
                ].filter(Boolean).join('\n');
              }).catch(() => { multiAgentRunningRef.current = false; });
            }

            // ── Synchronous PartnerIntelligenceEngine (pure computation, Tier 2) ────────

            // ── Background location research (fire-and-forget, enriches next turn) ──
            const locationQuery = [caseDraft.jurisdiction, caseDraft.country].filter(s => s.trim()).join(', ');
            if (locationQuery && !locationSessionIdRef.current) {
              locationResearchManager.startResearch(locationQuery).then(session => {
                locationSessionIdRef.current = session.id;
                locationResearchManager.subscribe(session.id, updatedSession => {
                  if (updatedSession.status === 'complete' && updatedSession.profile) {
                    const p = updatedSession.profile;
                    locationProfileContextRef.current = [
                      `## LIVE LOCATION INTELLIGENCE (agenticLocationIntelligence - 7-category agentic research)`,
                      `Location researched: ${updatedSession.query.city ?? ''}${updatedSession.query.country ? ', ' + updatedSession.query.country : ''}`,
                      p.knownFor?.length ? `Known for: ${p.knownFor.slice(0, 4).join(', ')}` : '',
                      p.keySectors?.length ? `Key sectors: ${p.keySectors.slice(0, 4).join(', ')}` : '',
                      p.strategicAdvantages?.length ? `Strategic advantages: ${p.strategicAdvantages.filter(s => s !== 'Awaiting live data').slice(0, 3).join('; ')}` : '',
                      p.economics?.majorIndustries?.length ? `Major industries: ${p.economics.majorIndustries.filter(s => s !== 'Researching...').slice(0, 4).join(', ')}` : '',
                      p.economics?.topExports?.length ? `Top exports: ${p.economics.topExports.filter(s => s !== 'Researching...').slice(0, 3).join(', ')}` : '',
                      p.demographics?.population && p.demographics.population !== 'Researching...' ? `Population: ${p.demographics.population}` : '',
                      p.investmentPrograms?.length ? `Investment programs: ${p.investmentPrograms.filter(s => s !== 'Awaiting live data').slice(0, 3).join('; ')}` : '',
                      p.infrastructureScore ? `Infrastructure score: ${p.infrastructureScore}/100` : '',
                      p.politicalStability ? `Political stability score: ${p.politicalStability}/100` : '',
                    ].filter(Boolean).join('\n');
                  }
                });
              }).catch(() => {});
            }

            // ── Tier 1: Run always (even with minimal context) ────────────────
            const [situationResult, nsilResult, userSignalResult, motivationResult] = await Promise.all([
              Promise.resolve<SituationAnalysisResult | null>(
                SituationAnalysisEngine.analyse(partialParams)
              ).catch(() => null),
              Promise.resolve<QuickAssessment | null>(
                NSILIntelligenceHub.quickAssess(partialParams)
              ).catch(() => null),
              Promise.resolve<UserSignalReport | null>(
                UserSignalDecoder.decode(userSnapshot)
              ).catch(() => null),
              Promise.resolve(
                MotivationDetector.analyze(partialParams as Parameters<typeof MotivationDetector.analyze>[0])
              ).catch(() => null),
            ]);

            // ── Tier 2: Run when enough context exists (readiness >= 35) ──────
            const [historicalResult, unbiasedResult, counterfactualResult] = await Promise.all([
              Promise.resolve<ParallelMatchResult | null>(
                liveReadiness >= 35 && (caseDraft.country || caseDraft.organizationType)
                  ? HistoricalParallelMatcher.match(partialParams)
                  : null
              ).catch(() => null),
              Promise.resolve<FullUnbiasedAnalysis | null>(
                liveReadiness >= 35 && (caseDraft.objectives || caseDraft.currentMatter)
                  ? UnbiasedAnalysisEngine.analyze(partialParams)
                  : null
              ).catch(() => null),
              Promise.resolve<CounterfactualAnalysis | null>(
                liveReadiness >= 35 && (caseDraft.currentMatter || caseDraft.objectives)
                  ? CounterfactualEngine.analyze(partialParams)
                  : null
              ).catch(() => null),
            ]);

            // ── Tier 2.5: Full 19-engine NSIL analysis (readiness >= 50) ──────
            const nsilFullResult = await (
              liveReadiness >= 50
                ? NSILIntelligenceHub.runFullAnalysis(partialParams)
                : Promise.resolve(null as IntelligenceReport | null)
            ).catch(() => null as IntelligenceReport | null);

            // ── Tier 3: Adversarial reasoning at high readiness (>= 60) ───────
            const adversarialResult = await Promise.resolve<AdversarialOutputs | null>(
              liveReadiness >= 60
                ? AdversarialReasoningService.generate(partialParams as Parameters<typeof AdversarialReasoningService.generate>[0])
                : null
            ).catch(() => null);

            const blocks: string[] = [];

            // ── TIER 1 ENGINE OUTPUTS ─────────────────────────────────────────

            // NSIL Master Hub quick assessment
            if (nsilResult) {
              const statusLabel = { green: 'LOW RISK', yellow: 'MODERATE RISK', orange: 'ELEVATED RISK', red: 'HIGH RISK' }[nsilResult.status] ?? nsilResult.status.toUpperCase();
              blocks.push(
                `## NSIL MASTER HUB ASSESSMENT (NSILIntelligenceHub - 9-layer engine stack)\n` +
                `Status: **${statusLabel}** | Trust Score: ${nsilResult.trustScore}/100 | Ethical pass: ${nsilResult.ethicalPass ? 'YES' : 'NEEDS REVIEW'}\n` +
                `Headline: ${nsilResult.headline}\n` +
                (nsilResult.topConcerns.length ? `Top concerns: ${nsilResult.topConcerns.slice(0, 3).join('; ')}` : '') +
                (nsilResult.topOpportunities.length ? `\nTop opportunities: ${nsilResult.topOpportunities.slice(0, 3).join('; ')}` : '') +
                `\nRecommended next step: ${nsilResult.nextStep}` +
                (nsilResult.emotionalClimateNotes ? `\nEmotional climate: ${nsilResult.emotionalClimateNotes}` : '')
              );
            }

            // Situation Analysis - 7 perspectives
            if (situationResult) {
              const sr = situationResult;
              const unconsideredCritical = sr.unconsideredNeeds.filter(n => n.urgency === 'critical').slice(0, 2);
              const unconsideredImportant = sr.unconsideredNeeds.filter(n => n.urgency === 'important').slice(0, 2);
              blocks.push(
                `## SITUATION ANALYSIS (SituationAnalysisEngine - 7-perspective diagnostic)\n` +
                (sr.explicitNeeds.length ? `Explicit needs detected: ${sr.explicitNeeds.slice(0, 3).join('; ')}\n` : '') +
                (sr.implicitNeeds.length ? `Implicit needs (unstated): ${sr.implicitNeeds.slice(0, 3).join('; ')}\n` : '') +
                ([...unconsideredCritical, ...unconsideredImportant].length
                  ? `Unconsidered needs (they haven't thought of): ${[...unconsideredCritical, ...unconsideredImportant].map(n => n.need).join('; ')}\n`
                  : '') +
                (sr.contrarian?.analysis ? `Contrarian view: ${sr.contrarian.analysis}\n` : '') +
                (sr.blindSpots.length ? `Blind spots: ${sr.blindSpots.slice(0, 3).join('; ')}\n` : '') +
                (sr.timeHorizonDivergence?.divergenceRisk ? `Time-horizon divergence risk: ${sr.timeHorizonDivergence.divergenceRisk}` : '')
              );
            }

            // Motivation Detector - risk signals from user language
            if (motivationResult && (motivationResult.redFlags?.length || motivationResult.triggers?.length)) {
              const flags = (motivationResult.redFlags || []).slice(0, 3);
              const triggers = (motivationResult.triggers || []).slice(0, 3);
              blocks.push(
                `## MOTIVATION ANALYSIS (MotivationDetector - behavioural signal scanner)\n` +
                (flags.length ? `Red flags in user language: ${flags.map((f: { flag: string }) => f.flag).join('; ')}\n` : '') +
                (triggers.length ? `Detected motivation signals: ${triggers.map((t: { category: string; implication: string }) => `${t.category} - ${t.implication}`).join('; ')}` : '')
              );
            }

            // User Signal Decoder - hidden agenda, avoidance, repetition
            if (userSignalResult && (userSignalResult.repetitionSignals.length || userSignalResult.avoidanceSignals.length || userSignalResult.proactiveQuestions.length)) {
              const reps = userSignalResult.repetitionSignals.slice(0, 2);
              const avoid = userSignalResult.avoidanceSignals.slice(0, 2);
              const proQs = userSignalResult.proactiveQuestions.slice(0, 2);
              blocks.push(
                `## USER SIGNAL ANALYSIS (UserSignalDecoder - reflexive intelligence layer)\n` +
                (reps.length ? `Repeated concerns (hidden priority): ${reps.map(r => `"${r.phrase}" - ${r.hiddenPriority}`).join('; ')}\n` : '') +
                (avoid.length ? `Topics being avoided: ${avoid.map(a => `${a.missingTopic} - ${a.significance}`).join('; ')}\n` : '') +
                (userSignalResult.inferredHiddenAgenda ? `Inferred hidden agenda: ${userSignalResult.inferredHiddenAgenda}\n` : '') +
                (proQs.length ? `Questions the system should ask proactively: ${proQs.map(q => q.question).join(' | ')}` : '')
              );
            }

            // ── TIER 2 ENGINE OUTPUTS (readiness >= 35) ──────────────────────

            if (historicalResult && historicalResult.matches.length > 0) {
              const topMatches = historicalResult.matches.slice(0, 3);
              blocks.push(
                `## HISTORICAL PRECEDENTS (HistoricalParallelMatcher - 60-year case library)\n` +
                `Success rate across similar cases: ${historicalResult.successRate}%\n` +
                topMatches.map(m =>
                  `• **${m.title}** (${m.country}, ${m.year}) - ${m.outcome.replace('-', ' ')}. ` +
                  `Key lesson: ${m.lessonsLearned[0] ?? m.keyFactors[0] ?? '-'}`
                ).join('\n') +
                (historicalResult.synthesisInsight ? `\nSynthesis: ${historicalResult.synthesisInsight}` : '') +
                (historicalResult.commonSuccessFactors.length
                  ? `\nCommon success factors: ${historicalResult.commonSuccessFactors.slice(0, 3).join(', ')}`
                  : '') +
                (historicalResult.commonFailureFactors.length
                  ? `\nCommon failure factors: ${historicalResult.commonFailureFactors.slice(0, 2).join(', ')}`
                  : '')
              );
            }

            if (unbiasedResult) {
              const pc = unbiasedResult.prosCons;
              const topPros = pc.pros.slice(0, 3).map(p => p.point).join('; ');
              const topCons = pc.cons.slice(0, 3).map(c => c.point).join('; ');
              const rec = pc.overallAssessment.recommendation;
              const recLabel = { proceed: 'PROCEED', 'proceed-with-caution': 'PROCEED WITH CAUTION', reconsider: 'RECONSIDER', 'not-recommended': 'NOT RECOMMENDED' }[rec] ?? rec;
              blocks.push(
                `## UNBIASED PRO/CON ANALYSIS (UnbiasedAnalysisEngine - balanced assessment)\n` +
                `Assessment: **${recLabel}** (confidence: ${pc.overallAssessment.confidence}%)\n` +
                `Pros: ${topPros || '-'}\n` +
                `Cons: ${topCons || '-'}\n` +
                `Reasoning: ${pc.overallAssessment.reasoning}` +
                (unbiasedResult.alternatives.length > 0
                  ? `\nAlternative options worth considering: ${unbiasedResult.alternatives.slice(0, 2).map(a => a.title).join(', ')}`
                  : '')
              );
            }

            if (counterfactualResult && counterfactualResult.scenarios.length > 0) {
              const mc = counterfactualResult.monteCarlo;
              blocks.push(
                `## COUNTERFACTUAL SCENARIOS (CounterfactualEngine - Monte Carlo)\n` +
                `Monte Carlo (${mc.iterations} iterations): Median outcome ${mc.distribution.p50.toFixed(0)}% | ` +
                `Probability of loss: ${mc.probabilityOfLoss.toFixed(0)}% | ` +
                `VaR (95%): ${mc.valueAtRisk95.toFixed(0)}%\n` +
                counterfactualResult.scenarios.slice(0, 3).map(s =>
                  `• **${s.name}** (${s.probability}% probability) - ${s.description}`
                ).join('\n')
              );
            }

            // ── TIER 2.5 ENGINE OUTPUTS (readiness >= 50) - 19-engine full analysis ──

            if (nsilFullResult) {
              const fullRec = nsilFullResult.recommendation;
              const auto = nsilFullResult.autonomous;
              const reflexive = nsilFullResult.reflexive;
              const insights = nsilFullResult.applicableInsights;
              const persona = nsilFullResult.personaAnalysis;
              const globalStd = nsilFullResult.globalStandards;
              const latentAdvs = reflexive?.latentAdvantages?.latentAdvantages ?? [];
              const actionLabel = { 'proceed': 'PROCEED', 'proceed-with-caution': 'PROCEED WITH CAUTION', 'revise-and-retry': 'REVISE & RETRY', 'do-not-proceed': 'DO NOT PROCEED' }[fullRec.action] ?? fullRec.action.toUpperCase();
              blocks.push(
                `## NSIL FULL ANALYSIS - 19-ENGINE UNIFIED ASSESSMENT\n` +
                `**Master recommendation: ${actionLabel}** (confidence: ${fullRec.confidence}%)\n` +
                `Summary: ${fullRec.summary}\n` +
                (fullRec.criticalActions.length ? `Critical actions: ${fullRec.criticalActions.slice(0, 3).join('; ')}\n` : '') +
                (fullRec.keyRisks.length ? `Key risks: ${fullRec.keyRisks.slice(0, 3).join('; ')}\n` : '') +
                (fullRec.keyOpportunities.length ? `Key opportunities: ${fullRec.keyOpportunities.slice(0, 3).join('; ')}\n` : '') +
                `Ethical gate: ${fullRec.ethicalGate.toUpperCase()} | Emotional risk: ${fullRec.emotionalRisk}/100\n` +
                (auto.creativeStrategies.length ? `Creative strategies: ${auto.creativeStrategies.slice(0, 2).map(s => s.strategy).join('; ')}\n` : '') +
                (auto.crossDomainInsights.length ? `Cross-domain insights: ${auto.crossDomainInsights.slice(0, 2).map(i => `${i.analogy} (from ${i.sourceModel})`).join('; ')}\n` : '') +
                (auto.autonomousGoals.length ? `Autonomous goals: ${auto.autonomousGoals.slice(0, 2).map(g => g.goal).join('; ')}\n` : '') +
                `Scenario outlook: ${auto.scenarioOutlook.riskLevel} | Probability of success: ${auto.scenarioOutlook.probabilityOfSuccess}%` +
                (latentAdvs.length ? `\nLatent (hidden) advantages: ${latentAdvs.slice(0, 2).map((a: { asset: string }) => a.asset).join('; ')}` : '') +
                (reflexive?.lifecyclePosition?.currentPhase ? `\nRegional lifecycle stage: ${reflexive.lifecyclePosition.currentPhase}` : '') +
                (globalStd?.criticalGaps?.length ? `\nIFC compliance gaps: ${globalStd.criticalGaps.slice(0, 2).map((g: { description: string }) => g.description).join('; ')}` : '') +
                (persona?.synthesis?.overallRecommendation ? `\nMulti-persona debate outcome: ${persona.synthesis.overallRecommendation.replace(/-/g, ' ').toUpperCase()}` : '') +
                (insights.length ? `\nHistorical AI insights: ${insights.slice(0, 2).map(i => i.insight).join('; ')}` : '')
              );
            }

            // ── LOCATION PROFILE (if background research completed) ────────────
            if (locationProfileContextRef.current) {
              blocks.push(locationProfileContextRef.current);
            }

            // ── PARTNER INTELLIGENCE (when org + country + sector available) ───────
            if (liveReadiness >= 35 && caseDraft.country && (caseDraft.organizationType || caseDraft.objectives)) {
              try {
                const candidates: PartnerCandidate[] = [
                  { id: 'gov-dev-agency', name: 'Government Development Agency', type: 'government', countries: [caseDraft.country.toLowerCase()], sectors: ['regional development', 'policy', 'infrastructure', 'health', 'education'] },
                  { id: 'multilateral-dev-bank', name: 'Multilateral Development Bank', type: 'multilateral', countries: [caseDraft.country.toLowerCase()], sectors: ['energy', 'housing', 'digital', 'health', 'infrastructure', 'agriculture'] },
                  { id: 'banking-consortium', name: 'Banking Consortium', type: 'bank', countries: [caseDraft.country.toLowerCase()], sectors: ['banking', 'trade', 'housing', 'energy', 'manufacturing'] },
                  { id: 'delivery-partner', name: 'Strategic Delivery Partner', type: 'corporate', countries: [caseDraft.country.toLowerCase()], sectors: ['logistics', 'infrastructure', 'digital', 'services', 'construction'] },
                  { id: 'community-org', name: 'Community / Civil Society Partner', type: 'community', countries: [caseDraft.country.toLowerCase()], sectors: ['social', 'health', 'education', 'environment', 'agriculture'] },
                ];
                const ranked = PartnerIntelligenceEngine.rankPartners({
                  country: caseDraft.country,
                  sector: caseDraft.organizationType || caseDraft.objectives,
                  objective: caseDraft.objectives || caseDraft.currentMatter,
                  constraints: caseDraft.constraints || '',
                  candidates,
                });
                if (ranked.length > 0) {
                  blocks.push(
                    `## PARTNER INTELLIGENCE (PartnerIntelligenceEngine - 6-metric scoring)
` +
                    ranked.slice(0, 3).map(r =>
                      `• **${r.partner.name}** (${r.partner.type}) - Total fit: ${r.score.total.toFixed(0)}/100 | ` +
                      `Partner fit: ${r.score.partnerFit.toFixed(0)} | Policy alignment: ${r.score.policyAlignment.toFixed(0)} | ` +
                      `Delivery reliability: ${r.score.deliveryReliability.toFixed(0)}\n  Reasons: ${r.reasons.join(', ')}`
                    ).join('\n')
                  );
                }
              } catch { /* non-fatal */ }
            }

            // ── MULTI-AGENT CONTEXT (from background run, if ready) ────────────
            if (multiAgentContextRef.current) {
              blocks.push(multiAgentContextRef.current);
            }

            // ── EVENTBUS LIVE INTELLIGENCE (from background services) ────────────
            if (eventBusInsightsRef.current.trim()) {
              blocks.push(
                `## LIVE SYSTEM INTELLIGENCE (EventBus - autonomous background services)\n` +
                eventBusInsightsRef.current
              );
            }

            // ── SELF-LEARNING ADAPTIVE STATE ────────────────────────────────────
            {
              const learningState = OutcomeLearningService.getState();
              const _ = selfLearningEngine; // ensure singleton is live (wires EventBus subs)
              void _;
              if (learningState.records.length > 0) {
                const successCount = learningState.records.filter(
                  r => r.successfulInterventions.length > 0
                ).length;
                const successRate = Math.round((successCount / learningState.records.length) * 100);
                blocks.push(
                  `## ADAPTIVE SELF-LEARNING STATE (OutcomeLearningService - ${learningState.records.length} sessions logged)\n` +
                  `Session success rate: ${successRate}% | ` +
                  `Adaptive governance threshold: ${learningState.suggestedGovernanceThreshold}% | ` +
                  `Ranking bias: ${learningState.suggestedRankingBias > 0 ? '+' : ''}${learningState.suggestedRankingBias.toFixed(1)}\n` +
                  `Apply: calibrate confidence and governance strictness to these learned thresholds.`
                );
              }
            }

            // ── TIER 3 ENGINE OUTPUTS (readiness >= 60) ──────────────────────

            if (adversarialResult) {
              const shield = adversarialResult.adversarialShield;
              const motivation = adversarialResult.motivation;
              const confidence = adversarialResult.adversarialConfidence;
              blocks.push(
                `## ADVERSARIAL REASONING (AdversarialReasoningService - multi-persona stress test)\n` +
                (shield?.riskLevel ? `Input risk level: ${shield.riskLevel}\n` : '') +
                (shield?.concerns?.length ? `Shield concerns: ${shield.concerns.slice(0, 2).join('; ')}\n` : '') +
                (motivation?.primaryMotivation ? `Primary motivation detected: ${motivation.primaryMotivation}\n` : '') +
                (motivation?.riskLevel ? `Motivation risk: ${motivation.riskLevel}\n` : '') +
                (confidence?.overallConfidence !== undefined
                  ? `Adversarial confidence score: ${confidence.overallConfidence}/100`
                  : '')
              );
            }

            // ── INJECT ENGINE RESULTS INTO AGENTIC AI ──────────────────────────
            // This lets the NSIL panel show intelligence from the 19-engine stack
            // instead of generic liability warnings
            try {
              agenticAIRef.current.setEngineResults({
                nsilStatus: nsilResult?.status,
                nsilTrustScore: nsilResult?.trustScore,
                nsilHeadline: nsilResult?.headline,
                nsilTopConcerns: nsilResult?.topConcerns,
                nsilTopOpportunities: nsilResult?.topOpportunities,
                situationBlindSpots: situationResult?.blindSpots,
                situationImplicitNeeds: situationResult?.implicitNeeds,
                situationUnconsideredNeeds: situationResult?.unconsideredNeeds?.map(n => n.need),
                historicalMatches: historicalResult?.matches?.slice(0, 3).map(m => ({
                  title: m.title,
                  country: m.country,
                  year: m.year,
                  outcome: m.outcome,
                  lesson: m.lessonsLearned?.[0] || m.keyFactors?.[0] || ''
                })),
                historicalSuccessRate: historicalResult?.successRate,
                counterfactualLossProbability: counterfactualResult?.monteCarlo?.probabilityOfLoss,
                counterfactualMedianOutcome: counterfactualResult?.monteCarlo?.distribution?.p50,
                adversarialRiskLevel: adversarialResult?.adversarialShield?.riskLevel,
                adversarialConcerns: adversarialResult?.adversarialShield?.concerns,
                unbiasedRecommendation: unbiasedResult?.prosCons?.overallAssessment?.recommendation,
                unbiasedConfidence: unbiasedResult?.prosCons?.overallAssessment?.confidence,
                dataGaps: nsilFullResult?.recommendation?.criticalActions?.filter((a: string) => /gap|missing|unavailable|unknown/i.test(a)),
                liveSearchResultCount: 0, // updated below after live search
                locationProfileAvailable: !!locationProfileContextRef.current,
                multiAgentDataGaps: multiAgentContextRef.current ? [] : ['Multi-agent analysis not yet complete'],
                userQuery: trimmedUserContent,
                entityIntel: null,       // populated by BWConsultantAgenticAI during consult()
                vdemGovernance: null,     // populated by BWConsultantAgenticAI during consult()
              });
            } catch { /* non-fatal */ }

            if (blocks.length > 0) {
              advancedIntelligenceBlock =
                `\n\n## ── ADVANCED INTELLIGENCE LAYER (19-engine NSIL stack + agentic location intelligence - not in standard AI advisory) ──\n\n` +
                blocks.join('\n\n') +
                `\n\nAPPLY ALL OF THE ABOVE: Reference the 19-engine NSIL master recommendation, surface unconsidered needs the client hasn't thought of, flag motivation risk signals, note any hidden agenda from user signals, cite historical precedents, surface latent (hidden) advantages the client is underselling, apply the multi-persona debate outcome, flag IFC compliance gaps, use Monte Carlo probabilities, and weave any live location intelligence into expert advisory prose. Do not bullet-list - synthesise into authoritative insight.`;
            }
          } catch (advErr) {
            console.warn('[Advanced Intelligence] non-fatal:', advErr);
          }
        }
        const priorTurns = memoryRef.current.recall('consultant-turns', 5);
        const memoryBlock = priorTurns.length
          ? `\n\n### PRIOR SESSION CONTEXT (${priorTurns.length} remembered turns)\n` +
            priorTurns.map(t => `- [${new Date(t.timestamp).toLocaleDateString()}] ${t.action.substring(0, 120)}`).join('\n')
          : '';
        setIsStreamingResponse(true);
        displayedMsgIds.current.add(assistantMessageId);
        // Build the system instruction. For greeting/low-readiness turns inject a
        // capability-led opening so the AI demonstrates value instead of running a
        // scripted intake questionnaire like a basic chatbot.
        const isOpeningTurn = !hadFileUpload && (liveReadiness < 20 || isGreetingOnly);

        // Build a case context block from what was just extracted this turn
        const thisTurnContext = [
          caseDraft.organizationType ? `Sector/Industry: ${caseDraft.organizationType}` : null,
          caseDraft.country ? `Country/Region: ${caseDraft.country}` : null,
          caseDraft.organizationName ? `Organization: ${caseDraft.organizationName}` : null,
          caseDraft.objectives ? `Objective: ${caseDraft.objectives}` : null,
          caseDraft.currentMatter ? `Current matter: ${caseDraft.currentMatter}` : null,
          caseDraft.contactRole ? `Contact role: ${caseDraft.contactRole}` : null,
        ].filter(Boolean).join('\n');

        // ── QUERY TYPE CLASSIFIER - determines engine routing + prompt framing ──
        // Runs on every turn regardless of readiness to ensure correct engine mix
        const isInfoQueryTurn = /^(tell me about|tell me more about|more about|what is|what are|who is|explain|describe|give me info|can you tell me|i want to know about|i want to know more about|what do you know about|research|find out about|background on|background about|i want to learn|what can you tell me)/i.test(trimmedUserContent)
          || /\b(who is|who was|what is|what are|tell me about|more about)\b.{3,}/i.test(trimmedUserContent)
          || /\b(mayor|governor|minister|president|senator|congressman|secretary|ambassador|ceo|director|general|admiral|chief)\s+\w/i.test(trimmedUserContent);
        const isPersonQuery = /\b(mayor|governor|minister|president|senator|secretary|ambassador|ceo|director|general|admiral|chief|mr\.|ms\.|dr\.|hon\.)\s+\w/i.test(trimmedUserContent);
        const isLocationQuery = /\b(city|province|region|state|country|district|municipality|island|capital|town|village|prefecture|county|territory)\b/i.test(trimmedUserContent);
        const isComplexAnalysis = /\b(strategy|investment|risk|analysis|evaluate|assess|compare|market entry|partnership|joint venture|government engagement|fund|financing|regulatory|compliance|due diligence|feasibility|opportunity|scenario|forecast|projection)\b/i.test(trimmedUserContent);
        const isLetterRequest = /\b(write\s+a\s+letter|draft\s+a\s+letter|letter\s+to|write\s+to|reach\s+out\s+to|approach\s+them|formal\s+letter|letter\s+of\s+intent|LOI|introduce\s+(myself|us|our)|expression\s+of\s+interest|EOI|MOU|memorandum|proposal\s+letter|cover\s+letter|request\s+letter)\b/i.test(trimmedUserContent);
        const isCaseStudyRequest = /\b(case\s+study|case\s+report|full\s+report|write\s+up|write\s+a\s+report|build\s+(me\s+)?a?\s*case|do\s+a\s+case|prepare\s+a\s+(report|brief|dossier)|put\s+together|assess\s+this|give\s+me\s+a\s+breakdown|deep\s+dive|comprehensive\s+(review|analysis|report))\b/i.test(trimmedUserContent);
        const isComparisonRequest = /\b(compare|comparison|versus|vs\.?|which\s+is\s+better|difference\s+between|pros\s+and\s+cons|options|alternatives|weigh\s+up|side\s+by\s+side|benchmark|which\s+one|other\s+places|other\s+options|what\s+else|somewhere\s+else|another\s+country|elsewhere)\b/i.test(trimmedUserContent);
        const isHistoricalRequest = /\b(precedent|historical|history|who\s+else|where\s+else|done\s+before|success\s+story|similar\s+project|another\s+country\s+did|been\s+done|example\s+of|case\s+where|model\s+for|replicate|adapt\s+from|learn\s+from|what\s+worked)\b/i.test(trimmedUserContent);
        const _isSimpleFollowUp = messages.length > 2 && trimmedUserContent.length < 80 && !isComplexAnalysis;

        // ── LIVE SEARCH for factual queries - retrieval-grounded answers ──────────
        // Fires for info/person/location queries AND any substantive non-greeting
        // query, so the AI is always grounded in retrieved facts.
        let liveSearchBlock = '';
        const shouldLiveSearch = !isGreetingOnly && (isInfoQueryTurn || isPersonQuery || isLocationQuery || isComplexAnalysis || isLetterRequest || isCaseStudyRequest || isComparisonRequest || isHistoricalRequest || trimmedUserContent.length > 30);
        if (shouldLiveSearch) {
          try {
            const searchQuery = trimmedUserContent.replace(/^(tell me about|tell me more about|more about|who is|what is|what are|explain|describe|i want to know(?:\s+more)?\s+about)\s+/i, '').trim() || trimmedUserContent;
            const liveResults = await ReactiveIntelligenceEngine.liveSearch(searchQuery, {
              category: isPersonQuery ? 'leadership' : isLocationQuery ? 'location' : 'general',
              country: caseDraft.country || undefined,
            });
            if (liveResults.length > 0) {
              liveSearchBlock = `\n\n## LIVE RETRIEVAL RESULTS (ReactiveIntelligenceEngine - real-time search)\n` +
                liveResults.slice(0, 5).map(r =>
                  `**${r.title}** (${r.source || new URL(r.url || 'https://bwga.ai').hostname})\n${r.snippet}`
                ).join('\n\n') +
                `\n\nINSTRUCTION: Use the above retrieved facts as your primary source for this response. Synthesise into expert prose - cite the sources naturally. Do not repeat search result formatting.`;
              // Update the agentic AI's engine results with live search count
              try { agenticAIRef.current.setEngineResults({ ...(agenticAIRef.current.getEngineResults() || {}), liveSearchResultCount: liveResults.length }); } catch { /* non-fatal */ }
            }
          } catch { /* non-fatal - AI answers from training knowledge if search unavailable */ }
        }

        // ── WORLD-KNOWLEDGE BASE INSTRUCTION (applies every turn) ────────────────
        const worldKnowledgeInstruction = `## WORLD-KNOWLEDGE OPERATING MODE
You are a senior expert with encyclopaedic knowledge of the world - every country, city, government official, economic system, political structure, historical event, regulatory framework, and industry sector on earth. You think on your feet like a consultant who has worked in 80+ countries. You are also a skilled writer capable of producing letters, case studies, and reports on demand.

When asked about ANY person, place, topic, or event:
1. ANSWER FIRST with substantive factual knowledge - do not deflect, do not ask for context before answering
2. ${isPersonQuery ? 'PERSON BRIEFING: Name, role/title, jurisdiction, time in office, known policy priorities, political alignment, notable decisions/achievements, international engagement record, key relationships, any controversies' : isLocationQuery ? 'LOCATION BRIEFING: Full geographic/political context, economic profile (GDP, key industries, employment, investment climate), infrastructure, demographics, governance structure, strategic advantages, known development projects, current political leadership' : isCaseStudyRequest ? 'CASE STUDY: Build a structured case from what the user has provided. Identify what they have, what gaps exist, and fill those gaps with real data. Structure with: Executive Summary, Situation Analysis, Comparative Analysis (similar successes elsewhere), Gap Analysis, Strategic Options, Recommended Actions, and Sources.' : isLetterRequest ? 'LETTER DRAFTING: Write a professional, context-appropriate letter. Assess the right tone (formal government, business introduction, partnership inquiry, information request). Include proper structure: addressee context, purpose statement, value proposition or request, credibility markers, and clear next steps. Adapt length and formality to the relationship and objective.' : isComparisonRequest ? 'COMPARISON ANALYSIS: Put ALL viable options on the table - not just the obvious ones. Compare across multiple dimensions: economic, regulatory, governance, infrastructure, risk, precedent, and strategic fit. Use real data where available. Surface options the user may not have considered. Include at least one non-obvious alternative from a different region or approach.' : isHistoricalRequest ? 'HISTORICAL PRECEDENT: Find real examples where something similar was done successfully (or failed instructively) in another part of the world. Name the country, year, project, what worked, what failed, key factors, and how it can be adapted to the user\u2019s situation. Draw from the 200+ case precedent database and live research.' : 'TOPIC BRIEFING: What it is, current status, key stakeholders, historical context, strategic implications, relevant data points and statistics'}
3. After delivering the substantive answer, connect ONE insight to the user's broader advisory context if relevant
4. Ask at most ONE targeted follow-up

## DOCUMENT GENERATION CAPABILITIES
You can produce ANY of the following ON DEMAND within the conversation - the user should never need to wait or navigate elsewhere:
- **Letters**: Letters of introduction, expressions of interest, LOIs, MOUs, partnership proposals, government engagement letters, information request letters, cover letters. Always written in proper professional format with the right tone for the audience.
- **Case Studies**: Full structured case analyses built from whatever information the user provides. You identify gaps in their information and fill them with real intelligence from the NSIL engines, live data sources, and historical precedents. A case study is not a summary - it is a working strategic document.
- **Reports**: Executive briefs, risk assessments, market entry reports, due diligence frameworks, feasibility analyses, stakeholder plans. Assess the ideal length based on complexity - a simple market question gets 1-2 pages, a full partnership evaluation gets 10+.
- **Comparisons**: Side-by-side analyses across jurisdictions, partners, markets, or strategies with scoring and ranking.

When generating ANY document:
- ASSESS ideal length from context: simple letter = 1 page, case study = 3-8 pages, full report = 10+ pages. The user should not need to specify length.
- FILL GAPS: If the user gives you 40% of the picture, use the NSIL engines, live data, entity intelligence, and historical precedents to fill the other 60%. Tell them what you added and why.
- THINK BEYOND SCOPE: Do not limit yourself to what is directly in front of you. If the user asks about a market, also surface adjacent opportunities, comparable successes from other regions, risks they haven't considered, and stakeholders they should be engaging. This is what separates an OS from a chatbot.
- SOURCE EVERYTHING: At the end of any substantive response, provide a "Sources & Attribution" section listing where key facts came from (NSIL engine, live search, V-Dem governance data, OpenSanctions, GLEIF, historical precedent database, World Bank indicators, etc.). Never present unverified claims as established facts.

## GEOPOLITICAL ARBITRAGE AWARENESS
The world does not stand still. Wars, sanctions, trade fractures, supply-chain breaks, and political instability in MAJOR markets constantly create structural openings for REGIONAL and ALTERNATIVE markets — if someone spots them first.

When advising ANY user on ANY market, country, or investment:
- CHECK the Geopolitical Arbitrage Intelligence block (if provided above) for active disruptions
- PROACTIVELY INFORM the user how current world events — good or bad — may affect their situation
- When a crisis hurts a major market (sanctions on Russia, US-China tariffs, Red Sea shipping disruption, EU energy shock), identify where the user's regional city, small island, or lesser-known jurisdiction could CAPTURE displaced demand, talent, capital, or supply-chain links
- CITE historical precedents: Vietnam replacing China in textiles post-tariff (2018), Dubai absorbing Gulf War capital (1991), Georgia's tech boom from Russian IT worker relocation (2022), Bangladesh capturing diverted garment orders
- Think about OFFSETTING MARKETS: if the user's client is hurting from a global event, find where in the world that same event creates a buyer, a supplier, a partner, or a safer alternative
- Small islands in the Philippines, Pacific nations, Caribbean states, African coastal cities — these are NOT peripheral. A supply-chain fracture in the South China Sea makes Mindanao's ports strategic. A sanctions regime makes Fiji's clean jurisdiction valuable. A European energy crisis makes Morocco's solar capacity relevant.
- NEVER assume the user already knows about these connections. Surface them proactively — this is what separates an advisory OS from a search engine.

## DATA INTEGRITY RULES
- When you cannot verify a specific fact (a person's name, a statistic, a date), STATE CLEARLY what you could not confirm. Say "I could not verify the current mayor of X" rather than substituting generic national data.
- Do NOT pad a city-specific question with country-level GDP data that doesn't answer the question.
- When the user provides a correction or new fact, acknowledge it as NEW information — do not pretend you already knew it.
- When asking about the system itself ("why did you show this?"), answer the meta-question directly — explain what triggered the insight panel.
- If LIVE RETRIEVAL RESULTS are provided above, prefer them over training knowledge. If they contradict each other, flag the discrepancy.
- When ENTITY INTELLIGENCE data is provided (sanctions screening, corporate registry, LEI, V-Dem governance, news sentiment), cite those sources by name. Do NOT fabricate entity details that are not in the provided data. If a source returned no data, say so.

You NEVER say "I need more context before answering" - you answer with what you know, then gather context.`;

        const openingInstruction = isOpeningTurn
          ? `You are BW Consultant - a world-class strategic advisory AI backed by the NSIL Agentic Runtime.

CRITICAL RULES - READ BEFORE RESPONDING:
- Do NOT say "I've captured the key elements of your input" - this phrase is BANNED.
- Do NOT mention "Energy Transition" or "Advance new markets" unless the user explicitly said those words.
- Do NOT list numbered intake questions ("1) Name 2) Country 3) Decision") - that is scripted chatbot behaviour.
- Do NOT invent case context that wasn't in the user's message.
- Do NOT ask for context before answering - ANSWER FIRST, then optionally ask ONE follow-up.
- If they ask a simple question, give a simple answer. If they ask for a letter, write the letter. If they want a report, produce the report. Match your output to what they actually need.

${worldKnowledgeInstruction}

${thisTurnContext ? `## WHAT I EXTRACTED FROM THE USER'S MESSAGE THIS TURN:\n${thisTurnContext}\n\nUse this to give a specific, grounded response. Reference their actual sector and region.` : `## NO CASE CONTEXT YET\nThe user has provided minimal context. Answer their question directly with your world knowledge, then ask ONE open question about their situation.`}

BEHAVIOUR:
- Respond DIRECTLY to what the user actually said - show you understood it
- Sound like a senior consultant who has worked across 80+ countries
- If sector/country/objective can be inferred, show intelligence about THAT topic specifically
- If the user asks for something to be written (letter, report, case study), WRITE IT immediately - do not describe what you could write
- If the user describes a situation, think BEYOND what they've told you - surface comparisons, historical precedents, risks, and opportunities they haven't mentioned
- Always attribute where your key facts came from at the end of substantive responses
- Ask at most ONE follow-up - the single most valuable missing detail
- Be concise, direct, and confident`
          : `You are BW Consultant - autonomous mixed-initiative advisory mode. BANNED: "I've captured the key elements", numbered intake lists, asking for context before answering. ALWAYS answer the user's question directly and substantively FIRST. If they ask for a document, letter, case study, or report - PRODUCE IT immediately. Think beyond the obvious scope. Attribute your sources.

${worldKnowledgeInstruction}

${thisTurnContext ? `## CASE CONTEXT THIS TURN:\n${thisTurnContext}\n\nRespond to the user's intent first with a substantive answer, then advance the case with one follow-up if needed.` : `Respond to the user's intent first with a substantive answer. Use your world knowledge to deliver real information.`}`;

        const docUploadBlock = hadFileUpload
          ? `

DOCUMENT UPLOAD - SENIOR CONSULTANT FIRST RESPONSE PROTOCOL
============================================================
The user has uploaded a document. You are a senior BW Global Advisory consultant who has just read it. Respond NATURALLY as a consultant - not a template, not a formal brief.

YOUR RESPONSE MUST FOLLOW THIS EXACT STRUCTURE (but written in flowing, intelligent prose):

---

**I've reviewed the [document type/title] - here's my read:**

Open with ONE direct sentence naming exactly what this document is: the type (policy paper/feasibility study/research report/strategy brief/etc.), what it covers, and where (country/region/city). Show immediately that you read it.

---

**What the document covers:**

2-3 sentences that precisely describe the document's scope, purpose, and main argument. Be specific - name the countries, institutions, statistics, and timeframes mentioned in the document. This is NOT a summary - it's a consultant showing they absorbed the detail.

---

**What the NSIL engines surfaced from this:**

3-5 bullet points. Each must include a [bracketed engine name] and a SPECIFIC finding derived from the document content:

• **[HistoricalMatcher]** - [Name a real historical parallel this document's situation matches, with country/year and the specific lesson that applies]
• **[AdversarialReasoningService]** - [Name the key stakeholder tension or political risk surfaced - specific actors named in or implied by the document]
• **[NSIL Intelligence Hub]** - [Strategic positioning assessment - what does the NSIL analysis say about this country/sector/situation's strategic standing]
• **[ComprehensiveIndicesEngine]** - [Give 2-3 specific index scores derived from document evidence, e.g. "Political Stability: 31/100 given..."]
• **[RegionalDevelopmentOrchestrator]** - [The primary structural intervention the engine recommends based on document findings]

---

**What stands out - and why it matters for you:**

2-3 short paragraphs. This is your consultant's VIEW - not a repeat of the document. Tell the client:
1. What is the most important finding and why it matters right now
2. What the document gets right and what gap it doesn't address that BW can fill
3. What the decision-maker reading this document most urgently needs to act on

---

**What BW can develop from this:**

2 sentences. Specifically name what BW Global Advisory can deliver - the type of strategy document, intelligence brief, stakeholder engagement plan, or report package that would build directly on this document's context. Do NOT list bullet options - that comes from the panel below.

---

RULES:
- Write as a senior partner, not a system. No em-dash checklists. No "I've captured...". No numbered intake questions.
- Use specific names, data points, and institutions from the uploaded document.
- Every engine label must produce a REAL insight - not a placeholder.
- The response should feel like a senior consultant just walked out of a document review and sat down to brief the client.
- Do NOT produce the full 9-section formal brief here - that is generated when the user selects a tier from the options panel.
- After this response, the ReportOptionsPanel will appear automatically with options to generate the full formal deliverable.`
          : '';

        // For report generation requests, override system prompt entirely
        const reportGenerationOverride = isReportGeneration ? `You are a BW Global Advisory senior analyst producing a formal deliverable.

CRITICAL INSTRUCTION: Write the complete ${reportTierLabel} document NOW. Do NOT:
- Ask intake questions
- Repeat the consultant greeting
- Say "Here's my read"
- Produce bullet summaries instead of full sections

You MUST write each section in full prose, formatted with ## headers, to the specified word count. Start writing the document immediately with no preamble.

SCOPE EXPANSION: Think beyond what was provided. Fill gaps with real intelligence from the NSIL engines, entity verification pipeline, live data sources, and historical precedent database. Surface comparisons the user hasn't considered. Include historical examples from other countries/regions that succeeded or failed in similar circumstances.

SOURCE ATTRIBUTION: End the document with a "Sources & Methodology" section that lists every major data source used (NSIL engines, live search results, V-Dem governance, OpenSanctions, GLEIF, World Bank indicators, historical precedent database, entity intelligence pipeline). Every significant claim must trace to a source.` : '';

        // ── ENTITY INTELLIGENCE BLOCK ────────────────────────────────────────
        // When the Entity Intelligence Pipeline has run (via BWConsultantAgenticAI),
        // inject the real findings into the system prompt so the LLM responds
        // with SOURCED entity data instead of training-data guesses.
        let entityIntelBlock = '';
        const entityIntel = agenticAIRef.current.getEngineResults()?.entityIntel;
        if (entityIntel) {
          const parts: string[] = [`\n\n## ENTITY INTELLIGENCE REPORT: ${entityIntel.entityName}`];
          parts.push(`Risk Level: ${entityIntel.assessment.overallRisk} | Sources: ${entityIntel.assessment.dataSources.join(', ')}`);

          if (entityIntel.sanctions) {
            parts.push(`Sanctions Screening: ${entityIntel.sanctions.clearanceLevel}${entityIntel.sanctions.totalHits > 0 ? ` (${entityIntel.sanctions.totalHits} hit(s))` : ''}`);
            if (entityIntel.sanctions.flaggedLists.length > 0) parts.push(`Flagged Lists: ${entityIntel.sanctions.flaggedLists.join(', ')}`);
          }
          if (entityIntel.corporate) {
            parts.push(`Corporate Registry: ${entityIntel.corporate.name}, jurisdiction: ${entityIntel.corporate.jurisdictionCode || 'unknown'}, incorporated: ${entityIntel.corporate.incorporationDate || 'unknown'}`);
          }
          if (entityIntel.lei?.verified) {
            const rec = entityIntel.lei.records[0];
            parts.push(`LEI: ${rec.lei} (${rec.registrationStatus}), jurisdiction: ${rec.jurisdiction}`);
          }
          if (entityIntel.tavilyIntel?.answer) {
            parts.push(`Web Research Summary: ${entityIntel.tavilyIntel.answer.substring(0, 600)}`);
          }
          if (entityIntel.governance) {
            const g = entityIntel.governance;
            parts.push(`Jurisdiction Governance (V-Dem): ${g.governanceBand} — Rule of Law: ${((g.ruleOfLaw || 0) * 100).toFixed(0)}/100, Corruption Control: ${((g.corruptionControl || 0) * 100).toFixed(0)}/100`);
          }
          if (entityIntel.news.recentCoverage) {
            parts.push(`Media Coverage: ${entityIntel.news.articles.length} recent articles, sentiment: ${entityIntel.assessment.mediaSentiment}`);
          }
          parts.push(`\nINSTRUCTION: Use the above ENTITY INTELLIGENCE as your primary source for this entity. Every claim must be traceable to one of the listed data sources. State clearly when data is unavailable rather than guessing.`);
          entityIntelBlock = parts.join('\n');
        }

        // V-Dem governance block (for country-level queries without a specific entity)
        let vdemBlock = '';
        const vdemData = agenticAIRef.current.getEngineResults()?.vdemGovernance;
        if (vdemData && !entityIntel) {
          vdemBlock = `\n\n## GOVERNANCE INTELLIGENCE (V-Dem v14 - University of Gothenburg)\nGovernance Band: ${vdemData.governanceBand}${vdemData.ruleOfLaw != null ? ` | Rule of Law: ${(vdemData.ruleOfLaw * 100).toFixed(0)}/100` : ''}${vdemData.corruptionControl != null ? ` | Corruption Control: ${(vdemData.corruptionControl * 100).toFixed(0)}/100` : ''}${vdemData.civilLiberties != null ? ` | Civil Liberties: ${(vdemData.civilLiberties * 100).toFixed(0)}/100` : ''}\nThis is independent academic data — use it to assess governance quality objectively.`;
        }

        // Geopolitical Arbitrage block — live global disruption intelligence
        let geoArbBlock = '';
        const geoArbData = agenticAIRef.current.getEngineResults()?.geopoliticalArbitrage;
        if (geoArbData && geoArbData.summaryForPrompt) {
          geoArbBlock = geoArbData.summaryForPrompt;
        }

        const effectiveSystemPrompt = isReportGeneration
          ? `${reportGenerationOverride}\n\n${memoryBlock}${brainBlock}${advancedIntelligenceBlock}${entityIntelBlock}${vdemBlock}${geoArbBlock}`
          : `${liveSearchBlock}${brainBlock}${advancedIntelligenceBlock}${entityIntelBlock}${vdemBlock}${geoArbBlock}${memoryBlock}${docUploadBlock}${openingInstruction}`;

        // Strip the GENERATE_REPORT_NOW:: prefix before sending to AI
        const effectiveUserContent = isReportGeneration
          ? userContent.replace(/^GENERATE_REPORT_NOW::[^\n]*\n/, '').trim()
          : userContent;

        // Throttle streaming updates — Groq streams so fast the text is unreadable otherwise.
        // Buffer tokens and update UI every 40ms (≈25 fps) for a readable typing effect.
        let _streamBuffer = '';
        let _streamTimer: ReturnType<typeof setTimeout> | null = null;
        const flushStream = () => {
          const snapshot = _streamBuffer;
          setMessages(prev => prev.map((msg) => (
            msg.id === assistantMessageId ? { ...msg, content: snapshot } : msg
          )));
          _streamTimer = null;
        };

        responseContent = await processWithAIStream(
          effectiveUserContent,
          effectiveSystemPrompt,
          (streamText) => {
            _streamBuffer = streamText;
            if (!_streamTimer) {
              _streamTimer = setTimeout(flushStream, 40);
            }
          }
        );
        // Flush any remaining buffered text
        if (_streamTimer) { clearTimeout(_streamTimer); _streamTimer = null; }
        setMessages(prev => prev.map((msg) => (
          msg.id === assistantMessageId ? { ...msg, content: responseContent } : msg
        )));
        setExecutionTaskStatus('response', 'completed', 'Primary response delivered');
        // ── SAVE TURN TO PERSISTENT MEMORY ──
        memoryRef.current.remember('consultant-turns', {
          action: trimmedUserContent.substring(0, 200),
          context: { country: caseDraft.country, readiness: liveReadiness, org: caseDraft.organizationName },
          outcome: { response: responseContent.substring(0, 300) },
          confidence: Math.max(0.1, liveReadiness / 100),
        }).catch(() => {/* non-fatal */});
      }

      // ── TOOL CALL EXECUTION LOOP ─────────────────────────────────────────────
      // Try native function calling first (structured JSON-schema tools via Together.ai),
      // then fall back to text-parsed [[TOOL:name]] blocks.
      let nativeFCToolResults: string[] = [];
      try {
        const fcResult = await runWithFunctionCalling(
          [
            { role: 'system', content: 'You are BW Nexus AI, a senior international development consultant. Use the available tools when the user\'s query would benefit from live data.' },
            { role: 'user', content: trimmedUserContent }
          ],
          agentRegistry.current,
          { maxTokens: 1200 }
        );
        if (fcResult.toolResults.length > 0) {
          nativeFCToolResults = fcResult.toolResults.map(tr => `**${tr.name}**: ${typeof tr.result.data === 'string' ? tr.result.data : JSON.stringify(tr.result.data).slice(0, 600)}`);
        }
      } catch { /* native function calling is optional - text-parsed tools below */ }

      const toolCalls = AgentToolRegistry.parseToolCalls(responseContent);
      const autoToolCalls = enableFullCaseTreeMatching && !shouldPromptForOutputClarification && !inputSignal.isLowSignal
        ? [
            caseDraft.country.trim()
              ? { name: 'get_country_intelligence', params: { country: caseDraft.country } }
              : null,
            caseDraft.country.trim()
              ? { name: 'calculate_composite_scores', params: { country: caseDraft.country, sector: caseDraft.organizationType || activeIssuePack.label } }
              : null,
            (caseDraft.country.trim() && caseDraft.jurisdiction.trim() && caseDraft.objectives.trim())
              ? {
                  name: 'run_regional_kernel',
                  params: {
                    country: caseDraft.country,
                    jurisdiction: caseDraft.jurisdiction,
                    sector: caseDraft.organizationType || activeIssuePack.label,
                    objective: caseDraft.objectives,
                    currentMatter: caseDraft.currentMatter,
                    constraints: caseDraft.constraints
                  }
                }
              : null,
            (caseDraft.currentMatter.trim() || caseDraft.objectives.trim())
              ? {
                  name: 'recommend_document',
                  params: {
                    situation: caseDraft.currentMatter || caseDraft.objectives,
                    audience: caseDraft.targetAudience || 'general decision audience',
                    urgency: caseDraft.decisionDeadline ? 'near-term' : 'planned'
                  }
                }
              : null
          ].filter(Boolean) as Array<{ name: string; params: Record<string, unknown> }>
        : [];

      const mergedToolCalls = [...toolCalls, ...autoToolCalls];

      // Fire regional intelligence agent when country is known (runs in parallel with tool execution)
      const regionalIntelPromise = (caseDraft.country.trim() && !isGreetingOnly)
        ? quickRegionalIntel(trimmedUserContent, caseDraft.country).catch(() => null)
        : Promise.resolve(null);

      if (!shouldPromptForOutputClarification && (mergedToolCalls.length > 0 || nativeFCToolResults.length > 0)) {
        responseContent = AgentToolRegistry.stripToolCalls(responseContent);
        const toolResultLines: string[] = [...nativeFCToolResults];
        for (const call of mergedToolCalls) {
          try {
            const result = await agentRegistry.current.execute(call.name, call.params);
            const summary = (
              (result.data as { summary?: string })?.summary ??
              (result.success ? JSON.stringify(result.data).slice(0, 600) : `Error: ${result.error}`)
            );
            agentMemory.current.storeToolResult(sessionId.current, call.name, summary);
            toolResultLines.push(`**${call.name}** (${result.latencyMs}ms):\n${summary}`);
          } catch (toolErr) {
            toolResultLines.push(`**${call.name}**: execution failed - ${String(toolErr)}`);
          }
        }
        // Second AI pass: incorporate tool results into the response
        // Merge regional intelligence if available
        const regionalIntel = await regionalIntelPromise;
        if (regionalIntel) {
          toolResultLines.push(`**regional_intelligence** (${regionalIntel.sources} sources):\n${regionalIntel.summary}\nKey facts: ${regionalIntel.keyFacts.slice(0, 5).join('; ')}`);
        }
        const toolContext = toolResultLines.join('\n\n');
        const augmented = await processWithAI(
          `${userContent}\n\n[Live intelligence retrieved]:\n${toolContext}`,
          `You have access to the tool results above. Use them to give a specific, data-grounded response. Identify key matching parts across all available angles (market, risk, governance, audience, outputs). Do NOT emit any more tool calls.`
        );
        if (augmented && augmented.length > 20) {
          responseContent = augmented;
        } else {
          responseContent = `${responseContent}\n\n${toolContext}`;
        }
      }
      // Store this turn in memory for future context recall
      agentMemory.current.storeFact(
        sessionId.current,
        `User: ${userContent.slice(0, 200)} | Response: ${responseContent.slice(0, 300)}`,
        [caseStudy.country, caseStudy.situationType, caseStudy.organizationName].filter(Boolean),
        70
      );
      // ── END TOOL CALL EXECUTION LOOP ─────────────────────────────────────────

      const nextFollowUp = getHighestValueFollowUp(caseDraft);
      const _likelyDirectQuestion = /\?|\b(explain|what|why|how|who|can you|could you|should we)\b/i.test(trimmedUserContent);

      setExecutionTaskStatus('followup', 'completed', 'Follow-up managed by AI response');

      // ── OUTPUT SAFETY PIPELINE: Moderation → PII Scrubbing → Evaluation ────
      const moderationResult = outputModerationService.moderate(responseContent);
      monitoringService.trackModeration(moderationResult.action);
      if (!moderationResult.passed) {
        monitoringService.warn('moderation', `Response flagged: ${moderationResult.action}`, {
          categories: moderationResult.flags.map(f => f.category),
        });
      }
      let safeContent = moderationResult.moderatedText;

      const piiResult = piiDetectionService.scan(safeContent, 'redact');
      if (piiResult.hasPII) {
        safeContent = piiResult.scrubbedText;
        monitoringService.info('pii_detection', `PII redacted: ${piiResult.matches.length} items`, {
          types: piiResult.matches.map(m => m.type),
        });
      }
      responseContent = safeContent;

      // Background: evaluate response quality (non-blocking)
      evaluationFramework.evaluate(trimmedUserContent, responseContent, 'heuristic').catch(() => {});

      // Background: store in persistent vector store for RAG retrieval
      persistentVectorStore.addKnowledge(
        `Q: ${trimmedUserContent.slice(0, 200)} A: ${responseContent.slice(0, 500)}`,
        caseStudy.situationType || 'general',
        0.7
      ).catch(() => {});

      setMessages(prev => prev.map((msg) => (
        msg.id === assistantMessageId ? { ...msg, content: responseContent, phase: inferredPhase } : msg
      )));

      const agenticInsights = await agenticInsightsPromise;
      const actionableInsights = filterActionableInsights(agenticInsights, trimmedUserContent, caseDraft.country).slice(0, 5);

      if (actionableInsights.length > 0 && liveReadiness >= 25 && !isGreetingOnly && !shouldPromptForOutputClarification) {
        const insightSummary = actionableInsights
          .map((insight) => `• ${insight.title}: ${insight.content}`)
          .join('\n');

        // Collect actual engine sources from insights
        const insightSources = [...new Set(actionableInsights.flatMap(i => i.sources || []))].slice(0, 4);

        responseProvenance = buildMessageProvenance(caseDraft, liveReadiness, [`NSIL insights in this turn: ${actionableInsights.length}`]);

        setCaseStudy(prev => ({
          ...prev,
          aiInsights: [...prev.aiInsights, ...actionableInsights.map(i => `${i.title}: ${i.content}`)]
        }));

        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          role: 'system',
          content: `NSIL Agentic Insight\n${insightSummary}`,
          timestamp: new Date(),
          phase: inferredPhase,
          provenance: {
            confidence: Math.min(95, Math.max(50, Math.round(
              actionableInsights.reduce((sum, i) => sum + (i.confidence * 100), 0) / actionableInsights.length
            ))),
            confidenceBand: liveReadiness >= 75 ? 'high' : liveReadiness >= 40 ? 'medium' : 'low',
            sources: insightSources.length > 0 ? insightSources : ['NSIL Agentic Insight Engine', `Readiness score: ${liveReadiness}%`]
          }
        }]);
      } else if (agenticInsights.length > 0 && actionableInsights.length === 0) {
        setExecutionTaskStatus('insight', 'skipped', 'Low-signal NSIL insights suppressed');
      }

      setMessages(prev => prev.map((msg) => (
        msg.id === assistantMessageId
          ? { ...msg, content: responseContent, phase: inferredPhase, provenance: responseProvenance }
          : msg
      )));

      if (liveReadiness >= CASE_COMPLETION_THRESHOLD) {
        generateRecommendations();
      }

      // ── AUGMENTED RESPONSE LEARNING ──────────────────────────────────────
      // Parse the AI response for new case signals the system can learn from
      const responseSignals = extractConsultantSignals(responseContent);
      const learnedFields: string[] = [];
      setCaseStudy(prev => {
        const next = { ...prev };
        if (responseSignals.country && !next.country.trim()) { next.country = responseSignals.country; learnedFields.push('country'); }
        if (responseSignals.jurisdiction && !next.jurisdiction.trim()) { next.jurisdiction = responseSignals.jurisdiction; learnedFields.push('jurisdiction'); }
        if (responseSignals.organizationName && !next.organizationName.trim()) { next.organizationName = responseSignals.organizationName; learnedFields.push('organization'); }
        if (responseSignals.organizationType && !next.organizationType.trim()) { next.organizationType = responseSignals.organizationType; learnedFields.push('org type'); }
        if (responseSignals.targetAudience && !next.targetAudience.trim()) { next.targetAudience = responseSignals.targetAudience; learnedFields.push('audience'); }
        if (responseSignals.objectives && next.objectives.trim().length < 20) { next.objectives = responseSignals.objectives; learnedFields.push('objectives'); }
        if (responseSignals.constraints && next.constraints.trim().length < 20) { next.constraints = responseSignals.constraints; learnedFields.push('constraints'); }
        return next;
      });

      // ── KEEP REACTIVE STATUS ALIVE ─────────────────────────────────────────
      // Show what was just processed so Reactive stays "Online" between turns
      const reactiveSignalCount = [responseSignals.country, responseSignals.organizationName, responseSignals.objectives, responseSignals.targetAudience]
        .filter(Boolean).length + extractedFieldCount;
      const reactiveStatusText = reactiveSignalCount > 0
        ? `Reactive: ${reactiveSignalCount} signal${reactiveSignalCount !== 1 ? 's' : ''} captured - case updated`
        : `Reactive: monitoring - readiness ${liveReadiness}%`;
      const reactiveHintText = learnedFields.length > 0
        ? `Learned from this turn: ${learnedFields.join(', ')}. Keep adding detail to improve output quality.`
        : nextFollowUp
          ? `Suggest next: ${nextFollowUp}`
          : 'Continue sharing details - the consultant is building your case in real time.';
      setReactiveDraftStatus(reactiveStatusText);
      setReactiveDraftHint(reactiveHintText);

      // Show report options AFTER AI has demonstrated it understood the document
      // Do NOT re-show the panel when the user has already selected a tier and generation is underway
      if (hadFileUpload && !isReportGeneration) {
        setShowReportOptions(true);
        // Auto-save the AI's document analysis into the Final Report workspace
        if (responseContent.length > 300) {
          const docTitle = reportOptionsDocTitle || uploadedFiles[0]?.name.replace(/\.[^/.]+$/, '') || 'Document Analysis';
          setGeneratedDocuments(prev => {
            if (prev.some(d => d.title.includes(docTitle))) return prev;
            return [...prev, {
              id: `nexus-analysis-${Date.now()}`,
              title: `NEXUS AI Analysis - ${docTitle}`,
              content: responseContent,
              category: 'report' as const,
              htmlContent: responseContent
                .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                .replace(/\n\n/g, '</p><p>')
                .replace(/\n/g, '<br/>')
                .replace(/^/, '<p>')
                .replace(/$/, '</p>'),
            }];
          });
        }
      }

      // Auto-save the generated formal document to Final Report workspace
      if (isReportGeneration && responseContent.length > 300) {
        const docTitle = `${reportTierLabel}${reportOptionsDocTitle ? ` - ${reportOptionsDocTitle}` : ''}`;
        setGeneratedDocuments(prev => {
          if (prev.some(d => d.title === docTitle)) return prev;
          return [...prev, {
            id: `gen-report-${Date.now()}`,
            title: docTitle,
            content: responseContent,
            category: 'report' as const,
            htmlContent: responseContent
              .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
              .replace(/## (.+)/g, '<h2>$1</h2>')
              .replace(/\n\n/g, '</p><p>')
              .replace(/\n/g, '<br/>')
              .replace(/^/, '<p>')
              .replace(/$/, '</p>'),
          }];
        });
      }

      // Live Intel: fetch real data for detected country
      if (caseDraft.country) {
        fetchLiveIntelForCountry(caseDraft.country);
      }

      // Action execution: queue document generation action when case is ready
      if (liveReadiness >= CASE_COMPLETION_THRESHOLD && inferredPhase === 'recommendations') {
        queueAction({
          id: `gen-docs-${Date.now()}`,
          label: 'Generate Case Documents',
          description: `Case readiness at ${liveReadiness}% - ready to generate institutional documents and letters.`,
          category: 'document'
        });
      }

    } catch (error) {
      console.error('Send error:', error);
      setExecutionTaskStatus('response', 'failed', 'Response pipeline failed');

      // Detect API key / rate limit issues and surface them clearly
      const errMsg = String(error instanceof Error ? error.message : error);
      const isApiKeyIssue = errMsg.includes('API KEY REQUIRED') || errMsg.includes('API key') || errMsg.includes('401') || errMsg.includes('403');
      const isRateLimited = errMsg.includes('429') || errMsg.includes('rate limit');

      let fallbackContent: string;
      if (isApiKeyIssue) {
        fallbackContent = '⚠️ **AI Service Not Configured**\n\nConfigure at least one server-side AI provider key in your `.env` file:\n\n1. **OpenAI**: set `OPENAI_API_KEY`\n2. **Together.ai**: set `TOGETHER_API_KEY`\n3. **Groq**: set `GROQ_API_KEY`\n\nThen restart the server so the backend API can use the provider.';
      } else if (isRateLimited) {
        fallbackContent = '⏳ **Rate Limit Reached**\n\nThe AI service is temporarily rate-limited. Please wait a moment and try again. Your query has been preserved.';
      } else {
        fallbackContent = 'I encountered an error processing your request. Please try again in a moment.';
      }
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: fallbackContent,
        timestamp: new Date(),
        phase: currentPhase
      };
      setMessages(prev => {
        // If the last assistant message is still the placeholder, update it
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant' && (!last.content || last.content.length < 5)) {
          return prev.map(m => m.id === last.id ? { ...m, content: fallbackContent } : m);
        }
        return [...prev, errorMessage];
      });
    } finally {
      setIsStreamingResponse(false);
      setIsLoading(false);

      // ── PERSIST CONVERSATION & TRIGGER LEARNING ──────────────────────────
      // Store messages in IndexedDB for cross-session memory and trigger
      // the self-learning loop to extract corrections/preferences/facts.
      try {
        const recentMsgs = messages.slice(-2);
        for (const m of recentMsgs) {
          if (m.role === 'user' || m.role === 'assistant') {
            // Track in ConversationMemoryManager (rolling summary + recent turns)
            conversationMemoryManager.addTurn(m.role as 'user' | 'assistant', m.content).catch(() => {});
            // Persist to IndexedDB
            conversationStore.addMessage(
              'default',
              m.role as 'user' | 'assistant',
              m.content
            ).catch(() => {/* non-fatal */});
          }
        }
        // Every 6 messages, extract learnings for self-improvement
        if (messages.length > 4 && messages.length % 6 === 0) {
          const allMsgs = messages
            .filter(m => m.role === 'user' || m.role === 'assistant')
            .map(m => ({ role: m.role, content: m.content }));
          learnFromConversation('default', allMsgs).catch(() => {/* non-fatal */});
        }
      } catch { /* conversation persistence is optional */ }
    }
  }, [
    inputValue,
    uploadedFiles,
    classifyConsultantInput,
    currentPhase,
    initializeExecutionTimeline,
    setExecutionTaskStatus,
    readFileContent,
    processWithAIStream,
    generateRecommendations,
    caseStudy,
    computeReadiness,
    buildMessageProvenance,
    readinessScore,
    toAgenticParams,
    getHighestValueFollowUp,
    classifyDeliverableIntent,
    shouldAskOutputClarification,
    buildOutputClarificationPrompt,
    filterActionableInsights,
    extractConsultantSignals,
    fetchLiveIntelForCountry,
    processWithAI,
    enableFullCaseTreeMatching,
    fullSpectrumReasoningMode,
    activeIssuePack.label,
    queueAction,
    reportOptionsDocTitle,
    messages,
  ]);

  // Handle file selection
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setUploadedFiles(prev => [...prev, ...files]);
  }, []);

  const getCriticalCaseGaps = useCallback(() => {
    const hasEvidenceNote = caseStudy.additionalContext.some((item) => item.startsWith('Evidence Note:'));

    const checks: CriticalCaseGap[] = [
      {
        missing: caseStudy.currentMatter.trim().length < 80,
        label: 'Problem statement depth',
        question: 'What exactly is happening, who is involved, and what decision must be made?',
        severity: 'critical',
        weight: 100
      },
      {
        missing: caseStudy.objectives.trim().length < 30,
        label: 'Clear objective',
        question: 'What measurable outcome are you targeting and what does success look like?',
        severity: 'critical',
        weight: 95
      },
      {
        missing: caseStudy.targetAudience.trim().length < 3,
        label: 'Decision audience',
        question: 'Who is the primary decision audience (board, regulator, investor, ministry, etc.)?',
        severity: 'high',
        weight: 80
      },
      {
        missing: caseStudy.country.trim().length < 2 || caseStudy.jurisdiction.trim().length < 2,
        label: 'Jurisdiction clarity',
        question: 'Which country and legal/regulatory jurisdiction must the outputs follow?',
        severity: 'critical',
        weight: 90
      },
      {
        missing: caseStudy.decisionDeadline.trim().length < 3,
        label: 'Timeline and urgency',
        question: 'What is the hard decision deadline and what happens if this slips?',
        severity: 'high',
        weight: 75
      },
      {
        missing: caseStudy.constraints.trim().length < 15,
        label: 'Constraints and limits',
        question: 'What constraints (budget, politics, legal, resources) cannot be violated?',
        severity: 'high',
        weight: 70
      },
      {
        missing: caseStudy.uploadedDocuments.length === 0 && !hasEvidenceNote,
        label: 'Supporting evidence',
        question: 'Please upload at least one supporting document or provide verifiable evidence details.',
        severity: 'medium',
        weight: 50
      }
    ];

    const hardcodedGaps = checks
      .filter((item) => item.missing)
      .sort((a, b) => b.weight - a.weight);

    // Run InputValidationEngine - catches adversarial content, numeric contradictions, fraud patterns
    let engineGaps: CriticalCaseGap[] = [];
    try {
      const report = new InputValidationEngine().validate(caseStudy as unknown as Record<string, unknown>);
      engineGaps = report.issues
        .filter((issue) => issue.severity === 'critical' || issue.severity === 'high')
        .map((issue) => ({
          missing: true,
          label: issue.message,
          question: issue.recommendation,
          severity: issue.severity as CriticalGapSeverity,
          weight: issue.severity === 'critical' ? 85 : 60,
        }));
    } catch (_e) { /* validation engine unavailable - skip */ }

    return [...hardcodedGaps, ...engineGaps];
  }, [caseStudy]);

  const _handleAskNextCriticalQuestion = useCallback(() => {
    const gaps = getCriticalCaseGaps();
    if (gaps.length === 0) return;

    const nextGap = gaps[0];
    setCurrentPhase('discovery');
    setMessages(prev => [...prev, {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: `Highest-priority gap (${nextGap.severity.toUpperCase()}): ${nextGap.label}\n${nextGap.question}`,
      timestamp: new Date(),
      phase: 'discovery'
    }]);
    setInputValue(nextGap.question);
  }, [getCriticalCaseGaps]);

  const extractQuickGapEntities = useCallback((input: string): ExtractedEntitySuggestion[] => {
    const normalized = input.trim();
    if (!normalized) return [];

    const lower = normalized.toLowerCase();
    const suggestions: ExtractedEntitySuggestion[] = [];

    const audienceMap: Array<{ pattern: RegExp; value: string; confidence: EntityConfidence }> = [
      { pattern: /\bboard\b/i, value: 'Board', confidence: 'high' },
      { pattern: /\bregulator|agency|ministry\b/i, value: 'Regulator / Ministry', confidence: 'high' },
      { pattern: /\binvestor|investment committee|fund\b/i, value: 'Investor Committee', confidence: 'high' },
      { pattern: /\bcourt|tribunal|legal counsel\b/i, value: 'Court / Legal Counsel', confidence: 'high' },
      { pattern: /\bexecutive|leadership|c-suite\b/i, value: 'Executive Team', confidence: 'medium' }
    ];

    const matchedAudience = audienceMap.find((item) => item.pattern.test(normalized));
    if (matchedAudience) {
      suggestions.push({
        key: 'audience',
        label: 'Audience',
        value: matchedAudience.value,
        confidence: matchedAudience.confidence
      });
    }

    const parts = normalized.split(/[,/|-]/).map((part) => part.trim()).filter(Boolean);
    const jurisdictionByParts = parts.length > 1
      ? { country: parts[0], jurisdiction: parts.slice(1).join(' / ') }
      : null;

    const triggerToRegion: Array<{ trigger: string; country: string; jurisdiction: string }> = [
      { trigger: 'australia', country: 'Australia', jurisdiction: 'National / State' },
      { trigger: 'philippines', country: 'Philippines', jurisdiction: 'National / LGU' },
      { trigger: 'european union', country: 'European Union', jurisdiction: 'EU Governance' },
      { trigger: 'eu', country: 'European Union', jurisdiction: 'EU Governance' },
      { trigger: 'saudi', country: 'Saudi Arabia', jurisdiction: 'MENA Regulatory' },
      { trigger: 'uae', country: 'UAE', jurisdiction: 'MENA Regulatory' }
    ];

    const matchedJurisdiction = triggerToRegion.find((item) => lower.includes(item.trigger));

    const detectedCountry = jurisdictionByParts?.country || matchedJurisdiction?.country || null;
    if (detectedCountry) {
      suggestions.push({
        key: 'country',
        label: 'Country',
        value: detectedCountry,
        confidence: jurisdictionByParts?.country ? 'high' : 'medium'
      });
    }

    const detectedJurisdiction = jurisdictionByParts?.jurisdiction || matchedJurisdiction?.jurisdiction || null;
    if (detectedJurisdiction) {
      suggestions.push({
        key: 'jurisdiction',
        label: 'Jurisdiction',
        value: detectedJurisdiction,
        confidence: jurisdictionByParts?.jurisdiction ? 'high' : 'medium'
      });
    }

    const deadlineByPhrase = normalized.match(/\b(?:by|before|due|deadline)\s*[:-]?\s*([^.\n]{4,80})/i)?.[1]?.trim();
    const deadlineByPattern = normalized.match(/\b(?:Q[1-4]\s?\d{4}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|[A-Za-z]+\s+\d{4})\b/)?.[0];
    const detectedDeadline = deadlineByPhrase || deadlineByPattern || null;
    if (detectedDeadline) {
      suggestions.push({
        key: 'deadline',
        label: 'Deadline',
        value: detectedDeadline,
        confidence: deadlineByPhrase ? 'high' : 'medium'
      });
    }

    const hasEvidenceSignal = /\b(evidence|annex|attachment|dataset|source|report|metric|kpi|%|\$|http)\b/i.test(normalized) || /\d{2,}/.test(normalized);
    if (hasEvidenceSignal) {
      suggestions.push({
        key: 'evidenceNote',
        label: 'Evidence Note',
        value: normalized,
        confidence: /\b(attachment|dataset|source|http)\b/i.test(normalized) ? 'high' : 'medium'
      });
    }

    const uniqueSuggestions = suggestions.reduce<ExtractedEntitySuggestion[]>((acc, suggestion) => {
      if (!acc.some((item) => item.key === suggestion.key)) {
        acc.push(suggestion);
      }
      return acc;
    }, []);

    return uniqueSuggestions;
  }, []);

  const extractedEntitySuggestions = useMemo(
    () => extractQuickGapEntities(topGapQuickInput),
    [topGapQuickInput, extractQuickGapEntities]
  );

  useEffect(() => {
    setEntityDecisions({} as Partial<Record<ExtractedEntityKey, 'accepted' | 'rejected'>>);
  }, [topGapQuickInput]);

  const _handleApplyHighConfidence = useCallback(() => {
    const highConfidence = extractedEntitySuggestions.filter((item) => item.confidence === 'high');
    if (highConfidence.length === 0) return;

    setEntityDecisions((prev) => {
      const next = { ...prev };
      highConfidence.forEach((item) => {
        next[item.key] = 'accepted';
      });
      return next;
    });
  }, [extractedEntitySuggestions]);

  const _handleRejectAllSuggestions = useCallback(() => {
    if (extractedEntitySuggestions.length === 0) return;

    setEntityDecisions((prev) => {
      const next = { ...prev };
      extractedEntitySuggestions.forEach((item) => {
        next[item.key] = 'rejected';
      });
      return next;
    });
  }, [extractedEntitySuggestions]);

  const _handleRejectLowConfidence = useCallback(() => {
    const lowConfidence = extractedEntitySuggestions.filter((item) => item.confidence === 'low');
    if (lowConfidence.length === 0) return;

    setEntityDecisions((prev) => {
      const next = { ...prev };
      lowConfidence.forEach((item) => {
        next[item.key] = 'rejected';
      });
      return next;
    });
  }, [extractedEntitySuggestions]);

  const _handleResetSuggestionDecisions = useCallback(() => {
    setEntityDecisions({} as Partial<Record<ExtractedEntityKey, 'accepted' | 'rejected'>>);
  }, []);

  const decidedSuggestionCount = extractedEntitySuggestions.filter((item) => entityDecisions[item.key]).length;
  const _acceptedSuggestionCount = extractedEntitySuggestions.filter((item) => entityDecisions[item.key] === 'accepted').length;
  const pendingSuggestionCount = extractedEntitySuggestions.length - decidedSuggestionCount;
  const decisionCompletenessPct = extractedEntitySuggestions.length === 0
    ? 100
    : Math.round((decidedSuggestionCount / extractedEntitySuggestions.length) * 100);

  const _handleResolveTopGap = useCallback(() => {
    const response = topGapQuickInput.trim();
    if (!response) return;

    if (extractedEntitySuggestions.length > 0 && pendingSuggestionCount > 0) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `Please confirm or reject all detected entities before resolving the top gap. Completeness is currently ${decisionCompletenessPct}%.`,
          timestamp: new Date(),
          phase: 'discovery'
        }
      ]);
      return;
    }

    const gaps = getCriticalCaseGaps();
    if (gaps.length === 0) return;

    const topGap = gaps[0];
    const acceptedSuggestions = extractedEntitySuggestions.filter(
      (item) => entityDecisions[item.key] === 'accepted'
    );
    const acceptedSuggestionMap = acceptedSuggestions.reduce<Partial<Record<ExtractedEntityKey, string>>>((acc, item) => {
      acc[item.key] = item.value;
      return acc;
    }, {});
    const applied: string[] = [];

    setCaseStudy((prev) => {
      let next = { ...prev };

      if (topGap.label === 'Problem statement depth') {
        next.currentMatter = response;
        applied.push('problem statement');
      }
      if (topGap.label === 'Clear objective') {
        next.objectives = response;
        applied.push('objective');
      }
      if (topGap.label === 'Decision audience') {
        next.targetAudience = response;
        applied.push('audience');
      }
      if (topGap.label === 'Jurisdiction clarity') {
        const parts = response.split(/[,/|-]/).map((part) => part.trim()).filter(Boolean);
        next.country = parts[0] || prev.country;
        next.jurisdiction = parts.slice(1).join(' / ') || response;
        applied.push('jurisdiction');
      }
      if (topGap.label === 'Timeline and urgency') {
        next.decisionDeadline = response;
        applied.push('deadline');
      }
      if (topGap.label === 'Constraints and limits') {
        next.constraints = response;
        applied.push('constraints');
      }
      if (topGap.label === 'Supporting evidence') {
        if (!prev.additionalContext.some((item) => item === `Evidence Note: ${response}`)) {
          next.additionalContext = [...next.additionalContext, `Evidence Note: ${response}`];
        }
        applied.push('evidence note');
      }

      if (acceptedSuggestionMap.audience && (!next.targetAudience || topGap.label === 'Decision audience')) {
        next.targetAudience = acceptedSuggestionMap.audience;
        if (!applied.includes('audience')) applied.push('audience(auto)');
      }
      if (acceptedSuggestionMap.country && (!next.country || topGap.label === 'Jurisdiction clarity')) {
        next.country = acceptedSuggestionMap.country;
        if (!applied.includes('country')) applied.push('country(auto)');
      }
      if (acceptedSuggestionMap.jurisdiction && (!next.jurisdiction || topGap.label === 'Jurisdiction clarity')) {
        next.jurisdiction = acceptedSuggestionMap.jurisdiction;
        if (!applied.includes('jurisdiction')) applied.push('jurisdiction(auto)');
      }
      if (acceptedSuggestionMap.deadline && (!next.decisionDeadline || topGap.label === 'Timeline and urgency')) {
        next.decisionDeadline = acceptedSuggestionMap.deadline;
        if (!applied.includes('deadline')) applied.push('deadline(auto)');
      }
      if (acceptedSuggestionMap.evidenceNote && !next.additionalContext.some((item) => item === `Evidence Note: ${acceptedSuggestionMap.evidenceNote}`)) {
        next.additionalContext = [...next.additionalContext, `Evidence Note: ${acceptedSuggestionMap.evidenceNote}`];
        if (!applied.includes('evidence note')) applied.push('evidence note(auto)');
      }

      return next;
    });

    const nextGap = gaps[1];

    setCurrentPhase('discovery');
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Captured top-gap input for ${topGap.label}. Updated fields: ${applied.join(', ') || 'case context'} and reprioritized remaining gaps.${nextGap ? `\n\nNext critical gap: ${nextGap.label}\n${nextGap.question}` : '\n\nNo immediate critical gap remains. Continue with discovery or proceed to recommendations.'}`,
        timestamp: new Date(),
        phase: 'discovery'
      }
    ]);
    setTopGapQuickInput('');
  }, [topGapQuickInput, pendingSuggestionCount, decisionCompletenessPct, getCriticalCaseGaps, extractedEntitySuggestions, entityDecisions]);

  // Copy generated content
  const copyContent = useCallback(() => {
    if (generatedContent) {
      navigator.clipboard.writeText(generatedContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [generatedContent]);

  // Download as print-quality HTML - open in browser then File > Print > Save as PDF
  const downloadContent = useCallback(() => {
    if (generatedDocuments.length > 0) {
      // Download each document as a standalone styled HTML file
      generatedDocuments.forEach((doc) => {
        const blob = new Blob([doc.htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${doc.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.html`;
        a.click();
        URL.revokeObjectURL(url);
      });
    } else if (generatedContent) {
      // Fallback: raw markdown
      const blob = new Blob([generatedContent], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bw-document-${Date.now()}.md`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }, [generatedContent, generatedDocuments]);

  const downloadSingleDoc = useCallback((doc: {title: string; htmlContent: string; content: string}) => {
    const blob = new Blob([doc.htmlContent || doc.content], { type: doc.htmlContent ? 'text/html' : 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const downloadSingleDocAsDocx = useCallback(async (doc: {title: string; content: string; category: 'report' | 'letter'}) => {
    const meta: DocxDocumentMeta = {
      title: doc.title,
      subtitle: `${caseStudy.organizationName || 'Client'} - ${caseStudy.country || 'Global'}`,
      preparedFor: caseStudy.organizationName || 'Client',
      preparedBy: 'BW Global Advisory - NEXUS AI',
      date: new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' }),
      reportId: `BWGA-${new Date().getFullYear()}-${(caseStudy.country || 'GL').slice(0, 2).toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      classification: 'CONFIDENTIAL',
      jurisdiction: caseStudy.jurisdiction || caseStudy.country,
      strategicReadiness: strategicPipeline?.readinessScore,
      evidenceCredibility: overlookedIntelligence?.evidenceCredibility,
      perceptionRealityGap: overlookedIntelligence?.perceptionRealityGap,
      topRegionalOpportunities: overlookedIntelligence?.topRegionalOpportunities,
      engagementDraftHints: strategicPipeline?.engagementDraftHints
    };
    await downloadAsDocx(doc.content, meta);
  }, [caseStudy, strategicPipeline, overlookedIntelligence]);

  // Generate selected documents
  const handleGenerateDocuments = useCallback(async () => {
    // Helper: parse AI markdown output into DocumentSection[]
    const parseMarkdown = (text: string): DocumentSection[] => {
      const sections: DocumentSection[] = [];
      const lines = text.split('\n');
      let current: { title: string; lines: string[] } | null = null;
      for (const line of lines) {
        if (/^#{1,3}\s/.test(line)) {
          if (current && current.lines.join('').trim()) {
            sections.push({ title: current.title, content: current.lines.join('\n').trim(), type: 'paragraph' });
          }
          current = { title: line.replace(/^#+\s*/, '').trim(), lines: [] };
        } else if (current) {
          current.lines.push(line);
        } else {
          current = { title: 'Overview', lines: [line] };
        }
      }
      if (current && current.lines.join('').trim()) {
        sections.push({ title: current.title, content: current.lines.join('\n').trim(), type: 'paragraph' });
      }
      return sections.filter(s => String(s.content).trim().length > 2);
    };

    // Helper: wrap AI content + case metadata into a ProfessionalDocument
    const buildProfDoc = (content: string, doc: DocumentOption): ProfessionalDocument => {
      const sections = parseMarkdown(content);
      return {
        title: doc.title.toUpperCase(),
        subtitle: `${caseStudy.organizationName || 'Client'} - ${caseStudy.country || 'Global'}`,
        classification: 'CONFIDENTIAL',
        preparedFor: caseStudy.organizationName || 'Client',
        preparedBy: 'BW Global Advisory - NEXUS AI',
        date: new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' }),
        reportId: `BWGA-${new Date().getFullYear()}-${(caseStudy.country || 'GL').slice(0, 2).toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        version: '1.0',
        sections: sections.length > 0 ? sections : [{ title: doc.title, content, type: 'paragraph' }],
        footer: {
          company: 'BW Global Advisory',
          disclaimer: `Prepared exclusively for ${caseStudy.organizationName || 'the named recipient'}. Confidential - do not distribute without prior written authorisation.`
        }
      };
    };

    const effectiveDocIds = generationScope === 'selected'
      ? selectedDocs
      : generationScope === 'full-pack'
        ? recommendedDocs.map((doc) => doc.id)
        : generationScope === 'case-study-only'
          ? (() => {
              const caseStudyReports = recommendedDocs
                .filter((doc) => doc.category === 'report' && /case study|executive summary|assessment|memorandum/i.test(doc.title))
                .map((doc) => doc.id);

              if (caseStudyReports.length > 0) return caseStudyReports;

              const fallbackReport = recommendedDocs.find((doc) => doc.category === 'report');
              return fallbackReport ? [fallbackReport.id] : [];
            })()
      : recommendedDocs
          .filter((doc) => generationScope === 'letters-only' ? doc.category === 'letter' : doc.category === 'report')
          .map((doc) => doc.id);

    if (effectiveDocIds.length === 0) {
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: generationScope === 'letters-only'
          ? 'No letter outputs are currently available. Add or select letter-type outputs first.'
          : generationScope === 'reports-only'
            ? 'No report outputs are currently available. Add or select report-type outputs first.'
            : generationScope === 'case-study-only'
              ? 'No case-study report outputs are currently available. Select or add case-study style reports first.'
              : generationScope === 'full-pack'
                ? 'No outputs are currently available for full-pack generation. Build recommendations first.'
            : 'Select at least one output before generation.',
        timestamp: new Date(),
        phase: 'recommendations'
      }]);
      return;
    }

    if (!consultantGateReady) {
      setCurrentPhase('discovery');
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Generation blocked by consultant gate. Complete these required inputs first:\n- ${consultantGateMissing.join('\n- ')}`,
        timestamp: new Date(),
        phase: 'recommendations'
      }]);
      return;
    }

    const criticalCaseGaps = getCriticalCaseGaps().filter(g => g.severity === 'critical' || g.severity === 'high');
    if (criticalCaseGaps.length > 0) {
      setCurrentPhase('discovery');
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Before generation, resolve these prioritized case gaps:\n- ${criticalCaseGaps.slice(0, 4).map((gap) => `${gap.severity.toUpperCase()}: ${gap.label}`).join('\n- ')}\n\nUse "Ask Next Critical Question" or "Resolve Top Gap" to close the highest-impact gap first.`,
        timestamp: new Date(),
        phase: 'recommendations'
      }]);
      return;
    }

    if (readinessScore < 70) {
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Your case file readiness is ${readinessScore}%. I need at least 70% before generation. Complete the key case fields (organisation, jurisdiction, objective, current matter) or continue answering questions to reach 70%.`,
        timestamp: new Date(),
        phase: 'recommendations'
      }]);
      return;
    }
    if (!allowAllDocumentAccess) {
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Please enable access to all relevant uploaded material before final generation. This improves accuracy, page estimates, and evidence traceability.',
        timestamp: new Date(),
        phase: 'recommendations'
      }]);
      return;
    }
    
    setCurrentPhase('generation');
    setIsLoading(true);
    setFeedbackSignal(null);
    setFeedbackNote('');
    setFeedbackSubmitted(false);
    setGeneratedDocuments([]);

    const docsToGenerate = effectiveDocIds
      .map(id => recommendedDocs.find(d => d.id === id))
      .filter((d): d is DocumentOption => Boolean(d));

    setGeneratingProgress({ current: 0, total: docsToGenerate.length });

    // ── ReportOrchestrator pre-assembly (best-effort enrichment) ─────────────
    let orchestratorSummary = '';
    try {
      const orchestratorParams = {
        organizationName: caseStudy.organizationName,
        userName: caseStudy.userName,
        country: caseStudy.country,
        region: caseStudy.jurisdiction,
        organizationType: caseStudy.organizationType,
        userDepartment: caseStudy.contactRole,
        problemStatement: caseStudy.currentMatter,
        strategicObjectives: [caseStudy.objectives].filter(Boolean),
        constraints: caseStudy.constraints,
        targetAudience: caseStudy.targetAudience,
        expansionTimeline: caseStudy.decisionDeadline,
        additionalContext: caseStudy.additionalContext,
        uploadedDocuments: caseStudy.uploadedDocuments,
      } as unknown as Parameters<typeof ReportOrchestrator.assembleReportPayload>[0];
      // ── DecisionPipeline governance gate ────────────────────────────────
      let decisionPacket: DecisionPacket | null = null;
      try {
        const dpResult = await DecisionPipeline.run(orchestratorParams as unknown as Parameters<typeof DecisionPipeline.run>[0]);
        decisionPacket = dpResult.packet;
      } catch {
        // Non-critical - governance gate may be unavailable in offline mode
      }

      const payload = await ReportOrchestrator.assembleReportPayload(orchestratorParams);
      const p_ = payload as unknown as Record<string, unknown>;
      const spi = p_.spi as { overallScore?: unknown; verdict?: unknown } | undefined;
      const rroi = p_.rroi as { projectedROI?: unknown; paybackPeriod?: unknown } | undefined;
      const ethical = p_.ethicalCheck as { passed?: boolean; flags?: string[] } | undefined;
      orchestratorSummary = [
        spi ? `SPI Score: ${spi.overallScore ?? ''}  |  ${spi.verdict ?? ''}` : '',
        rroi ? `RROI Projection: ${rroi.projectedROI ?? ''}  |  Breakeven: ${rroi.paybackPeriod ?? ''}` : '',
        ethical?.passed === false ? `⚠ Ethical flags: ${(ethical.flags ?? []).join(', ')}` : '',
        decisionPacket ? `Governance gate: ${decisionPacket.exports.reportReady ? '✓ PASSED' : '⚠ BLOCKERS'}` : '',
        decisionPacket?.exports.blockers.length ? `Blockers: ${decisionPacket.exports.blockers.join('; ')}` : '',
        decisionPacket?.scores?.overall !== undefined ? `Decision score: ${decisionPacket.scores.overall}` : '',
      ].filter(Boolean).join('\n');
    } catch {
      // Non-critical - orchestrator may block on gate; continue without it
    }

    const allResults: Array<{id: string; title: string; content: string; category: 'report'|'letter'; htmlContent: string}> = [];

    try {
      for (let i = 0; i < docsToGenerate.length; i++) {
        const doc = docsToGenerate[i];
        setGeneratingProgress({ current: i + 1, total: docsToGenerate.length });

        const isLetter = doc.category === 'letter';
        const audienceNote = caseStudy.targetAudience ? ` for ${caseStudy.targetAudience}` : '';

        // ── Try DocumentTypeRouter section-prompt-driven generation first ──────
        const brainBlock = brainCtxRef.current?.promptBlock || '';
        const caseContextStr = [
          `Organization: ${caseStudy.organizationName || 'Not specified'}`,
          `Country / Jurisdiction: ${caseStudy.country || 'Not specified'}`,
          `Sector / Situation: ${caseStudy.situationType || 'Not specified'}`,
          `Objective: ${caseStudy.currentMatter || 'Not specified'}`,
          `Target Audience: ${caseStudy.targetAudience || 'Not specified'}`,
          `Constraints: ${caseStudy.constraints || 'Standard commercial terms'}`,
          orchestratorSummary ? `\n── Report Orchestrator ──\n${orchestratorSummary}` : '',
        ].filter(Boolean).join('\n');

        let content = '';

        if (isLetter) {
          // Route letter - uses exact match or category-aware fallback
          const letterRoute = DocumentTypeRouter.routeLetterWithFallback(doc.id, doc.category || 'general', doc.title);
          const { promptInstruction } = letterRoute;
          const aiPrompt = [
            `You are BW Global Advisory writing a professional institutional letter.`,
            `Letter Type: ${doc.title}${audienceNote}`,
            ``,
            `### Letter Brief`,
            promptInstruction,
            ``,
            `### Case Context`,
            caseContextStr,
            ``,
            `### Intelligence Context`,
            brainBlock,
            ``,
            `Write the complete letter now. Formal, institutional tone. No placeholders. Jurisdiction: ${caseStudy.jurisdiction || caseStudy.country || 'Global'}.`,
          ].join('\n');
          content = await processWithAI(aiPrompt, `Generating letter ${i + 1}/${docsToGenerate.length}: ${doc.title}`);
        } else {
          // Route document - uses exact match or category-aware fallback with sections
          const docRoute = DocumentTypeRouter.routeDocumentWithFallback(doc.id, doc.category || 'strategic', doc.title);
          const { sectionPrompts } = docRoute;
          const sectionContents: string[] = [];

          for (let s = 0; s < sectionPrompts.length; s++) {
            const sp = sectionPrompts[s];
            const sectionPrompt = [
              `## Document Section: ${sp.title}`,
              ``,
              `### Your Instructions`,
              sp.prompt,
              ``,
              `### Case Context`,
              caseContextStr,
              ``,
              `### Intelligence Context (use real data from this to strengthen the section)`,
              brainBlock,
              ``,
              `### Constraints`,
              `- Maximum ${sp.maxWords} words for this section`,
              `- Professional document prose - not bullet lists unless the instruction specifies it`,
              `- Ground all claims in the case context and intelligence data above`,
              `- Begin directly with the content - no meta-commentary`,
            ].join('\n');

            const sectionContent = await processWithAI(
              sectionPrompt,
              `Generating section ${s + 1}/${sectionPrompts.length} - "${sp.title}" - for ${doc.title}`
            );
            sectionContents.push(`## ${sp.title}\n\n${sectionContent}`);
          }
          content = sectionContents.join('\n\n');
        }

        const profDoc = buildProfDoc(content, doc);
        const htmlContent = ProfessionalDocumentExporter.exportToHTML(profDoc);

        const result = { id: doc.id, title: doc.title, content, category: doc.category, htmlContent };
        allResults.push(result);
        setGeneratedDocuments(prev => [...prev, result]);
      }

      const combined = allResults.map(r => `## ${r.title}\n\n${r.content}`).join('\n\n---\n\n');
      setGeneratedContent(combined);

      const genReportId = crypto.randomUUID();
      setMessages(prev => [...prev, {
        id: genReportId,
        role: 'assistant',
        content: `${allResults.length} document${allResults.length !== 1 ? 's' : ''} generated:\n${allResults.map((r, i) => `${i + 1}. **${r.title}**`).join('\n')}\n\nEach document is available as a print-ready HTML file from the Document Ready panel. Open in your browser and use File → Print → Save as PDF for a professional PDF.`,
        timestamp: new Date(),
        phase: 'generation'
      }]);
      // Record successful generation as a positive outcome for self-learning
      EventBus.publish({
        type: 'outcomeRecorded',
        reportId: genReportId,
        outcome: {
          success: true,
          notes: `${allResults.length} docs generated - ${caseStudy.country || 'unknown country'}, ${caseStudy.situationType || 'unknown sector'}`
        }
      });
    } catch (error) {
      console.error('Generation error:', error);
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Document generation encountered an error. Check your case information and try again.',
        timestamp: new Date(),
        phase: 'generation'
      }]);
    } finally {
      setIsLoading(false);
      setGeneratingProgress(null);
    }
  }, [selectedDocs, generationScope, readinessScore, allowAllDocumentAccess, recommendedDocs, processWithAI, caseStudy, getCriticalCaseGaps, consultantGateReady, consultantGateMissing]);

  // ─── Autonomous Run - AgentOrchestrator (Together.ai + Llama 3.1 70B) ────────────────
  const handleAutonomousRun = useCallback(async () => {
    if (isAutonomousRunning) return;
    setIsAutonomousRunning(true);
    setAutonomousProgress(null);

    try {
      const result = await AgentOrchestrator.run({
        organizationName: caseStudy.organizationName || 'Unknown Organisation',
        country:           caseStudy.country          || 'Unknown Country',
        sector:            caseStudy.organizationType || 'General',
        organizationType:  caseStudy.organizationType || 'Private Sector',
        objectives:        caseStudy.objectives       || '',
        strategicIntent:   [],
        userName:          caseStudy.userName          || '',
        currentMatter:     caseStudy.currentMatter     || '',
        brainContext:      brainCtxRef.current         || undefined,
        maxDocuments: 5,
        maxLetters:   3,
        onProgress: (p) => setAutonomousProgress({ ...p }),
      });

      if (result.success && result.documents.length > 0) {
        setGeneratedDocuments(prev => [
          ...prev,
          ...result.documents.map(d => ({
            id: d.id,
            title: d.typeName,
            content: d.fullMarkdown,
            category: 'report' as const,
            htmlContent: d.fullMarkdown,
          }))
        ]);
        setMessages(prev => [...prev, {
          id: `agent-done-${Date.now()}`,
          role: 'assistant' as const,
          content: `**Autonomous Run Complete**\n\n` +
            `Generated **${result.documents.length} outputs** (${result.totalWordCount.toLocaleString()} words) ` +
            `in ${(result.durationMs / 1000).toFixed(1)}s using Llama 3.1 70B via Together.ai.\n\n` +
            result.documents.map(d => `• ${d.typeName}`).join('\n'),
          timestamp: new Date(),
          phase: 'generation' as const,
        }]);
      } else {
        setMessages(prev => [...prev, {
          id: `agent-err-${Date.now()}`,
          role: 'assistant' as const,
          content: `Autonomous Run encountered an issue: ${result.error || 'Unknown error'}. Check that VITE_TOGETHER_API_KEY is set in .env.`,
          timestamp: new Date(),
          phase: 'generation' as const,
        }]);
      }
    } catch (err) {
      console.error('[AutonomousRun] Error:', err);
    } finally {
      setIsAutonomousRunning(false);
    }
  }, [isAutonomousRunning, caseStudy, brainCtxRef]);
  const phaseLabels: Record<CasePhase, { label: string; description: string }> = {
    intake: { label: 'Intake', description: 'Understanding who you are' },
    discovery: { label: 'Discovery', description: 'Learning about your situation' },
    analysis: { label: 'Analysis', description: 'Synthesizing insights' },
    recommendations: { label: 'Recommendations', description: 'Selecting documents' },
    generation: { label: 'Generation', description: 'Creating your documents' }
  };

  const primaryRecommendation =
    recommendedDocs.find((doc) => selectedDocs.includes(doc.id)) ||
    recommendedDocs[0] ||
    null;

  const alternativeRecommendations = primaryRecommendation
    ? recommendedDocs.filter((doc) => doc.id !== primaryRecommendation.id).slice(0, 2)
    : [];

  const learningSummary = Object.entries(recommendationBoostMap)
    .filter(([, boost]) => boost !== 0)
    .map(([docId, boost]) => ({
      docId,
      boost,
      title: recommendedDocs.find((doc) => doc.id === docId)?.title || docId
    }));

  const boostedDocuments = learningSummary
    .filter((item) => item.boost > 0)
    .sort((a, b) => b.boost - a.boost)
    .slice(0, 2);

  const penalizedDocuments = learningSummary
    .filter((item) => item.boost < 0)
    .sort((a, b) => a.boost - b.boost)
    .slice(0, 2);

  const missionAuditEvents = useMemo(() => {
    if (!missionSnapshot) return [] as Array<{ timestamp: string; type: 'governance' | 'execution' | 'outcome'; summary: string }>;

    const governanceEvents = missionSnapshot.governanceDecisions.map((decision) => ({
      timestamp: decision.timestamp,
      type: 'governance' as const,
      summary: `${decision.taskId}: ${decision.decision.toUpperCase()} (${decision.reasons[0] || 'No reason recorded'})`
    }));

    const executionEvents = missionSnapshot.executionRecords.map((record) => ({
      timestamp: record.finishedAt,
      type: 'execution' as const,
      summary: `${record.taskId}: ${record.status.toUpperCase()} (retries ${record.retries})`
    }));

    const outcomeEvents = missionSnapshot.latestOutcomes.map((outcome) => ({
      timestamp: missionSnapshot.executionRecords.find((record) => record.taskId === outcome.taskId)?.finishedAt || missionSnapshot.mission.updatedAt,
      type: 'outcome' as const,
      summary: `${outcome.taskId}: ${outcome.verdict.toUpperCase()} (variance ${outcome.variance})`
    }));

    return [...governanceEvents, ...executionEvents, ...outcomeEvents]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 12);
  }, [missionSnapshot]);

  const missionAuditExportPayload = useMemo(() => {
    if (!missionSnapshot) return null;

    return {
      exportedAt: new Date().toISOString(),
      mission: {
        missionId: missionSnapshot.mission.missionId,
        objective: missionSnapshot.mission.objective,
        status: missionSnapshot.mission.status,
        createdAt: missionSnapshot.mission.createdAt,
        updatedAt: missionSnapshot.mission.updatedAt,
        autonomyPaused: missionSnapshot.autonomyPaused
      },
      summary: {
        adaptationScore: Math.round(missionSnapshot.verificationSummary?.adaptationScore ?? 0),
        governanceDecisions: missionSnapshot.governanceDecisions.length,
        executionRecords: missionSnapshot.executionRecords.length,
        outcomes: missionSnapshot.latestOutcomes.length,
        eventsExported: missionAuditEvents.length
      },
      verification: missionSnapshot.verificationSummary ?? null,
      events: missionAuditEvents
    };
  }, [missionSnapshot, missionAuditEvents]);

  const missionAuditCsvContent = useMemo(() => {
    if (!missionSnapshot || missionAuditEvents.length === 0) return '';

    const escapeCsvValue = (value: string | number | null | undefined) => {
      const normalized = String(value ?? '').replace(/"/g, '""');
      return `"${normalized}"`;
    };

    const rows = missionAuditEvents.map((event) => [
      event.timestamp,
      event.type,
      event.summary,
      missionSnapshot.mission.missionId,
      missionSnapshot.mission.status,
      Math.round(missionSnapshot.verificationSummary?.adaptationScore ?? 0)
    ]);

    const header = ['timestamp', 'type', 'summary', 'missionId', 'missionStatus', 'adaptationScore'];

    return [header, ...rows]
      .map((row) => row.map((value) => escapeCsvValue(value)).join(','))
      .join('\n');
  }, [missionSnapshot, missionAuditEvents]);

  const triggerFileDownload = useCallback((content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }, []);

  const loadConsultantAuditEvents = useCallback(async (limit = 40) => {
    setConsultantAuditLoading(true);
    setConsultantAuditError('');
    try {
      const hoursQuery = consultantAuditWindowMode === '24h' ? '&hours=24' : '';
      const response = await fetch(`/api/ai/consultant/audit?limit=${limit}${hoursQuery}`);
      if (!response.ok) {
        throw new Error(`Audit API returned ${response.status}`);
      }

      const data = await response.json();
      const events = Array.isArray(data?.events) ? data.events as ConsultantAuditEvent[] : [];
      setConsultantAuditEvents(events);
      setConsultantAuditMeta({
        count: Number(data?.count) || events.length,
        limit: Number(data?.limit) || limit
      });

      if (consultantAuditWindowMode === '24h') {
        try {
          const metricsResponse = await fetch('/api/ai/consultant/audit-metrics?hours=24');
          if (metricsResponse.ok) {
            const metrics = await metricsResponse.json();
            setConsultantAuditTrends(metrics as ConsultantAuditTrendMetrics);
          }
        } catch {
          setConsultantAuditTrends(null);
        }
      } else {
        setConsultantAuditTrends(null);
      }
    } catch (error) {
      setConsultantAuditError(error instanceof Error ? error.message : 'Unable to load consultant audit events');
      setConsultantAuditTrends(null);
    } finally {
      setConsultantAuditLoading(false);
    }
  }, [consultantAuditWindowMode]);

  const renderTrend = useCallback((value: number, inverse = false) => {
    if (value === 0) {
      return '→ 0';
    }
    const isPositive = value > 0;
    const arrow = isPositive ? '↑' : '↓';
    const adjusted = inverse ? (isPositive ? 'worse' : 'better') : (isPositive ? 'better' : 'worse');
    return `${arrow} ${Math.abs(value)} (${adjusted})`;
  }, []);

  const handleExportConsultantAudit = useCallback(async (format: 'json' | 'jsonl') => {
    setConsultantAuditExporting(true);
    setConsultantAuditError('');
    try {
      const hoursQuery = consultantAuditWindowMode === '24h' ? '&hours=24' : '';
      const response = await fetch(`/api/ai/consultant/audit-export?format=${format}&limit=1000${hoursQuery}`);
      if (!response.ok) {
        throw new Error(`Export API returned ${response.status}`);
      }

      const content = await response.text();
      triggerFileDownload(
        content,
        format === 'json' ? `consultant-audit-${Date.now()}.json` : `consultant-audit-${Date.now()}.jsonl`,
        format === 'json' ? 'application/json' : 'application/x-ndjson'
      );
    } catch (error) {
      setConsultantAuditError(error instanceof Error ? error.message : 'Unable to export consultant audit events');
    } finally {
      setConsultantAuditExporting(false);
    }
  }, [triggerFileDownload, consultantAuditWindowMode]);

  const consultantAuditSummary = useMemo(() => {
    const requestEvents = consultantAuditEvents.filter((event) => event.event === 'consultant_request').length;
    const errorEvents = consultantAuditEvents.filter((event) => event.event === 'consultant_error').length;
    const replaySuccessEvents = consultantAuditEvents.filter((event) => event.event === 'consultant_replay_request').length;
    const replayErrorEvents = consultantAuditEvents.filter((event) => event.event === 'consultant_replay_error').length;
    const replayFallbackEvents = consultantAuditEvents.filter((event) => event.event === 'consultant_replay_fallback').length;
    return { requestEvents, errorEvents, replaySuccessEvents, replayErrorEvents, replayFallbackEvents };
  }, [consultantAuditEvents]);

  const consultantHealthThresholds = useMemo(() => {
    const toBoundedNumber = (value: unknown, fallback: number, min: number, max: number) => {
      const parsed = Number(value);
      if (!Number.isFinite(parsed)) return fallback;
      return Math.min(max, Math.max(min, parsed));
    };

    const env = (() => {
      try {
        const runtimeEnv = typeof window !== 'undefined'
          ? ((window as unknown as Window & { __ENV__?: Record<string, unknown> }).__ENV__ || {})
          : {};
        const viteEnv = ((import.meta as ImportMeta & {
          env?: {
            VITE_CONSULTANT_HEALTHY_MIN_SUCCESS?: unknown;
            VITE_CONSULTANT_WARNING_MIN_SUCCESS?: unknown;
            VITE_CONSULTANT_FALLBACK_HIGH_RATIO?: unknown;
            VITE_CONSULTANT_ERROR_HIGH_RATIO?: unknown;
            VITE_CONSULTANT_WARNING_MAX_ERROR_RATIO?: unknown;
          };
        }).env || {});
        return {
          VITE_CONSULTANT_HEALTHY_MIN_SUCCESS: runtimeEnv.VITE_CONSULTANT_HEALTHY_MIN_SUCCESS ?? viteEnv.VITE_CONSULTANT_HEALTHY_MIN_SUCCESS,
          VITE_CONSULTANT_WARNING_MIN_SUCCESS: runtimeEnv.VITE_CONSULTANT_WARNING_MIN_SUCCESS ?? viteEnv.VITE_CONSULTANT_WARNING_MIN_SUCCESS,
          VITE_CONSULTANT_FALLBACK_HIGH_RATIO: runtimeEnv.VITE_CONSULTANT_FALLBACK_HIGH_RATIO ?? viteEnv.VITE_CONSULTANT_FALLBACK_HIGH_RATIO,
          VITE_CONSULTANT_ERROR_HIGH_RATIO: runtimeEnv.VITE_CONSULTANT_ERROR_HIGH_RATIO ?? viteEnv.VITE_CONSULTANT_ERROR_HIGH_RATIO,
          VITE_CONSULTANT_WARNING_MAX_ERROR_RATIO: runtimeEnv.VITE_CONSULTANT_WARNING_MAX_ERROR_RATIO ?? viteEnv.VITE_CONSULTANT_WARNING_MAX_ERROR_RATIO,
        };
      } catch {
        return {} as Record<string, unknown>;
      }
    })() as Record<string, unknown>;

    return {
      healthyMinSuccess: toBoundedNumber(env.VITE_CONSULTANT_HEALTHY_MIN_SUCCESS, 0.7, 0, 1),
      warningMinSuccess: toBoundedNumber(env.VITE_CONSULTANT_WARNING_MIN_SUCCESS, 0.45, 0, 1),
      fallbackHighRatio: toBoundedNumber(env.VITE_CONSULTANT_FALLBACK_HIGH_RATIO, 0.25, 0, 1),
      errorHighRatio: toBoundedNumber(env.VITE_CONSULTANT_ERROR_HIGH_RATIO, 0.2, 0, 1),
      warningMaxErrorRatio: toBoundedNumber(env.VITE_CONSULTANT_WARNING_MAX_ERROR_RATIO, 0.5, 0, 1)
    };
  }, []);

  const evaluateConsultantReplayHealth = useCallback((counts: { replaySuccess: number; replayFallback: number; replayError: number }) => {
    const { replaySuccess, replayFallback, replayError } = counts;
    const total = replaySuccess + replayFallback + replayError;

    if (total === 0) {
      return {
        label: 'No Data',
        className: 'bg-stone-100 text-stone-700 border-stone-200',
        detail: 'No retry events in current window'
      };
    }

    const successRate = replaySuccess / total;
    const highFallback = replayFallback > Math.max(1, Math.floor(total * consultantHealthThresholds.fallbackHighRatio));
    const highError = replayError > Math.max(1, Math.floor(total * consultantHealthThresholds.errorHighRatio));

    if (successRate >= consultantHealthThresholds.healthyMinSuccess && !highFallback && !highError) {
      return {
        label: 'Healthy',
        className: 'bg-green-50 text-green-700 border-green-200',
        detail: `Success ${Math.round(successRate * 100)}%`
      };
    }

    if (
      successRate >= consultantHealthThresholds.warningMinSuccess
      && replayError <= Math.max(2, Math.floor(total * consultantHealthThresholds.warningMaxErrorRatio))
    ) {
      return {
        label: 'Warning',
        className: 'bg-amber-50 text-amber-700 border-amber-200',
        detail: `Success ${Math.round(successRate * 100)}%`
      };
    }

    return {
      label: 'Critical',
      className: 'bg-red-50 text-red-700 border-red-200',
      detail: `Success ${Math.round(successRate * 100)}%`
    };
  }, [consultantHealthThresholds]);

  const consultantRetryHealth = useMemo(() => {
    if (!consultantAuditTrends) {
      return null;
    }
    return evaluateConsultantReplayHealth(consultantAuditTrends.current);
  }, [consultantAuditTrends, evaluateConsultantReplayHealth]);

  const consultantThresholdTooltip = useMemo(() => (
    `Thresholds - Healthy≥${Math.round(consultantHealthThresholds.healthyMinSuccess * 100)}%, Warning≥${Math.round(consultantHealthThresholds.warningMinSuccess * 100)}%, FallbackHigh>${Math.round(consultantHealthThresholds.fallbackHighRatio * 100)}%, ErrorHigh>${Math.round(consultantHealthThresholds.errorHighRatio * 100)}%, WarningMaxError≤${Math.round(consultantHealthThresholds.warningMaxErrorRatio * 100)}%`
  ), [consultantHealthThresholds]);

  const consultantProviderTrendSummary = useMemo(() => {
    if (!consultantAuditTrends?.providerMetrics) {
      return [] as string[];
    }

    const providerLabel: Record<'bedrock' | 'gemini' | 'openai', string> = {
      bedrock: 'Bedrock',
      gemini: 'Gemini',
      openai: 'OpenAI'
    };

    return (['bedrock', 'gemini', 'openai'] as const).map((provider) => {
      const metrics = consultantAuditTrends.providerMetrics?.[provider];
      if (!metrics) {
        return `${providerLabel[provider]}: n/a`;
      }

      const total = metrics.current.replaySuccess + metrics.current.replayFallback + metrics.current.replayError;
      const successRate = total > 0 ? Math.round((metrics.current.replaySuccess / total) * 100) : 0;
      return `${providerLabel[provider]} OK ${renderTrend(metrics.delta.replaySuccess)} • FB ${renderTrend(metrics.delta.replayFallback, true)} • ER ${renderTrend(metrics.delta.replayError, true)} • Success ${total > 0 ? `${successRate}%` : 'n/a'}`;
    });
  }, [consultantAuditTrends, renderTrend]);

  const consultantProviderHealthBadges = useMemo(() => {
    if (!consultantAuditTrends?.providerMetrics) {
      return [] as Array<{ providerKey: ConsultantAuditProviderFilter; provider: string; label: string; className: string; detail: string }>;
    }

    const providerLabel: Record<'bedrock' | 'gemini' | 'openai', string> = {
      bedrock: 'Bedrock',
      gemini: 'Gemini',
      openai: 'OpenAI'
    };

    return (['bedrock', 'gemini', 'openai'] as const).map((provider) => {
      const metrics = consultantAuditTrends.providerMetrics?.[provider];
      const health = evaluateConsultantReplayHealth(metrics?.current ?? { replaySuccess: 0, replayFallback: 0, replayError: 0 });
      return {
        providerKey: provider,
        provider: providerLabel[provider],
        label: health.label,
        className: health.className,
        detail: health.detail
      };
    });
  }, [consultantAuditTrends, evaluateConsultantReplayHealth]);

  const handleProviderHealthBadgeClick = useCallback((provider: ConsultantAuditProviderFilter) => {
    if (provider === 'all') return;
    setConsultantAuditProviderFilter(provider);
    setConsultantAuditEventFilter('replay_events');
    setConsultantAuditPage(1);
  }, []);

  const filteredConsultantAuditEvents = useMemo(() => {
    const needle = consultantAuditSearch.trim().toLowerCase();
    const replayEventSet = new Set(['consultant_replay_request', 'consultant_replay_error', 'consultant_replay_fallback']);
    return consultantAuditEvents.filter((event) => {
      if (consultantAuditEventFilter === 'replay_events') {
        if (!replayEventSet.has(String(event.event || ''))) {
          return false;
        }
      } else if (consultantAuditEventFilter !== 'all' && event.event !== consultantAuditEventFilter) {
        return false;
      }
      if (consultantAuditProviderFilter !== 'all' && event.provider !== consultantAuditProviderFilter) {
        return false;
      }
      if (!needle) {
        return true;
      }

      const haystack = `${event.requestId || ''} ${event.intent || ''} ${event.taskType || ''} ${event.error || ''}`.toLowerCase();
      return haystack.includes(needle);
    });
  }, [consultantAuditEvents, consultantAuditEventFilter, consultantAuditProviderFilter, consultantAuditSearch]);

  const consultantAuditPageSize = 10;
  const consultantAuditTotalPages = Math.max(1, Math.ceil(filteredConsultantAuditEvents.length / consultantAuditPageSize));
  const pagedConsultantAuditEvents = useMemo(() => {
    const page = Math.min(Math.max(consultantAuditPage, 1), consultantAuditTotalPages);
    const start = (page - 1) * consultantAuditPageSize;
    return filteredConsultantAuditEvents.slice(start, start + consultantAuditPageSize);
  }, [filteredConsultantAuditEvents, consultantAuditPage, consultantAuditTotalPages]);

  useEffect(() => {
    setConsultantAuditPage(1);
  }, [consultantAuditEventFilter, consultantAuditProviderFilter, consultantAuditSearch]);

  useEffect(() => {
    if (consultantAuditPage > consultantAuditTotalPages) {
      setConsultantAuditPage(consultantAuditTotalPages);
    }
  }, [consultantAuditPage, consultantAuditTotalPages]);

  const handleCopyConsultantRequestId = useCallback(async (requestId?: string) => {
    if (!requestId) return;
    try {
      await navigator.clipboard.writeText(requestId);
      setConsultantAuditCopiedRequestId(requestId);
      window.setTimeout(() => setConsultantAuditCopiedRequestId(''), 1500);
    } catch {
      setConsultantAuditError('Unable to copy request ID');
    }
  }, []);

  const handleLookupConsultantRequest = useCallback(async (requestIdOverride?: string) => {
    const requestId = (requestIdOverride ?? consultantAuditLookupRequestId).trim();
    if (!requestId) {
      setConsultantAuditLookupEvents([]);
      setConsultantAuditError('Enter a request ID to lookup');
      return;
    }

    setConsultantAuditLookupLoading(true);
    setConsultantAuditError('');
    setConsultantReplayMeta(null);
    try {
      const response = await fetch(`/api/ai/consultant/audit/${encodeURIComponent(requestId)}`);
      if (!response.ok) {
        throw new Error(response.status === 404 ? 'Request ID not found in audit log' : `Lookup API returned ${response.status}`);
      }

      const payload = await response.json();
      const events = Array.isArray(payload?.events) ? payload.events as ConsultantAuditEvent[] : [];
      setConsultantAuditLookupRequestId(requestId);
      setConsultantAuditLookupEvents(events);

      try {
        const replayResponse = await fetch(`/api/ai/consultant/replay/${encodeURIComponent(requestId)}`);
        if (replayResponse.ok) {
          const replayPayload = await replayResponse.json();
          setConsultantReplayMeta({
            requestId: String(replayPayload?.requestId || requestId),
            createdAt: replayPayload?.createdAt,
            replayHash: replayPayload?.replayHash,
            hasPayload: Boolean(replayPayload?.hasPayload),
            sourceRequestId: replayPayload?.sourceRequestId ?? null
          });
        }
      } catch {
        // Ignore replay metadata lookup errors and continue with audit detail rendering
      }
    } catch (error) {
      setConsultantAuditLookupEvents([]);
      setConsultantReplayMeta(null);
      setConsultantAuditError(error instanceof Error ? error.message : 'Unable to lookup request ID');
    } finally {
      setConsultantAuditLookupLoading(false);
    }
  }, [consultantAuditLookupRequestId]);

  const handleRetryConsultantRequest = useCallback(async (requestId?: string) => {
    const resolvedRequestId = (requestId || consultantAuditLookupRequestId).trim();
    if (!resolvedRequestId) {
      setConsultantAuditError('Select or enter a request ID before retrying');
      return;
    }

    const referenceEvent = consultantAuditLookupEvents.find((event) => event.requestId === resolvedRequestId)
      || consultantAuditEvents.find((event) => event.requestId === resolvedRequestId);

    const retryPrompt = [
      `Retry request ${resolvedRequestId}.`,
      referenceEvent?.taskType ? `Task type: ${referenceEvent.taskType}.` : '',
      referenceEvent?.intent ? `Intent: ${referenceEvent.intent}.` : '',
      'Continue from the current case context and return actionable next steps.'
    ].filter(Boolean).join(' ');

    setConsultantRetryLoading(true);
    setConsultantAuditError('');
    setConsultantRetrySource('none');
    setConsultantRetryReason('');
    setShowWorkspaceModal(false);
    setCurrentPhase('analysis');

    const retryUserMessageId = crypto.randomUUID();
    setMessages((prev) => [
      ...prev,
      {
        id: retryUserMessageId,
        role: 'user',
        content: retryPrompt,
        timestamp: new Date(),
        phase: 'analysis'
      }
    ]);

    try {
      let responseText = '';
      let replayFallbackReason = '';

      try {
        const replayResponse = await fetch(`/api/ai/consultant/replay/${encodeURIComponent(resolvedRequestId)}/retry`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });

        if (replayResponse.ok) {
          const replayPayload = await replayResponse.json();
          responseText = String(replayPayload?.text || '').trim();
          if (responseText) {
            setConsultantRetrySource('backend-replay');
            setConsultantRetryReason('Executed using stored replay payload');
          }
        } else if (replayResponse.status !== 404 && replayResponse.status !== 409) {
          throw new Error(`Replay API returned ${replayResponse.status}`);
        } else {
          replayFallbackReason = replayResponse.status === 404
            ? 'Replay record not found; used local context fallback'
            : 'Replay payload unavailable; used local context fallback';
        }
      } catch (replayError) {
        replayFallbackReason = replayError instanceof Error
          ? `Replay endpoint failed (${replayError.message}); used local context fallback`
          : 'Replay endpoint failed; used local context fallback';
        console.warn('Replay endpoint unavailable, using local retry flow:', replayError);
      }

      if (!responseText) {
        responseText = await processWithAI(
          retryPrompt,
          `Retry mode from consultant audit request ${resolvedRequestId}. Use current case file and produce concrete guidance.`
        );
        setConsultantRetrySource('local-fallback');
        setConsultantRetryReason(replayFallbackReason || 'Local context retry path used');

        try {
          await fetch('/api/ai/consultant/replay/fallback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sourceRequestId: resolvedRequestId,
              reason: 'local_fallback',
              detail: replayFallbackReason || 'Local context retry path used'
            })
          });
          await loadConsultantAuditEvents(40);
        } catch {
          // non-blocking metric logging
        }
      }

      const provenance = buildMessageProvenance(caseStudy, computeReadiness(caseStudy), [`Retry request: ${resolvedRequestId}`]);

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: responseText,
          timestamp: new Date(),
          phase: 'analysis',
          provenance
        }
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: 'Retry execution failed. Please review the request details and try again.',
          timestamp: new Date(),
          phase: 'analysis'
        }
      ]);
      setConsultantAuditError(error instanceof Error ? error.message : 'Retry execution failed');
    } finally {
      setConsultantRetryLoading(false);
    }
  }, [
    consultantAuditLookupRequestId,
    consultantAuditLookupEvents,
    consultantAuditEvents,
    processWithAI,
    buildMessageProvenance,
    caseStudy,
    computeReadiness,
    loadConsultantAuditEvents
  ]);

  const handleExportMissionAuditJson = useCallback(() => {
    if (!missionAuditExportPayload) return;

    triggerFileDownload(
      JSON.stringify(missionAuditExportPayload, null, 2),
      `bw-autonomy-audit-${Date.now()}.json`,
      'application/json'
    );
  }, [missionAuditExportPayload, triggerFileDownload]);

  const handleExportMissionAuditCsv = useCallback(() => {
    if (!missionAuditCsvContent) return;

    triggerFileDownload(
      missionAuditCsvContent,
      `bw-autonomy-audit-${Date.now()}.csv`,
      'text/csv;charset=utf-8'
    );
  }, [missionAuditCsvContent, triggerFileDownload]);

  const missionAuditComplianceSummary = useMemo(() => {
    if (!missionSnapshot || !missionAuditExportPayload) return '';

    const adaptationScore = Math.round(missionSnapshot.verificationSummary?.adaptationScore ?? 0);
    const strategyAdjustments = missionSnapshot.verificationSummary?.strategyAdjustments ?? [];
    const replanSignals = missionSnapshot.verificationSummary?.replanSignals ?? [];

    const sections: string[] = [
      '# BW Nexus Autonomous Audit Compliance Summary',
      '',
      `Generated: ${new Date().toISOString()}`,
      '',
      '## Mission Profile',
      `- Mission ID: ${missionSnapshot.mission.missionId}`,
      `- Objective: ${missionSnapshot.mission.objective}`,
      `- Status: ${missionSnapshot.mission.status}`,
      `- Created At: ${missionSnapshot.mission.createdAt}`,
      `- Updated At: ${missionSnapshot.mission.updatedAt}`,
      `- Autonomy Paused: ${missionSnapshot.autonomyPaused ? 'Yes' : 'No'}`,
      '',
      '## Governance & Execution Overview',
      `- Adaptation Score: ${adaptationScore}%`,
      `- Governance Decisions: ${missionAuditExportPayload.summary.governanceDecisions}`,
      `- Execution Records: ${missionAuditExportPayload.summary.executionRecords}`,
      `- Outcomes: ${missionAuditExportPayload.summary.outcomes}`,
      `- Timeline Events Included: ${missionAuditExportPayload.summary.eventsExported}`,
      '',
      '## Strategy Adjustments',
      ...(strategyAdjustments.length > 0
        ? strategyAdjustments.map((adjustment) => `- ${adjustment}`)
        : ['- No strategy adjustments recorded.']),
      '',
      '## Replan Signals',
      ...(replanSignals.length > 0
        ? replanSignals.map((signal) => `- ${signal}`)
        : ['- No replan signals recorded.']),
      '',
      '## Event Timeline'
    ];

    if (missionAuditEvents.length === 0) {
      sections.push('- No timeline events available.');
    } else {
      missionAuditEvents.forEach((event, index) => {
        sections.push(
          `${index + 1}. [${event.type.toUpperCase()}] ${event.timestamp} - ${event.summary}`
        );
      });
    }

    return sections.join('\n');
  }, [missionSnapshot, missionAuditExportPayload, missionAuditEvents]);

  const handleExportMissionComplianceSummary = useCallback(() => {
    if (!missionAuditComplianceSummary) return;

    triggerFileDownload(
      missionAuditComplianceSummary,
      `bw-autonomy-audit-compliance-${Date.now()}.md`,
      'text/markdown;charset=utf-8'
    );
  }, [missionAuditComplianceSummary, triggerFileDownload]);

  const escapeReportHtml = useCallback((value: string) => {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }, []);

  const handlePrintMissionCompliancePdf = useCallback(() => {
    if (!missionSnapshot || !missionAuditExportPayload) return;

    const adaptationScore = Math.round(missionSnapshot.verificationSummary?.adaptationScore ?? 0);
    const strategyAdjustments = missionSnapshot.verificationSummary?.strategyAdjustments ?? [];
    const replanSignals = missionSnapshot.verificationSummary?.replanSignals ?? [];
    const openedWindow = window.open('', '_blank', 'noopener,noreferrer,width=1024,height=768');
    if (!openedWindow) return;

    const timelineRows = missionAuditEvents.length > 0
      ? missionAuditEvents
          .map((event) => {
            return `<tr>
              <td>${escapeReportHtml(new Date(event.timestamp).toLocaleString())}</td>
              <td>${escapeReportHtml(event.type.toUpperCase())}</td>
              <td>${escapeReportHtml(event.summary)}</td>
            </tr>`;
          })
          .join('')
      : '<tr><td colspan="3">No timeline events available.</td></tr>';

    const strategyList = strategyAdjustments.length > 0
      ? strategyAdjustments.map((item) => `<li>${escapeReportHtml(item)}</li>`).join('')
      : '<li>No strategy adjustments recorded.</li>';

    const replanList = replanSignals.length > 0
      ? replanSignals.map((item) => `<li>${escapeReportHtml(item)}</li>`).join('')
      : '<li>No replan signals recorded.</li>';

    const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>BW Autonomy Audit Compliance Report</title>
    <style>
      @page { margin: 0.75in; }
      body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; font-size: 12px; line-height: 1.4; }
      h1 { font-size: 20px; margin: 0 0 8px 0; }
      h2 { font-size: 14px; margin: 18px 0 6px 0; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; }
      p { margin: 0 0 8px 0; }
      ul { margin: 0; padding-left: 18px; }
      li { margin: 0 0 4px 0; }
      .meta { color: #475569; margin-bottom: 12px; }
      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 20px; }
      .card { border: 1px solid #cbd5e1; padding: 8px 10px; background: #f8fafc; }
      table { width: 100%; border-collapse: collapse; margin-top: 8px; }
      th, td { border: 1px solid #cbd5e1; text-align: left; vertical-align: top; padding: 6px; }
      th { background: #e2e8f0; }
      .footer { margin-top: 16px; color: #64748b; font-size: 11px; }
    </style>
  </head>
  <body>
    <h1>BW Nexus Autonomous Audit Compliance Summary</h1>
    <p class="meta">Generated: ${escapeReportHtml(new Date().toISOString())}</p>

    <h2>Mission Profile</h2>
    <div class="grid">
      <div class="card"><strong>Mission ID:</strong> ${escapeReportHtml(missionSnapshot.mission.missionId)}</div>
      <div class="card"><strong>Status:</strong> ${escapeReportHtml(missionSnapshot.mission.status)}</div>
      <div class="card"><strong>Created At:</strong> ${escapeReportHtml(missionSnapshot.mission.createdAt)}</div>
      <div class="card"><strong>Updated At:</strong> ${escapeReportHtml(missionSnapshot.mission.updatedAt)}</div>
      <div class="card"><strong>Autonomy Paused:</strong> ${missionSnapshot.autonomyPaused ? 'Yes' : 'No'}</div>
      <div class="card"><strong>Objective:</strong> ${escapeReportHtml(missionSnapshot.mission.objective)}</div>
    </div>

    <h2>Governance & Execution Overview</h2>
    <div class="grid">
      <div class="card"><strong>Adaptation Score:</strong> ${adaptationScore}%</div>
      <div class="card"><strong>Governance Decisions:</strong> ${missionAuditExportPayload.summary.governanceDecisions}</div>
      <div class="card"><strong>Execution Records:</strong> ${missionAuditExportPayload.summary.executionRecords}</div>
      <div class="card"><strong>Outcomes:</strong> ${missionAuditExportPayload.summary.outcomes}</div>
      <div class="card"><strong>Timeline Events Included:</strong> ${missionAuditExportPayload.summary.eventsExported}</div>
    </div>

    <h2>Strategy Adjustments</h2>
    <ul>${strategyList}</ul>

    <h2>Replan Signals</h2>
    <ul>${replanList}</ul>

    <h2>Event Timeline</h2>
    <table>
      <thead>
        <tr>
          <th>Timestamp</th>
          <th>Type</th>
          <th>Summary</th>
        </tr>
      </thead>
      <tbody>
        ${timelineRows}
      </tbody>
    </table>

    <p class="footer">Exported from BW Consultant OS autonomous mission audit timeline.</p>
  </body>
</html>`;

    openedWindow.document.open();
    openedWindow.document.write(html);
    openedWindow.document.close();

    const fallbackCloseTimer = openedWindow.setTimeout(() => {
      try {
        openedWindow.close();
      } catch {
        return;
      }
    }, 45000);

    openedWindow.onafterprint = () => {
      openedWindow.clearTimeout(fallbackCloseTimer);
      try {
        openedWindow.close();
      } catch {
        return;
      }
    };

    openedWindow.focus();
    openedWindow.print();
  }, [missionSnapshot, missionAuditExportPayload, missionAuditEvents, escapeReportHtml]);

  const criticalCaseGaps = getCriticalCaseGaps();
  const topCriticalGap = criticalCaseGaps[0] || null;
  const _gapSeverityCounts = criticalCaseGaps.reduce<Record<CriticalGapSeverity, number>>(
    (acc, gap) => {
      acc[gap.severity] += 1;
      return acc;
    },
    { critical: 0, high: 0, medium: 0 }
  );

  const missionCaseInput = useMemo(() => ({
    organizationName: caseStudy.organizationName,
    currentMatter: caseStudy.currentMatter,
    objectives: caseStudy.objectives,
    constraints: caseStudy.constraints,
    targetAudience: caseStudy.targetAudience,
    decisionDeadline: caseStudy.decisionDeadline,
    readinessScore,
    criticalGapCount: criticalCaseGaps.length,
    topCriticalGap: topCriticalGap?.label,
    recommendedTitles: recommendedDocs.map((doc) => doc.title)
  }), [
    caseStudy.organizationName,
    caseStudy.currentMatter,
    caseStudy.objectives,
    caseStudy.constraints,
    caseStudy.targetAudience,
    caseStudy.decisionDeadline,
    readinessScore,
    criticalCaseGaps.length,
    topCriticalGap?.label,
    recommendedDocs
  ]);

  useEffect(() => {
    const hasMissionSignal = Boolean(
      caseStudy.organizationName.trim() ||
      caseStudy.currentMatter.trim() ||
      caseStudy.objectives.trim()
    );

    if (!hasUserEngaged || !hasMissionSignal) {
      setMissionSnapshot(null);
      return;
    }

    MissionGraphService.upsertFromCaseInput(missionCaseInput).then(setMissionSnapshot);
  }, [
    hasUserEngaged,
    caseStudy.organizationName,
    caseStudy.currentMatter,
    caseStudy.objectives,
    missionCaseInput
  ]);

  useEffect(() => {
    if (!showWorkspaceModal) return;
    void loadConsultantAuditEvents(40);
  }, [showWorkspaceModal, loadConsultantAuditEvents]);

  useEffect(() => {
    if (!showWorkspaceModal) return;
    void loadConsultantAuditEvents(40);
  }, [consultantAuditWindowMode, showWorkspaceModal, loadConsultantAuditEvents]);

  useEffect(() => {
    if (!showWorkspaceModal || !consultantAuditAutoRefresh) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void loadConsultantAuditEvents(40);
    }, 30000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [showWorkspaceModal, consultantAuditAutoRefresh, loadConsultantAuditEvents]);

  const getRankGapKeys = useCallback((alternativeId: string) => {
    if (!primaryRecommendation) return [] as Array<'fit' | 'evidence' | 'urgency' | 'compliance'>;

    const primaryScore = recommendationScoreMap[primaryRecommendation.id];
    const altScore = recommendationScoreMap[alternativeId];
    if (!primaryScore || !altScore) return [] as Array<'fit' | 'evidence' | 'urgency' | 'compliance'>;

    return [
      { key: 'fit' as const, delta: primaryScore.fitScore - altScore.fitScore },
      { key: 'evidence' as const, delta: primaryScore.evidenceScore - altScore.evidenceScore },
      { key: 'urgency' as const, delta: primaryScore.urgencyScore - altScore.urgencyScore },
      { key: 'compliance' as const, delta: primaryScore.complianceScore - altScore.complianceScore }
    ]
      .filter((item) => item.delta > 0)
      .sort((a, b) => b.delta - a.delta)
      .slice(0, 2)
      .map((item) => item.key);
  }, [primaryRecommendation, recommendationScoreMap]);

  const getRankUpgradeHint = useCallback((alternativeId: string) => {
    const gaps = getRankGapKeys(alternativeId);

    const suggestions: string[] = [];

    if (gaps.includes('fit')) {
      suggestions.push('tighten objective/audience alignment in your case description');
    }
    if (gaps.includes('evidence')) {
      suggestions.push('add stronger supporting documents or quantified evidence');
    }
    if (gaps.includes('urgency')) {
      suggestions.push('clarify deadline urgency and decision timeline');
    }
    if (gaps.includes('compliance')) {
      suggestions.push('add jurisdiction-specific compliance details and required annexes');
    }

    if (suggestions.length === 0) {
      return 'This option is already close; add more case detail to improve ranking confidence.';
    }

    return `To rank this #1: ${suggestions.join('; ')}.`;
  }, [getRankGapKeys]);

  const getImprovementQuestions = useCallback((alternativeId: string) => {
    const gaps = getRankGapKeys(alternativeId);
    const questions: string[] = [];

    if (gaps.includes('fit')) {
      questions.push('What exact decision do you want this document to influence, and who is the final approver?');
    }
    if (gaps.includes('evidence')) {
      questions.push('What concrete evidence can you provide now (metrics, attachments, precedents, or verifiable data)?');
    }
    if (gaps.includes('urgency')) {
      questions.push('What is the hard deadline, what happens if delayed, and what timeline milestone is non-negotiable?');
    }
    if (gaps.includes('compliance')) {
      questions.push('Which jurisdiction-specific requirements, approvals, or annexes must be explicitly included?');
    }

    if (questions.length === 0) {
      questions.push('What additional context would most strengthen this option for your current objective?');
    }

    return questions.slice(0, 3);
  }, [getRankGapKeys]);

  const handleImproveAlternative = useCallback((alternative: DocumentOption) => {
    const questions = getImprovementQuestions(alternative.id);
    const prompt = [
      `To improve ${alternative.title} ranking, answer these now:`,
      ...questions.map((question, index) => `${index + 1}. ${question}`)
    ].join('\n');

    setCurrentPhase('discovery');
    setMessages(prev => [...prev, {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: prompt,
      timestamp: new Date(),
      phase: 'discovery'
    }]);
    setInputValue(questions[0] ?? '');
  }, [getImprovementQuestions]);

  const handleSubmitOutcomeFeedback = useCallback(() => {
    if (!feedbackSignal) return;

    const deltaBySignal: Record<'positive' | 'partial' | 'negative', number> = {
      positive: 4,
      partial: 1,
      negative: -4
    };

    const docTargets = selectedDocs.length > 0
      ? selectedDocs
      : (primaryRecommendation ? [primaryRecommendation.id] : []);

    if (docTargets.length === 0) return;

    const delta = deltaBySignal[feedbackSignal];
    setRecommendationBoostMap(prev => {
      const next = { ...prev };
      docTargets.forEach((docId) => {
        const current = next[docId] ?? 0;
        next[docId] = Math.max(-12, Math.min(12, current + delta));
      });
      return next;
    });

    if (feedbackNote.trim()) {
      setCaseStudy(prev => ({
        ...prev,
        aiInsights: [...prev.aiInsights, `Outcome feedback (${feedbackSignal}): ${feedbackNote.trim()}`],
        additionalContext: [...prev.additionalContext, `Outcome feedback captured: ${feedbackSignal}`]
      }));
    }

    setMessages(prev => [...prev, {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: `Thanks for the feedback. I will adjust future recommendation ranking using this outcome signal (${feedbackSignal}).`,
      timestamp: new Date(),
      phase: 'recommendations'
    }]);

    FailureModeGovernanceService.recordOutcomeFeedback(feedbackSignal, feedbackNote);

    setFeedbackSubmitted(true);
    generateRecommendations();
  }, [feedbackSignal, feedbackNote, selectedDocs, primaryRecommendation, generateRecommendations]);

  const handleResetLearningSignals = useCallback(() => {
    setRecommendationBoostMap({});
    setFeedbackSignal(null);
    setFeedbackNote('');
    setFeedbackSubmitted(false);
    setMessages(prev => [...prev, {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: 'Learning signals reset. Recommendations are now back to baseline scoring.',
      timestamp: new Date(),
      phase: 'recommendations'
    }]);
  }, []);

  const handleExportLearningProfile = useCallback(() => {
    const payload = {
      version: LEARNING_PROFILE_VERSION,
      exportedAt: new Date().toISOString(),
      signals: recommendationBoostMap
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `bw-learning-profile-${Date.now()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }, [recommendationBoostMap]);

  const handleImportLearningProfile = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as unknown;
      const profileVersion = parsed && typeof parsed === 'object' && 'version' in parsed && typeof (parsed as { version?: unknown }).version === 'number'
        ? (parsed as { version: number }).version
        : null;
      const source = parsed && typeof parsed === 'object' && 'signals' in parsed
        ? (parsed as { signals: unknown }).signals
        : parsed;

      if (strictLearningImport && profileVersion !== LEARNING_PROFILE_VERSION) {
        throw new Error(
          profileVersion === null
            ? `Strict import mode requires explicit profile version v${LEARNING_PROFILE_VERSION}.`
            : `Strict import mode rejected profile v${profileVersion}; expected v${LEARNING_PROFILE_VERSION}.`
        );
      }

      if (!source || typeof source !== 'object') {
        throw new Error('Invalid learning profile format');
      }

      const sanitized = Object.entries(source as Record<string, unknown>).reduce<Record<string, number>>((acc, [key, value]) => {
        if (typeof value !== 'number' || Number.isNaN(value)) return acc;
        acc[key] = Math.max(-12, Math.min(12, value));
        return acc;
      }, {});

      setRecommendationBoostMap(sanitized);
      setFeedbackSignal(null);
      setFeedbackNote('');
      setFeedbackSubmitted(false);

      const compatibilityWarning = profileVersion === null
        ? ' Imported using legacy compatibility mode (no profile version metadata).'
        : profileVersion !== LEARNING_PROFILE_VERSION
          ? ` Imported with version compatibility mode (profile v${profileVersion}, current v${LEARNING_PROFILE_VERSION}).`
          : '';

      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Learning profile imported successfully (${Object.keys(sanitized).length} signal${Object.keys(sanitized).length === 1 ? '' : 's'}).${compatibilityWarning}`,
        timestamp: new Date(),
        phase: 'recommendations'
      }]);
    } catch (importError) {
      console.error('Learning profile import failed:', importError);
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Unable to import learning profile. Please use a valid JSON file exported from BW Consultant.',
        timestamp: new Date(),
        phase: 'recommendations'
      }]);
    } finally {
      event.target.value = '';
    }
  }, [strictLearningImport]);

  return (
    <div
      className={`${embedded ? '' : 'min-h-screen bg-white'}`}
      style={{ fontFamily: "'Sohne', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif" }}
    >

      {/* Approval Gate Modal */}
      {approvalGateAction && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
          <div className="bg-white border border-stone-300 shadow-2xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-2 mb-3">
              <Shield size={18} className="text-blue-600" />
              <h3 className="text-base font-bold text-slate-900">Human Approval Required</h3>
            </div>
            <p className="text-sm text-slate-700 mb-1 font-medium">{approvalGateAction.label}</p>
            <p className="text-sm text-slate-500 mb-4">{approvalGateAction.description}</p>
            <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-amber-50 border border-amber-200 text-[11px] text-amber-800">
              <AlertTriangle size={12} className="text-amber-600 flex-shrink-0" />
              This action will be logged in the governance audit trail.
            </div>
            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={() => setApprovalGateAction(null)}
                className="px-4 py-2 text-sm bg-stone-100 text-slate-700 border border-stone-300 hover:bg-stone-200"
              >
                Cancel
              </button>
              <button
                onClick={() => executeAction(approvalGateAction)}
                className="px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-1"
              >
                <CheckCircle2 size={14} />
                Approve &amp; Execute
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="h-screen flex flex-col">
        {/* Blue Banner Header */}
        <div
          className="relative overflow-hidden"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1400&h=300&fit=crop&q=80)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900/95 via-blue-900/90 to-slate-900/95" />

          {/* Top Row: Brand + Utility Controls */}
          <div className="relative z-10 px-4 md:px-6 pt-3 md:pt-4 pb-2 flex items-center justify-between">
            <div className="flex items-center gap-2 md:gap-3 min-w-0">
              <div className="w-8 h-8 md:w-9 md:h-9 rounded-lg bg-white/15 backdrop-blur flex items-center justify-center border border-white/20 flex-shrink-0">
                <Bot size={isMobile ? 16 : 20} className="text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base md:text-lg font-semibold text-white tracking-wide leading-tight truncate">BW Consultant</h1>
                <span className="text-blue-300/70 text-[9px] md:text-[10px] font-medium uppercase tracking-widest hidden sm:inline">NSIL Agentic Runtime &bull; Case Study Builder</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 md:gap-2">
              {/* Language Selector */}
              <div className="flex items-center gap-1 px-2 py-1.5 md:px-2.5 rounded-md bg-white/10 border border-white/15 backdrop-blur">
                <Languages size={13} className="text-blue-200/70" />
                <select
                  value={locale}
                  onChange={(e) => setLocale(e.target.value)}
                  className="bg-transparent text-white text-xs font-medium focus:outline-none cursor-pointer"
                  title="Output locale / language"
                >
                  {LOCALES.map((l) => (
                    <option key={l.code} value={l.code} className="text-slate-800 bg-white">{l.label}</option>
                  ))}
                </select>
              </div>

              {/* Live Research */}
              <button
                onClick={() => setShowPilotWindow((prev) => !prev)}
                className="flex items-center gap-1.5 px-2 md:px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20 text-white text-xs font-medium border border-white/15 backdrop-blur transition-all"
              >
                <Globe size={13} />
                <span className="hidden sm:inline">{showPilotWindow ? 'Close Research' : 'Live Research'}</span>
              </button>

              {/* Mobile sidebar toggle */}
              {isMobile && (
                <button
                  onClick={() => setShowMobileSidebar(prev => !prev)}
                  className="flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-white/10 hover:bg-white/20 text-white text-xs font-medium border border-white/15 backdrop-blur transition-all"
                >
                  <FileText size={13} />
                </button>
              )}

              {/* Tools dropdown */}
              {onNavigate && (
                <div className="relative z-20">
                  <button
                    onClick={() => setShowToolsMenu(prev => !prev)}
                    className="flex items-center gap-1.5 px-2 md:px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20 text-white text-xs font-medium border border-white/15 backdrop-blur transition-all"
                  >
                    <Briefcase size={13} />
                    <span className="hidden sm:inline">Tools</span>
                  </button>
                  {showToolsMenu && (
                    <div className="absolute right-0 top-full mt-1.5 w-56 bg-white/95 backdrop-blur-xl rounded-lg border border-slate-200 shadow-2xl z-50 py-1 overflow-hidden" onClick={() => setShowToolsMenu(false)}>
                      {[
                        { mode: 'documents', icon: '', label: 'Document Generation Suite' },
                        { mode: 'advanced-report', icon: '', label: 'Advanced Report Generator' },
                        { mode: 'exec-summary', icon: '', label: 'Executive Summary' },
                        { mode: 'letters', icon: '', label: 'Letters & MOUs' },
                        { mode: 'global-location-intel', icon: '', label: 'Location Intelligence' },
                        { mode: 'matchmaking', icon: '', label: 'Partner Matchmaking' },
                        { mode: 'intake', icon: '', label: 'Structured Intake Form' },
                        { mode: 'admin', icon: '', label: 'Admin Dashboard' },
                        { mode: 'user-manual', icon: '', label: 'User Manual' },
                        { mode: 'command-center', icon: '', label: 'Back to Command Center' },
                      ].map(item => (
                        <button
                          key={item.mode}
                          onClick={() => onNavigate(item.mode)}
                          className="w-full text-left px-4 py-3 md:py-2 text-sm text-slate-600 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2.5 transition-colors"
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Bottom Row: Phase Steps + Final Report */}
          <div className="relative z-10 px-4 md:px-6 pb-3 pt-1 flex items-center justify-between">
            <div className="hidden md:flex items-center gap-0.5 bg-black/20 rounded-lg p-1 backdrop-blur">
              {Object.entries(phaseLabels).map(([phase, info], idx) => {
                const isActive = currentPhase === phase;
                const isCompleted = Object.keys(phaseLabels).indexOf(currentPhase) > idx;
                return (
                  <div
                    key={phase}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-default ${
                      isActive
                        ? 'bg-white text-blue-900 shadow-sm'
                        : isCompleted
                          ? 'text-blue-200 bg-white/10'
                          : 'text-blue-400/50'
                    }`}
                  >
                    <span className={`w-4.5 h-4.5 text-[10px] font-bold rounded-full inline-flex items-center justify-center ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : isCompleted
                          ? 'bg-blue-400/30 text-blue-200'
                          : 'bg-white/10 text-blue-400/40'
                    }`}>
                      {idx + 1}
                    </span>
                    {info.label}
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => setShowFinalReport(true)}
              className="flex items-center gap-1.5 px-3 md:px-4 py-1.5 rounded-md bg-amber-500/90 hover:bg-amber-400 text-white text-xs font-semibold shadow-lg shadow-amber-900/20 border border-amber-400/50 transition-all"
              title="Generate or view Final Report"
            >
              <FileText size={13} />
              <span className="hidden sm:inline">Final Report</span>
              <span className="sm:hidden">Report</span>
            </button>

            {/* Mobile phase indicator */}
            {isMobile && (
              <div className="flex items-center gap-1 md:hidden">
                <span className="text-[10px] text-blue-200 font-medium uppercase">{phaseLabels[currentPhase]?.label || currentPhase}</span>
                <span className="text-[9px] text-blue-400/50">({Object.keys(phaseLabels).indexOf(currentPhase) + 1}/{Object.keys(phaseLabels).length})</span>
              </div>
            )}
          </div>

          {/* Subtle bottom border glow */}
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-400/40 to-transparent z-10" />
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Chat Panel */}
          <div className="flex-1 flex flex-col bg-stone-50 min-w-0">
            {/* Messages */}
            <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-3 md:p-6 space-y-3 md:space-y-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <Bot size={40} className="text-blue-200 mb-4" />
                  <h3 className="text-lg font-semibold text-slate-700 mb-2">How can I help you today?</h3>
                  <p className="text-sm text-slate-500 max-w-md leading-relaxed mb-6">
                    I'll guide you through building a comprehensive case study and generate the professional documents you need.
                  </p>
                  <div className="grid grid-cols-2 gap-3 max-w-lg">
                    {[
                      { label: 'Investment Analysis', example: 'Review partnership opportunity' },
                      { label: 'Market Entry', example: 'Expand into new region' },
                      { label: 'Due Diligence', example: 'Assess company risk profile' },
                      { label: 'Strategic Decision', example: 'Evaluate acquisition target' },
                    ].map((hint, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setInputValue(hint.example)}
                        className="text-left px-4 py-3 bg-white border border-stone-200 hover:border-blue-400 hover:shadow transition-all group"
                      >
                        <p className="text-sm font-medium text-slate-700 group-hover:text-blue-700">{hint.label}</p>
                        <p className="text-xs text-slate-400">{hint.example}</p>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((msg, msgIdx) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] px-4 py-3 text-sm leading-relaxed ${
                          msg.role === 'user'
                            ? 'bg-blue-600 text-white rounded-lg'
                            : 'bg-white border border-stone-200 text-slate-900 rounded-lg shadow-sm'
                        }`}
                      >
                        {msg.role === 'assistant' && (
                          <div className="flex items-center gap-1.5 mb-2">
                            <span className="inline-block w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                            <span className="text-blue-600 text-xs font-semibold uppercase tracking-wider">BW Consultant</span>
                          </div>
                        )}
                        <div className={`whitespace-pre-wrap ${msg.role === 'assistant' ? 'text-[13px] leading-[1.7] text-slate-800' : ''}`}>
                          {msg.role === 'assistant' && msgIdx === messages.length - 1 && !isLoading && !displayedMsgIds.current.has(msg.id) ? (
                            <TypewriterText text={msg.content} speed={75}
                              onComplete={() => {
                                displayedMsgIds.current.add(msg.id);
                              }}
                            />
                          ) : (
                            <span dangerouslySetInnerHTML={{
                              __html: msg.content
                                .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
                                .replace(/\n/g, '<br />')
                            }} />
                          )}
                        </div>
                        {msg.provenance && msg.role !== 'user' && msg.provenance.confidence >= 50 && (
                          <div className="mt-2 pt-2 border-t border-stone-200 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-slate-500">Confidence:</span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${
                                msg.provenance.confidenceBand === 'high'
                                  ? 'bg-green-50 text-green-700 border-green-300'
                                  : msg.provenance.confidenceBand === 'medium'
                                    ? 'bg-amber-50 text-amber-700 border-amber-300'
                                    : 'bg-red-50 text-red-700 border-red-300'
                              }`}>
                                {msg.provenance.confidenceBand.toUpperCase()} {msg.provenance.confidence}%
                              </span>
                            </div>
                            {msg.provenance.sources.length > 0 && (
                              <ul className="text-[10px] text-slate-500 space-y-0.5">
                                {msg.provenance.sources.slice(0, 3).map((source, idx) => (
                                  <li key={`${msg.id}-source-${idx}`}>• {source}</li>
                                ))}
                              </ul>
                            )}
                            {/* Feedback controls */}
                            <div className="flex items-center gap-3 pt-1">
                              <span className="text-[10px] text-slate-400">Feedback:</span>
                              <button
                                onClick={() => handleMessageFeedback(msg.id, 'up')}
                                className={`p-0.5 rounded transition-colors ${
                                  feedbackMap[msg.id] === 'up'
                                    ? 'text-green-600 bg-green-50'
                                    : 'text-slate-400 hover:text-green-600'
                                }`}
                                title="Mark helpful"
                              >
                                <ThumbsUp size={12} />
                              </button>
                              <button
                                onClick={() => handleMessageFeedback(msg.id, 'down')}
                                className={`p-0.5 rounded transition-colors ${
                                  feedbackMap[msg.id] === 'down'
                                    ? 'text-red-500 bg-red-50'
                                    : 'text-slate-400 hover:text-red-500'
                                }`}
                                title="Mark unhelpful"
                              >
                                <ThumbsDown size={12} />
                              </button>
                              {feedbackMap[msg.id] && (
                                <span className="text-[10px] text-slate-500">
                                  {feedbackMap[msg.id] === 'up' ? 'Helpful ✓' : 'Noted ✓'}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="px-5 py-4 bg-white border border-stone-200 rounded-lg shadow-sm flex items-center gap-4">
                        <ThinkingOrb />
                        <div className="flex flex-col">
                          <span className="text-[13px] font-medium text-slate-700">
                            {isStreamingResponse ? 'Streaming response...' : currentPhase === 'generation' ? 'Generating documents...' : 'Processing...'}
                          </span>
                          <span className="text-[11px] text-slate-400 mt-0.5">BW Consultant is thinking</span>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
              {/* Report Options Panel - inside scroll area, appears after AI document analysis */}
              {showReportOptions && reportOptionsMenu && (
                <div className="px-2 pt-6 pb-4 max-w-3xl mx-auto w-full">
                  <ReportOptionsPanel
                    menu={reportOptionsMenu}
                    documentTitle={reportOptionsDocTitle}
                    documentType={reportOptionsDocType}
                    onSelectTier={(tierKey: ReportTierKey, includeAnnotation: boolean) => {
                      setShowReportOptions(false);
                      const tier = ReportLengthRouter.getTier(tierKey);
                      // Embed stored document content directly so the AI has context even if
                      // this is the second send turn (hadFileUpload will be false)
                      const storedDocContent = uploadedFileContentsRef[0] ?? '';
                      const docBlock = storedDocContent && !storedDocContent.includes('extraction failed')
                        ? `\n\n--- DOCUMENT CONTENT (for report generation) ---\n${storedDocContent.slice(0, 12000)}\n--- END DOCUMENT ---`
                        : reportOptionsDocTitle
                          ? `\n\nDocument reference: "${reportOptionsDocTitle}" (content unavailable - use case context from prior conversation)`
                          : '';
                      const prompt = `GENERATE_REPORT_NOW::${tier.label}\n\nWrite a complete, fully-developed ${tier.label}.\nTarget: ${tier.wordRange} words across ${tier.sectionCount} sections.${docBlock}\n\nInclude ALL sections in full - do not abbreviate or stop early:\n${tier.sections.map((s, i) => `${i + 1}. ${s}`).join('\n')}${includeAnnotation ? '\n\nAlso annotate 5-8 key source passages for the annotated PDF export.' : ''}\n\nWrite each section in full now.`;
                      setInputValue(prompt);
                      setTimeout(() => {
                        const btn = document.querySelector('[data-send-btn]') as HTMLButtonElement;
                        btn?.click();
                      }, 80);
                    }}
                    onAddReport={(_id: string, title: string) => {
                      setRecommendedDocs(prev => {
                        if (prev.some(d => d.title === title)) return prev;
                        return [...prev, {
                          id: `options-panel-${Date.now()}`,
                          title,
                          description: `Additional report selected from document options panel`,
                          icon: <FileText size={18} />,
                          category: 'report' as const,
                          relevance: 80,
                          rationale: 'Selected from report options panel after document upload analysis.',
                          pageRange: '8-20 pages',
                          supportingDocuments: [],
                        }];
                      });
                    }}
                    onAddLetter={(_id: string, title: string) => {
                      setRecommendedDocs(prev => {
                        if (prev.some(d => d.title === title)) return prev;
                        return [...prev, {
                          id: `options-letter-${Date.now()}`,
                          title,
                          description: `Letter selected from document options panel`,
                          icon: <Mail size={18} />,
                          category: 'letter' as const,
                          relevance: 75,
                          rationale: 'Selected from letter options panel after document upload analysis.',
                          pageRange: '1-4 pages',
                          supportingDocuments: [],
                        }];
                      });
                    }}
                    onGenerateAnnotatedPDF={() => {
                      const text = uploadedFileContentsRef[0] ?? '';
                      const paragraphs = text
                        .split(/\n\n+/)
                        .filter(p => p.trim().length > 120)
                        .slice(0, 10);
                      const annotations = paragraphs.map((p, i) => ({
                        label: `Passage ${i + 1}`,
                        sourceText: p.slice(0, 300),
                        analysisText:
                          'Key passage from uploaded document. Submit the document in chat to generate full OS annotations with NSIL, HistoricalMatcher, and PartnerIntelligence analysis.',
                        engineSources: ['NSIL', 'HistoricalMatcher'],
                        severity: 'insight' as const,
                      }));
                      PDFAnnotationService.generate({
                        documentTitle: reportOptionsDocTitle,
                        documentType: reportOptionsDocType,
                        jurisdiction: caseStudy.country || 'Unknown',
                        preparedFor: caseStudy.organizationName || 'Government Member',
                        reportId: `BWGA-${Date.now()}`,
                        executiveSummary:
                          `This annotated PDF was generated from an uploaded document by the BW NEXUS AI system. ` +
                          `${paragraphs.length} key passages have been flagged. Submit the document in the chat conversation to generate full intelligence-annotated responses for each passage.`,
                        annotations,
                      });
                    }}
                    onDismiss={() => setShowReportOptions(false)}
                  />
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>


            {/* Uploaded Files Preview */}
            {uploadedFiles.length > 0 && (
              <div className="px-6 py-2 border-t border-stone-200 bg-white">
                <p className="text-xs text-slate-500 mb-1">Attached files:</p>
                <div className="flex flex-wrap gap-2">
                  {uploadedFiles.map((file, i) => (
                    <span key={i} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 border border-blue-200 flex items-center gap-1">
                      <Paperclip size={12} />
                      {file.name}
                      <button 
                        onClick={() => setUploadedFiles(prev => prev.filter((_, idx) => idx !== i))}
                        className="ml-1 hover:text-blue-900"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Input Area */}
            <div className="p-4 border-t border-stone-200 bg-white">
              <div className="flex items-end gap-3 max-w-4xl mx-auto">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-3 bg-stone-100 hover:bg-stone-200 text-slate-600 border border-stone-300 transition-all"
                  title="Upload documents"
                >
                  <Paperclip size={20} />
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  multiple
                  className="hidden"
                  accept=".txt,.md,.csv,.json,.pdf"
                />
                {/* Voice input button */}
                <button
                  type="button"
                  onClick={toggleVoiceInput}
                  title={isListening ? 'Stop listening' : 'Speak your message'}
                  className={`p-3 border transition-all flex-shrink-0 ${
                    isListening
                      ? 'bg-red-500 text-white border-red-600 animate-pulse'
                      : 'bg-stone-100 hover:bg-stone-200 text-slate-600 border-stone-300'
                  }`}
                >
                  {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                </button>
                {/* Voice output (TTS) toggle */}
                <button
                  type="button"
                  title={voiceEnabled ? 'Voice on - click to mute' : 'Voice off - click to enable'}
                  onClick={() => {
                    const next = !voiceEnabled;
                    setVoiceEnabled(next);
                    ttsService.setEnabled(next);
                  }}
                  className={`p-3 border transition-all flex-shrink-0 flex items-center gap-1 ${
                    voiceEnabled
                      ? 'bg-blue-50 text-blue-600 border-blue-300 hover:bg-blue-100'
                      : 'bg-stone-100 text-slate-400 border-stone-300 hover:bg-stone-200'
                  }`}
                >
                  {voiceEnabled ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                      <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                      <line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>
                    </svg>
                  )}
                </button>
                <textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder={
                    currentPhase === 'intake' 
                      ? "Type your response..." 
                      : currentPhase === 'recommendations'
                        ? "Select documents or describe what you need..."
                        : "Share more details or ask questions..."
                  }
                  className="flex-1 resize-none border border-stone-300 px-3 md:px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[48px] max-h-[150px] leading-relaxed"
                  rows={1}
                />
                <button
                  data-send-btn
                  onClick={handleSend}
                  disabled={(!inputValue.trim() && uploadedFiles.length === 0) || isLoading}
                  className={`px-4 md:px-6 py-3 text-sm font-medium transition-all flex items-center gap-2 ${
                    (!inputValue.trim() && uploadedFiles.length === 0) || isLoading
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {isLoading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <>
                      <Send size={16} />
                      {!isMobile && 'Send'}
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowExecutionTimeline((prev) => !prev)}
                  className="px-3 py-2 text-xs border border-stone-300 bg-stone-50 text-slate-700 hover:bg-stone-100"
                >
                  {showExecutionTimeline ? 'Hide Runtime' : 'Show Runtime'}
                </button>
              </div>
              {showExecutionTimeline && executionTimeline.length > 0 && (
                <div className="max-w-4xl mx-auto mt-2 border border-stone-200 bg-stone-50 px-3 py-2">
                  <p className="text-[11px] font-semibold text-slate-800">Background Runtime</p>
                  <div className="mt-1 grid md:grid-cols-2 gap-1.5">
                    {executionTimeline.map((task) => (
                      <div key={task.id} className="flex items-start justify-between gap-2 border border-stone-200 bg-white px-2 py-1">
                        <div>
                          <p className="text-[11px] text-slate-700 font-medium">{task.label}</p>
                          {task.detail && <p className="text-[10px] text-slate-500">{task.detail}</p>}
                        </div>
                        <span className={`text-[10px] px-1.5 py-0.5 border ${
                          task.status === 'completed'
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : task.status === 'running'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : task.status === 'failed'
                                ? 'bg-red-50 text-red-700 border-red-200'
                                : task.status === 'skipped'
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : 'bg-stone-100 text-stone-600 border-stone-200'
                        }`}>
                          {task.status.toUpperCase()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Onboarding guided flow */}
              {showOnboarding && messages.length === 0 && !isLoading && (
                <div className="max-w-4xl mx-auto mb-2 border border-indigo-200 bg-indigo-50 px-4 py-3 relative">
                  <button
                    onClick={() => setShowOnboarding(false)}
                    className="absolute top-2 right-2 text-indigo-400 hover:text-indigo-600"
                  >
                    <X size={12} />
                  </button>
                  <p className="text-[11px] font-semibold text-indigo-900 flex items-center gap-1 mb-2">
                    <CheckCircle2 size={12} className="text-indigo-600" />
                    Quick Start - Try one of these:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      'I need to enter a new market in Southeast Asia',
                      'Help me prepare a government submission in Australia',
                      'I\'m structuring a cross-border partnership in the EU',
                      'I need a risk and compliance framework for MENA'
                    ].map((prompt) => (
                      <button
                        key={prompt}
                        onClick={() => { setInputValue(prompt); setShowOnboarding(false); }}
                        className="text-[11px] px-2.5 py-1.5 bg-white border border-indigo-300 text-indigo-700 hover:bg-indigo-100 transition-colors"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {reactiveDraftStatus && !isLoading && (
                <div className="max-w-4xl mx-auto mt-2 border border-blue-200 bg-blue-50 px-3 py-2">
                  <p className="text-[11px] font-semibold text-blue-800">{reactiveDraftStatus}</p>
                  <p className="text-[11px] text-blue-700 mt-0.5">{reactiveDraftHint}</p>
                </div>
              )}
              {messages.length > 0 && (augmentedAISnapshot || augmentedRecommendedTools.length > 0 || augmentedUnresolvedGaps.length > 0) && (
                <div className="max-w-4xl mx-auto mt-2 border border-emerald-300 bg-emerald-50 px-3 py-2">
                  <p className="text-[11px] font-semibold text-emerald-900 flex items-center gap-1">
                    <CheckCircle2 size={11} className="text-emerald-700" />
                    Augmented AI Human-in-the-Loop {augmentedCapabilityMode ? `• Mode: ${augmentedCapabilityMode}` : ''}
                  </p>
                  {(strategicPipeline || overlookedIntelligence) && (
                    <p className="mt-1 text-[10px] text-emerald-800">
                      Strategic readiness: {typeof strategicPipeline?.readinessScore === 'number' ? `${strategicPipeline.readinessScore}%` : 'n/a'}
                      {overlookedIntelligence?.topRegionalOpportunities?.[0]?.place ? ` • Top regional target: ${overlookedIntelligence.topRegionalOpportunities[0].place}` : ''}
                    </p>
                  )}
                  {augmentedCapabilityTags.length > 0 && (
                    <p className="mt-1 text-[10px] text-emerald-800">
                      Tags: {augmentedCapabilityTags.join(' • ')}
                    </p>
                  )}
                  {augmentedAISnapshot?.steps?.length ? (
                    <ul className="mt-1 space-y-0.5">
                      {augmentedAISnapshot.steps.map((step) => (
                        <li key={`aug-step-${step.title}`} className="text-[10px] text-emerald-900">• <strong>{step.title}:</strong> {step.detail}</li>
                      ))}
                    </ul>
                  ) : null}
                  {augmentedUnresolvedGaps.length > 0 && (
                    <div className="mt-2 border border-amber-200 bg-amber-50 px-2 py-1">
                      <p className="text-[10px] font-semibold text-amber-900">Top unresolved gaps</p>
                      <ul className="mt-0.5 space-y-0.5">
                        {augmentedUnresolvedGaps.slice(0, 3).map((gap, index) => (
                          <li key={`aug-gap-${gap.key}-${index}`} className="text-[10px] text-amber-800">• [{gap.severity}] {gap.question}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {augmentedRecommendedTools.length > 0 && (
                    <div className="mt-2 border border-emerald-200 bg-white px-2 py-1">
                      <p className="text-[10px] font-semibold text-emerald-900">Recommended software tools</p>
                      <ul className="mt-0.5 space-y-0.5">
                        {augmentedRecommendedTools.slice(0, 4).map((tool) => (
                          <li key={tool.id} className="text-[10px] text-slate-700">• {tool.name} ({tool.category}) - {tool.bwUseCase}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] text-emerald-800 flex items-center gap-1">
                      <CheckCircle2 size={10} className="text-emerald-600" />
                      {augmentedReviewState === 'accept' ? 'Augmented reasoning auto-applied' : 'Applying augmented reasoning…'}
                    </span>
                    {augmentedReviewLoading && <Loader2 size={11} className="animate-spin text-emerald-700" />}
                  </div>
                </div>
              )}
              {/* Action Execution Panel */}
              {pendingActions.filter((a) => a.status !== 'done' && a.status !== 'rejected').length > 0 && (
                <div className="max-w-4xl mx-auto mt-2 border border-amber-300 bg-amber-50 px-3 py-2">
                  <p className="text-[11px] font-semibold text-amber-900 flex items-center gap-1">
                    <Zap size={11} className="text-amber-600" />
                    Pending Actions
                  </p>
                  <div className="mt-1 space-y-1">
                    {pendingActions
                      .filter((a) => a.status !== 'done' && a.status !== 'rejected')
                      .map((action) => (
                        <div key={action.id} className="flex items-center justify-between gap-2 border border-amber-200 bg-white px-2 py-1">
                          <div>
                            <p className="text-[11px] text-slate-800 font-medium">{action.label}</p>
                            <p className="text-[10px] text-slate-500">{action.description}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            {action.status === 'executing' ? (
                              <Loader2 size={12} className="animate-spin text-blue-600" />
                            ) : (
                              <>
                                <button
                                  onClick={() => setApprovalGateAction(action)}
                                  className="px-2 py-0.5 text-[10px] bg-blue-600 text-white hover:bg-blue-700"
                                >
                                  <PlayCircle size={10} className="inline mr-1" />
                                  Execute
                                </button>
                                <button
                                  onClick={() => setPendingActions((prev) => prev.map((a) => a.id === action.id ? { ...a, status: 'rejected' } : a))}
                                  className="px-2 py-0.5 text-[10px] bg-stone-100 text-slate-600 border border-stone-300 hover:bg-stone-200"
                                >
                                  Dismiss
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      ))
                    }
                  </div>
                </div>
              )}
              {/* Compliance Warning Strip */}
              {complianceWarnings.length > 0 && (
                <div className="max-w-4xl mx-auto mt-2 border border-red-200 bg-red-50 px-3 py-2">
                  <p className="text-[11px] font-semibold text-red-800 flex items-center gap-1">
                    <AlertTriangle size={11} className="text-red-600" />
                    Compliance Flags
                  </p>
                  <ul className="mt-1 space-y-0.5">
                    {complianceWarnings.map((w, i) => (
                      <li key={i} className="text-[11px] text-red-700">• {w}</li>
                    ))}
                  </ul>
                </div>
              )}
              <p className="text-[10px] text-slate-400 mt-2 text-center">
                Enter to send • Shift+Enter new line
              </p>
            </div>

            {/* NSIL Footer */}
            <div className="px-4 py-2 bg-blue-50 border-t border-blue-200 text-[10px] text-blue-700 flex items-center justify-between">
              <span>
                <strong>NSIL Agentic Runtime</strong> - Sovereign-grade intelligence • Real-time analysis • Locale: {locale.toUpperCase()}
              </span>
              <span className="text-[10px] text-slate-400">
                Learning: {OutcomeLearningService.getState().records.length} sessions logged
              </span>
            </div>
          </div>

          {/* Right Sidebar - hidden on mobile, shown as slide-over */}
          {isMobile && showMobileSidebar && (
            <div className="fixed inset-0 z-30 bg-black/40" onClick={() => setShowMobileSidebar(false)} />
          )}
          <div className={`${
            isMobile
              ? `fixed top-0 right-0 z-30 h-full w-[85vw] max-w-[384px] shadow-2xl transition-transform duration-300 ${showMobileSidebar ? 'translate-x-0' : 'translate-x-full'}`
              : 'w-96'
          } border-l border-stone-200 bg-white flex flex-col overflow-y-auto`}>
            {isMobile && (
              <button onClick={() => setShowMobileSidebar(false)} className="absolute top-3 right-3 z-10 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600">
                <X size={16} />
              </button>
            )}
            <div className="p-4 border-b border-stone-200 bg-slate-50">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileText size={16} className="text-blue-600" />
                BW Consultant - Live Case Study Workspace
              </h2>
              <div className="mt-2 grid grid-cols-1 gap-1 text-[11px]">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 border border-blue-200 font-semibold">
                    Stage: {liveDraftStatus}
                  </span>
                  <span className="px-2 py-1 bg-white text-slate-700 border border-stone-300">
                    Readiness: {liveDraftReadiness}%
                  </span>
                  <span className="px-2 py-1 bg-slate-100 text-slate-600 border border-slate-200">
                    Pack: {resolvePolicyPack(caseStudy).id === 'global-default' ? 'Pending selection' : resolvePolicyPack(caseStudy).label}
                  </span>
                </div>
                <div className="h-1.5 bg-stone-200 border border-stone-300 overflow-hidden">
                  <div
                    className="h-full bg-blue-500"
                    style={{ width: `${liveDraftReadiness}%` }}
                  />
                </div>
              </div>
              <p className="mt-2 text-[11px] text-slate-600">This is your live working draft. Report structure is established after baseline inputs are captured.</p>
              <p className="mt-1 text-[10px] text-slate-500">
                {!isCaseStudyComplete
                  ? 'Evaluation and recommended action steps unlock only after the case study reaches 100% readiness.'
                  : 'Case complete: evaluation and recommended action steps are now active.'}
              </p>

              <div className="mt-3 border border-stone-200 bg-white p-3 min-h-[760px]">
                {!hasLiveDraftSignals ? (
                  <div className="border border-stone-200 bg-white px-4 py-4 min-h-[700px]">
                    <p className="text-[11px] font-semibold text-slate-800">Case Study Report - Live Draft (Page 1)</p>
                    <p className="mt-1 text-[10px] text-slate-500">Start with baseline details. The system will establish report sections only after enough context is provided.</p>
                    <div className="mt-3 border border-blue-200 bg-blue-50 px-2 py-2">
                      <p className="text-[10px] font-semibold text-blue-800">Baseline needed first:</p>
                      <ul className="mt-1 space-y-0.5">
                        <li className="text-[10px] text-blue-800">• Who you are (role + organisation)</li>
                        <li className="text-[10px] text-blue-800">• Country / jurisdiction</li>
                        <li className="text-[10px] text-blue-800">• Decision needed and objective</li>
                        <li className="text-[10px] text-blue-800">• Constraints and deadline</li>
                        <li className="text-[10px] text-blue-800">• Target audience (board, regulator, investor, partner)</li>
                      </ul>
                    </div>
                    <div className="mt-3 space-y-3">
                      {Array.from({ length: 20 }).map((_, index) => (
                        <div key={`a4-line-${index}`} className="border-b border-stone-200 h-5" />
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="border border-stone-200 bg-white px-4 py-4 min-h-[700px]">
                    <p className="text-[11px] font-semibold text-slate-800">Case Study Notes - Live Notepad (Page 1)</p>
                    <p className="mt-1 text-[10px] text-slate-500">BW Consultant side notes — auto-captured from conversation.</p>
                    <div className="mt-3 space-y-2 text-[10px] text-slate-700">
                      {/* Identity & Context */}
                      {(caseStudy.userName || caseStudy.contactRole || caseStudy.organizationName) && (
                        <div className="border-b border-stone-200 pb-2">
                          <p className="font-semibold text-slate-800 mb-0.5">Client Identity</p>
                          {caseStudy.userName && <p>• Name: {caseStudy.userName}</p>}
                          {caseStudy.contactRole && <p>• Role: {caseStudy.contactRole}</p>}
                          {caseStudy.organizationName && <p>• Organisation: {caseStudy.organizationName}</p>}
                          {caseStudy.organizationType && <p>• Type: {caseStudy.organizationType}</p>}
                        </div>
                      )}
                      {/* Location & Jurisdiction */}
                      {(caseStudy.country || caseStudy.jurisdiction) && (
                        <div className="border-b border-stone-200 pb-2">
                          <p className="font-semibold text-slate-800 mb-0.5">Jurisdiction</p>
                          {caseStudy.country && <p>• Country: {caseStudy.country}</p>}
                          {caseStudy.jurisdiction && <p>• Jurisdiction: {caseStudy.jurisdiction}</p>}
                        </div>
                      )}
                      {/* Matter & Objectives */}
                      {(caseStudy.currentMatter || caseStudy.objectives) && (
                        <div className="border-b border-stone-200 pb-2">
                          <p className="font-semibold text-slate-800 mb-0.5">Matter & Objectives</p>
                          {caseStudy.currentMatter && <p>• Matter: {caseStudy.currentMatter}</p>}
                          {caseStudy.objectives && <p>• Objective: {caseStudy.objectives}</p>}
                          {caseStudy.targetAudience && <p>• Audience: {caseStudy.targetAudience}</p>}
                          {caseStudy.constraints && <p>• Constraints: {caseStudy.constraints}</p>}
                          {caseStudy.decisionDeadline && <p>• Deadline: {caseStudy.decisionDeadline}</p>}
                        </div>
                      )}
                      {/* AI Insights — side notes captured during conversation */}
                      {caseStudy.aiInsights.length > 0 && (
                        <div className="border-b border-stone-200 pb-2">
                          <p className="font-semibold text-slate-800 mb-0.5">Consultant Observations ({caseStudy.aiInsights.length})</p>
                          {caseStudy.aiInsights.slice(-8).map((insight, idx) => (
                            <p key={`note-${idx}`} className="text-[9px] text-slate-600 leading-tight">• {insight.length > 200 ? insight.slice(0, 200) + '...' : insight}</p>
                          ))}
                        </div>
                      )}
                      {/* Additional context from conversation history */}
                      {caseStudy.additionalContext.length > 0 && (
                        <div className="border-b border-stone-200 pb-2">
                          <p className="font-semibold text-slate-800 mb-0.5">Conversation Notes ({caseStudy.additionalContext.length})</p>
                          {caseStudy.additionalContext.slice(-6).map((ctx, idx) => (
                            <p key={`ctx-${idx}`} className="text-[9px] text-slate-600 leading-tight">• {ctx.length > 200 ? ctx.slice(0, 200) + '...' : ctx}</p>
                          ))}
                        </div>
                      )}
                      {/* Remaining blank lines for future notes */}
                      <div className="mt-2 space-y-3">
                        {Array.from({ length: Math.max(5, 15 - caseStudy.aiInsights.length - caseStudy.additionalContext.length) }).map((_, index) => (
                          <div key={`a4-line-live-${index}`} className="border-b border-stone-200 h-5" />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Document Recommendations */}
            {(currentPhase === 'recommendations' || currentPhase === 'generation' || recommendedDocs.length > 0) && (
              <div className="flex-1 overflow-y-auto p-4">
                <h3 className="text-sm font-bold text-slate-900 mb-3">Recommended Documents</h3>

                <div className="mb-3 border border-stone-200 bg-white p-2">
                  <p className="text-[11px] font-semibold text-slate-700">Output Type Preference</p>
                  <div className="mt-1 grid grid-cols-5 gap-1">
                    {([
                      { id: 'auto', label: 'Auto' },
                      { id: 'letter', label: 'Letter' },
                      { id: 'document', label: 'Document' },
                      { id: 'case-study', label: 'Case Study' },
                      { id: 'full-pack', label: 'Full Pack' }
                    ] as Array<{ id: 'auto' | 'letter' | 'document' | 'case-study' | 'full-pack'; label: string }>).map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setPreferredOutputMode(option.id)}
                        className={`text-[10px] px-1.5 py-1 border ${
                          preferredOutputMode === option.id
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-slate-700 border-stone-300 hover:bg-stone-50'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  <p className="mt-1 text-[10px] text-slate-500">Choose the output type the person needs first. Recommendations are re-ranked to match this preference.</p>
                </div>

                <div className="mb-3 border border-stone-200 bg-slate-50 p-2">
                  <label className="mb-2 flex items-start gap-2 text-[11px] text-slate-700">
                    <input
                      type="checkbox"
                      checked={fullSpectrumReasoningMode}
                      onChange={(e) => setFullSpectrumReasoningMode(e.target.checked)}
                      className="mt-0.5"
                    />
                    <span>
                      Full OS filtration mode (run all substantive requests through all core brains, then surface only relevant signals)
                    </span>
                  </label>
                  <label className="flex items-start gap-2 text-[11px] text-slate-700">
                    <input
                      type="checkbox"
                      checked={enableFullCaseTreeMatching}
                      onChange={(e) => setEnableFullCaseTreeMatching(e.target.checked)}
                      className="mt-0.5"
                    />
                    <span>
                      Run full case-tree match scan (conversation, uploaded files, NSIL insights, policy requirements, and recommendation graph)
                    </span>
                  </label>
                  {enableFullCaseTreeMatching && (
                    <ul className="mt-2 space-y-0.5">
                      {fullCaseTreeMatchingSignals.slice(0, 6).map((signal, index) => (
                        <li key={`full-case-match-${index}`} className="text-[10px] text-slate-600">• {signal}</li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="mb-3 border border-stone-200 bg-slate-50 p-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] font-semibold text-slate-700">Learning Summary</p>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setStrictLearningImport(prev => !prev)}
                        className={`text-[10px] px-1.5 py-1 border ${
                          strictLearningImport
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white border-stone-300 text-slate-700 hover:bg-stone-100'
                        }`}
                        title="When enabled, only matching profile version imports are accepted"
                      >
                        Strict {strictLearningImport ? 'On' : 'Off'}
                      </button>
                      <button
                        type="button"
                        onClick={() => learningProfileInputRef.current?.click()}
                        className="text-[10px] px-1.5 py-1 bg-white border border-stone-300 text-slate-700 hover:bg-stone-100"
                      >
                        Import
                      </button>
                      <button
                        type="button"
                        onClick={handleExportLearningProfile}
                        className="text-[10px] px-1.5 py-1 bg-white border border-stone-300 text-slate-700 hover:bg-stone-100"
                      >
                        Export
                      </button>
                      <button
                        type="button"
                        onClick={handleResetLearningSignals}
                        disabled={learningSummary.length === 0}
                        className={`text-[10px] px-1.5 py-1 border ${
                          learningSummary.length === 0
                            ? 'bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed'
                            : 'bg-white border-stone-300 text-slate-700 hover:bg-stone-100'
                        }`}
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                  <input
                    ref={learningProfileInputRef}
                    type="file"
                    className="hidden"
                    accept="application/json,.json"
                    onChange={handleImportLearningProfile}
                  />
                  {learningSummary.length === 0 && (
                    <p className="mt-1 text-[10px] text-slate-500">No learned signals yet. Import a profile or submit feedback after generation.</p>
                  )}
                  <p className="mt-1 text-[10px] text-slate-500">
                    Import mode: {strictLearningImport ? `Strict (v${LEARNING_PROFILE_VERSION} only)` : 'Compatibility (legacy and mismatched versions allowed)'}
                  </p>
                  {boostedDocuments.length > 0 && (
                    <p className="mt-1 text-[10px] text-green-700">
                      Boosted: {boostedDocuments.map((item) => `${item.title} (+${item.boost})`).join(' • ')}
                    </p>
                  )}
                  {penalizedDocuments.length > 0 && (
                    <p className="mt-1 text-[10px] text-amber-700">
                      Penalized: {penalizedDocuments.map((item) => `${item.title} (${item.boost})`).join(' • ')}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  {recommendedDocs.map((doc) => (
                    <button
                      key={doc.id}
                      onClick={() => {
                        if (selectedDocs.includes(doc.id)) {
                          setSelectedDocs(prev => prev.filter(d => d !== doc.id));
                        } else {
                          setSelectedDocs(prev => [...prev, doc.id]);
                        }
                      }}
                      className={`w-full p-3 text-left transition-all border ${
                        selectedDocs.includes(doc.id)
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white hover:bg-blue-50 text-slate-900 border-stone-200 hover:border-blue-400'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`${selectedDocs.includes(doc.id) ? 'text-white' : 'text-blue-600'}`}>
                          {doc.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{doc.title}</p>
                          <p className={`text-xs ${selectedDocs.includes(doc.id) ? 'text-blue-100' : 'text-slate-500'}`}>
                            {doc.description}
                          </p>
                          <p className={`text-[11px] mt-1 ${selectedDocs.includes(doc.id) ? 'text-blue-100' : 'text-slate-600'}`}>
                            {doc.rationale}
                          </p>
                          {recommendationRationaleMap[doc.id] && (
                            <p className={`text-[10px] mt-1 ${selectedDocs.includes(doc.id) ? 'text-blue-100' : 'text-slate-500'}`}>
                              {recommendationRationaleMap[doc.id]}
                            </p>
                          )}
                          <p className={`text-[11px] mt-1 ${selectedDocs.includes(doc.id) ? 'text-blue-100' : 'text-slate-600'}`}>
                            Length: {doc.pageRange}
                          </p>
                          {doc.supportingDocuments.length > 0 && (
                            <p className={`text-[10px] mt-1 ${selectedDocs.includes(doc.id) ? 'text-blue-100' : 'text-slate-500'}`}>
                              Support docs: {doc.supportingDocuments.join(', ')}
                            </p>
                          )}
                          {doc.contactLetterFor && (
                            <p className={`text-[10px] mt-1 ${selectedDocs.includes(doc.id) ? 'text-blue-100' : 'text-slate-500'}`}>
                              Contact letter: {doc.contactLetterFor}
                            </p>
                          )}
                        </div>
                        <div className={`text-xs font-medium ${selectedDocs.includes(doc.id) ? 'text-blue-200' : 'text-blue-600'}`}>
                          {doc.relevance}%
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                {primaryRecommendation && (
                  <div className="mt-4 border border-blue-200 bg-blue-50 p-3">
                    <p className="text-[11px] font-semibold text-blue-800">Why Selected</p>
                    <p className="text-xs text-slate-700 mt-1">
                      <strong>{primaryRecommendation.title}</strong> ranks highest for this case based on fit, evidence strength, urgency, and compliance alignment.
                    </p>
                    {recommendationRationaleMap[primaryRecommendation.id] && (
                      <p className="text-[11px] text-slate-600 mt-1">{recommendationRationaleMap[primaryRecommendation.id]}</p>
                    )}

                    {alternativeRecommendations.length > 0 && (
                      <div className="mt-3">
                        <p className="text-[11px] font-semibold text-slate-700">Why Not Selected (Top Alternatives)</p>
                        <ul className="mt-1 space-y-1">
                          {alternativeRecommendations.map((alt) => {
                            const primaryScore = recommendationScoreMap[primaryRecommendation.id]?.total ?? primaryRecommendation.relevance;
                            const altScore = recommendationScoreMap[alt.id]?.total ?? alt.relevance;
                            const delta = Math.max(0, Math.round(primaryScore - altScore));
                            const upgradeHint = getRankUpgradeHint(alt.id);
                            return (
                              <li key={alt.id} className="text-[11px] text-slate-600">
                                <strong>{alt.title}</strong> scored {delta} points lower due to weaker fit/evidence for current objective, audience, or jurisdiction.
                                {upgradeHint && (
                                  <div className="mt-1 text-[10px] text-blue-700 bg-blue-100 border border-blue-200 p-1.5">
                                    {upgradeHint}
                                  </div>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleImproveAlternative(alt)}
                                  className="mt-1 text-[10px] px-2 py-1 bg-white border border-blue-300 text-blue-700 hover:bg-blue-50"
                                >
                                  Improve this option
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {recommendedDocs.length > 0 && currentPhase !== 'generation' && (
                  <>
                    <div className="mt-3 border border-stone-200 bg-white p-2">
                      <p className="text-[11px] font-semibold text-slate-700">Create Outputs</p>
                      <div className="mt-1 grid grid-cols-5 gap-1.5">
                        {([
                          { id: 'selected', label: 'Selected' },
                          { id: 'letters-only', label: 'Letters Only' },
                          { id: 'reports-only', label: 'Reports Only' },
                          { id: 'case-study-only', label: 'Case Study' },
                          { id: 'full-pack', label: 'Full Pack' }
                        ] as Array<{ id: 'selected' | 'letters-only' | 'reports-only' | 'case-study-only' | 'full-pack'; label: string }>).map((option) => (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => setGenerationScope(option.id)}
                            className={`text-[10px] px-1.5 py-1 border ${
                              generationScope === option.id
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-white text-slate-700 border-stone-300 hover:bg-stone-50'
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="mt-3 border border-stone-200 bg-white p-2">
                      <p className="text-[11px] font-semibold text-slate-700">Document Length</p>
                      <div className="mt-1 grid grid-cols-3 gap-1.5">
                        {([
                          { id: 'brief-1', label: '1-Page Brief' },
                          { id: 'memo-5', label: '5-Page Memo' },
                          { id: 'report-20', label: '20-Page Report' }
                        ] as Array<{ id: 'brief-1' | 'memo-5' | 'report-20'; label: string }>).map((option) => (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => setOutputDepth(option.id)}
                            className={`text-[10px] px-1.5 py-1 border ${
                              outputDepth === option.id
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-white text-slate-700 border-stone-300 hover:bg-stone-50'
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                      <p className="mt-1 text-[10px] text-slate-500">Selected: {outputDepthSpec.label}</p>
                    </div>

                    <label className="mt-4 flex items-start gap-2 text-xs text-slate-600">
                      <input
                        type="checkbox"
                        checked={allowAllDocumentAccess}
                        onChange={(e) => setAllowAllDocumentAccess(e.target.checked)}
                        className="mt-0.5"
                      />
                      Allow BW Consultant to use all uploaded material for final generation and support-document mapping.
                    </label>
                    <button
                      onClick={handleGenerateDocuments}
                      disabled={isLoading || readinessScore < 70 || criticalCaseGaps.filter(g => g.severity === 'critical' || g.severity === 'high').length > 0}
                      className={`mt-3 w-full py-3 font-medium text-sm flex items-center justify-center gap-2 transition-all ${
                        isLoading || readinessScore < 70 || criticalCaseGaps.filter(g => g.severity === 'critical' || g.severity === 'high').length > 0
                          ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {isLoading && generatingProgress ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Generating {generatingProgress.current}/{generatingProgress.total}...
                        </>
                      ) : isLoading ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          Generate {generationScope === 'selected'
                            ? `${selectedDocs.length} Selected`
                            : generationScope === 'letters-only'
                              ? 'Letters'
                              : generationScope === 'reports-only'
                                ? 'Reports'
                                : generationScope === 'case-study-only'
                                  ? 'Case Study'
                                  : 'Full Pack'}
                        </>
                      )}
                    </button>
                    {(readinessScore < 70 || criticalCaseGaps.filter(g => g.severity === 'critical' || g.severity === 'high').length > 0) && (
                      <p className="text-[10px] mt-2 text-amber-700 bg-amber-50 border border-amber-200 p-2">
                        Generation requires readiness ≥ 70% and no critical case gaps. Current: {readinessScore}%
                      </p>
                    )}
                    {/* Full Catalog Browser */}
                    <button
                      onClick={() => setShowFullCatalog(true)}
                      className="mt-2 w-full py-2 text-xs font-semibold border border-stone-300 text-stone-700 hover:bg-stone-100 flex items-center justify-center gap-2 transition-colors"
                    >
                      📖 Browse Full Catalog - {IntelligentDocumentGenerator.getCatalogSummary().totalDocumentTypes} Documents &middot; {IntelligentDocumentGenerator.getCatalogSummary().totalLetterTypes} Letters
                    </button>
                    {/* Autonomous Run - Together.ai Agent */}
                    <button
                      onClick={handleAutonomousRun}
                      disabled={isAutonomousRunning || isLoading}
                      title="Autonomous AI agent mode: researches, selects, and writes all documents without manual steps"
                      className={`mt-2 w-full py-2.5 text-xs font-semibold flex items-center justify-center gap-2 transition-all border ${
                        isAutonomousRunning
                          ? 'bg-violet-100 text-violet-700 border-violet-300 cursor-wait'
                          : 'bg-violet-600 text-white border-violet-700 hover:bg-violet-700'
                      }`}
                    >
                      {isAutonomousRunning ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          {autonomousProgress ? `${autonomousProgress.phaseName} - ${autonomousProgress.overallPercent}%` : 'Agent running...'}
                        </>
                      ) : (
                        <>
                          ⚡ Autonomous Run - Llama 3.1 70B
                        </>
                      )}
                    </button>
                    {isAutonomousRunning && autonomousProgress && (
                      <div className="mt-1 p-2 bg-violet-50 border border-violet-200 rounded text-[10px] text-violet-800 font-mono">
                        {autonomousProgress.currentTask}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Generated Content Actions */}
            {(generatedContent || generatedDocuments.length > 0) && (
              <div className="p-4 border-t border-stone-200 bg-blue-50">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-slate-900">Documents Ready ({generatedDocuments.length || 1})</p>
                  <div className="flex gap-1">
                    <button
                      onClick={copyContent}
                      className="p-2 bg-white hover:bg-stone-100 text-slate-600 border border-stone-200"
                      title="Copy all"
                    >
                      {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
                    </button>
                    <button
                      onClick={downloadContent}
                      className="p-2 bg-white hover:bg-stone-100 text-slate-600 border border-stone-200"
                      title="Download all as HTML"
                    >
                      <Download size={16} />
                    </button>
                  </div>
                </div>
                {generatedDocuments.length > 0 ? (
                  <div className="space-y-1 mb-3">
                    {generatedDocuments.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between bg-white border border-stone-200 px-2 py-1.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {doc.category === 'letter' ? <Mail size={11} className="text-blue-500 shrink-0" /> : <FileText size={11} className="text-slate-500 shrink-0" />}
                          <span className="text-[11px] text-slate-800 truncate">{doc.title}</span>
                        </div>
                        <div className="flex gap-0.5 shrink-0 ml-2">
                          <button
                            onClick={() => downloadSingleDoc(doc)}
                            className="p-1 hover:bg-stone-100 text-slate-500 rounded"
                            title="Download as HTML (open in browser → print to PDF)"
                          >
                            <Download size={12} />
                          </button>
                          <button
                            onClick={() => downloadSingleDocAsDocx(doc)}
                            className="p-1 hover:bg-blue-50 text-blue-500 rounded text-[9px] font-bold leading-none w-5 h-5 flex items-center justify-center"
                            title="Download as Word (.docx)"
                          >
                            W
                          </button>
                        </div>
                      </div>
                    ))}
                    <p className="text-[10px] text-slate-500 pt-1">Open HTML in browser → File → Print → Save as PDF</p>
                  </div>
                ) : (
                  <p className="text-xs text-slate-600 mb-2">Copy or download your generated documents.</p>
                )}

                <div className="mt-3 bg-white border border-stone-200 p-2">
                  <p className="text-[11px] font-semibold text-slate-700">Was this recommendation outcome useful?</p>
                  <div className="mt-2 flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setFeedbackSignal('positive')}
                      className={`px-2 py-1 text-[10px] border transition-all ${
                        feedbackSignal === 'positive'
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-slate-700 border-stone-300 hover:bg-stone-50'
                      }`}
                    >
                      Useful
                    </button>
                    <button
                      type="button"
                      onClick={() => setFeedbackSignal('partial')}
                      className={`px-2 py-1 text-[10px] border transition-all ${
                        feedbackSignal === 'partial'
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-slate-700 border-stone-300 hover:bg-stone-50'
                      }`}
                    >
                      Partially Useful
                    </button>
                    <button
                      type="button"
                      onClick={() => setFeedbackSignal('negative')}
                      className={`px-2 py-1 text-[10px] border transition-all ${
                        feedbackSignal === 'negative'
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-slate-700 border-stone-300 hover:bg-stone-50'
                      }`}
                    >
                      Not Useful
                    </button>
                  </div>
                  <textarea
                    value={feedbackNote}
                    onChange={(e) => setFeedbackNote(e.target.value)}
                    placeholder="Optional: what should be improved next time?"
                    className="mt-2 w-full resize-none border border-stone-300 px-2 py-1 text-[11px] text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={2}
                  />
                  <button
                    type="button"
                    onClick={handleSubmitOutcomeFeedback}
                    disabled={!feedbackSignal || feedbackSubmitted}
                    className={`mt-2 w-full py-1.5 text-[11px] font-medium transition-all ${
                      !feedbackSignal || feedbackSubmitted
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {feedbackSubmitted ? 'Feedback Captured' : 'Save Feedback to Improve Ranking'}
                  </button>
                </div>
              </div>
            )}

            {/* Help text when no recommendations yet */}
            {recommendedDocs.length === 0 && currentPhase !== 'generation' && (
              <div className="flex-1 flex items-center justify-center p-4">
                <div className="text-center">
                  <HelpCircle size={32} className="mx-auto mb-2 text-blue-200" />
                  <p className="text-sm text-slate-600">Answer the questions to build your case.</p>
                  <p className="text-xs mt-1 text-slate-500">I'll recommend documents once I understand your situation.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

        {showPilotWindow && (
          <div className={`fixed top-0 right-0 z-40 h-full ${isMobile ? 'w-full' : 'w-[380px]'} border-l border-stone-200 bg-white shadow-2xl`}>
            <div className="h-full flex flex-col">
              <div className="px-4 py-3 border-b border-stone-200 bg-slate-50">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-slate-900">Live Research</h3>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        syncQuickConsultantToCaseStudy('manual-sync');
                        setLiveInsightsRequested(true);
                        void fetchLiveWorldInsights();
                      }}
                      className="px-2 py-1 text-[10px] border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    >
                      Push + Search
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowPilotWindow(false)}
                      className="p-1 border border-stone-300 text-slate-600 hover:bg-stone-100"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
                <p className="mt-1 text-[11px] text-slate-600">Use buttons while chatting to push context into BW Consultant and run live world research.</p>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                <div className="border border-stone-200 bg-white p-2">
                  <p className="text-[11px] font-semibold text-slate-700">Country / Region</p>
                  <input
                    type="text"
                    value={quickCountryFocus}
                    onChange={(e) => setQuickCountryFocus(e.target.value)}
                    onBlur={() => syncQuickConsultantToCaseStudy('country-input')}
                    placeholder="Type country, then refine search"
                    className="mt-1 w-full border border-stone-300 px-2 py-1.5 text-[11px] text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {['Philippines', 'Australia', 'Indonesia', 'Vietnam', 'India', 'UAE', 'Kenya', 'Brazil'].map((country) => (
                      <button
                        key={country}
                        type="button"
                        onClick={() => {
                          setQuickCountryFocus(country);
                          syncQuickConsultantToCaseStudy('country-chip', { country });
                        }}
                        className="px-1.5 py-0.5 text-[9px] border border-stone-300 bg-stone-50 text-slate-700 hover:bg-stone-100"
                      >
                        {country}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border border-stone-200 bg-white p-2">
                  <p className="text-[11px] font-semibold text-slate-700">Counterpart / Target</p>
                  <input
                    type="text"
                    value={quickBusinessTarget}
                    onChange={(e) => setQuickBusinessTarget(e.target.value)}
                    onBlur={() => syncQuickConsultantToCaseStudy('business-target-input')}
                    placeholder="Government, bank, investor, partner..."
                    className="mt-1 w-full border border-stone-300 px-2 py-1.5 text-[11px] text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="border border-stone-200 bg-white p-2">
                  <p className="text-[11px] font-semibold text-slate-700">Focus</p>
                  <div className="mt-1 grid grid-cols-2 gap-1">
                    {(['new-markets', 'government-entry', 'partnerships', 'risk-compliance', 'investment-readiness', 'operations-delivery'] as PilotModeFocus[]).map((focus) => (
                      <button
                        key={focus}
                        type="button"
                        onClick={() => handleTogglePilotFocus(focus)}
                        className={`text-[10px] px-1.5 py-1 border text-left ${
                          normalizedPilotFocusSelections.includes(focus)
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-slate-700 border-stone-300 hover:bg-stone-50'
                        }`}
                      >
                        {focus.replace(/-/g, ' ')}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border border-stone-200 bg-emerald-50 p-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] font-semibold text-emerald-800">Live Search Feed</p>
                    <button
                      type="button"
                      onClick={() => {
                        setLiveInsightsRequested(true);
                        void fetchLiveWorldInsights();
                      }}
                      disabled={liveInsightLoading}
                      className="px-2 py-1 text-[10px] border border-emerald-600 bg-emerald-600 text-white disabled:opacity-60"
                    >
                      {liveInsightLoading ? 'Searching…' : 'Run Live Search'}
                    </button>
                  </div>
                  <input
                    type="text"
                    value={liveInsightQuery}
                    onChange={(e) => setLiveInsightQuery(e.target.value)}
                    placeholder="Search person, agency, country policy, grants, funds..."
                    className="mt-1 w-full border border-stone-300 px-2 py-1 text-[10px] text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                  <div className="mt-1 flex flex-wrap items-center gap-1">
                    {([
                      ['all', 'All'],
                      ['government', 'Government'],
                      ['finance', 'Banking/Finance'],
                      ['entities', 'Companies'],
                      ['news', 'News']
                    ] as Array<[LiveInsightFilter, string]>).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setLiveInsightFilter(value)}
                        className={`px-1.5 py-0.5 text-[9px] border ${
                          liveInsightFilter === value
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-white text-slate-700 border-stone-300 hover:bg-stone-50'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {liveInsightError && <p className="mt-1 text-[9px] text-red-600">{liveInsightError}</p>}
                  {liveInsightsRequested && !liveInsightLoading && liveInsightVisibleResults.length > 0 && (
                    <div className="mt-1.5 space-y-1 max-h-48 overflow-y-auto">
                      {liveInsightVisibleResults.slice(0, 8).map((item, idx) => (
                        <div key={`${item.link}-${idx}`} className="flex items-start gap-1.5">
                          <a
                            href={item.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 text-[9px] text-slate-700 hover:text-emerald-700"
                          >
                            • {item.title} <span className="text-slate-400">({item.source})</span>
                          </a>
                          <button
                            type="button"
                            onClick={() => handlePinLiveInsightToDraft(item)}
                            disabled={liveInsightPinnedLinks.has(item.link)}
                            className={`px-1.5 py-0.5 text-[9px] border ${
                              liveInsightPinnedLinks.has(item.link)
                                ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                                : 'bg-white text-slate-700 border-stone-300 hover:bg-stone-50'
                            }`}
                          >
                            {liveInsightPinnedLinks.has(item.link) ? 'Pinned' : 'Push'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="border border-stone-200 bg-blue-50 p-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] font-semibold text-blue-800">Quick Push to Live Draft</p>
                    <button
                      type="button"
                      onClick={() => syncQuickConsultantToCaseStudy('manual-sync')}
                      className="text-[9px] px-1.5 py-0.5 border border-blue-300 bg-white text-blue-700 hover:bg-blue-100"
                    >
                      Sync Now
                    </button>
                  </div>
                  <textarea
                    value={quickDraftLines}
                    onChange={(e) => setQuickDraftLines(e.target.value)}
                    placeholder={'Country: ...\nObjective: ...\nDecision: ...\nAudience: ...'}
                    rows={4}
                    className="mt-1 w-full resize-none border border-stone-300 px-2 py-1 text-[10px] text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        syncQuickConsultantToCaseStudy('manual-sync');
                        void applyStrategicFactors('manual');
                      }}
                      disabled={strategicApplyLoading}
                      className="text-[10px] px-2 py-1 border border-blue-300 bg-white text-blue-700 hover:bg-blue-100 disabled:opacity-60"
                    >
                      {strategicApplyLoading ? 'Applying…' : 'Apply Strategic Factors'}
                    </button>
                    <button
                      type="button"
                      onClick={handleConvertQuickLinesToDraft}
                      disabled={!quickDraftLines.trim()}
                      className={`text-[10px] px-2 py-1 border ${
                        !quickDraftLines.trim()
                          ? 'bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed'
                          : 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'
                      }`}
                    >
                      Convert
                    </button>
                  </div>
                  {strategicApplyError && <p className="mt-1 text-[9px] text-red-600">{strategicApplyError}</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {showPilotHowTo && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-2xl bg-white border border-stone-200 shadow-2xl">
              <div className="px-4 py-3 border-b border-stone-200 bg-slate-50 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Live Research - Guide</h3>
                <button
                  type="button"
                  onClick={() => setShowPilotHowTo(false)}
                  className="p-1 border border-stone-300 text-slate-600 hover:bg-stone-100"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="p-4 space-y-3">
                <div className="border border-stone-200 bg-white p-3">
                  <p className="text-[11px] font-semibold text-slate-800">1) Tell us about your situation</p>
                  <p className="mt-1 text-[10px] text-slate-600">Choose your focus, enter the country or region you're targeting, who you want to work with, and your sector. The more you provide, the more relevant our findings.</p>
                </div>
                <div className="border border-stone-200 bg-white p-3">
                  <p className="text-[11px] font-semibold text-slate-800">2) Review findings & considerations</p>
                  <p className="mt-1 text-[10px] text-slate-600">We surface external intelligence - market conditions, funding programs, regulatory factors, risks, and strategic considerations - tailored to your inputs.</p>
                </div>
                <div className="border border-stone-200 bg-white p-3">
                  <p className="text-[11px] font-semibold text-slate-800">3) Ask about something specific</p>
                  <p className="mt-1 text-[10px] text-slate-600">If there's a particular question or topic you want researched, type it in and your consultant will factor it into their analysis.</p>
                </div>
                <div className="border border-stone-200 bg-white p-3">
                  <p className="text-[11px] font-semibold text-slate-800">4) Everything feeds into your consultation</p>
                  <p className="mt-1 text-[10px] text-slate-600">All findings and your inputs are woven into your BW Consultant conversation and any documents generated - giving you a more informed, relevant result.</p>
                </div>
                <div className="border border-stone-200 bg-slate-50 p-3">
                  <p className="text-[10px] text-slate-700">Live Research works alongside BW Consultant to surface external findings that help you make better-informed decisions.</p>
                </div>
              </div>
            </div>
          </div>
        )}

      {/* Full Document + Letter Catalog Modal */}
      {showFullCatalog && (
        <LettersCatalogModal
          isOpen={showFullCatalog}
          onClose={() => setShowFullCatalog(false)}
          params={{
            organizationName: caseStudy.organizationName,
            country: caseStudy.country,
            organizationType: caseStudy.situationType || caseStudy.organizationType,
            strategicIntent: [caseStudy.situationType, caseStudy.currentMatter].filter(Boolean),
          }}
          brainBlock={brainCtxRef.current?.promptBlock || ''}
          generateFn={(prompt) => processWithAI(prompt, 'Generating from full catalog')}
        />
      )}

      {/* Final Report Modal */}
      {showFinalReport && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-0 md:p-4">
          <div className={`w-full ${isMobile ? 'h-full' : 'max-w-4xl max-h-[92vh]'} flex flex-col overflow-hidden`} style={{ background: '#0f1923', border: isMobile ? 'none' : '1px solid #2a3a4a' }}>

            {/* ── Header ── */}
            <div className="flex-none px-7 py-5 border-b flex items-start justify-between" style={{ borderColor: '#1e3248', background: 'linear-gradient(135deg, #0f1923 0%, #1a2d40 100%)' }}>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-5 h-5 rounded-sm flex items-center justify-center" style={{ background: '#b48228' }}>
                    <FileText size={11} className="text-white" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#b48228' }}>BW Global Advisory</span>
                </div>
                <h2 className="text-xl font-bold text-white">NEXUS AI - Document Intelligence</h2>
                <p className="text-xs mt-1" style={{ color: '#7a9ab8' }}>
                  {generatedDocuments.length > 0
                    ? `${generatedDocuments.length} document${generatedDocuments.length !== 1 ? 's' : ''} ready - analysis complete`
                    : 'Awaiting document analysis or report generation'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-2 py-0.5 text-[9px] font-bold tracking-widest uppercase" style={{ background: '#7c1d1d', color: '#fca5a5' }}>CONFIDENTIAL</span>
                <button onClick={() => setShowFinalReport(false)} className="p-2 hover:bg-white/5 transition-all" style={{ border: '1px solid #2a3a4a', color: '#7a9ab8' }}>
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* ── Body ── */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {generatedDocuments.length > 0 ? (
                generatedDocuments.map((doc) => (
                  <div key={doc.id} className="overflow-hidden" style={{ border: '1px solid #1e3248', background: '#111e2b' }}>

                    {/* Doc header strip */}
                    <div className="px-5 py-3 flex items-center justify-between" style={{ background: '#16263a', borderBottom: '1px solid #1e3248' }}>
                      <div>
                        <p className="text-sm font-bold text-white">{doc.title}</p>
                        <p className="text-[10px] mt-0.5" style={{ color: '#7a9ab8' }}>
                          {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} &nbsp;·&nbsp; {caseStudy.country || 'Global'} &nbsp;·&nbsp; BW Global Advisory
                        </p>
                      </div>
                      <span className="text-[9px] font-bold px-2 py-0.5 uppercase tracking-wider" style={{ background: doc.category === 'report' ? '#1e3a5f' : '#1e3f25', color: doc.category === 'report' ? '#60a5fa' : '#86efac' }}>
                        {doc.category}
                      </span>
                    </div>

                    {/* Content preview */}
                    <div className="px-5 py-4">
                      <div className="text-xs leading-relaxed whitespace-pre-wrap font-mono" style={{ color: '#a8c0d6', maxHeight: '300px', overflowY: 'auto' }}>
                        {doc.content.slice(0, 2000)}{doc.content.length > 2000 ? '\n\n[…continued in full export]' : ''}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="px-5 py-3 flex flex-wrap gap-2 border-t" style={{ borderColor: '#1e3248', background: '#0d1821' }}>
                      <button
                        onClick={() => {
                          const win = window.open('', '_blank');
                          if (win) {
                            win.document.write(`<!DOCTYPE html><html><head><title>${doc.title}</title><style>
                              body{font-family:Georgia,serif;padding:60px 80px;max-width:900px;margin:auto;line-height:1.75;color:#1a1a1a;background:#fff}
                              h1{font-size:1.4rem;color:#0f1923;border-bottom:2px solid #b48228;padding-bottom:12px;margin-bottom:24px}
                              .meta{font-size:0.75rem;color:#666;margin-bottom:30px}
                              pre{white-space:pre-wrap;font-family:inherit;font-size:0.875rem}
                              .bw-footer{margin-top:60px;padding-top:16px;border-top:1px solid #ccc;font-size:0.7rem;color:#999;text-align:center}
                            </style></head><body>
                            <h1>${doc.title}</h1>
                            <div class="meta">BW Global Advisory &nbsp;|&nbsp; CONFIDENTIAL &nbsp;|&nbsp; ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                            <pre>${doc.content}</pre>
                            <div class="bw-footer">Powered by NSIL Agentic Runtime • NEXUS AI &nbsp;|&nbsp; BW Global Advisory &nbsp;|&nbsp; Confidential</div>
                            </body></html>`);
                            win.document.close();
                            win.print();
                          }
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-all hover:opacity-90"
                        style={{ background: '#1e3248', color: '#a8c0d6', border: '1px solid #2a3a4a' }}
                      >
                        <Download size={11} />Print / PDF
                      </button>
                      <button
                        onClick={() => downloadSingleDocAsDocx(doc)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-all hover:opacity-90"
                        style={{ background: '#1e3a5f', color: '#93c5fd', border: '1px solid #2a4a7a' }}
                      >
                        <FileText size={11} />Download DOCX
                      </button>
                      <button
                        onClick={() => {
                          PDFAnnotationService.generate({
                            documentTitle: doc.title,
                            documentType: 'Advisory Report',
                            jurisdiction: caseStudy.country || 'Global',
                            preparedFor: caseStudy.organizationName || 'Government Member',
                            reportId: `BWGA-${Date.now()}`,
                            executiveSummary: doc.content.slice(0, 500),
                            annotations: PDFAnnotationService.buildAnnotationsFromAnalysis({
                              sourcePassages: doc.content.split(/\n\n+/).filter(p => p.trim().length > 80).slice(0, 8).map((p, i) => ({ label: `Passage ${i + 1}`, text: p.slice(0, 300) })),
                              brainResponses: [],
                            }),
                          });
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-all hover:opacity-90"
                        style={{ background: '#3d2a00', color: '#fbbf24', border: '1px solid #5a3f00' }}
                      >
                        <Download size={11} />Annotated PDF
                      </button>
                      <button
                        onClick={() => {
                          setShowFinalReport(false);
                          setInputValue(`Based on the NEXUS AI analysis "${doc.title}", generate a full 9-section NEXUS AI Intelligence Brief with complete executive summary, problem diagnosis, historical parallels, stakeholder map, intelligence scores, strategic pillars, partner matrix, risk register, and 90-day action plan.`);
                          setTimeout(() => {
                            const btn = document.querySelector('[data-send-btn]') as HTMLButtonElement;
                            btn?.click();
                          }, 150);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-all hover:opacity-90 ml-auto"
                        style={{ background: '#b48228', color: '#fff', border: 'none' }}
                      >
                        <Zap size={11} />Generate Full Intelligence Brief
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="space-y-4">
                  {/* Empty state */}
                  <div className="px-5 py-6 text-center" style={{ border: '1px solid #1e3248', background: '#111e2b' }}>
                    <div className="w-10 h-10 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: '#16263a' }}>
                      <FileText size={20} style={{ color: '#7a9ab8' }} />
                    </div>
                    <p className="text-sm font-semibold text-white mb-1">No documents generated yet</p>
                    <p className="text-xs leading-relaxed" style={{ color: '#7a9ab8' }}>
                      Upload a document or have a consultation session with the OS. Once the NEXUS AI analyses your document, it will appear here ready for export.
                    </p>
                  </div>
                  {messages.filter(m => m.role !== 'system').length > 2 && (
                    <div className="px-5 py-4" style={{ border: '1px solid #1e3248', background: '#111e2b' }}>
                      <p className="text-sm font-semibold text-white mb-1">Generate from current session</p>
                      <p className="text-xs mb-3" style={{ color: '#7a9ab8' }}>
                        The NEXUS AI will synthesise your consultation into a structured advisory brief.
                      </p>
                      <button
                        onClick={() => {
                          setShowFinalReport(false);
                          setInputValue('Generate a full NEXUS AI Intelligence Brief summarising our consultation - include executive summary, key findings, strategic recommendations, partner matrix, risk register, and 90-day action plan.');
                        }}
                        className="px-4 py-2 text-sm font-medium transition-all hover:opacity-90"
                        style={{ background: '#b48228', color: '#fff' }}
                      >
                        Generate Intelligence Brief
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Footer ── */}
            <div className="flex-none px-6 py-3 flex items-center justify-between" style={{ borderTop: '1px solid #1e3248', background: '#0d1821' }}>
              <p className="text-[10px] uppercase tracking-wider" style={{ color: '#3a5a7a' }}>BW Global Advisory - NEXUS AI Agentic Runtime - Confidential</p>
              <button
                onClick={() => setShowFinalReport(false)}
                className="px-4 py-1.5 text-xs font-medium transition-all hover:opacity-90"
                style={{ background: '#1e3248', color: '#a8c0d6', border: '1px solid #2a3a4a' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* About BWGA Modal (retained for reference - button replaced with Final Report) */}
      {showAboutBWGA && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-0 md:p-4">
          <div className={`w-full ${isMobile ? 'h-full' : 'max-w-3xl max-h-[90vh]'} bg-white border border-stone-200 shadow-2xl flex flex-col overflow-hidden`}>
            {/* Modal Header */}
            <div
              className="px-6 py-5 relative overflow-hidden"
              style={{
                backgroundImage: 'url(https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1400&h=300&fit=crop&q=80)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-900/90 via-blue-800/85 to-blue-900/80" />
              <div className="relative z-10 flex items-center justify-between">
                <div>
                  <p className="text-blue-200 uppercase tracking-wider text-[10px] font-semibold mb-1">The Story Behind</p>
                  <h2 className="text-xl font-bold text-white">BW Global Advisory</h2>
                  <p className="text-blue-200 text-xs mt-1">Built from the ground up. For everyone.</p>
                </div>
                <button
                  onClick={() => setShowAboutBWGA(false)}
                  className="p-2 hover:bg-white/10 text-white border border-white/20 transition-all"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">

              <p className="text-sm text-slate-700 leading-relaxed">
                BWGA wasn't founded in a glass skyscraper in New York or London. It was born on the edge of the developing world, in a small coastal city where the gap between potential and opportunity is painfully clear. We watched regional leaders - mayors, entrepreneurs, councils - work tirelessly to attract investment. They had the vision, the drive, the raw assets. But they didn't have the structured methodology, the global benchmarking data, or the institutional language that opens doors at the World Bank, AIIB, or a sovereign wealth fund boardroom.
              </p>

              <p className="text-sm text-slate-700 leading-relaxed">
                The practice exists because of a simple observation: every "new idea" is old somewhere. The 1963 Philippine Integrated Socioeconomic Plan, Special Economic Zones across 80+ countries, PPP frameworks across 150+ nations - they all follow the same methodology. Growth poles. Investment incentives. Sectoral planning. Infrastructure corridors. The names update. The practice persists. From that came the question: what if you could build a system that internalised 60+ years of documented practice across 150 countries and made it available to anyone, anywhere, instantly?
              </p>

              <p className="text-sm text-slate-700 leading-relaxed">
                BWGA Ai is the answer. Not a chatbot. Not a search engine. A complete digital boardroom that reasons through investment, trade, and development problems with the depth that previously required a team of senior consultants, weeks of research, and hundreds of thousands of dollars. It takes what already worked - in Shenzhen's special economic zones, Penang's electronics corridor, Medellín's urban reinvention, Rwanda's governance transformation, Estonia's digital-first state - and extracts the transferable principles: the sequencing, the stakeholder architecture, the policy triggers, the conditions that let a place transform. The knowledge always existed. It just sat locked inside decades of reports, across continents, in frameworks most practitioners never see. This system makes it accessible, synthesised, and actionable.
              </p>

              {/* Quote */}
              <div className="border-l-4 border-blue-600 pl-4 py-2 bg-blue-50">
                <p className="text-sm text-slate-800 leading-relaxed font-medium italic">
                  "Every 'new idea' is old somewhere. The child learns what the parent already knows. The past isn't historical interest. The past is the solution library."
                </p>
                <p className="text-xs text-slate-500 mt-2">- Brayden Walls, Founder &amp; Sole Developer</p>
              </div>

              {/* The Founder */}
              <div className="border border-stone-200 bg-stone-50 p-4">
                <h3 className="text-sm font-bold text-slate-900 mb-2">The Founder</h3>
                <p className="text-sm text-slate-700 leading-relaxed">
                  I'm Brayden Walls - the founder and sole developer behind BWGA Ai. For more than 16 months I've been living, researching, and building in the Philippines - on the ground, in communities where economic potential is enormous but the tools to unlock it simply don't exist. I watched the same pattern repeat everywhere: ambitious businesses with incomplete information, regional governments unable to translate their advantages into investor language, unproductive meetings built on mismatched expectations. Places like Mindanao, regional Australia, communities across the Pacific - they all wanted the same thing: to be seen, to be understood, to have a fair shot. So I taught myself to code, studied every economic development framework I could find, and spent over a year turning that knowledge into a complete reasoning system - one that thinks through problems the way a team of senior consultants would, but faster, cheaper, and available to anyone.
                </p>
              </div>

              <div className="border-t border-stone-200 pt-4">
                <p className="text-xs text-slate-500 text-center">
                  BW Global Advisory - Built from the edge of the developing world, for the whole world.
                </p>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Workspace Modal */}
      {showWorkspaceModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-0 md:p-4">
          <div className={`bg-white shadow-2xl w-full ${isMobile ? 'h-full' : 'max-w-6xl h-[90vh]'} flex flex-col border border-stone-200`}>
            {/* Modal Header - Blue Banner */}
            <div 
              className="px-6 py-4 flex items-center justify-between relative overflow-hidden"
              style={{
                backgroundImage: 'url(https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1400&h=300&fit=crop&q=80)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-900/90 via-blue-800/80 to-blue-900/70" />
              <div className="relative z-10">
                <p className="text-blue-200 uppercase tracking-wider text-xs font-semibold mb-0.5">Full Analysis</p>
                <h2 className="text-xl font-bold text-white">Case Study Workspace</h2>
              </div>
              <button
                onClick={() => setShowWorkspaceModal(false)}
                className="relative z-10 p-2 hover:bg-white/10 text-white border border-white/20"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-auto p-6 bg-stone-50">
              <div className="grid grid-cols-3 gap-6">
                {/* Case Overview */}
                <div className="bg-white p-4 border border-stone-200 shadow-sm">
                  <h3 className="font-bold text-slate-900 mb-3">Case Overview</h3>
                  <div className="space-y-3 text-sm">
                    <div>
                      <span className="text-slate-500">Organization:</span>
                      <p className="font-medium text-slate-900">{caseStudy.organizationName || 'Not provided'}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Role:</span>
                      <p className="font-medium text-slate-900">{caseStudy.contactRole || 'Not provided'}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Situation Type:</span>
                      <p className="font-medium text-slate-900">{caseStudy.situationType || 'Not provided'}</p>
                    </div>
                  </div>
                </div>

                {/* Current Matter */}
                <div className="bg-white p-4 border border-stone-200 shadow-sm">
                  <h3 className="font-bold text-slate-900 mb-3">Current Matter</h3>
                  <p className="text-sm text-slate-700">
                    {caseStudy.currentMatter || 'Details will appear as you share them with the AI.'}
                  </p>
                </div>

                {/* Objectives */}
                <div className="bg-white p-4 border border-stone-200 shadow-sm">
                  <h3 className="font-bold text-slate-900 mb-3">Objectives</h3>
                  <p className="text-sm text-slate-700">
                    {caseStudy.objectives || 'Your goals will be captured here.'}
                  </p>
                </div>

                {/* Uploaded Documents */}
                <div className="bg-white p-4 border border-stone-200 shadow-sm">
                  <h3 className="font-bold text-slate-900 mb-3">Uploaded Documents</h3>
                  {caseStudy.uploadedDocuments.length > 0 ? (
                    <ul className="space-y-1">
                      {caseStudy.uploadedDocuments.map((doc, i) => (
                        <li key={i} className="text-sm flex items-center gap-2 text-slate-700">
                          <FileText size={14} className="text-blue-600" />
                          {doc}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-slate-500">No documents uploaded yet.</p>
                  )}
                </div>

                {/* Constraints */}
                <div className="bg-white p-4 border border-stone-200 shadow-sm">
                  <h3 className="font-bold text-slate-900 mb-3">Constraints</h3>
                  <p className="text-sm text-slate-700">
                    {caseStudy.constraints || 'Limitations and constraints will be noted here.'}
                  </p>
                </div>

                {/* Additional Context */}
                <div className="bg-white p-4 border border-stone-200 shadow-sm">
                  <h3 className="font-bold text-slate-900 mb-3">Additional Context</h3>
                  {caseStudy.additionalContext.length > 0 ? (
                    <ul className="space-y-2">
                      {caseStudy.additionalContext.slice(-3).map((ctx, i) => (
                        <li key={i} className="text-sm text-slate-700 border-l-2 border-blue-500 pl-2">
                          {ctx.slice(0, 150)}...
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-slate-500">Additional details from your conversation.</p>
                  )}
                </div>
              </div>

              {missionSnapshot && (
                <div className="mt-6 bg-white border border-stone-200 shadow-sm p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <h3 className="font-bold text-slate-900">Autonomous Audit Timeline</h3>
                      <div className="text-[11px] text-slate-600">
                        Events: {missionAuditEvents.length} • Adaptation: {Math.round(missionSnapshot.verificationSummary?.adaptationScore ?? 0)}%
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleExportMissionAuditJson}
                        disabled={!missionAuditExportPayload}
                        className="inline-flex items-center gap-1 border border-stone-300 bg-stone-50 px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-stone-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Download size={12} />
                        JSON
                      </button>
                      <button
                        onClick={handleExportMissionAuditCsv}
                        disabled={!missionAuditCsvContent}
                        className="inline-flex items-center gap-1 border border-stone-300 bg-stone-50 px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-stone-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Download size={12} />
                        CSV
                      </button>
                      <button
                        onClick={handleExportMissionComplianceSummary}
                        disabled={!missionAuditComplianceSummary}
                        className="inline-flex items-center gap-1 border border-stone-300 bg-stone-50 px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-stone-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Download size={12} />
                        REPORT
                      </button>
                      <button
                        onClick={handlePrintMissionCompliancePdf}
                        disabled={!missionAuditExportPayload}
                        className="inline-flex items-center gap-1 border border-stone-300 bg-stone-50 px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-stone-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Download size={12} />
                        PDF
                      </button>
                    </div>
                  </div>

                  {missionAuditEvents.length === 0 ? (
                    <p className="text-sm text-slate-500">No autonomy events captured yet. Run an autonomy cycle from the Mission Panel to populate this timeline.</p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {missionAuditEvents.map((event, index) => (
                        <div key={`${event.timestamp}-${event.type}-${index}`} className="border border-stone-200 bg-stone-50 px-3 py-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className={`text-[10px] px-1.5 py-0.5 border ${
                              event.type === 'governance'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : event.type === 'execution'
                                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                                  : 'bg-green-50 text-green-700 border-green-200'
                            }`}>
                              {event.type.toUpperCase()}
                            </span>
                            <span className="text-[10px] text-slate-500">{new Date(event.timestamp).toLocaleString()}</span>
                          </div>
                          <p className="mt-1 text-xs text-slate-700">{event.summary}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="mt-6 bg-white border border-stone-200 shadow-sm p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-900">Consultant Audit Trail</h3>
                      {consultantAuditWindowMode === '24h' && consultantRetryHealth && (
                        <span
                          className={`text-[10px] px-1.5 py-0.5 border ${consultantRetryHealth.className}`}
                          title={consultantThresholdTooltip}
                        >
                          {consultantRetryHealth.label}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-600">
                      Window: {consultantAuditWindowMode === '24h' ? 'Last 24h' : 'All time'} • Recent Events: {consultantAuditMeta?.count ?? consultantAuditEvents.length} • Requests: {consultantAuditSummary.requestEvents} • Errors: {consultantAuditSummary.errorEvents} • Replay OK: {consultantAuditSummary.replaySuccessEvents} • Replay Errors: {consultantAuditSummary.replayErrorEvents} • Fallback Events: {consultantAuditSummary.replayFallbackEvents} • Visible: {filteredConsultantAuditEvents.length}
                    </div>
                    {consultantAuditWindowMode === '24h' && consultantAuditTrends && (
                      <div className="text-[10px] text-slate-600 mt-0.5">
                        Trend vs previous 24h • Replay OK: {renderTrend(consultantAuditTrends.delta.replaySuccess)} • Fallback: {renderTrend(consultantAuditTrends.delta.replayFallback, true)} • Status: {consultantRetryHealth?.detail || 'n/a'}
                      </div>
                    )}
                    {consultantAuditWindowMode === '24h' && consultantProviderTrendSummary.length > 0 && (
                      <div className="text-[10px] text-slate-600 mt-0.5">
                        By provider • {consultantProviderTrendSummary.join(' • ')}
                      </div>
                    )}
                    {consultantAuditWindowMode === '24h' && consultantProviderHealthBadges.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1 mt-1">
                        {consultantProviderHealthBadges.map((badge) => (
                          <button
                            type="button"
                            key={`provider-health-${badge.provider}`}
                            onClick={() => handleProviderHealthBadgeClick(badge.providerKey)}
                            className={`text-[10px] px-1.5 py-0.5 border ${badge.className}`}
                            title={`${badge.detail} • Click to filter replay events for ${badge.provider}`}
                          >
                            {badge.provider}: {badge.label}
                          </button>
                        ))}
                      </div>
                    )}
                    {consultantAuditWindowMode === '24h' && (
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        Thresholds • Healthy≥{Math.round(consultantHealthThresholds.healthyMinSuccess * 100)}% • Warning≥{Math.round(consultantHealthThresholds.warningMinSuccess * 100)}% • FallbackHigh&gt;{Math.round(consultantHealthThresholds.fallbackHighRatio * 100)}% • ErrorHigh&gt;{Math.round(consultantHealthThresholds.errorHighRatio * 100)}%
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="inline-flex items-center gap-1 border border-stone-300 bg-white px-2 py-1 text-[11px] text-slate-700">
                      <input
                        type="checkbox"
                        checked={consultantAuditAutoRefresh}
                        onChange={(e) => setConsultantAuditAutoRefresh(e.target.checked)}
                        className="h-3 w-3"
                      />
                      Auto 30s
                    </label>
                    <button
                      onClick={() => void loadConsultantAuditEvents(40)}
                      disabled={consultantAuditLoading}
                      className="inline-flex items-center gap-1 border border-stone-300 bg-stone-50 px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-stone-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {consultantAuditLoading ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                      Refresh
                    </button>
                    <button
                      onClick={() => void handleExportConsultantAudit('json')}
                      disabled={consultantAuditExporting}
                      className="inline-flex items-center gap-1 border border-stone-300 bg-stone-50 px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-stone-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Download size={12} />
                      JSON
                    </button>
                    <button
                      onClick={() => void handleExportConsultantAudit('jsonl')}
                      disabled={consultantAuditExporting}
                      className="inline-flex items-center gap-1 border border-stone-300 bg-stone-50 px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-stone-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Download size={12} />
                      JSONL
                    </button>
                  </div>
                </div>

                <div className="mb-3 grid grid-cols-1 md:grid-cols-4 gap-2">
                  <select
                    value={consultantAuditWindowMode}
                    onChange={(e) => setConsultantAuditWindowMode(e.target.value as 'all' | '24h')}
                    className="border border-stone-300 bg-white px-2 py-1 text-[11px] text-slate-700"
                    title="Audit metric window"
                  >
                    <option value="all">All time</option>
                    <option value="24h">Last 24h</option>
                  </select>

                  <select
                    value={consultantAuditEventFilter}
                    onChange={(e) => setConsultantAuditEventFilter(e.target.value as ConsultantAuditEventFilter)}
                    className="border border-stone-300 bg-white px-2 py-1 text-[11px] text-slate-700"
                    title="Filter by event type"
                  >
                    <option value="all">All events</option>
                    <option value="replay_events">Replay (all)</option>
                    <option value="consultant_request">Requests</option>
                    <option value="consultant_error">Errors</option>
                    <option value="consultant_replay_request">Replay Success</option>
                    <option value="consultant_replay_error">Replay Errors</option>
                    <option value="consultant_replay_fallback">Replay Fallback</option>
                  </select>

                  <select
                    value={consultantAuditProviderFilter}
                    onChange={(e) => setConsultantAuditProviderFilter(e.target.value as ConsultantAuditProviderFilter)}
                    className="border border-stone-300 bg-white px-2 py-1 text-[11px] text-slate-700"
                    title="Filter by provider"
                  >
                    <option value="all">All providers</option>
                    <option value="bedrock">Bedrock</option>
                    <option value="gemini">Gemini</option>
                    <option value="openai">OpenAI</option>
                  </select>

                  <input
                    value={consultantAuditSearch}
                    onChange={(e) => setConsultantAuditSearch(e.target.value)}
                    placeholder="Search request ID / intent / error"
                    className="border border-stone-300 bg-white px-2 py-1 text-[11px] text-slate-700 md:col-span-2"
                  />

                  <button
                    onClick={() => {
                      setConsultantAuditEventFilter('all');
                      setConsultantAuditProviderFilter('all');
                      setConsultantAuditSearch('');
                      setConsultantAuditPage(1);
                    }}
                    className="border border-stone-300 bg-stone-50 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-stone-100 md:col-start-4"
                  >
                    Clear Filters
                  </button>
                </div>

                <div className="mb-3 grid grid-cols-1 md:grid-cols-4 gap-2">
                  <input
                    value={consultantAuditLookupRequestId}
                    onChange={(e) => setConsultantAuditLookupRequestId(e.target.value)}
                    placeholder="Jump to request ID"
                    className="border border-stone-300 bg-white px-2 py-1 text-[11px] text-slate-700 md:col-span-2"
                  />
                  <button
                    onClick={() => void handleLookupConsultantRequest()}
                    disabled={consultantAuditLookupLoading}
                    className="border border-stone-300 bg-stone-50 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-stone-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {consultantAuditLookupLoading ? 'Looking up...' : 'View Request'}
                  </button>
                  <button
                    onClick={() => {
                      setConsultantAuditLookupRequestId('');
                      setConsultantAuditLookupEvents([]);
                      setConsultantReplayMeta(null);
                      setConsultantRetrySource('none');
                      setConsultantRetryReason('');
                    }}
                    className="border border-stone-300 bg-stone-50 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-stone-100"
                  >
                    Clear View
                  </button>
                </div>

                {consultantAuditError && (
                  <div className="mb-2 border border-red-200 bg-red-50 px-2 py-1 text-[11px] text-red-700">
                    {consultantAuditError}
                  </div>
                )}

                {filteredConsultantAuditEvents.length === 0 ? (
                  <p className="text-sm text-slate-500">No consultant audit events match the current filters.</p>
                ) : (
                  <>
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {pagedConsultantAuditEvents.map((event, index) => (
                      <div key={`${event.requestId || 'no-id'}-${event.timestamp || index}`} className="border border-stone-200 bg-stone-50 px-3 py-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-[10px] px-1.5 py-0.5 border ${
                            event.event === 'consultant_error'
                              ? 'bg-red-50 text-red-700 border-red-200'
                              : 'bg-green-50 text-green-700 border-green-200'
                          }`}>
                            {(event.event || 'unknown').toUpperCase()}
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => void handleLookupConsultantRequest(event.requestId)}
                              disabled={!event.requestId || consultantAuditLookupLoading}
                              className="inline-flex items-center gap-1 border border-stone-300 bg-white px-1.5 py-0.5 text-[10px] text-slate-700 hover:bg-stone-100 disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Open full request timeline"
                            >
                              View
                            </button>
                            <button
                              onClick={() => void handleCopyConsultantRequestId(event.requestId)}
                              disabled={!event.requestId}
                              className="inline-flex items-center gap-1 border border-stone-300 bg-white px-1.5 py-0.5 text-[10px] text-slate-700 hover:bg-stone-100 disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Copy request ID"
                            >
                              {consultantAuditCopiedRequestId === event.requestId ? <Check size={10} /> : <Copy size={10} />}
                              {consultantAuditCopiedRequestId === event.requestId ? 'Copied' : 'Copy ID'}
                            </button>
                            <span className="text-[10px] text-slate-500">{event.timestamp ? new Date(event.timestamp).toLocaleString() : 'No timestamp'}</span>
                          </div>
                        </div>
                        <p className="mt-1 text-xs text-slate-700">
                          Request: {event.requestId || 'n/a'} • Provider: {event.provider || 'n/a'} • Intent: {event.intent || 'n/a'}
                        </p>
                        {event.error && <p className="mt-1 text-xs text-red-700">Error: {event.error}</p>}
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[11px] text-slate-600">Page {consultantAuditPage} of {consultantAuditTotalPages}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setConsultantAuditPage((prev) => Math.max(1, prev - 1))}
                        disabled={consultantAuditPage <= 1}
                        className="border border-stone-300 bg-stone-50 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-stone-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Prev
                      </button>
                      <button
                        onClick={() => setConsultantAuditPage((prev) => Math.min(consultantAuditTotalPages, prev + 1))}
                        disabled={consultantAuditPage >= consultantAuditTotalPages}
                        className="border border-stone-300 bg-stone-50 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-stone-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                  </>
                )}

                {consultantAuditLookupEvents.length > 0 && (
                  <div className="mt-3 border border-blue-200 bg-blue-50 px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] font-semibold text-blue-900">
                        Request Drill-down: {consultantAuditLookupRequestId}
                      </p>
                      <div className="flex items-center gap-2">
                        {consultantReplayMeta && (
                          <span className={`text-[10px] px-1.5 py-0.5 border ${
                            consultantReplayMeta.hasPayload
                              ? 'bg-green-50 text-green-700 border-green-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            Replay {consultantReplayMeta.hasPayload ? 'AVAILABLE' : 'UNAVAILABLE'}
                          </span>
                        )}
                        <button
                          onClick={() => void handleRetryConsultantRequest(consultantAuditLookupRequestId)}
                          disabled={consultantRetryLoading}
                          className="inline-flex items-center gap-1 border border-blue-300 bg-white px-2 py-1 text-[11px] font-medium text-blue-800 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {consultantRetryLoading ? <Loader2 size={11} className="animate-spin" /> : <PlayCircle size={11} />}
                          Retry Request
                        </button>
                      </div>
                    </div>
                    <p className="text-[10px] text-blue-700 mt-0.5">Timeline events: {consultantAuditLookupEvents.length}</p>
                    {consultantReplayMeta?.replayHash && (
                      <p className="text-[10px] text-blue-800 mt-0.5">
                        Replay Hash: {consultantReplayMeta.replayHash.slice(0, 12)}...{consultantReplayMeta.replayHash.slice(-8)}
                      </p>
                    )}
                    {consultantRetrySource !== 'none' && (
                      <p className="text-[10px] text-blue-800 mt-0.5">
                        Last Retry Path: {consultantRetrySource === 'backend-replay' ? 'Backend Replay' : 'Local Fallback'}{consultantRetryReason ? ` - ${consultantRetryReason}` : ''}
                      </p>
                    )}
                    <div className="mt-2 space-y-2 max-h-48 overflow-y-auto pr-1">
                      {consultantAuditLookupEvents.map((event, index) => (
                        <div key={`${event.requestId || consultantAuditLookupRequestId}-${event.timestamp || index}-detail`} className="border border-blue-200 bg-white px-2 py-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] text-blue-800 font-semibold">{(event.event || 'unknown').toUpperCase()}</span>
                            <span className="text-[10px] text-slate-500">{event.timestamp ? new Date(event.timestamp).toLocaleString() : 'No timestamp'}</span>
                          </div>
                          <p className="mt-1 text-[11px] text-slate-700">Provider: {event.provider || 'n/a'} • Intent: {event.intent || 'n/a'} • Task: {event.taskType || 'n/a'}</p>
                          {event.error && <p className="mt-1 text-[11px] text-red-700">Error: {event.error}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Open Full Platform Button */}
              <div className="mt-6 text-center">
                <button
                  onClick={() => {
                    setShowWorkspaceModal(false);
                    onOpenWorkspace?.({ 
                      query: caseStudy.currentMatter,
                      results: [caseStudy as unknown as Record<string, unknown>]
                    });
                  }}
                  className="px-6 py-3 bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-all"
                >
                  Continue to Full NSIL Platform
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BWConsultantOS;
