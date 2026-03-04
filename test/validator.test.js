/**
 * Tests for validator.js
 */

const { test } = require('node:test');
const assert = require('node:assert');
const { validate, ValidationError, VALID_TYPES, VALID_SEVERITIES, VALID_TEAMS } = require('../src/validator');

test('validate() accepts valid payload', () => {
  const payload = {
    skill: 'telnyx-webrtc-javascript',
    team: 'webrtc',
    type: 'parameter',
    severity: 'major',
    message: 'Test friction',
    context: { endpoint: 'POST /test' }
  };

  assert.doesNotThrow(() => validate(payload));
});

test('validate() throws on missing skill', () => {
  const payload = {
    team: 'webrtc',
    type: 'parameter',
    severity: 'major',
    message: 'Test'
  };

  assert.throws(() => validate(payload), ValidationError);
});

test('validate() throws on missing team', () => {
  const payload = {
    skill: 'test-skill',
    type: 'parameter',
    severity: 'major',
    message: 'Test'
  };

  assert.throws(() => validate(payload), ValidationError);
});

test('validate() throws on invalid team', () => {
  const payload = {
    skill: 'test-skill',
    team: 'invalid-team',
    type: 'parameter',
    severity: 'major',
    message: 'Test'
  };

  assert.throws(() => validate(payload), ValidationError);
});

test('validate() throws on missing type', () => {
  const payload = {
    skill: 'test-skill',
    team: 'webrtc',
    severity: 'major',
    message: 'Test'
  };

  assert.throws(() => validate(payload), ValidationError);
});

test('validate() throws on invalid type', () => {
  const payload = {
    skill: 'test-skill',
    team: 'webrtc',
    type: 'invalid-type',
    severity: 'major',
    message: 'Test'
  };

  assert.throws(() => validate(payload), ValidationError);
});

test('validate() throws on missing severity', () => {
  const payload = {
    skill: 'test-skill',
    team: 'webrtc',
    type: 'parameter',
    message: 'Test'
  };

  assert.throws(() => validate(payload), ValidationError);
});

test('validate() throws on invalid severity', () => {
  const payload = {
    skill: 'test-skill',
    team: 'webrtc',
    type: 'parameter',
    severity: 'critical',
    message: 'Test'
  };

  assert.throws(() => validate(payload), ValidationError);
});

test('validate() throws on missing message', () => {
  const payload = {
    skill: 'test-skill',
    team: 'webrtc',
    type: 'parameter',
    severity: 'major'
  };

  assert.throws(() => validate(payload), ValidationError);
});

test('validate() throws on message too long', () => {
  const payload = {
    skill: 'test-skill',
    team: 'webrtc',
    type: 'parameter',
    severity: 'major',
    message: 'x'.repeat(501)
  };

  assert.throws(() => validate(payload), ValidationError);
});

test('validate() accepts valid language', () => {
  const payload = {
    skill: 'test-skill',
    team: 'webrtc',
    type: 'parameter',
    severity: 'major',
    message: 'Test',
    language: 'python'
  };

  assert.doesNotThrow(() => validate(payload));
});

test('validate() throws on invalid language', () => {
  const payload = {
    skill: 'test-skill',
    team: 'webrtc',
    type: 'parameter',
    severity: 'major',
    message: 'Test',
    language: 'rust'
  };

  assert.throws(() => validate(payload), ValidationError);
});

test('validate() accepts valid context object', () => {
  const payload = {
    skill: 'test-skill',
    team: 'webrtc',
    type: 'parameter',
    severity: 'major',
    message: 'Test',
    context: {
      endpoint: 'POST /test',
      error_code: '422'
    }
  };

  assert.doesNotThrow(() => validate(payload));
});

test('validate() throws on non-object context', () => {
  const payload = {
    skill: 'test-skill',
    team: 'webrtc',
    type: 'parameter',
    severity: 'major',
    message: 'Test',
    context: 'not an object'
  };

  assert.throws(() => validate(payload), ValidationError);
});

test('VALID_TYPES contains expected types', () => {
  assert.deepStrictEqual(VALID_TYPES, ['parameter', 'api', 'docs', 'auth']);
});

test('VALID_SEVERITIES contains expected severities', () => {
  assert.deepStrictEqual(VALID_SEVERITIES, ['blocker', 'major', 'minor']);
});

test('VALID_TEAMS contains expected teams', () => {
  assert.deepStrictEqual(VALID_TEAMS, ['webrtc', 'messaging', 'voice', 'numbers', 'ai', 'fax', 'iot', 'default']);
});
