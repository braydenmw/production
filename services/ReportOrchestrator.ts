import { ReportParameters, ReportPayload, SPIResult, RROI_Index, SEAM_Blueprint, SymbioticPartner, DiversificationAnalysis, EthicalCheckResult, RefinedIntake, RegionProfile, MarketShare, AgenticBrainSnapshot, ProactiveBriefing } from '../types';
import { calculateSPI, generateRROI, generateSEAM, generateSymbioticMatches, runEthicalSafeguards } from './engine';
import { MarketDiversificationEngine } from './engine';
import { runOpportunityOrchestration } from './engine';
import { GLOBAL_CITY_DATABASE } from '../constants';
import { mapToSPI, mapToIVAS, mapToSCF } from './intakeMapping';
import DerivedIndexService from './DerivedIndexService';
import AdvancedIndexService from './MissingFormulasEngine';
import AdversarialReasoningService from './AdversarialReasoningService';
import { EventBus } from './EventBus';
import { GovernanceService } from './GovernanceService';
import { optimizedAgenticBrain } from './algorithms/OptimizedAgenticBrain';
import { computeFrontierIntelligence } from './algorithms/FrontierIntelligenceEngine';
import { masterAutonomousOrchestrator } from './MasterAutonomousOrchestrator';
import { proactiveOrchestrator } from './proactive/ProactiveOrchestrator';
import { NSILIntelligenceHub } from './NSILIntelligenceHub';
import { SituationAnalysisEngine } from './SituationAnalysisEngine';
import { HistoricalParallelMatcher } from './HistoricalParallelMatcher';
import { ConsultantGateService } from './ConsultantGateService';
import { RegionalDevelopmentOrchestrator } from './RegionalDevelopmentOrchestrator';
import type { PartnerCandidate } from './PartnerIntelligenceEngine';
import type { CurrentContext } from './proactive/ProactiveSignalMiner';

const clampValue = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const REGIONAL_KERNEL_PARTNERS: PartnerCandidate[] = [
  { id: 'gov-dev-agency', name: 'Development Agency', type: 'government', countries: ['philippines', 'australia', 'new zealand', 'united kingdom', 'united states'], sectors: ['regional development', 'policy', 'infrastructure'] },
  { id: 'multilateral-bank', name: 'Multilateral Bank', type: 'multilateral', countries: ['philippines', 'australia', 'new zealand', 'united kingdom', 'united states'], sectors: ['energy', 'housing', 'digital', 'health', 'infrastructure'] },
  { id: 'banking-consortium', name: 'Banking Consortium', type: 'bank', countries: ['philippines', 'australia', 'new zealand', 'united kingdom'], sectors: ['banking', 'trade', 'housing', 'energy'] },
  { id: 'delivery-partner', name: 'Delivery Partner', type: 'corporate', countries: ['philippines', 'australia', 'new zealand', 'united kingdom'], sectors: ['logistics', 'infrastructure', 'digital'] }
];

export class ReportOrchestrator {
  static async assembleReportPayload(params: ReportParameters): Promise<ReportPayload> {
    console.log('DEBUG: Starting ReportOrchestrator assembly for', params.organizationName);

    const consultantGate = ConsultantGateService.evaluate(params);
    if (!consultantGate.isReady) {
      throw new Error(`Consultant gate blocked payload assembly: ${consultantGate.missing.join('; ')}`);
    }

    const caseMethodGaps = this.evaluateCaseMethodGaps(params);
    if (caseMethodGaps.length > 0) {
      throw new Error(`Case Method Layer blocked payload assembly: ${caseMethodGaps.join('; ')}`);
    }

    const regionalKernel = RegionalDevelopmentOrchestrator.run({
      regionProfile: params.region || params.organizationType || params.problemStatement || '',
      sector: params.industry && params.industry.length > 0 ? params.industry[0] : 'regional development',
      constraints: params.riskTolerance ? String(params.riskTolerance) : 'Not specified',
      fundingEnvelope: params.dealSize || 'Not specified',
      governanceContext: [params.organizationType, params.entityClassification, params.userDepartment].filter(Boolean).join(' '),
      country: params.country || params.userCountry || 'unspecified',
      jurisdiction: params.region || params.country || 'unspecified',
      objective: params.problemStatement || params.reportName,
      currentMatter: params.problemStatement || params.reportName,
      evidenceNotes: [
        ...(params.strategicIntent || []),
        ...(params.additionalContext ? [params.additionalContext] : [])
      ].slice(0, 12),
      partnerCandidates: REGIONAL_KERNEL_PARTNERS
    });

    // All reports run at full autonomous performance " no separate mode needed
    const refinedIntake = this.toRefinedIntake(params);
    const spiInput = mapToSPI(refinedIntake);
    const ivasInput = mapToIVAS(refinedIntake);
    const scfInput = mapToSCF(refinedIntake);

    // Run all intelligence engines in parallel (including NSIL autonomous layer)
    const [
      spiResult,
      rroiResult,
      seamResult,
      symbioticPartners,
      diversificationAnalysis,
      ethicsCheck, 
      orchestrationResult,
      priResult,
      tcoResult,
      criResult,
      advancedIndices,
      adversarialStack,
      agenticBrainResult,
      nsilReport,
      situationAnalysis,
      historicalParallels
    ] = await Promise.all([
      calculateSPI(params),
      generateRROI(params),
      generateSEAM(params),
      generateSymbioticMatches(params),
      this.runDiversificationAnalysis(params),
      runEthicalSafeguards(params), 
      runOpportunityOrchestration(this.buildRegionProfile(params)),
      DerivedIndexService.calculatePRI(params),
      DerivedIndexService.calculateTCO(params),
      DerivedIndexService.calculateCRI(params),
      AdvancedIndexService.computeIndices(params),
      AdversarialReasoningService.generate(params),
      optimizedAgenticBrain.think(params).catch(() => null),
      NSILIntelligenceHub.runFullAnalysis(params).catch((err) => { console.warn('NSIL full analysis error (non-blocking):', err); return null; }),
      Promise.resolve(SituationAnalysisEngine.analyse(params)),
      Promise.resolve(HistoricalParallelMatcher.match(params))
    ]);

    console.log('DEBUG: All engines completed');

    // Build the structured payload
    const agenticBrainSnapshot = agenticBrainResult ? this.toAgenticBrainSnapshot(agenticBrainResult) : undefined;
    const frontierIntelligence = await computeFrontierIntelligence(params, {
      spi: spiResult,
      rroi: rroiResult,
      seam: seamResult,
      advancedIndices,
      adversarialConfidence: adversarialStack.adversarialConfidence,
      agenticBrain: agenticBrainSnapshot
    });

    let proactiveBriefing: ProactiveBriefing | undefined;
    try {
      const proactiveContext = this.buildProactiveContext(params);
      proactiveBriefing = await proactiveOrchestrator.runProactiveCycle(proactiveContext);
    } catch (error) {
      console.warn('Proactive cycle failed:', error);
    }

    const payload: ReportPayload = {
      metadata: {
        requesterType: params.organizationType,
        country: params.country,
        region: params.region,
        timestamp: new Date().toISOString(),
        reportId: params.id,
        dataSources: [
          'World Bank Open Data API',
          'Open Exchange Rates API',
          'REST Countries API',
          'Monte Carlo Simulation (200 trials)',
          'Composite Score Engine v2'
        ]
      },
      problemDefinition: {
        statedProblem: params.problemStatement,
        constraints: params.calibration?.constraints ?
          Object.values(params.calibration.constraints).filter(c => typeof c === 'string') as string[] :
          [],
        urgency: params.expansionTimeline
      },
      regionalProfile: this.buildReportPayloadRegionalProfile(params),
      economicSignals: this.buildEconomicSignals(params, rroiResult),
      opportunityMatches: this.buildOpportunityMatches(symbioticPartners, spiResult),
      risks: this.buildRisks(params, ethicsCheck),
      recommendations: this.buildRecommendations(seamResult, diversificationAnalysis),
      confidenceScores: this.buildConfidenceScores(spiResult),
      computedIntelligence: {
        spi: spiResult,
        rroi: rroiResult,
        seam: seamResult,
        symbioticPartners,
        diversificationAnalysis,
        ethicsCheck,
        ivas: orchestrationResult.details.ivas,
        scf: orchestrationResult.details.scf,
        intakeMapping: {
          refinedIntake,
          spiInput,
          ivasInput,
          scfInput
        },
        pri: priResult,
        tco: tcoResult,
        cri: criResult,
        advancedIndices,
        adversarialShield: adversarialStack.adversarialShield,
        personaPanel: adversarialStack.personaPanel,
        motivationAnalysis: adversarialStack.motivation,
        counterfactuals: adversarialStack.counterfactuals,
        outcomeLearning: adversarialStack.outcomeLearning,
        adversarialConfidence: adversarialStack.adversarialConfidence,
        agenticBrain: agenticBrainSnapshot,
        frontierIntelligence,
        proactiveBriefing,
        // NSIL Autonomous Intelligence Layer
        nsilIntelligence: nsilReport ? {
          autonomous: nsilReport.autonomous,
          recommendation: nsilReport.recommendation,
          inputValidation: { overallTrust: nsilReport.inputValidation.overallTrust, overallStatus: nsilReport.inputValidation.overallStatus },
          processingTime: nsilReport.processingTime,
          componentsRun: nsilReport.componentsRun
        } : undefined,
        // Situation Analysis " multi-perspective view
        situationAnalysis: situationAnalysis ? {
          explicitNeeds: situationAnalysis.explicitNeeds,
          implicitNeeds: situationAnalysis.implicitNeeds,
          unconsideredNeeds: situationAnalysis.unconsideredNeeds,
          blindSpots: situationAnalysis.blindSpots,
          recommendedQuestions: situationAnalysis.recommendedQuestions,
          overallReadiness: situationAnalysis.overallReadiness,
          stakeholderViews: situationAnalysis.stakeholderViews,
          timeHorizonDivergence: situationAnalysis.timeHorizonDivergence
        } : undefined,
        // Historical Parallel Matching
        historicalParallels: historicalParallels ? {
          matches: historicalParallels.matches.slice(0, 3),
          synthesisInsight: historicalParallels.synthesisInsight,
          successRate: historicalParallels.successRate,
          commonSuccessFactors: historicalParallels.commonSuccessFactors,
          commonFailureFactors: historicalParallels.commonFailureFactors,
          recommendedActions: historicalParallels.recommendedActions
        } : undefined,
        regionalKernel: {
          governanceReadiness: regionalKernel.governanceReadiness,
          interventions: regionalKernel.interventions,
          topPartners: regionalKernel.partners.slice(0, 5),
          executionPlan: regionalKernel.executionPlan,
          dataFabric: {
            confidence: regionalKernel.dataFabric.overallConfidence,
            freshnessHours: regionalKernel.dataFabric.overallFreshnessHours,
            country: regionalKernel.dataFabric.country,
            jurisdiction: regionalKernel.dataFabric.jurisdiction
          },
          notes: regionalKernel.notes
        }
      }
    };

    console.log('DEBUG: ReportPayload assembled successfully');

    // Run autonomous enhancement steps (always-on full performance)
    try {
      const masterEnhancements = await masterAutonomousOrchestrator.runEnhancements(params, payload);
      console.log('Autonomous enhancements applied:', masterEnhancements.confidence);
    } catch (error) {
      console.warn('Autonomous enhancements skipped (non-blocking):', error);
    }

    // Publish payload and intake mapping for subscribers (consultant, live builder, exporters)
    try {
      if (payload.metadata.reportId) {
        EventBus.publish({ type: 'payloadAssembled', reportId: payload.metadata.reportId, payload });
        GovernanceService.recordProvenance({
          reportId: payload.metadata.reportId,
          artifact: 'report-payload',
          action: 'assembled',
          actor: 'ReportOrchestrator',
          source: 'intelligence-engines',
          tags: ['live-recalc']
        });
        if (payload.computedIntelligence?.intakeMapping) {
          EventBus.publish({
            type: 'intakeUpdated',
            reportId: payload.metadata.reportId,
            snapshot: payload.computedIntelligence.intakeMapping
          });
        }
        // Ecosystem pulse from SEAM + RROI
        const alignment = Math.min(100, (seamResult?.score || 70));
        const bottlenecks = (seamResult?.gaps || []).slice(0, 3);
        const opportunities = [
          `Infrastructure readiness ${rroiResult.components.infrastructure.score}/100`,
          `Talent availability ${rroiResult.components.talent.score}/100`
        ];
        EventBus.publish({ type: 'ecosystemPulse', reportId: payload.metadata.reportId, signals: { alignment, bottlenecks, opportunities } });
      }
    } catch (error) {
      console.warn('Error processing report ecosystem pulse:', error);
    }
    return payload;
  }

  private static evaluateCaseMethodGaps(params: ReportParameters): string[] {
    const gaps: string[] = [];

    if (!params.problemStatement || params.problemStatement.trim().length < 60) gaps.push('Boundary clarity');

    const objectiveStrength = (params.strategicIntent || []).join(' ').trim().length;
    if (objectiveStrength < 20) gaps.push('Objective quality');

    const hasEvidence = Boolean(params.additionalContext?.trim()) || (params.ingestedDocuments?.length || 0) > 0;
    if (!hasEvidence) gaps.push('Evidence sufficiency');

    const hasRival = /counterfactual|alternative|rival|other option/i.test(`${params.additionalContext || ''} ${(params.collaborativeNotes || '')}`);
    if (!hasRival) gaps.push('Rival explanations');

    const hasImplementation = Boolean(params.expansionTimeline?.trim()) && /owner|go-no-go|critical path|authority|escalation/i.test(
      `${params.criticalPath || ''} ${params.goNoGoCriteria || ''} ${params.authorityMatrix || ''} ${params.escalationProcedures || ''}`
    );
    if (!hasImplementation) gaps.push('Implementation feasibility');

    return gaps;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static toAgenticBrainSnapshot(result: any): AgenticBrainSnapshot {
    return {
      proceedSignal: result.executiveBrief.proceedSignal,
      headline: result.executiveBrief.headline,
      consensusStrength: result.executiveBrief.consensusStrength,
      topDrivers: result.executiveBrief.topDrivers || [],
      topRisks: result.executiveBrief.topRisks || [],
      nextActions: result.executiveBrief.nextActions || [],
      performance: {
        totalTimeMs: result.performance.totalTimeMs,
        inputValidationMs: result.performance.inputValidationMs,
        memoryRetrievalMs: result.performance.memoryRetrievalMs,
        reasoningMs: result.performance.reasoningMs,
        synthesisMs: result.performance.synthesisMs,
        speedupFactor: result.performance.speedupFactor
      },
      trustScore: result.inputValidation.trustScore,
      contradictions: result.inputValidation.contradictions?.contradictions?.length || 0
    };
  }

  private static buildRegionProfile(params: ReportParameters): RegionProfile {
    const cityData = GLOBAL_CITY_DATABASE[params.country];
    const population = cityData?.population ?? 10_000_000;
    const gdpBillion = cityData?.gdp.totalBillionUSD ?? 100;
    const regulatoryComplexity = cityData
      ? clampValue(100 - (cityData.businessEnvironment.regulatoryQuality ?? 60), 5, 90)
      : undefined;
    const permitBacklogMonths = cityData
      ? clampValue(
          18 - (cityData.businessEnvironment.easeOfDoingBusiness ?? 60) / 10 +
            (cityData.businessEnvironment.corruptionIndex ?? 50) / 20,
          4,
          36
        )
      : undefined;

    return {
      id: `${params.country || 'unknown'}-${params.region || 'region'}`,
      name: params.country || 'Target Region',
      country: params.country,
      population,
      gdp: gdpBillion * 1_000_000_000,
      rawFeatures: cityData ? [
        { name: 'Infrastructure', rarityScore: cityData.infrastructure.transportation, relevanceScore: 80, marketProxy: cityData.infrastructure.digital },
        { name: 'Talent Pool', rarityScore: cityData.talentPool.skillsAvailability, relevanceScore: 85, marketProxy: cityData.talentPool.educationLevel }
      ] : [],
      sectorHint: params.industry?.[0],
      regulatoryComplexity,
      permitBacklogMonths,
      infrastructureSignal: cityData?.infrastructure.transportation,
      talentSignal: cityData?.talentPool.skillsAvailability
    };
  }

  private static buildProactiveContext(params: ReportParameters): CurrentContext {
    const sector = params.industry?.[0] || params.customIndustry || params.industryClassification || 'General';
    const strategy = params.strategicMode || params.strategicIntent?.[0] || params.problemStatement || 'General';
    const investmentSizeM = this.extractInvestmentSizeM(params);
    const keyFactors = this.collectKeyFactors(params);

    return {
      country: params.country,
      sector,
      strategy,
      investmentSizeM,
      year: new Date().getFullYear(),
      keyFactors
    };
  }

  private static collectKeyFactors(params: ReportParameters): string[] {
    const rawFactors = [
      ...(params.strategicObjectives ?? []),
      ...(params.priorityThemes ?? []),
      ...(params.targetIncentives ?? []),
      ...(params.partnerFitCriteria ?? []),
      ...(params.relationshipGoals ?? []),
      params.stakeholderConcerns,
      params.organizationDescription
    ].filter(Boolean) as string[];

    return rawFactors.map(f => String(f)).slice(0, 12);
  }

  private static extractInvestmentSizeM(params: ReportParameters): number {
    const stringCandidates = [
      params.totalInvestment,
      params.calibration?.constraints?.budgetCap
    ];

    for (const candidate of stringCandidates) {
      const parsed = this.parseMoneyToMillions(candidate);
      if (parsed && parsed > 0) return parsed;
    }

    const budgetUSD = (params as { budgetUSD?: number }).budgetUSD;
    if (typeof budgetUSD === 'number' && budgetUSD > 0) {
      return budgetUSD / 1_000_000;
    }

    return 250;
  }

  private static parseMoneyToMillions(value?: string): number | null {
    if (!value) return null;
    const normalized = value.toLowerCase();
    const numMatch = normalized.match(/[\d,.]+/);
    if (!numMatch) return null;

    const raw = Number(numMatch[0].replace(/,/g, ''));
    if (!Number.isFinite(raw)) return null;

    if (normalized.includes('billion') || normalized.includes('b')) return raw * 1000;
    if (normalized.includes('million') || normalized.includes('m')) return raw;
    if (normalized.includes('thousand') || normalized.includes('k')) return raw / 1000;

    return raw / 1_000_000;
  }

  private static buildReportPayloadRegionalProfile(params: ReportParameters): ReportPayload['regionalProfile'] {
    const cityData = GLOBAL_CITY_DATABASE[params.country];
    return {
      demographics: {
        population: cityData?.population || 10000000,
        gdpPerCapita: cityData?.gdp.perCapitaUSD || 50000,
        laborCosts: cityData?.talentPool.laborCosts || 50
      },
      infrastructure: {
        transportation: cityData?.infrastructure.transportation || 70,
        digital: cityData?.infrastructure.digital || 70,
        utilities: cityData?.infrastructure.utilities || 70
      },
      logistics: {
        regionalConnectivity: cityData?.marketAccess.regionalConnectivity || 70,
        exportPotential: cityData?.marketAccess.exportPotential || 70
      }
    };
  }

  private static buildEconomicSignals(params: ReportParameters, rroi: RROI_Index): ReportPayload['economicSignals'] {
    return {
      tradeExposure: rroi.components.market.score,
      tariffSensitivity: 100 - rroi.components.regulatory.score,
      costAdvantages: [
        `Labor costs ${params.region === 'Asia-Pacific' ? 'below' : 'above'} global average`,
        `Infrastructure readiness: ${rroi.components.infrastructure.score}/100`,
        `Talent availability: ${rroi.components.talent.score}/100`
      ],
      bottleneckReliefPotential: rroi.overallScore
    };
  }

  private static buildOpportunityMatches(symbioticPartners: SymbioticPartner[], spi: SPIResult): ReportPayload['opportunityMatches'] {
    return {
      sectors: symbioticPartners.map(p => p.entityType),
      partnerTypes: symbioticPartners.map(p => p.location),
      riskAdjustedROI: spi.spi
    };
  }

  private static buildRisks(params: ReportParameters, ethicsCheck: EthicalCheckResult): ReportPayload['risks'] {
    const cityData = GLOBAL_CITY_DATABASE[params.country];
    
    // Calculate dynamic operational metrics based on actual inputs
    const baseSupplyChainRisk = params.region === 'Asia-Pacific' ? 35 : 
                                params.region === 'Europe' ? 25 :
                                params.region === 'North America' ? 20 :
                                params.region === 'Emerging Markets' ? 55 : 45;
    
    // Adjust for industry
    const industryRiskModifier = params.industry?.some(i => 
      i.includes('Manufacturing') || i.includes('Agriculture')
    ) ? 15 : 0;
    
    const supplyChainDependency = Math.min(95, baseSupplyChainRisk + industryRiskModifier);
    
    // Calculate currency risk dynamically
    const currencyRiskMap: Record<string, string> = {
      'Emerging Markets': 'High volatility expected - consider hedging',
      'Asia-Pacific': 'Moderate volatility - monitor exchange rates',
      'Europe': 'Relatively stable - EUR/local currency considerations',
      'North America': 'Low volatility - USD stability',
      'Middle East': 'Currency peg risks - oil price sensitivity',
      'Africa': 'High volatility - local currency exposure risk',
      'Latin America': 'High volatility - inflation considerations'
    };
    
    return {
      political: {
        stabilityScore: cityData?.businessEnvironment.regulatoryQuality || 70,
        regionalConflictRisk: params.region === 'Middle East' ? 80 : 
                              params.region === 'Africa' ? 60 :
                              params.region === 'Emerging Markets' ? 45 : 30
      },
      regulatory: {
        corruptionIndex: cityData?.businessEnvironment.corruptionIndex || 50,
        regulatoryFriction: 100 - (cityData?.businessEnvironment.easeOfDoingBusiness || 70),
        complianceRoadmap: ethicsCheck.mitigation.map(m => m.detail)
      },
      operational: {
        supplyChainDependency,
        currencyRisk: currencyRiskMap[params.region || ''] || 'Moderate stability - assess local conditions'
      }
    };
  }

  private static buildRecommendations(seam: SEAM_Blueprint, diversification: DiversificationAnalysis): ReportPayload['recommendations'] {
    return {
      shortTerm: seam.gaps.slice(0, 2),
      midTerm: diversification.recommendedMarkets.slice(0, 2).map(m => m.recommendedStrategy),
      longTerm: seam.partners.map(p => `Partner with ${p.name} for ${p.role}`)
    };
  }

  private static buildConfidenceScores(spi: SPIResult): ReportPayload['confidenceScores'] {
    return {
      overall: spi.spi,
      economicReadiness: spi.breakdown.find(b => b.label === 'Economic Readiness')?.value || 70,
      symbioticFit: spi.breakdown.find(b => b.label === 'Symbiotic Fit')?.value || 70,
      politicalStability: spi.breakdown.find(b => b.label === 'Political Stability')?.value || 70,
      partnerReliability: spi.breakdown.find(b => b.label === 'Partner Reliability')?.value || 70,
      ethicalAlignment: spi.breakdown.find(b => b.label === 'Ethical Alignment')?.value || 70,
      activationVelocity: spi.breakdown.find(b => b.label === 'Activation Velocity')?.value || 70,
      transparency: spi.breakdown.find(b => b.label === 'Transparency')?.value || 70
    };
  }

  private static async runDiversificationAnalysis(params: ReportParameters): Promise<DiversificationAnalysis> {
    // Generate dynamic market shares based on actual parameters
    const markets: MarketShare[] = [];
    
    // Primary market from params
    if (params.country) {
      markets.push({ country: params.country, share: 60 });
    }
    
    // Add diversification markets based on region
    const regionMarkets: Record<string, string[]> = {
      'Asia-Pacific': ['Vietnam', 'Indonesia', 'Thailand', 'Malaysia'],
      'Europe': ['Poland', 'Czech Republic', 'Romania', 'Portugal'],
      'North America': ['Mexico', 'Canada', 'Costa Rica'],
      'Emerging Markets': ['India', 'Brazil', 'South Africa', 'Turkey'],
      'Middle East': ['UAE', 'Saudi Arabia', 'Qatar', 'Egypt'],
      'Africa': ['Morocco', 'Kenya', 'Nigeria', 'Ghana'],
      'Latin America': ['Chile', 'Colombia', 'Peru', 'Argentina']
    };
    
    const alternativeMarkets = regionMarkets[params.region || 'Asia-Pacific'] || ['Vietnam', 'India'];
    
    // Distribute remaining 40% among alternatives
    const remainingShare = params.country ? 40 : 100;
    const perMarketShare = remainingShare / alternativeMarkets.length;
    
    alternativeMarkets.forEach((country, idx) => {
      if (country !== params.country) {
        markets.push({ 
          country, 
          share: Math.round(perMarketShare * (1 - idx * 0.15)) // Decreasing shares
        });
      }
    });
    
    // Normalize to 100%
    const total = markets.reduce((sum, m) => sum + m.share, 0);
    markets.forEach(m => m.share = Math.round((m.share / total) * 100));

    return MarketDiversificationEngine.analyzeConcentration(markets);
  }

  // Method to validate payload completeness
  static validatePayload(payload: ReportPayload): { isComplete: boolean; missingFields: string[] } {
    const missingFields: string[] = [];

    // Check metadata
    if (!payload.metadata.requesterType) missingFields.push('metadata.requesterType');
    if (!payload.metadata.country) missingFields.push('metadata.country');

    // Check problem definition
    if (!payload.problemDefinition.statedProblem) missingFields.push('problemDefinition.statedProblem');

    // Check regional profile
    if (!payload.regionalProfile.demographics) missingFields.push('regionalProfile.demographics');

    // Check confidence scores
    if (payload.confidenceScores.overall === undefined) missingFields.push('confidenceScores.overall');

    return {
      isComplete: missingFields.length === 0,
      missingFields
    };
  }

  // Method to log payload for debugging
  static logPayload(payload: ReportPayload): void {
    console.log('=== REPORT PAYLOAD EXTRACTION LOG ===');
    console.log('Metadata:', payload.metadata);
    console.log('Problem Definition:', payload.problemDefinition);
    console.log('Regional Profile:', payload.regionalProfile);
    console.log('Economic Signals:', payload.economicSignals);
    console.log('Opportunity Matches:', payload.opportunityMatches);
    console.log('Risks:', payload.risks);
    console.log('Recommendations:', payload.recommendations);
    console.log('Confidence Scores:', payload.confidenceScores);
    console.log('Computed Intelligence Keys:', Object.keys(payload.computedIntelligence));
    console.log('=====================================');
  }

  private static toRefinedIntake(params: ReportParameters): RefinedIntake {
    const yearsOperating = params.yearsOperation ? Number(params.yearsOperation) : undefined;
    return {
      identity: {
        entityName: params.organizationName || 'Unnamed Entity',
        registrationCountry: params.country,
        registrationCity: params.userCity,
        industryClassification: params.industry?.[0],
        legalStructure: params.organizationType,
        yearsOperating: Number.isFinite(yearsOperating) ? yearsOperating : undefined,
      },
      mission: {
        strategicIntent: params.strategicIntent || [],
        objectives: params.strategicObjectives || [],
        timelineHorizon: params.expansionTimeline as RefinedIntake['mission']['timelineHorizon'],
      },
      counterparties: (params.partnerPersonas || []).map(name => ({ name, relationshipStage: 'intro' })),
      constraints: {
        budgetUSD: params.dealSize ? Number(params.dealSize) : undefined,
        riskTolerance: params.riskTolerance as 'low' | 'medium' | 'high' | undefined,
      },
      proof: { documents: [] },
      contacts: {},
    };
  }
}
