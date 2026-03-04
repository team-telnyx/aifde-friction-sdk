/**
 * @telnyx/friction-sdk
 * SDK for reporting friction encountered when using Telnyx APIs from AI agents
 * Now with OpenTelemetry integration for trace context propagation
 */

const fetch = require('node-fetch');
const { validate, ValidationError } = require('./validator');
const { trace, context, SpanStatusCode } = require('@opentelemetry/api');
const { logs, SeverityNumber } = require('@opentelemetry/api-logs');
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { OTLPLogExporter } = require('@opentelemetry/exporter-logs-otlp-http');
const { 
  LoggerProvider, 
  SimpleLogRecordProcessor,
  BatchLogRecordProcessor 
} = require('@opentelemetry/sdk-logs');
const { Resource } = require('@opentelemetry/resources');
const { 
  SEMRESATTRS_SERVICE_NAME,
  SEMRESATTRS_SERVICE_VERSION 
} = require('@opentelemetry/semantic-conventions');

const DEFAULT_ENDPOINT = 'https://api.telnyx.com/v2/friction';
const DEFAULT_TIMEOUT = 5000; // 5 seconds
const OTEL_INITIALIZED = Symbol('otel_initialized');

// Global flag to track OTel initialization (once per process)
let otelInitialized = false;
let loggerProvider = null;
let logger = null;

/**
 * Initialize OpenTelemetry SDK (once per process)
 * @private
 */
function initializeOTel(endpoint) {
  if (otelInitialized) {
    return;
  }

  try {
    // Create resource with service information
    const resource = Resource.default().merge(
      new Resource({
        [SEMRESATTRS_SERVICE_NAME]: 'telnyx-friction-sdk',
        [SEMRESATTRS_SERVICE_VERSION]: require('../package.json').version || '0.1.0'
      })
    );

    // Create OTLP HTTP exporter for logs
    // Note: In production, this would export to the OTLP endpoint
    // For now, we'll use a simple processor that doesn't export
    // to avoid breaking existing functionality
    loggerProvider = new LoggerProvider({ resource });

    // Use simple processor for immediate processing
    // In production with OTLP endpoint, use BatchLogRecordProcessor
    const processor = new SimpleLogRecordProcessor({
      export: (logs, resultCallback) => {
        // No-op exporter for now - logs are still sent via HTTP POST
        // This maintains backward compatibility
        resultCallback({ code: 0 });
      }
    });

    loggerProvider.addLogRecordProcessor(processor);

    // Register the logger provider
    logs.setGlobalLoggerProvider(loggerProvider);

    // Get logger instance
    logger = logs.getLogger('telnyx-friction-sdk', require('../package.json').version || '0.1.0');

    otelInitialized = true;
  } catch (error) {
    // OTel initialization failure should not break the SDK
    console.error('[Friction SDK] Failed to initialize OpenTelemetry:', error.message);
    otelInitialized = false;
  }
}

/**
 * Get trace context from current span
 * @private
 */
function getTraceContext() {
  try {
    const span = trace.getActiveSpan();
    if (span) {
      const spanContext = span.spanContext();
      return {
        trace_id: spanContext.traceId,
        span_id: spanContext.spanId,
        trace_flags: spanContext.traceFlags
      };
    }
  } catch (error) {
    // Silently fail - trace context is optional
  }
  
  // No active span - generate trace ID manually
  // This ensures every friction report has a trace ID
  return {
    trace_id: generateTraceId(),
    span_id: null
  };
}

/**
 * Generate a random trace ID (32 hex characters)
 * @private
 */
function generateTraceId() {
  const bytes = [];
  for (let i = 0; i < 16; i++) {
    bytes.push(Math.floor(Math.random() * 256).toString(16).padStart(2, '0'));
  }
  return bytes.join('');
}

/**
 * Generate a random span ID (16 hex characters)
 * @private
 */
function generateSpanId() {
  const bytes = [];
  for (let i = 0; i < 8; i++) {
    bytes.push(Math.floor(Math.random() * 256).toString(16).padStart(2, '0'));
  }
  return bytes.join('');
}

/**
 * Map severity string to OTel SeverityNumber
 * @private
 */
function mapSeverityToOTel(severity) {
  const severityMap = {
    'minor': SeverityNumber.INFO,
    'major': SeverityNumber.WARN,
    'blocker': SeverityNumber.ERROR
  };
  return severityMap[severity] || SeverityNumber.INFO;
}

class FrictionReporter {
  /**
   * Create a new FrictionReporter instance
   * @param {Object} options - Configuration options
   * @param {string} options.skill - Skill identifier (e.g., 'telnyx-webrtc-javascript')
   * @param {string} options.team - Product team (webrtc, messaging, voice, etc.)
   * @param {string} [options.language='javascript'] - SDK language
   * @param {string} [options.apiKey=null] - Telnyx API key (defaults to TELNYX_API_KEY env var)
   * @param {string} [options.endpoint=null] - Custom API endpoint (defaults to https://api.telnyx.com/v2/friction)
   */
  constructor({ skill, team, language = 'javascript', apiKey = null, endpoint = null }) {
    if (!skill) {
      throw new Error('skill is required');
    }
    if (!team) {
      throw new Error('team is required');
    }

    this.skill = skill;
    this.team = team;
    this.language = language;
    this.apiKey = apiKey || process.env.TELNYX_API_KEY || null;
    this.endpoint = endpoint || DEFAULT_ENDPOINT;
    this.timeout = DEFAULT_TIMEOUT;

    // Initialize OpenTelemetry (once per process)
    initializeOTel(this.endpoint);

    // Warn if no API key (graceful degradation mode)
    if (!this.apiKey) {
      console.log('[Friction SDK] No API key configured - friction reports will be logged to console only');
    }
  }

  /**
   * Report friction encountered during skill execution
   * @param {Object} options - Friction report options
   * @param {string} options.type - Friction type: parameter, api, docs, or auth
   * @param {string} options.severity - Severity: blocker, major, or minor
   * @param {string} options.message - Human-readable description
   * @param {Object} [options.context={}] - Additional context (endpoint, error_code, etc.)
   * @returns {Promise<void>} Resolves when report is sent (fire-and-forget)
   */
  async report({ type, severity, message, context = {} }) {
    try {
      // Get trace context (from active span or generate new)
      const traceContext = getTraceContext();

      // Build payload with trace context
      const payload = {
        skill: this.skill,
        team: this.team,
        language: this.language,
        type,
        severity,
        message,
        context,
        timestamp: new Date().toISOString(),
        trace: {
          trace_id: traceContext.trace_id,
          span_id: traceContext.span_id
        }
      };

      // Validate schema
      this._validate(payload);

      // Emit OTel log record if logger is available
      if (logger) {
        this._emitOTelLog(payload);
      }

      // If no API key, log to console only
      if (!this.apiKey) {
        this._logToConsole(payload);
        return;
      }

      // Send to API (fire-and-forget, don't block execution)
      this._sendToAPI(payload).catch(error => {
        // Errors are logged but don't throw (graceful degradation)
        console.error('[Friction SDK] Failed to send report:', error.message);
        this._logToConsole(payload);
      });

    } catch (error) {
      // Validation errors are logged but don't throw
      console.error('[Friction SDK] Invalid friction report:', error.message);
    }
  }

  /**
   * Emit OpenTelemetry log record
   * @private
   */
  _emitOTelLog(payload) {
    try {
      if (!logger) return;

      const severityNumber = mapSeverityToOTel(payload.severity);
      
      logger.emit({
        severityNumber,
        severityText: payload.severity.toUpperCase(),
        body: payload.message,
        attributes: {
          'friction.skill': payload.skill,
          'friction.team': payload.team,
          'friction.type': payload.type,
          'friction.language': payload.language,
          'trace.trace_id': payload.trace.trace_id,
          'trace.span_id': payload.trace.span_id,
          // Flatten context attributes
          ...Object.entries(payload.context || {}).reduce((acc, [key, value]) => {
            acc[`friction.context.${key}`] = value;
            return acc;
          }, {})
        },
        timestamp: Date.now()
      });
    } catch (error) {
      // OTel logging failure should not break the SDK
      console.error('[Friction SDK] Failed to emit OTel log:', error.message);
    }
  }

  /**
   * Validate friction report payload
   * @private
   */
  _validate(payload) {
    validate(payload);
  }

  /**
   * Send friction report to API
   * @private
   */
  async _sendToAPI(payload) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          // Propagate trace context via headers
          'traceparent': this._createTraceparent(payload.trace)
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API returned ${response.status}: ${errorText}`);
      }

      // Success - no need to process response (fire-and-forget)
      return;

    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Create W3C traceparent header value
   * @private
   */
  _createTraceparent(trace) {
    if (!trace.trace_id) return null;
    
    const version = '00';
    const traceId = trace.trace_id;
    const spanId = trace.span_id || generateSpanId();
    const flags = '01'; // sampled
    
    return `${version}-${traceId}-${spanId}-${flags}`;
  }

  /**
   * Log friction report to console (fallback mode)
   * @private
   */
  _logToConsole(payload) {
    console.log('[Friction Report]', JSON.stringify(payload, null, 2));
  }

  /**
   * Shutdown OpenTelemetry (for graceful shutdown)
   * Call this when your application is shutting down
   * @static
   */
  static async shutdown() {
    if (loggerProvider) {
      try {
        await loggerProvider.shutdown();
        otelInitialized = false;
        loggerProvider = null;
        logger = null;
      } catch (error) {
        console.error('[Friction SDK] Error during OTel shutdown:', error.message);
      }
    }
  }
}

module.exports = { FrictionReporter, ValidationError };
