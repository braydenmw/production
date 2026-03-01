import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildOverlookedIntelligenceSnapshot,
  credibilityScore,
  perceptionRealityGap,
  rankOverlookedMarkets,
  type EvidenceItem,
  type MarketSignal
} from '../server/routes/overlookedFirstEngine.js';

test('credibilityScore rewards credible and recent evidence', () => {
  const strongEvidence: EvidenceItem[] = [
    { source: 'World Bank', claim: 'Regional growth trend', credibility: 0.9, recencyDays: 30 },
    { source: 'Gov publication', claim: 'Policy incentives active', credibility: 0.85, recencyDays: 45 }
  ];

  const weakEvidence: EvidenceItem[] = [
    { source: 'Old forum post', claim: 'Opinion only', credibility: 0.3, recencyDays: 1800 }
  ];

  assert.ok(credibilityScore(strongEvidence) > credibilityScore(weakEvidence));
});

test('perceptionRealityGap is positive when perception exceeds factual risk', () => {
  assert.equal(perceptionRealityGap(70, 40), 30);
  assert.equal(perceptionRealityGap(35, 50), -15);
});

test('rankOverlookedMarkets prioritizes lower saturation and stronger support', () => {
  const signals: MarketSignal[] = [
    {
      city: 'High Potential City',
      country: 'A',
      sector: 'logistics',
      saturationIndex: 25,
      policySupportIndex: 80,
      logisticsIndex: 74,
      talentIndex: 72,
      stabilityRisk: 30
    },
    {
      city: 'Overheated Hub',
      country: 'B',
      sector: 'logistics',
      saturationIndex: 85,
      policySupportIndex: 52,
      logisticsIndex: 62,
      talentIndex: 63,
      stabilityRisk: 45
    }
  ];

  const ranked = rankOverlookedMarkets(signals);
  assert.equal(ranked[0].place, 'High Potential City, A');
  assert.ok(ranked[0].score > ranked[1].score);
});

test('buildOverlookedIntelligenceSnapshot returns top opportunities and metrics', () => {
  const snapshot = buildOverlookedIntelligenceSnapshot(
    'Find overlooked regional markets with better policy support than major crowded hubs.',
    {
      caseStudy: {
        uploadedDocuments: ['regional-analysis.pdf'],
        additionalContext: ['policy memo', 'investment options']
      }
    }
  );

  assert.ok(snapshot.evidenceCredibility >= 0 && snapshot.evidenceCredibility <= 100);
  assert.ok(Array.isArray(snapshot.topRegionalOpportunities));
  assert.ok(snapshot.topRegionalOpportunities.length > 0);
});