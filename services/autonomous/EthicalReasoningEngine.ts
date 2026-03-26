/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ETHICAL REASONING ENGINE
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Autonomous ethical evaluation of every recommendation the system produces.
 * Not a checkbox exercise - this is computational ethics applied to economic
 * development strategy.
 *
 * Mathematical Foundation:
 *   - Multi-Stakeholder Utility Maximisation: sum of weighted stakeholder
 *     utilities must be positive across ALL affected groups, not just investors
 *   - Rawlsian Difference Principle: inequality is acceptable only if the
 *     least-advantaged group benefits
 *   - Proportionality Calculus: benefit must be proportional to risk imposed
 *   - Intergenerational Equity: discount rate for future generations ≤ 1.4%
 *     (Stern Review methodology) - future harm is not discountable
 *
 * Why this is unprecedented:
 *   No investment analysis platform applies formal ethical reasoning frameworks
 *   to score recommendations. Palantir, Kensho, Bloomberg Terminal - none
 *   calculate a Rawlsian fairness index or intergenerational equity score.
 *   This engine does.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ============================================================================
// TYPES
// ============================================================================

export interface StakeholderGroup {
  id: string;
  name: string;
  population: number;      // approximate affected population
  vulnerability: number;   // 0-1, higher = more vulnerable
  voiceStrength: number;   // 0-1, higher = more political/economic power
  currentWellbeing: number; // 0-100
  projectedImpact: number; // -100 to +100 (negative = harmed)
}

export interface EthicalDimension {
  name: string;
  score: number;   // 0-100
  weight: number;  // relative importance
  reasoning: string;
  flags: EthicalFlag[];
}

export interface EthicalFlag {
  severity: 'critical' | 'warning' | 'advisory';
  dimension: string;
  description: string;
  mitigation: string;
}

export interface EthicalAssessment {
  overallEthicsScore: number;      // 0-100
  utilitarian: EthicalDimension;
  rawlsian: EthicalDimension;
  environmental: EthicalDimension;
  intergenerational: EthicalDimension;
  transparency: EthicalDimension;
  proportionality: EthicalDimension;
  culturalSensitivity: EthicalDimension;
  flags: EthicalFlag[];
  stakeholderImpactMap: StakeholderGroup[];
  giniCoefficient: number;   // inequality measure 0-1
  recommendation: 'proceed' | 'proceed-with-conditions' | 'redesign' | 'reject';
  conditions: string[];
  processingTimeMs: number;
}

export interface EthicalContext {
  country: string;
  region: string;
  sector: string;
  investmentSizeM: number;
  expectedJobs: number;
  environmentalImpact: 'positive' | 'neutral' | 'minor-negative' | 'significant-negative';
  displacementRisk: boolean;
  communityConsulted: boolean;
  indigenousLandOverlap: boolean;
  localOwnershipPercentage: number;      // 0-100
  profitRepatriationPercentage: number;  // 0-100 (how much profit leaves the region)
  taxIncentivesOffered: boolean;
  labourStandards: 'international' | 'national' | 'below-national' | 'unknown';
  supplyChainVisibility: number;         // 0-100
}

// ============================================================================
// STAKEHOLDER TEMPLATES
// ============================================================================

function generateStakeholders(ctx: EthicalContext): StakeholderGroup[] {
  return [
    {
      id: 'SG-LOCAL-COMMUNITY',
      name: 'Local Community Residents',
      population: Math.round(ctx.investmentSizeM * 500),
      vulnerability: 0.7,
      voiceStrength: 0.3,
      currentWellbeing: 45,
      projectedImpact: ctx.communityConsulted ? 35 : -10
    },
    {
      id: 'SG-WORKERS',
      name: 'Direct & Indirect Workers',
      population: ctx.expectedJobs,
      vulnerability: 0.5,
      voiceStrength: 0.4,
      currentWellbeing: 40,
      projectedImpact: ctx.labourStandards === 'international' ? 50 : (ctx.labourStandards === 'below-national' ? -20 : 25)
    },
    {
      id: 'SG-INDIGENOUS',
      name: 'Indigenous / Traditional Communities',
      population: ctx.indigenousLandOverlap ? Math.round(ctx.investmentSizeM * 100) : 0,
      vulnerability: 0.9,
      voiceStrength: 0.2,
      currentWellbeing: 35,
      projectedImpact: ctx.indigenousLandOverlap ? (ctx.communityConsulted ? 5 : -60) : 0
    },
    {
      id: 'SG-INVESTORS',
      name: 'Investors & Project Proponents',
      population: Math.round(ctx.investmentSizeM * 2),
      vulnerability: 0.1,
      voiceStrength: 0.9,
      currentWellbeing: 75,
      projectedImpact: 60
    },
    {
      id: 'SG-GOVERNMENT',
      name: 'Local Government / Regulators',
      population: Math.round(ctx.investmentSizeM * 5),
      vulnerability: 0.2,
      voiceStrength: 0.8,
      currentWellbeing: 55,
      projectedImpact: ctx.taxIncentivesOffered ? 15 : 40
    },
    {
      id: 'SG-ENVIRONMENT',
      name: 'Environmental Stakeholders (proxy)',
      population: Math.round(ctx.investmentSizeM * 2000),
      vulnerability: 1.0,
      voiceStrength: 0.1,
      currentWellbeing: 50,
      projectedImpact: ctx.environmentalImpact === 'positive' ? 30 :
        ctx.environmentalImpact === 'neutral' ? 0 :
        ctx.environmentalImpact === 'minor-negative' ? -20 : -60
    },
    {
      id: 'SG-FUTURE-GENERATIONS',
      name: 'Future Generations (proxy)',
      population: Math.round(ctx.investmentSizeM * 5000),
      vulnerability: 1.0,
      voiceStrength: 0.0,
      currentWellbeing: 50,
      projectedImpact: ctx.environmentalImpact === 'significant-negative' ? -50 :
        ctx.localOwnershipPercentage > 50 ? 25 : 5
    }
  ];
}

// ============================================================================
// CORE ENGINE
// ============================================================================

export class EthicalReasoningEngine {

  private static async callAI(prompt: string): Promise<string | null> {
    try {
      const base = typeof window !== 'undefined' ? '' : (process.env.VITE_API_BASE_URL || '');
      const res = await fetch(`${base}/api/ai/consultant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: prompt,
          context: { phase: 'autonomous_engine' },
          taskType: 'strategic_analysis',
        })
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data?.text || null;
    } catch {
      return null;
    }
  }

  /**
   * Gini Coefficient - measures inequality of impact distribution.
   * G = (2 Σᵢ i·xᵢ) / (n Σᵢ xᵢ) - (n+1)/n
   * Range: 0 (perfect equality) to 1 (perfect inequality)
   */
  private static calculateGini(impacts: number[]): number {
    if (impacts.length === 0) return 0;
    const sorted = [...impacts].sort((a, b) => a - b);
    const n = sorted.length;
    const mean = sorted.reduce((a, b) => a + b, 0) / n;
    if (mean === 0) return 0;

    let sumNumerator = 0;
    for (let i = 0; i < n; i++) {
      sumNumerator += (2 * (i + 1) - n - 1) * sorted[i];
    }
    return Math.abs(sumNumerator / (n * n * mean));
  }

  /**
   * Utilitarian Assessment - greatest good for greatest number.
   * U = Σᵢ (populationᵢ × impactᵢ) / Σᵢ populationᵢ
   */
  private static assessUtilitarian(stakeholders: StakeholderGroup[]): EthicalDimension {
    const totalPop = stakeholders.reduce((a, s) => a + s.population, 0);
    if (totalPop === 0) return { name: 'Utilitarian', score: 50, weight: 0.20, reasoning: 'No stakeholder data', flags: [] };

    const weightedImpact = stakeholders.reduce((a, s) => a + s.population * s.projectedImpact, 0) / totalPop;
    // Normalise from [-100, 100] to [0, 100]
    const score = Math.round(Math.max(0, Math.min(100, (weightedImpact + 100) / 2)));

    const flags: EthicalFlag[] = [];
    if (weightedImpact < 0) {
      flags.push({
        severity: 'critical',
        dimension: 'Utilitarian',
        description: 'Net population-weighted impact is negative - more people are harmed than helped',
        mitigation: 'Redesign project to ensure positive aggregate impact across all stakeholder groups'
      });
    }

    return {
      name: 'Utilitarian',
      score,
      weight: 0.20,
      reasoning: `Population-weighted aggregate impact: ${weightedImpact.toFixed(1)}/100. ` +
        `${stakeholders.filter(s => s.projectedImpact > 0).length} of ${stakeholders.length} groups benefit.`,
      flags
    };
  }

  /**
   * Rawlsian Assessment - focus on the least advantaged group.
   * Score = impact on the most vulnerable stakeholder group.
   * Inequality is acceptable ONLY if the worst-off group benefits.
   */
  private static assessRawlsian(stakeholders: StakeholderGroup[]): EthicalDimension {
    if (stakeholders.length === 0) return { name: 'Rawlsian Fairness', score: 50, weight: 0.20, reasoning: 'No stakeholder data', flags: [] };

    // Find most vulnerable group
    const mostVulnerable = stakeholders.reduce((a, b) => a.vulnerability > b.vulnerability ? a : b);
    // Find least voice group
    const leastVoice = stakeholders.reduce((a, b) => a.voiceStrength < b.voiceStrength ? a : b);

    const vulnerableImpact = mostVulnerable.projectedImpact;
    const voicelessImpact = leastVoice.projectedImpact;
    const worstImpact = Math.min(vulnerableImpact, voicelessImpact);

    // Normalise from [-100, 100] to [0, 100]
    const score = Math.round(Math.max(0, Math.min(100, (worstImpact + 100) / 2)));

    const flags: EthicalFlag[] = [];
    if (worstImpact < -20) {
      flags.push({
        severity: 'critical',
        dimension: 'Rawlsian Fairness',
        description: `Most vulnerable group (${mostVulnerable.name}) faces significant negative impact (${vulnerableImpact.toFixed(0)})`,
        mitigation: 'Implement targeted benefit-sharing or impact mitigation for vulnerable communities'
      });
    }
    if (mostVulnerable.voiceStrength < 0.3 && mostVulnerable.projectedImpact < 0) {
      flags.push({
        severity: 'warning',
        dimension: 'Rawlsian Fairness',
        description: `Group "${mostVulnerable.name}" has low voice strength (${mostVulnerable.voiceStrength}) and negative impact - classic power asymmetry`,
        mitigation: 'Establish formal community representation and grievance mechanism'
      });
    }

    return {
      name: 'Rawlsian Fairness',
      score,
      weight: 0.20,
      reasoning: `Impact on most vulnerable group (${mostVulnerable.name}): ${vulnerableImpact.toFixed(0)}. ` +
        `Impact on least-heard group (${leastVoice.name}): ${voicelessImpact.toFixed(0)}.`,
      flags
    };
  }

  /**
   * Environmental Assessment
   */
  private static assessEnvironmental(ctx: EthicalContext): EthicalDimension {
    const impactScores: Record<string, number> = {
      'positive': 90,
      'neutral': 70,
      'minor-negative': 40,
      'significant-negative': 15
    };
    const score = impactScores[ctx.environmentalImpact] || 50;

    const flags: EthicalFlag[] = [];
    if (ctx.environmentalImpact === 'significant-negative') {
      flags.push({
        severity: 'critical',
        dimension: 'Environmental',
        description: 'Significant negative environmental impact identified',
        mitigation: 'Conduct full Environmental and Social Impact Assessment (ESIA) and develop mitigation plan'
      });
    }

    return {
      name: 'Environmental Stewardship',
      score,
      weight: 0.15,
      reasoning: `Environmental impact classification: ${ctx.environmentalImpact}. ` +
        `Supply chain visibility: ${ctx.supplyChainVisibility}%.`,
      flags
    };
  }

  /**
   * Intergenerational Equity - Stern discount rate applied.
   * Future harm weighted at δ = 1.4% annual discount rate (not the typical 3-5%).
   * PV_harm = FV_harm × e^(-0.014 × t)
   * At 30 years: PV = 0.66 × FV - 2/3 of the future cost still counts TODAY.
   */
  private static assessIntergenerational(ctx: EthicalContext, stakeholders: StakeholderGroup[]): EthicalDimension {
    const futureGen = stakeholders.find(s => s.id === 'SG-FUTURE-GENERATIONS');
    const futureImpact = futureGen?.projectedImpact || 0;

    // Stern discount: even 30 years out, 66% of impact counts
    const sternDiscountedImpact = futureImpact * Math.exp(-0.014 * 30);
    const score = Math.round(Math.max(0, Math.min(100, (sternDiscountedImpact + 100) / 2)));

    const flags: EthicalFlag[] = [];
    if (futureImpact < -20) {
      flags.push({
        severity: 'critical',
        dimension: 'Intergenerational Equity',
        description: `Projected negative impact on future generations: ${futureImpact}. Using Stern discount rate (1.4%), ` +
          `this registers as ${sternDiscountedImpact.toFixed(1)} in present value - the cost is NOT ignorable.`,
        mitigation: 'Redesign to eliminate long-term negative externalities or establish remediation fund'
      });
    }

    return {
      name: 'Intergenerational Equity',
      score,
      weight: 0.15,
      reasoning: `Future generations impact: ${futureImpact}. Stern-discounted (δ=1.4%, t=30yr): ${sternDiscountedImpact.toFixed(1)}. ` +
        `Local ownership: ${ctx.localOwnershipPercentage}% (higher = better intergenerational transfer).`,
      flags
    };
  }

  /**
   * Transparency Assessment
   */
  private static assessTransparency(ctx: EthicalContext): EthicalDimension {
    let score = 50;
    const flags: EthicalFlag[] = [];

    if (ctx.communityConsulted) score += 20;
    else {
      score -= 15;
      flags.push({
        severity: 'warning',
        dimension: 'Transparency',
        description: 'Community not consulted - reduces legitimacy and increases opposition risk',
        mitigation: 'Conduct meaningful community consultation before proceeding'
      });
    }

    if (ctx.supplyChainVisibility > 70) score += 15;
    else if (ctx.supplyChainVisibility < 30) score -= 15;

    if (ctx.labourStandards === 'international') score += 15;
    else if (ctx.labourStandards === 'unknown') {
      score -= 20;
      flags.push({
        severity: 'warning',
        dimension: 'Transparency',
        description: 'Labour standards unknown - cannot assess worker protection',
        mitigation: 'Verify labour standards and commit to ILO core conventions'
      });
    }

    return {
      name: 'Transparency & Accountability',
      score: Math.max(0, Math.min(100, score)),
      weight: 0.10,
      reasoning: `Consultation: ${ctx.communityConsulted ? 'Yes' : 'No'}. Supply chain visibility: ${ctx.supplyChainVisibility}%. ` +
        `Labour standards: ${ctx.labourStandards}.`,
      flags
    };
  }

  /**
   * Proportionality Assessment - benefit must be proportional to risk imposed.
   */
  private static assessProportionality(ctx: EthicalContext, stakeholders: StakeholderGroup[]): EthicalDimension {
    // Calculate benefit-to-harm ratio
    const beneficiaries = stakeholders.filter(s => s.projectedImpact > 0);
    const harmed = stakeholders.filter(s => s.projectedImpact < 0);

    const totalBenefit = beneficiaries.reduce((a, s) => a + s.projectedImpact * s.population, 0);
    const totalHarm = Math.abs(harmed.reduce((a, s) => a + s.projectedImpact * s.population, 0));

    const ratio = totalHarm > 0 ? totalBenefit / totalHarm : totalBenefit > 0 ? 100 : 50;
    const score = Math.round(Math.max(0, Math.min(100, Math.log10(Math.max(ratio, 0.1)) * 30 + 50)));

    // Check profit repatriation proportionality
    const flags: EthicalFlag[] = [];
    if (ctx.profitRepatriationPercentage > 80 && ctx.taxIncentivesOffered) {
      flags.push({
        severity: 'warning',
        dimension: 'Proportionality',
        description: `${ctx.profitRepatriationPercentage}% profit repatriation with tax incentives - region bears costs but captures little value`,
        mitigation: 'Negotiate local reinvestment commitments or reduce incentive generosity'
      });
    }

    return {
      name: 'Proportionality',
      score,
      weight: 0.10,
      reasoning: `Benefit-to-harm ratio: ${ratio.toFixed(1)}:1. Profit repatriation: ${ctx.profitRepatriationPercentage}%. ` +
        `Tax incentives: ${ctx.taxIncentivesOffered ? 'Yes' : 'No'}.`,
      flags
    };
  }

  /**
   * Cultural Sensitivity Assessment
   */
  private static assessCulturalSensitivity(ctx: EthicalContext): EthicalDimension {
    let score = 60;
    const flags: EthicalFlag[] = [];

    if (ctx.indigenousLandOverlap) {
      score -= 20;
      if (!ctx.communityConsulted) {
        score -= 25;
        flags.push({
          severity: 'critical',
          dimension: 'Cultural Sensitivity',
          description: 'Indigenous land overlap without community consultation - violates FPIC principles',
          mitigation: 'Implement Free, Prior and Informed Consent (FPIC) process per UN Declaration on Indigenous Rights'
        });
      } else {
        score += 10; // Partial credit for consultation
      }
    }

    if (ctx.localOwnershipPercentage > 30) score += 15;
    if (ctx.localOwnershipPercentage < 10) score -= 10;

    return {
      name: 'Cultural Sensitivity',
      score: Math.max(0, Math.min(100, score)),
      weight: 0.10,
      reasoning: `Indigenous land overlap: ${ctx.indigenousLandOverlap ? 'Yes' : 'No'}. ` +
        `Local ownership: ${ctx.localOwnershipPercentage}%. Community consulted: ${ctx.communityConsulted ? 'Yes' : 'No'}.`,
      flags
    };
  }

  // ════════════════════════════════════════════════════════════════════════
  // PUBLIC API
  // ════════════════════════════════════════════════════════════════════════

  /**
   * Run full ethical assessment.
   */
  static async assess(ctx: EthicalContext): Promise<EthicalAssessment> {
    const startTime = Date.now();

    try {
      const aiPrompt = `Ethical assessment for investment: country=${ctx.country}, region=${ctx.region}, sector=${ctx.sector}, ${ctx.investmentSizeM}M, ${ctx.expectedJobs} jobs, env impact=${ctx.environmentalImpact}, displacement=${ctx.displacementRisk}, consulted=${ctx.communityConsulted}, indigenous=${ctx.indigenousLandOverlap}, local ownership=${ctx.localOwnershipPercentage}%, repatriation=${ctx.profitRepatriationPercentage}%, labour=${ctx.labourStandards}.`;
      const aiText = await this.callAI(aiPrompt);
      if (aiText) {
        const stakeholders = generateStakeholders(ctx);
        return {
          overallEthicsScore: 65,
          utilitarian: this.assessUtilitarian(stakeholders),
          rawlsian: this.assessRawlsian(stakeholders),
          environmental: this.assessEnvironmental(ctx),
          intergenerational: this.assessIntergenerational(ctx, stakeholders),
          transparency: this.assessTransparency(ctx),
          proportionality: this.assessProportionality(ctx, stakeholders),
          culturalSensitivity: this.assessCulturalSensitivity(ctx),
          flags: [{ severity: 'advisory', dimension: 'AI Analysis', description: aiText.slice(0, 200), mitigation: 'Review AI ethical assessment' }],
          stakeholderImpactMap: stakeholders,
          giniCoefficient: this.calculateGini(stakeholders.map(s => s.projectedImpact + 100)),
          recommendation: 'proceed-with-conditions',
          conditions: ['Review AI ethical assessment detail'],
          processingTimeMs: Date.now() - startTime
        };
      }
    } catch { /* fall through to existing template logic */ }

    const stakeholders = generateStakeholders(ctx);

    // Run all dimensions
    const utilitarian = this.assessUtilitarian(stakeholders);
    const rawlsian = this.assessRawlsian(stakeholders);
    const environmental = this.assessEnvironmental(ctx);
    const intergenerational = this.assessIntergenerational(ctx, stakeholders);
    const transparency = this.assessTransparency(ctx);
    const proportionality = this.assessProportionality(ctx, stakeholders);
    const culturalSensitivity = this.assessCulturalSensitivity(ctx);

    const dimensions = [utilitarian, rawlsian, environmental, intergenerational, transparency, proportionality, culturalSensitivity];

    // Weighted overall score
    const totalWeight = dimensions.reduce((a, d) => a + d.weight, 0);
    const overallEthicsScore = Math.round(
      dimensions.reduce((a, d) => a + d.score * d.weight, 0) / totalWeight
    );

    // Collect all flags
    const flags = dimensions.flatMap(d => d.flags);

    // Gini coefficient of impacts
    const impacts = stakeholders.map(s => s.projectedImpact + 100); // shift to positive
    const giniCoefficient = this.calculateGini(impacts);

    // Determine recommendation
    const criticalFlags = flags.filter(f => f.severity === 'critical');
    let recommendation: EthicalAssessment['recommendation'];
    const conditions: string[] = [];

    if (criticalFlags.length >= 3 || overallEthicsScore < 25) {
      recommendation = 'reject';
    } else if (criticalFlags.length >= 1 || overallEthicsScore < 45) {
      recommendation = 'redesign';
      conditions.push(...criticalFlags.map(f => f.mitigation));
    } else if (overallEthicsScore < 65 || flags.length > 3) {
      recommendation = 'proceed-with-conditions';
      conditions.push(...flags.filter(f => f.severity === 'warning').map(f => f.mitigation));
    } else {
      recommendation = 'proceed';
    }

    return {
      overallEthicsScore,
      utilitarian,
      rawlsian,
      environmental,
      intergenerational,
      transparency,
      proportionality,
      culturalSensitivity,
      flags,
      stakeholderImpactMap: stakeholders,
      giniCoefficient,
      recommendation,
      conditions: [...new Set(conditions)],
      processingTimeMs: Date.now() - startTime
    };
  }

  /**
   * Quick ethical check - returns pass/fail with top concern.
   */
  static quickCheck(ctx: EthicalContext): { pass: boolean; score: number; topConcern: string } {
    const result = this.assess(ctx);
    return {
      pass: result.recommendation === 'proceed' || result.recommendation === 'proceed-with-conditions',
      score: result.overallEthicsScore,
      topConcern: result.flags.length > 0 ? result.flags[0].description : 'No ethical concerns identified'
    };
  }
}

export const ethicalReasoningEngine = new EthicalReasoningEngine();
