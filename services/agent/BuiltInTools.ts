// ============================================================================
// BUILT-IN TOOLS
// Registers the core BWGA intelligence tools into the AgentToolRegistry.
// Each tool wraps real data services + AI analysis for actionable intelligence.
// ============================================================================

import type { AgentToolRegistry } from './AgentToolRegistry';
import { LiveDataService, ExchangeRateAPI } from '../LiveDataService';
import { PartnerIntelligenceEngine } from '../PartnerIntelligenceEngine';
import { CompositeScoreService, type CompositeScoreContext } from '../CompositeScoreService';
import { researchTopic, interpretScores, analyseWithAI, analyseRootCauses, generateDebate } from '../AIEngineLayer';
import { webSearch, formatResultsForPrompt } from '../WebSearchGateway';
import type { PartnerCandidate } from '../PartnerIntelligenceEngine';

export function registerBuiltInTools(registry: AgentToolRegistry): void {

  // ── COUNTRY INTELLIGENCE (Real World Bank data + AI interpretation) ───────
  registry.register({
    name: 'get_country_intelligence',
    description: 'Fetch live macro, trade, risk, and policy data for any country via World Bank, Exchange Rate, and REST Countries APIs. Returns real economic data with AI-generated analysis.',
    parameters: {
      country: { type: 'string', description: 'Country name (e.g. "Kenya", "Papua New Guinea")', required: true }
    },
    execute: async (p) => {
      const country = p.country as string;
      const data = await LiveDataService.getCountryIntelligence(country);

      // Build summary from REAL API data (correct property paths)
      const econ = data.economics;
      const profile = data.profile;
      const lines: string[] = [
        `Country Intelligence — ${country}`,
        `Data Quality: ${data.dataQuality.hasRealData ? '✅ Live data' : '⚠️ Limited data'} | Sources: ${data.dataQuality.sources.join(', ')}`,
      ];

      if (profile) {
        lines.push(
          `Region: ${profile.region} / ${profile.subregion}`,
          `Capital: ${profile.capital}`,
          `Languages: ${profile.languages.join(', ')}`,
          `Currencies: ${profile.currencies.join(', ')}`,
        );
      }

      if (econ) {
        if (econ.population) lines.push(`Population: ${(econ.population / 1e6).toFixed(1)}M`);
        if (econ.gdpCurrent) lines.push(`GDP: $${(econ.gdpCurrent / 1e9).toFixed(1)}B`);
        if (econ.gdpGrowth != null) lines.push(`GDP Growth: ${econ.gdpGrowth.toFixed(1)}%`);
        if (econ.inflation != null) lines.push(`Inflation: ${econ.inflation.toFixed(1)}%`);
        if (econ.fdiInflows) lines.push(`FDI Inflows: $${(econ.fdiInflows / 1e9).toFixed(1)}B`);
        if (econ.tradeBalance) lines.push(`Trade Balance: $${(econ.tradeBalance / 1e9).toFixed(1)}B`);
        if (econ.unemployment != null) lines.push(`Unemployment: ${econ.unemployment.toFixed(1)}%`);
        if (econ.easeOfBusiness != null) lines.push(`Ease of Business Rank: ${econ.easeOfBusiness}`);
      }

      if (data.currency) {
        lines.push(`Exchange Rate: 1 USD = ${data.currency.rate.toFixed(2)} ${profile?.currencies[0] || 'local'}`);
      }

      // AI interpretation of the economic data
      let aiAnalysis = '';
      if (econ && data.dataQuality.hasRealData) {
        try {
          const scores: Record<string, number> = {};
          if (econ.gdpGrowth != null) scores['GDP Growth (%)'] = econ.gdpGrowth;
          if (econ.inflation != null) scores['Inflation (%)'] = econ.inflation;
          if (econ.unemployment != null) scores['Unemployment (%)'] = econ.unemployment;
          if (econ.fdiInflows) scores['FDI Inflows ($B)'] = econ.fdiInflows / 1e9;
          if (Object.keys(scores).length > 0) {
            aiAnalysis = await interpretScores(country, scores, 'Regional development and investment context');
            lines.push(`\nAI Analysis: ${aiAnalysis}`);
          }
        } catch { /* AI interpretation optional */ }
      }

      return { success: true, data, latencyMs: 0, summary: lines.join('\n') };
    }
  });

  // ── EXCHANGE RATE (Real API) ─────────────────────────────────────────────
  registry.register({
    name: 'get_exchange_rate',
    description: 'Get live exchange rate between two currencies from Open Exchange Rates API',
    parameters: {
      from: { type: 'string', description: 'Source currency code (e.g. "USD")', required: true },
      to: { type: 'string', description: 'Target currency code (e.g. "EUR")', required: true }
    },
    execute: async (p) => {
      try {
        const rate = await ExchangeRateAPI.getRate(p.from as string, p.to as string);
        if (rate !== null) {
          return { success: true, data: { from: p.from, to: p.to, rate }, latencyMs: 0, summary: `1 ${p.from} = ${rate.toFixed(4)} ${p.to}` };
        }
        return { success: false, data: null, error: `Rate not available for ${p.from}→${p.to}`, latencyMs: 0 };
      } catch (e) {
        return { success: false, data: null, error: String(e), latencyMs: 0 };
      }
    }
  });

  // ── PARTNER SCORING (Heuristic scores + AI reasoning) ────────────────────
  registry.register({
    name: 'score_partner',
    description: 'Score and rank potential partners using PVI/CIS/CCS/RFI/SRA/FRS algorithms with AI-generated reasoning about each candidate.',
    parameters: {
      country: { type: 'string', description: 'Engagement country', required: true },
      sector: { type: 'string', description: 'Sector (government / banking / corporate / multilateral)', required: true },
      objective: { type: 'string', description: 'Strategic objective or engagement purpose' },
      constraints: { type: 'string', description: 'Any constraints or exclusion criteria' },
      candidateNames: { type: 'string', description: 'Comma-separated list of partner organisation names' }
    },
    execute: async (p) => {
      const names = String(p.candidateNames ?? '').split(',').map(n => n.trim()).filter(Boolean);
      const candidates: PartnerCandidate[] = names.map((name, i) => ({
        id: `p${i}`,
        name,
        type: inferPartnerType(p.sector as string),
        countries: [p.country as string],
        sectors: [p.sector as string]
      }));

      if (candidates.length === 0) {
        return { success: false, data: null, error: 'No candidate names provided', latencyMs: 0 };
      }

      const ranked = PartnerIntelligenceEngine.rankPartners({
        country: p.country as string,
        sector: p.sector as string,
        objective: String(p.objective ?? ''),
        constraints: String(p.constraints ?? ''),
        candidates
      });

      // Add AI-generated reasoning about why these partners fit
      let aiReasoning = '';
      try {
        const debate = await generateDebate(
          `${names.join(', ')} as partners for ${p.objective || 'regional development'} in ${p.country}`,
          `Sector: ${p.sector}. ${p.constraints || ''}`
        );
        aiReasoning = debate.synthesis || '';
      } catch { /* AI reasoning optional */ }

      const summary = ranked
        .map(r => `${r.partner.name}: ${r.score.total}/100 — ${r.reasons.join(', ')}`)
        .join('\n');

      return {
        success: true,
        data: ranked,
        latencyMs: 0,
        summary: summary + (aiReasoning ? `\n\nAI Assessment: ${aiReasoning}` : '')
      };
    }
  });

  // ── REGIONAL DEVELOPMENT ANALYSIS (AI-powered research + real data) ──────
  registry.register({
    name: 'run_regional_kernel',
    description: 'Run AI-powered regional development analysis: researches the region, analyses root causes, and generates intervention recommendations using real data and AI reasoning.',
    parameters: {
      country: { type: 'string', description: 'Country', required: true },
      jurisdiction: { type: 'string', description: 'Jurisdiction or sub-region', required: true },
      sector: { type: 'string', description: 'Sector focus', required: true },
      objective: { type: 'string', description: 'Strategic objective', required: true },
      currentMatter: { type: 'string', description: 'Current situation or problem statement' },
      constraints: { type: 'string', description: 'Constraints or boundary conditions' }
    },
    execute: async (p) => {
      const country = p.country as string;
      const jurisdiction = p.jurisdiction as string;
      const sector = p.sector as string;
      const objective = p.objective as string;
      const context = `Country: ${country}, Region: ${jurisdiction}, Sector: ${sector}. ${p.constraints || ''}`;

      // Run AI research + root cause analysis + live data in parallel
      const [researchResult, rootCauseResult, liveDataResult] = await Promise.allSettled([
        researchTopic(`${objective} ${jurisdiction} ${country} ${sector} regional development`),
        analyseRootCauses(
          String(p.currentMatter || objective),
          context
        ),
        LiveDataService.getCountryIntelligence(country),
      ]);

      const research = researchResult.status === 'fulfilled' ? researchResult.value : null;
      const rootCause = rootCauseResult.status === 'fulfilled' ? rootCauseResult.value : null;
      const liveData = liveDataResult.status === 'fulfilled' ? liveDataResult.value : null;

      const summaryParts: string[] = [];

      if (liveData?.economics?.gdpGrowth != null) {
        summaryParts.push(`${country} GDP Growth: ${liveData.economics.gdpGrowth.toFixed(1)}%`);
      }

      if (rootCause?.rootCauses?.length) {
        summaryParts.push(`\nRoot Causes:\n${rootCause.rootCauses.slice(0, 3).map(rc => `• ${rc.cause} [${rc.severity}]`).join('\n')}`);
      }

      if (rootCause?.interventionPoints?.length) {
        summaryParts.push(`\nIntervention Points:\n${rootCause.interventionPoints.slice(0, 3).map(ip => `• ${ip.point} (${ip.expectedImpact}, ${ip.difficulty})`).join('\n')}`);
      }

      if (research?.keyFindings?.length) {
        summaryParts.push(`\nResearch Findings:\n${research.keyFindings.slice(0, 3).map(f => `• ${f}`).join('\n')}`);
      }

      if (research?.dataPoints?.length) {
        summaryParts.push(`\nData Points:\n${research.dataPoints.slice(0, 3).map(d => `• ${d.label}: ${d.value} (${d.source})`).join('\n')}`);
      }

      return {
        success: true,
        data: {
          research,
          rootCause,
          liveData: liveData?.economics || null,
          interventions: rootCause?.interventionPoints || [],
          governanceReadiness: research ? Math.round(research.confidence * 100) : 0,
          notes: rootCause?.systemicPatterns || []
        },
        latencyMs: 0,
        summary: summaryParts.join('\n') || 'Analysis completed — no specific findings for this region/sector.'
      };
    }
  });

  // ── COMPOSITE SCORE (Heuristic calculation + AI interpretation) ──────────
  registry.register({
    name: 'calculate_composite_scores',
    description: 'Calculate the full suite of BWGA composite indices for a country and sector, with AI narrative interpretation',
    parameters: {
      country: { type: 'string', description: 'Country', required: true },
      sector: { type: 'string', description: 'Sector context' },
      gdpGrowth: { type: 'number', description: 'GDP growth rate (%)' },
      inflationRate: { type: 'number', description: 'Inflation rate (%)' },
      fdiInflows: { type: 'number', description: 'FDI inflows (USD billions)' }
    },
    execute: async (p) => {
      const ctx: CompositeScoreContext = {
        country: p.country as string,
        region: p.country as string,
        industry: p.sector ? [p.sector as string] : undefined,
      };
      const scores = await CompositeScoreService.getScores(ctx);
      const c = scores.components;

      const scoreSummary = [
        `Overall: ${scores.overall?.toFixed(1) ?? 'N/A'}/100`,
        `Infrastructure: ${c.infrastructure?.toFixed(1)}`,
        `Market Access: ${c.marketAccess?.toFixed(1)}`,
        `Political Stability: ${c.politicalStability?.toFixed(1)}`,
        `Regulatory: ${c.regulatory?.toFixed(1)}`,
        `Growth Potential: ${c.growthPotential?.toFixed(1)}`,
        `Digital Readiness: ${c.digitalReadiness?.toFixed(1)}`,
        `Sustainability: ${c.sustainability?.toFixed(1)}`,
      ].join(' | ');

      // Add AI interpretation of scores
      let aiNarrative = '';
      try {
        const numericScores: Record<string, number> = {};
        for (const [k, v] of Object.entries(c)) {
          if (typeof v === 'number') numericScores[k] = v;
        }
        aiNarrative = await interpretScores(
          p.country as string,
          numericScores,
          p.sector ? `Sector: ${p.sector}` : undefined
        );
      } catch { /* AI interpretation optional */ }

      return {
        success: true,
        data: scores,
        latencyMs: 0,
        summary: scoreSummary + (aiNarrative ? `\n\nAI Interpretation: ${aiNarrative}` : '')
      };
    }
  });

  // ── RESEARCH TOPIC (New — AI-powered web research) ───────────────────────
  registry.register({
    name: 'research_topic',
    description: 'Research any topic using live web search + AI synthesis. Returns factual findings, data points, and an analytical summary. Use for current data, policy analysis, market intelligence.',
    parameters: {
      query: { type: 'string', description: 'Research question or topic', required: true },
      country: { type: 'string', description: 'Country context for the research' },
    },
    execute: async (p) => {
      const query = p.country
        ? `${p.query} ${p.country}`
        : p.query as string;

      const result = await researchTopic(query);

      const lines: string[] = [];
      if (result.aiSynthesis) lines.push(`Summary: ${result.aiSynthesis}`);
      if (result.keyFindings.length) {
        lines.push(`\nKey Findings:\n${result.keyFindings.map(f => `• ${f}`).join('\n')}`);
      }
      if (result.dataPoints.length) {
        lines.push(`\nData Points:\n${result.dataPoints.map(d => `• ${d.label}: ${d.value} (${d.source})`).join('\n')}`);
      }
      lines.push(`\nConfidence: ${(result.confidence * 100).toFixed(0)}%`);

      return {
        success: true,
        data: result,
        latencyMs: 0,
        summary: lines.join('\n')
      };
    }
  });

  // ── ANALYSE SITUATION (New — AI 7-perspective analysis) ──────────────────
  registry.register({
    name: 'analyse_situation',
    description: 'Run a deep AI-powered situation analysis from 7 strategic perspectives: Explicit Needs, Implicit Needs, Unconsidered Needs, Contrarian View, Historical Parallel, Stakeholder View, Time-Horizon Divergence.',
    parameters: {
      situation: { type: 'string', description: 'The situation or problem to analyse', required: true },
      country: { type: 'string', description: 'Country context' },
      sector: { type: 'string', description: 'Sector context' },
      objective: { type: 'string', description: 'Strategic objective' },
    },
    execute: async (p) => {
      const result = await analyseWithAI(p.situation as string, {
        country: p.country as string | undefined,
        sector: p.sector as string | undefined,
        objective: p.objective as string | undefined,
      });

      const lines: string[] = [];
      for (const persp of result.perspectives) {
        lines.push(`**${persp.viewpoint}** (confidence: ${(persp.confidence * 100).toFixed(0)}%)`);
        lines.push(persp.analysis);
        if (persp.actionItems.length) {
          lines.push(`Actions: ${persp.actionItems.join('; ')}`);
        }
        lines.push('');
      }
      if (result.blindSpots.length) {
        lines.push(`Blind Spots: ${result.blindSpots.join('; ')}`);
      }
      if (result.synthesisNarrative) {
        lines.push(`\nSynthesis: ${result.synthesisNarrative}`);
      }

      return {
        success: true,
        data: result,
        latencyMs: 0,
        summary: lines.join('\n')
      };
    }
  });

  // ── GENERATE DOCUMENT ────────────────────────────────────────────────────
  registry.register({
    name: 'recommend_document',
    description: 'Identify the correct document type to generate for the current case situation and audience',
    parameters: {
      situation: { type: 'string', description: 'Current situation or case context', required: true },
      audience: { type: 'string', description: 'Target audience (e.g. ministry, board, investor, regulator)' },
      urgency: { type: 'string', description: 'Urgency level: immediate / near-term / planned' }
    },
    execute: async (p) => {
      const situation = String(p.situation).toLowerCase();
      const audience = String(p.audience ?? '').toLowerCase();

      let recommendation = 'Situation Assessment Report';
      const docs: string[] = [];

      if (audience.includes('investor') || situation.includes('invest') || situation.includes('funding')) {
        docs.push('Investment Prospectus', 'Financial Risk Register');
      }
      if (audience.includes('ministry') || audience.includes('government') || situation.includes('policy')) {
        docs.push('Government Policy Brief', 'Regulatory Compliance Report');
      }
      if (situation.includes('partner') || situation.includes('collaborat')) {
        docs.push('Partnership Proposal Letter', 'Partner Intelligence Report');
      }
      if (situation.includes('risk') || situation.includes('threat')) {
        docs.push('Risk Register', 'Adversarial Stress Test Report');
      }
      if (docs.length === 0) docs.push('Situation Assessment Report', 'Strategic Options Brief');

      recommendation = docs[0];
      return {
        success: true,
        data: { recommended: recommendation, allSuggested: docs },
        latencyMs: 0,
        summary: `Recommended document: ${recommendation}\nAlso applicable: ${docs.slice(1).join(', ')}`
      };
    }
  });
}

// Helper: infer PartnerCandidate type from sector string
function inferPartnerType(sector: string): PartnerCandidate['type'] {
  const s = sector.toLowerCase();
  if (s.includes('bank') || s.includes('financ')) return 'bank';
  if (s.includes('government') || s.includes('public') || s.includes('ministry')) return 'government';
  if (s.includes('multilateral') || s.includes('development') || s.includes('ifc') || s.includes('worldbank')) return 'multilateral';
  if (s.includes('community') || s.includes('ngo') || s.includes('civil')) return 'community';
  return 'corporate';
}
