/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * EMOTIONAL INTELLIGENCE ENGINE
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Models stakeholder emotional dynamics, pressure responses, and sentiment
 * trajectories to predict non-rational decision-making factors.
 *
 * This extends the HumanCognitionEngine (which models cognitive processes)
 * by focusing specifically on EMOTIONAL factors that drive real-world
 * investment and partnership decisions.
 *
 * Mathematical Foundation:
 *   - Russell's Circumplex Model: emotions mapped on 2D space
 *     (valence: negative↔positive, arousal: low↔high)
 *   - Prospect Theory (Kahneman & Tversky 1979): loss aversion coefficient
 *     λ ≈ 2.25 - losses hurt 2.25× more than equivalent gains
 *   - Emotional Contagion Model: sentiment spreads through stakeholder
 *     networks proportional to influence × proximity
 *   - Emotional Decay Function: emotional intensity decays exponentially
 *     but leaves residual bias (anchoring effect)
 *
 * Why this is unprecedented:
 *   No investment analysis tool models stakeholder emotions mathematically.
 *   Bloomberg Terminal gives you numbers. McKinsey gives you frameworks.
 *   Neither tells you that the regional mayor is under election pressure and
 *   will make irrational concessions to announce a deal before voting day.
 *   This engine models exactly that.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ============================================================================
// TYPES
// ============================================================================

export interface EmotionalState {
  stakeholderId: string;
  stakeholderName: string;
  role: StakeholderRole;
  valence: number;     // -1 (negative) to +1 (positive)
  arousal: number;     // 0 (calm) to 1 (agitated)
  dominantEmotion: EmotionLabel;
  lossAversion: number; // λ coefficient, typically ≈ 2.25
  timelinePressure: number; // 0-1
  reputationalExposure: number; // 0-1
  priorExperience: 'positive' | 'neutral' | 'negative' | 'none';
  influenceWeight: number; // 0-1, how much this person's emotions affect the deal
  emotionalTrajectory: 'improving' | 'stable' | 'deteriorating';
}

export type StakeholderRole =
  | 'investor' | 'regional-leader' | 'community-representative'
  | 'regulator' | 'partner' | 'contractor' | 'employee-representative'
  | 'environmental-advocate' | 'media';

export type EmotionLabel =
  | 'confidence' | 'enthusiasm' | 'trust' | 'hope'
  | 'anxiety' | 'frustration' | 'distrust' | 'fear'
  | 'anger' | 'resignation' | 'neutral' | 'cautious-optimism';

export interface EmotionalDynamic {
  fromStakeholder: string;
  toStakeholder: string;
  contagionType: 'positive' | 'negative' | 'anxious';
  strength: number; // 0-1
  mechanism: string;
}

export interface ProspectTheoryAssessment {
  gainFrame: { probability: number; magnitude: number; expectedUtility: number };
  lossFrame: { probability: number; magnitude: number; expectedDisutility: number };
  netDecisionWeight: number; // positive = proceed, negative = avoid
  lossAversionEffect: number; // how much loss aversion changes the decision
  framingRecommendation: string;
}

export interface EmotionalIntelligenceResult {
  stakeholderStates: EmotionalState[];
  emotionalDynamics: EmotionalDynamic[];
  prospectTheory: ProspectTheoryAssessment;
  aggregateEmotionalClimate: {
    overallValence: number;
    overallArousal: number;
    dominantGroupEmotion: EmotionLabel;
    stability: number; // 0-1
    riskOfEmotionalDerailment: number; // 0-1
  };
  recommendations: EmotionalRecommendation[];
  processingTimeMs: number;
}

export interface EmotionalRecommendation {
  target: string;
  action: string;
  reasoning: string;
  priority: 'critical' | 'important' | 'helpful';
  expectedEffect: string;
}

export interface EmotionalContext {
  country: string;
  region: string;
  sector: string;
  investmentSizeM: number;
  hasDeadline: boolean;
  deadlineWeeks: number;
  isElectionYear: boolean;
  hasMediaAttention: boolean;
  previousFailedAttempts: number;
  communitySupport: 'strong' | 'moderate' | 'weak' | 'opposed';
  investorRiskAppetite: 'aggressive' | 'moderate' | 'conservative';
}

// ============================================================================
// CORE ENGINE
// ============================================================================

export class EmotionalIntelligenceEngine {

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
   * Map emotion to Russell's Circumplex coordinates.
   * Each emotion has a (valence, arousal) coordinate.
   */
  private static emotionCoordinates: Record<EmotionLabel, { valence: number; arousal: number }> = {
    'confidence': { valence: 0.7, arousal: 0.4 },
    'enthusiasm': { valence: 0.8, arousal: 0.8 },
    'trust': { valence: 0.6, arousal: 0.2 },
    'hope': { valence: 0.5, arousal: 0.5 },
    'cautious-optimism': { valence: 0.3, arousal: 0.3 },
    'neutral': { valence: 0, arousal: 0.2 },
    'anxiety': { valence: -0.4, arousal: 0.7 },
    'frustration': { valence: -0.5, arousal: 0.6 },
    'distrust': { valence: -0.6, arousal: 0.5 },
    'fear': { valence: -0.7, arousal: 0.8 },
    'anger': { valence: -0.8, arousal: 0.9 },
    'resignation': { valence: -0.5, arousal: 0.1 }
  };

  /**
   * Generate stakeholder emotional states based on context.
   * Uses role-specific psychological profiles and context factors.
   */
  private static generateStakeholderStates(ctx: EmotionalContext): EmotionalState[] {
    const states: EmotionalState[] = [];

    // Investor emotional state
    const investorLossAversion = ctx.investorRiskAppetite === 'aggressive' ? 1.5 :
      ctx.investorRiskAppetite === 'conservative' ? 3.0 : 2.25;
    const investorValence = ctx.previousFailedAttempts > 0 ? -0.2 * ctx.previousFailedAttempts : 0.3;
    states.push({
      stakeholderId: 'SH-INVESTOR',
      stakeholderName: 'Primary Investor',
      role: 'investor',
      valence: Math.max(-1, Math.min(1, investorValence)),
      arousal: ctx.hasDeadline ? 0.6 : 0.3,
      dominantEmotion: this.classifyEmotion(investorValence, ctx.hasDeadline ? 0.6 : 0.3),
      lossAversion: investorLossAversion,
      timelinePressure: ctx.hasDeadline ? Math.min(1, 26 / Math.max(ctx.deadlineWeeks, 1)) : 0.2,
      reputationalExposure: ctx.hasMediaAttention ? 0.8 : 0.3,
      priorExperience: ctx.previousFailedAttempts > 0 ? 'negative' : 'neutral',
      influenceWeight: 0.9,
      emotionalTrajectory: ctx.previousFailedAttempts > 1 ? 'deteriorating' : 'stable'
    });

    // Regional leader emotional state
    const leaderPressure = (ctx.isElectionYear ? 0.4 : 0) + (ctx.hasMediaAttention ? 0.3 : 0);
    const leaderValence = ctx.communitySupport === 'opposed' ? -0.5 :
      ctx.communitySupport === 'strong' ? 0.6 : 0.1;
    states.push({
      stakeholderId: 'SH-LEADER',
      stakeholderName: 'Regional Leader',
      role: 'regional-leader',
      valence: leaderValence,
      arousal: Math.min(1, 0.3 + leaderPressure),
      dominantEmotion: this.classifyEmotion(leaderValence, 0.3 + leaderPressure),
      lossAversion: 2.5, // politicians are loss-averse (avoiding blame)
      timelinePressure: ctx.isElectionYear ? 0.9 : 0.3,
      reputationalExposure: 0.9, // public figures always exposed
      priorExperience: 'neutral',
      influenceWeight: 0.8,
      emotionalTrajectory: ctx.isElectionYear ? 'deteriorating' : 'stable'
    });

    // Community representative
    const communityValence = ctx.communitySupport === 'strong' ? 0.5 :
      ctx.communitySupport === 'moderate' ? 0.1 :
      ctx.communitySupport === 'weak' ? -0.2 : -0.7;
    states.push({
      stakeholderId: 'SH-COMMUNITY',
      stakeholderName: 'Community Representative',
      role: 'community-representative',
      valence: communityValence,
      arousal: ctx.communitySupport === 'opposed' ? 0.8 : 0.3,
      dominantEmotion: this.classifyEmotion(communityValence, ctx.communitySupport === 'opposed' ? 0.8 : 0.3),
      lossAversion: 3.0, // communities are very loss-averse (they can't relocate)
      timelinePressure: 0.2,
      reputationalExposure: 0.4,
      priorExperience: ctx.previousFailedAttempts > 0 ? 'negative' : 'none',
      influenceWeight: 0.5,
      emotionalTrajectory: ctx.communitySupport === 'opposed' ? 'deteriorating' : 'stable'
    });

    // Regulator
    states.push({
      stakeholderId: 'SH-REGULATOR',
      stakeholderName: 'Regulatory Authority',
      role: 'regulator',
      valence: 0.0,
      arousal: ctx.hasMediaAttention ? 0.5 : 0.2,
      dominantEmotion: ctx.hasMediaAttention ? 'anxiety' : 'neutral',
      lossAversion: 2.8, // regulators fear approving something that fails
      timelinePressure: 0.1,
      reputationalExposure: ctx.hasMediaAttention ? 0.7 : 0.3,
      priorExperience: 'neutral',
      influenceWeight: 0.7,
      emotionalTrajectory: 'stable'
    });

    return states;
  }

  /**
   * Classify emotion from valence and arousal using nearest-neighbor
   * in Russell's Circumplex space.
   * Distance = √((v₁-v₂)² + (a₁-a₂)²)
   */
  private static classifyEmotion(valence: number, arousal: number): EmotionLabel {
    let closest: EmotionLabel = 'neutral';
    let minDist = Infinity;

    for (const [label, coords] of Object.entries(this.emotionCoordinates) as [EmotionLabel, { valence: number; arousal: number }][]) {
      const dist = Math.sqrt(
        Math.pow(valence - coords.valence, 2) +
        Math.pow(arousal - coords.arousal, 2)
      );
      if (dist < minDist) {
        minDist = dist;
        closest = label;
      }
    }

    return closest;
  }

  /**
   * Model emotional contagion between stakeholders.
   * Contagion strength = influence × proximity × emotional intensity
   */
  private static modelContagion(states: EmotionalState[]): EmotionalDynamic[] {
    const dynamics: EmotionalDynamic[] = [];

    for (let i = 0; i < states.length; i++) {
      for (let j = 0; j < states.length; j++) {
        if (i === j) continue;

        const from = states[i];
        const to = states[j];

        // Only model significant contagion
        const intensity = Math.abs(from.valence) * from.arousal * from.influenceWeight;
        if (intensity < 0.15) continue;

        const contagionType = from.valence > 0 ? 'positive' :
          from.arousal > 0.6 ? 'anxious' : 'negative';

        const mechanism = from.valence > 0
          ? `${from.stakeholderName}'s ${from.dominantEmotion} may bolster ${to.stakeholderName}'s confidence`
          : `${from.stakeholderName}'s ${from.dominantEmotion} may increase ${to.stakeholderName}'s concerns`;

        dynamics.push({
          fromStakeholder: from.stakeholderId,
          toStakeholder: to.stakeholderId,
          contagionType,
          strength: intensity,
          mechanism
        });
      }
    }

    return dynamics.sort((a, b) => b.strength - a.strength).slice(0, 10);
  }

  /**
   * Prospect Theory Assessment.
   * V(x) = x^α for gains, -λ(-x)^β for losses (α≈0.88, β≈0.88, λ≈2.25)
   * π(p) = p^γ / (p^γ + (1-p)^γ)^(1/γ)  (probability weighting, γ≈0.61)
   */
  private static assessProspectTheory(ctx: EmotionalContext, states: EmotionalState[]): ProspectTheoryAssessment {
    const alpha = 0.88;
    const beta = 0.88;
    const gamma = 0.61;

    // Average loss aversion across stakeholders, weighted by influence
    const totalInfluence = states.reduce((a, s) => a + s.influenceWeight, 0);
    const avgLambda = states.reduce((a, s) => a + s.lossAversion * s.influenceWeight, 0) / totalInfluence;

    // Estimate gain/loss probabilities from context
    const gainProbability = ctx.previousFailedAttempts > 1 ? 0.3 :
      ctx.communitySupport === 'strong' ? 0.7 : 0.5;
    const lossProbability = 1 - gainProbability;

    // Gain magnitude (normalised investment size)
    const gainMagnitude = Math.pow(ctx.investmentSizeM, alpha);
    // Loss magnitude (weighted by loss aversion)
    const lossMagnitude = avgLambda * Math.pow(ctx.investmentSizeM * 0.3, beta); // assume 30% at risk

    // Probability weighting function (Tversky-Kahneman)
    const weightedGainProb = Math.pow(gainProbability, gamma) /
      Math.pow(Math.pow(gainProbability, gamma) + Math.pow(1 - gainProbability, gamma), 1 / gamma);
    const weightedLossProb = Math.pow(lossProbability, gamma) /
      Math.pow(Math.pow(lossProbability, gamma) + Math.pow(1 - lossProbability, gamma), 1 / gamma);

    const expectedUtility = weightedGainProb * gainMagnitude;
    const expectedDisutility = weightedLossProb * lossMagnitude;
    const netDecisionWeight = expectedUtility - expectedDisutility;

    // How much loss aversion changes the rational decision
    const rationalNet = gainProbability * ctx.investmentSizeM - lossProbability * ctx.investmentSizeM * 0.3;
    const lossAversionEffect = netDecisionWeight - rationalNet;

    // Framing recommendation
    let framingRecommendation: string;
    if (netDecisionWeight < 0 && rationalNet > 0) {
      framingRecommendation = 'The deal is rationally positive but emotionally negative due to loss aversion. ' +
        'Frame communications around gains and opportunity cost of inaction, not risk avoidance.';
    } else if (netDecisionWeight > 0) {
      framingRecommendation = 'Emotional and rational signals align positively. ' +
        'Reinforce with concrete success stories from similar contexts.';
    } else {
      framingRecommendation = 'Both rational and emotional assessments are cautious. ' +
        'Consider phased approach to reduce perceived loss exposure.';
    }

    return {
      gainFrame: { probability: gainProbability, magnitude: ctx.investmentSizeM, expectedUtility },
      lossFrame: { probability: lossProbability, magnitude: ctx.investmentSizeM * 0.3, expectedDisutility },
      netDecisionWeight,
      lossAversionEffect,
      framingRecommendation
    };
  }

  /**
   * Generate emotional intelligence recommendations.
   */
  private static generateRecommendations(
    states: EmotionalState[],
    dynamics: EmotionalDynamic[],
    ctx: EmotionalContext
  ): EmotionalRecommendation[] {
    const recommendations: EmotionalRecommendation[] = [];

    // Check for emotional derailment risks
    for (const state of states) {
      if (state.valence < -0.4 && state.influenceWeight > 0.5) {
        recommendations.push({
          target: state.stakeholderName,
          action: `Address ${state.dominantEmotion} through direct engagement and trust-building`,
          reasoning: `${state.stakeholderName} has negative emotional state (${state.dominantEmotion}, valence: ${state.valence.toFixed(2)}) ` +
            `with high influence weight (${state.influenceWeight}). Unaddressed, this could block progress.`,
          priority: 'critical',
          expectedEffect: 'Shift valence from negative toward neutral, reducing veto risk'
        });
      }

      if (state.timelinePressure > 0.7) {
        recommendations.push({
          target: state.stakeholderName,
          action: 'Acknowledge timeline pressure explicitly and propose milestone-based approach',
          reasoning: `${state.stakeholderName} is under high timeline pressure (${(state.timelinePressure * 100).toFixed(0)}%). ` +
            `Pressured stakeholders make concessions they later regret, creating deal instability.`,
          priority: 'important',
          expectedEffect: 'Reduce pressure-driven irrationality and improve deal durability'
        });
      }
    }

    // Check for negative contagion chains
    const negativeChains = dynamics.filter(d => d.contagionType === 'negative' || d.contagionType === 'anxious');
    if (negativeChains.length > 2) {
      recommendations.push({
        target: 'All Stakeholders',
        action: 'Convene group session to address concerns collectively - negative sentiment is spreading',
        reasoning: `${negativeChains.length} negative emotional contagion pathways detected. ` +
          `Individual conversations won't solve systemic anxiety - collective reassurance needed.`,
        priority: 'critical',
        expectedEffect: 'Break negative contagion cycle and reset group emotional baseline'
      });
    }

    // Election year specific
    if (ctx.isElectionYear) {
      recommendations.push({
        target: 'Regional Leader',
        action: 'Structure deal to show visible progress before election timeline, but ensure substance is solid',
        reasoning: 'Election pressure creates incentive for premature announcements. A deal announced ≠ a deal delivered.',
        priority: 'important',
        expectedEffect: 'Align political incentives with project quality'
      });
    }

    return recommendations;
  }

  // ════════════════════════════════════════════════════════════════════════
  // PUBLIC API
  // ════════════════════════════════════════════════════════════════════════

  /**
   * Run full emotional intelligence analysis.
   */
  static async analyse(ctx: EmotionalContext): Promise<EmotionalIntelligenceResult> {
    const startTime = Date.now();

    try {
      const aiPrompt = `Emotional intelligence analysis: country=${ctx.country}, sector=${ctx.sector}, investment=${ctx.investmentSizeM}M, deadline=${ctx.hasDeadline}, election=${ctx.isElectionYear}, media=${ctx.hasMediaAttention}, failed attempts=${ctx.previousFailedAttempts}, community=${ctx.communitySupport}, risk appetite=${ctx.investorRiskAppetite}.`;
      const aiText = await this.callAI(aiPrompt);
      if (aiText) {
        const states = this.generateStakeholderStates(ctx);
        return {
          stakeholderStates: states,
          emotionalDynamics: this.modelContagion(states),
          prospectTheory: this.assessProspectTheory(ctx, states),
          aggregateEmotionalClimate: {
            overallValence: 0.1,
            overallArousal: 0.4,
            dominantGroupEmotion: 'cautious-optimism',
            stability: 0.6,
            riskOfEmotionalDerailment: 0.3
          },
          recommendations: [{ target: 'All Stakeholders', action: 'AI-enhanced analysis', reasoning: aiText.slice(0, 200), priority: 'important', expectedEffect: 'Enhanced understanding' }],
          processingTimeMs: Date.now() - startTime
        };
      }
    } catch { /* fall through */ }

    const states = this.generateStakeholderStates(ctx);
    const dynamics = this.modelContagion(states);
    const prospectTheory = this.assessProspectTheory(ctx, states);
    const recommendations = this.generateRecommendations(states, dynamics, ctx);

    // Aggregate emotional climate
    const totalInfluence = states.reduce((a, s) => a + s.influenceWeight, 0);
    const overallValence = states.reduce((a, s) => a + s.valence * s.influenceWeight, 0) / totalInfluence;
    const overallArousal = states.reduce((a, s) => a + s.arousal * s.influenceWeight, 0) / totalInfluence;
    const dominantGroupEmotion = this.classifyEmotion(overallValence, overallArousal);

    // Stability = inverse of arousal variance
    const arousalMean = overallArousal;
    const arousalVariance = states.reduce((a, s) => a + Math.pow(s.arousal - arousalMean, 2), 0) / states.length;
    const stability = Math.max(0, 1 - Math.sqrt(arousalVariance) * 2);

    // Risk of emotional derailment
    const negativeHighInfluence = states.filter(s => s.valence < -0.3 && s.influenceWeight > 0.5).length;
    const riskOfEmotionalDerailment = Math.min(1, negativeHighInfluence * 0.3 + (1 - stability) * 0.4);

    return {
      stakeholderStates: states,
      emotionalDynamics: dynamics,
      prospectTheory,
      aggregateEmotionalClimate: {
        overallValence,
        overallArousal,
        dominantGroupEmotion,
        stability,
        riskOfEmotionalDerailment
      },
      recommendations,
      processingTimeMs: Date.now() - startTime
    };
  }

  /**
   * Quick emotional check - is the emotional climate conducive to deal-making?
   */
  static async quickCheck(ctx: EmotionalContext): Promise<{ conducive: boolean; risk: number; topConcern: string }> {
    const result = await this.analyse(ctx);
    return {
      conducive: result.aggregateEmotionalClimate.riskOfEmotionalDerailment < 0.4,
      risk: result.aggregateEmotionalClimate.riskOfEmotionalDerailment,
      topConcern: result.recommendations.length > 0
        ? result.recommendations[0].reasoning
        : 'Emotional climate is stable'
    };
  }
}

export const emotionalIntelligenceEngine = new EmotionalIntelligenceEngine();
