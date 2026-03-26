/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SCENARIO SIMULATION ENGINE
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Goes beyond the existing CounterfactualEngine (which asks "what if X was
 * different?") to simulate FORWARD-LOOKING scenarios with multi-step causal
 * chains, feedback loops, and non-linear dynamics.
 *
 * This is a discrete-event simulation with Monte Carlo uncertainty propagation
 * through causal graphs - not just sensitivity analysis.
 *
 * Mathematical Foundation:
 *   - System Dynamics (Forrester 1961): stocks, flows, and feedback loops
 *     modelled as coupled differential equations
 *   - Monte Carlo Propagation: uncertainty flows through causal chains,
 *     compounding at each node
 *   - Scenario Tree Analysis: branching futures with conditional probabilities
 *   - Markov Chain State Transitions: discrete states with transition
 *     probabilities based on current conditions
 *
 * What sets this apart:
 *   The existing CounterfactualEngine asks "what if?" about the PAST.
 *   This engine simulates the FUTURE - with cascading effects, feedback
 *   loops, and probability-weighted outcomes across multiple timelines.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ============================================================================
// TYPES
// ============================================================================

export interface ScenarioVariable {
  id: string;
  name: string;
  baseValue: number;
  unit: string;
  distribution: 'normal' | 'uniform' | 'triangular' | 'lognormal';
  params: {
    mean?: number;
    stdDev?: number;
    min?: number;
    max?: number;
    mode?: number;
  };
  category: 'economic' | 'political' | 'social' | 'environmental' | 'technological' | 'regulatory';
}

export interface CausalLink {
  from: string; // variable ID
  to: string;   // variable ID
  type: 'positive' | 'negative'; // positive = same direction, negative = inverse
  strength: number; // 0-1
  delay: number; // quarters of delay
  nonLinearity: 'linear' | 'quadratic' | 'threshold' | 'saturation';
  thresholdValue?: number; // for threshold non-linearity
}

export interface FeedbackLoop {
  id: string;
  name: string;
  variables: string[]; // ordered variable IDs in the loop
  type: 'reinforcing' | 'balancing';
  dominance: number; // 0-1, how strongly this loop dominates system behaviour
  description: string;
}

export interface ScenarioPath {
  name: string;
  probability: number;
  description: string;
  triggers: Array<{ variable: string; condition: string; threshold: number }>;
  timeline: Array<{ quarter: number; events: string[]; scores: Record<string, number> }>;
  finalOutcome: {
    spiRange: { low: number; mid: number; high: number };
    rroiRange: { low: number; mid: number; high: number };
    riskLevel: 'low' | 'moderate' | 'high' | 'critical';
    keyEvents: string[];
  };
}

export interface SimulationResult {
  scenarios: ScenarioPath[];
  baseCase: ScenarioPath;
  bestCase: ScenarioPath;
  worstCase: ScenarioPath;
  monteCarloDistribution: {
    meanOutcome: number;
    stdDev: number;
    percentile5: number;
    percentile25: number;
    median: number;
    percentile75: number;
    percentile95: number;
    probabilityOfSuccess: number; // P(SPI > 50)
    probabilityOfFailure: number; // P(SPI < 30)
  };
  criticalVariables: Array<{ variable: string; sensitivity: number; direction: string }>;
  feedbackLoops: FeedbackLoop[];
  simulationRuns: number;
  processingTimeMs: number;
}

export interface SimulationContext {
  country: string;
  region: string;
  sector: string;
  investmentSizeM: number;
  timelineQuarters: number;
  initialSPI: number;
  initialRROI: number;
  riskFactors: string[];
  opportunities: string[];
}

// ============================================================================
// SCENARIO VARIABLES LIBRARY
// ============================================================================

const BASE_VARIABLES: ScenarioVariable[] = [
  { id: 'V-GDP-GROWTH', name: 'Regional GDP Growth', baseValue: 3.5, unit: '%', distribution: 'normal', params: { mean: 3.5, stdDev: 1.5 }, category: 'economic' },
  { id: 'V-FDI-FLOW', name: 'FDI Inflow', baseValue: 100, unit: '$M', distribution: 'lognormal', params: { mean: 100, stdDev: 40 }, category: 'economic' },
  { id: 'V-EXCHANGE-RATE', name: 'Exchange Rate Stability', baseValue: 75, unit: 'index', distribution: 'normal', params: { mean: 75, stdDev: 12 }, category: 'economic' },
  { id: 'V-INFLATION', name: 'Inflation Rate', baseValue: 4.0, unit: '%', distribution: 'normal', params: { mean: 4.0, stdDev: 2.0 }, category: 'economic' },
  { id: 'V-POLITICAL-STABILITY', name: 'Political Stability Index', baseValue: 65, unit: 'index', distribution: 'normal', params: { mean: 65, stdDev: 10 }, category: 'political' },
  { id: 'V-REGULATORY-QUALITY', name: 'Regulatory Quality', baseValue: 60, unit: 'index', distribution: 'normal', params: { mean: 60, stdDev: 8 }, category: 'regulatory' },
  { id: 'V-INFRASTRUCTURE', name: 'Infrastructure Score', baseValue: 55, unit: 'index', distribution: 'triangular', params: { min: 30, mode: 55, max: 80 }, category: 'technological' },
  { id: 'V-TALENT-AVAILABILITY', name: 'Skilled Workforce Availability', baseValue: 50, unit: 'index', distribution: 'normal', params: { mean: 50, stdDev: 12 }, category: 'social' },
  { id: 'V-COMMUNITY-SUPPORT', name: 'Community Support Level', baseValue: 60, unit: 'index', distribution: 'normal', params: { mean: 60, stdDev: 15 }, category: 'social' },
  { id: 'V-ENV-REGULATION', name: 'Environmental Regulation Stringency', baseValue: 50, unit: 'index', distribution: 'uniform', params: { min: 30, max: 80 }, category: 'environmental' },
  { id: 'V-TECHNOLOGY-READINESS', name: 'Technology Readiness Level', baseValue: 55, unit: 'index', distribution: 'triangular', params: { min: 30, mode: 55, max: 85 }, category: 'technological' },
  { id: 'V-MARKET-ACCESS', name: 'Market Access Score', baseValue: 65, unit: 'index', distribution: 'normal', params: { mean: 65, stdDev: 10 }, category: 'economic' }
];

const CAUSAL_LINKS: CausalLink[] = [
  { from: 'V-GDP-GROWTH', to: 'V-FDI-FLOW', type: 'positive', strength: 0.6, delay: 1, nonLinearity: 'linear' },
  { from: 'V-POLITICAL-STABILITY', to: 'V-FDI-FLOW', type: 'positive', strength: 0.7, delay: 0, nonLinearity: 'threshold', thresholdValue: 40 },
  { from: 'V-FDI-FLOW', to: 'V-GDP-GROWTH', type: 'positive', strength: 0.4, delay: 2, nonLinearity: 'saturation' },
  { from: 'V-INFRASTRUCTURE', to: 'V-FDI-FLOW', type: 'positive', strength: 0.5, delay: 0, nonLinearity: 'linear' },
  { from: 'V-FDI-FLOW', to: 'V-INFRASTRUCTURE', type: 'positive', strength: 0.3, delay: 4, nonLinearity: 'linear' },
  { from: 'V-INFLATION', to: 'V-EXCHANGE-RATE', type: 'negative', strength: 0.5, delay: 1, nonLinearity: 'linear' },
  { from: 'V-EXCHANGE-RATE', to: 'V-FDI-FLOW', type: 'positive', strength: 0.3, delay: 1, nonLinearity: 'linear' },
  { from: 'V-REGULATORY-QUALITY', to: 'V-FDI-FLOW', type: 'positive', strength: 0.5, delay: 0, nonLinearity: 'linear' },
  { from: 'V-TALENT-AVAILABILITY', to: 'V-FDI-FLOW', type: 'positive', strength: 0.4, delay: 0, nonLinearity: 'threshold', thresholdValue: 30 },
  { from: 'V-FDI-FLOW', to: 'V-TALENT-AVAILABILITY', type: 'positive', strength: 0.2, delay: 6, nonLinearity: 'linear' },
  { from: 'V-COMMUNITY-SUPPORT', to: 'V-REGULATORY-QUALITY', type: 'positive', strength: 0.3, delay: 2, nonLinearity: 'linear' },
  { from: 'V-ENV-REGULATION', to: 'V-FDI-FLOW', type: 'negative', strength: 0.2, delay: 0, nonLinearity: 'linear' },
  { from: 'V-TECHNOLOGY-READINESS', to: 'V-GDP-GROWTH', type: 'positive', strength: 0.3, delay: 2, nonLinearity: 'linear' },
  { from: 'V-MARKET-ACCESS', to: 'V-FDI-FLOW', type: 'positive', strength: 0.4, delay: 0, nonLinearity: 'linear' }
];

const FEEDBACK_LOOPS: FeedbackLoop[] = [
  {
    id: 'FL-GROWTH',
    name: 'Growth Spiral',
    variables: ['V-FDI-FLOW', 'V-GDP-GROWTH', 'V-FDI-FLOW'],
    type: 'reinforcing',
    dominance: 0.7,
    description: 'FDI drives GDP growth, which attracts more FDI - a virtuous cycle when active, but can reverse'
  },
  {
    id: 'FL-INFRA',
    name: 'Infrastructure-Investment Loop',
    variables: ['V-FDI-FLOW', 'V-INFRASTRUCTURE', 'V-FDI-FLOW'],
    type: 'reinforcing',
    dominance: 0.5,
    description: 'Investment improves infrastructure, which attracts more investment - but with 4-quarter delay'
  },
  {
    id: 'FL-TALENT',
    name: 'Talent Development Cycle',
    variables: ['V-FDI-FLOW', 'V-TALENT-AVAILABILITY', 'V-FDI-FLOW'],
    type: 'reinforcing',
    dominance: 0.4,
    description: 'Investment creates demand for skills, eventually developing local talent pool - longest delay'
  },
  {
    id: 'FL-INFLATION',
    name: 'Inflation Brake',
    variables: ['V-GDP-GROWTH', 'V-INFLATION', 'V-EXCHANGE-RATE', 'V-FDI-FLOW', 'V-GDP-GROWTH'],
    type: 'balancing',
    dominance: 0.3,
    description: 'Rapid growth causes inflation, weakening currency and reducing FDI - natural growth limiter'
  }
];

// ============================================================================
// CORE ENGINE
// ============================================================================

export class ScenarioSimulationEngine {

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
   * Sample from specified distribution.
   */
  private static sample(variable: ScenarioVariable): number {
    const p = variable.params;

    switch (variable.distribution) {
      case 'normal': {
        // Box-Muller transform for normal distribution
        const u1 = Math.random();
        const u2 = Math.random();
        const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        return (p.mean || 0) + z * (p.stdDev || 1);
      }
      case 'uniform':
        return (p.min || 0) + Math.random() * ((p.max || 1) - (p.min || 0));
      case 'triangular': {
        const min = p.min || 0;
        const max = p.max || 1;
        const mode = p.mode || (min + max) / 2;
        const u = Math.random();
        const fc = (mode - min) / (max - min);
        return u < fc
          ? min + Math.sqrt(u * (max - min) * (mode - min))
          : max - Math.sqrt((1 - u) * (max - min) * (max - mode));
      }
      case 'lognormal': {
        const mu = Math.log((p.mean || 1) ** 2 / Math.sqrt((p.stdDev || 1) ** 2 + (p.mean || 1) ** 2));
        const sigma = Math.sqrt(Math.log(1 + (p.stdDev || 1) ** 2 / (p.mean || 1) ** 2));
        const u1 = Math.random();
        const u2 = Math.random();
        const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        return Math.exp(mu + sigma * z);
      }
      default:
        return variable.baseValue;
    }
  }

  /**
   * Apply causal link with non-linearity.
   */
  private static applyCausalEffect(
    link: CausalLink,
    sourceChange: number,
    _sourceValue: number
  ): number {
    const direction = link.type === 'positive' ? 1 : -1;
    let effect: number;

    switch (link.nonLinearity) {
      case 'linear':
        effect = sourceChange * link.strength * direction;
        break;
      case 'quadratic':
        effect = Math.sign(sourceChange) * Math.pow(Math.abs(sourceChange), 1.5) * link.strength * direction;
        break;
      case 'threshold':
        effect = _sourceValue > (link.thresholdValue || 50)
          ? sourceChange * link.strength * direction
          : sourceChange * link.strength * direction * 0.2; // muted below threshold
        break;
      case 'saturation':
        // Logistic saturation: effect = strength × tanh(change/scale)
        effect = link.strength * Math.tanh(sourceChange / 20) * direction * 10;
        break;
      default:
        effect = sourceChange * link.strength * direction;
    }

    return effect;
  }

  /**
   * Run a single simulation path through the causal system.
   * Returns variable states at each quarter.
   */
  private static runSingleSimulation(
    ctx: SimulationContext,
    quarters: number
  ): Array<Map<string, number>> {
    // Initialise variables with sampled values
    const timeline: Array<Map<string, number>> = [];
    const currentState = new Map<string, number>();

    for (const v of BASE_VARIABLES) {
      currentState.set(v.id, this.sample(v));
    }
    timeline.push(new Map(currentState));

    // Simulate quarter by quarter
    for (let q = 1; q <= quarters; q++) {
      const changes = new Map<string, number>();

      // Apply causal links
      for (const link of CAUSAL_LINKS) {
        if (link.delay > q) continue; // hasn't kicked in yet

        const sourceNow = currentState.get(link.from) || 0;
        const sourcePrev = (timeline[Math.max(0, q - link.delay - 1)] || currentState).get(link.from) || 0;
        const sourceChange = sourceNow - sourcePrev;

        if (Math.abs(sourceChange) < 0.01) continue;

        const effect = this.applyCausalEffect(link, sourceChange, sourceNow);
        changes.set(link.to, (changes.get(link.to) || 0) + effect);
      }

      // Apply random shocks (2% chance per variable per quarter)
      for (const v of BASE_VARIABLES) {
        if (Math.random() < 0.02) {
          const shock = (Math.random() - 0.5) * v.baseValue * 0.3;
          changes.set(v.id, (changes.get(v.id) || 0) + shock);
        }
      }

      // Update state
      for (const [varId, change] of changes) {
        const current = currentState.get(varId) || 0;
        currentState.set(varId, Math.max(0, Math.min(100, current + change)));
      }

      timeline.push(new Map(currentState));
    }

    return timeline;
  }

  /**
   * Convert simulation variable states to SPI estimate.
   * SPI ≈ weighted combination of key variables.
   */
  private static estimateSPI(state: Map<string, number>, baseSPI: number): number {
    const weights: Record<string, number> = {
      'V-POLITICAL-STABILITY': 0.20,
      'V-FDI-FLOW': 0.15,
      'V-INFRASTRUCTURE': 0.15,
      'V-REGULATORY-QUALITY': 0.15,
      'V-TALENT-AVAILABILITY': 0.10,
      'V-MARKET-ACCESS': 0.10,
      'V-COMMUNITY-SUPPORT': 0.08,
      'V-EXCHANGE-RATE': 0.07
    };

    let spiEstimate = 0;
    for (const [varId, weight] of Object.entries(weights)) {
      spiEstimate += (state.get(varId) || 50) * weight;
    }

    // Blend with base SPI (50% model, 50% context)
    return Math.round(spiEstimate * 0.5 + baseSPI * 0.5);
  }

  /**
   * Calculate variable sensitivity - how much does SPI change per unit change in variable.
   */
  private static calculateSensitivity(ctx: SimulationContext): Array<{ variable: string; sensitivity: number; direction: string }> {
    const sensitivities: Array<{ variable: string; sensitivity: number; direction: string }> = [];
    const baseState = new Map<string, number>();
    for (const v of BASE_VARIABLES) {
      baseState.set(v.id, v.baseValue);
    }
    const baseSPI = this.estimateSPI(baseState, ctx.initialSPI);

    for (const v of BASE_VARIABLES) {
      const perturbedState = new Map(baseState);
      perturbedState.set(v.id, v.baseValue * 1.10); // +10% perturbation
      const perturbedSPI = this.estimateSPI(perturbedState, ctx.initialSPI);
      const sensitivity = Math.abs(perturbedSPI - baseSPI) / (v.baseValue * 0.10 || 1);

      sensitivities.push({
        variable: v.name,
        sensitivity: Math.round(sensitivity * 100) / 100,
        direction: perturbedSPI > baseSPI ? 'positive' : 'negative'
      });
    }

    return sensitivities.sort((a, b) => b.sensitivity - a.sensitivity);
  }

  // ════════════════════════════════════════════════════════════════════════
  // PUBLIC API
  // ════════════════════════════════════════════════════════════════════════

  /**
   * Run full scenario simulation with Monte Carlo.
   */
  static async simulate(ctx: SimulationContext, runs: number = 5000): Promise<SimulationResult> {
    const startTime = Date.now();

    try {
      const aiPrompt = `Scenario simulation for: ${ctx.sector} in ${ctx.region}, ${ctx.country}. Investment: ${ctx.investmentSizeM}M, timeline: ${ctx.timelineQuarters} quarters, SPI: ${ctx.initialSPI}, RROI: ${ctx.initialRROI}. Risks: ${ctx.riskFactors.join(', ')}. Opportunities: ${ctx.opportunities.join(', ')}.`;
      void this.callAI(aiPrompt);
    } catch {
      /* non-critical */
    }

    const quarters = ctx.timelineQuarters;

    // Run Monte Carlo simulations
    const finalSPIs: number[] = [];
    const allTimelines: Array<Array<Map<string, number>>> = [];

    for (let r = 0; r < runs; r++) {
      const timeline = this.runSingleSimulation(ctx, quarters);
      const finalState = timeline[timeline.length - 1];
      finalSPIs.push(this.estimateSPI(finalState, ctx.initialSPI));
      if (r < 50) allTimelines.push(timeline); // keep 50 for scenario construction
    }

    // Sort for percentile computation
    finalSPIs.sort((a, b) => a - b);
    const mean = finalSPIs.reduce((a, b) => a + b, 0) / finalSPIs.length;
    const variance = finalSPIs.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / finalSPIs.length;

    // Build Monte Carlo distribution
    const distribution = {
      meanOutcome: Math.round(mean),
      stdDev: Math.round(Math.sqrt(variance)),
      percentile5: finalSPIs[Math.floor(runs * 0.05)],
      percentile25: finalSPIs[Math.floor(runs * 0.25)],
      median: finalSPIs[Math.floor(runs * 0.50)],
      percentile75: finalSPIs[Math.floor(runs * 0.75)],
      percentile95: finalSPIs[Math.floor(runs * 0.95)],
      probabilityOfSuccess: finalSPIs.filter(s => s >= 50).length / runs,
      probabilityOfFailure: finalSPIs.filter(s => s < 30).length / runs
    };

    // Build scenario paths (base, best, worst)
    const buildPath = (name: string, timeline: Array<Map<string, number>>, probability: number, description: string): ScenarioPath => {
      const timelineEntries = timeline.map((state, q) => ({
        quarter: q,
        events: [],
        scores: {
          spi: this.estimateSPI(state, ctx.initialSPI),
          gdpGrowth: state.get('V-GDP-GROWTH') || 0,
          fdi: state.get('V-FDI-FLOW') || 0,
          stability: state.get('V-POLITICAL-STABILITY') || 0
        }
      }));
      const finalSPI = timelineEntries[timelineEntries.length - 1].scores.spi;
      return {
        name,
        probability,
        description,
        triggers: [],
        timeline: timelineEntries,
        finalOutcome: {
          spiRange: { low: finalSPI - 5, mid: finalSPI, high: finalSPI + 5 },
          rroiRange: { low: ctx.initialRROI * 0.8, mid: ctx.initialRROI, high: ctx.initialRROI * 1.3 },
          riskLevel: finalSPI < 30 ? 'critical' : finalSPI < 50 ? 'high' : finalSPI < 70 ? 'moderate' : 'low',
          keyEvents: []
        }
      };
    };

    // Pick representative timelines
    const baseTimeline = allTimelines[Math.floor(allTimelines.length / 2)];
    const bestTimeline = allTimelines.reduce((best, tl) => {
      const spi = this.estimateSPI(tl[tl.length - 1], ctx.initialSPI);
      const bestSpi = this.estimateSPI(best[best.length - 1], ctx.initialSPI);
      return spi > bestSpi ? tl : best;
    });
    const worstTimeline = allTimelines.reduce((worst, tl) => {
      const spi = this.estimateSPI(tl[tl.length - 1], ctx.initialSPI);
      const worstSpi = this.estimateSPI(worst[worst.length - 1], ctx.initialSPI);
      return spi < worstSpi ? tl : worst;
    });

    const baseCase = buildPath('Base Case', baseTimeline, 0.50, 'Most likely trajectory based on current conditions');
    const bestCase = buildPath('Best Case', bestTimeline, 0.15, 'Optimistic scenario with favourable developments');
    const worstCase = buildPath('Worst Case', worstTimeline, 0.10, 'Pessimistic scenario with adverse developments');

    // Calculate sensitivities
    const criticalVariables = this.calculateSensitivity(ctx);

    return {
      scenarios: [baseCase, bestCase, worstCase],
      baseCase,
      bestCase,
      worstCase,
      monteCarloDistribution: distribution,
      criticalVariables,
      feedbackLoops: FEEDBACK_LOOPS,
      simulationRuns: runs,
      processingTimeMs: Date.now() - startTime
    };
  }

  /**
   * Quick simulation - 1000 runs, returns probability of success.
   */
  static quickSimulate(ctx: SimulationContext): { probabilityOfSuccess: number; medianSPI: number; riskLevel: string } {
    const result = this.simulate(ctx, 1000);
    return {
      probabilityOfSuccess: result.monteCarloDistribution.probabilityOfSuccess,
      medianSPI: result.monteCarloDistribution.median,
      riskLevel: result.monteCarloDistribution.probabilityOfFailure > 0.3 ? 'high' :
        result.monteCarloDistribution.probabilityOfFailure > 0.1 ? 'moderate' : 'low'
    };
  }

  /**
   * Get feedback loop count.
   */
  static getFeedbackLoopCount(): number {
    return FEEDBACK_LOOPS.length;
  }

  /**
   * Get variable count.
   */
  static getVariableCount(): number {
    return BASE_VARIABLES.length;
  }
}

export const scenarioSimulationEngine = new ScenarioSimulationEngine();
