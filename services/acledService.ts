/**
 * ═══════════════════════════════════════════════════════════════════
 * ACLED — Armed Conflict Location & Event Data
 * ═══════════════════════════════════════════════════════════════════
 * Free API — requires registration at acleddata.com for a key.
 * Set VITE_ACLED_KEY and VITE_ACLED_EMAIL in your .env file.
 *
 * Provides: real-time political violence, protest, conflict, and
 * battle events with geo-tagging, actor identification, and
 * fatality counts. Covers 190+ countries.
 * ═══════════════════════════════════════════════════════════════════
 */

export interface ACLEDEvent {
  date: string;
  type: string;       // 'Battles' | 'Protests' | 'Violence against civilians' | etc.
  subType: string;
  actor: string;
  location: string;
  country: string;
  notes: string;
  fatalities: number;
  latitude?: number;
  longitude?: number;
}

export interface ACLEDSummary {
  country: string;
  totalEvents: number;
  recentEvents: ACLEDEvent[];
  eventTypeCounts: Record<string, number>;
  totalFatalities: number;
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
}

function deriveRiskLevel(events: ACLEDEvent[]): ACLEDSummary['riskLevel'] {
  const totalFatalities = events.reduce((s, e) => s + e.fatalities, 0);
  const battleCount = events.filter(e => e.type === 'Battles').length;
  if (totalFatalities > 50 || battleCount >= 3) return 'Critical';
  if (totalFatalities > 10 || battleCount >= 1) return 'High';
  if (events.length > 5) return 'Medium';
  return 'Low';
}

export async function fetchACLEDEvents(
  country: string,
  limit = 6
): Promise<ACLEDEvent[]> {
  const key = (typeof import.meta !== 'undefined' ? (import.meta as unknown as Record<string, Record<string, string>>).env?.VITE_ACLED_KEY : undefined) || '';
  const email = (typeof import.meta !== 'undefined' ? (import.meta as unknown as Record<string, Record<string, string>>).env?.VITE_ACLED_EMAIL : undefined) || '';
  if (!key || !email) return [];

  const params = new URLSearchParams({
    key,
    email,
    country,
    limit: String(limit),
    fields: 'event_date|event_type|sub_event_type|actor1|location|country|notes|fatalities|latitude|longitude',
    sort: 'event_date',
    order: '1', // descending
  });

  try {
    const res = await fetch(`https://api.acleddata.com/acled/read?${params}`, {
      signal: AbortSignal.timeout(9000),
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return [];

    const data = await res.json();
    const rows = (data.data || []) as Array<{
      event_date?: string;
      event_type?: string;
      sub_event_type?: string;
      actor1?: string;
      location?: string;
      country?: string;
      notes?: string;
      fatalities?: string | number;
      latitude?: string | number;
      longitude?: string | number;
    }>;

    return rows.map(r => ({
      date: r.event_date || '',
      type: r.event_type || 'Unknown',
      subType: r.sub_event_type || '',
      actor: r.actor1 || 'Unknown',
      location: r.location || country,
      country: r.country || country,
      notes: (r.notes || '').substring(0, 250),
      fatalities: Number(r.fatalities) || 0,
      latitude: r.latitude ? Number(r.latitude) : undefined,
      longitude: r.longitude ? Number(r.longitude) : undefined,
    }));
  } catch {
    return [];
  }
}

export async function getACLEDSummary(country: string): Promise<ACLEDSummary | null> {
  const events = await fetchACLEDEvents(country, 10);
  if (events.length === 0) return null;

  const typeCounts: Record<string, number> = {};
  for (const ev of events) {
    typeCounts[ev.type] = (typeCounts[ev.type] || 0) + 1;
  }

  return {
    country,
    totalEvents: events.length,
    recentEvents: events.slice(0, 5),
    eventTypeCounts: typeCounts,
    totalFatalities: events.reduce((s, e) => s + e.fatalities, 0),
    riskLevel: deriveRiskLevel(events),
  };
}
