// Feature flags and configuration for demo/production modes
// V6.0 - Nexus Intelligence OS - ALL LIVE DATA BY DEFAULT
// Uses an explicit public env allowlist so secret VITE_* values are not
// accidentally pulled into the browser bundle.
type PublicEnv = Partial<Record<
  'VITE_USE_REAL_AI' |
  'VITE_USE_REAL_DATA' |
  'VITE_USE_REAL_BACKEND' |
  'VITE_SHOW_DEMO_INDICATORS' |
  'VITE_ENABLE_ANALYTICS' |
  'VITE_ENABLE_AUTH' |
  'VITE_API_BASE_URL' |
  'NODE_ENV' |
  'DEV' |
  'PROD',
  string | boolean | undefined
>>;

type WindowWithEnv = Window & { __ENV__?: Record<string, string | undefined> };

const publicImportMetaEnv: PublicEnv = {
  VITE_USE_REAL_AI: import.meta.env.VITE_USE_REAL_AI,
  VITE_USE_REAL_DATA: import.meta.env.VITE_USE_REAL_DATA,
  VITE_USE_REAL_BACKEND: import.meta.env.VITE_USE_REAL_BACKEND,
  VITE_SHOW_DEMO_INDICATORS: import.meta.env.VITE_SHOW_DEMO_INDICATORS,
  VITE_ENABLE_ANALYTICS: import.meta.env.VITE_ENABLE_ANALYTICS,
  VITE_ENABLE_AUTH: import.meta.env.VITE_ENABLE_AUTH,
  VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
  NODE_ENV: import.meta.env.MODE,
  DEV: import.meta.env.DEV,
  PROD: import.meta.env.PROD,
};

const runtimeEnv = typeof window !== 'undefined' ? (window as WindowWithEnv).__ENV__ || {} : {};

const _env = (key: keyof PublicEnv, fallback = ''): string =>
  String(runtimeEnv[key as string] ?? publicImportMetaEnv[key] ?? '') ||
  (typeof process !== 'undefined' ? process.env?.[key] ?? '' : '') ||
  fallback;

export const config = {
  // AI & Backend Features - ENABLED BY DEFAULT FOR LIVE SYSTEM
  useRealAI:      _env('VITE_USE_REAL_AI',      'true') !== 'false',
  useRealData:    _env('VITE_USE_REAL_DATA',    'true') !== 'false',
  useRealBackend: _env('VITE_USE_REAL_BACKEND', 'true') !== 'false',

  // UI Features
  showDemoIndicators: _env('VITE_SHOW_DEMO_INDICATORS') === 'true',
  enableAnalytics:    _env('VITE_ENABLE_ANALYTICS')     === 'true',
  enableAuth:         _env('VITE_ENABLE_AUTH')           === 'true',

  // API Configuration
  apiBaseUrl: _env('VITE_API_BASE_URL', 'http://localhost:3001/api'),

  // Development flags
  isDevelopment: _env('NODE_ENV') === 'development' || Boolean(publicImportMetaEnv.DEV),
  isProduction:  _env('NODE_ENV') === 'production'  || Boolean(publicImportMetaEnv.PROD),
  
  // Multi-Agent Brain System v6.0 (Nexus Intelligence OS)
  enableMultiAgent: true,
  enableHistoricalLearning: true,
  enableRegionalCityEngine: true,
  enableDocumentIntelligence: true,
  enableLiveReportBuilder: true,
};

// Helper functions for feature detection
export const features = {
  // Check if a feature should use real implementation
  shouldUseReal: (feature: keyof typeof config): boolean => {
    return config[feature] as boolean;
  },

  // Check if we're in demo mode
  isDemoMode: (): boolean => {
    return !config.useRealAI || !config.useRealData || !config.useRealBackend;
  },

  // Get API endpoint with fallback
  getApiEndpoint: (endpoint: string): string | null => {
    if (config.useRealBackend) {
      return `${config.apiBaseUrl}${endpoint}`;
    }
    // Fallback to local processing when backend unavailable
    return null;
  },

  // Check if we should show demo indicators
  shouldShowDemoIndicator: (): boolean => {
    return config.showDemoIndicators && features.isDemoMode();
  },
};

// System status messages
export const systemMessages = {
  aiResponse: "AI analysis powered by Together.ai (Llama 3.1 70B) with NSIL intelligence engines.",
  dataSource: "Processing with live data integration and intelligent caching.",
  analysis: "Analysis complete using NSIL Intelligence Hub with 5-persona reasoning.",
  generation: "Document generated with professional formatting and export options.",
};

// Legacy alias for backward compatibility
export const demoMessages = systemMessages;

export default config;
