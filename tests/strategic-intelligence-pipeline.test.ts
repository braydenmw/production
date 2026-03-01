import test from 'node:test';
import assert from 'node:assert/strict';
import { runStrategicIntelligencePipeline } from '../server/routes/strategicIntelligencePipeline.js';

test('runStrategicIntelligencePipeline returns deterministic strategic structure', () => {
  const output = runStrategicIntelligencePipeline(
    'Help us find overlooked regional markets for partnership expansion and create outreach letters.',
    {
      caseStudy: {
        objectives: 'Enter two overlooked regional markets within 12 months',
        currentMatter: 'Need government and partner engagement strategy for market entry',
        uploadedDocuments: ['market-brief.pdf']
      }
    }
  );

  assert.equal(output.model, 'nsil_strategic_pipeline_v8');
  assert.ok(output.readinessScore >= 0 && output.readinessScore <= 100);
  assert.ok(output.stages.length >= 6);
  assert.ok(output.recommendedPath.targetRegion.length > 0);
  assert.ok(output.engagementDraftHints.governmentLetterFocus.length > 0);
});