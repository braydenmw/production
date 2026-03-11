import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables - check multiple possible locations
const envPaths = [
  path.resolve(__dirname, '.env'),           // Same directory
  path.resolve(__dirname, '..', '.env'),     // Parent directory (dev)
  path.resolve(__dirname, '..', '..', '.env'), // Two levels up (production bundled)
  path.resolve(process.cwd(), '.env'),       // Current working directory
];

for (const envPath of envPaths) {
  const result = dotenv.config({ path: envPath });
  if (!result.error) {
    console.log('Loaded .env from:', envPath);
    break;
  }
}

// Debug: Check if API key is loaded (never log key length in production)
console.log('GEMINI_API_KEY loaded:', process.env.GEMINI_API_KEY ? 'Yes' : 'No');

// Import routes
import aiRoutes from './routes/ai.js';
import reportsRoutes from './routes/reports.js';
import searchRoutes from './routes/search.js';
import autonomousRoutes from './routes/autonomous.js';
import governanceRoutes from './routes/governance.js';
import bedrockRoutes from './routes/bedrock.js';
import proxyRoutes from './routes/proxy.js';
import memoryRoutes from './routes/memory.js';

const app = express();
const PORT = parseInt(String(process.env.PORT || 3001), 10);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https://api.worldbank.org", "https://restcountries.com", "https://nominatim.openstreetmap.org", "https://en.wikipedia.org", "https://google.serper.dev", "https://api.perplexity.ai", "https://generativelanguage.googleapis.com", "https://*.amazonaws.com", "https://api.together.xyz", "https://api.groq.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
}));

// ─── Server-Side Security Hardening ─────────────────────────────────────────

// Block requests with suspicious headers
app.use((req: Request, res: Response, next: NextFunction) => {
  // Reject requests with extremely long URLs (potential buffer overflow / scanning)
  if (req.url.length > 4096) {
    return res.status(414).json({ error: 'URI too long' });
  }

  // Block null byte injection in URLs
  if (req.url.includes('\0') || req.url.includes('%00')) {
    return res.status(400).json({ error: 'Invalid request' });
  }

  // Block path traversal in URLs
  if (req.url.includes('..') || req.url.includes('%2e%2e')) {
    return res.status(400).json({ error: 'Invalid path' });
  }

  // Strip X-Powered-By (helmet does this too, belt-and-suspenders)
  res.removeHeader('X-Powered-By');

  // Add additional security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');

  next();
});

// Validate and sanitize request bodies for AI endpoints
app.use('/api/ai', (req: Request, res: Response, next: NextFunction) => {
  if (req.method !== 'POST' && req.method !== 'PUT') return next();
  if (!req.body) return next();

  const body = req.body;

  // Check for oversized message payloads
  if (body.message && typeof body.message === 'string' && body.message.length > 15000) {
    return res.status(413).json({ error: 'Message too long. Maximum 15,000 characters.' });
  }

  // Strip null bytes from all string fields
  for (const key of Object.keys(body)) {
    if (typeof body[key] === 'string') {
      body[key] = body[key].replace(/\0/g, '');
    }
  }

  // Block prompt injection patterns in server-side requests
  if (body.message && typeof body.message === 'string') {
    const msg = body.message;
    const dangerousPatterns = [
      /\[system\]|\[INST\]|<\|system\|>|<\|im_start\|>/i,
      /ignore\s+(?:all\s+)?(?:previous|prior)\s+instructions/i,
      /<script[\s>]/i,
      /javascript\s*:/i,
    ];
    for (const pattern of dangerousPatterns) {
      if (pattern.test(msg)) {
        console.warn(`[SECURITY] Blocked dangerous input pattern: ${pattern.source} from ${req.ip}`);
        return res.status(400).json({ error: 'Input contains disallowed content.' });
      }
    }
  }

  next();
});

// Rate limiting — prevent abuse
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', apiLimiter);

// Stricter limit for AI endpoints (expensive calls)
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'AI request rate limit exceeded. Please wait before trying again.' },
});
app.use('/api/ai/', aiLimiter);
app.use('/api/search/location-intelligence', aiLimiter);

// CORS - allow frontend origin (flexible for different deployment scenarios)
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:3003',
  'http://localhost:5173',
  'https://bw-nexus-ai.onrender.com',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.some(allowed => origin.startsWith(allowed || ''))) {
      return callback(null, true);
    }
    // In production, only allow the configured frontend URL and known deploys
    console.warn(`CORS blocked origin: ${origin}`);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

// Body parsing (with size limits to prevent abuse)
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Compression
app.use(compression());

// Request logging
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Health check (before other routes for reliability)
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API Routes
app.use('/api/ai', aiRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/autonomous', autonomousRoutes);
app.use('/api/governance', governanceRoutes);
app.use('/api/bedrock', bedrockRoutes);
app.use('/api/ai/proxy', proxyRoutes);
app.use('/api/memory', memoryRoutes);

// Serve static frontend in production
if (process.env.NODE_ENV === 'production') {
  // Try multiple possible dist paths
  const possibleDistPaths = [
    path.join(__dirname, '..', '..', 'dist'),  // From dist-server/server/
    path.join(__dirname, '..', 'dist'),         // From dist-server/
    path.join(process.cwd(), 'dist'),           // From project root
  ];
  
  let distPath = possibleDistPaths[0];
  for (const p of possibleDistPaths) {
    if (fs.existsSync(path.join(p, 'index.html'))) {
      distPath = p;
      console.log('Serving static files from:', distPath);
      break;
    }
  }
  
  // DEBUG: optionally log static asset lookups (set DEBUG_STATIC=true in env to enable)
  if (process.env.DEBUG_STATIC === 'true') {
    app.use((req: Request, _res: Response, next: NextFunction) => {
      if (req.path.startsWith('/assets') || req.path === '/' || req.path.endsWith('.js') || req.path.endsWith('.css') || req.path.endsWith('index.html')) {
        const filePath = path.join(distPath, req.path === '/' ? 'index.html' : req.path);
        const exists = fs.existsSync(filePath);
        const stat = exists ? fs.statSync(filePath) : null;
        console.log(`[STATIC DEBUG] ${req.method} ${req.path} -> ${filePath} exists=${exists} size=${stat ? stat.size : 0}`);
      }
      next();
    });
  }
  
  app.use(express.static(distPath));
  
  // SPA fallback - serve index.html for all non-API routes
  app.get('*', (_req: Request, res: Response) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Error handling
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  void _next;
  console.error('Server error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║  BWGA Intelligence AI Backend Server                                ║
║  ──────────────────────────────────────────────────────────║
║  Status:    ONLINE                                         ║
║  Port:      ${PORT}                                            ║
║  Mode:      ${process.env.NODE_ENV || 'development'}                                 ║
║  API:       http://localhost:${PORT}/api                       ║
║  Health:    http://localhost:${PORT}/api/health                ║
╚════════════════════════════════════════════════════════════╝
  `);
  console.log('[DEBUG] Server started, event loop should be active...');
});

console.log('[DEBUG] After app.listen call');

// Keep server running
server.on('listening', () => {
  console.log('[DEBUG] Server listening event fired');
});

server.on('error', (err) => {
  console.error('Server error:', err);
});

// Ensure the event loop stays active
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default app;
