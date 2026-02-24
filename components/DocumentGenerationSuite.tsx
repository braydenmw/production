import React, { useEffect, useMemo, useState } from 'react';
import { FileText, Download, Copy, CheckCircle, AlertCircle, DollarSign } from 'lucide-react';
import jsPDF from 'jspdf';
import { RefinedIntake, ReportData, ReportParameters } from '../types';
import { evaluateDocReadiness } from '../services/intakeMapping';
import { applyTemplateContext, createDefaultIntake, getMissingIntakeFields, StructuredDocumentIntake } from '../services/documentTemplateEngine';

type DocumentType = 'loi' | 'mou' | 'proposal' | 'executive-summary' | 'financial-model' | 'risk-assessment' | 'dossier' | 'comparison' | 'term-sheet' | 'investment-memo' | 'due-diligence-request' | 'business-intelligence-report' | 'partnership-analyzer' | 'stakeholder-analysis' | 'market-entry-strategy' | 'competitive-analysis' | 'operational-plan' | 'integration-plan' | 'entry-advisory' | 'cultural-brief' | 'blind-spot-audit';
type RewriteMode = 'formalize' | 'shorten' | 'legal-safe' | 'board-ready';

interface DocumentTemplate {
  id: DocumentType;
  title: string;
  description: string;
  icon: React.ReactNode;
  category: string;
  timeToGenerate: string;
}

interface DocumentGenerationSuiteProps {
  entityName?: string;
  targetPartnerName?: string;
  targetMarket?: string;
  dealValue?: number;
  reportData?: ReportData;
  reportParams?: ReportParameters;
  onDocumentGenerated?: (docType: DocumentType, content: string) => void;
}

const DocumentGenerationSuite: React.FC<DocumentGenerationSuiteProps> = ({
  entityName = 'Your Organization',
  targetPartnerName = 'Strategic Partner',
  targetMarket = 'Target Market',
  dealValue = 50000000,
  reportData,
  reportParams,
  onDocumentGenerated
}) => {
  const [selectedDocument, setSelectedDocument] = useState<DocumentType | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<string>('');
  const [exportFormat] = useState<'pdf' | 'docx'>('pdf');
  const [lengthPreset, setLengthPreset] = useState<'brief' | 'standard' | 'extended'>('standard');
  const [selectedDocsQueue, setSelectedDocsQueue] = useState<DocumentType[]>([]);
  const [generatedBatch, setGeneratedBatch] = useState<Array<{ id: DocumentType; title: string; content: string }>>([]);
  const [structuredIntake, setStructuredIntake] = useState<StructuredDocumentIntake>(createDefaultIntake());
  const [lastRewriteMode, setLastRewriteMode] = useState<RewriteMode | null>(null);
  const [rewriteBaseContent, setRewriteBaseContent] = useState<string>('');
  const [originalGeneratedContent, setOriginalGeneratedContent] = useState<string>('');
  const [rewriteHistory, setRewriteHistory] = useState<string[]>([]);
  const [rewriteHistoryIndex, setRewriteHistoryIndex] = useState(-1);
  const [showRedline, setShowRedline] = useState(false);
  const [shortcutToast, setShortcutToast] = useState<string>('');

  // Calculate decision deadline once to avoid impure function calls during render
  const [decisionDeadline] = useState(() => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString());

  // Build a minimal intake model from provided props for readiness evaluation
  const intake = useMemo<RefinedIntake>(() => ({
    identity: {
      entityName,
      registrationCountry: targetMarket,
      industryClassification: 'Partnership',
      yearsOperating: undefined,
    },
    mission: {
      strategicIntent: ['entry'],
      objectives: ['establish partnership'],
      timelineHorizon: '6-18m',
    },
    counterparties: targetPartnerName ? [{ name: targetPartnerName, country: targetMarket, relationshipStage: 'intro' }] : [],
    constraints: { budgetUSD: dealValue, riskTolerance: 'medium' },
    proof: { documents: [] },
    contacts: {},
  }), [entityName, targetPartnerName, targetMarket, dealValue]);

  const docReadiness = useMemo(() => evaluateDocReadiness(intake), [intake]);

  const documentTemplates: DocumentTemplate[] = [
    {
      id: 'loi',
      title: 'Letter of Intent',
      description: 'Non-binding expression of partnership interest with key terms and conditions',
      icon: <FileText className="w-6 h-6" />,
      category: 'Foundation',
      timeToGenerate: '< 2 min'
    },
    {
      id: 'mou',
      title: 'Memorandum of Understanding',
      description: 'Binding agreement on principles and expectations before full negotiation',
      icon: <FileText className="w-6 h-6" />,
      category: 'Foundation',
      timeToGenerate: '< 3 min'
    },
    {
      id: 'proposal',
      title: 'Partnership Proposal',
      description: 'Detailed value proposition and collaboration framework',
      icon: <FileText className="w-6 h-6" />,
      category: 'Strategic',
      timeToGenerate: '< 5 min'
    },
    {
      id: 'executive-summary',
      title: 'Executive Summary',
      description: '2-page strategic overview with recommendations and next steps',
      icon: <FileText className="w-6 h-6" />,
      category: 'Strategic',
      timeToGenerate: '< 2 min'
    },
    {
      id: 'financial-model',
      title: 'Financial Model',
      description: '5-year projections, ROI analysis, cash flow modeling',
      icon: <DollarSign className="w-6 h-6" />,
      category: 'Analysis',
      timeToGenerate: '< 4 min'
    },
    {
      id: 'risk-assessment',
      title: 'Risk Assessment Report',
      description: 'Comprehensive risk identification, mitigation, and contingency planning',
      icon: <AlertCircle className="w-6 h-6" />,
      category: 'Analysis',
      timeToGenerate: '< 3 min'
    },
    {
      id: 'blind-spot-audit',
      title: 'Blind Spot Audit',
      description: 'Explicitly surfaces hidden failure modes, sequencing gaps, and verification blind spots',
      icon: <AlertCircle className="w-6 h-6" />,
      category: 'Risk',
      timeToGenerate: '< 3 min'
    },
    {
      id: 'dossier',
      title: 'Full Market Dossier',
      description: 'Comprehensive 15-20 page document with all analysis and recommendations',
      icon: <FileText className="w-6 h-6" />,
      category: 'Comprehensive',
      timeToGenerate: '< 8 min'
    },
    {
      id: 'comparison',
      title: 'Partner Comparison Matrix',
      description: 'Side-by-side analysis of multiple partnership options',
      icon: <FileText className="w-6 h-6" />,
      category: 'Comparative',
      timeToGenerate: '< 3 min'
    },
    {
      id: 'term-sheet',
      title: 'Term Sheet',
      description: 'Outline of key deal terms and conditions for negotiation',
      icon: <FileText className="w-6 h-6" />,
      category: 'Foundation',
      timeToGenerate: '< 2 min'
    },
    {
      id: 'investment-memo',
      title: 'Investment Memo',
      description: 'Justification for capital investment with risk-return analysis',
      icon: <DollarSign className="w-6 h-6" />,
      category: 'Strategic',
      timeToGenerate: '< 4 min'
    },
    {
      id: 'due-diligence-request',
      title: 'Due Diligence Request',
      description: 'Comprehensive information request list for background verification',
      icon: <FileText className="w-6 h-6" />,
      category: 'Analysis',
      timeToGenerate: '< 3 min'
    },
    {
      id: 'business-intelligence-report',
      title: 'Business Intelligence Report',
      description: 'Market intelligence analysis with competitive insights',
      icon: <FileText className="w-6 h-6" />,
      category: 'Analysis',
      timeToGenerate: '< 5 min'
    },
    {
      id: 'partnership-analyzer',
      title: 'Partnership Analyzer',
      description: 'Analysis of existing partnership performance and opportunities',
      icon: <FileText className="w-6 h-6" />,
      category: 'Analysis',
      timeToGenerate: '< 4 min'
    },
    {
      id: 'stakeholder-analysis',
      title: 'Stakeholder Analysis',
      description: 'Mapping of interests, influence, and engagement strategies',
      icon: <FileText className="w-6 h-6" />,
      category: 'Strategic',
      timeToGenerate: '< 3 min'
    },
    {
      id: 'market-entry-strategy',
      title: 'Market Entry Strategy',
      description: 'Regional expansion plan with phased implementation',
      icon: <FileText className="w-6 h-6" />,
      category: 'Strategic',
      timeToGenerate: '< 5 min'
    },
    {
      id: 'competitive-analysis',
      title: 'Competitive Analysis',
      description: 'Market position assessment and competitive advantage framework',
      icon: <FileText className="w-6 h-6" />,
      category: 'Analysis',
      timeToGenerate: '< 4 min'
    },
    {
      id: 'operational-plan',
      title: 'Operational Plan',
      description: 'Implementation roadmap with timelines and milestones',
      icon: <FileText className="w-6 h-6" />,
      category: 'Strategic',
      timeToGenerate: '< 4 min'
    },
    {
      id: 'integration-plan',
      title: 'Integration Plan',
      description: 'Post-merger integration strategy and execution framework',
      icon: <FileText className="w-6 h-6" />,
      category: 'Strategic',
      timeToGenerate: '< 5 min'
    },
    {
      id: 'entry-advisory',
      title: 'Location Entry Advisory',
      description: 'Guidance for entering and operating in a target market before relocation or travel',
      icon: <FileText className="w-6 h-6" />,
      category: 'Strategic',
      timeToGenerate: '< 3 min'
    },
    {
      id: 'cultural-brief',
      title: 'Cultural Intelligence Brief',
      description: 'Practical norms, etiquette, negotiation styles, and regulatory culture overview',
      icon: <FileText className="w-6 h-6" />,
      category: 'Analysis',
      timeToGenerate: '< 2 min'
    }
  ];

  const requiredFields: Record<DocumentType, { label: string; present: boolean }[]> = {
    loi: [
      { label: 'Counterparty', present: Boolean(targetPartnerName) },
      { label: 'Jurisdiction', present: Boolean(targetMarket) },
      { label: 'Deal value', present: Boolean(dealValue) }
    ],
    mou: [
      { label: 'Counterparty', present: Boolean(targetPartnerName) },
      { label: 'Scope', present: Boolean(targetMarket) },
      { label: 'Governance', present: true }
    ],
    proposal: [
      { label: 'Objectives', present: true },
      { label: 'Counterparty', present: Boolean(targetPartnerName) },
      { label: 'Market', present: Boolean(targetMarket) }
    ],
    'executive-summary': [
      { label: 'Opportunity', present: Boolean(targetMarket) },
      { label: 'Ask/Value', present: Boolean(dealValue) }
    ],
    'financial-model': [
      { label: 'Deal value', present: Boolean(dealValue) },
      { label: 'Horizon', present: true },
      { label: 'Scenario set', present: true }
    ],
    'risk-assessment': [
      { label: 'Jurisdiction', present: Boolean(targetMarket) },
      { label: 'Counterparty', present: Boolean(targetPartnerName) }
    ],
    dossier: [
      { label: 'Market', present: Boolean(targetMarket) },
      { label: 'Partner', present: Boolean(targetPartnerName) },
      { label: 'Financials', present: Boolean(dealValue) }
    ],
    'blind-spot-audit': [
      { label: 'Market', present: Boolean(targetMarket) },
      { label: 'Counterparty', present: Boolean(targetPartnerName) },
      { label: 'Deal value', present: Boolean(dealValue) }
    ],
    comparison: [
      { label: 'Options listed', present: false },
      { label: 'Criteria', present: true }
    ],
    'term-sheet': [
      { label: 'Counterparty', present: Boolean(targetPartnerName) },
      { label: 'Deal value', present: Boolean(dealValue) },
      { label: 'Key terms', present: true }
    ],
    'investment-memo': [
      { label: 'Deal value', present: Boolean(dealValue) },
      { label: 'Thesis', present: Boolean(targetMarket) }
    ],
    'due-diligence-request': [
      { label: 'Counterparty', present: Boolean(targetPartnerName) },
      { label: 'Scope', present: true }
    ],
    'business-intelligence-report': [
      { label: 'Market', present: Boolean(targetMarket) },
      { label: 'Focus areas', present: true }
    ],
    'partnership-analyzer': [
      { label: 'Existing partner', present: Boolean(targetPartnerName) },
      { label: 'KPIs', present: true }
    ],
    'stakeholder-analysis': [
      { label: 'Stakeholder list', present: false },
      { label: 'Influence map', present: true }
    ],
    'market-entry-strategy': [
      { label: 'Market', present: Boolean(targetMarket) },
      { label: 'Timeline', present: true }
    ],
    'competitive-analysis': [
      { label: 'Competitor list', present: false },
      { label: 'Market', present: Boolean(targetMarket) }
    ],
    'operational-plan': [
      { label: 'Milestones', present: true },
      { label: 'Budget', present: Boolean(dealValue) }
    ],
    'integration-plan': [
      { label: 'Day 1 scope', present: true },
      { label: 'TSAs', present: false }
    ],
    'entry-advisory': [
      { label: 'Jurisdiction', present: Boolean(targetMarket) },
      { label: 'Counterparty', present: Boolean(targetPartnerName) },
      { label: 'Regulatory path', present: true }
    ],
    'cultural-brief': [
      { label: 'Jurisdiction', present: Boolean(targetMarket) },
      { label: 'Counterparty', present: Boolean(targetPartnerName) },
      { label: 'Local norms', present: true }
    ],
  };

  const recommendedDocs: DocumentType[] = useMemo(() => {
    const preferredOrder: DocumentType[] = ['executive-summary', 'entry-advisory', 'cultural-brief', 'loi', 'risk-assessment'];
    const readyFirst = preferredOrder.filter(d => docReadiness[d] === 'ready');
    const notReady = preferredOrder.filter(d => docReadiness[d] === 'missing-fields');
    return [...readyFirst, ...notReady];
  }, [docReadiness]);

  const getReadiness = (doc: DocumentType) => {
    const reqs = requiredFields[doc] || [];
    const missing = reqs.filter(r => !r.present).map(r => r.label);
    return { missing, isReady: missing.length === 0, requirements: reqs };
  };

  const blockerList = recommendedDocs
    .flatMap(doc => getReadiness(doc).missing.map(m => `${documentTemplates.find(d => d.id === doc)?.title || doc}: ${m}`))
    .filter(Boolean);

  const missingIntakeFields = useMemo(() => getMissingIntakeFields(structuredIntake), [structuredIntake]);
  const intakeReady = missingIntakeFields.length === 0;

  const adjustByLength = (text: string): string => {
    if (lengthPreset === 'brief') {
      // crude summarization by truncation for now
      const maxChars = 1200;
      return text.length > maxChars ? text.slice(0, maxChars) + '\n\n[...brief summary truncated...]' : text;
    }
    if (lengthPreset === 'extended') {
      return text + '\n\nAPPENDIX: Local Considerations\n* Workforce norms\n* Compliance checkpoints\n* Government touchpoints\n* Logistics & infrastructure notes\n\nAPPENDIX: Contacts & Checklists\n* Stakeholder map\n* Required certifications\n* First 90 days plan';
    }
    return text; // standard
  };

  const toggleDocQueue = (docType: DocumentType) => {
    setSelectedDocsQueue(prev => prev.includes(docType) ? prev.filter(d => d !== docType) : [...prev, docType]);
  };

  const clearRewriteState = () => {
    setLastRewriteMode(null);
    setRewriteBaseContent('');
    setShowRedline(false);
  };

  const closeGeneratedDocument = () => {
    setSelectedDocument(null);
    clearRewriteState();
    setOriginalGeneratedContent('');
    setRewriteHistory([]);
    setRewriteHistoryIndex(-1);
  };

  const generateDocument = async (docType: DocumentType) => {
    setSelectedDocument(docType);
    setIsGenerating(true);
    clearRewriteState();
    setOriginalGeneratedContent('');
    
    // Simulate generation time based on document complexity
    const generationTime = docType === 'dossier' ? 8000 : docType === 'financial-model' ? 4000 : 2500;
    
    await new Promise(r => setTimeout(r, generationTime));

    let content = '';

    switch (docType) {
      case 'loi':
        content = generateLOI();
        break;
      case 'mou':
        content = generateMOU();
        break;
      case 'proposal':
        content = generateProposal();
        break;
      case 'executive-summary':
        content = generateExecutiveSummary();
        break;
      case 'financial-model':
        content = generateFinancialModel();
        break;
      case 'risk-assessment':
        content = generateRiskAssessment();
        break;
      case 'blind-spot-audit':
        content = generateBlindSpotAudit();
        break;
      case 'dossier':
        content = generateDossier();
        break;
      case 'comparison':
        content = generateComparison();
        break;
      case 'term-sheet':
        content = generateTermSheet();
        break;
      case 'investment-memo':
        content = generateInvestmentMemo();
        break;
      case 'due-diligence-request':
        content = generateDueDiligenceRequest();
        break;
      case 'business-intelligence-report':
        content = generateBusinessIntelligenceReport();
        break;
      case 'partnership-analyzer':
        content = generatePartnershipAnalyzer();
        break;
      case 'stakeholder-analysis':
        content = generateStakeholderAnalysis();
        break;
      case 'market-entry-strategy':
        content = generateMarketEntryStrategy();
        break;
      case 'competitive-analysis':
        content = generateCompetitiveAnalysis();
        break;
      case 'operational-plan':
        content = generateOperationalPlan();
        break;
      case 'integration-plan':
        content = generateIntegrationPlan();
        break;
      case 'entry-advisory':
        content = generateEntryAdvisory();
        break;
      case 'cultural-brief':
        content = generateCulturalBrief();
        break;
    }

    const contextApplied = applyTemplateContext(content, structuredIntake, lengthPreset);
    const adjusted = adjustByLength(contextApplied);
    setGeneratedContent(adjusted);
    setOriginalGeneratedContent(adjusted);
    setRewriteHistory([adjusted]);
    setRewriteHistoryIndex(0);
    setIsGenerating(false);
    onDocumentGenerated?.(docType, contextApplied);
  };

  const generateSelectedBatch = async () => {
    if (selectedDocsQueue.length === 0) return;
    setIsGenerating(true);
    const batch: Array<{ id: DocumentType; title: string; content: string }> = [];
    for (const docType of selectedDocsQueue) {
      // Simulate time similar to single-generation
      const generationTime = docType === 'dossier' ? 8000 : docType === 'financial-model' ? 4000 : 2500;
      await new Promise(r => setTimeout(r, generationTime));
      let content = '';
      switch (docType) {
        case 'loi': content = generateLOI(); break;
        case 'mou': content = generateMOU(); break;
        case 'proposal': content = generateProposal(); break;
        case 'executive-summary': content = generateExecutiveSummary(); break;
        case 'financial-model': content = generateFinancialModel(); break;
        case 'risk-assessment': content = generateRiskAssessment(); break;
        case 'blind-spot-audit': content = generateBlindSpotAudit(); break;
        case 'dossier': content = generateDossier(); break;
        case 'comparison': content = generateComparison(); break;
        case 'term-sheet': content = generateTermSheet(); break;
        case 'investment-memo': content = generateInvestmentMemo(); break;
        case 'due-diligence-request': content = generateDueDiligenceRequest(); break;
        case 'business-intelligence-report': content = generateBusinessIntelligenceReport(); break;
        case 'partnership-analyzer': content = generatePartnershipAnalyzer(); break;
        case 'stakeholder-analysis': content = generateStakeholderAnalysis(); break;
        case 'market-entry-strategy': content = generateMarketEntryStrategy(); break;
        case 'competitive-analysis': content = generateCompetitiveAnalysis(); break;
        case 'operational-plan': content = generateOperationalPlan(); break;
        case 'integration-plan': content = generateIntegrationPlan(); break;
        case 'entry-advisory': content = generateEntryAdvisory(); break;
        case 'cultural-brief': content = generateCulturalBrief(); break;
      }
      const adjusted = adjustByLength(applyTemplateContext(content, structuredIntake, lengthPreset));
      batch.push({ id: docType, title: documentTemplates.find(d => d.id === docType)?.title || docType, content: adjusted });
    }
    setGeneratedBatch(batch);
    setIsGenerating(false);
    setSelectedDocument(null);
  };

  const generateLOI = () => `
LETTER OF INTENT

Date: ${new Date().toLocaleDateString()}

TO: ${targetPartnerName}

RE: Expression of Interest in Strategic Partnership

Dear [Partner Contact],

${entityName} is pleased to express its interest in exploring a strategic partnership with ${targetPartnerName} focused on market entry and expansion into ${targetMarket}.

PROPOSED PARTNERSHIP TERMS:
* Investment Amount: $${(dealValue / 1000000).toFixed(1)}M
* Timeline for Full Agreement: 90-180 days
* Governance Structure: Joint steering committee with quarterly reviews
* Equity Structure: To be negotiated (proposed range: 40-60%)

AREAS OF COLLABORATION:
1. Market Access & Distribution
2. Technology & Operational Transfer
3. Financial Structuring & Capital Deployment
4. Regulatory & Compliance Framework

NEXT STEPS:
We propose the following timeline:
- Week 1-2: Detailed business plan review
- Week 3-4: Due diligence initiation
- Week 5-8: Term sheet development
- Week 9-12: Full agreement negotiation

This Letter of Intent is non-binding except for confidentiality and exclusivity provisions (90-day exclusive negotiation period).

We look forward to building a mutually beneficial partnership.

Sincerely,
${entityName} Leadership
  `;

  const generateMOU = () => `
MEMORANDUM OF UNDERSTANDING

This Memorandum of Understanding ("MOU") is entered into as of ${new Date().toLocaleDateString()}, between ${entityName} ("Party A") and ${targetPartnerName} ("Party B").

RECITALS:
Whereas, Party A seeks to establish a strategic partnership in ${targetMarket};
Whereas, Party B possesses valuable market knowledge and operational capabilities;
NOW, THEREFORE, the parties agree as follows:

1. PURPOSE
The purpose of this partnership is to establish a profitable and sustainable business operation in ${targetMarket}, with projected annual revenue of $${(dealValue * 0.15 / 1000000).toFixed(1)}M within 18 months.

2. GOVERNANCE STRUCTURE
* Joint Steering Committee: Quarterly meetings, monthly calls
* Decision Authority: Decisions above $500K require both parties' approval
* Dispute Resolution: Negotiation → Mediation → Arbitration

3. FINANCIAL TERMS
* Total Investment: $${(dealValue / 1000000).toFixed(1)}M
* Funding Source: Party A responsible for 60%, Party B for 40%
* Profit Sharing: 50% to each party after cost recovery
* Payment Schedule: Quarterly based on milestones

4. TERM & TERMINATION
* Initial Term: 5 years with annual renewal options
* Termination: 180 days notice with cause; 360 days without cause
* Wind-down: 12-month orderly transition period

5. CONFIDENTIALITY & IP RIGHTS
All proprietary information remains confidential. IP developed jointly shall be shared equally.

6. REPRESENTATIONS & WARRANTIES
Each party represents that it has legal authority to enter into this agreement and commit resources as outlined.

BINDING PROVISIONS:
Sections 5 (Confidentiality) and 7 (Dispute Resolution) are binding.

TERM:
This MOU is effective for 120 days from signing, after which it expires unless extended in writing.

SIGNATURES:

For ${entityName}: ___________________________ Date: _______
For ${targetPartnerName}: ___________________________ Date: _______
  `;

  const generateProposal = () => `
STRATEGIC PARTNERSHIP PROPOSAL

Executive Overview:
This proposal outlines a comprehensive partnership framework for ${entityName} and ${targetPartnerName} to jointly capture market opportunities in ${targetMarket}.

MARKET OPPORTUNITY:
* Market Size: $${(dealValue * 8 / 1000000).toFixed(0)}B addressable
* Growth Rate: 12-15% CAGR (next 5 years)
* Entry Timing: Optimal window 12-18 months
* Competitive Position: First-mover advantage available

PROPOSED VALUE CREATION:
1. Market Entry: Accelerated access via ${targetPartnerName}'s network
2. Cost Optimization: Combined operations reduce costs by 20-25%
3. Technology Transfer: Integration of best practices from both entities
4. Revenue Synergies: Cross-selling opportunities worth $${(dealValue * 0.25 / 1000000).toFixed(1)}M annually

PHASED IMPLEMENTATION PLAN:
Phase 1 (Months 1-3): Legal setup, regulatory approvals, team assembly
Phase 2 (Months 4-9): Operations launch, pilot customer acquisition
Phase 3 (Months 10-18): Full-scale deployment, profitability target
Phase 4 (Year 2+): Scale and optimize, expand to adjacent markets

FINANCIAL PROJECTIONS:
Year 1: Revenue $${(dealValue * 0.15 / 1000000).toFixed(1)}M, EBITDA Margin -15% (investment phase)
Year 2: Revenue $${(dealValue * 0.35 / 1000000).toFixed(1)}M, EBITDA Margin 8%
Year 3: Revenue $${(dealValue * 0.65 / 1000000).toFixed(1)}M, EBITDA Margin 18%
Year 5: Revenue $${(dealValue / 1000000).toFixed(1)}M, EBITDA Margin 28%

INVESTMENT REQUIREMENTS:
* Capital Required: $${(dealValue / 1000000).toFixed(1)}M over 18 months
* Working Capital: $${(dealValue * 0.1 / 1000000).toFixed(1)}M ongoing
* Expected ROI: 35-40% over 5 years

RISK MITIGATION:
* Regulatory: Dedicated compliance team, government liaisons
* Market: Diversified customer base, long-term contracts
* Operational: Local management team with 10+ year experience
* Financial: Quarterly performance reviews with adjustment mechanisms

NEXT STEPS:
1. Steering committee kickoff meeting
2. Detailed business plan development
3. Due diligence process initiation
4. Term sheet negotiation and finalization
  `;

  const generateExecutiveSummary = () => `
EXECUTIVE SUMMARY: ${targetMarket} MARKET ENTRY STRATEGY

OPPORTUNITY:
${entityName} has identified a significant market entry opportunity in ${targetMarket} with ${targetPartnerName} as the preferred partner. This partnership positions us to capture $${(dealValue / 1000000).toFixed(1)}M in addressable demand over 5 years.

KEY METRICS:
* Market Size: $${(dealValue * 8 / 1000000).toFixed(0)}B
* Projected Market Share: 2-3% (5-year horizon)
* Entry Investment: $${(dealValue / 1000000).toFixed(1)}M
* Break-even Timeline: 24-30 months
* 5-Year ROI: 35-40%

STRATEGIC FIT:
✓ ${targetPartnerName} brings essential market access
✓ Combined entity creates competitive moat (cost leadership)
✓ Aligned growth objectives and timeline
✓ Complementary operational strengths

RISKS & MITIGATION:
1. Regulatory Changes → Government relations team + scenario planning
2. Market Adoption → Pilot program + customer contracts pre-signed
3. Operational Complexity → Experienced management team + board oversight
4. Currency Exposure → Hedging program + local financing

RECOMMENDATION:
PROCEED with partnership formation. Market timing is favorable, competitive positioning is strong, and financial returns justify the investment.

IMMEDIATE ACTIONS (Next 30 Days):
1. Form joint steering committee
2. Complete regulatory assessment
3. Negotiate term sheet
4. Secure board approvals (both sides)

DECISION DEADLINE: ${decisionDeadline}
  `;

  const generateFinancialModel = () => `
FINANCIAL MODEL: ${targetMarket} PARTNERSHIP

INCOME STATEMENT PROJECTIONS (5 Years):

Year 1:
Revenue: $${(dealValue * 0.15 / 1000000).toFixed(1)}M
COGS: $${(dealValue * 0.09 / 1000000).toFixed(1)}M (60%)
OpEx: $${(dealValue * 0.12 / 1000000).toFixed(1)}M
EBITDA: -$${(dealValue * 0.06 / 1000000).toFixed(1)}M (-40%)

Year 2:
Revenue: $${(dealValue * 0.35 / 1000000).toFixed(1)}M
COGS: $${(dealValue * 0.17 / 1000000).toFixed(1)}M (50%)
OpEx: $${(dealValue * 0.2 / 1000000).toFixed(1)}M
EBITDA: $${(dealValue * 0.028 / 1000000).toFixed(1)}M (8%)

Year 3:
Revenue: $${(dealValue * 0.65 / 1000000).toFixed(1)}M
COGS: $${(dealValue * 0.26 / 1000000).toFixed(1)}M (40%)
OpEx: $${(dealValue * 0.26 / 1000000).toFixed(1)}M
EBITDA: $${(dealValue * 0.117 / 1000000).toFixed(1)}M (18%)

Year 4-5: Continued growth at 25% annually, EBITDA margin expanding to 25-28%

CASH FLOW ANALYSIS:
* Operating CF Y1-Y2: Negative
* Operating CF Y3+: Strongly positive
* Cumulative CF Break-even: Month 28
* Free CF (5-year cumulative): $${(dealValue * 1.2 / 1000000).toFixed(1)}M

INVESTMENT REQUIREMENTS:
Phase 1 (Months 1-6): $${(dealValue * 0.35 / 1000000).toFixed(1)}M (CapEx + working capital)
Phase 2 (Months 7-12): $${(dealValue * 0.35 / 1000000).toFixed(1)}M (scaling)
Phase 3 (Months 13-24): $${(dealValue * 0.3 / 1000000).toFixed(1)}M (optimization)

RETURN METRICS:
* IRR (5-year): 38%
* MOIC: 3.2x
* Payback Period: 30 months
* Terminal Value (Year 5): $${(dealValue * 4 / 1000000).toFixed(1)}M

SENSITIVITY ANALYSIS:
Scenarios: Base, Bull, Bear
Base Case assumes 12% market growth, 2% market share capture
Bull Case (+25% revenue): 45% IRR
Bear Case (-20% revenue): 28% IRR
  `;

  const generateRiskAssessment = () => `
RISK ASSESSMENT & MITIGATION STRATEGY

IDENTIFIED RISKS & RESPONSES:

1. REGULATORY RISK (HIGH)
   Description: Government policy changes could alter market conditions
   Probability: 40%
   Impact: High ($${(dealValue * 0.2 / 1000000).toFixed(1)}M exposure)
   Mitigation:
   * Hire government relations firm with direct ministry contacts
   * Build 6-month policy buffer into timeline
   * Negotiate contract flexibility clauses
   * Establish regulatory steering committee (board + external advisors)

2. MARKET ADOPTION RISK (MEDIUM-HIGH)
   Description: Customer acceptance slower than projected
   Probability: 35%
   Impact: High ($${(dealValue * 0.15 / 1000000).toFixed(1)}M revenue impact)
   Mitigation:
   * Launch pilot program with 5-10 anchor customers pre-signed
   * Conduct monthly market feedback surveys
   * Maintain flexible pricing strategy for first 18 months
   * Build brand awareness program ($2-3M marketing budget)

3. OPERATIONAL COMPLEXITY (MEDIUM)
   Description: Integration challenges with existing operations
   Probability: 45%
   Impact: Medium ($${(dealValue * 0.08 / 1000000).toFixed(1)}M cost overrun)
   Mitigation:
   * Hire integration management office (IMO) early
   * Develop detailed 100-day plan for each operational area
   * Establish KPIs with monthly tracking
   * Implement change management program

4. CURRENCY & FINANCIAL RISK (MEDIUM)
   Description: Exchange rate volatility, interest rate changes
   Probability: 60%
   Impact: Medium ($${(dealValue * 0.05 / 1000000).toFixed(1)}M impact)
   Mitigation:
   * Implement 12-month forward currency hedge
   * Structure financing with local currency borrowing
   * Monitor and rehedge quarterly
   * Maintain 15% contingency reserve

5. PARTNERSHIP DISSOLUTION RISK (MEDIUM-LOW)
   Description: Partnership breakdown due to disagreements
   Probability: 20%
   Impact: Very High ($${(dealValue / 1000000).toFixed(1)}M exit costs)
   Mitigation:
   * Clear governance structure with dispute resolution process
   * Quarterly alignment meetings at executive level
   * Define decision rights matrix upfront
   * Structure exit scenarios in original MOU

OVERALL RISK RATING: MEDIUM (with proper mitigation)
Recommendation: Proceed with risk management framework in place
  `;

  const generateBlindSpotAudit = () => {
    const indices = reportData?.computedIntelligence?.advancedIndices;
    const seq = indices?.seq?.score ?? 62;
    const fms = indices?.fms?.score ?? 58;
    const dcs = indices?.dcs?.score ?? 55;
    const dqs = indices?.dqs?.score ?? 60;
    const gcs = indices?.gcs?.score ?? 57;

    const gapFlags: string[] = [];
    if (!targetPartnerName) gapFlags.push('Counterparty identity not fully validated.');
    if (!targetMarket) gapFlags.push('Jurisdiction not specified for regulatory timing analysis.');
    if (!reportParams?.milestonePlan) gapFlags.push('Milestone sequencing not documented.');
    if (!reportParams?.cashFlowTiming) gapFlags.push('Cashflow timing not mapped to capex/opex.');
    if (!reportParams?.complianceEvidence) gapFlags.push('Compliance evidence missing or unverified.');
    if (!reportParams?.governanceModels?.length) gapFlags.push('Governance structure not documented.');
    if (!reportParams?.ingestedDocuments?.length) gapFlags.push('Low evidence coverage for claims.');

    const gapSummary = gapFlags.length ? gapFlags : ['No critical blind spots flagged with current inputs.'];

    return `
BLIND SPOT AUDIT

Prepared for: ${entityName}
Target Market: ${targetMarket}
Counterparty: ${targetPartnerName}
Date: ${new Date().toLocaleDateString()}

EXECUTIVE SUMMARY:
This audit surfaces hidden failure modes, sequencing gaps, verification risks, and timing drift that most reports ignore. It uses unbiased formulas grounded in real-world execution patterns across global industries.

CORE FORMULAS (UNBIASED):
* SEQ (Sequencing Integrity): dependency order + gate completeness - acceleration penalty
* FMS (Funding Match Score): revenue timing / (capex + opex burn)
* DCS (Dependency Concentration): 100 - single-point dependency concentration
* DQS (Data Quality Score): 0.5*coverage + 0.25*freshness + 0.25*verifiability
* GCS (Governance Clarity): (decision rights + exit clarity) / 2

BLIND SPOT SCORES:
* SEQ: ${seq}/100
* FMS: ${fms}/100
* DCS: ${dcs}/100
* DQS: ${dqs}/100
* GCS: ${gcs}/100

PRIMARY BLIND SPOTS IDENTIFIED:
${gapSummary.map(gap => `* ${gap}`).join('\n')}

WHAT OTHERS MISS (AND THIS FLAGS):
* Regulatory friction & approval timing drift
* Mis-sequenced execution dependencies
* Financing mismatch between cashflow and capex/opex timing
* Counterparty integrity and verification gaps
* Hidden single-point dependencies
* Operational capacity gaps
* Market-entry timing windows (policy cycles, elections, budget approvals)
* Supply chain fragility
* Contract structure weakness (decision rights, exit clauses)
* Data confidence gaps and unverifiable inputs

RECOMMENDED ACTIONS:
1. Lock sequencing with hard dependency gates and stage-gated approvals.
2. Align funding tranches to cashflow timing; maintain reserves for timing drift.
3. Expand verification signals (KYC, adverse media, beneficial ownership checks).
4. Diversify suppliers/approvals to remove single-point failures.
5. Document governance decision rights and exit clauses before commitment.
6. Refresh data sources and expand evidence coverage before signing.

NOTE:
Scores will update as more verified inputs are supplied. This audit is intentionally conservative to protect against hidden downside.
`;
  };

  const generateDossier = () => `
COMPREHENSIVE MARKET ENTRY DOSSIER
${targetMarket} Partnership with ${targetPartnerName}

EXECUTIVE SUMMARY:
This 15-page dossier provides comprehensive analysis of the proposed partnership between ${entityName} and ${targetPartnerName} for market entry into ${targetMarket}. The opportunity represents a $${(dealValue * 8 / 1000000).toFixed(0)}B addressable market with favorable competitive positioning and strong financial returns.

RECOMMENDATION: PROCEED with Phase 1 implementation

-----------------------------------------------------------

SECTION 1: MARKET ANALYSIS

Market Size & Growth:
* Total Addressable Market (TAM): $${(dealValue * 8 / 1000000).toFixed(0)}B
* Serviceable Addressable Market (SAM): $${(dealValue * 2 / 1000000).toFixed(1)}B
* CAGR (2025-2030): 12-15%
* Regional Growth Drivers: Urbanization, digital adoption, policy support

Competitive Landscape:
* 3-4 major players with 60% market share
* 15-20 mid-sized competitors with 30% share
* 50+ small/emerging players with 10% share
* Clear opportunity for consolidator / fast-mover advantage

Entry Barriers & Advantages:
* Regulatory approval: 6-12 months (manageable)
* Capital requirement: $${(dealValue / 1000000).toFixed(1)}M (achievable)
* Talent availability: Good (tech talent abundant)
* Partner access: CRITICAL - ${targetPartnerName} provides 60% of value

-----------------------------------------------------------

SECTION 2: PARTNERSHIP STRUCTURE

Partner Fit Analysis:
* Market access: Score 9/10 (established relationships with key customers)
* Operational capability: Score 8/10 (proven track record)
* Financial strength: Score 8/10 (can co-invest $${(dealValue * 0.4 / 1000000).toFixed(1)}M)
* Cultural alignment: Score 8/10 (similar business values)
* OVERALL FIT: 8.25/10 - STRONG

Governance Model:
* Joint Steering Committee (monthly)
* Executive sponsor from each organization (weekly check-ins)
* Finance subcommittee (monthly budget review)
* Operations subcommittee (weekly operational updates)
* Escalation path for disputes (CEO → Board)

Financial Terms:
* Investment: $${(dealValue / 1000000).toFixed(1)}M total ($${(dealValue * 0.6 / 1000000).toFixed(1)}M from ${entityName}, $${(dealValue * 0.4 / 1000000).toFixed(1)}M from ${targetPartnerName})
* Equity split: 60/40
* Profit distribution: 50/50 after capital recovery
* Dividend policy: Annual, reinvest first 2 years

-----------------------------------------------------------

SECTION 3: FINANCIAL PROJECTIONS

5-Year Revenue & EBITDA:
Year 1: $${(dealValue * 0.15 / 1000000).toFixed(1)}M revenue, -40% EBITDA margin
Year 2: $${(dealValue * 0.35 / 1000000).toFixed(1)}M revenue, 8% EBITDA margin
Year 3: $${(dealValue * 0.65 / 1000000).toFixed(1)}M revenue, 18% EBITDA margin
Year 4: $${(dealValue * 0.85 / 1000000).toFixed(1)}M revenue, 24% EBITDA margin
Year 5: $${(dealValue / 1000000).toFixed(1)}M revenue, 28% EBITDA margin

Investment Returns:
* IRR: 38% (5-year)
* MOIC: 3.2x
* Break-even: Month 28
* Terminal Value: $${(dealValue * 4 / 1000000).toFixed(1)}M (at 8x EBITDA multiple)

Cash Flow Profile:
* Cumulative investment: $${(dealValue / 1000000).toFixed(1)}M
* Cumulative cash return (5-yr): $${(dealValue * 1.2 / 1000000).toFixed(1)}M
* Cash breakeven: Month 28
* Positive cumulative CF from Year 3 onward

-----------------------------------------------------------

SECTION 4: RISKS & MITIGATION

Top 5 Risks:
1. Regulatory changes (40% probability) — Mitigation: Policy monitoring team
2. Market adoption slower than expected (35%) — Pilot program with locked-in contracts
3. Operational integration challenges (45%) — Integration management office
4. Currency volatility (60%) — 12-month forward hedge
5. Partnership dynamics (20%) — Clear governance structure

Overall Risk Rating: MEDIUM (manageable with proper frameworks)

-----------------------------------------------------------

SECTION 5: IMPLEMENTATION ROADMAP

Immediate (Days 1-30):
* Steering committee kick-off
* Regulatory roadmap finalized
* Team structure and hiring plan approved
* 100-day detailed plan for each function

Short-term (Months 1-3):
* Legal entity formation
* Regulatory approvals submitted
* Core team assembled (20-25 people)
* Pilot customer discussions initiated

Medium-term (Months 4-9):
* Operations launch
* Product/service customization
* Marketing campaign rollout
* Pilot customer onboarding

Long-term (Months 10-18):
* Scale to full operations
* Profitability target achieved
* Market expansion phase begins

-----------------------------------------------------------

SECTION 6: DECISION FRAMEWORK

Go/No-Go Criteria:
✓ Partnership fit score > 8.0 (ACHIEVED: 8.25)
✓ IRR projection > 30% (ACHIEVED: 38%)
✓ Market growth rate > 10% (ACHIEVED: 12-15%)
✓ Regulatory path clarity > 70% (ACHIEVED: 80%)
✓ Partner financial strength confirmed (ACHIEVED)

Recommendation: ALL CRITERIA MET - PROCEED TO PHASE 1

DECISION DEADLINE: ${decisionDeadline}

-----------------------------------------------------------

Next Steps:
1. Board approval from both organizations
2. Detailed term sheet negotiation (2-3 weeks)
3. Legal documentation finalization (3-4 weeks)
4. Regulatory filing submission (Week 6)
5. Partnership formation and team assembly (ongoing)
  `;

  const generateComparison = () => `
PARTNER COMPARISON MATRIX

${entityName} is evaluating three potential partnership options for ${targetMarket} market entry.

a"OE - a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"
a"' Criteria            a"' ${targetPartnerName}        a"' Alternative A    a"' Alternative B    a"'
a"oe - a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"1/4 - a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"1/4 - a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"1/4 - a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"
a"' Market Access       a"' 9/10             a"' 7/10             a"' 5/10             a"'
a"' Financial Strength  a"' 8/10             a"' 9/10             a"' 6/10             a"'
a"' Technical Capabilitya"' 8/10             a"' 8/10             a"' 9/10             a"'
a"' Cultural Fit        a"' 8/10             a"' 6/10             a"' 7/10             a"'
a"' Investment Capacity a"' $${(dealValue * 0.4 / 1000000).toFixed(1)}M        a"' $${(dealValue * 0.3 / 1000000).toFixed(1)}M        a"' $${(dealValue * 0.5 / 1000000).toFixed(1)}M        a"'
a"' Timeline Agreement  a"' 18-24 months     a"' 24-30 months     a"' 12-18 months     a"'
a"' Governance Clarity  a"' 8/10             a"' 6/10             a"' 7/10             a"'
a"oe - a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"1/4 - a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"1/4 - a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"1/4 - a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"
a"' OVERALL SCORE       a"' 8.25/10 ✓        a"' 7.29/10          a"' 7.14/10          a"'
a"' RECOMMENDATION      a"' PRIMARY CHOICE   a"' BACKUP OPTION    a"' LAST RESORT       a"'
a""a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"'a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"'a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"'a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"a"~

FINANCIAL COMPARISON:

Projected Year 5 Revenue:
${targetPartnerName}: $${(dealValue / 1000000).toFixed(1)}M
Alternative A: $${(dealValue * 0.8 / 1000000).toFixed(1)}M (slower go-to-market)
Alternative B: $${(dealValue * 1.1 / 1000000).toFixed(1)}M (aggressive but risky)

5-Year ROI:
${targetPartnerName}: 38% IRR, 3.2x MOIC
Alternative A: 32% IRR, 2.6x MOIC
Alternative B: 42% IRR, 3.8x MOIC (but 45% failure risk)

Risk-Adjusted Return:
${targetPartnerName}: 36% (38% A -  95% confidence)
Alternative A: 29% (32% A -  90% confidence)
Alternative B: 23% (42% A -  55% confidence)

CONCLUSION:
${targetPartnerName} offers the optimal balance of:
* Market access and customer relationships (9/10)
* Financial stability and commitment (8/10)
* Realistic timelines and achievable milestones
* Lowest risk-adjusted downside risk

RECOMMENDATION: Proceed with ${targetPartnerName} as primary partner.
Establish backup discussions with Alternative A (contingency planning).
  `;

  const generateTermSheet = () => `
TERM SHEET

${entityName} - ${targetPartnerName} Strategic Partnership

Date: ${new Date().toLocaleDateString()}

PARTIES:
* ${entityName} ("Company A")
* ${targetPartnerName} ("Company B")

TRANSACTION OVERVIEW:
Company A and Company B intend to form a strategic partnership for market entry and expansion in ${targetMarket}, with total committed capital of $${(dealValue / 1000000).toFixed(1)}M.

KEY ECONOMIC TERMS:
* Total Investment: $${(dealValue / 1000000).toFixed(1)}M
* Equity Split: 60% Company A / 40% Company B
* Profit Sharing: Pro-rata based on equity ownership
* Dividend Policy: Annual distributions after debt service
* Exit Rights: Tag-along/drag-along rights for majority shareholder

GOVERNANCE:
* Board Composition: 5 members (3 from Company A, 2 from Company B)
* CEO: Appointed by Company A
* CFO: Appointed by Company B
* Decision Rights: Unanimous approval for investments >$1M
* Reporting: Monthly financials, quarterly board meetings

CONDITIONS PRECEDENT:
* Satisfactory due diligence completion
* Regulatory approvals obtained
* Definitive agreements executed within 90 days
* Financing commitments secured

TIMELINE:
* Due Diligence: 30 days
* Definitive Agreements: 60 days
* Closing: 90 days from term sheet execution

This term sheet is non-binding and subject to definitive agreements.
  `;

  const generateInvestmentMemo = () => `
INVESTMENT MEMO

TO: Investment Committee
FROM: Strategic Partnerships Team
DATE: ${new Date().toLocaleDateString()}
SUBJECT: Investment in ${targetPartnerName} Partnership - ${targetMarket} Market Entry

EXECUTIVE SUMMARY:
We recommend proceeding with a $${(dealValue / 1000000).toFixed(1)}M investment in a strategic partnership with ${targetPartnerName} for ${targetMarket} market entry. The opportunity presents a compelling risk-adjusted return profile with 38% IRR and 3.2x MOIC over 5 years.

INVESTMENT THESIS:
* Market Opportunity: $${(dealValue * 8 / 1000000).toFixed(0)}B addressable market with 12-15% CAGR
* Competitive Advantage: First-mover positioning through ${targetPartnerName}'s established relationships
* Value Creation: Revenue synergies of $${(dealValue * 0.25 / 1000000).toFixed(1)}M annually through cross-selling
* Risk Mitigation: Diversified customer base and long-term contracts

FINANCIAL PROJECTIONS:
Year 1: Revenue $${(dealValue * 0.15 / 1000000).toFixed(1)}M, EBITDA -40%
Year 2: Revenue $${(dealValue * 0.35 / 1000000).toFixed(1)}M, EBITDA 8%
Year 3: Revenue $${(dealValue * 0.65 / 1000000).toFixed(1)}M, EBITDA 18%
Year 5: Revenue $${(dealValue / 1000000).toFixed(1)}M, EBITDA 28%

RETURN METRICS:
* IRR: 38%
* Payback Period: 30 months
* Terminal Value: $${(dealValue * 4 / 1000000).toFixed(1)}M (8x EBITDA exit multiple)

RISKS & MITIGATIONS:
1. Regulatory Risk: Government relations team + 6-month buffer
2. Market Adoption: Pilot program with pre-signed contracts
3. Operational Integration: Experienced management team
4. Currency Volatility: Hedging program

RECOMMENDATION:
APPROVE investment subject to due diligence completion and final term negotiation.

REQUIRED APPROVALS:
* Investment Committee: Required
* Board of Directors: Required for investments >$25M
* Legal/Compliance: Satisfactory due diligence
  `;

  const generateDueDiligenceRequest = () => `
DUE DILIGENCE REQUEST LIST

${entityName} Due Diligence Questionnaire for ${targetPartnerName}

Date: ${new Date().toLocaleDateString()}

CONFIDENTIAL - For Authorized Personnel Only

LEGAL & CORPORATE:
1. Certificate of Incorporation and bylaws
2. Articles of Organization/Association
3. List of directors, officers, and key management
4. Ownership structure and shareholder agreements
5. Recent annual reports and financial statements (3 years)
6. Legal proceedings (past 5 years)
7. Regulatory licenses and compliance certificates
8. Intellectual property portfolio summary

FINANCIAL:
9. Audited financial statements (3 years)
10. Tax returns (3 years)
11. Debt schedule and financing agreements
12. Accounts receivable aging
13. Inventory valuation methods
14. Fixed asset register
15. Pension and benefit plan summaries
16. Related party transaction disclosures

OPERATIONAL:
17. Organization chart
18. Key customer contracts (top 10)
19. Key supplier agreements
20. Manufacturing/process flow diagrams
21. Quality control procedures
22. IT systems and data security policies
23. Environmental compliance records
24. Insurance coverage summary

MARKET & COMPETITIVE:
25. Market share data and analysis
26. Competitive positioning analysis
27. Customer concentration analysis
28. SWOT analysis
29. Growth strategy documents
30. R&D pipeline summary

Please provide all requested documents within 14 days of this request.
Contact: [Your Name] - [Your Email] - [Your Phone]
  `;

  const generateBusinessIntelligenceReport = () => `
BUSINESS INTELLIGENCE REPORT: ${targetMarket} MARKET ANALYSIS

Prepared by: ${entityName} Intelligence Team
Date: ${new Date().toLocaleDateString()}

EXECUTIVE SUMMARY:
This report provides comprehensive market intelligence on ${targetMarket}, supporting the strategic partnership evaluation with ${targetPartnerName}. The market represents a $${(dealValue * 8 / 1000000).toFixed(0)}B opportunity with favorable entry conditions.

MARKET OVERVIEW:
* Total Addressable Market (TAM): $${(dealValue * 8 / 1000000).toFixed(0)}B
* Serviceable Addressable Market (SAM): $${(dealValue * 2 / 1000000).toFixed(1)}B
* Compound Annual Growth Rate (CAGR): 12-15%
* Key Growth Drivers: Urbanization, digital adoption, regulatory support

COMPETITIVE LANDSCAPE:
* Market Leaders: 3 major players controlling 60% market share
* Mid-tier Competitors: 15-20 companies with 30% share
* Emerging Players: 50+ small entities with 10% share
* Barriers to Entry: Regulatory approval (6-12 months), capital requirements ($${dealValue / 1000000}M), talent availability

CUSTOMER ANALYSIS:
* Primary Segments: Enterprise clients (60%), mid-market (30%), SMB (10%)
* Buying Behavior: Relationship-driven, long sales cycles (6-12 months)
* Key Decision Criteria: Price (40%), quality (30%), service (20%), brand (10%)
* Customer Concentration: Top 10 customers represent 45% of market revenue

TECHNOLOGY TRENDS:
* Digital Transformation: 70% of customers planning major IT investments
* Cloud Adoption: Expected to reach 85% penetration by 2026
* AI/ML Integration: Growing demand for intelligent solutions
* Cybersecurity: Increasing focus on data protection and compliance

REGULATORY ENVIRONMENT:
* Key Regulations: Data protection laws, industry-specific licensing
* Approval Timeline: 6-12 months for foreign investment
* Compliance Requirements: Local content rules, employment quotas
* Political Risk: Moderate, with stable government policies

ENTRY STRATEGY RECOMMENDATIONS:
1. Partner with established local entity (${targetPartnerName})
2. Focus on high-growth segments with less competition
3. Invest in local talent development and training
4. Build relationships with key government stakeholders
5. Develop phased market entry with pilot programs

CONCLUSION:
The ${targetMarket} market presents a strong investment opportunity with manageable risks. Partnership with ${targetPartnerName} provides optimal market access and competitive positioning.
  `;

  const generatePartnershipAnalyzer = () => `
PARTNERSHIP PERFORMANCE ANALYSIS

${entityName} - ${targetPartnerName} Partnership Review

Date: ${new Date().toLocaleDateString()}

PARTNERSHIP OVERVIEW:
This analysis evaluates the existing partnership framework between ${entityName} and ${targetPartnerName} for ${targetMarket} market entry, assessing performance, synergies, and future opportunities.

CURRENT PERFORMANCE METRICS:
* Revenue Contribution: $${(dealValue * 0.15 / 1000000).toFixed(1)}M (Year 1 actual)
* Market Share Achieved: 2.1% (target: 2-3%)
* Customer Acquisition: 45 new clients (target: 50)
* Operational Efficiency: 15% cost savings realized
* Partnership Satisfaction: 8.5/10 (both parties)

STRENGTHS:
✓ Strong market access through ${targetPartnerName}'s network
✓ Complementary technical capabilities
✓ Shared risk appetite and growth objectives
✓ Effective governance structure with quarterly reviews
✓ Cultural alignment and communication

AREAS FOR IMPROVEMENT:
as  Customer onboarding process needs streamlining
as  Technology integration behind schedule
as  Profit sharing mechanism requires refinement
as  Geographic expansion planning incomplete

FINANCIAL ANALYSIS:
* Investment Deployed: $${(dealValue * 0.35 / 1000000).toFixed(1)}M
* Revenue Generated: $${(dealValue * 0.15 / 1000000).toFixed(1)}M
* EBITDA Margin: -40% (as expected for investment phase)
* ROI to Date: -25% (on track for 38% IRR target)
* Cash Flow: Negative (funding ongoing expansion)

STRATEGIC OPPORTUNITIES:
1. Adjacent Market Expansion: Leverage existing infrastructure
2. Product Line Extension: Cross-selling opportunities
3. Technology Partnership: Joint R&D initiatives
4. International Growth: Regional expansion planning

RISKS & MITIGATIONS:
* Partnership Dynamics: Regular alignment meetings
* Market Changes: Flexible business model
* Regulatory Shifts: Dedicated compliance team
* Competitive Pressure: Continuous innovation

RECOMMENDATIONS:
1. Accelerate technology integration (target: 3 months)
2. Expand customer acquisition team (additional 10 hires)
3. Negotiate revised profit sharing terms
4. Develop 5-year strategic roadmap
5. Increase marketing investment by 20%

OVERALL ASSESSMENT: STRONG FOUNDATION with clear path to value creation.
  `;

  const generateStakeholderAnalysis = () => `
STAKEHOLDER ANALYSIS & ENGAGEMENT PLAN

${entityName} - ${targetMarket} Partnership Initiative

Date: ${new Date().toLocaleDateString()}

STAKEHOLDER MAPPING:

HIGH INFLUENCE / HIGH INTEREST:
* ${targetPartnerName} Executive Team: Critical partner, direct involvement
 - Interest: Mutual value creation, strategic alignment
 - Influence: High (decision-making authority)
 - Engagement: Weekly calls, monthly meetings

* Government Regulators: Key approvals required
 - Interest: Economic development, job creation
 - Influence: High (licensing and compliance)
 - Engagement: Quarterly briefings, policy advocacy

* Key Customers: Revenue drivers
 - Interest: Product quality, service reliability
 - Influence: Medium (market validation)
 - Engagement: Customer advisory board, satisfaction surveys

HIGH INFLUENCE / LOW INTEREST:
* Industry Associations: Regulatory influence
 - Interest: Industry standards, advocacy
 - Influence: High (policy recommendations)
 - Engagement: Membership, conference participation

* Local Banks: Financing partners
 - Interest: Loan portfolio growth, relationship banking
 - Influence: Medium-High (financing availability)
 - Engagement: Credit committee presentations

LOW INFLUENCE / HIGH INTEREST:
* Local Community: Social license to operate
 - Interest: Employment opportunities, community development
 - Influence: Low-Medium (public opinion)
 - Engagement: CSR programs, community outreach

* Employees: Internal stakeholders
 - Interest: Job security, career development
 - Influence: Low (operational execution)
 - Engagement: Town halls, internal communications

ENGAGEMENT STRATEGY:
1. Communication Plan: Monthly newsletters, quarterly town halls
2. Influence Strategy: Build coalitions with key decision-makers
3. Risk Mitigation: Monitor stakeholder sentiment regularly
4. Value Creation: Ensure all stakeholders see clear benefits

MONITORING & MEASUREMENT:
* Stakeholder satisfaction surveys (quarterly)
* Media monitoring and sentiment analysis
* Regulatory compliance tracking
* Partnership performance metrics

CONCLUSION:
Successful stakeholder management is critical for partnership success. Focus on high-influence stakeholders while maintaining positive relationships with all parties.
  `;

  const generateMarketEntryStrategy = () => `
MARKET ENTRY STRATEGY: ${targetMarket}

${entityName} Expansion Plan

Date: ${new Date().toLocaleDateString()}

EXECUTIVE SUMMARY:
This strategy outlines a comprehensive approach for ${entityName} to enter ${targetMarket} through partnership with ${targetPartnerName}. The plan focuses on sustainable growth, risk mitigation, and value creation over a 5-year horizon.

MARKET ASSESSMENT:
* Market Size: $${(dealValue * 8 / 1000000).toFixed(0)}B TAM
* Growth Rate: 12-15% CAGR
* Competitive Intensity: Moderate (consolidation opportunity)
* Entry Barriers: Regulatory (6-12 months), capital ($${dealValue / 1000000}M), relationships

STRATEGIC OBJECTIVES:
1. Achieve 2-3% market share within 5 years
2. Establish profitable operations by Year 3
3. Build sustainable competitive advantages
4. Create platform for regional expansion

ENTRY APPROACH: STRATEGIC PARTNERSHIP
* Partner: ${targetPartnerName} (market leader in distribution)
* Investment: $${(dealValue / 1000000).toFixed(1)}M total capital
* Ownership: 60% ${entityName} / 40% ${targetPartnerName}
* Governance: Joint steering committee

PHASED IMPLEMENTATION:

PHASE 1: FOUNDATION (Months 1-6)
* Legal entity formation and regulatory approvals
* Core team recruitment (20-25 local hires)
* Office establishment and infrastructure setup
* Partnership agreement finalization
* Initial market research and customer identification

PHASE 2: MARKET PENETRATION (Months 7-18)
* Product localization and customization
* Pilot customer acquisition (5-10 anchor clients)
* Sales and marketing team expansion
* Operational processes implementation
* Performance monitoring systems deployment

PHASE 3: SCALE & OPTIMIZE (Months 19-36)
* Full market launch across all segments
* Revenue growth acceleration
* Cost optimization and efficiency improvements
* Additional market segment expansion
* Profitability target achievement

PHASE 4: LEADERSHIP & EXPANSION (Months 37-60)
* Market leadership position consolidation
* Regional expansion planning
* New product development
* Strategic acquisitions evaluation
* IPO or exit preparation

RISK MANAGEMENT:
* Regulatory: Dedicated government relations team
* Market: Pilot program with guaranteed contracts
* Operational: Experienced local management
* Financial: Conservative cash flow projections

SUCCESS METRICS:
* Year 1: Market presence established, first revenues
* Year 2: Break-even achieved, customer base of 50
* Year 3: Profitable operations, 1% market share
* Year 5: 2-3% market share, industry leadership position

RESOURCE REQUIREMENTS:
* Capital: $${(dealValue / 1000000).toFixed(1)}M investment
* Personnel: 75-100 full-time employees
* Technology: ERP, CRM, and industry-specific software
* Facilities: Office space, warehouse, showroom

CONCLUSION:
This market entry strategy provides a structured path to success in ${targetMarket} with manageable risks and attractive financial returns. The partnership with ${targetPartnerName} is critical to execution success.
  `;

  const generateCompetitiveAnalysis = () => `
COMPETITIVE ANALYSIS: ${targetMarket} MARKET

${entityName} Competitive Positioning Assessment

Date: ${new Date().toLocaleDateString()}

MARKET STRUCTURE:
The ${targetMarket} market is moderately concentrated with clear opportunities for new entrants. Current landscape features 3 major players controlling 60% market share, 15-20 mid-tier competitors holding 30%, and 50+ small/emerging players with the remaining 10%.

KEY COMPETITORS:

MAJOR PLAYERS:
1. Market Leader Inc.
  - Market Share: 35%
  - Strengths: Brand recognition, distribution network, financial resources
  - Weaknesses: High cost structure, slow innovation
  - Strategy: Market dominance through scale

2. TechCorp Solutions
  - Market Share: 15%
  - Strengths: Technology leadership, R&D investment
  - Weaknesses: Limited distribution, regional focus
  - Strategy: Innovation-driven growth

3. Global Enterprises
  - Market Share: 10%
  - Strengths: International presence, diversified portfolio
  - Weaknesses: Complex organization, integration challenges
  - Strategy: Global expansion

MID-TIER COMPETITORS:
* Regional Player A: Strong local relationships, limited scalability
* Regional Player B: Cost leadership, quality concerns
* Regional Player C: Niche focus, growth potential

COMPETITIVE ADVANTAGES:
Through partnership with ${targetPartnerName}, ${entityName} can leverage:

1. MARKET ACCESS: Established distribution channels and customer relationships
2. TECHNOLOGICAL EDGE: Superior product capabilities and innovation pipeline
3. FINANCIAL STRENGTH: Deep capital resources for investment and marketing
4. GLOBAL EXPERTISE: Best practices from international operations
5. SPEED TO MARKET: Accelerated entry through partnership

THREAT ANALYSIS:
* New Entrants: Moderate barrier (regulatory, capital requirements)
* Substitute Products: Low threat (limited alternatives available)
* Supplier Power: Medium (key component availability)
* Buyer Power: High (price-sensitive customers, consolidation)
* Competitive Rivalry: High (price competition, feature differentiation)

STRATEGIC POSITIONING:
${entityName} should position as:
* Quality Leader: Premium pricing, superior service
* Innovation Driver: Technology differentiation
* Partnership Expert: Ecosystem approach to value creation

COMPETITIVE RESPONSE STRATEGIES:
1. Monitor competitor pricing and promotions
2. Accelerate product development cycles
3. Build customer loyalty programs
4. Invest in marketing and brand awareness
5. Develop strategic partnerships and alliances

MARKET OPPORTUNITIES:
* Consolidation: Acquire smaller competitors for market share
* Niche Markets: Target underserved segments
* Technology Gaps: Address customer pain points with innovation
* Geographic Expansion: Follow customer migration patterns

CONCLUSION:
The competitive landscape presents both challenges and opportunities. Through strategic partnership and focused execution, ${entityName} can establish a strong market position and drive sustainable growth.
  `;

  const generateOperationalPlan = () => `
OPERATIONAL PLAN: ${targetMarket} PARTNERSHIP

${entityName} Implementation Roadmap

Date: ${new Date().toLocaleDateString()}

EXECUTIVE SUMMARY:
This operational plan outlines the implementation framework for ${entityName}'s partnership with ${targetPartnerName} in ${targetMarket}. The plan covers organizational structure, processes, systems, and execution timelines for successful market entry.

ORGANIZATIONAL STRUCTURE:

LEADERSHIP TEAM:
* CEO: Overall responsibility and strategic direction
* COO: Operations management and execution
* CFO: Financial management and investor relations
* Chief Commercial Officer: Sales and marketing leadership
* Chief Technology Officer: Technology and product development

DEPARTMENTAL STRUCTURE:
* Sales & Marketing: 15-20 personnel
* Operations & Customer Service: 20-25 personnel
* Finance & Administration: 8-10 personnel
* Technology & IT: 5-8 personnel
* Human Resources: 3-5 personnel

LOCAL MANAGEMENT:
* Country Manager: Overall P&L responsibility
* Sales Director: Revenue generation and customer management
* Operations Manager: Day-to-day execution
* Finance Manager: Local financial management

IMPLEMENTATION PHASES:

PHASE 1: SETUP & PLANNING (Days 1-90)
Objectives: Establish foundation for operations
* Legal entity registration and regulatory approvals
* Office space acquisition and fit-out
* Core team recruitment and onboarding
* IT infrastructure deployment
* Banking relationships establishment
* Initial market research completion

PHASE 2: PILOT OPERATIONS (Days 91-180)
Objectives: Test systems and processes
* Pilot customer acquisition (5-10 clients)
* Product/service customization and testing
* Sales process implementation
* Customer service setup
* Quality assurance procedures
* Performance metrics establishment

PHASE 3: FULL OPERATIONS (Days 181-365)
Objectives: Scale to full market presence
* Full sales team deployment
* Marketing campaign launch
* Customer base expansion to 50+ clients
* Operational process optimization
* Staff expansion to full complement
* Profitability target achievement

KEY PROCESSES:

SALES PROCESS:
1. Lead Generation: Marketing campaigns, partner referrals
2. Qualification: Needs assessment and budget evaluation
3. Proposal: Customized solution development
4. Negotiation: Terms and pricing agreement
5. Closing: Contract execution and onboarding
6. Post-Sale: Implementation and support

CUSTOMER SERVICE PROCESS:
1. Inquiry Handling: Multi-channel support
2. Issue Resolution: Technical and operational support
3. Account Management: Relationship development
4. Upselling: Additional product opportunities
5. Feedback Collection: Satisfaction monitoring

OPERATIONAL PROCESSES:
1. Order Processing: From quote to delivery
2. Inventory Management: Stock control and replenishment
3. Quality Control: Product and service standards
4. Financial Management: Budgeting and reporting
5. Compliance: Regulatory and legal requirements

TECHNOLOGY SYSTEMS:
* ERP System: SAP or equivalent for core operations
* CRM System: Salesforce for customer management
* Financial Software: QuickBooks/Oracle for accounting
* Communication Tools: Microsoft Teams/Slack
* Project Management: Asana/Jira for task tracking

PERFORMANCE METRICS:
* Revenue Growth: Monthly targets and actuals
* Customer Acquisition: Number of new clients
* Customer Satisfaction: NPS scores and feedback
* Operational Efficiency: Cost per transaction, processing time
* Employee Productivity: Revenue per employee
* Quality Metrics: Defect rates, compliance scores

RISK MANAGEMENT:
* Operational Risks: Business continuity planning
* Financial Risks: Cash flow monitoring, budget controls
* Compliance Risks: Regular audits and training
* People Risks: Succession planning, retention programs

SUCCESS FACTORS:
1. Strong local leadership team
2. Effective partnership with ${targetPartnerName}
3. Robust operational processes
4. Technology enablement
5. Continuous improvement culture

CONCLUSION:
This operational plan provides a comprehensive framework for successful implementation. Regular monitoring and adaptation will be essential for achieving operational excellence.
  `;

  const generateIntegrationPlan = () => `
INTEGRATION PLAN: ${entityName} - ${targetPartnerName} PARTNERSHIP

Post-Merger Integration Strategy

Date: ${new Date().toLocaleDateString()}

EXECUTIVE SUMMARY:
This integration plan outlines the framework for combining ${entityName} and ${targetPartnerName} operations in ${targetMarket}. The plan focuses on creating operational synergies, cultural alignment, and value creation while minimizing disruption and risk.

INTEGRATION OBJECTIVES:
1. Achieve operational synergies within 12 months
2. Realize cost savings of 15-20% through efficiency gains
3. Maintain customer service levels throughout transition
4. Create unified organizational culture
5. Meet financial targets and investor expectations

INTEGRATION APPROACH:
The integration will follow a phased approach with clear milestones, accountability, and communication. Key principles include speed, transparency, and employee engagement.

PHASED INTEGRATION PLAN:

PHASE 1: PLANNING & DESIGN (Days 1-30)
* Integration team formation and charter
* Current state assessment and gap analysis
* Target operating model design
* Integration roadmap development
* Communication plan creation
* Risk assessment and mitigation planning

PHASE 2: FOUNDATION BUILDING (Days 31-90)
* Legal entity integration completion
* Leadership team alignment and decisions
* Core team identification and retention
* IT systems integration planning
* Financial systems consolidation
* Brand and messaging alignment

PHASE 3: OPERATIONAL INTEGRATION (Days 91-180)
* Sales and marketing function integration
* Operations and supply chain combination
* Customer service transition
* Technology platform migration
* Financial reporting unification
* HR policies and systems harmonization

PHASE 4: OPTIMIZATION & SCALE (Days 181-365)
* Process standardization and optimization
* Performance management implementation
* Cultural integration initiatives
* Growth initiatives launch
* Continuous improvement programs
* Full synergy realization

WORKSTREAM STRUCTURE:

FINANCIAL INTEGRATION:
* Systems consolidation (ERP, accounting)
* Reporting standardization
* Treasury and cash management
* Tax optimization
* Budgeting and forecasting alignment

OPERATIONAL INTEGRATION:
* Supply chain optimization
* Manufacturing/process harmonization
* Quality systems integration
* Inventory management
* Procurement centralization

COMMERCIAL INTEGRATION:
* Sales force integration
* Customer relationship management
* Marketing strategy alignment
* Pricing and product strategy
* Channel management

TECHNOLOGY INTEGRATION:
* IT infrastructure consolidation
* Application portfolio rationalization
* Data migration and integration
* Cybersecurity framework
* Digital transformation initiatives

HUMAN RESOURCES INTEGRATION:
* Organizational design
* Compensation and benefits harmonization
* Performance management systems
* Training and development programs
* Cultural integration initiatives

CHANGE MANAGEMENT:
* Communication strategy
* Employee engagement programs
* Training and support programs
* Resistance management
* Leadership alignment

SUCCESS METRICS:
* Financial: Cost synergy achievement, revenue growth
* Operational: Process efficiency, quality metrics
* Customer: Satisfaction scores, retention rates
* Employee: Engagement surveys, retention rates
* Integration: Milestone achievement, timeline adherence

RISK MANAGEMENT:
* Operational disruption mitigation
* Customer retention strategies
* Employee retention and engagement
* Regulatory compliance
* Financial performance protection

GOVERNANCE STRUCTURE:
* Integration Management Office (IMO)
* Executive Steering Committee
* Workstream leads and teams
* Regular progress reporting
* Issue escalation procedures

COMMUNICATION PLAN:
* Employee town halls and updates
* Customer notifications and reassurances
* Stakeholder briefings
* Media and public communications
* Internal newsletter and intranet

CONCLUSION:
Successful integration requires careful planning, strong leadership, and consistent execution. This plan provides the framework for creating a combined entity greater than the sum of its parts.
  `;

  const generateEntryAdvisory = () => `
LOCATION ENTRY ADVISORY: ${targetMarket}

Prepared for: ${entityName}
Partner: ${targetPartnerName}
Date: ${new Date().toLocaleDateString()}

EXECUTIVE SUMMARY:
This advisory provides practical guidance to prepare for entry and operations in ${targetMarket} prior to relocation or travel. It outlines regulatory steps, key contacts, cultural considerations, and 30/60/90-day priorities to reduce friction and accelerate readiness.

REGULATORY PATHWAY:
* Entity Setup: Confirm legal form (LLC/JV); engage local counsel
* Licenses & Permits: Identify sector-specific approvals; prepare documentation
* Banking & Tax: Open local accounts; register for tax IDs; set invoicing rules
* Data & Compliance: Map data flows; align with privacy and sector regulations

KEY TOUCHPOINTS & CONTACTS:
* Government Relations: Appoint liaison; schedule introductory briefings
* Industry Bodies: Join relevant associations to access policy updates
* Local Counsel & Auditor: Retainers for filings, payroll, and compliance
* Anchor Customers: Pre-schedule solution demos and pilot scoping sessions

OPERATIONAL READINESS CHECKLIST:
* Office & Infrastructure: Shortlist locations; confirm internet/power reliability
* Talent & Hiring: Define local roles; engage recruiting partners; plan onboarding
* Vendor Network: Validate logistics, IT, and facility vendors; negotiate SLAs
* Security & Continuity: Draft incident response; verify insurance coverage

CULTURAL & NEGOTIATION NOTES:
* Meetings: Confirm agenda in advance; allow buffer for relationship building
* Negotiation: Expect iterative discussions; write clear follow-ups and summaries
* Decision Cycles: Anticipate committee reviews; provide concise briefing packs

30/60/90-DAY PLAN:
* 30 Days: Legal kick-off, GR introductions, pilot customer shortlist, vendor RFPs
* 60 Days: License filings submitted, first pilot SOWs, local hiring underway
* 90 Days: Office ready, pilots live, compliance audit checklist complete

RISKS & MITIGATIONS:
* Regulatory Delays — Parallel filings, GR follow-ups, buffer timelines
* Talent Shortages — Early sourcing, competitive offers, training plans
* Vendor Reliability — Multi-sourcing, performance clauses, weekly tracking

RECOMMENDATION:
Proceed with Phase 1 setup and pilots. Decision checkpoint by ${decisionDeadline}.
  `;

  const generateCulturalBrief = () => `
CULTURAL INTELLIGENCE BRIEF: ${targetMarket}

Prepared for: ${entityName}
Partner: ${targetPartnerName}
Date: ${new Date().toLocaleDateString()}

EXECUTIVE OVERVIEW:
This brief highlights core norms, communication styles, meeting etiquette, and regulatory culture to support effective engagement and trust-building in ${targetMarket}.

COMMUNICATION & MEETINGS:
* Style: Be clear and respectful; avoid ambiguity in commitments
* Scheduling: Share agendas early; confirm attendees and decisions required
* Follow-ups: Summarize outcomes and next steps in writing promptly

NEGOTIATION APPROACH:
* Tempo: Expect phased agreements; maintain patience and flexibility
* Decision-Making: Committee or multi-stakeholder reviews are common
* Documentation: Provide concise term outlines and risk considerations

BUSINESS NORMS:
* Relationship Orientation: Invest time in continuity and reliability
* Professional Conduct: Punctuality, preparedness, and precision are valued
* Governance: Align on KPIs, reporting cadence, and escalation paths

REGULATORY CULTURE:
* Compliance: Respect formal processes; maintain complete records and audit trails
* Engagement: Build constructive relationships with relevant authorities
* Transparency: Provide clear disclosures and timely filings

DO / DON'T:
* Do: Bring bilingual materials where helpful; verify assumptions in writing
* Don't: Overpromise timelines; neglect stakeholder sensitivities or protocols

READINESS REMINDERS:
* Briefing Packs: Prepare concise decks tailored to each audience
* Local Contacts: Curate a contact map across government, industry, and customers
* Continuity: Plan for holidays and local events that affect scheduling

RECOMMENDATION:
Adopt the above practices to strengthen trust, accelerate approvals, and improve negotiation outcomes.
  `;

  const exportDocument = async () => {
    if (!generatedContent) return;

    if (exportFormat === 'pdf') {
      const pdf = new jsPDF();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 10;
      const maxWidth = pageWidth - 2 * margin;

      const lines = pdf.splitTextToSize(generatedContent, maxWidth);
      let yPosition = margin;

      lines.forEach((line: string) => {
        if (yPosition > pageHeight - margin) {
          pdf.addPage();
          yPosition = margin;
        }
        pdf.text(line, margin, yPosition);
        yPosition += 5;
      });

      pdf.save(`${selectedDocument}-${new Date().getTime()}.pdf`);
    }
  };

  const exportContent = async (content: string, name: string) => {
    const pdf = new jsPDF();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 10;
    const maxWidth = pageWidth - 2 * margin;
    const lines = pdf.splitTextToSize(content, maxWidth);
    let yPosition = margin;
    lines.forEach((line: string) => {
      if (yPosition > pageHeight - margin) {
        pdf.addPage();
        yPosition = margin;
      }
      pdf.text(line, margin, yPosition);
      yPosition += 5;
    });
    pdf.save(`${name}-${new Date().getTime()}.pdf`);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedContent);
  };

  const buildLineDiff = (before: string, after: string): Array<{ type: 'same' | 'removed' | 'added'; text: string; key: string }> => {
    const beforeLines = before.split('\n');
    const afterLines = after.split('\n');
    const max = Math.max(beforeLines.length, afterLines.length);
    const rows: Array<{ type: 'same' | 'removed' | 'added'; text: string; key: string }> = [];

    for (let index = 0; index < max; index++) {
      const oldLine = beforeLines[index];
      const newLine = afterLines[index];

      if (oldLine === newLine && oldLine !== undefined) {
        rows.push({ type: 'same', text: oldLine, key: `same-${index}` });
      } else {
        if (oldLine !== undefined) {
          rows.push({ type: 'removed', text: oldLine, key: `removed-${index}` });
        }
        if (newLine !== undefined) {
          rows.push({ type: 'added', text: newLine, key: `added-${index}` });
        }
      }
    }

    return rows;
  };

  const applyRewrite = (mode: RewriteMode) => {
    if (!generatedContent.trim()) return;

    const base = generatedContent;
    setRewriteBaseContent(base);
    let updated = base;

    if (mode === 'formalize') {
      updated = base
        .replace(/\bcan't\b/gi, 'cannot')
        .replace(/\bwon't\b/gi, 'will not')
        .replace(/\bdon't\b/gi, 'do not')
        .replace(/\bwe're\b/gi, 'we are')
        .replace(/\bit's\b/gi, 'it is')
        .replace(/\bok\b/gi, 'acceptable');
    }

    if (mode === 'shorten') {
      const paragraphs = base.split(/\n\n+/).filter(Boolean);
      updated = paragraphs.slice(0, 10).join('\n\n');
      if (paragraphs.length > 10) {
        updated += '\n\n[Shortened version: additional sections removed for executive brevity.]';
      }
    }

    if (mode === 'legal-safe') {
      const sanitized = base
        .replace(/\bguarantee(s|d)?\b/gi, 'target')
        .replace(/\bwill definitely\b/gi, 'is expected to')
        .replace(/\bmust\b/gi, 'should');
      updated = `${sanitized}\n\nLEGAL SAFETY NOTICE:\nThis document is a strategic draft for discussion purposes only and does not constitute legal, tax, investment, or regulatory advice. Obtain jurisdiction-specific counsel before execution.`;
    }

    if (mode === 'board-ready') {
      const lines = base.split('\n').filter(l => l.trim().length > 0);
      const highlights = lines
        .filter(l => l.includes('Recommendation') || l.includes('ROI') || l.includes('Risk') || l.includes('Timeline'))
        .slice(0, 6)
        .map(l => `* ${l.replace(/^\*\s*/, '')}`);

      const boardHeader = [
        'BOARD BRIEF VERSION',
        `Prepared for: ${structuredIntake.audience || 'Board / Executive Committee'}`,
        `Objective: ${structuredIntake.objective || 'Strategic decision support'}`,
        '',
        'KEY HIGHLIGHTS:',
        ...(highlights.length > 0 ? highlights : ['* Recommendation and risk summary included in the body below.']),
        '',
        'FULL DRAFT:'
      ].join('\n');

      updated = `${boardHeader}\n\n${base}`;
    }

    setGeneratedContent(updated);
    setLastRewriteMode(mode);
    setShowRedline(true);

    const currentIndex = rewriteHistoryIndex;
    setRewriteHistory((prev) => {
      const truncated = currentIndex >= 0 ? prev.slice(0, currentIndex + 1) : [];
      if (truncated[truncated.length - 1] === updated) {
        return truncated;
      }
      return [...truncated, updated];
    });
    setRewriteHistoryIndex(currentIndex >= 0 ? currentIndex + 1 : 0);
  };

  const hasPendingRewrite = Boolean(lastRewriteMode && rewriteBaseContent && rewriteBaseContent !== generatedContent);
  const hasUndoRewrite = rewriteHistoryIndex > 0;
  const hasRedoRewrite = rewriteHistoryIndex >= 0 && rewriteHistoryIndex < rewriteHistory.length - 1;

  const applyHistoryStep = (nextIndex: number) => {
    if (nextIndex < 0 || nextIndex >= rewriteHistory.length || nextIndex === rewriteHistoryIndex) return;

    const currentContent = rewriteHistory[rewriteHistoryIndex];
    const nextContent = rewriteHistory[nextIndex];
    if (nextContent === undefined) return;

    setGeneratedContent(nextContent);
    if (currentContent !== undefined) {
      setRewriteBaseContent(currentContent);
      setShowRedline(true);
    }
    setRewriteHistoryIndex(nextIndex);
  };

  const undoRewrite = () => {
    if (!hasUndoRewrite) return;
    applyHistoryStep(rewriteHistoryIndex - 1);
  };

  const redoRewrite = () => {
    if (!hasRedoRewrite) return;
    applyHistoryStep(rewriteHistoryIndex + 1);
  };

  useEffect(() => {
    const shouldEnableShortcuts = Boolean(selectedDocument) && !isGenerating && generatedBatch.length === 0;
    if (!shouldEnableShortcuts) return;

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName?.toLowerCase();
      if (tagName === 'input' || tagName === 'textarea' || tagName === 'select' || target?.isContentEditable) {
        return;
      }

      const key = event.key.toLowerCase();
      const isCtrlOrMeta = event.ctrlKey || event.metaKey;
      const isUndo = isCtrlOrMeta && !event.altKey && !event.shiftKey && key === 'z';
      const isRedo = isCtrlOrMeta && !event.altKey && (key === 'y' || (event.shiftKey && key === 'z'));

      if (isUndo && hasUndoRewrite) {
        event.preventDefault();
        applyHistoryStep(rewriteHistoryIndex - 1);
        setShortcutToast('Undo rewrite');
      }

      if (isRedo && hasRedoRewrite) {
        event.preventDefault();
        applyHistoryStep(rewriteHistoryIndex + 1);
        setShortcutToast('Redo rewrite');
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedDocument, isGenerating, generatedBatch.length, hasUndoRewrite, hasRedoRewrite, rewriteHistoryIndex, rewriteHistory]);

  useEffect(() => {
    if (!shortcutToast) return;
    const timeout = window.setTimeout(() => setShortcutToast(''), 1400);
    return () => window.clearTimeout(timeout);
  }, [shortcutToast]);

  const acceptRewrite = () => {
    if (!hasPendingRewrite) return;
    setOriginalGeneratedContent(generatedContent);
    setRewriteHistory([generatedContent]);
    setRewriteHistoryIndex(0);
    clearRewriteState();
  };

  const revertToOriginal = () => {
    if (!originalGeneratedContent) return;
    setGeneratedContent(originalGeneratedContent);
    clearRewriteState();
  };

  return (
    <div className="h-full bg-stone-50 p-6 overflow-y-auto">
      {shortcutToast && (
        <div className="fixed top-6 right-6 z-50 px-3 py-2 text-xs font-semibold text-blue-900 bg-blue-50 border border-blue-200 rounded-lg shadow-sm">
          {shortcutToast}
        </div>
      )}
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* HEADER */}
        <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6">
          <h2 className="text-3xl font-bold text-stone-900 mb-2 flex items-center gap-2">
            <FileText className="w-8 h-8 text-blue-600" />
            Document Generation Suite
          </h2>
          <p className="text-stone-600">Generate professional partnership documents in minutes</p>
          <div className="mt-4 flex items-center gap-3">
            <span className="text-xs font-bold text-stone-700">Length:</span>
            {(['brief','standard','extended'] as const).map(p => (
              <button key={p} onClick={() => setLengthPreset(p)} className={`px-3 py-1.5 text-xs rounded border ${lengthPreset===p?'bg-blue-600 text-white border-blue-600':'bg-white text-stone-700 border-stone-300 hover:border-blue-300'}`}>{p}</button>
            ))}
            <span className="ml-auto text-xs text-stone-500">Multi-select any docs below, then Generate Selected.</span>
          </div>
        </div>

        {!selectedDocument ? (
          <>
            {/* Stepper & Readiness */}
            <div className="bg-white border border-stone-200 rounded-xl p-4 flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-3 text-[11px] font-bold uppercase tracking-wide text-stone-700">
                {["1. Readiness", "2. Pick Docs", "3. Fill Required Fields", "4. Review & Dispatch"].map((step, idx) => (
                  <div key={step} className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${idx === 0 ? 'bg-blue-50 border-blue-200 text-blue-800' : 'bg-stone-50 border-stone-200'}`}>
                    <span className="text-[10px]">{step}</span>
                  </div>
                ))}
              </div>
              <div className="grid md:grid-cols-3 gap-3">
                <div className="border border-blue-200 bg-blue-50 rounded-lg p-3 text-xs text-blue-900">
                  <div className="font-bold mb-1">Recommended next docs</div>
                  <div className="flex flex-wrap gap-2">
                    {recommendedDocs.map(doc => {
                      const { isReady } = getReadiness(doc);
                      const template = documentTemplates.find(d => d.id === doc);
                      return (
                        <span key={doc} className={`px-2 py-1 rounded-full border text-[11px] ${isReady ? 'border-green-300 bg-green-50 text-green-800' : 'border-amber-300 bg-amber-50 text-amber-800'}`}>
                          {template?.title || doc}
                        </span>
                      );
                    })}
                  </div>
                </div>
                <div className="border border-stone-200 bg-white rounded-lg p-3 text-xs text-stone-800">
                  <div className="font-bold mb-1">Blocking fields</div>
                  <ul className="list-disc list-inside space-y-1">
                    {blockerList.slice(0,3).map((msg, i) => (
                      <li key={i}>{msg}</li>
                    ))}
                    {blockerList.length === 0 && <li>No blockers detected</li>}
                  </ul>
                </div>
                <div className="border border-stone-200 bg-white rounded-lg p-3 text-xs text-stone-800">
                  <div className="font-bold mb-1">Output & delivery</div>
                  <p>Choose PDF/Word, download or attach to email/CRM. Bundle packs (Exec Pack, Risk Pack) recommended after readiness.</p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-stone-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-stone-800 uppercase tracking-widest">Structured Intake</h3>
                <span className={`text-[11px] px-2 py-1 rounded-full border ${intakeReady ? 'bg-green-50 text-green-800 border-green-200' : 'bg-amber-50 text-amber-800 border-amber-200'}`}>
                  {intakeReady ? 'Ready' : `Missing: ${missingIntakeFields.join(', ')}`}
                </span>
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <input value={structuredIntake.objective} onChange={(e) => setStructuredIntake(prev => ({ ...prev, objective: e.target.value }))} placeholder="Objective (required)" className="w-full p-2.5 border border-stone-300 rounded text-sm" />
                <input value={structuredIntake.audience} onChange={(e) => setStructuredIntake(prev => ({ ...prev, audience: e.target.value }))} placeholder="Audience (required)" className="w-full p-2.5 border border-stone-300 rounded text-sm" />
                <input value={structuredIntake.jurisdiction} onChange={(e) => setStructuredIntake(prev => ({ ...prev, jurisdiction: e.target.value }))} placeholder="Jurisdiction (required)" className="w-full p-2.5 border border-stone-300 rounded text-sm" />
                <input value={structuredIntake.deadline} onChange={(e) => setStructuredIntake(prev => ({ ...prev, deadline: e.target.value }))} placeholder="Deadline (optional)" className="w-full p-2.5 border border-stone-300 rounded text-sm" />
                <input value={structuredIntake.tone} onChange={(e) => setStructuredIntake(prev => ({ ...prev, tone: e.target.value }))} placeholder="Tone" className="w-full p-2.5 border border-stone-300 rounded text-sm" />
                <input value={structuredIntake.mustInclude} onChange={(e) => setStructuredIntake(prev => ({ ...prev, mustInclude: e.target.value }))} placeholder="Must include" className="w-full p-2.5 border border-stone-300 rounded text-sm" />
              </div>
              <textarea value={structuredIntake.constraints} onChange={(e) => setStructuredIntake(prev => ({ ...prev, constraints: e.target.value }))} placeholder="Constraints and non-negotiables" className="w-full p-2.5 border border-stone-300 rounded text-sm h-20" />
            </div>

            {/* DOCUMENT GRID */}
            <div className="space-y-6">
              {['Foundation', 'Strategic', 'Analysis', 'Comprehensive', 'Comparative'].map(category => (
                <div key={category}>
                  <h3 className="text-sm font-bold text-stone-700 uppercase tracking-widest mb-3 px-1">{category} Documents</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    {documentTemplates.filter(d => d.category === category).map(doc => (
                      <button
                        key={doc.id}
                        onClick={() => toggleDocQueue(doc.id)}
                        className="bg-white rounded-lg border border-stone-200 p-4 hover:shadow-md hover:border-blue-300 transition-all text-left group"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="text-blue-600 group-hover:text-blue-700">{doc.icon}</div>
                          <div className="flex items-center gap-2">
                            <div className="text-xs font-bold text-stone-500 bg-stone-100 px-2 py-1 rounded">{doc.timeToGenerate}</div>
                            <input type="checkbox" checked={selectedDocsQueue.includes(doc.id)} readOnly className="h-4 w-4" />
                          </div>
                        </div>
                        <h4 className="font-bold text-stone-900 mb-1">{doc.title}</h4>
                        <p className="text-xs text-stone-600 leading-relaxed">{doc.description}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {getReadiness(doc.id).requirements.map(req => (
                            <span
                              key={`${doc.id}-${req.label}`}
                              className={`text-[11px] px-2 py-1 rounded-full border ${req.present ? 'border-green-200 bg-green-50 text-green-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}
                            >
                              {req.label}
                            </span>
                          ))}
                        </div>
                        {!getReadiness(doc.id).isReady && (
                          <div className="mt-2 text-[11px] text-amber-700 font-semibold">Missing: {getReadiness(doc.id).missing.join(', ')}</div>
                        )}
                        <div className="mt-3 flex items-center gap-2">
                          <button disabled={!intakeReady} onClick={(e) => { e.stopPropagation(); generateDocument(doc.id); }} className={`px-3 py-1.5 text-xs rounded ${intakeReady ? 'bg-stone-800 text-white hover:bg-black' : 'bg-stone-200 text-stone-500 cursor-not-allowed'}`}>Generate Now</button>
                          <span className="text-[11px] text-stone-500">or select for batch</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <button onClick={generateSelectedBatch} disabled={selectedDocsQueue.length===0 || isGenerating || !intakeReady} className={`px-4 py-2 rounded text-xs font-bold ${(selectedDocsQueue.length===0 || !intakeReady)?'bg-stone-200 text-stone-500 cursor-not-allowed':'bg-blue-600 text-white hover:bg-blue-700'}`}>
                Generate Selected ({selectedDocsQueue.length})
              </button>
              {isGenerating && <span className="text-xs text-stone-600">Generating batch...</span>}
            </div>

            {/* INFO BOX */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                <strong>💡 Pro Tip:</strong> Select any document to generate it instantly. All documents are pre-filled with data from your entity and partnership analysis.
              </p>
            </div>
          </>
        ) : isGenerating ? (
          <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-12 text-center space-y-6">
            <div className="flex justify-center">
              <div className="relative w-20 h-20">
                <div className="absolute inset-0 border-4 border-stone-200 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-transparent border-t-blue-600 rounded-full animate-spin"></div>
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-stone-900 mb-2">Generating Document</h3>
              <p className="text-stone-600">Assembling {documentTemplates.find(d => d.id === selectedDocument)?.title}...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* GENERATED DOCUMENT */}
            <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-8 space-y-4">
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-stone-200">
                <h3 className="text-xl font-bold text-stone-900">
                  {documentTemplates.find(d => d.id === selectedDocument)?.title}
                </h3>
                <button
                  onClick={closeGeneratedDocument}
                  className="text-stone-500 hover:text-stone-700 font-bold"
                >
                  ✗
                </button>
              </div>
              {generatedBatch.length === 0 ? (
                <>
                  <div className="bg-stone-50 p-6 rounded-lg border border-stone-200 h-96 overflow-y-auto whitespace-pre-wrap text-sm text-stone-700 leading-relaxed font-mono">
                    {generatedContent}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <button onClick={() => applyRewrite('formalize')} className="px-3 py-2 border border-stone-200 rounded text-xs font-semibold text-stone-700 hover:bg-stone-50">Formalize</button>
                    <button onClick={() => applyRewrite('shorten')} className="px-3 py-2 border border-stone-200 rounded text-xs font-semibold text-stone-700 hover:bg-stone-50">Shorten</button>
                    <button onClick={() => applyRewrite('legal-safe')} className="px-3 py-2 border border-stone-200 rounded text-xs font-semibold text-stone-700 hover:bg-stone-50">Legal-Safe</button>
                    <button onClick={() => applyRewrite('board-ready')} className="px-3 py-2 border border-stone-200 rounded text-xs font-semibold text-stone-700 hover:bg-stone-50">Board-Ready</button>
                  </div>
                  {lastRewriteMode && (
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-[11px] text-stone-500">Last rewrite applied: {lastRewriteMode}</div>
                      <div className="flex items-center gap-2">
                        <button onClick={undoRewrite} disabled={!hasUndoRewrite} className={`text-[11px] px-2 py-1 rounded border ${hasUndoRewrite ? 'border-blue-300 text-blue-700 hover:bg-blue-50' : 'border-stone-200 text-stone-400 cursor-not-allowed'}`}>
                          Undo Rewrite
                        </button>
                        <button onClick={redoRewrite} disabled={!hasRedoRewrite} className={`text-[11px] px-2 py-1 rounded border ${hasRedoRewrite ? 'border-blue-300 text-blue-700 hover:bg-blue-50' : 'border-stone-200 text-stone-400 cursor-not-allowed'}`}>
                          Redo Rewrite
                        </button>
                        <button onClick={() => setShowRedline(prev => !prev)} className="text-[11px] px-2 py-1 border border-stone-300 rounded text-stone-700 hover:bg-stone-50">
                          {showRedline ? 'Hide Redline' : 'Show Redline'}
                        </button>
                        <button onClick={acceptRewrite} disabled={!hasPendingRewrite} className={`text-[11px] px-2 py-1 rounded border ${hasPendingRewrite ? 'border-emerald-300 text-emerald-700 hover:bg-emerald-50' : 'border-stone-200 text-stone-400 cursor-not-allowed'}`}>
                          Accept Rewrite
                        </button>
                        <button onClick={revertToOriginal} disabled={!originalGeneratedContent || !hasPendingRewrite} className={`text-[11px] px-2 py-1 rounded border ${originalGeneratedContent && hasPendingRewrite ? 'border-red-300 text-red-700 hover:bg-red-50' : 'border-stone-200 text-stone-400 cursor-not-allowed'}`}>
                          Revert to Original
                        </button>
                      </div>
                    </div>
                  )}
                  {lastRewriteMode && (
                    <div className="text-[11px] text-stone-500">
                      Shortcuts: Undo <span className="font-mono">Ctrl/Cmd+Z</span> · Redo <span className="font-mono">Ctrl/Cmd+Y</span> or <span className="font-mono">Ctrl/Cmd+Shift+Z</span>
                    </div>
                  )}
                  {rewriteHistoryIndex >= 0 && rewriteHistory.length > 0 && (
                    <div className="text-[11px] text-stone-500">
                      Rewrite history step {rewriteHistoryIndex + 1} of {rewriteHistory.length}
                    </div>
                  )}
                  {showRedline && rewriteBaseContent && rewriteBaseContent !== generatedContent && (
                    <div className="grid md:grid-cols-2 gap-3">
                      <div className="border border-red-200 rounded-lg overflow-hidden">
                        <div className="px-3 py-2 bg-red-50 text-red-800 text-xs font-bold">Before Rewrite</div>
                        <div className="max-h-60 overflow-y-auto p-3 text-[11px] font-mono whitespace-pre-wrap text-stone-700">
                          {rewriteBaseContent}
                        </div>
                      </div>
                      <div className="border border-emerald-200 rounded-lg overflow-hidden">
                        <div className="px-3 py-2 bg-emerald-50 text-emerald-800 text-xs font-bold">After Rewrite</div>
                        <div className="max-h-60 overflow-y-auto p-3 text-[11px] font-mono whitespace-pre-wrap text-stone-700">
                          {generatedContent}
                        </div>
                      </div>
                      <div className="md:col-span-2 border border-stone-200 rounded-lg overflow-hidden">
                        <div className="px-3 py-2 bg-stone-100 text-stone-700 text-xs font-bold">Redline</div>
                        <div className="max-h-60 overflow-y-auto p-2 space-y-1 text-[11px] font-mono">
                          {buildLineDiff(rewriteBaseContent, generatedContent).map((row) => (
                            <div key={row.key} className={row.type === 'added' ? 'bg-emerald-50 text-emerald-900 px-2 py-0.5 rounded' : row.type === 'removed' ? 'bg-red-50 text-red-900 px-2 py-0.5 rounded line-through' : 'px-2 py-0.5 text-stone-600'}>
                              {row.type === 'added' ? '+ ' : row.type === 'removed' ? '- ' : '  '}
                              {row.text}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <button onClick={copyToClipboard} className="px-4 py-3 border border-stone-200 rounded-lg font-bold text-sm text-stone-700 hover:bg-stone-50 flex items-center justify-center gap-2">
                      <Copy className="w-4 h-4" /> Copy to Clipboard
                    </button>
                    <button onClick={exportDocument} className="px-4 py-3 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 flex items-center justify-center gap-2">
                      <Download className="w-4 h-4" /> Download as PDF
                    </button>
                    <button onClick={closeGeneratedDocument} className="px-4 py-3 border border-stone-200 rounded-lg font-bold text-sm text-stone-700 hover:bg-stone-50 flex items-center justify-center gap-2">
                      <FileText className="w-4 h-4" /> Generate Another
                    </button>
                  </div>
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-xs text-green-800 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" /> Document generated successfully. Ready for export or sharing.
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-4">
                    {generatedBatch.map((doc, idx) => (
                      <div key={`${doc.id}-${idx}`} className="border border-stone-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-bold text-stone-900 text-sm">{doc.title}</h4>
                          <div className="flex items-center gap-2">
                            <button onClick={() => exportContent(doc.content, doc.id)} className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded">Download PDF</button>
                            <button onClick={() => navigator.clipboard.writeText(doc.content)} className="px-3 py-1.5 text-xs border border-stone-300 rounded">Copy</button>
                          </div>
                        </div>
                        <div className="bg-stone-50 p-3 rounded border border-stone-200 whitespace-pre-wrap text-[12px] text-stone-700 font-mono h-52 overflow-y-auto">{doc.content}</div>
                      </div>
                    ))}
                  </div>
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-xs text-green-800 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" /> {generatedBatch.length} documents generated. Export individually.
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentGenerationSuite;

