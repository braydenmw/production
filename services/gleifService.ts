/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * ═══════════════════════════════════════════════════════════════════
 * GLEIF - Global Legal Entity Identifier Foundation
 * ═══════════════════════════════════════════════════════════════════
 * Free public API — no key required.
 * https://api.gleif.org/api/v1
 *
 * LEI (Legal Entity Identifier) is the G20/FSB global standard for
 * identifying legal entities in financial transactions. 2.5M+ entities.
 *
 * Use for: verifying legal entities exist, checking registration
 * status, confirming jurisdiction, identifying parent/child relationships.
 * ═══════════════════════════════════════════════════════════════════
 */

export interface LEIRecord {
  lei: string;
  legalName: string;
  otherNames: string[];
  jurisdiction: string;
  legalAddress: {
    country: string;
    city: string;
    region?: string;
    postalCode?: string;
  };
  registrationStatus: 'ISSUED' | 'LAPSED' | 'RETIRED' | 'ANNULLED' | 'PENDING' | string;
  entityCategory?: string;
  entitySubCategory?: string;
  registrationDate?: string;
  lastUpdateDate?: string;
  managingLou?: string;       // Managing Local Operating Unit
  directParent?: string;      // Direct parent LEI
  ultimateParent?: string;    // Ultimate parent LEI
}

export interface LEISearchResult {
  query: string;
  totalResults: number;
  records: LEIRecord[];
  verified: boolean;          // At least one ISSUED record found
}

const GLEIF_API = 'https://api.gleif.org/api/v1';

function parseLEIRecord(item: any): LEIRecord {
  const attr = item?.attributes || {};
  const entity = attr.entity || {};
  const reg = attr.registration || {};
  const legalAddr = entity.legalAddress || {};
  const otherNames = (entity.otherEntityNames || []).map((n: any) => n.name).filter(Boolean);

  return {
    lei: item.id || attr.lei || '',
    legalName: entity.legalName?.name || '',
    otherNames,
    jurisdiction: entity.jurisdiction || legalAddr.country || '',
    legalAddress: {
      country: legalAddr.country || '',
      city: legalAddr.city || '',
      region: legalAddr.region || undefined,
      postalCode: legalAddr.postalCode || undefined,
    },
    registrationStatus: reg.status || 'UNKNOWN',
    entityCategory: entity.category || undefined,
    entitySubCategory: entity.subCategory || undefined,
    registrationDate: reg.initialRegistrationDate || undefined,
    lastUpdateDate: reg.lastUpdateDate || undefined,
    managingLou: reg.managingLou || undefined,
  };
}

/**
 * Search GLEIF for a legal entity by name.
 * Returns matching LEI records with registration status and jurisdiction.
 */
export async function searchLEI(
  entityName: string,
  options: { jurisdiction?: string; maxResults?: number } = {}
): Promise<LEISearchResult> {
  const empty: LEISearchResult = { query: entityName, totalResults: 0, records: [], verified: false };
  if (!entityName || entityName.trim().length < 2) return empty;

  const maxResults = options.maxResults ?? 5;

  try {
    const params = new URLSearchParams({
      'filter[fulltext]': entityName.trim(),
      'page[size]': String(maxResults),
    });
    if (options.jurisdiction) {
      params.set('filter[entity.jurisdiction]', options.jurisdiction.toUpperCase());
    }

    const res = await fetch(`${GLEIF_API}/lei-records?${params}`, {
      headers: { Accept: 'application/vnd.api+json' },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return empty;

    const data = await res.json();
    const items = (data.data || []) as any[];
    const records = items.map(parseLEIRecord);
    const verified = records.some(r => r.registrationStatus === 'ISSUED');

    return {
      query: entityName,
      totalResults: data.meta?.pagination?.total ?? records.length,
      records,
      verified,
    };
  } catch {
    return empty;
  }
}

/**
 * Lookup a specific LEI and return its record.
 */
export async function lookupLEI(lei: string): Promise<LEIRecord | null> {
  if (!lei || lei.length !== 20) return null;

  try {
    const res = await fetch(`${GLEIF_API}/lei-records/${lei}`, {
      headers: { Accept: 'application/vnd.api+json' },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;

    const data = await res.json();
    return parseLEIRecord(data.data);
  } catch {
    return null;
  }
}

/**
 * Get the parent chain of an entity by LEI.
 * Returns the direct parent and ultimate parent if available.
 */
export async function getParentChain(lei: string): Promise<{
  directParent: LEIRecord | null;
  ultimateParent: LEIRecord | null;
}> {
  const result = { directParent: null as LEIRecord | null, ultimateParent: null as LEIRecord | null };
  if (!lei || lei.length !== 20) return result;

  try {
    const res = await fetch(
      `${GLEIF_API}/lei-records/${lei}/direct-parent-relationship`,
      { headers: { Accept: 'application/vnd.api+json' }, signal: AbortSignal.timeout(6000) }
    );
    if (res.ok) {
      const data = await res.json();
      const parentLei = data?.data?.relationships?.['parent-lei-record']?.data?.id;
      if (parentLei) result.directParent = await lookupLEI(parentLei);
    }
  } catch { /* non-fatal */ }

  try {
    const res = await fetch(
      `${GLEIF_API}/lei-records/${lei}/ultimate-parent-relationship`,
      { headers: { Accept: 'application/vnd.api+json' }, signal: AbortSignal.timeout(6000) }
    );
    if (res.ok) {
      const data = await res.json();
      const ultLei = data?.data?.relationships?.['parent-lei-record']?.data?.id;
      if (ultLei) result.ultimateParent = await lookupLEI(ultLei);
    }
  } catch { /* non-fatal */ }

  return result;
}
