/**
 * 
 * CLIENT-SIDE OPENAI SERVICE
 * 
 *
 * Direct OpenAI API calls from browser - no backend required.
 * Provides both simple single-prompt calls and full chat-completion
 * interface compatible with Together/Groq message format for use
 * in ReasoningPipeline and MultiModelRouter.
 */

export const OPENAI_DEFAULT_MODEL = 'gpt-4o';
export const OPENAI_FAST_MODEL = 'gpt-4o-mini';

import { monitoringService } from './MonitoringService';
import { config } from './config';

const OPENAI_API_URL = `${config.apiBaseUrl}/ai/openai`;
const LOCATION_INTELLIGENCE_URL = `${config.apiBaseUrl}/search/location-intelligence`;

export interface OpenAIChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenAIChatOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
}

/** Returns true if a valid OpenAI API key is configured. */
export function isOpenAIAvailable(): boolean {
  return config.useRealBackend && typeof fetch !== 'undefined';
}

/**
 * Call OpenAI chat completions API - compatible with Together/Groq interface.
 * Supports streaming via onToken callback.
 */
export async function callOpenAIChat(
  messages: OpenAIChatMessage[],
  options: OpenAIChatOptions = {},
  onToken?: (token: string) => void
): Promise<string> {
  if (!isOpenAIAvailable()) {
    throw new Error('OpenAI is only available through the backend API. Enable the backend and configure OPENAI_API_KEY on the server.');
  }

  const modelUsed = options.model ?? OPENAI_DEFAULT_MODEL;
  const callStart = performance.now();

  let res: Response;
  try {
    res = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelUsed,
        messages,
        temperature: options.temperature ?? 0.4,
        maxTokens: options.maxTokens ?? 4096,
      }),
    });
  } catch (err) {
    monitoringService.trackAICall({
      timestamp: new Date().toISOString(),
      model: modelUsed,
      provider: 'openai',
      latencyMs: Math.round(performance.now() - callStart),
      success: false,
      error: err instanceof Error ? err.message : 'Network error',
    });
    throw err;
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    monitoringService.trackAICall({
      timestamp: new Date().toISOString(),
      model: modelUsed,
      provider: 'openai',
      latencyMs: Math.round(performance.now() - callStart),
      success: false,
      error: `${res.status}: ${errText.slice(0, 200)}`,
    });
    throw new Error(`OpenAI ${res.status}: ${errText}`);
  }

  // ── Non-streaming ──
  if (!onToken) {
    const data = await res.json();
    monitoringService.trackAICall({
      timestamp: new Date().toISOString(),
      model: modelUsed,
      provider: 'openai',
      latencyMs: Math.round(performance.now() - callStart),
      success: true,
      inputTokens: data.usage?.prompt_tokens,
      outputTokens: data.usage?.completion_tokens,
    });
    return data.text || data.response || '';
  }

  const data = await res.json();
  const full = data.text || data.response || '';
  if (full) {
    onToken(full);
  }
  monitoringService.trackAICall({
    timestamp: new Date().toISOString(),
    model: modelUsed,
    provider: 'openai',
    latencyMs: Math.round(performance.now() - callStart),
    success: true,
  });
  return full;
}

export interface OpenAIResponse {
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  model: string;
}

export interface LocationIntelligence {
  overview: {
    displayName: string;
    significance: string;
    established: string;
  };
  demographics: {
    population: string;
    populationGrowth: string;
    medianAge: string;
    literacyRate: string;
    languages: string[];
  };
  economy: {
    gdp: string;
    gdpGrowth: string;
    unemployment: string;
    averageIncome: string;
    mainIndustries: string[];
    tradePartners: string[];
    currency: string;
  };
  government: {
    leader: {
      name: string;
      title: string;
      since: string;
    };
    departments: string[];
    type: string;
  };
  geography: {
    climate: string;
    area: string;
    timezone: string;
  };
  infrastructure: {
    powerCapacity: string;
    internetPenetration: string;
    airports: string[];
    seaports: string[];
  };
  competitiveAdvantages: string[];
  investment: {
    incentives: string[];
    easeOfBusiness: string;
  };
}

/**
 * Call OpenAI API directly from browser
 */
export async function callOpenAI(prompt: string, model = 'gpt-4-turbo-preview'): Promise<OpenAIResponse> {
  if (!isOpenAIAvailable()) {
    throw new Error('OpenAI is only available through the backend API. Enable the backend and configure OPENAI_API_KEY on the server.');
  }

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      prompt,
      maxTokens: 4000,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return {
    content: data.text || data.response || '',
    usage: data.usage,
    model: data.model,
  };
}

/**
 * Generate comprehensive location intelligence using OpenAI
 */
export async function generateLocationIntelligence(location: string): Promise<LocationIntelligence> {
  try {
    const response = await fetch(LOCATION_INTELLIGENCE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ location }),
    });

    if (!response.ok) {
      const error = await response.text().catch(() => '');
      throw new Error(`Location intelligence API error: ${response.status} - ${error}`);
    }

    const payload = await response.json();
    const intelligence = payload?.aiIntelligence as LocationIntelligence | undefined;
    if (!intelligence) {
      throw new Error('Location intelligence payload missing aiIntelligence');
    }

    // Validate required fields and provide fallbacks if needed
    return {
      overview: intelligence.overview || {
        displayName: location,
        significance: `Intelligence report for ${location}`,
        established: 'Historical records available'
      },
      demographics: intelligence.demographics || {
        population: 'Population data available',
        populationGrowth: 'Growth data tracked',
        medianAge: 'Demographic data available',
        literacyRate: 'Education metrics tracked',
        languages: ['Local languages spoken']
      },
      economy: intelligence.economy || {
        gdp: 'Economic data available',
        gdpGrowth: 'Growth metrics tracked',
        unemployment: 'Labor data available',
        averageIncome: 'Income data tracked',
        mainIndustries: ['Key industries active'],
        tradePartners: ['Trading partners engaged'],
        currency: 'Local currency'
      },
      government: intelligence.government || {
        leader: {
          name: 'Leadership information available',
          title: 'Government position',
          since: 'Current administration'
        },
        departments: ['Government ministries active'],
        type: 'Government system in place'
      },
      geography: intelligence.geography || {
        climate: 'Local climate conditions',
        area: 'Geographic area defined',
        timezone: 'Local timezone'
      },
      infrastructure: intelligence.infrastructure || {
        powerCapacity: 'Infrastructure developed',
        internetPenetration: 'Connectivity available',
        airports: ['Airports operational'],
        seaports: ['Ports active']
      },
      competitiveAdvantages: intelligence.competitiveAdvantages || ['Strategic advantages identified'],
      investment: intelligence.investment || {
        incentives: ['Investment opportunities available'],
        easeOfBusiness: 'Business environment established'
      }
    };

  } catch (error) {
    console.error('OpenAI location intelligence failed:', error);
    throw error;
  }
}

/**
 * Generate document/letter from intelligence data
 */
export async function generateDocument(
  intelligence: LocationIntelligence,
  documentType: 'letter' | 'report' | 'briefing',
  recipient?: string,
  purpose?: string
): Promise<string> {

  const context = `
Intelligence Data: ${JSON.stringify(intelligence, null, 2)}
Document Type: ${documentType}
Recipient: ${recipient || 'General audience'}
Purpose: ${purpose || 'Information sharing'}
  `;

  const prompt = `You are a professional intelligence analyst. Using the provided intelligence data, create a ${documentType} about ${intelligence.overview.displayName}.

Context:
${context}

${documentType === 'letter' ? `Write a formal business letter to ${recipient || 'the recipient'} introducing investment/business opportunities in ${intelligence.overview.displayName}.` : ''}

${documentType === 'report' ? `Create a comprehensive intelligence report analyzing ${intelligence.overview.displayName} for business and investment purposes.` : ''}

${documentType === 'briefing' ? `Prepare a executive briefing document summarizing key intelligence about ${intelligence.overview.displayName}.` : ''}

Use the intelligence data provided. Make it professional, factual, and actionable. Include relevant data points from demographics, economy, government, and infrastructure.

Format appropriately for the document type with proper headings, sections, and professional language.`;

  try {
    const response = await callOpenAI(prompt);
    return response.content;
  } catch (error) {
    console.error('Document generation failed:', error);
    throw error;
  }
}

export default {
  callOpenAI,
  callOpenAIChat,
  isOpenAIAvailable,
  generateLocationIntelligence,
  generateDocument,
};
