/**
 * â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
 * AWS BEDROCK AI SERVICE
 * â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
 * 
 * Production: AWS Bedrock (no external API keys needed)
 * All AI calls route through AWS Bedrock. Gemini removed.
 */

import LiveDataService from './LiveDataService';

const API_BASE = (import.meta as { env?: Record<string, string> })?.env?.VITE_API_BASE_URL || '';

// ==================== TYPES ====================

export interface AIResponse {
  text: string;
  model: string;
  provider: 'bedrock' | 'fallback';
  tokensUsed?: number;
}

export interface ResearchProgress {
  stage: string;
  progress: number;
  message: string;
}

// ==================== ENVIRONMENT DETECTION ====================

export const isAWSEnvironment = (): boolean => {
  // Check Vite environment variables first (for browser)
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const meta = import.meta as any;
    if (meta?.env?.VITE_AWS_ENVIRONMENT === 'true') {
      return true;
    }
    // If we're in production mode on a real deployment
    if (meta?.env?.PROD && meta?.env?.MODE === 'production') {
      // Check if we have AWS indicators
      if (meta?.env?.VITE_AWS_REGION) {
        return true;
      }
    }
  } catch {
    // Ignore
  }
  
  // Check Node.js environment variables (for server-side)
  if (typeof process !== 'undefined') {
    return !!(
      process.env.AWS_REGION ||
      process.env.AWS_EXECUTION_ENV ||
      process.env.AWS_LAMBDA_FUNCTION_NAME ||
      process.env.ECS_CONTAINER_METADATA_URI
    );
  }
  
  // Default: not AWS (use Gemini locally)
  return false;
};

// ==================== LIVE DATA ENRICHMENT ====================

/**
 * Extract geographic location from user query
 * Looks for country/city names in the prompt
 */
function extractLocationFromQuery(query: string): string | null {
  const locationKeywords = [
    'manila', 'philippines', 'beijing', 'china', 'tokyo', 'japan',
    'mumbai', 'india', 'jakarta', 'indonesia', 'bangkok', 'thailand',
    'vietnam', 'singapore', 'south korea', 'malaysia', 'thailand',
    'hong kong', 'taiwan', 'australia', 'new zealand', 'sri lanka',
    'pakistan', 'bangladesh', 'myanmar', 'cambodia', 'laos',
    'new york', 'london', 'paris', 'berlin', 'toronto', 'vancouver',
    'sydney', 'melbourne', 'dubai', 'singapore', 'hong kong'
  ];

  const lowerQuery = query.toLowerCase();
  for (const location of locationKeywords) {
    if (lowerQuery.includes(location)) {
      // Extract the region name (e.g., "Manila" from "manila region" or just return the word)
      return location
        .split(/\s+/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
  }

  return null;
}

/**
 * Fetch live market data for a location and format it
 */
async function fetchAndFormatLiveData(location: string): Promise<string> {
  try {
    console.log(`[AI Service] Fetching live data for: ${location}`);
    
    const intelligence = await LiveDataService.getCountryIntelligence(location);
    
    if (!intelligence.dataQuality.hasRealData) {
      console.log(`[AI Service] No real-time data available for ${location}`);
      return '';
    }

    let dataSection = `\n\n--- LIVE MARKET DATA (Real-time) ---\n`;
    dataSection += `Location: ${intelligence.profile?.name || location}\n`;
    dataSection += `Data Sources: ${intelligence.dataQuality.sources.join(', ')}\n`;
    dataSection += `Last Updated: ${intelligence.dataQuality.lastUpdated}\n\n`;

    if (intelligence.profile) {
      dataSection += `**Geographic Profile:**\n`;
      dataSection += `- Capital: ${intelligence.profile.capital}\n`;
      dataSection += `- Region: ${intelligence.profile.region}\n`;
      dataSection += `- Population: ${intelligence.profile.population?.toLocaleString()}\n`;
      dataSection += `- Languages: ${intelligence.profile.languages?.join(', ')}\n`;
      dataSection += `- Currencies: ${intelligence.profile.currencies?.join(', ')}\n\n`;
    }

    if (intelligence.economics) {
      dataSection += `**Economic Indicators (World Bank Data):**\n`;
      if (intelligence.economics.gdpCurrent) {
        dataSection += `- GDP: $${(intelligence.economics.gdpCurrent / 1e12).toFixed(2)}T\n`;
      }
      if (intelligence.economics.gdpGrowth) {
        dataSection += `- GDP Growth: ${intelligence.economics.gdpGrowth.toFixed(2)}%\n`;
      }
      if (intelligence.economics.population) {
        dataSection += `- Population: ${(intelligence.economics.population / 1e6).toFixed(1)}M\n`;
      }
      if (intelligence.economics.unemployment) {
        dataSection += `- Unemployment: ${intelligence.economics.unemployment.toFixed(2)}%\n`;
      }
      if (intelligence.economics.inflation) {
        dataSection += `- Inflation Rate: ${intelligence.economics.inflation.toFixed(2)}%\n`;
      }
      if (intelligence.economics.fdiInflows) {
        dataSection += `- FDI Inflows: $${(intelligence.economics.fdiInflows / 1e9).toFixed(2)}B\n`;
      }
      dataSection += '\n';
    }

    if (intelligence.currency) {
      dataSection += `**Currency Exchange Rate:**\n`;
      dataSection += `- 1 USD = ${intelligence.currency.rate} local currency\n\n`;
    }

    return dataSection;
  } catch (error) {
    console.error('[AI Service] Error fetching live data:', error);
    return '';
  }
}

/**
 * Enhance AI prompt with live market data
 */
async function enhancePromptWithLiveData(originalPrompt: string): Promise<string> {
  // Try to identify location in the query
  const location = extractLocationFromQuery(originalPrompt);
  
  if (!location) {
    // No location identified, use original prompt
    return originalPrompt;
  }

  // Fetch live data for the identified location
  const liveData = await fetchAndFormatLiveData(location);
  
  return originalPrompt + liveData;
}

// ==================== AWS BEDROCK CLIENT ====================

async function invokeBedrockModel(prompt: string, model: string = 'anthropic.claude-3-sonnet-20240229-v1:0'): Promise<AIResponse> {
  try {
    // Enhance prompt with live market data if location is mentioned
    const enhancedPrompt = await enhancePromptWithLiveData(prompt);

    const response = await fetch(`${API_BASE}/api/bedrock/invoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: enhancedPrompt,
        model,
        maxTokens: 4096,
        temperature: 0.3
      })
    });

    if (!response.ok) {
      throw new Error(`Bedrock API error: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      text: data.content?.[0]?.text || data.text || '',
      model,
      provider: 'bedrock',
      tokensUsed: data.usage ? data.usage.input_tokens + data.usage.output_tokens : undefined
    };
  } catch (error) {
    console.error('[AWS Bedrock] Invocation failed:', error);
    throw error;
  }
}

// ==================== UNIFIED AI INVOKE ====================

export async function invokeAI(prompt: string): Promise<AIResponse> {
  try {
    const enhancedPrompt = await enhancePromptWithLiveData(prompt);
    return await invokeBedrockModel(enhancedPrompt);
  } catch (error) {
    console.error('[AI Service] Bedrock failed:', error);
    return {
      text: 'AI service temporarily unavailable. Configure VITE_AWS_ACCESS_KEY_ID and VITE_AWS_SECRET_ACCESS_KEY in .env',
      model: 'unavailable',
      provider: 'fallback'
    };
  }
}

// ==================== LOCATION INTELLIGENCE ====================

const LOCATION_PROMPT = (location: string) => `You are a location intelligence expert. Provide comprehensive, FACTUAL data about: "${location}"

Return ONLY valid JSON with this structure:
{
  "name": "City name",
  "country": "Country name",
  "countryCode": "XX",
  "region": "Region/State",
  "coordinates": {"lat": 0.0, "lon": 0.0},
  "population": {"city": 0, "metro": 0, "year": "2024"},
  "overview": "2-3 paragraph description",
  "climate": "Climate description",
  "currency": {"name": "Currency", "code": "USD"},
  "languages": ["Language 1"],
  "government": {
    "type": "Government type",
    "leader": {"name": "Leader name", "title": "Title", "since": "Year"},
    "departments": ["Department 1"]
  },
  "economy": {
    "gdp": "GDP figure",
    "gdpGrowth": "Growth %",
    "mainIndustries": ["Industry 1"],
    "majorEmployers": ["Company 1"],
    "unemployment": "Rate",
    "averageIncome": "Income"
  },
  "infrastructure": {
    "airports": [{"name": "Airport", "code": "SIN", "type": "International"}],
    "seaports": [{"name": "Port", "type": "Container"}],
    "publicTransit": "Description",
    "internetPenetration": "Percentage"
  },
  "investment": {
    "climate": "Investment climate",
    "incentives": ["Incentive 1"],
    "economicZones": ["Zone 1"],
    "easeOfBusiness": "Ranking"
  },
  "education": {
    "universities": [{"name": "University", "ranking": "Ranking"}],
    "literacyRate": "Percentage"
  },
  "risks": {
    "political": "Risk assessment",
    "economic": "Risk assessment",
    "natural": "Risk assessment"
  },
  "keyFacts": ["Fact 1", "Fact 2"],
  "tradePartners": ["Partner 1"]
}

Use REAL data only. Fill ALL fields.`;

export async function researchLocationAWS(
  query: string,
  onProgress?: (progress: ResearchProgress) => void
// eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<{ profile: any; sources: string[]; summary: string; dataQuality: number } | null> {
  
  console.log('[AWS AI] Starting location research for:', query);
  onProgress?.({ stage: 'Connecting', progress: 10, message: 'Connecting to AI service...' });
  
  try {
    onProgress?.({ stage: 'Researching', progress: 30, message: `Gathering intelligence on ${query}...` });
    
    const response = await invokeAI(LOCATION_PROMPT(query));
    
    console.log('[AWS AI] Response received from:', response.provider);
    console.log('[AWS AI] Response text length:', response.text.length);
    onProgress?.({ stage: 'Processing', progress: 70, message: 'Processing intelligence data...' });
    
    // Parse JSON response with improved error handling
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let data: any = null;
    
    try {
      // Remove markdown code blocks if present
      let cleanText = response.text.trim();
      if (cleanText.startsWith('```json')) {
        cleanText = cleanText.replace(/```json\s*/g, '').replace(/```\s*$/g, '');
      } else if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/```\s*/g, '').replace(/```\s*$/g, '');
      }
      data = JSON.parse(cleanText);
      console.log('[AWS AI] Successfully parsed JSON data');
    } catch {
      console.log('[AWS AI] First parse attempt failed, trying to extract JSON...');
      const jsonMatch = response.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          data = JSON.parse(jsonMatch[0]);
          console.log('[AWS AI] Successfully extracted and parsed JSON');
        } catch (e) {
          console.error('[AWS AI] JSON extraction parse failed:', e);
        }
      }
    }
    
    if (!data) {
      console.error('[AWS AI] Failed to parse response, text preview:', response.text.substring(0, 200));
      onProgress?.({ stage: 'Error', progress: 0, message: 'Unable to parse AI response - please try again' });
      return null;
    }
    
    // Validate critical fields
    if (!data.name && !data.city) {
      console.error('[AWS AI] Missing required location name in response');
      onProgress?.({ stage: 'Error', progress: 0, message: 'Invalid location data received' });
      return null;
    }
    
    onProgress?.({ stage: 'Complete', progress: 100, message: 'Research complete!' });
    
    // Build comprehensive profile with enhanced field mapping
    const profile = {
      id: `live-${Date.now()}`,
      // Core identity
      city: data.name || data.city || query,
      entityName: data.name || data.city || query,
      entityType: data.entityType || 'location',
      country: data.country || 'Research Required',
      countryCode: data.countryCode || '',
      region: data.region || data.state || 'Unknown',
      
      // Geographic data
      latitude: data.coordinates?.lat || data.latitude || 0,
      longitude: data.coordinates?.lon || data.longitude || 0,
      timezone: data.timezone || 'UTC',
      established: data.established || data.founded || 'Unknown',
      areaSize: data.area || data.areaSize || 'Unknown',
      
      // Population and demographics
      population: data.population?.metro || data.population?.city || data.population || 0,
      populationMetro: data.population?.metro || data.population?.metropolitan || 0,
      populationGrowth: data.demographics?.populationGrowth || data.population?.growth || 'Unknown',
      medianAge: data.demographics?.medianAge || 'Unknown',
      
      // Economic indicators
      gdp: data.economy?.gdp || data.gdpLocal || 'Data Required',
      gdpGrowth: data.economy?.gdpGrowth || data.economy?.gdpGrowthRate || 'Unknown',
      unemployment: data.economy?.unemployment || 'See labor statistics',
      averageIncome: data.economy?.averageIncome || data.economy?.avgIncome || 'See income surveys',
      
      // Core details
      currency: data.currency?.code || data.currency?.name || 'USD',
      languages: data.languages || ['English'],
      climate: data.climate || 'Unknown',
      
      // Government and leadership
      governmentType: data.government?.type || 'Unknown',
      leader: data.government?.leader || { name: 'Research Required', title: 'Leader', since: 'Unknown' },
      leaders: data.government?.leader ? [{
        name: data.government.leader.name || 'Unknown',
        role: data.government.leader.title || 'Leader',
        since: data.government.leader.since || 'Unknown',
        bio: '',
        achievements: [],
        rating: 0,
        internationalEngagementFocus: false
      }] : [],
      departments: data.government?.departments || [],
      
      // Economic activity
      mainIndustries: data.economy?.mainIndustries || data.economy?.majorIndustries || [],
      majorEmployers: data.economy?.majorEmployers || data.economy?.topEmployers || [],
      tradePartners: data.tradePartners || [],
      topExports: data.economy?.exports || [],
      
      // Infrastructure
      airports: data.infrastructure?.airports || [],
      seaports: data.infrastructure?.seaports || data.infrastructure?.ports || [],
      publicTransit: data.infrastructure?.publicTransit || 'Unknown',
      internetPenetration: data.infrastructure?.internetPenetration || 'Unknown',
      powerCapacity: data.infrastructure?.power || 'See utility providers',
      specialEconomicZones: data.investment?.economicZones || [],
      
      // Investment climate
      economicZones: data.investment?.economicZones || [],
      investmentIncentives: data.investment?.incentives || [],
      easeOfDoingBusiness: data.investment?.easeOfBusiness || 'See World Bank rankings',
      investmentClimate: data.investment?.climate || 'Standard',
      
      // Education
      universities: data.education?.universities || [],
      universitiesColleges: typeof data.education?.universities === 'number' ? data.education.universities : (data.education?.universities?.length || 0),
      literacyRate: data.education?.literacyRate || 'Unknown',
      graduatesPerYear: data.education?.graduates || 'See education ministry',
      
      // Risk assessment
      risks: {
        political: data.risks?.political || 'Standard',
        economic: data.risks?.economic || 'Moderate',
        natural: data.risks?.natural || 'Moderate',
        regulatory: data.risks?.regulatory || 'Standard'
      },
      
      // Additional details
      keyFacts: data.keyFacts || [],
      rankings: data.rankings || [],
      keyStatistics: data.keyStatistics || [],
      overview: data.overview || `Intelligence profile for ${query}`,
      knownFor: data.knownFor || [],
      businessHours: data.businessHours || '9:00 AM - 5:00 PM',
      
      // Scores and assessments
      globalMarketAccess: data.scores?.marketAccess || 'Medium',
      regulatoryEnvironment: data.scores?.regulatory || 'Standard',
      infrastructureQuality: data.scores?.infrastructure || 'Moderate',
      engagementScore: data.scores?.engagement || 50,
      overlookedScore: data.scores?.overlooked || 50,
      costOfDoing: data.scores?.costOfDoing || 50,
      investmentMomentum: data.scores?.momentum || 50,
      
      // Links and sources
      governmentLinks: data.links || [],
      
      // Raw data for debugging
      _rawData: data
    };
    
    console.log('[AWS AI] Profile built successfully:', profile.city);
    
    return {
      profile,
      sources: [
        'AWS Bedrock Claude',
        'World Knowledge Base',
        'Real-time Intelligence'
      ],
      summary: `Intelligence report for ${profile.city}, ${profile.country} via AWS Bedrock.`,
      dataQuality: 85
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[AWS AI] Research failed:', errorMessage);
    onProgress?.({ stage: 'Error', progress: 0, message: `Research failed: ${errorMessage}` });
    throw error;
  }
}

// ==================== DOCUMENT GENERATION ====================

export async function generateDocument(
  type: 'letter' | 'proposal' | 'report' | 'memo' | 'contract',
  context: string,
  onProgress?: (progress: ResearchProgress) => void
): Promise<string> {
  
  onProgress?.({ stage: 'Generating', progress: 30, message: `Creating ${type}...` });
  
  const prompt = `You are an expert business document writer. Generate a professional ${type} based on this context:

${context}

Requirements:
1. Use formal, professional language
2. Include all relevant details
3. Format appropriately for ${type}
4. Be concise but comprehensive

Return the complete document text.`;

  try {
    const response = await invokeAI(prompt);
    onProgress?.({ stage: 'Complete', progress: 100, message: 'Document ready!' });
    return response.text;
  } catch (error) {
    console.error('[AWS AI] Document generation failed:', error);
    throw error;
  }
}

// ==================== REPORT GENERATION ====================

export async function generateReport(
  topic: string,
  data: string,
  onProgress?: (progress: ResearchProgress) => void
): Promise<string> {
  
  onProgress?.({ stage: 'Analyzing', progress: 20, message: 'Analyzing data...' });
  
  const prompt = `You are a strategic intelligence analyst. Generate a comprehensive report on: "${topic}"

Available data:
${data}

Include:
1. Executive summary
2. Key findings
3. Detailed analysis
4. Recommendations
5. Risk assessment
6. Conclusion

Format as a professional intelligence report.`;

  try {
    onProgress?.({ stage: 'Generating', progress: 50, message: 'Generating report...' });
    const response = await invokeAI(prompt);
    onProgress?.({ stage: 'Complete', progress: 100, message: 'Report ready!' });
    return response.text;
  } catch (error) {
    console.error('[AWS AI] Report generation failed:', error);
    throw error;
  }
}

export default {
  invokeAI,
  researchLocationAWS,
  generateDocument,
  generateReport,
  isAWSEnvironment
};

// ==================== DIRECT BROWSER → BEDROCK (SigV4) ====================
// Used as fallback when no backend and no Gemini key.
// Reads VITE_AWS_ACCESS_KEY_ID + VITE_AWS_SECRET_ACCESS_KEY from .env

const _AWS_REGION = (import.meta as any).env?.VITE_AWS_REGION || 'us-east-1';
const _AWS_KEY    = (import.meta as any).env?.VITE_AWS_ACCESS_KEY_ID || '';
const _AWS_SECRET = (import.meta as any).env?.VITE_AWS_SECRET_ACCESS_KEY || '';
const _BEDROCK_MODEL = 'anthropic.claude-3-5-sonnet-20241022-v2:0';

export const isDirectBedrockConfigured = (): boolean => Boolean(_AWS_KEY && _AWS_SECRET);

async function _sha256Hex(data: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function _hmac(key: ArrayBuffer, data: string): Promise<ArrayBuffer> {
  const k = await crypto.subtle.importKey(
    'raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  return crypto.subtle.sign('HMAC', k, new TextEncoder().encode(data));
}

async function _signBedrockRequest(body: string, path: string): Promise<Record<string, string>> {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:\-]|\..*/g, '').slice(0, 15) + 'Z';
  const dateStamp = amzDate.slice(0, 8);
  const service = 'bedrock';
  const host = `bedrock-runtime.${_AWS_REGION}.amazonaws.com`;

  const payloadHash = await _sha256Hex(body);
  const canonicalRequest = [
    'POST', path, '',
    `content-type:application/json\nhost:${host}\nx-amz-date:${amzDate}\n`,
    'content-type;host;x-amz-date',
    payloadHash,
  ].join('\n');

  const scope = `${dateStamp}/${_AWS_REGION}/${service}/aws4_request`;
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, await _sha256Hex(canonicalRequest)].join('\n');

  let k: ArrayBuffer = new TextEncoder().encode(`AWS4${_AWS_SECRET}`).buffer as ArrayBuffer;
  k = await _hmac(k, dateStamp);
  k = await _hmac(k, _AWS_REGION);
  k = await _hmac(k, service);
  k = await _hmac(k, 'aws4_request');
  const sigBuf = await _hmac(k, stringToSign);
  const signature = Array.from(new Uint8Array(sigBuf)).map(b => b.toString(16).padStart(2, '0')).join('');

  return {
    'Content-Type': 'application/json',
    'X-Amz-Date': amzDate,
    Authorization: `AWS4-HMAC-SHA256 Credential=${_AWS_KEY}/${scope}, SignedHeaders=content-type;host;x-amz-date, Signature=${signature}`,
  };
}

/**
 * Direct browser→Bedrock invoke (no backend needed).
 * Falls back gracefully when credentials are absent.
 */
export async function invokeBedrockDirect(
  userPrompt: string,
  systemPrompt = 'You are BWGA AI — a senior strategic advisor powered by the BW NEXUS AI agentic runtime.'
): Promise<string> {
  if (!isDirectBedrockConfigured()) throw new Error('AWS credentials not configured in .env');

  const path = `/model/${_BEDROCK_MODEL}/invoke`;
  const body = JSON.stringify({
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const headers = await _signBedrockRequest(body, path);
  const url = `https://bedrock-runtime.${_AWS_REGION}.amazonaws.com${path}`;

  const res = await fetch(url, { method: 'POST', headers, body });
  if (!res.ok) throw new Error(`Bedrock ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.content?.[0]?.text || '';
}

/**
 * Streaming version — calls onToken for each text delta.
 */
export async function invokeBedrockDirectStream(
  userPrompt: string,
  systemPrompt: string,
  onToken: (t: string) => void
): Promise<string> {
  if (!isDirectBedrockConfigured()) throw new Error('AWS credentials not configured in .env');

  const path = `/model/${_BEDROCK_MODEL}/invoke-with-response-stream`;
  const body = JSON.stringify({
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const headers = await _signBedrockRequest(body, path);
  const url = `https://bedrock-runtime.${_AWS_REGION}.amazonaws.com${path}`;

  const res = await fetch(url, { method: 'POST', headers, body });
  if (!res.ok) throw new Error(`Bedrock stream ${res.status}: ${await res.text()}`);

  const reader = res.body?.getReader();
  if (!reader) throw new Error('No response body');

  const dec = new TextDecoder();
  let full = '';
  let buf = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() || '';
    for (const line of lines) {
      try {
        const p = JSON.parse(line.trim());
        const tok = p?.delta?.text || p?.completion || '';
        if (tok) { full += tok; onToken(tok); }
      } catch { /* partial */ }
    }
  }
  return full;
}

/**
 * Extract file content via Bedrock vision/document API.
 * Supports PDF, JPG, PNG, GIF, WebP.
 */
export async function extractFileViaBedrock(file: File): Promise<string> {
  if (!isDirectBedrockConfigured()) return '';

  const VISION_MIME: Record<string, string> = {
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.png': 'image/png', '.gif': 'image/gif',
    '.webp': 'image/webp', '.pdf': 'application/pdf',
  };

  const lowerName = file.name.toLowerCase();
  const ext = Object.keys(VISION_MIME).find(e => lowerName.endsWith(e));

  let contentBlock: object;

  if (ext) {
    const mimeType = VISION_MIME[ext];
    const arr = await file.arrayBuffer();
    const bytes = new Uint8Array(arr);
    let bin = '';
    for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
    const base64 = btoa(bin);
    contentBlock = mimeType === 'application/pdf'
      ? { type: 'document', source: { type: 'base64', media_type: mimeType, data: base64 } }
      : { type: 'image',    source: { type: 'base64', media_type: mimeType, data: base64 } };
  } else {
    // Attempt plain text read
    try {
      const text = await file.text();
      if (!text.trim()) return '';
      contentBlock = { type: 'text', text: `File: ${file.name}\n\n${text.slice(0, 50000)}` };
    } catch { return ''; }
  }

  const path = `/model/${_BEDROCK_MODEL}/invoke`;
  const body = JSON.stringify({
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 4096,
    system: 'Extract all meaningful information from the provided document or image. Be thorough and structured.',
    messages: [{
      role: 'user',
      content: [
        contentBlock,
        { type: 'text', text: 'Extract ALL key information: organizations, countries, objectives, decisions, financials, timelines, stakeholders, findings, and risks. Be thorough — do not summarise.' },
      ],
    }],
  });

  try {
    const headers = await _signBedrockRequest(body, path);
    const url = `https://bedrock-runtime.${_AWS_REGION}.amazonaws.com${path}`;
    const res = await fetch(url, { method: 'POST', headers, body });
    if (!res.ok) return '';
    const data = await res.json();
    return data.content?.[0]?.text || '';
  } catch { return ''; }
}

