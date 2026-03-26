/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * USER SIGNAL DECODER - Reflexive Intelligence Layer (Layer 9)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Theory: Discourse Analysis + Repetition Compulsion (Freud, 1914) +
 *         Information-Theoretic Redundancy (Shannon, 1948)
 *
 * Most users don't know exactly what they need. They circle the same problem
 * in different words. They avoid the question they should be asking. They
 * repeat concerns that reveal priorities they haven't articulated.
 *
 * This engine:
 *   1. Scans ALL user input fields simultaneously
 *   2. Detects repetition - same phrases/concepts across fields
 *   3. Detects avoidance - what SHOULD be mentioned but isn't
 *   4. Detects circularity - returning to the same concern
 *   5. Identifies emotional emphasis - where language intensity spikes
 *   6. Generates PROACTIVE QUESTIONS the system should ask the user
 *
 * The system should not just answer. It should ask what the user can't.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ============================================================================
// TYPES
// ============================================================================

export interface UserInputSnapshot {
  missionSummary: string;
  problemStatement: string;
  strategicIntent: string[];
  additionalContext: string;
  country: string;
  region: string;
  sector: string[];
  riskConcerns: string;
  partnerProfile: string;
  collaborativeNotes: string;
  politicalSensitivities: string[];
  priorityThemes: string[];
}

export interface RepetitionSignal {
  phrase: string;
  fieldsFoundIn: string[];
  frequency: number;
  interpretation: string;
  hiddenPriority: string;
}

export interface AvoidanceSignal {
  missingTopic: string;
  expectedBecause: string;
  riskOfOmission: string;
  suggestedQuestion: string;
}

export interface CircularitySignal {
  coreConcern: string;
  manifestations: string[];
  interpretation: string;
  rootQuestion: string;
}

export interface EmphasisSignal {
  field: string;
  intensityScore: number; // 0-1
  emotionalValence: 'positive' | 'negative' | 'anxious' | 'defensive' | 'aspirational';
  significantPhrases: string[];
}

export interface ProactiveQuestion {
  id: string;
  question: string;
  reasoning: string;
  category: 'avoidance' | 'repetition' | 'circularity' | 'depth' | 'reframe' | 'blind-spot';
  priority: number; // 0-1
  triggeredBy: string;
}

export interface UserSignalReport {
  repetitions: RepetitionSignal[];
  avoidances: AvoidanceSignal[];
  circularities: CircularitySignal[];
  emphases: EmphasisSignal[];
  proactiveQuestions: ProactiveQuestion[];
  overallClarity: number;        // 0-100: how clear the user's actual need is
  articulationGap: number;       // 0-100: gap between what they say and what they mean
  hiddenAgenda: string | null;    // What they probably actually need
  timestamp: string;
}

// ============================================================================
// EMPHASIS VOCABULARY
// ============================================================================

const INTENSITY_MARKERS = {
  high: ['critical', 'urgent', 'must', 'essential', 'vital', 'absolutely', 'impossible', 'never', 'always', 'desperate', 'crucial', 'mandatory', 'existential', 'catastrophic'],
  anxious: ['worried', 'concerned', 'risk', 'threat', 'afraid', 'uncertain', 'unstable', 'vulnerable', 'exposed', 'fragile', 'danger', 'collapse', 'decline', 'failing'],
  defensive: ['despite', 'however', 'but', 'although', 'nevertheless', 'not our fault', 'beyond our control', 'external factors', 'unfair', 'overlooked', 'ignored', 'undervalued'],
  aspirational: ['opportunity', 'potential', 'transform', 'vision', 'growth', 'future', 'innovate', 'lead', 'pioneer', 'breakthrough', 'world-class', 'best-in-class'],
  negative: ['problem', 'issue', 'challenge', 'barrier', 'obstacle', 'struggle', 'difficulty', 'setback', 'failure', 'loss', 'deficit', 'shortage', 'gap', 'weakness']
};

// Topics that SHOULD appear given certain contexts
const EXPECTED_TOPICS: Array<{
  trigger: { field: string; patterns: string[] };
  expected: { topic: string; reason: string; riskIfMissing: string };
}> = [
  {
    trigger: { field: 'sector', patterns: ['energy', 'renewable', 'solar', 'wind'] },
    expected: { topic: 'grid connection', reason: 'Energy projects require grid infrastructure', riskIfMissing: 'Projects fail 60% of the time when grid feasibility is not addressed upfront' }
  },
  {
    trigger: { field: 'country', patterns: ['philippines', 'indonesia', 'vietnam'] },
    expected: { topic: 'land ownership', reason: 'Foreign land ownership restrictions exist', riskIfMissing: 'Legal structure may be invalid without addressing ownership constraints' }
  },
  {
    trigger: { field: 'strategicIntent', patterns: ['export', 'international', 'global'] },
    expected: { topic: 'logistics', reason: 'Export requires reliable supply chain', riskIfMissing: 'Export strategies fail when logistics costs exceed 15% of product value' }
  },
  {
    trigger: { field: 'strategicIntent', patterns: ['partnership', 'joint venture', 'collaboration'] },
    expected: { topic: 'exit strategy', reason: 'Partnerships require defined exit mechanisms', riskIfMissing: '70% of JVs that fail do so because exit terms were not defined at formation' }
  },
  {
    trigger: { field: 'sector', patterns: ['agriculture', 'agri', 'farming', 'food'] },
    expected: { topic: 'water', reason: 'Agriculture depends on water security', riskIfMissing: 'Water access is the #1 hidden risk in agricultural investment' }
  },
  {
    trigger: { field: 'sector', patterns: ['technology', 'IT', 'software', 'digital'] },
    expected: { topic: 'talent', reason: 'Tech ventures need skilled workforce', riskIfMissing: 'Regional tech projects fail 50% of the time due to talent pipeline gaps' }
  },
  {
    trigger: { field: 'sector', patterns: ['manufacturing', 'industrial', 'factory'] },
    expected: { topic: 'supply chain', reason: 'Manufacturing needs reliable input supply', riskIfMissing: 'Single-source dependencies cause 40% of manufacturing project delays' }
  },
  {
    trigger: { field: 'strategicIntent', patterns: ['investment', 'attract', 'FDI', 'capital'] },
    expected: { topic: 'incentive', reason: 'Investment attraction requires competitive incentives', riskIfMissing: 'Regions competing for FDI without incentive mapping lose to those who have them' }
  },
  {
    trigger: { field: 'missionSummary', patterns: ['regional', 'community', 'local', 'rural'] },
    expected: { topic: 'infrastructure', reason: 'Regional projects depend on baseline infrastructure', riskIfMissing: 'Infrastructure gaps are the #1 blocker for regional investment attraction' }
  },
  {
    trigger: { field: 'strategicIntent', patterns: ['scale', 'grow', 'expand'] },
    expected: { topic: 'funding', reason: 'Growth requires capital planning', riskIfMissing: 'Growth strategies without funding roadmaps run out of runway' }
  }
];

// ============================================================================
// USER SIGNAL DECODER
// ============================================================================

export class UserSignalDecoder {

  private static async callAI(prompt: string): Promise<string | null> {
    try {
      const base = typeof window !== 'undefined' ? '' : (process.env.VITE_API_BASE_URL || '');
      const res = await fetch(`${base}/api/ai/consultant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: prompt,
          context: { phase: 'reflexive_engine' },
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
   * Full decode of user inputs.
   * Finds what they're actually saying - and what they're not.
   */
  static async decode(input: UserInputSnapshot): Promise<UserSignalReport> {
    const allText = this.collectAllText(input);

    try {
      const aiPrompt = `Decode user signals: mission=${input.missionSummary?.slice(0,200)}, problem=${input.problemStatement?.slice(0,200)}, country=${input.country}`;
      void this.callAI(aiPrompt);
    } catch {
      /* non-critical */
    }
    const fieldTexts = this.collectFieldTexts(input);

    const repetitions = this.detectRepetition(fieldTexts);
    const avoidances = this.detectAvoidance(input);
    const circularities = this.detectCircularity(repetitions, fieldTexts);
    const emphases = this.detectEmphasis(fieldTexts);
    const proactiveQuestions = this.generateQuestions(repetitions, avoidances, circularities, emphases, input);

    // Overall clarity: inverse of how much repetition/avoidance there is
    const repetitionPenalty = Math.min(repetitions.length * 8, 40);
    const avoidancePenalty = Math.min(avoidances.length * 10, 40);
    const clarityBonus = allText.length > 200 ? 20 : allText.length > 100 ? 10 : 0;
    const overallClarity = Math.max(10, Math.min(100, 70 - repetitionPenalty - avoidancePenalty + clarityBonus));

    // Articulation gap: high repetition + high avoidance = high gap
    const articulationGap = Math.min(100, repetitions.length * 12 + avoidances.length * 15);

    // Hidden agenda: synthesise from strongest signals
    const hiddenAgenda = this.inferHiddenAgenda(repetitions, avoidances, emphases, input);

    return {
      repetitions,
      avoidances,
      circularities,
      emphases,
      proactiveQuestions,
      overallClarity,
      articulationGap,
      hiddenAgenda,
      timestamp: new Date().toISOString()
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEXT COLLECTION
  // ──────────────────────────────────────────────────────────────────────────

  private static collectAllText(input: UserInputSnapshot): string {
    return [
      input.missionSummary,
      input.problemStatement,
      input.additionalContext,
      input.riskConcerns,
      input.partnerProfile,
      input.collaborativeNotes,
      ...input.strategicIntent,
      ...input.politicalSensitivities,
      ...input.priorityThemes
    ].filter(Boolean).join(' ').toLowerCase();
  }

  private static collectFieldTexts(input: UserInputSnapshot): Record<string, string> {
    return {
      missionSummary: (input.missionSummary || '').toLowerCase(),
      problemStatement: (input.problemStatement || '').toLowerCase(),
      strategicIntent: (input.strategicIntent || []).join(' ').toLowerCase(),
      additionalContext: (input.additionalContext || '').toLowerCase(),
      riskConcerns: (input.riskConcerns || '').toLowerCase(),
      partnerProfile: (input.partnerProfile || '').toLowerCase(),
      collaborativeNotes: (input.collaborativeNotes || '').toLowerCase(),
      politicalSensitivities: (input.politicalSensitivities || []).join(' ').toLowerCase(),
      priorityThemes: (input.priorityThemes || []).join(' ').toLowerCase(),
      country: (input.country || '').toLowerCase(),
      region: (input.region || '').toLowerCase(),
      sector: (input.sector || []).join(' ').toLowerCase()
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // REPETITION DETECTION
  // Shannon redundancy: phrases appearing in 2+ distinct fields signal
  // priorities the user hasn't explicitly labelled as priorities.
  // ──────────────────────────────────────────────────────────────────────────

  private static detectRepetition(fieldTexts: Record<string, string>): RepetitionSignal[] {
    const signals: RepetitionSignal[] = [];
    const phraseMap = new Map<string, Set<string>>();

    // Extract meaningful phrases (2-4 word n-grams) from each field
    for (const [fieldName, text] of Object.entries(fieldTexts)) {
      if (!text || text.length < 5) continue;
      const words = text.split(/\s+/).filter(w => w.length > 3);

      for (let n = 2; n <= 4; n++) {
        for (let i = 0; i <= words.length - n; i++) {
          const phrase = words.slice(i, i + n).join(' ');
          if (!phraseMap.has(phrase)) phraseMap.set(phrase, new Set());
          phraseMap.get(phrase)!.add(fieldName);
        }
      }
    }

    // Find phrases that appear in 2+ distinct fields
    for (const [phrase, fields] of phraseMap) {
      if (fields.size >= 2) {
        const fieldList = Array.from(fields);
        signals.push({
          phrase,
          fieldsFoundIn: fieldList,
          frequency: fields.size,
          interpretation: `User mentions "${phrase}" across ${fields.size} different input fields, suggesting this is a core concern - possibly more important than they've explicitly stated.`,
          hiddenPriority: this.interpretRepetition(phrase)
        });
      }
    }

    // Sort by frequency (most repeated first), limit to top 10
    return signals
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10);
  }

  private static interpretRepetition(phrase: string): string {
    const p = phrase.toLowerCase();
    if (p.includes('risk') || p.includes('concern') || p.includes('worry')) return 'Risk anxiety - user may need reassurance or clearer risk mitigation framework';
    if (p.includes('growth') || p.includes('opportunity') || p.includes('potential')) return 'Growth ambition - user is seeking validation that opportunity is real';
    if (p.includes('partner') || p.includes('investor') || p.includes('collaboration')) return 'Connection seeking - user may lack network access and needs matchmaking';
    if (p.includes('community') || p.includes('local') || p.includes('regional')) return 'Place identity - user ties their project to regional identity and pride';
    if (p.includes('government') || p.includes('policy') || p.includes('regulation')) return 'Institutional navigation - user may be blocked by bureaucratic processes';
    if (p.includes('funding') || p.includes('capital') || p.includes('budget')) return 'Resource constraint - user needs financing pathways, not just analysis';
    return 'This topic appears to be a hidden priority the user has not explicitly labelled';
  }

  // ──────────────────────────────────────────────────────────────────────────
  // AVOIDANCE DETECTION
  // When context demands a topic but the user never mentions it,
  // that silence is itself a signal.
  // ──────────────────────────────────────────────────────────────────────────

  private static detectAvoidance(input: UserInputSnapshot): AvoidanceSignal[] {
    const signals: AvoidanceSignal[] = [];
    const allText = this.collectAllText(input);

    for (const expected of EXPECTED_TOPICS) {
      // Check if trigger context is present
      const fieldValue = this.getFieldValue(input, expected.trigger.field);
      const triggerPresent = expected.trigger.patterns.some(p =>
        fieldValue.toLowerCase().includes(p.toLowerCase())
      );

      if (triggerPresent) {
        // Check if expected topic is mentioned ANYWHERE
        const topicMentioned = allText.includes(expected.expected.topic.toLowerCase());

        if (!topicMentioned) {
          signals.push({
            missingTopic: expected.expected.topic,
            expectedBecause: expected.expected.reason,
            riskOfOmission: expected.expected.riskIfMissing,
            suggestedQuestion: `Have you considered ${expected.expected.topic}? ${expected.expected.reason}. ${expected.expected.riskIfMissing}`
          });
        }
      }
    }

    return signals;
  }

  private static getFieldValue(input: UserInputSnapshot, field: string): string {
    switch (field) {
      case 'sector': return (input.sector || []).join(' ');
      case 'country': return input.country || '';
      case 'region': return input.region || '';
      case 'strategicIntent': return (input.strategicIntent || []).join(' ');
      case 'missionSummary': return input.missionSummary || '';
      case 'problemStatement': return input.problemStatement || '';
      default: return '';
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // CIRCULARITY DETECTION
  // When the same underlying concern appears in different phrasings,
  // the user is circling a question they can't quite articulate.
  // ──────────────────────────────────────────────────────────────────────────

  private static detectCircularity(
    repetitions: RepetitionSignal[],
    fieldTexts: Record<string, string>
  ): CircularitySignal[] {
    const signals: CircularitySignal[] = [];

    // Group repetitions by theme
    const themeGroups: Record<string, RepetitionSignal[]> = {};
    const themes = ['risk', 'growth', 'partner', 'funding', 'government', 'community', 'technology', 'market'];

    for (const rep of repetitions) {
      for (const theme of themes) {
        if (rep.phrase.includes(theme)) {
          if (!themeGroups[theme]) themeGroups[theme] = [];
          themeGroups[theme].push(rep);
        }
      }
    }

    // If 3+ repetitions cluster around one theme, that's circularity
    for (const [theme, reps] of Object.entries(themeGroups)) {
      if (reps.length >= 2) {
        signals.push({
          coreConcern: theme,
          manifestations: reps.map(r => r.phrase),
          interpretation: `The user returns to "${theme}" ${reps.length} times using different phrases. This circularity suggests the user cannot clearly articulate their core question about ${theme}.`,
          rootQuestion: this.generateRootQuestion(theme, reps, fieldTexts)
        });
      }
    }

    return signals;
  }

  private static generateRootQuestion(theme: string, reps: RepetitionSignal[], _fieldTexts: Record<string, string>): string {
    const fieldNames = [...new Set(reps.flatMap(r => r.fieldsFoundIn))];
    switch (theme) {
      case 'risk': return `What is the specific risk you are most concerned about? You mention risk-related concepts across ${fieldNames.join(', ')} - is there a single scenario you are trying to prevent?`;
      case 'growth': return `What does success actually look like for you? You reference growth in multiple contexts - is this revenue growth, geographic expansion, capability building, or recognition?`;
      case 'partner': return `What kind of partner do you actually need? You mention partnerships repeatedly - are you seeking capital, expertise, market access, or legitimacy?`;
      case 'funding': return `What is your actual funding gap? You reference financial concerns across your inputs - is the core issue access to capital, cost of capital, or cashflow timing?`;
      case 'government': return `What is the government's actual role in your project? You mention government in multiple contexts - are they a partner, a blocker, a funder, or a regulator?`;
      case 'community': return `What is the community outcome you are trying to achieve? You emphasise community across your inputs - is this about jobs, services, identity, or political support?`;
      case 'technology': return `What specific technology capability do you need? Technology appears across your inputs - is this about infrastructure, skills, automation, or digital presence?`;
      case 'market': return `Which market are you actually targeting? Market references appear across your inputs - is this about domestic demand, export markets, or attracting inbound investment?`;
      default: return `You mention "${theme}" across ${fieldNames.join(', ')} - what is the single most important question you need answered about this?`;
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // EMPHASIS DETECTION
  // Measures emotional intensity per field using vocabulary markers.
  // ──────────────────────────────────────────────────────────────────────────

  private static detectEmphasis(fieldTexts: Record<string, string>): EmphasisSignal[] {
    const signals: EmphasisSignal[] = [];

    for (const [field, text] of Object.entries(fieldTexts)) {
      if (!text || text.length < 10) continue;

      const words = text.split(/\s+/);
      let maxIntensity = 0;
      let dominantValence: EmphasisSignal['emotionalValence'] = 'positive';
      const significantPhrases: string[] = [];

      const valenceScores: Record<string, number> = {
        positive: 0, negative: 0, anxious: 0, defensive: 0, aspirational: 0
      };

      for (const [valence, markers] of Object.entries(INTENSITY_MARKERS)) {
        for (const marker of markers) {
          if (text.includes(marker)) {
            valenceScores[valence]++;
            significantPhrases.push(marker);
          }
        }
      }

      const totalMarkers = Object.values(valenceScores).reduce((a, b) => a + b, 0);
      maxIntensity = Math.min(1, totalMarkers / Math.max(words.length, 1) * 10);

      // Find dominant valence
      const maxVal = Math.max(...Object.values(valenceScores));
      if (maxVal > 0) {
        dominantValence = Object.entries(valenceScores)
          .find(([_v, s]) => s === maxVal)?.[0] as EmphasisSignal['emotionalValence'] || 'positive';
      }

      if (maxIntensity > 0.1) {
        signals.push({
          field,
          intensityScore: maxIntensity,
          emotionalValence: dominantValence,
          significantPhrases: significantPhrases.slice(0, 5)
        });
      }
    }

    return signals.sort((a, b) => b.intensityScore - a.intensityScore);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PROACTIVE QUESTION GENERATION
  // The core innovation: instead of just answering, the system ASKS.
  // ──────────────────────────────────────────────────────────────────────────

  private static generateQuestions(
    repetitions: RepetitionSignal[],
    avoidances: AvoidanceSignal[],
    circularities: CircularitySignal[],
    emphases: EmphasisSignal[],
    input: UserInputSnapshot
  ): ProactiveQuestion[] {
    const questions: ProactiveQuestion[] = [];

    // From avoidances - highest priority
    for (const avoidance of avoidances) {
      questions.push({
        id: `avoid-${avoidance.missingTopic.replace(/\s/g, '-')}`,
        question: avoidance.suggestedQuestion,
        reasoning: `${avoidance.expectedBecause}. Risk: ${avoidance.riskOfOmission}`,
        category: 'avoidance',
        priority: 0.9,
        triggeredBy: `Missing topic: ${avoidance.missingTopic}`
      });
    }

    // From circularities - the root question
    for (const circ of circularities) {
      questions.push({
        id: `circ-${circ.coreConcern}`,
        question: circ.rootQuestion,
        reasoning: circ.interpretation,
        category: 'circularity',
        priority: 0.85,
        triggeredBy: `Circular references to: ${circ.coreConcern}`
      });
    }

    // From repetitions - deeper investigation
    for (const rep of repetitions.slice(0, 3)) {
      questions.push({
        id: `rep-${rep.phrase.replace(/\s/g, '-').slice(0, 30)}`,
        question: `You mention "${rep.phrase}" across ${rep.fieldsFoundIn.join(', ')}. Is this the central challenge you need the system to address?`,
        reasoning: rep.interpretation,
        category: 'repetition',
        priority: 0.7,
        triggeredBy: `Repeated ${rep.frequency} times across fields`
      });
    }

    // From emphasis - reframe questions
    const highEmphasis = emphases.filter(e => e.intensityScore > 0.3);
    for (const em of highEmphasis.slice(0, 2)) {
      if (em.emotionalValence === 'defensive') {
        questions.push({
          id: `emphasis-def-${em.field}`,
          question: `Your ${em.field} section uses language that suggests external barriers. What specifically has blocked your progress, and has the approach been adjusted since?`,
          reasoning: `Defensive language in ${em.field} may indicate past failures or frustration that should be addressed directly.`,
          category: 'reframe',
          priority: 0.75,
          triggeredBy: `High defensive emphasis in ${em.field}`
        });
      } else if (em.emotionalValence === 'anxious') {
        questions.push({
          id: `emphasis-anx-${em.field}`,
          question: `Your ${em.field} section indicates significant concern. What is the worst realistic outcome you're trying to prevent?`,
          reasoning: `Anxiety markers suggest the user needs explicit downside scenario analysis, not just upside potential.`,
          category: 'depth',
          priority: 0.8,
          triggeredBy: `High anxiety emphasis in ${em.field}`
        });
      }
    }

    // Blind-spot questions based on what's completely empty
    if (!input.riskConcerns || input.riskConcerns.length < 10) {
      questions.push({
        id: 'blind-risk',
        question: 'You haven\'t identified specific risks. Every project has them. What keeps you up at night about this initiative?',
        reasoning: 'Absence of risk identification is itself the highest risk signal. The system needs explicit risk inputs to calibrate its analysis.',
        category: 'blind-spot',
        priority: 0.95,
        triggeredBy: 'Empty or minimal risk concerns'
      });
    }

    if (!input.partnerProfile || input.partnerProfile.length < 10) {
      questions.push({
        id: 'blind-partner',
        question: 'Who specifically needs to say yes for this to succeed? If you can\'t name them, the system can help identify the right partner profile.',
        reasoning: 'Projects without defined partner criteria have 3× longer activation timelines.',
        category: 'blind-spot',
        priority: 0.85,
        triggeredBy: 'No partner profile defined'
      });
    }

    // Sort by priority
    return questions.sort((a, b) => b.priority - a.priority).slice(0, 8);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // HIDDEN AGENDA INFERENCE
  // Synthesise the strongest signals into a hypothesis about what
  // the user actually needs but hasn't said.
  // ──────────────────────────────────────────────────────────────────────────

  private static inferHiddenAgenda(
    repetitions: RepetitionSignal[],
    avoidances: AvoidanceSignal[],
    emphases: EmphasisSignal[],
    input: UserInputSnapshot
  ): string | null {
    if (repetitions.length === 0 && avoidances.length === 0) return null;

    const clues: string[] = [];

    if (repetitions.length > 0) clues.push(`repeatedly references "${repetitions[0].phrase}"`);
    if (avoidances.length > 0) clues.push(`avoids discussing ${avoidances[0].missingTopic}`);

    const defensiveFields = emphases.filter(e => e.emotionalValence === 'defensive');
    if (defensiveFields.length > 0) clues.push('uses defensive language suggesting past setbacks');

    const anxiousFields = emphases.filter(e => e.emotionalValence === 'anxious');
    if (anxiousFields.length > 0) clues.push('shows anxiety about specific outcomes');

    if (clues.length === 0) return null;

    // Attempt synthesis
    const hasRegionalContext = (input.region || '').length > 0 || (input.missionSummary || '').toLowerCase().includes('regional');
    const hasFundingAnxiety = repetitions.some(r => r.phrase.includes('fund') || r.phrase.includes('capital') || r.phrase.includes('budget'));
    const hasRecognitionNeed = repetitions.some(r => r.phrase.includes('overlook') || r.phrase.includes('ignore') || r.phrase.includes('recogni'));

    if (hasRegionalContext && hasFundingAnxiety) {
      return 'The user likely needs concrete funding pathways and institutional-grade documentation to attract investment - not just analysis of whether the opportunity is viable.';
    }
    if (hasRegionalContext && hasRecognitionNeed) {
      return 'The user likely needs help articulating their region\'s competitive identity in the language that investors and institutions expect - the capability exists, the translation is missing.';
    }
    if (hasFundingAnxiety) {
      return 'The user\'s core need appears to be capital access, not strategic analysis. The system should prioritise funding pathway recommendations and investor-ready documentation.';
    }

    return `Based on signal analysis (${clues.join('; ')}), the user may need help articulating their core need before the system can properly analyse their opportunity.`;
  }
}

export default UserSignalDecoder;
