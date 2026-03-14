/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * ═══════════════════════════════════════════════════════════════════
 * Brave Search API - Independent Web Search
 * ═══════════════════════════════════════════════════════════════════
 * Free tier: 2,000 queries/month (no credit card required).
 * Sign up at: https://api.search.brave.com
 *
 * Set VITE_BRAVE_SEARCH_API_KEY in .env to activate.
 *
 * Advantages:
 * - Independent index (not reliant on Google/Bing)
 * - Reduces bias toward US/UK-centric source ranking
 * - Better for regional/emerging-market queries
 * ═══════════════════════════════════════════════════════════════════
 */

export interface BraveSearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
  publishedDate?: string;
  relevanceScore: number;
}

export interface BraveSearchResponse {
  query: string;
  results: BraveSearchResult[];
  responseTime?: number;
}

function getBraveKey(): string {
  try {
    return (import.meta as any).env?.VITE_BRAVE_SEARCH_API_KEY || '';
  } catch {
    return '';
  }
}

export function isBraveAvailable(): boolean {
  const key = getBraveKey();
  return key.length > 10 && !key.toLowerCase().includes('your-');
}

/**
 * Search via Brave Search API.
 * Returns structured web results with snippets and sources.
 */
export async function braveSearch(
  query: string,
  options: {
    maxResults?: number;
    country?: string;          // ISO 3166-1 alpha-2 code
    freshness?: 'pd' | 'pw' | 'pm' | 'py';  // past day/week/month/year
    searchLang?: string;
  } = {}
): Promise<BraveSearchResponse | null> {
  const key = getBraveKey();
  if (!key) return null;
  if (!query || query.trim().length < 3) return null;

  const { maxResults = 8, country, freshness, searchLang } = options;

  try {
    const t0 = Date.now();
    const params = new URLSearchParams({
      q: query.substring(0, 400),
      count: String(maxResults),
    });
    if (country) params.set('country', country);
    if (freshness) params.set('freshness', freshness);
    if (searchLang) params.set('search_lang', searchLang);

    const res = await fetch(`https://api.search.brave.com/res/v1/web/search?${params}`, {
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': key,
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return null;

    const data = await res.json();
    const webResults = (data.web?.results || []) as Array<{
      title?: string;
      url?: string;
      description?: string;
      published_date?: string;
      extra_snippets?: string[];
    }>;

    const results: BraveSearchResult[] = webResults.slice(0, maxResults).map((r, idx) => ({
      title: r.title || '',
      url: r.url || '',
      snippet: r.description || (r.extra_snippets?.[0] ?? ''),
      source: r.url ? new URL(r.url).hostname : 'brave',
      publishedDate: r.published_date,
      relevanceScore: 1 - idx * 0.06,
    }));

    return {
      query,
      results,
      responseTime: Date.now() - t0,
    };
  } catch {
    return null;
  }
}

/**
 * Search for entity/company intelligence via Brave.
 * Uses targeted query construction for due-diligence research.
 */
export async function braveEntityResearch(
  entityName: string,
  country?: string
): Promise<BraveSearchResponse | null> {
  const query = country
    ? `"${entityName}" ${country} company profile OR leadership OR regulation`
    : `"${entityName}" company profile OR entity OR regulation OR government`;

  return braveSearch(query, {
    maxResults: 6,
    country: country ? undefined : undefined,
  });
}
