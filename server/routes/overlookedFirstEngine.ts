export interface EvidenceItem {
  source: string;
  claim: string;
  recencyDays?: number;
  credibility?: number;
}

export interface MarketSignal {
  city: string;
  country: string;
  sector: string;
  saturationIndex: number;
  policySupportIndex: number;
  logisticsIndex: number;
  talentIndex: number;
  stabilityRisk: number;
}

export interface OverlookedScore {
  place: string;
  score: number;
  reason: string[];
}

export interface OverlookedIntelligenceSnapshot {
  evidenceCredibility: number;
  perceptionRealityGap: number;
  topRegionalOpportunities: OverlookedScore[];
}

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

const tokenize = (value: string): string[] => value
  .toLowerCase()
  .split(/[^a-z0-9]+/)
  .map((token) => token.trim())
  .filter(Boolean);

export const credibilityScore = (evidence: EvidenceItem[]): number => {
  if (!evidence.length) return 0;

  const credibilityAvg = evidence.reduce((total, item) => total + clamp(item.credibility ?? 0.55, 0, 1), 0) / evidence.length;
  const recencyAvg = evidence.reduce((total, item) => {
    const recencyDays = typeof item.recencyDays === 'number' ? clamp(item.recencyDays, 0, 3650) : 365;
    const recencyFactor = 1 - recencyDays / 3650;
    return total + recencyFactor;
  }, 0) / evidence.length;

  return Math.round(clamp(((credibilityAvg * 0.72) + (recencyAvg * 0.28)) * 100, 0, 100));
};

export const perceptionRealityGap = (perceptionRisk: number, factualRisk: number): number => {
  return Math.round(clamp(perceptionRisk, 0, 100) - clamp(factualRisk, 0, 100));
};

export const rankOverlookedMarkets = (signals: MarketSignal[]): OverlookedScore[] => {
  return signals
    .map((signal) => {
      const upside =
        signal.policySupportIndex * 0.28 +
        signal.logisticsIndex * 0.2 +
        signal.talentIndex * 0.2 +
        (100 - signal.saturationIndex) * 0.22 +
        (100 - signal.stabilityRisk) * 0.1;

      const reasons = [
        signal.saturationIndex <= 45 ? 'Lower saturation than overdeveloped hub markets' : '',
        signal.policySupportIndex >= 65 ? 'Policy and investment support profile is favorable' : '',
        signal.logisticsIndex >= 60 ? 'Logistics and delivery infrastructure supports execution' : '',
        signal.talentIndex >= 60 ? 'Talent ecosystem can support scaling operations' : '',
        signal.stabilityRisk <= 45 ? 'Risk profile remains manageable for phased entry' : ''
      ].filter(Boolean);

      return {
        place: `${signal.city}, ${signal.country}`,
        score: Math.round(clamp(upside, 0, 100)),
        reason: reasons.length > 0 ? reasons : ['Mixed profile: requires deeper diligence']
      };
    })
    .sort((a, b) => b.score - a.score);
};

const extractCaseStudyObject = (context?: unknown): Record<string, unknown> => {
  if (!context || typeof context !== 'object') return {};
  const root = context as Record<string, unknown>;
  const caseStudy = root.caseStudy;
  if (!caseStudy || typeof caseStudy !== 'object') return {};
  return caseStudy as Record<string, unknown>;
};

const deriveFallbackMarketSignals = (message: string, context?: unknown): MarketSignal[] => {
  const caseStudy = extractCaseStudyObject(context);
  const text = `${message} ${String(caseStudy.currentMatter || '')} ${String(caseStudy.objectives || '')}`.toLowerCase();
  const objectiveTokens = tokenize(text);
  const diversificationBias = objectiveTokens.some((token) => ['regional', 'overlooked', 'new', 'expansion', 'market'].includes(token));

  const baseSignals: MarketSignal[] = [
    {
      city: 'Cebu',
      country: 'Philippines',
      sector: 'infrastructure',
      saturationIndex: diversificationBias ? 34 : 42,
      policySupportIndex: 72,
      logisticsIndex: 64,
      talentIndex: 66,
      stabilityRisk: 41
    },
    {
      city: 'Da Nang',
      country: 'Vietnam',
      sector: 'manufacturing',
      saturationIndex: diversificationBias ? 36 : 44,
      policySupportIndex: 70,
      logisticsIndex: 68,
      talentIndex: 63,
      stabilityRisk: 39
    },
    {
      city: 'Davao',
      country: 'Philippines',
      sector: 'agribusiness',
      saturationIndex: diversificationBias ? 31 : 40,
      policySupportIndex: 69,
      logisticsIndex: 58,
      talentIndex: 62,
      stabilityRisk: 43
    },
    {
      city: 'Surabaya',
      country: 'Indonesia',
      sector: 'logistics',
      saturationIndex: diversificationBias ? 38 : 46,
      policySupportIndex: 67,
      logisticsIndex: 70,
      talentIndex: 64,
      stabilityRisk: 44
    },
    {
      city: 'Thessaloniki',
      country: 'Greece',
      sector: 'trade',
      saturationIndex: diversificationBias ? 40 : 48,
      policySupportIndex: 65,
      logisticsIndex: 66,
      talentIndex: 65,
      stabilityRisk: 37
    }
  ];

  return baseSignals;
};

const deriveEvidenceSet = (message: string, context?: unknown): EvidenceItem[] => {
  const caseStudy = extractCaseStudyObject(context);
  const uploadedDocuments = Array.isArray(caseStudy.uploadedDocuments) ? caseStudy.uploadedDocuments as unknown[] : [];
  const additionalContext = Array.isArray(caseStudy.additionalContext) ? caseStudy.additionalContext as unknown[] : [];

  const evidence: EvidenceItem[] = [];

  if (uploadedDocuments.length > 0) {
    evidence.push({
      source: 'Uploaded case documents',
      claim: `User supplied ${uploadedDocuments.length} document(s) for evidence grounding.`,
      recencyDays: 30,
      credibility: 0.82
    });
  }

  if (additionalContext.length > 0) {
    evidence.push({
      source: 'Session context notes',
      claim: `Conversation contains ${additionalContext.length} context note(s).`,
      recencyDays: 10,
      credibility: 0.68
    });
  }

  const hasExternalSignals = /world bank|imf|oecd|development bank|ministry|regulator|policy|official/i.test(message);
  if (hasExternalSignals) {
    evidence.push({
      source: 'External signal references in user message',
      claim: 'Message references institutional or policy signals.',
      recencyDays: 45,
      credibility: 0.74
    });
  }

  if (evidence.length === 0) {
    evidence.push({
      source: 'User narrative baseline',
      claim: 'No formal evidence assets detected yet; working from narrative input.',
      recencyDays: 120,
      credibility: 0.52
    });
  }

  return evidence;
};

export const buildOverlookedIntelligenceSnapshot = (message: string, context?: unknown): OverlookedIntelligenceSnapshot => {
  const evidence = deriveEvidenceSet(message, context);
  const marketSignals = deriveFallbackMarketSignals(message, context);
  const evidenceCredibility = credibilityScore(evidence);

  const perceptionProxyRisk = 62;
  const factualProxyRisk = Math.round(
    marketSignals.reduce((sum, signal) => sum + signal.stabilityRisk, 0) / Math.max(1, marketSignals.length)
  );

  return {
    evidenceCredibility,
    perceptionRealityGap: perceptionRealityGap(perceptionProxyRisk, factualProxyRisk),
    topRegionalOpportunities: rankOverlookedMarkets(marketSignals).slice(0, 5)
  };
};