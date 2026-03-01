import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  ReportParameters, 
  CopilotInsight, 
  ReportData, 
  ReportSection,
  GenerationPhase,
  ReportPayload
} from './types';
import { INITIAL_PARAMETERS } from './constants';
import NSILWorkspace from './components/NSILWorkspace';
import UserManual from './components/UserManual';
import CommandCenter from './components/CommandCenter';
import BWConsultantOS from './components/BWConsultantOS.tsx';
import GlobalLocationIntelligence from './components/GlobalLocationIntelligence.tsx';
import AdminDashboard from './components/AdminDashboard';
import { Gateway } from './components/Gateway';
import MatchmakingEngine from './components/MatchmakingEngine';
import DocumentGenerationSuite from './components/DocumentGenerationSuite';
import useEscapeKey from './hooks/useEscapeKey';
import { generateCopilotInsights, generateReportSectionStream } from './services/geminiService';
import { config } from './services/config';
import { ReportOrchestrator } from './services/ReportOrchestrator';
import { ConsultantGateService } from './services/ConsultantGateService';
// ETHICAL GATE & DOCUMENT INTEGRITY
import { DocumentIntegrityService } from './services/DocumentIntegrityService';
// AUTONOMOUS CAPABILITIES IMPORTS
import { solveAndAct as autonomousSolve } from './services/autonomousClient';
import { selfLearningEngine } from './services/selfLearningEngine';
import { ReactiveIntelligenceEngine } from './services/ReactiveIntelligenceEngine';
import { runSmartAgenticWorker, AgenticRun, runFullyAutonomousAgenticWorker } from './services/agenticWorker';
// Automatic Search and Consultant AI
import { automaticSearchService } from './services/AutomaticSearchService';
import { bwConsultantAI, type ConsultantInsight } from './services/BWConsultantAgenticAI';
// EventBus for ecosystem connectivity
import { EventBus, type EcosystemPulse } from './services/EventBus';
import { ReportsService } from './services/ReportsService';
// Location intelligence types
import { type CityProfile } from './data/globalLocationProfiles';
import { type LocationResult } from './services/geminiLocationService';

// --- TYPES & INITIAL STATE ---
const initialSection: ReportSection = { id: '', title: '', content: '', status: 'pending' };

const initialReportData: ReportData = {
  executiveSummary: { ...initialSection, id: 'exec', title: 'Executive Summary' },
  marketAnalysis: { ...initialSection, id: 'market', title: 'Background & Market Dossier' },
  recommendations: { ...initialSection, id: 'rec', title: 'Strategic Analysis & Options' },
  implementation: { ...initialSection, id: 'imp', title: 'Engagement & Execution Playbook' },
  financials: { ...initialSection, id: 'fin', title: 'Financial Projections' },
  risks: { ...initialSection, id: 'risk', title: 'Risk Mitigation Strategy' },
};

type ViewMode = 'main' | 'user-manual' | 'command-center' | 'consultant-os' | 'report-generator' | 'global-location-intel' | 'admin' | 'intake' | 'matchmaking' | 'documents';

const App: React.FC = () => {
    // --- STATE ---
    const [params, setParams] = useState<ReportParameters>(INITIAL_PARAMETERS);
    const [viewMode, setViewMode] = useState<ViewMode>('command-center');
    const [savedReports, setSavedReports] = useState<ReportParameters[]>([]);
    const [pendingLocationData, setPendingLocationData] = useState<{
        profile: CityProfile;
        research: LocationResult;
        city: string;
        country: string;
    } | null>(null);

    useEffect(() => {
        const loadReports = async () => {
            try {
                const reports = await ReportsService.list();
                setSavedReports(reports);
            } catch (error) {
                console.error('Failed to load reports from API', error);
            }
        };
        loadReports();
    }, []);

    // Generation State
    const [insights, setInsights] = useState<CopilotInsight[]>([]);
    const [reportData, setReportData] = useState<ReportData>(initialReportData);
    const [isGeneratingReport, setIsGeneratingReport] = useState(false);
    const [genPhase, setGenPhase] = useState<GenerationPhase>('idle');
    const [genProgress, setGenProgress] = useState(0);

    // AUTONOMOUS CAPABILITIES STATE
    const [autonomousMode] = useState(true); // DEFAULT ON
    const [autonomousInsights, setAutonomousInsights] = useState<CopilotInsight[]>([]);
    const [isAutonomousThinking, setIsAutonomousThinking] = useState(false);
    const [autonomousSuggestions, setAutonomousSuggestions] = useState<string[]>([]);
    // FULLY AUTONOMOUS SYSTEM STATE
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [isFullyAutonomous, setIsFullyAutonomous] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
    const [autonomousSystemStatus, setAutonomousSystemStatus] = useState<any>(null);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [selfImprovementSuggestions, setSelfImprovementSuggestions] = useState<string[]>([]);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
    const [activeSubAgents, setActiveSubAgents] = useState<any[]>([]);
    // BW CONSULTANT AI STATE
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [consultantInsights, setConsultantInsights] = useState<ConsultantInsight[]>([]);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [isConsultantActive, setIsConsultantActive] = useState(true);
    const [pendingConsultantQuery, setPendingConsultantQuery] = useState<string | null>(null);
    // ECOSYSTEM STATE (from EventBus "meadow" signals)
    const [, setEcosystemPulse] = useState<EcosystemPulse | null>(null);

    // COMBINED INSIGHTS - Merge regular and autonomous insights
    const combinedInsights = useMemo(() => {
        return [...insights, ...autonomousInsights];
    }, [insights, autonomousInsights]);

    // --- EventBus subscriptions (bee  flower  meadow) ---
    useEffect(() => {
        // Subscribe to insights from anywhere in the system
        const unsubInsights = EventBus.subscribe('insightsGenerated', (event) => {
            console.log('[App] EventBus  insightsGenerated', event.reportId);
            // Merge ecosystem insights with existing
            setAutonomousInsights(prev => {
                const ids = new Set(prev.map(i => i.id));
                const newOnes = event.insights.filter(i => !ids.has(i.id));
                return [...prev, ...newOnes];
            });
        });

        // Subscribe to suggestions from anywhere in the system
        const unsubSuggestions = EventBus.subscribe('suggestionsReady', (event) => {
            console.log('[App] EventBus  suggestionsReady', event.reportId);
            setAutonomousSuggestions(event.actions);
        });

        // Subscribe to ecosystem pulse ("meadow" view)
        const unsubPulse = EventBus.subscribe('ecosystemPulse', (event) => {
            console.log('[App] EventBus  ecosystemPulse', event.signals);
            setEcosystemPulse(event.signals);
        });

        // Subscribe to learning updates (self-learning feedback)
        const unsubLearning = EventBus.subscribe('learningUpdate', (event) => {
            console.log('[App] EventBus  learningUpdate', event.message);
            // Could show a toast or update a learning status indicator
        });

        // Subscribe to fully autonomous system events
        const unsubFullyAutonomous = EventBus.subscribe('fullyAutonomousRunComplete', (event) => {
            console.log('[App] EventBus  fullyAutonomousRunComplete', event.runId);
            setAutonomousSystemStatus(event);
            setSelfImprovementSuggestions(event.improvements || []);
            setActiveSubAgents(event.spawnedAgents || []);
        });

        const unsubImprovements = EventBus.subscribe('improvementsSuggested', (event) => {
            console.log('[App] EventBus  improvementsSuggested', event.suggestions.length);
            setSelfImprovementSuggestions(event.suggestions);
        });

        const unsubAgentSpawned = EventBus.subscribe('agentSpawned', (event) => {
            console.log('[App] EventBus  agentSpawned', event.agent.name);
            setActiveSubAgents(prev => [...prev, event.agent]);
        });

        // Subscribe to consultant AI events
        const unsubConsultantInsights = EventBus.subscribe('consultantInsightsGenerated', (event) => {
            console.log('[App] EventBus  consultantInsightsGenerated', event.insights.length);
            setConsultantInsights(event.insights);
        });

        const unsubSearchResult = EventBus.subscribe('searchResultReady', (event) => {
            console.log('[App] EventBus  searchResultReady', event.query);
            // Note: Do NOT call bwConsultantAI.consult() here.
            // It triggers proactiveSearchForReport  triggerSearch  emit(searchResultReady)  consult  infinite loop.
            // Search results are already stored and available to the consultant when next consulted.
        });

        return () => {
            unsubInsights();
            unsubSuggestions();
            unsubPulse();
            unsubLearning();
            unsubFullyAutonomous();
            unsubImprovements();
            unsubAgentSpawned();
            unsubConsultantInsights();
            unsubSearchResult();
        };
    }, [isConsultantActive, params]);


    // --- EFFECTS ---
    // Copilot Auto-Gen - ONLY runs if valid input exists
    useEffect(() => {
        console.log("DEBUG: Copilot useEffect triggered", { viewMode, orgName: params.organizationName, country: params.country, insightsLength: insights.length });
        const timer = setTimeout(async () => {
          // STRICT CHECK: Do not run if fields are empty
                    if (config.useRealAI && (viewMode === 'report-generator') && params.organizationName && params.country && params.organizationName.length > 2 && insights.length === 0) {
            console.log("DEBUG: Starting copilot generation");
            try {
              const newInsights = await generateCopilotInsights(params);
              console.log("DEBUG: Copilot insights generated:", newInsights.length);
              setInsights(newInsights);
            } catch (error) {
              console.error("DEBUG: Error in copilot generation:", error);
            }
          } else {
            console.log("DEBUG: Copilot conditions not met");
          }
        }, 1500);
        return () => clearTimeout(timer);
        }, [params, viewMode, insights.length]);

    // AUTONOMOUS CAPABILITIES EFFECTS

    // Agentic Worker - true digital worker pipeline (plan -> tools -> memory -> verdict)
    useEffect(() => {
        if (autonomousMode && params.organizationName && params.country && params.organizationName.length > 2) {
            const timer = setTimeout(async () => {
                console.log(" AGENTIC WORKER: Starting autonomous digital worker");
                setIsAutonomousThinking(true);
                try {
                    // Run the full agentic pipeline (tools + memory + payload)
                    const agenticResult: AgenticRun = await runSmartAgenticWorker(params, { maxSimilarCases: 5 });

                    // Merge insights produced by agentic worker
                    setAutonomousInsights(agenticResult.insights);

                    // Proactive suggestions based on next actions
                    setAutonomousSuggestions(agenticResult.executiveBrief.nextActions);

                    console.log(" AGENTIC WORKER: Run complete", {
                        runId: agenticResult.runId,
                        signal: agenticResult.executiveBrief.proceedSignal,
                        memory: agenticResult.memory.similarCases.length
                    });
                } catch (error) {
                    console.error(" AGENTIC WORKER: Error running digital worker:", error);
                    // Fallback to legacy autonomous solve
                    try {
                        const problem = `Analyze partnership and investment opportunities for ${params.organizationName} in ${params.country}`;
                        const context = {
                            region: params.country,
                            industry: params.industry,
                            dealSize: params.dealSize,
                            strategicIntent: params.strategicIntent
                        };
                        const result = await autonomousSolve(problem, context, params, { autoAct: false, urgency: 'normal' });
                        const fallbackInsights: CopilotInsight[] = result.solutions.map((solution: { action: string; reasoning: string; confidence?: number }, index: number) => ({
                            id: `autonomous-${Date.now()}-${index}`,
                            type: 'strategy' as const,
                            title: `Autonomous Discovery: ${solution.action}`,
                            description: solution.reasoning,
                            content: `Autonomous analysis suggests: ${solution.action}. Reasoning: ${solution.reasoning}`,
                            confidence: solution.confidence || 75,
                            isAutonomous: true
                        }));
                        setAutonomousInsights(fallbackInsights);
                        setAutonomousSuggestions(result.solutions.map((s: { action: string }) => s.action));
                    } catch {
                        // Fallback failed silently
                    }
                } finally {
                    setIsAutonomousThinking(false);
                }
            }, 3000); // Longer delay for autonomous analysis

            return () => clearTimeout(timer);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [params.organizationName, params.country, params.industry, autonomousMode]);

    // BW Consultant AI - Proactive guidance and automatic search
    useEffect(() => {
        if (isConsultantActive && (params.organizationName || params.country || params.industry)) {
            const timer = setTimeout(async () => {
                console.log(' BW Consultant: Analyzing current parameters for insights');
                try {
                    const insights = await bwConsultantAI.consult(params, 'parameter_analysis');
                    setConsultantInsights(insights);

                    // Trigger automatic searches based on params
                    await automaticSearchService.proactiveSearchForReport(params);

                } catch (error) {
                    console.error(' BW Consultant: Error during analysis:', error);
                }
            }, 2000); // 2 second delay to avoid too frequent updates

            return () => clearTimeout(timer);
        }
    }, [params.organizationName, params.country, params.industry, params.region, isConsultantActive, params]);

    // Self-Learning Data Collection - Records performance after report generation
    useEffect(() => {
        if (genPhase === 'complete' && params.id) {
            console.log(" SELF-LEARNING: Recording performance data");
            try {
                // Calculate performance metrics
                const startTime = Date.now() - (genProgress * 1000); // Estimate based on progress
                const generationTime = Date.now() - startTime;

                selfLearningEngine.recordTest({
                    timestamp: new Date().toISOString(),
                    testId: params.id,
                    scenario: 'report_generation',
                    inputs: params,
                    outputs: {
                        spiScore: params.opportunityScore?.totalScore,
                        rroiScore: params.opportunityScore?.marketPotential,
                        reportQuality: 85, // Could be user-rated
                        generationTime: generationTime
                    },
                    feedback: {
                        successful: true,
                        errors: [],
                        warnings: [],
                        suggestions: autonomousSuggestions
                    },
                    improvements: ['Enhanced autonomous analysis', 'Improved insight generation']
                });

                console.log(" SELF-LEARNING: Performance data recorded");
            } catch (error) {
                console.error(" SELF-LEARNING: Error recording data:", error);
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [genPhase, params.id, genProgress, autonomousSuggestions]);

    // Proactive Intelligence Monitoring - Continuous background analysis
    useEffect(() => {
        if (autonomousMode && params.organizationName) {
            const interval = setInterval(async () => {
                try {
                    console.log(" PROACTIVE: Checking for new opportunities");
                    const opportunities = await ReactiveIntelligenceEngine.thinkAndAct(
                        `Monitor for new opportunities related to ${params.organizationName} in ${params.country || 'target markets'}`,
                        params,
                        { autoAct: false, urgency: 'low' }
                    );

                    if (opportunities.actions.length > 0) {
                        const newSuggestions = opportunities.actions.map(action => action.action);
                        setAutonomousSuggestions(prev => [...new Set([...prev, ...newSuggestions])]);
                        console.log(" PROACTIVE: Found", opportunities.actions.length, "new opportunities");
                    }
                } catch (error) {
                    console.error(" PROACTIVE: Error in monitoring:", error);
                }
            }, 30000); // Check every 30 seconds

            return () => clearInterval(interval);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [autonomousMode, params.organizationName, params.country]);

    // --- ACTIONS ---
    const handleEscape = useCallback(() => {
        if (viewMode !== 'report-generator') {
            setViewMode('report-generator');
        }
    }, [viewMode]);

    useEscapeKey(handleEscape);

    const startNewMission = () => {
        const newParams = { 
            ...INITIAL_PARAMETERS, 
            id: Math.random().toString(36).substr(2, 9), 
            createdAt: Date.now().toString(),
            // STRICT FRESH START with proper empty values for placeholders
            organizationName: '',
            userName: '',
            userDepartment: '',
            country: '',
            strategicIntent: [],
            problemStatement: '',
            industry: [],
            region: '',
            organizationType: '', // Reset type
            organizationSubType: ''
        };
        setParams(newParams);
        setReportData(initialReportData);
        setInsights([]);
        setAutonomousInsights([]); // Clear autonomous insights for new mission
        setAutonomousSuggestions([]); // Clear autonomous suggestions
        // UPDATED: Start directly in the Unified Control Matrix
        setViewMode('report-generator'); 
    };

    const loadReport = (report: ReportParameters) => {
        setParams(report);
        setReportData(initialReportData);
        setInsights([]);
        // Always load into Unified Control Matrix
        setViewMode('report-generator');
    };

    const deleteReport = async (id: string) => {
        setSavedReports(prev => prev.filter(r => r.id !== id));
        try {
            await ReportsService.delete(id);
        } catch (error) {
            console.error('Failed to delete report via API', error);
        }
    };

    const handleGenerateReport = useCallback(async () => {
        const consultantGate = ConsultantGateService.evaluate(params);
        if (!consultantGate.isReady) {
            setReportData(prev => ({
                ...prev,
                executiveSummary: {
                    ...prev.executiveSummary,
                    content: `# Consultant Gate Blocked\n\nThe system requires complete consultant-grade intake before report generation.\n\n**Missing required inputs:**\n${consultantGate.missing.map((item) => `- ${item}`).join('\n')}\n\n**Current capture summary:**\n- Who: ${consultantGate.summary.who}\n- Where: ${consultantGate.summary.where}\n- Objective: ${consultantGate.summary.objective}\n- Audience: ${consultantGate.summary.audience}\n- Deadline: ${consultantGate.summary.deadline}`,
                    status: 'completed'
                }
            }));
            return;
        }

        setIsGeneratingReport(true);
        setGenPhase('intake');
        setGenProgress(5);

        // Assemble complete ReportPayload using ReportOrchestrator
        console.log('DEBUG: Starting report generation with ReportOrchestrator');
        const reportPayload = await ReportOrchestrator.assembleReportPayload(params);
        ReportOrchestrator.logPayload(reportPayload); // Debug logging

        // Validate payload completeness
        const validation = ReportOrchestrator.validatePayload(reportPayload);
        if (!validation.isComplete) {
            console.warn('DEBUG: Incomplete payload, missing fields:', validation.missingFields);
        }

        // 
        // ETHICAL GATE ENFORCEMENT  -  block or warn based on ethical assessment
        // 
        const extendedPayload = reportPayload as ReportPayload & { ethicalAssessment?: { gate?: string; conditions?: string[] }; patternIntelligence?: { matchedPatterns?: unknown[] } };
        const ethicalGate = extendedPayload.ethicalAssessment?.gate;
        if (ethicalGate === 'reject') {
            const ethicalReasons = extendedPayload.ethicalAssessment?.conditions || ['Ethical review failed'];
            console.error('ETHICAL GATE: Report generation BLOCKED', ethicalReasons);
            setReportData(prev => ({
                ...prev,
                executiveSummary: {
                    ...prev.executiveSummary,
                    content: `#  Report Generation Blocked  -  Ethical Review\n\nThe NSIL Ethical Reasoning Engine has determined that this engagement cannot proceed in its current form.\n\n**Reasons:**\n${ethicalReasons.map((r: string) => `- ${r}`).join('\n')}\n\n**What this means:** The system has identified fundamental ethical concerns that prevent responsible analysis. This is not a technical limitation  -  it is a governance safeguard.\n\n**Next Steps:**\n- Review and address the ethical concerns identified above\n- Consider restructuring the engagement parameters\n- Consult with compliance officers on the flagged issues\n\n*This gate is enforced by the Autonomous Ethical Reasoning Engine (7-dimension framework) and cannot be overridden.*`,
                    status: 'completed'
                }
            }));
            setGenPhase('complete');
            setGenProgress(100);
            setIsGeneratingReport(false);
            return;
        }
        if (ethicalGate === 'redesign' || ethicalGate === 'proceed-with-conditions') {
            const ethicalWarnings = extendedPayload.ethicalAssessment?.conditions || [];
            console.warn(`ETHICAL GATE: ${ethicalGate}`, ethicalWarnings);
            // Allow generation to proceed but include warning in executive summary
            setReportData(prev => ({
                ...prev,
                executiveSummary: {
                    ...prev.executiveSummary,
                    content: `>  **Ethical Advisory:** ${ethicalWarnings.slice(0, 3).join(' | ')}\n\n`
                }
            }));
        }

        // 
        // DOCUMENT INTEGRITY  -  wrap with provenance tracking
        // 
        const dataSources = ['NSIL Intelligence Hub', 'Pattern Confidence Engine', 'Historical Parallel Matcher',
                             'Situation Analysis Engine', 'Formula Suite (29 formulas)', 'Ethical Reasoning Engine'];
        if ((extendedPayload.patternIntelligence?.matchedPatterns?.length ?? 0) > 0) {
            dataSources.push('Methodology Knowledge Base');
        }
        const integrityConfidence = (reportPayload.confidenceScores?.overall || 50) >= 70 ? 'high' as const
            : (reportPayload.confidenceScores?.overall || 50) >= 45 ? 'medium' as const
            : (reportPayload.confidenceScores?.overall || 50) >= 20 ? 'low' as const
            : 'insufficient-data' as const;
        const integrityHeader = DocumentIntegrityService.generateIntegrityHeader({
            documentType: 'strategic-report',
            confidence: integrityConfidence,
            country: params.country,
            sector: (params.industry || [])[0],
        });
        console.log('INTEGRITY HEADER:', DocumentIntegrityService.formatHeaderForDocument(integrityHeader));

        setReportData(prev => ({
            ...prev,
            confidenceScores: reportPayload.confidenceScores,
            computedIntelligence: reportPayload.computedIntelligence
        }));

        // Extract scores for backward compatibility
        const spiResult = reportPayload.computedIntelligence.spi;
        const marketPotential = reportPayload.confidenceScores.economicReadiness;
        const riskFactors = 100 - reportPayload.confidenceScores.politicalStability;

        const updatedScore = {
            totalScore: spiResult.spi,
            marketPotential: marketPotential,
            riskFactors: riskFactors
        };

        const updatedParams = {
            ...params,
            opportunityScore: updatedScore,
            status: 'generating' as const
        };

        setParams(updatedParams);

        // Save to repository immediately
        setSavedReports(prev => {
            const existing = prev.findIndex(r => r.id === updatedParams.id);
            if (existing >= 0) return prev.map((r, i) => i === existing ? updatedParams : r);
            return [updatedParams, ...prev];
        });

        try {
            await ReportsService.upsert(updatedParams);
        } catch (error) {
            console.error('Failed to persist report (generating)', error);
        }

        // Sim Phases
        await new Promise(r => setTimeout(r, 2000));
        setGenPhase('orchestration'); setGenProgress(25);
        await new Promise(r => setTimeout(r, 3000));
        setGenPhase('modeling'); setGenProgress(50);
        await new Promise(r => setTimeout(r, 2000));
        setGenPhase('synthesis'); setGenProgress(75);

        // Generate Sections with computed intelligence
        const sectionsToGenerate = ['executiveSummary', 'marketAnalysis', 'recommendations', 'implementation', 'financials', 'risks'];
        for (const sectionKey of sectionsToGenerate) {
            setReportData(prev => ({ ...prev, [sectionKey]: { ...prev[sectionKey as keyof ReportData], status: 'generating' } }));

            // Generate content using both AI and computed data
            const enhancedParams = { ...updatedParams, reportPayload };
            await generateReportSectionStream(sectionKey, enhancedParams, (chunk) => {
                setReportData(prev => ({ ...prev, [sectionKey]: { ...prev[sectionKey as keyof ReportData], content: chunk } }));
            });

            setReportData(prev => ({ ...prev, [sectionKey]: { ...prev[sectionKey as keyof ReportData], status: 'completed' } }));
        }

        const completedReport = { ...updatedParams, status: 'complete' as const };
        setGenPhase('complete');
        setGenProgress(100);
        setIsGeneratingReport(false);
        setSavedReports(prev => prev.map(r => r.id === completedReport.id ? completedReport : r));

        try {
            await ReportsService.upsert(completedReport);
        } catch (error) {
            console.error('Failed to persist report (complete)', error);
        }
    }, [params]);

    // Fully Autonomous System Runner
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const runFullyAutonomousSystem = useCallback(async () => {
        setIsFullyAutonomous(true);
        try {
            console.log(' FULLY AUTONOMOUS SYSTEM: Starting self-thinking analysis');

            const result = await runFullyAutonomousAgenticWorker(params, {
                generateDocument: true,
                documentAudience: 'executive',
                executeAutonomousActions: true,
                enableSelfImprovement: true,
                spawnSubAgents: true
            });

            console.log(' FULLY AUTONOMOUS SYSTEM: Analysis complete', {
                runId: result.runId,
                improvements: result.improvements?.length || 0,
                agents: result.spawnedAgents?.length || 0,
                liabilityRisks: result.liabilityAssessment.length
            });

            // Update UI with results
            setAutonomousSystemStatus(result);

        } catch (error) {
            console.error(' FULLY AUTONOMOUS SYSTEM: Error', error);
        } finally {
            setIsFullyAutonomous(false);
        }
    }, [params]);

    // --- RENDER ---

    const renderContent = () => {
        if (viewMode === 'user-manual') {
            return (
                <div className="w-full h-full overflow-y-auto">
                    <UserManual
                        onLaunchOS={() => setViewMode('main')}
                        onOpenCommandCenter={() => setViewMode('command-center')}
                    />
                </div>
            );
        }

        if (viewMode === 'command-center') {
            return (
                <div className="w-full h-full overflow-y-auto">
                    <CommandCenter
                        onEnterPlatform={(payload) => {
                          if (payload?.query) setPendingConsultantQuery(payload.query);
                          setViewMode('consultant-os');
                        }}
                        onOpenGlobalLocationIntel={() => setViewMode('global-location-intel')}
                        onLocationResearched={(data) => setPendingLocationData(data)}
                    />
                </div>
            );
        }

        if (viewMode === 'consultant-os') {
            return (
                <div className="w-full h-full overflow-y-auto">
                    <BWConsultantOS
                        onOpenWorkspace={(payload) => {
                            if (payload?.query) setPendingConsultantQuery(payload.query);
                            setViewMode('main');
                        }}
                    />
                </div>
            );
        }

        if (viewMode === 'main') {
            return (
                <div className="flex flex-1 w-full h-full overflow-hidden">
                    <NSILWorkspace 
                        params={params}
                        setParams={setParams}
                        reportData={reportData}
                        isGenerating={isGeneratingReport}
                        generationPhase={genPhase}
                        generationProgress={genProgress}
                        onGenerate={handleGenerateReport}
                        reports={savedReports}
                        onOpenReport={loadReport}
                        onDeleteReport={deleteReport}
                        onNewAnalysis={startNewMission}
                        onCopilotMessage={(msg) => setInsights(prev => [msg, ...prev])}
                        onChangeViewMode={(mode: string) => setViewMode(mode as ViewMode)}
                        insights={combinedInsights}
                        autonomousMode={autonomousMode}
                        autonomousSuggestions={autonomousSuggestions}
                        isAutonomousThinking={isAutonomousThinking}
                        initialConsultantQuery={pendingConsultantQuery || undefined}
                        onInitialConsultantQueryHandled={() => setPendingConsultantQuery(null)}
                    />
                </div>
            );
        }

        if (viewMode === 'global-location-intel') {
            return (
                <div className="w-full h-full overflow-y-auto">
                    <GlobalLocationIntelligence
                        onBack={() => setViewMode('main')}
                        onOpenCommandCenter={() => setViewMode('command-center')}
                        pendingLocation={pendingLocationData}
                        onLocationLoaded={() => setPendingLocationData(null)}
                    />
                </div>
            );
        }

        if (viewMode === 'admin') {
            return (
                <div className="w-full h-full overflow-y-auto">
                    <AdminDashboard />
                </div>
            );
        }

        if (viewMode === 'intake') {
            return (
                <div className="w-full h-full overflow-y-auto">
                    <Gateway
                        params={params}
                        onUpdate={setParams}
                        onComplete={() => setViewMode('consultant-os')}
                    />
                </div>
            );
        }

        if (viewMode === 'matchmaking') {
            return (
                <div className="w-full h-full overflow-y-auto">
                    <MatchmakingEngine params={params} autoRun />
                </div>
            );
        }

        if (viewMode === 'documents') {
            return (
                <div className="w-full h-full overflow-y-auto">
                    <DocumentGenerationSuite
                        entityName={params.organizationName || undefined}
                        targetMarket={params.country || undefined}
                        reportParams={params}
                        reportData={reportData}
                    />
                </div>
            );
        }


        
        // Fallback or default view
        return (
            <div className="flex flex-1 w-full h-full overflow-hidden">
                <NSILWorkspace 
                    params={params}
                    setParams={setParams}
                    reportData={reportData}
                    isGenerating={isGeneratingReport}
                    generationPhase={genPhase}
                    generationProgress={genProgress}
                    onGenerate={handleGenerateReport}
                    reports={savedReports}
                    onOpenReport={loadReport}
                    onDeleteReport={deleteReport}
                    onNewAnalysis={startNewMission}
                    onCopilotMessage={(msg) => setInsights(prev => [msg, ...prev])}
                    onChangeViewMode={(mode: string) => setViewMode(mode as ViewMode)}
                    insights={combinedInsights}
                    autonomousMode={autonomousMode}
                    autonomousSuggestions={autonomousSuggestions}
                    isAutonomousThinking={isAutonomousThinking}
                    initialConsultantQuery={pendingConsultantQuery || undefined}
                    onInitialConsultantQueryHandled={() => setPendingConsultantQuery(null)}
                />
            </div>
        );
    };

    return (
        <div className="h-screen w-full bg-stone-50 font-sans text-stone-900 flex flex-col overflow-hidden">
            {renderContent()}
        </div>
    );
};

export default App;
