// Lightweight external data integrations with rate-limited stubs
// Purpose: centralize world-bank, numbeo, opencorporates, marine/flight stubs + basic rate limiting

export interface WorldBankIndicators {
  gdp?: number;
  gdpYear?: number;
  gdpGrowth?: number;
  internetUsersPercent?: number;
}

export interface NumbeoCityData {
  crimeIndex?: number;
  safetyIndex?: number;
  avgRentOneBed?: number;
  costOfLivingIndex?: number;
}

export interface OpenCorporateRecord {
  name: string;
  companyNumber?: string;
  jurisdictionCode?: string;
  officers?: Array<{ name: string; role?: string }>;
  incorporationDate?: string;
  sourceUrl?: string;
}

// Simple in-memory rate limiter per-service
class RateLimiter {
  tokens: number;
  lastRefill: number;
  capacity: number;
  refillIntervalMs: number;

  constructor(capacity = 5, refillIntervalMs = 60_000) {
    this.capacity = capacity;
    this.tokens = capacity;
    this.lastRefill = Date.now();
    this.refillIntervalMs = refillIntervalMs;
  }

  take(): boolean {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    if (elapsed > this.refillIntervalMs) {
      const refillCount = Math.floor(elapsed / this.refillIntervalMs);
      this.tokens = Math.min(this.capacity, this.tokens + refillCount * this.capacity);
      this.lastRefill = now;
    }
    if (this.tokens > 0) {
      this.tokens -= 1;
      return true;
    }
    return false;
  }
}

const worldBankLimiter = new RateLimiter(5, 60_000);
const numbeoLimiter = new RateLimiter(3, 60_000);
const opencorporatesLimiter = new RateLimiter(5, 60_000);
const marineLimiter = new RateLimiter(2, 60_000);

export function isExternalDataEnabled(): boolean {
  try {
    if (import.meta.env.VITE_ENABLE_EXTERNAL_DATA === 'true') return true;
  } catch {
    // ignore
  }
  if (typeof process !== 'undefined' && process.env?.ENABLE_EXTERNAL_DATA === 'true') return true;
  return false;
}

export async function fetchWorldBankCountryIndicators(countryCode: string): Promise<WorldBankIndicators | null> {
  if (!worldBankLimiter.take()) return null;

  try {
    const gdpUrl = `https://api.worldbank.org/v2/country/${countryCode}/indicator/NY.GDP.MKTP.CD?format=json&per_page=1`;
    const res = await fetch(gdpUrl);
    const data = await res.json();
    if (data[1]?.[0]) {
      return { gdp: data[1][0].value, gdpYear: parseInt(data[1][0].date) };
    }
  } catch (err) {
    console.warn('[External] World Bank fetch failed:', err);
  }
  return null;
}

export async function fetchNumbeoCityData(cityName: string): Promise<NumbeoCityData | null> {
  if (!numbeoLimiter.take()) return null;

  try {
    // Requires API key (VITE_NUMBEO_API_KEY or NUMBEO_API_KEY)
    const key = import.meta.env.VITE_NUMBEO_API_KEY || process.env?.NUMBEO_API_KEY;
    if (!key) {
      // No API key available - return null (no mock data)
      console.log(`[External] Numbeo: No API key configured for ${cityName}. Skipping.`);
      return null;
    }

    // Numbeo API call
    try {
      const url = `https://www.numbeo.com/api/city_prices?api_key=${key}&city=${encodeURIComponent(cityName)}`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = await res.json();
      return {
        crimeIndex: data.crime_index ?? null,
        safetyIndex: data.safety_index ?? null,
        avgRentOneBed: data.avg_rent_one_bed ?? null,
        costOfLivingIndex: data.cost_of_living_index ?? null,
      };
    } catch (err) {
      console.warn('[External] Numbeo API call failed:', err);
      return null;
    }
  } catch (err) {
    console.warn('[External] Numbeo fetch failed:', err);
    return null;
  }
}

export async function fetchOpenCorporatesCompany(companyName: string): Promise<OpenCorporateRecord | null> {
  if (!opencorporatesLimiter.take()) return null;

  try {
    const url = `https://api.opencorporates.com/v0.4/companies/search?q=${encodeURIComponent(companyName)}&per_page=1`;
    const res = await fetch(url);
    const data = await res.json();
    if (data?.results?.companies?.[0]?.company) {
      const c = data.results.companies[0].company;
      return {
        name: c.name,
        companyNumber: c.company_number,
        jurisdictionCode: c.jurisdiction_code,
        incorporationDate: c.incorporation_date,
        sourceUrl: c.opencorporates_url
      };
    }
  } catch (err) {
    console.warn('[External] OpenCorporates fetch failed:', err);
  }
  return null;
}

export async function fetchMarineTrafficPortActivity(_portNameOrCountry: string): Promise<Record<string, unknown> | null> {
  if (!marineLimiter.take()) return null;

  // MarineTraffic requires an API key/contract; return null when unavailable.
  return null;
}

