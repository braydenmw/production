import test from 'node:test';
import assert from 'node:assert/strict';
import { buildBrainCoverageReport } from '../server/routes/brainCoverageAudit.js';

test('buildBrainCoverageReport returns coverage metrics and recommendations', async () => {
  const report = await buildBrainCoverageReport();

  assert.ok(report.totalCandidateEngines > 0);
  assert.ok(report.activeCount >= 0);
  assert.ok(report.underusedCount >= 0);
  assert.equal(report.activeCount + report.underusedCount, report.totalCandidateEngines);
  assert.ok(report.recommendations.length > 0);
});