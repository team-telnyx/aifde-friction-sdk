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
 * Validate friction report payload
 * @param {Object} payload - The friction report payload
 * @throws {ValidationError} If validation fails
 */
function validate(payload) {
  const errors = [];

  // Required fields
  if (!payload.skill || typeof payload.skill !== 'string') {
    errors.push('skill is required and must be a string');
  }

  if (!payload.team || typeof payload.team !== 'string') {
    errors.push('team is required and must be a string');
  } else if (!VALID_TEAMS.includes(payload.team)) {
    errors.push(`team must be one of: ${VALID_TEAMS.join(', ')}`);
  }

  if (!payload.type || typeof payload.type !== 'string') {
    errors.push('type is required and must be a string');
  } else if (!VALID_TYPES.includes(payload.type)) {
    errors.push(`type must be one of: ${VALID_TYPES.join(', ')}`);
  }

  if (!payload.severity || typeof payload.severity !== 'string') {
    errors.push('severity is required and must be a string');
  } else if (!VALID_SEVERITIES.includes(payload.severity)) {
    errors.push(`severity must be one of: ${VALID_SEVERITIES.join(', ')}`);
  }

  if (!payload.message || typeof payload.message !== 'string') {
    errors.push('message is required and must be a string');
  } else if (payload.message.length > 500) {
    errors.push('message must be 500 characters or less');
  }

  // Optional fields
  if (payload.language && !VALID_LANGUAGES.includes(payload.language)) {
    errors.push(`language must be one of: ${VALID_LANGUAGES.join(', ')}`);
  }

  if (payload.context && typeof payload.context !== 'object') {
    errors.push('context must be an object');
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
