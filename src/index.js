/**
 * @telnyx/friction-sdk
 * SDK for reporting friction encountered when using Telnyx APIs from AI agents
 */

const fetch = require('node-fetch');
const { validate, ValidationError } = require('./validator');

const DEFAULT_ENDPOINT = 'https://api.telnyx.com/v2/friction';
const DEFAULT_TIMEOUT = 5000; // 5 seconds

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
      // Build payload
      const payload = {
        skill: this.skill,
        team: this.team,
        language: this.language,
        type,
        severity,
        message,
        context,
        timestamp: new Date().toISOString()
      };

      // Validate schema
      this._validate(payload);

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
          'Authorization': `Bearer ${this.apiKey}`
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
   * Log friction report to console (fallback mode)
   * @private
   */
  _logToConsole(payload) {
    console.log('[Friction Report]', JSON.stringify(payload, null, 2));
  }
}

module.exports = { FrictionReporter, ValidationError };
