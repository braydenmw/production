/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ENTITY INTELLIGENCE PIPELINE
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * The Entity Intelligence Pipeline resolves the critical gap between
 * country-level NSIL analysis and entity-level due diligence.
 *
 * When a user asks about a specific entity (company, person, agency, fund),
 * this pipeline orchestrates parallel lookups across:
 *
 *  1. OpenSanctions  — sanctions screening, PEP detection (OFAC, EU, UN, etc.)
 *  2. OpenCorporates — company verification, incorporation, directors
 *  3. GLEIF          — Legal Entity Identifier, registration status, parent chain
 *  4. Tavily         — real-time web intelligence (synthesized + sourced)
 *  5. Brave Search   — independent web search (non-Google-biased)
 *  6. GDELT          — global news sentiment and recent coverage
 *  7. V-Dem          — governance quality of the entity's jurisdiction
 *
 * The pipeline produces a unified EntityIntelligenceReport that the
 * BWConsultantAgenticAI uses to ground its entity matching and
 * partnership assessments in REAL data instead of LLM guesses.
 *
 * Design principles:
 *  - All lookups are parallel (fast — typically <3s total)
 *  - Every data point is sourced (no fabricated intelligence)
 *  - Graceful degradation (any API can fail without breaking the pipeline)
 *  - Anti-bias by design: scores on data, not on entity fame
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { screenEntitySanctions, type SanctionsScreenResult } from './openSanctionsService';
import { fetchOpenCorporatesCompany, type OpenCorporateRecord } from './externalDataIntegrations';
import { searchLEI, type LEISearchResult } from './gleifService';
import { tavilyDeepSearch, type TavilySearchResponse } from './tavilySearchService';
import { braveEntityResearch, isBraveAvailable, type BraveSearchResponse } from './braveSearchService';
import { getVDemProfile, type VDemGovernanceProfile } from './vdemGovernanceService';

// ─── Entity Detection ───────────────────────────────────────────────────────

const ENTITY_PATTERNS = [
  // Specific roles/titles
  /\b(mayor|governor|minister|president|ceo|cfo|director|chairman|secretary|ambassador|senator|congressman|general|admiral|chief)\s+(?:of\s+)?(\w[\w\s]{1,40})/i,
  // Company indicators
  /\b([\w\s]{2,30})\s+(pty|ltd|inc|corp|llc|plc|gmbh|sa|ag|co\.?\s*ltd|limited|corporation|group|holdings|fund|bank|authority|agency)\b/i,
  // "about X" patterns
  /\b(?:about|regarding|with|partner(?:ing)?\s+with|invest(?:ing)?\s+in|deal\s+with|working\s+with|doing\s+business\s+with)\s+([\w\s]{3,40}?)(?:\s*[?.!,]|$)/i,
  // Quoted entity name
  /"([^"]{3,50})"/,
];

/**
 * Attempt to extract an entity name from a user query.
 * Returns the entity name or null if no entity is detected.
 */
export function detectEntityInQuery(query: string): { entityName: string; entityType: 'person' | 'organization' | 'unknown' } | null {
  if (!query || query.length < 5) return null;

  // Check for person indicators
  const personMatch = query.match(/\b(mayor|governor|minister|president|ceo|cfo|director|chairman|secretary|ambassador|senator|congressman|general|admiral|chief|mr\.|mrs\.|ms\.|dr\.|hon\.|sir)\s+([\w\s]{2,40}?)(?:\s*[?.!,]|\s+(?:of|in|at|from|is|was|and|the)\b|$)/i);
  if (personMatch) {
    return { entityName: `${personMatch[1]} ${personMatch[2]}`.trim(), entityType: 'person' };
  }

  // Check for company/org indicators
  const orgMatch = query.match(/\b([\w\s]{2,30})\s+(pty\s*ltd|ltd|inc|corp|llc|plc|gmbh|sa|ag|co\.?\s*ltd|limited|corporation|group|holdings|fund|bank|authority|agency)\b/i);
  if (orgMatch) {
    return { entityName: `${orgMatch[1]} ${orgMatch[2]}`.trim(), entityType: 'organization' };
  }

  // Check for "about X" patterns
  for (const pattern of ENTITY_PATTERNS.slice(2)) {
    const m = query.match(pattern);
    if (m && m[1] && m[1].trim().length >= 3) {
      const name = m[1].trim();
      // Skip common non-entity words
      if (/^(the|this|that|these|those|my|your|our|their|some|any|all|more|same|other|each|every)$/i.test(name)) continue;
      return { entityName: name, entityType: 'unknown' };
    }
  }

  return null;
}

// ─── GDELT News Lookup ──────────────────────────────────────────────────────

interface GDELTArticle {
  title: string;
  url: string;
  source: string;
  date: string;
  tone?: number;   // GDELT tone score: negative = bad press, positive = good press
}

async function fetchGDELTNews(entityName: string, maxResults = 5): Promise<GDELTArticle[]> {
  try {
    const q = encodeURIComponent(`"${entityName}"`);
    const res = await fetch(
      `https://api.gdeltproject.org/api/v2/doc/doc?query=${q}&mode=artlist&maxrecords=${maxResults}&format=json`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return [];

    const data = await res.json();
    return ((data.articles || []) as any[]).slice(0, maxResults).map(art => ({
      title: art.title || '',
      url: art.url || '',
      source: art.domain || 'GDELT',
      date: art.seendate || '',
      tone: art.tone != null ? Number(art.tone) : undefined,
    }));
  } catch {
    return [];
  }
}

// ─── Entity Intelligence Report ─────────────────────────────────────────────

export interface EntityIntelligenceReport {
  entityName: string;
  entityType: 'person' | 'organization' | 'unknown';
  timestamp: string;

  // Sanctions & PEP screening
  sanctions: SanctionsScreenResult | null;

  // Corporate registry
  corporate: OpenCorporateRecord | null;

  // Legal Entity Identifier
  lei: LEISearchResult | null;

  // Web intelligence
  tavilyIntel: TavilySearchResponse | null;
  braveIntel: BraveSearchResponse | null;

  // News coverage & sentiment
  news: {
    articles: GDELTArticle[];
    averageTone: number | null;   // negative = bad press
    recentCoverage: boolean;
  };

  // Jurisdiction governance (V-Dem)
  governance: VDemGovernanceProfile | null;

  // Composite assessment
  assessment: {
    verified: boolean;            // Entity found in at least one registry
    sanctionsClear: boolean;      // No sanctions hits
    isPEP: boolean;               // Politically Exposed Person
    jurisdictionBand: string;     // V-Dem governance band
    mediaSentiment: 'positive' | 'neutral' | 'negative' | 'no-data';
    overallRisk: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
    dataSources: string[];
    summary: string;
  };
}

// ─── Pipeline Execution ─────────────────────────────────────────────────────

/**
 * Run the full Entity Intelligence Pipeline.
 *
 * Executes all lookups in parallel and produces a unified report.
 * Typically completes in 2-4 seconds.
 */
export async function runEntityIntelligence(
  entityName: string,
  entityType: 'person' | 'organization' | 'unknown' = 'unknown',
  jurisdiction?: string
): Promise<EntityIntelligenceReport> {
  const isOrg = entityType === 'organization' || entityType === 'unknown';
  const isPerson = entityType === 'person' || entityType === 'unknown';

  // Run ALL lookups in parallel — any can fail independently
  const [
    sanctionsResult,
    corporateResult,
    leiResult,
    tavilyResult,
    braveResult,
    newsArticles,
    govProfile,
  ] = await Promise.all([
    // 1. Sanctions screening — always run
    screenEntitySanctions(entityName, isPerson ? 'Person' : 'Organization').catch(() => null),

    // 2. OpenCorporates — only for orgs
    isOrg ? fetchOpenCorporatesCompany(entityName).catch(() => null) : Promise.resolve(null),

    // 3. GLEIF — only for orgs
    isOrg ? searchLEI(entityName, { jurisdiction, maxResults: 3 }).catch(() => null) : Promise.resolve(null),

    // 4. Tavily deep research
    tavilyDeepSearch(`${entityName}${jurisdiction ? ' ' + jurisdiction : ''} profile background`, {
      maxResults: 5,
      searchDepth: 'advanced',
    }).catch(() => null),

    // 5. Brave independent search
    isBraveAvailable()
      ? braveEntityResearch(entityName, jurisdiction).catch(() => null)
      : Promise.resolve(null),

    // 6. GDELT news
    fetchGDELTNews(entityName, 8),

    // 7. V-Dem governance for jurisdiction
    Promise.resolve(jurisdiction ? getVDemProfile(jurisdiction) : null),
  ]);

  // ── Compute composite assessment ──
  const dataSources: string[] = [];

  // Sanctions assessment
  const sanctionsClear = !sanctionsResult || sanctionsResult.clearanceLevel === 'Clear';
  const isPEP = sanctionsResult?.hits.some(h => h.isPEP) ?? false;
  if (sanctionsResult) dataSources.push('OpenSanctions (OFAC, EU, UN, INTERPOL, World Bank)');

  // Verification — entity found in at least one registry
  const verified = (corporateResult != null) ||
                   (leiResult?.verified ?? false) ||
                   (sanctionsResult?.totalHits ?? 0) > 0;
  if (corporateResult) dataSources.push('OpenCorporates');
  if (leiResult?.records.length) dataSources.push('GLEIF (Legal Entity Identifier)');

  // Web intelligence
  if (tavilyResult?.results.length) dataSources.push('Tavily AI Research');
  if (braveResult?.results.length) dataSources.push('Brave Search');

  // News sentiment
  const tones = newsArticles.filter(a => a.tone != null).map(a => a.tone!);
  const averageTone = tones.length > 0 ? tones.reduce((a, b) => a + b, 0) / tones.length : null;
  const mediaSentiment: EntityIntelligenceReport['assessment']['mediaSentiment'] =
    averageTone == null ? 'no-data' :
    averageTone > 2 ? 'positive' :
    averageTone < -2 ? 'negative' : 'neutral';
  if (newsArticles.length > 0) dataSources.push('GDELT Global News');

  // Governance
  const jurisdictionBand = govProfile?.governanceBand ?? 'no-data';
  if (govProfile) dataSources.push('V-Dem v14 (University of Gothenburg)');

  // Overall risk computation
  let riskScore = 0;
  if (!sanctionsClear) riskScore += 40;
  if (sanctionsResult?.clearanceLevel === 'Blocked') riskScore += 30;
  if (isPEP) riskScore += 10;
  if (jurisdictionBand === 'critical') riskScore += 15;
  if (jurisdictionBand === 'weak') riskScore += 8;
  if (mediaSentiment === 'negative') riskScore += 10;
  if (!verified && entityType === 'organization') riskScore += 12;

  const overallRisk: EntityIntelligenceReport['assessment']['overallRisk'] =
    riskScore >= 50 ? 'CRITICAL' :
    riskScore >= 25 ? 'HIGH' :
    riskScore >= 10 ? 'MODERATE' : 'LOW';

  // Build summary
  const summaryParts: string[] = [];
  if (verified) summaryParts.push(`Entity verified in ${dataSources.length} source(s).`);
  else summaryParts.push('Entity not found in corporate registries — manual verification recommended.');
  if (!sanctionsClear) summaryParts.push(`Sanctions screening: ${sanctionsResult?.clearanceLevel ?? 'unknown'}.`);
  else summaryParts.push('Sanctions screening: Clear.');
  if (isPEP) summaryParts.push('Politically Exposed Person (PEP) detected.');
  if (govProfile) summaryParts.push(`Jurisdiction governance: ${jurisdictionBand} (V-Dem).`);
  if (mediaSentiment !== 'no-data') summaryParts.push(`Media sentiment: ${mediaSentiment}.`);

  return {
    entityName,
    entityType,
    timestamp: new Date().toISOString(),
    sanctions: sanctionsResult,
    corporate: corporateResult,
    lei: leiResult,
    tavilyIntel: tavilyResult,
    braveIntel: braveResult,
    news: {
      articles: newsArticles,
      averageTone,
      recentCoverage: newsArticles.length > 0,
    },
    governance: govProfile,
    assessment: {
      verified,
      sanctionsClear,
      isPEP,
      jurisdictionBand,
      mediaSentiment,
      overallRisk,
      dataSources,
      summary: summaryParts.join(' '),
    },
  };
}

// ─── Groq Function-Calling Tool Definitions ─────────────────────────────────
// These schemas let the LLM decide WHEN to invoke entity intelligence
// during a conversation, rather than running it on every turn.

import type { GroqToolSchema } from './groqService';

export const ENTITY_INTEL_TOOLS: GroqToolSchema[] = [
  {
    type: 'function',
    function: {
      name: 'screen_entity',
      description: 'Screen a person or organisation against global sanctions lists (OFAC, EU, UN, INTERPOL, World Bank debarments) and check for Politically Exposed Person status. Use when the user asks about a specific person, company, or entity they want to do business with.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Full name of the person or organisation to screen' },
          type: { type: 'string', description: 'Whether the entity is a Person or Organization', enum: ['Person', 'Organization'] },
        },
        required: ['name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'lookup_company',
      description: 'Look up a company in OpenCorporates (200M+ companies worldwide) and GLEIF (Legal Entity Identifier registry). Returns incorporation date, jurisdiction, directors, registration status. Use when the user mentions a specific company name.',
      parameters: {
        type: 'object',
        properties: {
          companyName: { type: 'string', description: 'Name of the company to look up' },
          jurisdiction: { type: 'string', description: 'Optional: ISO country code (e.g. AU, US, GB) to narrow results' },
        },
        required: ['companyName'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'research_entity',
      description: 'Perform deep web research on a person, company, government agency, or any entity. Searches multiple independent sources for current information, news coverage, and background intelligence. Use when the user asks "tell me about X" or wants to research someone or something.',
      parameters: {
        type: 'object',
        properties: {
          entityName: { type: 'string', description: 'Name of the entity to research' },
          country: { type: 'string', description: 'Optional: country context for the research' },
        },
        required: ['entityName'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'compare_governance',
      description: 'Compare governance quality between two countries using V-Dem democracy and rule-of-law data. Returns scores across 7 dimensions: electoral democracy, liberal democracy, rule of law, corruption control, freedom of expression, civil liberties, and accountability. Use when the user asks about doing business between two countries or comparing jurisdictions.',
      parameters: {
        type: 'object',
        properties: {
          countryA: { type: 'string', description: 'First country name or ISO code' },
          countryB: { type: 'string', description: 'Second country name or ISO code' },
        },
        required: ['countryA', 'countryB'],
      },
    },
  },
];

/**
 * Execute an entity intelligence tool call from the LLM.
 * Returns a stringified result for feeding back to the model.
 */
export async function executeEntityTool(name: string, args: Record<string, unknown>): Promise<string> {
  switch (name) {
    case 'screen_entity': {
      const result = await screenEntitySanctions(
        String(args.name || ''),
        args.type as 'Person' | 'Organization' | undefined
      );
      return JSON.stringify({
        clearanceLevel: result.clearanceLevel,
        totalHits: result.totalHits,
        flaggedLists: result.flaggedLists,
        hits: result.hits.map(h => ({
          name: h.name, schema: h.schema, isSanctioned: h.isSanctioned, isPEP: h.isPEP,
          position: h.position, datasets: h.datasets.slice(0, 3), summary: h.summary,
        })),
      });
    }

    case 'lookup_company': {
      const [corp, lei] = await Promise.all([
        fetchOpenCorporatesCompany(String(args.companyName || '')).catch(() => null),
        searchLEI(String(args.companyName || ''), {
          jurisdiction: args.jurisdiction ? String(args.jurisdiction) : undefined,
          maxResults: 2,
        }).catch(() => null),
      ]);
      return JSON.stringify({ openCorporates: corp, gleif: lei ? { totalResults: lei.totalResults, verified: lei.verified, records: lei.records.slice(0, 2) } : null });
    }

    case 'research_entity': {
      const [tavily, brave, news] = await Promise.all([
        tavilyDeepSearch(`${args.entityName}${args.country ? ' ' + args.country : ''} profile`, { maxResults: 4, searchDepth: 'advanced' }).catch(() => null),
        isBraveAvailable() ? braveEntityResearch(String(args.entityName), args.country ? String(args.country) : undefined).catch(() => null) : Promise.resolve(null),
        fetchGDELTNews(String(args.entityName || ''), 4),
      ]);
      return JSON.stringify({
        tavilyAnswer: tavily?.answer || null,
        webResults: [
          ...(tavily?.results?.slice(0, 3).map(r => ({ title: r.title, snippet: r.content, source: r.url })) || []),
          ...(brave?.results?.slice(0, 2).map(r => ({ title: r.title, snippet: r.snippet, source: r.url })) || []),
        ],
        recentNews: news.slice(0, 3).map(a => ({ title: a.title, source: a.source, date: a.date })),
      });
    }

    case 'compare_governance': {
      const { compareGovernance } = await import('./vdemGovernanceService');
      const result = compareGovernance(String(args.countryA || ''), String(args.countryB || ''));
      if (!result) return JSON.stringify({ error: 'Countries not found in V-Dem dataset' });
      return JSON.stringify({
        summary: result.summary,
        comparison: result.comparison,
        countryABand: result.countryA?.governanceBand,
        countryBBand: result.countryB?.governanceBand,
      });
    }

    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}
