/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * BW NEXUS AI — STRUCTURED LOGGING & MONITORING SERVICE
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Replaces ad-hoc console.log calls with structured, queryable logs.
 * Provides metrics tracking, performance monitoring, and audit trails.
 *
 * Features:
 *  • Structured JSON log entries with severity levels
 *  • Performance metric tracking (latency, token usage, error rates)
 *  • Bounded in-memory log buffer (auto-compacts)
 *  • AI call audit trail (model, tokens, latency, success/failure)
 *  • System health dashboard data
 *  • Export to external logging (when configured)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical';
export type LogCategory =
  | 'ai_call'
  | 'tool_execution'
  | 'moderation'
  | 'pii_detection'
  | 'search'
  | 'data_fetch'
  | 'user_action'
  | 'system'
  | 'performance'
  | 'security'
  | 'memory';

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  category: LogCategory;
  message: string;
  data?: Record<string, unknown>;
  durationMs?: number;
  error?: string;
}

export interface AICallMetric {
  timestamp: string;
  model: string;
  provider: 'together' | 'gemini' | 'openai' | 'bedrock' | 'unknown';
  latencyMs: number;
  inputTokens?: number;
  outputTokens?: number;
  success: boolean;
  error?: string;
  taskType?: string;
}

export interface PerformanceMetrics {
  aiCalls: {
    total: number;
    successful: number;
    failed: number;
    avgLatencyMs: number;
    p95LatencyMs: number;
    byProvider: Record<string, { count: number; avgMs: number; errors: number }>;
  };
  tools: {
    total: number;
    successful: number;
    failed: number;
    avgLatencyMs: number;
    byTool: Record<string, { count: number; avgMs: number }>;
  };
  moderation: {
    totalScans: number;
    flagged: number;
    blocked: number;
  };
  uptime: {
    startTime: string;
    currentTime: string;
    totalRequests: number;
  };
}

// ─── Constants ──────────────────────────────────────────────────────────────

const MAX_LOG_ENTRIES = 5000;
const MAX_AI_METRICS = 2000;
const MAX_TOOL_METRICS = 2000;
const COMPACT_TO = 2500; // When compacting, keep this many entries

// ─── Logging & Monitoring Service ───────────────────────────────────────────

class MonitoringService {
  private logs: LogEntry[] = [];
  private aiMetrics: AICallMetric[] = [];
  private toolMetrics: Array<{ timestamp: string; name: string; latencyMs: number; success: boolean }> = [];
  private moderationStats = { totalScans: 0, flagged: 0, blocked: 0 };
  private totalRequests = 0;
  private startTime = new Date().toISOString();
  private idCounter = 0;

  // ── Logging ─────────────────────────────────────────────────────────────

  private log(level: LogLevel, category: LogCategory, message: string, data?: Record<string, unknown>, durationMs?: number, error?: string): void {
    const entry: LogEntry = {
      id: `log_${++this.idCounter}`,
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data,
      durationMs,
      error,
    };

    this.logs.push(entry);
    if (this.logs.length > MAX_LOG_ENTRIES) {
      this.logs = this.logs.slice(-COMPACT_TO);
    }

    // Also output to console with structured format
    const prefix = `[${entry.timestamp}] [${level.toUpperCase()}] [${category}]`;
    if (level === 'error' || level === 'critical') {
      console.error(prefix, message, data || '', error || '');
    } else if (level === 'warn') {
      console.warn(prefix, message, data || '');
    } else if (level === 'debug') {
      // Only log debug in development
      if (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production') {
        console.debug(prefix, message, data || '');
      }
    } else {
      console.log(prefix, message, data ? JSON.stringify(data) : '');
    }
  }

  debug(category: LogCategory, message: string, data?: Record<string, unknown>): void {
    this.log('debug', category, message, data);
  }

  info(category: LogCategory, message: string, data?: Record<string, unknown>): void {
    this.log('info', category, message, data);
  }

  warn(category: LogCategory, message: string, data?: Record<string, unknown>): void {
    this.log('warn', category, message, data);
  }

  error(category: LogCategory, message: string, error?: string, data?: Record<string, unknown>): void {
    this.log('error', category, message, data, undefined, error);
  }

  critical(category: LogCategory, message: string, error?: string, data?: Record<string, unknown>): void {
    this.log('critical', category, message, data, undefined, error);
  }

  // ── AI Call Tracking ────────────────────────────────────────────────────

  trackAICall(metric: AICallMetric): void {
    this.aiMetrics.push(metric);
    this.totalRequests++;
    if (this.aiMetrics.length > MAX_AI_METRICS) {
      this.aiMetrics = this.aiMetrics.slice(-1000);
    }
    this.log(
      metric.success ? 'info' : 'error',
      'ai_call',
      `${metric.provider}/${metric.model} — ${metric.latencyMs}ms ${metric.success ? '✓' : '✗'}`,
      { provider: metric.provider, model: metric.model, latencyMs: metric.latencyMs, taskType: metric.taskType },
      metric.latencyMs,
      metric.error
    );
  }

  // ── Tool Execution Tracking ─────────────────────────────────────────────

  trackToolExecution(name: string, latencyMs: number, success: boolean, error?: string): void {
    this.toolMetrics.push({ timestamp: new Date().toISOString(), name, latencyMs, success });
    if (this.toolMetrics.length > MAX_TOOL_METRICS) {
      this.toolMetrics = this.toolMetrics.slice(-1000);
    }
    this.log(
      success ? 'info' : 'warn',
      'tool_execution',
      `Tool ${name} — ${latencyMs}ms ${success ? '✓' : '✗'}`,
      { tool: name, latencyMs, success },
      latencyMs,
      error
    );
  }

  // ── Moderation Tracking ─────────────────────────────────────────────────

  trackModeration(action: 'pass' | 'cleaned' | 'replaced' | 'blocked'): void {
    this.moderationStats.totalScans++;
    if (action === 'cleaned' || action === 'replaced') this.moderationStats.flagged++;
    if (action === 'blocked' || action === 'replaced') this.moderationStats.blocked++;
  }

  // ── Performance Metrics ─────────────────────────────────────────────────

  getPerformanceMetrics(): PerformanceMetrics {
    const successful = this.aiMetrics.filter(m => m.success);
    const failed = this.aiMetrics.filter(m => !m.success);
    const latencies = successful.map(m => m.latencyMs).sort((a, b) => a - b);
    const avg = latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0;
    const p95Index = Math.floor(latencies.length * 0.95);
    const p95 = latencies[p95Index] || 0;

    const byProvider: Record<string, { count: number; avgMs: number; errors: number }> = {};
    for (const m of this.aiMetrics) {
      if (!byProvider[m.provider]) byProvider[m.provider] = { count: 0, avgMs: 0, errors: 0 };
      byProvider[m.provider].count++;
      if (!m.success) byProvider[m.provider].errors++;
    }
    for (const [provider, stats] of Object.entries(byProvider)) {
      const providerLatencies = this.aiMetrics.filter(m => m.provider === provider && m.success).map(m => m.latencyMs);
      stats.avgMs = providerLatencies.length > 0 ? Math.round(providerLatencies.reduce((a, b) => a + b, 0) / providerLatencies.length) : 0;
    }

    const byTool: Record<string, { count: number; avgMs: number }> = {};
    for (const t of this.toolMetrics) {
      if (!byTool[t.name]) byTool[t.name] = { count: 0, avgMs: 0 };
      byTool[t.name].count++;
    }
    for (const [name, stats] of Object.entries(byTool)) {
      const toolLatencies = this.toolMetrics.filter(t => t.name === name && t.success).map(t => t.latencyMs);
      stats.avgMs = toolLatencies.length > 0 ? Math.round(toolLatencies.reduce((a, b) => a + b, 0) / toolLatencies.length) : 0;
    }

    const toolSuccessful = this.toolMetrics.filter(t => t.success).length;
    const toolLatencies = this.toolMetrics.filter(t => t.success).map(t => t.latencyMs);

    return {
      aiCalls: {
        total: this.aiMetrics.length,
        successful: successful.length,
        failed: failed.length,
        avgLatencyMs: avg,
        p95LatencyMs: p95,
        byProvider,
      },
      tools: {
        total: this.toolMetrics.length,
        successful: toolSuccessful,
        failed: this.toolMetrics.length - toolSuccessful,
        avgLatencyMs: toolLatencies.length > 0 ? Math.round(toolLatencies.reduce((a, b) => a + b, 0) / toolLatencies.length) : 0,
        byTool,
      },
      moderation: { ...this.moderationStats },
      uptime: {
        startTime: this.startTime,
        currentTime: new Date().toISOString(),
        totalRequests: this.totalRequests,
      },
    };
  }

  // ── Log Querying ────────────────────────────────────────────────────────

  queryLogs(options?: {
    level?: LogLevel;
    category?: LogCategory;
    since?: string;
    limit?: number;
  }): LogEntry[] {
    let results = this.logs;
    if (options?.level) results = results.filter(l => l.level === options.level);
    if (options?.category) results = results.filter(l => l.category === options.category);
    if (options?.since) results = results.filter(l => l.timestamp >= options.since!);
    if (options?.limit) results = results.slice(-options.limit);
    return results;
  }

  getRecentErrors(limit = 20): LogEntry[] {
    return this.logs.filter(l => l.level === 'error' || l.level === 'critical').slice(-limit);
  }

  // ── System Health ───────────────────────────────────────────────────────

  getSystemHealth(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    indicators: Record<string, { status: string; detail: string }>;
  } {
    const metrics = this.getPerformanceMetrics();
    const recentErrors = this.logs.filter(l => {
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      return (l.level === 'error' || l.level === 'critical') && l.timestamp >= fiveMinAgo;
    });

    const errorRate = metrics.aiCalls.total > 0
      ? metrics.aiCalls.failed / metrics.aiCalls.total
      : 0;

    const indicators: Record<string, { status: string; detail: string }> = {
      ai_service: {
        status: errorRate < 0.1 ? 'ok' : errorRate < 0.3 ? 'degraded' : 'down',
        detail: `${(errorRate * 100).toFixed(1)}% error rate, ${metrics.aiCalls.avgLatencyMs}ms avg latency`,
      },
      tools: {
        status: metrics.tools.failed === 0 ? 'ok' : metrics.tools.failed < 5 ? 'degraded' : 'down',
        detail: `${metrics.tools.total} executions, ${metrics.tools.failed} failures`,
      },
      moderation: {
        status: 'ok',
        detail: `${metrics.moderation.totalScans} scans, ${metrics.moderation.blocked} blocked`,
      },
      recent_errors: {
        status: recentErrors.length === 0 ? 'ok' : recentErrors.length < 5 ? 'warn' : 'critical',
        detail: `${recentErrors.length} errors in last 5 minutes`,
      },
    };

    const statuses = Object.values(indicators).map(i => i.status);
    const overallStatus = statuses.includes('down') || statuses.includes('critical')
      ? 'unhealthy'
      : statuses.includes('degraded') || statuses.includes('warn')
        ? 'degraded'
        : 'healthy';

    return { status: overallStatus, indicators };
  }
}

// ─── Singleton ──────────────────────────────────────────────────────────────

export const monitoringService = new MonitoringService();
export default monitoringService;
