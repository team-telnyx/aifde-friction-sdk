/**
 * Schema validator for friction reports
 */

const VALID_TYPES = ['parameter', 'api', 'docs', 'auth'];
const VALID_SEVERITIES = ['blocker', 'major', 'minor'];
const VALID_TEAMS = ['webrtc', 'messaging', 'voice', 'numbers', 'ai', 'fax', 'iot', 'default'];
const VALID_LANGUAGES = ['javascript', 'python', 'go', 'ruby', 'java'];

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Calculate object depth recursively
 * @param {Object} obj - Object to measure
 * @param {number} depth - Current depth
 * @returns {number} Maximum depth
 */
function getObjectDepth(obj, depth = 1) {
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
    return depth;
  }
  
  const depths = Object.values(obj).map(value => {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      return getObjectDepth(value, depth + 1);
    }
    return depth;
  });
  
  return depths.length > 0 ? Math.max(...depths) : depth;
}

/**
 * Validate friction report payload
 * @param {Object} payload - The friction report payload
 * @throws {ValidationError} If validation fails
 */
function validate(payload) {
  const errors = [];

  // Required fields
  if (!payload.skill || typeof payload.skill !== 'string') {
    errors.push('skill is required and must be a string');
  } else if (payload.skill.trim() === '') {
    errors.push('skill cannot be empty');
  }

  if (!payload.team || typeof payload.team !== 'string') {
    errors.push('team is required and must be a string');
  } else if (payload.team.trim() === '') {
    errors.push('team cannot be empty');
  } else if (!VALID_TEAMS.includes(payload.team)) {
    errors.push(`team must be one of: ${VALID_TEAMS.join(', ')}`);
  }

  if (!payload.type || typeof payload.type !== 'string') {
    errors.push('type is required and must be a string');
  } else if (payload.type.trim() === '') {
    errors.push('type cannot be empty');
  } else if (!VALID_TYPES.includes(payload.type)) {
    errors.push(`type must be one of: ${VALID_TYPES.join(', ')}`);
  }

  if (!payload.severity || typeof payload.severity !== 'string') {
    errors.push('severity is required and must be a string');
  } else if (payload.severity.trim() === '') {
    errors.push('severity cannot be empty');
  } else if (!VALID_SEVERITIES.includes(payload.severity)) {
    errors.push(`severity must be one of: ${VALID_SEVERITIES.join(', ')}`);
  }

  if (!payload.message || typeof payload.message !== 'string') {
    errors.push('message is required and must be a string');
  } else if (payload.message.length > 200) {
    errors.push('message must be 200 characters or less (keep it concise)');
  } else if (payload.message.trim() === '') {
    errors.push('message cannot be empty');
  }
  
  // Warn about potentially dangerous characters (backend will sanitize)
  if (payload.message && /<script|<iframe|javascript:|on\w+=/i.test(payload.message)) {
    console.warn('[Friction SDK] Message contains potentially unsafe content - will be sanitized by backend');
  }

  // Optional fields
  if (payload.language && !VALID_LANGUAGES.includes(payload.language)) {
    errors.push(`language must be one of: ${VALID_LANGUAGES.join(', ')}`);
  }

  if (payload.context !== undefined) {
    if (typeof payload.context !== 'object' || payload.context === null || Array.isArray(payload.context)) {
      errors.push('context must be an object (not array or null)');
    } else {
      // Check depth (max 2 levels for simple structure)
      const depth = getObjectDepth(payload.context);
      if (depth > 2) {
        errors.push('context object too deeply nested (max 2 levels - keep it simple)');
      }
      
      // Check key count (max 10 for conciseness)
      const keyCount = Object.keys(payload.context).length;
      if (keyCount > 10) {
        errors.push('context has too many keys (max 10 - focus on essential info)');
      }
      
      // Check serialized size
      try {
        const contextSize = JSON.stringify(payload.context).length;
        if (contextSize > 1024) {
          errors.push('context object too large (max 1KB - keep it minimal)');
        }
      } catch (e) {
        errors.push('context object cannot be serialized');
      }
    }
  }

  if (payload.agent && typeof payload.agent !== 'object') {
    errors.push('agent must be an object');
  }

  if (errors.length > 0) {
    throw new ValidationError(errors.join('; '));
  }

  return true;
}

module.exports = {
  validate,
  ValidationError,
  VALID_TYPES,
  VALID_SEVERITIES,
  VALID_TEAMS,
  VALID_LANGUAGES
};
