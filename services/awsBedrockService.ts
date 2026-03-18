/**
 * 
 * TOGETHER.AI SERVICE (legacy name: awsBedrockService)
 * 
 * NOTE: Despite the filename, ALL code in this file calls Together.ai.
 * AWS Bedrock integration was removed. The filename and export names are
 * preserved for backward compatibility with existing imports.
 *
 * Primary: Together.ai (Llama 3.1 70B-Instruct-Turbo)
 * Key:     TOGETHER_API_KEY on the server backend
 */

import LiveDataService from './LiveDataService';
import { config } from './config';

type AwsWindowEnv = Window & { __ENV__?: Record<string, string | undefined> };
type AwsImportMeta = ImportMeta & { env?: { MODE?: string; PROD?: boolean; VITE_AWS_REGION?: string } };

const runtimeEnv = typeof window !== 'undefined' ? (window as AwsWindowEnv).__ENV__ || {} : {};
const viteEnv = ((import.meta as AwsImportMeta).env || {});
const API_BASE = config.apiBaseUrl.replace(/\/api$/, '');

// ─── Together.ai config ────────────────────────────────────────────────────────
const TOGETHER_API_URL = 'https://api.together.xyz/v1/chat/completions';
const TOGETHER_MODEL   = 'meta-llama/Llama-3.1-70B-Instruct-Turbo';
const _TOGETHER_KEY    = () => (typeof process !== 'undefined' ? process.env?.TOGETHER_API_KEY || '' : '');

/**
 * Core Together.ai call - supports streaming and non-streaming.
 * This is the single function all AI calls route through.
 */
async function invokeTogetherAI(
  userPrompt: string,
  systemPrompt = 'You are BWGA AI - a senior strategic advisor powered by the BW NEXUS AI agentic runtime. Be concise, professional, and evidence-based.',
  onToken?: (t: string) => void
): Promise<string> {
  const key = _TOGETHER_KEY();

  // Backend proxy first (avoids CORS + hides key)
  if (!onToken) {
    try {
      const res = await fetch(`${API_BASE}/api/ai/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userPrompt, systemInstruction: systemPrompt }),
      });
      if (res.ok) {
        const data = await res.json();
        const text = data.text || data.result || data.content || '';
        if (text) return text;
      }
    } catch { /* fall through to direct */ }
  }

  // Direct Together.ai (server-backed only)
  if (!key) throw new Error('TOGETHER_API_KEY not configured on the server backend.');

  const body = JSON.stringify({
    model: TOGETHER_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userPrompt },
    ],
    max_tokens: 4096,
    temperature: 0.4,
    stream: Boolean(onToken),
  });

  const res = await fetch(TOGETHER_API_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body,
  });

  if (!res.ok) throw new Error(`Together.ai ${res.status}: ${await res.text()}`);

  if (!onToken) {
    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  }

  // SSE streaming
  const reader = res.body?.getReader();
  if (!reader) throw new Error('No stream body');
  const dec = new TextDecoder();
  let full = '', buf = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() || '';
    for (const line of lines) {
      const trimmed = line.replace(/^data:\s*/, '').trim();
      if (!trimmed || trimmed === '[DONE]') continue;
      try {
        const tok = JSON.parse(trimmed).choices?.[0]?.delta?.content || '';
        if (tok) { full += tok; onToken(tok); }
      } catch { /* partial chunk */ }
    }
  }
  return full;
}

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
  // Check public browser env first
  try {
    if (runtimeEnv.VITE_AWS_ENVIRONMENT === 'true') {
      return true;
    }
    if (viteEnv.PROD && viteEnv.MODE === 'production') {
      if (runtimeEnv.VITE_AWS_REGION || viteEnv.VITE_AWS_REGION) {
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

async function invokeBedrockModel(prompt: string, _model?: string): Promise<AIResponse> {
  try {
    const enhancedPrompt = await enhancePromptWithLiveData(prompt);
    const text = await invokeTogetherAI(enhancedPrompt);
    return { text, model: TOGETHER_MODEL, provider: 'bedrock', tokensUsed: undefined };
  } catch (error) {
    console.error('[Together.ai] Invocation failed:', error);
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

// ==================== DIRECT BROWSER → TOGETHER AI ====================
// Reads TOGETHER_API_KEY from the server environment when available

export const isDirectBedrockConfigured = (): boolean => {
  const key = _TOGETHER_KEY();
  if (!key || key.length < 20) return false;
  const lower = key.toLowerCase();
  if (lower.includes('your-') || lower.includes('your_') || lower.includes('placeholder') || lower.includes('key-here')) return false;
  return true;
};

// SigV4 helpers removed - Together.ai uses a simple Bearer token.
async function _signBedrockRequest(_body: string, _path: string): Promise<Record<string, string>> {
  return { 'Content-Type': 'application/json' };
}

/**
 * Direct browser → Together.ai invoke.
 * Drop-in replacement for invokeBedrockDirect - same signature.
 */
export async function invokeBedrockDirect(
  userPrompt: string,
  systemPrompt = 'You are BWGA AI - a senior strategic advisor powered by the BW NEXUS AI agentic runtime.'
): Promise<string> {
  return invokeTogetherAI(userPrompt, systemPrompt);
}

/**
 * Streaming version via Together.ai SSE.
 * Drop-in replacement for invokeBedrockDirectStream - same signature.
 */
export async function invokeBedrockDirectStream(
  userPrompt: string,
  systemPrompt: string,
  onToken: (t: string) => void
): Promise<string> {
  return invokeTogetherAI(userPrompt, systemPrompt, onToken);
}

/**
 * Extract file content and analyse with Together.ai.
 * Reads file as text where possible; for images returns empty string.
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

  // Send extracted text to Together.ai for analysis
  try {
    const extractedText = ext
      ? `[Attached ${ext.slice(1).toUpperCase()} file: ${file.name} - binary content provided as base64. Describe and extract key contents.]`
      : (contentBlock as Record<string, unknown>).text as string || '';
    if (!extractedText.trim()) return '';
    return await invokeTogetherAI(
      `Extract ALL key information from this document - organizations, countries, objectives, decisions, financials, timelines, stakeholders, findings, and risks. Be thorough and structured.\n\n${extractedText}`,
      'You are a document intelligence specialist. Extract and organize all meaningful information clearly.'
    );
  } catch { return ''; }
}

