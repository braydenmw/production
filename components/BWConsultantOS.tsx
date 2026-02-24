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
  Bot, Send, Paperclip, Loader2, X, Maximize2,
  FileText, Mail, Briefcase, Shield, BarChart3, Users, Scale, 
  Globe, FileCheck, PenTool, Download, Copy, Check, Building2,
  User, HelpCircle, Target, ChevronRight,
  ThumbsUp, ThumbsDown, Languages, Zap, AlertTriangle, CheckCircle2, PlayCircle
} from 'lucide-react';
import { OutcomeLearningService } from '../services/OutcomeLearningService';
import { LiveDataService } from '../services/LiveDataService';
import { getChatSession } from '../services/geminiService';
import AdaptiveQuestionnaire from '../services/AdaptiveQuestionnaire';
import { BWConsultantAgenticAI } from '../services/BWConsultantAgenticAI';
import CaseStudyAnalyzer from '../services/CaseStudyAnalyzer';
import CaseGraphBuilder, { type CaseGraph } from '../services/CaseGraphBuilder';
import RecommendationScorer, { type RecommendationScore } from '../services/RecommendationScorer';
import MissionGraphService from '../services/autonomy/MissionGraphService';
import type { MissionSnapshot } from '../types/autonomy';
import { RegionalDevelopmentOrchestrator } from '../services/RegionalDevelopmentOrchestrator';
import type { PartnerCandidate } from '../services/PartnerIntelligenceEngine';

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

type ExecutionTaskStatus = 'queued' | 'running' | 'completed' | 'failed';

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

type PilotModeFocus = 'new-markets' | 'government-entry' | 'partnerships' | 'risk-compliance';

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

const PILOT_GLOBAL_ISSUE_AREAS: PilotIssueArea[] = [
  {
    id: 'market-access-barriers',
    focus: 'new-markets',
    title: 'Market Access Barriers',
    description: 'Licensing, market-entry restrictions, and foreign ownership constraints.',
    whyItMatters: 'Entry assumptions fail when market access controls are not mapped early.',
    recommendedMoves: [
      'Map ownership restrictions and mandatory local-partner requirements.',
      'Create a country-by-country entry sequence based on approval complexity.',
      'Build regulator-facing evidence pack before investor outreach.'
    ]
  },
  {
    id: 'government-procurement-fit',
    focus: 'government-entry',
    title: 'Government Procurement Fit',
    description: 'Public-sector buying rules, policy alignment, and tender readiness.',
    whyItMatters: 'Government partnerships fail without procurement and policy fit.',
    recommendedMoves: [
      'Align value proposition to ministry mandate and policy KPIs.',
      'Prepare compliance matrix matching tender criteria and annex requirements.',
      'Draft agency briefing note and submission letter path.'
    ]
  },
  {
    id: 'partner-selection-risk',
    focus: 'partnerships',
    title: 'Partner Selection Risk',
    description: 'Counterparty strength, governance reliability, and execution capability.',
    whyItMatters: 'Weak partner-fit causes delays, governance conflict, and value leakage.',
    recommendedMoves: [
      'Define partner due-diligence scorecard (financial, legal, operational).',
      'Set governance rights, escalation model, and performance checkpoints.',
      'Create phased partnership model with stage-gate approvals.'
    ]
  },
  {
    id: 'cross-border-compliance',
    focus: 'risk-compliance',
    title: 'Cross-Border Compliance',
    description: 'Data, legal, anti-corruption, sanctions, and reporting obligations.',
    whyItMatters: 'Cross-border expansion is blocked by unresolved legal/compliance exposure.',
    recommendedMoves: [
      'Build jurisdiction obligations register and control owner assignments.',
      'Add anti-bribery and third-party screening requirements into partner onboarding.',
      'Track compliance evidence artifacts for every major decision milestone.'
    ]
  },
  {
    id: 'capital-readiness',
    focus: 'new-markets',
    title: 'Capital and Funding Readiness',
    description: 'Funding structure, capital timing, and downside resilience.',
    whyItMatters: 'Expansion stalls when capital assumptions are not staged against risk.',
    recommendedMoves: [
      'Create base/upside/downside model tied to market-entry milestones.',
      'Set funding triggers and contingency capital reserve.',
      'Prepare investor memo and board decision package in parallel.'
    ]
  },
  {
    id: 'stakeholder-legitimacy',
    focus: 'government-entry',
    title: 'Stakeholder Legitimacy and Social License',
    description: 'Community acceptance, public trust, and institutional legitimacy.',
    whyItMatters: 'Government and regional programs fail without stakeholder legitimacy.',
    recommendedMoves: [
      'Map high-influence stakeholders and likely objections.',
      'Develop communication brief for public value and local impact.',
      'Attach measurable social/economic outcomes to the implementation plan.'
    ]
  }
];

const PILOT_ADAPTIVE_OPTION_CATALOG: PilotOption[] = [
  {
    id: 'startup-case-skeleton',
    label: 'Start Case Skeleton',
    prompt: 'Create a startup case skeleton with person, organization, jurisdiction, objective, decision audience, and deadline fields.',
    stage: 'intake'
  },
  {
    id: 'startup-proof-pack',
    label: 'Start Evidence Pack',
    prompt: 'Create an initial evidence pack checklist (source documents, baseline metrics, and mandatory annexes) needed to open this case correctly.',
    stage: 'intake'
  },
  {
    id: 'startup-risk-baseline',
    label: 'Start Risk Baseline',
    prompt: 'Create a startup risk baseline with top regulatory, funding, timeline, and stakeholder risks for this matter.',
    stage: 'intake'
  },
  {
    id: 'discovery-market-scan',
    label: 'Add Market Scan',
    prompt: 'Add a comparative regional market scan with top 3 expansion candidates and entry barriers.',
    stage: 'discovery',
    focus: 'new-markets'
  },
  {
    id: 'discovery-gov-pack',
    label: 'Add Government Entry Pack',
    prompt: 'Add a government engagement pack including ministry brief, submission path, and compliance annex list.',
    stage: 'discovery',
    focus: 'government-entry'
  },
  {
    id: 'discovery-partner-map',
    label: 'Add Partner Map',
    prompt: 'Add partner landscape map with shortlist criteria and due-diligence checkpoints.',
    stage: 'discovery',
    focus: 'partnerships'
  },
  {
    id: 'discovery-risk-stress',
    label: 'Add Risk Stress Test',
    prompt: 'Add risk stress test covering regulatory, funding, and execution downside scenarios.',
    stage: 'discovery',
    focus: 'risk-compliance'
  },
  {
    id: 'analysis-gap-map',
    label: 'Add Missing-Data Gap Map',
    prompt: 'Map missing data points, why each is required, and assign owner/deadline for closure before recommendations.',
    stage: 'analysis'
  },
  {
    id: 'analysis-scenario-pack',
    label: 'Add Scenario Pack',
    prompt: 'Add base/upside/downside scenarios with implications for market entry, government pathway, and partnership structure.',
    stage: 'analysis'
  },
  {
    id: 'recommendations-letter-plan',
    label: 'Add Letter Plan',
    prompt: 'Add a stakeholder contact-letter plan with counterparts, purpose, and required support annexes for each letter.',
    stage: 'recommendations'
  },
  {
    id: 'recommendations-report-plan',
    label: 'Add Report Plan',
    prompt: 'Add a report package plan covering decision brief, memo, and full report with audience-specific structure.',
    stage: 'recommendations'
  },
  {
    id: 'generation-quality-check',
    label: 'Add Output Quality Check',
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
  embedded?: boolean;
}

const BWConsultantOS: React.FC<BWConsultantOSProps> = ({ onOpenWorkspace, embedded = false }) => {
  // Core state
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreamingResponse, setIsStreamingResponse] = useState(false);
  const [reactiveDraftStatus, setReactiveDraftStatus] = useState('');
  const [reactiveDraftHint, setReactiveDraftHint] = useState('');
  const [executionTimeline, setExecutionTimeline] = useState<ExecutionTask[]>([]);
  const [currentPhase, setCurrentPhase] = useState<CasePhase>('intake');
  
  // Case study state
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

  // File upload
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const learningProfileInputRef = useRef<HTMLInputElement>(null);
  
  // Workspace modal
  const [showWorkspaceModal, setShowWorkspaceModal] = useState(false);
  const [pilotModeEnabled, setPilotModeEnabled] = useState(true);
  const [showPilotWindow, setShowPilotWindow] = useState(false);
  const [showPilotHowTo, setShowPilotHowTo] = useState(false);
  const [pilotFocus, setPilotFocus] = useState<PilotModeFocus>('new-markets');
  const [pilotSelectedAddOns, setPilotSelectedAddOns] = useState<string[]>([]);
  const [customPilotOptionInput, setCustomPilotOptionInput] = useState('');
  const [customPilotOptions, setCustomPilotOptions] = useState<Array<{ id: string; label: string; prompt: string }>>([]);
  const [pilotOptionMemory, setPilotOptionMemory] = useState<Record<string, { label: string; prompt: string }>>({});
  const [activeGlobalIssuePack, setActiveGlobalIssuePack] = useState<string>('energy-transition');
  
  // Document generation
  const [recommendedDocs, setRecommendedDocs] = useState<DocumentOption[]>([]);
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [generationScope, setGenerationScope] = useState<'selected' | 'letters-only' | 'reports-only'>('selected');
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [allowAllDocumentAccess, setAllowAllDocumentAccess] = useState(true);
  const [outputDepth, setOutputDepth] = useState<'brief-1' | 'memo-5' | 'report-20'>('memo-5');
  const [_adaptiveQuestionsAsked, setAdaptiveQuestionsAsked] = useState(0);
  const [skillLevel, setSkillLevel] = useState<'beginner' | 'intermediate' | 'advanced' | 'expert' | 'custom'>('beginner');
  const [readinessScore, setReadinessScore] = useState(0);
  const [caseGraph, setCaseGraph] = useState<CaseGraph | null>(null);
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

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const lastKernelSignalRef = useRef<string>('');
  const chatSession = useRef(getChatSession());
  const agenticAIRef = useRef(new BWConsultantAgenticAI());

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
    setFeedbackMap((prev) => ({ ...prev, [msgId]: signal }));
    OutcomeLearningService.recordOutcome({
      caseId: msgId,
      timestamp: new Date().toISOString(),
      recommendedInterventions: ['consultant-response'],
      successfulInterventions: signal === 'up' ? ['consultant-response'] : [],
      governanceThreshold: 80,
      rankingDelta: signal === 'up' ? 1 : -1
    });
  }, []);

  const queueAction = useCallback((action: Omit<PendingAction, 'status'>) => {
    setPendingActions((prev) => [
      ...prev.filter((a) => a.id !== action.id),
      { ...action, status: 'pending' }
    ]);
  }, []);

  const executeAction = useCallback(async (action: PendingAction) => {
    setPendingActions((prev) => prev.map((a) => a.id === action.id ? { ...a, status: 'executing' } : a));
    await new Promise<void>((resolve) => setTimeout(resolve, 800));
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
      // silent — live data is enrichment, not critical
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
      complianceFlags.push('Banking secrecy jurisdiction — data-handling review required');
    }
    if (/saudi|uae|qatar|mena/i.test(jurisdiction)) {
      complianceFlags.push('MENA investment review controls — verify counterparty alignment');
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

  // Scroll to bottom on new messages
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    }
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

  const toAgenticParams = useCallback((draft: CaseStudy) => ({
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
    context: draft.additionalContext
  }), []);

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

    const userName = normalized.match(/\b(?:i am|i'm|my name is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\b/i)?.[1] || null;
    const organizationName = normalized.match(/\b(?:organization|company|agency|institution|we are|i represent|from)\s*(?:is|:)?\s*([A-Z][A-Za-z0-9&.,\-\s]{2,80})\b/i)?.[1]?.trim() || null;
    const organizationType = normalized.match(/\b(government agency|private company|ngo|non-profit|investor|bank|development bank|regional council|legal advisory|ministry|public sector|multilateral)\b/i)?.[1] || null;
    const contactRole = normalized.match(/\b(?:i am the|my role is|i serve as|i am)\s+([A-Za-z\s\-/]{3,60})\b/i)?.[1]?.trim() || null;
    const country = normalized.match(/\b(?:in|from|operating in|country)\s+([A-Z][A-Za-z\s]{2,40})\b/i)?.[1]?.trim() || null;
    const jurisdiction = normalized.match(/\b(?:jurisdiction|regulatory regime|legal framework)\s*(?:is|:)?\s*([A-Za-z\s\-/]{3,60})\b/i)?.[1]?.trim() || null;
    const objectives = normalized.match(/\b(?:objective is|goal is|we aim to|we want to|wish to achieve)\s+([^\n.]{12,220})/i)?.[1]?.trim() || null;
    const currentMatter = normalized.length >= 40 ? normalized : null;
    const constraints = normalized.match(/\b(?:constraint|limit|limitation|budget|timeline|deadline|compliance|resource|political)\b/i)
      ? normalized
      : null;
    const targetAudience = normalized.match(/\b(?:for|to|audience|decision makers?)\s+(board|investors?|regulator[s]?|ministry|government|court|executive team|partners?)\b/i)?.[1] || null;
    const decisionDeadline = normalized.match(/\b(?:deadline|due|by|before)\s*[:-]?\s*([^\n.]{3,60})/i)?.[1]?.trim() || null;
    const evidenceNote = /\b(evidence|annex|dataset|source|kpi|metric|report|attachment)\b/i.test(normalized)
      ? normalized
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
  }, []);

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

  const pilotFocusIssues = useMemo(
    () => PILOT_GLOBAL_ISSUE_AREAS.filter((issue) => issue.focus === pilotFocus),
    [pilotFocus]
  );

  const pilotAdaptiveOptions = useMemo(() => {
    return PILOT_ADAPTIVE_OPTION_CATALOG.filter((option) => {
      if (option.stage !== currentPhase) return false;
      if (option.focus && option.focus !== pilotFocus) return false;
      return true;
    }).map((option) => ({ id: option.id, label: option.label, prompt: option.prompt }));
  }, [currentPhase, pilotFocus]);

  const pilotMissingRecommendationOptions = useMemo(() => {
    const options: Array<{ id: string; label: string; prompt: string }> = [];

    if (currentPhase !== 'intake') {
      const hasLetter = recommendedDocs.some((doc) => doc.category === 'letter');
      const hasReport = recommendedDocs.some((doc) => doc.category === 'report');

      if (!hasLetter) {
        options.push({
          id: 'recovery-letter-missing',
          label: 'Recover Missing Letter Recommendation',
          prompt: 'The current recommendation set is missing letters. Add the most relevant counterpart/stakeholder letters required for this case and explain why each is needed.'
        });
      }

      if (!hasReport) {
        options.push({
          id: 'recovery-report-missing',
          label: 'Recover Missing Report Recommendation',
          prompt: 'The current recommendation set is missing reports. Add decision-grade reports needed for this case and justify each selection.'
        });
      }
    }

    if (!consultantGateReady) {
      options.push({
        id: 'recovery-consultant-gate',
        label: 'Recover Missing Case Essentials',
        prompt: `Consultant gate is blocked. Collect and structure missing essentials: ${consultantGateMissing.slice(0, 4).join(', ')}.`
      });
    }

    if (caseStudy.uploadedDocuments.length === 0) {
      options.push({
        id: 'recovery-evidence-seed',
        label: 'Recover Missing Evidence Inputs',
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

  const pilotFailureAlerts = useMemo(() => {
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

  const pilotReadiness = useMemo(() => {
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
      // Background signal only — silent kernel refresh, no chat injection
    }
  }, [regionalKernel, currentPhase]);

  const realLifeMatterPack = useMemo(() => {
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
      `Pilot add-ons: ${pilotSelectedAddOns.length > 0 ? pilotSelectedAddOns.map((id) => pilotAllOptions.get(id)?.label || id).join(', ') : 'none selected'}`,
      `Global issue pack: ${activeIssuePack.label}`,
      `Case method gaps: ${caseMethodGaps.length > 0 ? caseMethodGaps.join(', ') : 'none'}`,
      `Regional kernel readiness: ${regionalKernel.governanceReadiness}%`
    ];
    return lines.join('\n');
  }, [caseStudy, pilotSelectedAddOns, pilotAllOptions, activeIssuePack.label, caseMethodGaps, regionalKernel.governanceReadiness]);

  const pilotSelectedAddOnPrompts = useMemo(() => {
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

  const handlePilotApplyMove = useCallback((move: string) => {
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
        content: `Pilot Mode applied: ${move}`,
        timestamp: new Date(),
        phase: 'discovery'
      }
    ]);
  }, []);

  const handleApplyPilotOption = useCallback((optionId: string) => {
    const option = pilotAllOptions.get(optionId);
    if (!option) return;

    setCurrentPhase('discovery');
    setInputValue(option.prompt);

    setPilotSelectedAddOns((prev) => (prev.includes(optionId) ? prev : [...prev, optionId]));
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
        content: `Pilot option added to case build: ${option.label}`,
        timestamp: new Date(),
        phase: 'discovery'
      }
    ]);
  }, [pilotAllOptions]);

  const handleAddCustomPilotOption = useCallback(() => {
    const text = customPilotOptionInput.trim();
    if (!text) return;

    const optionId = `custom-${Date.now()}`;
    const option = {
      id: optionId,
      label: text.length > 48 ? `${text.slice(0, 45)}...` : text,
      prompt: text
    };

    setCustomPilotOptions((prev) => [option, ...prev].slice(0, 10));
    setCustomPilotOptionInput('');
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Custom Pilot option added: ${option.label}`,
        timestamp: new Date(),
        phase: 'discovery'
      }
    ]);
  }, [customPilotOptionInput]);

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

  // Start with autonomous welcome message
  useEffect(() => {
    if (messages.length === 0) {
      const initialMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: "Hello, I'm your BW Consultant AI. I can answer direct questions, run autonomous strategic analysis, and build your case file in the background from natural conversation. Tell me what you're working on, or ask anything and I'll adapt.",
        timestamp: new Date(),
        phase: 'discovery'
      };
      setMessages([initialMessage]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Read file content
  const readFileContent = useCallback(async (file: File): Promise<string> => {
    const lowerName = file.name.toLowerCase();
    const isText = file.type.startsWith('text/') || 
      ['.txt', '.md', '.csv', '.json', '.html', '.xml', '.ts', '.tsx', '.js', '.jsx', '.pdf'].some(ext => lowerName.endsWith(ext));
    
    if (!isText || lowerName.endsWith('.pdf')) {
      return `[${file.name}] — Binary document uploaded and indexed by filename for evidence tracking`;
    }
    
    try {
      const text = await file.text();
      return `[${file.name}]\n${text.slice(0, 5000)}${text.length > 5000 ? '\n...(truncated)' : ''}`;
    } catch {
      return `[${file.name}] — Unable to read file content`;
    }
  }, []);

  const buildConsultantPrompt = useCallback((userInput: string, context: string) => {
    const policyPack = resolvePolicyPack(caseStudy);
    return `You are BW Consultant AI, an expert business intelligence consultant. Operate in mixed-initiative autonomous mode.

Current case context:
${JSON.stringify(caseStudy, null, 2)}

Applicable policy pack:
${JSON.stringify(policyPack, null, 2)}

Consultant intelligence profile:
${consultantCaseBrief}

Consultant gate status:
${consultantGateReady ? 'READY' : `BLOCKED: ${consultantGateMissing.join('; ')}`}

User's latest input: "${userInput}"
Phase context: ${context}

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

Respond naturally and helpfully. Keep responses focused and actionable.`;
  }, [caseStudy, resolvePolicyPack, consultantCaseBrief, consultantGateReady, consultantGateMissing]);

  // Process user input through real AI
  const processWithAI = useCallback(async (userInput: string, context: string): Promise<string> => {
    const trimmedInput = userInput.trim();
    const isGreetingOnly = /^(hi|hello|hey|good\s+(morning|afternoon|evening)|yo|sup)[!.\s]*$/i.test(trimmedInput);
    if (isGreetingOnly) {
      return `Hello — I'm ready to help. Share your situation, and I'll answer directly while building your case in the background.`;
    }

    try {
      const systemPrompt = buildConsultantPrompt(userInput, context);
      const response = await chatSession.current.sendMessage({
        message: `${systemPrompt}\n\nUser says: ${userInput}`
      });

      const responseText = response.text?.trim();
      if (!responseText || /chat service unavailable/i.test(responseText)) {
        return "I can continue from current context. Share your decision owner, jurisdiction, and objective, and I will proceed.";
      }

      return responseText;
    } catch (error) {
      console.error('AI processing error:', error);
      return "I can continue from current context and still move this forward. Share your decision owner, jurisdiction, and objective, and I will proceed.";
    }
  }, [buildConsultantPrompt]);

  const processWithAIStream = useCallback(async (
    userInput: string,
    context: string,
    onChunk: (text: string) => void
  ): Promise<string> => {
    const trimmedInput = userInput.trim();
    const isGreetingOnly = /^(hi|hello|hey|good\s+(morning|afternoon|evening)|yo|sup)[!.\s]*$/i.test(trimmedInput);
    if (isGreetingOnly) {
      const greeting = `Hello — I'm ready to help. Share your situation, and I'll answer directly while building your case in the background.`;
      onChunk(greeting);
      return greeting;
    }

    try {
      const systemPrompt = buildConsultantPrompt(userInput, context);
      const stream = await chatSession.current.sendMessageStream({
        message: `${systemPrompt}\n\nUser says: ${userInput}`
      });

      let aggregate = '';
      for await (const part of stream) {
        const delta = part?.text || '';
        if (!delta) continue;
        aggregate += delta;
        onChunk(aggregate);
      }

      const finalText = aggregate.trim();
      if (!finalText || /chat service unavailable/i.test(finalText)) {
        const fallback = "I can continue from current context. Share your decision owner, jurisdiction, and objective, and I will proceed.";
        onChunk(fallback);
        return fallback;
      }

      return finalText;
    } catch (error) {
      console.warn('Streaming response failed, falling back to non-streaming:', error);
      const fallbackText = await processWithAI(userInput, context);
      onChunk(fallbackText);
      return fallbackText;
    }
  }, [buildConsultantPrompt, processWithAI]);

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
      setReactiveDraftHint(hint || 'Keep typing — the consultant will continue building your case context in the background.');
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

    setRecommendedDocs(enrichedDocs);
  }, [caseStudy, resolvePolicyPack, recommendationBoostMap]);

  useEffect(() => {
    if (recommendedDocs.length > 0) {
      generateRecommendations();
    }
  }, [recommendationBoostMap, recommendedDocs.length, generateRecommendations]);

  // Handle send message
  const handleSend = useCallback(async () => {
    if (!inputValue.trim() && uploadedFiles.length === 0) return;

    let userContent = inputValue.trim();
    const extractedSignals = extractConsultantSignals(userContent);
    
    const discoveredDocs: DocumentOption[] = [];

    // Process uploaded files
    if (uploadedFiles.length > 0) {
      const fileContents = await Promise.all(uploadedFiles.map(readFileContent));
      userContent += `\n\n**Uploaded Documents:**\n${fileContents.join('\n\n')}`;

      for (let index = 0; index < uploadedFiles.length; index += 1) {
        const file = uploadedFiles[index];
        const fileContent = fileContents[index] || '';
        if (fileContent.length < 400 || file.name.toLowerCase().endsWith('.pdf')) {
          continue;
        }

        try {
          const analysis = CaseStudyAnalyzer.analyze(file.name, fileContent);
          const summary = CaseStudyAnalyzer.toConsultantSummary(analysis);
          setCaseStudy(prev => ({
            ...prev,
            aiInsights: [...prev.aiInsights, summary],
            additionalContext: [...prev.additionalContext, `Uploaded analysis: ${analysis.title}`]
          }));

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
    }

    const hasSignalUpdate = Boolean(
      extractedSignals.userName ||
      extractedSignals.organizationName ||
      extractedSignals.organizationType ||
      extractedSignals.contactRole ||
      extractedSignals.country ||
      extractedSignals.jurisdiction ||
      extractedSignals.objectives ||
      extractedSignals.currentMatter ||
      extractedSignals.constraints ||
      extractedSignals.targetAudience ||
      extractedSignals.decisionDeadline ||
      extractedSignals.evidenceNote
    );

    const userMessagePhase = readinessScore < 55 ? 'discovery' : readinessScore < 80 ? 'analysis' : 'recommendations';

    if (hasSignalUpdate) {
      setCaseStudy(prev => {
        const next = { ...prev };

        if (extractedSignals.userName && !next.userName.trim()) next.userName = extractedSignals.userName;
        if (extractedSignals.organizationName && !next.organizationName.trim()) next.organizationName = extractedSignals.organizationName;
        if (extractedSignals.organizationType && !next.organizationType.trim()) next.organizationType = extractedSignals.organizationType;
        if (extractedSignals.contactRole && !next.contactRole.trim()) next.contactRole = extractedSignals.contactRole;
        if (extractedSignals.country && !next.country.trim()) next.country = extractedSignals.country;
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
    }

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

      const caseDraft: CaseStudy = {
        ...caseStudy,
        userName: extractedSignals.userName && !caseStudy.userName.trim() ? extractedSignals.userName : caseStudy.userName,
        organizationName: extractedSignals.organizationName && !caseStudy.organizationName.trim() ? extractedSignals.organizationName : caseStudy.organizationName,
        organizationType: extractedSignals.organizationType && !caseStudy.organizationType.trim() ? extractedSignals.organizationType : caseStudy.organizationType,
        contactRole: extractedSignals.contactRole && !caseStudy.contactRole.trim() ? extractedSignals.contactRole : caseStudy.contactRole,
        country: extractedSignals.country && !caseStudy.country.trim() ? extractedSignals.country : caseStudy.country,
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
      setExecutionTaskStatus('ingestion', 'completed', `Case readiness inferred at ${liveReadiness}% (${inferredPhase})`);
      let responseProvenance = buildMessageProvenance(caseDraft, liveReadiness);

      const assistantMessageId = crypto.randomUUID();
      setMessages(prev => [...prev, {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        phase: userMessagePhase
      }]);

      setExecutionTaskStatus('insight', 'running', 'Running NSIL signal extraction in parallel');
      const agenticInsightsPromise = (async () => {
        try {
          const insights = await agenticAIRef.current.consult(toAgenticParams(caseDraft), 'case_discovery');
          setExecutionTaskStatus('insight', 'completed', `${insights.length} insight${insights.length === 1 ? '' : 's'} generated`);
          return insights;
        } catch (agenticError) {
          console.warn('Agentic insight generation failed:', agenticError);
          setExecutionTaskStatus('insight', 'failed', 'Insight scan unavailable for this turn');
          return [];
        }
      })();

      setExecutionTaskStatus('response', 'running', 'Streaming consultant response');
      setIsStreamingResponse(true);
      let responseContent = await processWithAIStream(
        userContent,
        `Autonomous mixed-initiative mode: answer user intent first, then move the case forward with one highest-value follow-up if required. Do not run scripted intake.`,
        (streamText) => {
          setMessages(prev => prev.map((msg) => (
            msg.id === assistantMessageId ? { ...msg, content: streamText } : msg
          )));
        }
      );
      setExecutionTaskStatus('response', 'completed', 'Primary response delivered');

      const nextFollowUp = getHighestValueFollowUp(caseDraft);
      const trimmedUserContent = userContent.trim();
      const isGreetingOnly = /^(hi|hello|hey|good\s+(morning|afternoon|evening)|yo|sup)[!.\s]*$/i.test(trimmedUserContent);
      const likelyDirectQuestion = /\?|\b(explain|what|why|how|who|can you|could you|should we)\b/i.test(trimmedUserContent);

      setExecutionTaskStatus('followup', 'running', 'Evaluating next highest-value clarification');
      if (nextFollowUp && !isGreetingOnly && (liveReadiness < 80 || likelyDirectQuestion)) {
        responseContent = `${responseContent}\n\nOne high-value detail to improve decision quality:\n${nextFollowUp}`;
        setAdaptiveQuestionsAsked(prev => prev + 1);
        setExecutionTaskStatus('followup', 'completed', 'Follow-up question appended');
      } else {
        setExecutionTaskStatus('followup', 'completed', 'No follow-up needed for this turn');
      }

      setMessages(prev => prev.map((msg) => (
        msg.id === assistantMessageId ? { ...msg, content: responseContent, phase: inferredPhase } : msg
      )));

      const agenticInsights = await agenticInsightsPromise;
      if (agenticInsights.length > 0 && liveReadiness >= 40 && !isGreetingOnly) {
        const insightSummary = agenticInsights
          .slice(0, 2)
          .map((insight) => `• ${insight.title}: ${insight.content}`)
          .join('\n');

        responseProvenance = buildMessageProvenance(caseDraft, liveReadiness, [`NSIL insights in this turn: ${agenticInsights.length}`]);

        setCaseStudy(prev => ({
          ...prev,
          aiInsights: [...prev.aiInsights, ...agenticInsights.slice(0, 2).map(i => `${i.title}: ${i.content}`)]
        }));

        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          role: 'system',
          content: `NSIL Agentic Insight\n${insightSummary}`,
          timestamp: new Date(),
          phase: inferredPhase,
          provenance: {
            confidence: Math.min(95, Math.max(60, Math.round(liveReadiness * 0.7 + 20))),
            confidenceBand: liveReadiness >= 75 ? 'high' : liveReadiness >= 55 ? 'medium' : 'low',
            sources: ['NSIL Agentic Insight Engine', 'Current case draft signals', `Readiness score: ${liveReadiness}%`]
          }
        }]);
      }

      setMessages(prev => prev.map((msg) => (
        msg.id === assistantMessageId
          ? { ...msg, content: responseContent, phase: inferredPhase, provenance: responseProvenance }
          : msg
      )));

      if (liveReadiness >= 70) {
        generateRecommendations();
      }

      // Live Intel: fetch real data for detected country
      if (caseDraft.country) {
        fetchLiveIntelForCountry(caseDraft.country);
      }

      // Action execution: queue document generation action when case is ready
      if (liveReadiness >= 75 && inferredPhase === 'recommendations') {
        queueAction({
          id: `gen-docs-${Date.now()}`,
          label: 'Generate Case Documents',
          description: `Case readiness at ${liveReadiness}% — ready to generate institutional documents and letters.`,
          category: 'document'
        });
      }

    } catch (error) {
      console.error('Send error:', error);
      setExecutionTaskStatus('response', 'failed', 'Response pipeline failed');
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: "I encountered an issue processing your request. Please try again.",
        timestamp: new Date(),
        phase: currentPhase
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsStreamingResponse(false);
      setIsLoading(false);
    }
  }, [
    inputValue,
    uploadedFiles,
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
    getHighestValueFollowUp
    ,extractConsultantSignals
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

    return checks
      .filter((item) => item.missing)
      .sort((a, b) => b.weight - a.weight);
  }, [caseStudy]);

  const handleAskNextCriticalQuestion = useCallback(() => {
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

  const handleApplyHighConfidence = useCallback(() => {
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

  const handleRejectAllSuggestions = useCallback(() => {
    if (extractedEntitySuggestions.length === 0) return;

    setEntityDecisions((prev) => {
      const next = { ...prev };
      extractedEntitySuggestions.forEach((item) => {
        next[item.key] = 'rejected';
      });
      return next;
    });
  }, [extractedEntitySuggestions]);

  const handleRejectLowConfidence = useCallback(() => {
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

  const handleResetSuggestionDecisions = useCallback(() => {
    setEntityDecisions({} as Partial<Record<ExtractedEntityKey, 'accepted' | 'rejected'>>);
  }, []);

  const decidedSuggestionCount = extractedEntitySuggestions.filter((item) => entityDecisions[item.key]).length;
  const acceptedSuggestionCount = extractedEntitySuggestions.filter((item) => entityDecisions[item.key] === 'accepted').length;
  const pendingSuggestionCount = extractedEntitySuggestions.length - decidedSuggestionCount;
  const decisionCompletenessPct = extractedEntitySuggestions.length === 0
    ? 100
    : Math.round((decidedSuggestionCount / extractedEntitySuggestions.length) * 100);

  const handleResolveTopGap = useCallback(() => {
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

  // Download generated content
  const downloadContent = useCallback(() => {
    if (generatedContent) {
      const blob = new Blob([generatedContent], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bw-document-${Date.now()}.md`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }, [generatedContent]);

  // Generate selected documents
  const handleGenerateDocuments = useCallback(async () => {
    const effectiveDocIds = generationScope === 'selected'
      ? selectedDocs
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

    if (readinessScore < 80) {
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Your case file readiness is ${readinessScore}%. I need at least 80% before final generation. Please continue answering clarifying questions or upload supporting evidence.`,
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
    
    const docNames = effectiveDocIds.map(id => recommendedDocs.find(d => d.id === id)?.title).filter(Boolean).join(', ');
    
    try {
      const response = await processWithAI(
        `Generate the following documents: ${docNames}`,
        `Based on the complete case study, generate professional document content for: ${docNames}. Format with proper markdown headings, sections, and professional language. Include all relevant details from the case study.

      Consultant profile to anchor outputs:
      ${consultantCaseBrief}

    Real-life matter pack (must be reflected in writing):
    ${realLifeMatterPack}

    Pilot expansion requirements:
    ${pilotSelectedAddOnPrompts || '- None selected'}

    Regional development kernel (apply directly):
    - Active issue pack: ${activeIssuePack.label}
    - Governance readiness: ${regionalKernel.governanceReadiness}%
    - Top interventions: ${regionalKernel.interventions.slice(0, 3).map((item) => `${item.title} (${item.score}%)`).join('; ')}
    - Top partners: ${regionalKernel.partners.slice(0, 3).map((item) => `${item.partner.name} (${item.score.total}%)`).join('; ')}
    - Problem graph roots: ${regionalKernel.graph.rootCauses.map((node) => node.label).join(' | ')}
    - Data fabric confidence/freshness: ${Math.round(regionalKernel.dataFabric.overallConfidence * 100)}% / ${regionalKernel.dataFabric.overallFreshnessHours}h

    Output depth requirement:
    ${outputDepthSpec.label} — ${outputDepthSpec.instruction}

Each selected output must include:
- Why this output is appropriate for ${caseStudy.targetAudience || 'the target audience'}
- Estimated page length
- Required support documents/annexures
      - Contact letter guidance where relevant

    Write as an exacting consultant: concise, evidence-aware, and decision-oriented.

    Letter/report quality rules:
    - Do not produce generic template language.
    - Explicitly identify the real-world matter, counterparts, and decision stakes.
    - Use concrete facts from the matter pack; where facts are missing, state "Data required" and ask for the exact missing evidence.
    - Tailor tone and structure to the stated audience and jurisdiction.
    - Ensure outputs are implementation-capable with actions, owners, and timeline markers.`
      );
      
      setGeneratedContent(response);
      
      const genMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `I've generated your documents. You can view, copy, or download them from the panel on the right.\n\n---\n\n${response}`,
        timestamp: new Date(),
        phase: 'generation'
      };
      setMessages(prev => [...prev, genMessage]);
    } catch (error) {
      console.error('Generation error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDocs, generationScope, readinessScore, allowAllDocumentAccess, recommendedDocs, processWithAI, caseStudy.targetAudience, getCriticalCaseGaps, consultantCaseBrief, consultantGateReady, consultantGateMissing, realLifeMatterPack, pilotSelectedAddOnPrompts, outputDepthSpec, caseMethodGaps, activeIssuePack.label, regionalKernel]);

  // Phase indicator
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
          `${index + 1}. [${event.type.toUpperCase()}] ${event.timestamp} — ${event.summary}`
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
  const gapSeverityCounts = criticalCaseGaps.reduce<Record<CriticalGapSeverity, number>>(
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

    if (!hasMissionSignal) {
      setMissionSnapshot(null);
      return;
    }

    const snapshot = MissionGraphService.upsertFromCaseInput(missionCaseInput);

    setMissionSnapshot(snapshot);
  }, [
    caseStudy.organizationName,
    caseStudy.currentMatter,
    caseStudy.objectives,
    missionCaseInput
  ]);

  const handleRunAutonomyCycle = useCallback(() => {
    const snapshot = MissionGraphService.runCycleFromCaseInput(missionCaseInput);
    setMissionSnapshot(snapshot);
  }, [missionCaseInput]);

  const handleToggleAutonomyPause = useCallback(() => {
    const snapshot = MissionGraphService.setAutonomyPaused(!(missionSnapshot?.autonomyPaused ?? false));
    if (snapshot) {
      setMissionSnapshot(snapshot);
    }
  }, [missionSnapshot?.autonomyPaused]);

  const handleApproveManualMissionTasks = useCallback(() => {
    const snapshot = MissionGraphService.approveManualTasks();
    if (snapshot) {
      setMissionSnapshot(snapshot);
    }
  }, []);

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
      style={{ fontFamily: "'Söhne', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif" }}
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
          className="px-6 py-4 flex items-center justify-between relative overflow-hidden"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1400&h=300&fit=crop&q=80)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-blue-900/90 via-blue-800/80 to-blue-900/70" />
          <div className="relative z-10 flex items-center gap-4">
            <div className="flex items-center gap-3">
              <Bot size={24} className="text-white" />
              <div>
                <h1 className="text-xl font-bold text-white">BW Consultant</h1>
                <span className="text-blue-200 text-xs">Powered by NSIL Agentic Runtime • Case Study Builder</span>
              </div>
            </div>
          </div>
          
          {/* Phase Indicator */}
          <div className="relative z-10 hidden md:flex items-center gap-2">
            {Object.entries(phaseLabels).map(([phase, info], idx) => (
              <React.Fragment key={phase}>
                {idx > 0 && <ChevronRight size={14} className="text-blue-300/50" />}
                <div className={`px-3 py-1.5 text-xs font-medium transition-all ${
                  currentPhase === phase 
                    ? 'bg-white text-blue-800' 
                    : Object.keys(phaseLabels).indexOf(currentPhase) > idx 
                      ? 'bg-blue-700/50 text-blue-100'
                      : 'bg-blue-800/30 text-blue-300/70'
                }`}>
                  {info.label}
                </div>
              </React.Fragment>
            ))}
          </div>

          {/* Language Selector */}
          <div className="relative z-10 flex items-center gap-1 mr-2">
            <Languages size={14} className="text-blue-200" />
            <select
              value={locale}
              onChange={(e) => setLocale(e.target.value)}
              className="bg-white/10 text-white text-xs border border-white/20 px-1.5 py-1 focus:outline-none"
              title="Output locale / language"
            >
              {LOCALES.map((l) => (
                <option key={l.code} value={l.code} className="text-black bg-white">{l.label}</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => setShowWorkspaceModal(true)}
            className="relative z-10 px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm font-medium flex items-center gap-2 border border-white/20 transition-all"
          >
            <Maximize2 size={16} />
            Full Analysis
          </button>
          <button
            onClick={() => setShowPilotWindow((prev) => !prev)}
            className="relative z-10 ml-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm font-medium flex items-center gap-2 border border-white/20 transition-all"
          >
            <Globe size={16} />
            {showPilotWindow ? 'Close Pilot Mode' : 'Pilot Mode'}
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Chat Panel */}
          <div className="flex-1 flex flex-col bg-stone-50">
            {/* Messages */}
            <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-6 space-y-4">
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
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] px-4 py-3 text-sm leading-relaxed ${
                          msg.role === 'user'
                            ? 'bg-blue-600 text-white'
                            : 'bg-white border border-stone-200 text-stone-900 shadow-sm'
                        }`}
                      >
                        {msg.role === 'assistant' && (
                          <div className="flex items-center gap-1.5 mb-2">
                            <Bot size={12} className="text-blue-600" />
                            <span className="text-[10px] font-semibold text-blue-600 uppercase tracking-wide">BW Consultant</span>
                          </div>
                        )}
                        <div 
                          className="whitespace-pre-wrap"
                          dangerouslySetInnerHTML={{ 
                            __html: msg.content
                              .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
                              .replace(/\n/g, '<br />')
                          }} 
                        />
                        {msg.provenance && msg.role !== 'user' && msg.provenance.confidence >= 50 && (
                          <div className="mt-2 pt-2 border-t border-stone-200 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-slate-500">Confidence:</span>
                              <span className={`text-[10px] px-1.5 py-0.5 border ${
                                msg.provenance.confidenceBand === 'high'
                                  ? 'bg-green-50 text-green-700 border-green-200'
                                  : msg.provenance.confidenceBand === 'medium'
                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                    : 'bg-red-50 text-red-700 border-red-200'
                              }`}>
                                {msg.provenance.confidenceBand.toUpperCase()} ({msg.provenance.confidence}%)
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
                              <span className="text-[10px] text-slate-400">Helpful?</span>
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
                                    ? 'text-red-600 bg-red-50'
                                    : 'text-slate-400 hover:text-red-500'
                                }`}
                                title="Mark unhelpful"
                              >
                                <ThumbsDown size={12} />
                              </button>
                              {feedbackMap[msg.id] && (
                                <span className="text-[10px] text-slate-400">
                                  {feedbackMap[msg.id] === 'up' ? 'Thanks — logged ↑' : 'Noted — will improve ↓'}
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
                      <div className="px-4 py-3 bg-white border border-stone-200 shadow-sm flex items-center gap-2">
                        <Loader2 size={14} className="animate-spin text-blue-600" />
                        <span className="text-sm text-slate-500">
                          {isStreamingResponse ? 'Streaming response...' : currentPhase === 'generation' ? 'Generating documents...' : 'Analyzing...'}
                        </span>
                      </div>
                    </div>
                  )}
                </>
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
                  accept=".txt,.md,.csv,.json,.pdf,.doc,.docx"
                />
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
                  className="flex-1 resize-none border border-stone-300 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[48px] max-h-[150px] leading-relaxed"
                  rows={1}
                />
                <button
                  onClick={handleSend}
                  disabled={(!inputValue.trim() && uploadedFiles.length === 0) || isLoading}
                  className={`px-6 py-3 text-sm font-medium transition-all flex items-center gap-2 ${
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
                      Send
                    </>
                  )}
                </button>
              </div>
              {executionTimeline.length > 0 && (
                <div className="max-w-4xl mx-auto mt-2 border border-stone-200 bg-stone-50 px-3 py-2">
                  <p className="text-[11px] font-semibold text-slate-800">Planner / Executor Timeline</p>
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
                    Quick Start — Try one of these:
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
                <strong>NSIL Agentic Runtime</strong> — Sovereign-grade intelligence • Real-time analysis • Locale: {locale.toUpperCase()}
              </span>
              <span className="text-[10px] text-slate-400">
                Learning: {OutcomeLearningService.getState().records.length} sessions logged
              </span>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="w-80 border-l border-stone-200 bg-white flex flex-col">
            {/* Case Summary */}
            <div className="p-4 border-b border-stone-200 bg-slate-50">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Building2 size={16} className="text-blue-600" />
                Case Summary
              </h2>
              <div className="mt-2 text-[11px] text-blue-700 bg-blue-50 border border-blue-200 px-2 py-1">
                Policy Pack: {resolvePolicyPack(caseStudy).label}
              </div>
              <div className="mt-2 flex items-center gap-2 text-[11px]">
                <span className="px-2 py-1 bg-blue-100 text-blue-700 border border-blue-200 font-semibold">
                  Readiness: {readinessScore}%
                </span>
                <span className="px-2 py-1 bg-slate-100 text-slate-600 border border-slate-200 capitalize">
                  {skillLevel}
                </span>
                <span className={`px-2 py-1 border font-semibold ${
                  pilotModeEnabled
                    ? 'bg-indigo-100 text-indigo-700 border-indigo-200'
                    : 'bg-slate-100 text-slate-500 border-slate-200'
                }`}>
                  Pilot: {pilotModeEnabled ? `${pilotReadiness}%` : 'Off'}
                </span>
              </div>
              <div className="mt-2 border border-stone-200 bg-white px-2 py-1 text-[11px]">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-700">Pilot Advisor</span>
                  <button
                    type="button"
                    onClick={() => setPilotModeEnabled((prev) => !prev)}
                    className={`px-1.5 py-0.5 border text-[10px] ${
                      pilotModeEnabled
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-slate-700 border-stone-300 hover:bg-stone-50'
                    }`}
                  >
                    {pilotModeEnabled ? 'Enabled' : 'Disabled'}
                  </button>
                </div>
                {pilotModeEnabled && (
                  <>
                    <p className="mt-1 text-[10px] text-slate-600">
                      Focus: {pilotFocus.replace('-', ' ')} • Add-ons: {pilotSelectedAddOns.length}
                    </p>
                    {pilotFailureAlerts.length > 0 && (
                      <ul className="mt-1 space-y-1">
                        {pilotFailureAlerts.slice(0, 2).map((alert, index) => (
                          <li key={`${alert}-${index}`} className="text-[10px] text-amber-700">• {alert}</li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </div>
              <div className="mt-2 border border-stone-200 bg-white px-2 py-1 text-[11px]">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-700">Consultant Gate</span>
                  <span className={`px-1.5 py-0.5 border ${
                    consultantGateReady
                      ? 'bg-green-50 text-green-700 border-green-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {consultantGateReady ? 'READY' : 'BLOCKED'}
                  </span>
                </div>
                {!consultantGateReady && (
                  <ul className="mt-1 space-y-1">
                    {consultantGateMissing.slice(0, 4).map((missingItem, index) => (
                      <li key={`${missingItem}-${index}`} className="text-[10px] text-slate-600">
                        • {missingItem}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="mt-2 text-[11px] bg-white border border-stone-200 px-2 py-1">
                <div className="flex items-center justify-between gap-2">
                  <span className={`${criticalCaseGaps.length === 0 ? 'text-green-700' : 'text-amber-700'} font-semibold`}>
                    Critical Gaps: {criticalCaseGaps.length}
                  </span>
                  {criticalCaseGaps.length > 0 && (
                    <button
                      type="button"
                      onClick={handleAskNextCriticalQuestion}
                      className="text-[10px] px-1.5 py-1 bg-white border border-amber-300 text-amber-700 hover:bg-amber-50"
                    >
                      Ask Next Critical Question
                    </button>
                  )}
                </div>
                {criticalCaseGaps.length > 0 && (
                  <>
                    <p className="mt-1 text-[10px] text-slate-600">
                      Severity: C {gapSeverityCounts.critical} • H {gapSeverityCounts.high} • M {gapSeverityCounts.medium}
                    </p>
                    <p className="mt-1 text-[10px] text-slate-600">
                      Next: {criticalCaseGaps[0].severity.toUpperCase()} — {criticalCaseGaps[0].label}
                    </p>
                    {topCriticalGap && (
                      <>
                        <textarea
                          value={topGapQuickInput}
                          onChange={(e) => setTopGapQuickInput(e.target.value)}
                          placeholder={topCriticalGap.question}
                          className="mt-1 w-full resize-none border border-stone-300 px-2 py-1 text-[10px] text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          rows={2}
                        />
                        {extractedEntitySuggestions.length > 0 && (
                          <div className="mt-1 space-y-1 border border-stone-200 bg-white p-1.5">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-[10px] text-slate-600">Detected entities (confirm/reject before auto-fill):</p>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={handleApplyHighConfidence}
                                  disabled={!extractedEntitySuggestions.some((item) => item.confidence === 'high')}
                                  className={`text-[10px] px-1 py-0.5 border ${
                                    !extractedEntitySuggestions.some((item) => item.confidence === 'high')
                                      ? 'bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed'
                                      : 'bg-white text-blue-700 border-blue-300 hover:bg-blue-50'
                                  }`}
                                >
                                  Apply High Confidence
                                </button>
                                <button
                                  type="button"
                                  onClick={handleRejectLowConfidence}
                                  disabled={!extractedEntitySuggestions.some((item) => item.confidence === 'low')}
                                  className={`text-[10px] px-1 py-0.5 border ${
                                    !extractedEntitySuggestions.some((item) => item.confidence === 'low')
                                      ? 'bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed'
                                      : 'bg-white text-amber-700 border-amber-300 hover:bg-amber-50'
                                  }`}
                                >
                                  Reject Low Confidence
                                </button>
                                <button
                                  type="button"
                                  onClick={handleRejectAllSuggestions}
                                  disabled={extractedEntitySuggestions.length === 0}
                                  className={`text-[10px] px-1 py-0.5 border ${
                                    extractedEntitySuggestions.length === 0
                                      ? 'bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed'
                                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                                  }`}
                                >
                                  Reject All
                                </button>
                                <button
                                  type="button"
                                  onClick={handleResetSuggestionDecisions}
                                  disabled={Object.keys(entityDecisions).length === 0}
                                  className={`text-[10px] px-1 py-0.5 border ${
                                    Object.keys(entityDecisions).length === 0
                                      ? 'bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed'
                                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                                  }`}
                                >
                                  Reset Decisions
                                </button>
                              </div>
                            </div>
                            <div>
                              <div className="h-1.5 bg-slate-100 border border-slate-200 overflow-hidden">
                                <div
                                  className="h-full bg-blue-500"
                                  style={{ width: `${decisionCompletenessPct}%` }}
                                />
                              </div>
                              <p className="mt-1 text-[10px] text-slate-600">
                                Decision completeness: {decisionCompletenessPct}% • Accepted {acceptedSuggestionCount} • Pending {pendingSuggestionCount}
                              </p>
                            </div>
                            {extractedEntitySuggestions.map((item) => {
                              const decision = entityDecisions[item.key];
                              return (
                                <div key={item.key} className="flex items-center justify-between gap-2 text-[10px]">
                                  <div className="min-w-0">
                                    <span className="font-semibold text-slate-700">{item.label}:</span>{' '}
                                    <span className="text-slate-700">{item.value}</span>{' '}
                                    <span className={`ml-1 px-1 py-0.5 border ${
                                      item.confidence === 'high'
                                        ? 'text-green-700 border-green-200 bg-green-50'
                                        : item.confidence === 'medium'
                                          ? 'text-amber-700 border-amber-200 bg-amber-50'
                                          : 'text-slate-600 border-slate-200 bg-slate-50'
                                    }`}>
                                      {item.confidence}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => setEntityDecisions((prev) => ({ ...prev, [item.key]: 'accepted' }))}
                                      className={`px-1 py-0.5 border ${
                                        decision === 'accepted'
                                          ? 'bg-blue-600 text-white border-blue-600'
                                          : 'bg-white text-blue-700 border-blue-300 hover:bg-blue-50'
                                      }`}
                                    >
                                      Accept
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEntityDecisions((prev) => ({ ...prev, [item.key]: 'rejected' }))}
                                      className={`px-1 py-0.5 border ${
                                        decision === 'rejected'
                                          ? 'bg-slate-600 text-white border-slate-600'
                                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                                      }`}
                                    >
                                      Reject
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={handleResolveTopGap}
                          disabled={!topGapQuickInput.trim() || (extractedEntitySuggestions.length > 0 && pendingSuggestionCount > 0)}
                          className={`mt-1 text-[10px] px-1.5 py-1 border ${
                            !topGapQuickInput.trim() || (extractedEntitySuggestions.length > 0 && pendingSuggestionCount > 0)
                              ? 'bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed'
                              : 'bg-white border-blue-300 text-blue-700 hover:bg-blue-50'
                          }`}
                        >
                          Resolve Top Gap
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
              {caseGraph && (
                <div className="mt-2 text-[11px] text-slate-600 bg-white border border-stone-200 px-2 py-1">
                  Case Graph: confidence {Math.round(caseGraph.summary.confidence)}% • evidence {Math.round(caseGraph.summary.evidenceStrength)}%
                </div>
              )}
              <div className="mt-3 space-y-2 text-xs">
                {caseStudy.userName && (
                  <div className="flex items-start gap-2">
                    <User size={12} className="text-slate-400 mt-0.5" />
                    <div>
                      <span className="text-slate-500">User:</span>
                      <p className="text-slate-700">{caseStudy.userName}</p>
                    </div>
                  </div>
                )}
                {caseStudy.organizationName && (
                  <div className="flex items-start gap-2">
                    <User size={12} className="text-slate-400 mt-0.5" />
                    <div>
                      <span className="text-slate-500">Organization:</span>
                      <p className="text-slate-900 font-medium">{caseStudy.organizationName}</p>
                    </div>
                  </div>
                )}
                {caseStudy.situationType && (
                  <div className="flex items-start gap-2">
                    <HelpCircle size={12} className="text-slate-400 mt-0.5" />
                    <div>
                      <span className="text-slate-500">Situation:</span>
                      <p className="text-slate-700">{caseStudy.situationType.slice(0, 100)}</p>
                    </div>
                  </div>
                )}
                {caseStudy.country && (
                  <div className="flex items-start gap-2">
                    <Globe size={12} className="text-slate-400 mt-0.5" />
                    <div>
                      <span className="text-slate-500">Jurisdiction:</span>
                      <p className="text-slate-700">{caseStudy.country} / {caseStudy.jurisdiction || 'Not specified'}</p>
                    </div>
                  </div>
                )}
                {caseStudy.objectives && (
                  <div className="flex items-start gap-2">
                    <Target size={12} className="text-slate-400 mt-0.5" />
                    <div>
                      <span className="text-slate-500">Objective:</span>
                      <p className="text-slate-700">{caseStudy.objectives.slice(0, 100)}</p>
                    </div>
                  </div>
                )}
                {caseStudy.uploadedDocuments.length > 0 && (
                  <div className="flex items-start gap-2">
                    <FileText size={12} className="text-slate-400 mt-0.5" />
                    <div>
                      <span className="text-slate-500">Documents:</span>
                      <p className="text-slate-700">{caseStudy.uploadedDocuments.length} uploaded</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-3 border border-stone-200 bg-white p-2 text-[11px]">
                <p className="font-semibold text-slate-800">Consultant Intelligence</p>
                <p className="mt-1 text-slate-700"><span className="font-semibold">Client:</span> {consultantCaseProfile.personSummary}</p>
                <p className="mt-1 text-slate-700"><span className="font-semibold">From:</span> {consultantCaseProfile.originSummary}</p>
                <p className="mt-1 text-slate-700"><span className="font-semibold">Wants to achieve:</span> {consultantCaseProfile.achievementSummary}</p>
                <p className="mt-1 text-slate-600"><span className="font-semibold">Evidence:</span> {consultantCaseProfile.evidenceSummary}</p>
                <div className="mt-1">
                  <p className="font-semibold text-slate-700">Next Consultant Moves</p>
                  <ul className="mt-1 space-y-1">
                    {consultantCaseProfile.nextConsultantActions.map((action, index) => (
                      <li key={`${action}-${index}`} className="text-slate-600">• {action}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {missionSnapshot && (
              <div className="p-4 border-b border-stone-200 bg-white">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <h3 className="text-sm font-bold text-slate-900">Mission Panel</h3>
                  {missionSnapshot.autonomyPaused && (
                    <span className="text-[10px] px-1.5 py-0.5 border bg-amber-50 text-amber-700 border-amber-200">
                      PAUSED
                    </span>
                  )}
                </div>
                <div className="mb-2 flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleRunAutonomyCycle}
                    className="text-[10px] px-2 py-1 border border-blue-300 bg-white text-blue-700 hover:bg-blue-50"
                  >
                    Run Cycle
                  </button>
                  <button
                    type="button"
                    onClick={handleToggleAutonomyPause}
                    className="text-[10px] px-2 py-1 border border-stone-300 bg-white text-slate-700 hover:bg-stone-50"
                  >
                    {missionSnapshot.autonomyPaused ? 'Resume' : 'Pause'} Autonomy
                  </button>
                  <button
                    type="button"
                    onClick={handleApproveManualMissionTasks}
                    disabled={!missionSnapshot.governanceDecisions.some((decision) => decision.decision === 'review-required')}
                    className={`text-[10px] px-2 py-1 border ${
                      !missionSnapshot.governanceDecisions.some((decision) => decision.decision === 'review-required')
                        ? 'bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed'
                        : 'bg-white text-amber-700 border-amber-300 hover:bg-amber-50'
                    }`}
                  >
                    Approve Manual Tasks
                  </button>
                </div>
                <div className="text-[11px] space-y-1">
                  <p className="text-slate-600">
                    <span className="font-semibold text-slate-700">Status:</span>{' '}
                    <span
                      className={`px-1.5 py-0.5 border ${
                        missionSnapshot.governanceStatus === 'green'
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : missionSnapshot.governanceStatus === 'amber'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-red-50 text-red-700 border-red-200'
                      }`}
                    >
                      {missionSnapshot.mission.status.toUpperCase()} • GOV {missionSnapshot.governanceStatus.toUpperCase()}
                    </span>
                  </p>
                  <p className="text-slate-700">
                    <span className="font-semibold">Objective:</span> {missionSnapshot.mission.objective}
                  </p>
                  <p className="text-slate-600">
                    <span className="font-semibold">Horizon:</span> {missionSnapshot.mission.horizon || 'Current planning cycle'}
                  </p>
                  <p className="text-slate-600">
                    <span className="font-semibold">Next review:</span>{' '}
                    {new Date(missionSnapshot.nextReviewAt).toLocaleString()}
                  </p>
                  <p className="text-slate-600">
                    <span className="font-semibold">Governance:</span>{' '}
                    Approved {missionSnapshot.governanceDecisions.filter((decision) => decision.decision === 'approved').length} •
                    Review {missionSnapshot.governanceDecisions.filter((decision) => decision.decision === 'review-required').length} •
                    Rejected {missionSnapshot.governanceDecisions.filter((decision) => decision.decision === 'rejected').length}
                  </p>
                  <p className="text-slate-600">
                    <span className="font-semibold">Executed:</span> {missionSnapshot.executionRecords.length} task run{missionSnapshot.executionRecords.length === 1 ? '' : 's'}
                  </p>
                  {missionSnapshot.verificationSummary && (
                    <>
                      <p className="text-slate-600">
                        <span className="font-semibold">Adaptation score:</span>{' '}
                        {Math.round(missionSnapshot.verificationSummary.adaptationScore)}%
                      </p>
                      <p className="text-slate-600">
                        <span className="font-semibold">Replan:</span>{' '}
                        {missionSnapshot.verificationSummary.requiresReplan ? 'Required' : 'Stable'}
                      </p>
                    </>
                  )}
                </div>

                {missionSnapshot.verificationSummary && missionSnapshot.verificationSummary.replanSignals.length > 0 && (
                  <div className="mt-2 border border-amber-200 bg-amber-50 px-2 py-1.5">
                    <p className="text-[11px] font-semibold text-amber-800">Replan Signals</p>
                    <ul className="mt-1 space-y-1">
                      {missionSnapshot.verificationSummary.replanSignals.slice(0, 3).map((signal, index) => (
                        <li key={`${signal}-${index}`} className="text-[10px] text-amber-700">
                          • {signal}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="mt-2">
                  <p className="text-[11px] font-semibold text-slate-700">Top Goals</p>
                  <ul className="mt-1 space-y-1">
                    {missionSnapshot.goals.slice(0, 5).map((goal) => (
                      <li key={goal.goalId} className="text-[10px] text-slate-600 border border-stone-200 bg-slate-50 px-2 py-1">
                        {goal.description}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-2">
                  <p className="text-[11px] font-semibold text-slate-700">Next Tasks</p>
                  <ul className="mt-1 space-y-1">
                    {missionSnapshot.activePlan.slice(0, 3).map((task) => (
                      <li key={task.taskId} className="text-[10px] text-slate-600 border border-stone-200 bg-white px-2 py-1">
                        <div>
                          <span className="font-semibold text-slate-700">{task.type}</span> — {task.expectedOutcome}
                        </div>
                        <div className="mt-1 flex items-center gap-1.5">
                          <span className={`text-[10px] px-1 py-0.5 border ${
                            task.status === 'completed'
                              ? 'bg-green-50 text-green-700 border-green-200'
                              : task.status === 'failed'
                                ? 'bg-red-50 text-red-700 border-red-200'
                                : task.status === 'ready'
                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}>
                            {task.status.toUpperCase()}
                          </span>
                          <span className="text-[10px] text-slate-500">Risk {task.riskScore}</span>
                          {task.simulation && (
                            <>
                              <span className="text-[10px] text-slate-500">• Base {task.simulation.baseCase}%</span>
                              <span
                                className={`text-[10px] px-1 py-0.5 border ${
                                  task.simulation.recommendedProceed
                                    ? 'bg-green-50 text-green-700 border-green-200'
                                    : 'bg-amber-50 text-amber-700 border-amber-200'
                                }`}
                              >
                                {task.simulation.recommendedProceed ? 'Proceed Candidate' : 'Needs Review'}
                              </span>
                            </>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Document Recommendations */}
            {(currentPhase === 'recommendations' || currentPhase === 'generation' || recommendedDocs.length > 0) && (
              <div className="flex-1 overflow-y-auto p-4">
                <h3 className="text-sm font-bold text-slate-900 mb-3">Recommended Documents</h3>

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
                      <div className="mt-1 grid grid-cols-3 gap-1.5">
                        {([
                          { id: 'selected', label: 'Selected' },
                          { id: 'letters-only', label: 'Letters Only' },
                          { id: 'reports-only', label: 'Reports Only' }
                        ] as Array<{ id: 'selected' | 'letters-only' | 'reports-only'; label: string }>).map((option) => (
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
                      disabled={isLoading || readinessScore < 80 || criticalCaseGaps.filter(g => g.severity === 'critical' || g.severity === 'high').length > 0}
                      className={`mt-3 w-full py-3 font-medium text-sm flex items-center justify-center gap-2 transition-all ${
                        isLoading || readinessScore < 80 || criticalCaseGaps.filter(g => g.severity === 'critical' || g.severity === 'high').length > 0
                          ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          Generate {generationScope === 'selected' ? `${selectedDocs.length} Selected` : generationScope === 'letters-only' ? 'Letters' : 'Reports'}
                        </>
                      )}
                    </button>
                    {(readinessScore < 80 || criticalCaseGaps.filter(g => g.severity === 'critical' || g.severity === 'high').length > 0) && (
                      <p className="text-[10px] mt-2 text-amber-700 bg-amber-50 border border-amber-200 p-2">
                        Generation requires readiness ≥ 80 and no critical or high-priority case gaps.
                      </p>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Generated Content Actions */}
            {generatedContent && (
              <div className="p-4 border-t border-stone-200 bg-blue-50">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-slate-900">Document Ready</p>
                  <div className="flex gap-1">
                    <button
                      onClick={copyContent}
                      className="p-2 bg-white hover:bg-stone-100 text-slate-600 border border-stone-200"
                      title="Copy"
                    >
                      {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
                    </button>
                    <button
                      onClick={downloadContent}
                      className="p-2 bg-white hover:bg-stone-100 text-slate-600 border border-stone-200"
                      title="Download"
                    >
                      <Download size={16} />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-slate-600">Copy or download your generated documents.</p>

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
          <div className="fixed top-0 right-0 z-40 h-full w-[380px] border-l border-stone-200 bg-white shadow-2xl">
            <div className="h-full flex flex-col">
              <div className="px-4 py-3 border-b border-stone-200 bg-slate-50">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-slate-900">Pilot Mode Advisor</h3>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setShowPilotHowTo(true)}
                      className="px-2 py-1 text-[10px] border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100"
                    >
                      How to Use
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
                <p className="mt-1 text-[11px] text-slate-600">
                  Global issues + market/government expansion intelligence while constructing the case.
                </p>
              </div>

              <div className="p-3 border-b border-stone-200 bg-white">
                <p className="text-[11px] font-semibold text-slate-700 mb-2">Focus</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['new-markets', 'government-entry', 'partnerships', 'risk-compliance'] as PilotModeFocus[]).map((focus) => (
                    <button
                      key={focus}
                      type="button"
                      onClick={() => setPilotFocus(focus)}
                      className={`text-[10px] px-2 py-1 border text-left ${
                        pilotFocus === focus
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-slate-700 border-stone-300 hover:bg-stone-50'
                      }`}
                    >
                      {focus.replace('-', ' ')}
                    </button>
                  ))}
                </div>
                <div className="mt-2 border border-stone-200 bg-slate-50 p-2">
                  <p className="text-[11px] font-semibold text-slate-700 mb-1">Global Issue Packs</p>
                  <div className="grid grid-cols-2 gap-1">
                    {GLOBAL_ISSUE_PACKS.map((pack) => (
                      <button
                        key={pack.id}
                        type="button"
                        onClick={() => setActiveGlobalIssuePack(pack.id)}
                        className={`text-[10px] px-1.5 py-1 border text-left ${
                          activeGlobalIssuePack === pack.id
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-slate-700 border-stone-300 hover:bg-stone-50'
                        }`}
                      >
                        {pack.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                <div className="border border-blue-200 bg-blue-50 p-2">
                  <p className="text-[11px] font-semibold text-blue-800">Regional Development Kernel</p>
                  <p className="mt-1 text-[10px] text-blue-700">Readiness {regionalKernel.governanceReadiness}% • Data confidence {Math.round(regionalKernel.dataFabric.overallConfidence * 100)}%</p>
                  <p className="mt-1 text-[10px] text-blue-700">Top partner: {regionalKernel.partners[0]?.partner.name || 'No ranked partner yet'}</p>
                </div>

                <div className="border border-stone-200 bg-slate-50 p-2">
                  <p className="text-[11px] font-semibold text-slate-700">Failure Detection</p>
                  {pilotFailureAlerts.length === 0 ? (
                    <p className="mt-1 text-[10px] text-green-700">No critical pilot risks detected.</p>
                  ) : (
                    <ul className="mt-1 space-y-1">
                      {pilotFailureAlerts.map((alert, index) => (
                        <li key={`${alert}-${index}`} className="text-[10px] text-amber-700">• {alert}</li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="border border-stone-200 bg-white p-2">
                  <p className="text-[11px] font-semibold text-slate-700">Case Builder Options (Adaptive)</p>
                  <p className="mt-1 text-[10px] text-slate-600">
                    {currentPhase === 'intake'
                      ? 'Startup mode: options below focus on opening the case correctly.'
                      : `Current phase: ${currentPhase}. Options shift automatically as the case develops.`}
                  </p>
                  <div className="mt-1 space-y-1.5">
                    {pilotAdaptiveOptions.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => handleApplyPilotOption(option.id)}
                        className={`w-full flex items-center justify-between text-left text-[10px] px-2 py-1 border ${
                          pilotSelectedAddOns.includes(option.id)
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-slate-700 border-stone-300 hover:bg-stone-50'
                        }`}
                      >
                        <span>{option.label}</span>
                        {pilotSelectedAddOns.includes(option.id) && <Check size={12} />}
                      </button>
                    ))}
                    {pilotAdaptiveOptions.length === 0 && (
                      <p className="text-[10px] text-slate-500">No adaptive options in this phase yet.</p>
                    )}
                  </div>
                </div>

                {pilotMissingRecommendationOptions.length > 0 && (
                  <div className="border border-amber-200 bg-amber-50 p-2">
                    <p className="text-[11px] font-semibold text-amber-800">Missing Recommendation Recovery</p>
                    <p className="mt-1 text-[10px] text-amber-700">System-detected gaps can be added with one click.</p>
                    <div className="mt-1 space-y-1.5">
                      {pilotMissingRecommendationOptions.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => handleApplyPilotOption(option.id)}
                          className={`w-full flex items-center justify-between text-left text-[10px] px-2 py-1 border ${
                            pilotSelectedAddOns.includes(option.id)
                              ? 'bg-amber-600 text-white border-amber-600'
                              : 'bg-white text-amber-800 border-amber-300 hover:bg-amber-100'
                          }`}
                        >
                          <span>{option.label}</span>
                          {pilotSelectedAddOns.includes(option.id) && <Check size={12} />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="border border-stone-200 bg-white p-2">
                  <p className="text-[11px] font-semibold text-slate-700">Add Your Own Option</p>
                  <p className="mt-1 text-[10px] text-slate-600">If something is missing, add a custom option and apply it.</p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <input
                      type="text"
                      value={customPilotOptionInput}
                      onChange={(e) => setCustomPilotOptionInput(e.target.value)}
                      placeholder="Type custom case builder option..."
                      className="flex-1 border border-stone-300 px-2 py-1 text-[10px] text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomPilotOption}
                      disabled={!customPilotOptionInput.trim()}
                      className={`text-[10px] px-2 py-1 border ${
                        !customPilotOptionInput.trim()
                          ? 'bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed'
                          : 'bg-white text-blue-700 border-blue-300 hover:bg-blue-50'
                      }`}
                    >
                      Add
                    </button>
                  </div>
                  {customPilotOptions.length > 0 && (
                    <div className="mt-1 space-y-1.5">
                      {customPilotOptions.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => handleApplyPilotOption(option.id)}
                          className={`w-full flex items-center justify-between text-left text-[10px] px-2 py-1 border ${
                            pilotSelectedAddOns.includes(option.id)
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-slate-700 border-stone-300 hover:bg-stone-50'
                          }`}
                        >
                          <span>{option.label}</span>
                          {pilotSelectedAddOns.includes(option.id) && <Check size={12} />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {pilotFocusIssues.map((issue) => (
                  <div key={issue.id} className="border border-stone-200 bg-white p-2">
                    <p className="text-[11px] font-semibold text-slate-800">{issue.title}</p>
                    <p className="mt-1 text-[10px] text-slate-600">{issue.description}</p>
                    <p className="mt-1 text-[10px] text-blue-700">{issue.whyItMatters}</p>
                    <div className="mt-1 space-y-1">
                      {issue.recommendedMoves.slice(0, 2).map((move, index) => (
                        <button
                          key={`${issue.id}-${index}`}
                          type="button"
                          onClick={() => handlePilotApplyMove(move)}
                          className="w-full text-left text-[10px] px-2 py-1 border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100"
                        >
                          Apply: {move}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}

                <div className="border border-stone-200 bg-white p-2">
                  <p className="text-[11px] font-semibold text-slate-700">Real-Life Matter Pack</p>
                  <pre className="mt-1 whitespace-pre-wrap text-[10px] text-slate-600">{realLifeMatterPack}</pre>
                </div>

                <div className="border border-stone-200 bg-white p-2">
                  <p className="text-[11px] font-semibold text-slate-700">Kernel Intervention Stack</p>
                  <ul className="mt-1 space-y-1">
                    {regionalKernel.interventions.slice(0, 3).map((item) => (
                      <li key={item.title} className="text-[10px] text-slate-700 border border-stone-200 bg-slate-50 px-2 py-1">
                        {item.title} ({item.score}%)
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="border border-stone-200 bg-white p-2">
                  <p className="text-[11px] font-semibold text-slate-700">Case Study Method Layer</p>
                  {caseMethodGaps.length === 0 ? (
                    <p className="mt-1 text-[10px] text-green-700">All method gates currently satisfied.</p>
                  ) : (
                    <ul className="mt-1 space-y-1">
                      {caseMethodGaps.map((gap) => (
                        <li key={gap} className="text-[10px] text-amber-700">• {gap}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {showPilotHowTo && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-2xl bg-white border border-stone-200 shadow-2xl">
              <div className="px-4 py-3 border-b border-stone-200 bg-slate-50 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Pilot Mode - How to Use</h3>
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
                  <p className="text-[11px] font-semibold text-slate-800">1) Set Focus</p>
                  <p className="mt-1 text-[10px] text-slate-600">Choose new markets, government entry, partnerships, or risk compliance to filter relevant global intelligence.</p>
                </div>
                <div className="border border-stone-200 bg-white p-3">
                  <p className="text-[11px] font-semibold text-slate-800">2) Click Case Builder Options</p>
                  <p className="mt-1 text-[10px] text-slate-600">Pilot starts with startup options, then automatically shifts options as the case moves from intake to discovery, analysis, recommendations, and generation.</p>
                </div>
                <div className="border border-stone-200 bg-white p-3">
                  <p className="text-[11px] font-semibold text-slate-800">3) Recover Missing Recommendations</p>
                  <p className="mt-1 text-[10px] text-slate-600">If the system misses letters/reports or key case essentials, use the recovery options to add them back instantly.</p>
                </div>
                <div className="border border-stone-200 bg-white p-3">
                  <p className="text-[11px] font-semibold text-slate-800">4) Add Your Own Option</p>
                  <p className="mt-1 text-[10px] text-slate-600">When you need something not listed, add a custom option and apply it to the active case build.</p>
                </div>
                <div className="border border-stone-200 bg-slate-50 p-3">
                  <p className="text-[10px] text-slate-700">Pilot Mode is designed to improve case completeness before generation so letters and reports are specific, non-template, and implementation-ready.</p>
                </div>
              </div>
            </div>
          </div>
        )}

      {/* Workspace Modal */}
      {showWorkspaceModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col border border-stone-200">
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
