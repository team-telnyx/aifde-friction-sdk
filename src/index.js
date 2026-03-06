/**
 * @telnyx/friction-sdk
 * SDK for reporting friction encountered when using Telnyx APIs from AI agents
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const fetch = require('node-fetch');
const yaml = require('js-yaml');
const { validate, ValidationError } = require('./validator');

// Production endpoint (hardcoded)
// Internal testing: Override with TELNYX_FRICTION_ENDPOINT env var
const DEFAULT_ENDPOINT = process.env.TELNYX_FRICTION_ENDPOINT || 'https://api.telnyx.com/v2/friction';
const DEFAULT_TIMEOUT = 5000; // 5 seconds
const DEFAULT_LOG_DIR = path.join(os.homedir(), '.openclaw', 'friction-logs');

/**
 * Generate a random trace ID (32 hex characters)
 * @private
 */
function generateTraceId() {
  return Array.from({ length: 32 }, () => 
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
}

/**
 * Generate a random span ID (16 hex characters)
 * @private
 */
function generateSpanId() {
  return Array.from({ length: 16 }, () => 
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
}

class FrictionReporter {
  /**
   * Create a new FrictionReporter instance
   * @param {Object} options - Configuration options
   * @param {string} options.skill - Skill identifier (e.g., 'telnyx-webrtc-javascript')
   * @param {string} options.team - Product team (webrtc, messaging, voice, etc.)
   * @param {string} [options.language='javascript'] - SDK language
   * @param {string} [options.apiKey=null] - Telnyx API key (defaults to TELNYX_API_KEY env var)
   * @param {string} [options.output='auto'] - Output mode: 'local', 'remote', 'both', or 'auto'
   * @param {string} [options.localDir=null] - Custom local log directory (defaults to ~/.openclaw/friction-logs)
   */
  constructor({ skill, team, language = 'javascript', apiKey = null, output = 'auto', localDir = null }) {
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
    this.endpoint = DEFAULT_ENDPOINT;
    this.timeout = DEFAULT_TIMEOUT;
    this.logDir = localDir || DEFAULT_LOG_DIR;
    
    // Determine output mode
    if (output === 'auto') {
      // Auto mode: use remote if API key available, otherwise local
      this.output = this.apiKey ? 'remote' : 'local';
    } else if (['local', 'remote', 'both'].includes(output)) {
      this.output = output;
    } else {
      throw new Error(`Invalid output: ${output}. Must be 'local', 'remote', 'both', or 'auto'`);
    }
    
    // Ensure log directory exists (for local/both modes)
    if (this.output === 'local' || this.output === 'both') {
      try {
        fs.mkdirSync(this.logDir, { recursive: true });
      } catch (error) {
        console.warn(`[Friction SDK] Could not create log directory: ${error.message}`);
      }
    }
    
    // Log initialization
    const outputInfo = output === 'auto' ? `${this.output} (auto-detected)` : this.output;
    console.log(`[Friction SDK] Initialized - skill: ${skill}, team: ${team}, output: ${outputInfo}`);
    
    if (this.output === 'remote' && !this.apiKey) {
      console.warn('[Friction SDK] Output is "remote" but no API key configured - reports will fail');
    }
  }

  /**
   * Report friction encountered during skill execution
   * @param {Object} options - Friction report options
   * @param {string} options.type - Friction type: parameter, api, docs, or auth
   * @param {string} options.severity - Severity: blocker, major, or minor
   * @param {string} options.message - Human-readable description
   * @param {Object} [options.context={}] - Additional context (endpoint, error_code, etc.)
   * @returns {Promise<void>} Resolves when report is processed (fire-and-forget for remote)
   */
  async report({ type, severity, message, context = {} }) {
    try {
      // Generate trace context
      const traceId = generateTraceId();
      const spanId = generateSpanId();
      
      // Build payload
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
          trace_id: traceId,
          span_id: spanId
        }
      };

      // Validate schema
      this._validate(payload);

      // Execute based on mode
      const results = {};
      
      if (this.output === 'local' || this.output === 'both') {
        results.local = await this._saveLocal(payload);
      }
      
      if (this.output === 'remote' || this.output === 'both') {
        // Fire-and-forget for remote (don't block execution)
        this._sendRemote(payload).catch(error => {
          console.error('[Friction SDK] Failed to send report to remote:', error.message);
          
          // Fallback to local if remote fails in 'both' mode
          if (this.output === 'both') {
            console.log('[Friction SDK] Remote send failed - already saved locally');
          }
        });
        results.remote = 'sent (async)';
      }
      
      return results;

    } catch (error) {
      // Validation errors are logged but don't throw
      console.error('[Friction SDK] Invalid friction report:', error.message);
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
   * Save friction report to local YAML file
   * @private
   * @returns {Promise<string>} Path to saved file
   */
  async _saveLocal(payload) {
    try {
      // Generate filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `friction-${timestamp}.yaml`;
      const filepath = path.join(this.logDir, filename);
      
      // Convert to YAML
      const yamlContent = yaml.dump(payload, {
        indent: 2,
        lineWidth: -1, // No line wrapping
        noRefs: true
      });
      
      // Write file
      fs.writeFileSync(filepath, yamlContent, 'utf8');
      
      console.log(`[Friction SDK] Saved locally: ${filepath}`);
      return filepath;
      
    } catch (error) {
      console.error('[Friction SDK] Failed to save locally:', error.message);
      throw error;
    }
  }

  /**
   * Send friction report to remote API
   * @private
   * @returns {Promise<Object>} API response
   */
  async _sendRemote(payload) {
    if (!this.apiKey) {
      throw new Error('No API key configured for remote reporting');
    }
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      // Build headers with trace context
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      };
      
      // Add W3C traceparent header if trace context exists
      if (payload.trace) {
        const { trace_id, span_id } = payload.trace;
        // Format: version-trace_id-span_id-flags
        headers['traceparent'] = `00-${trace_id}-${span_id}-01`;
      }
      
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API returned ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log(`[Friction SDK] Sent to remote: ${result.data?.id || 'unknown'}`);
      return result;

    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error(`Remote request timed out after ${this.timeout}ms`);
      }
      
      throw error;
    }
  }

  /**
   * List local friction log files (only works in local/both modes)
   * @returns {string[]} Array of file paths
   */
  listLocalLogs() {
    if (this.output === 'remote') {
      console.warn('[Friction SDK] Cannot list local logs in remote-only mode');
      return [];
    }
    
    try {
      const files = fs.readdirSync(this.logDir)
        .filter(f => f.startsWith('friction-') && f.endsWith('.yaml'))
        .map(f => path.join(this.logDir, f))
        .sort()
        .reverse(); // Most recent first
      
      return files;
    } catch (error) {
      console.error('[Friction SDK] Failed to list local logs:', error.message);
      return [];
    }
  }

  /**
   * Read a local friction log file (only works in local/both modes)
   * @param {string} filepath - Path to the YAML file
   * @returns {Object} Parsed friction report
   */
  readLocalLog(filepath) {
    if (this.output === 'remote') {
      throw new Error('Cannot read local logs in remote-only mode');
    }
    
    try {
      const content = fs.readFileSync(filepath, 'utf8');
      return yaml.load(content);
    } catch (error) {
      console.error('[Friction SDK] Failed to read local log:', error.message);
      throw error;
    }
  }
}

module.exports = { FrictionReporter, ValidationError };
