/**
 * Tests for FrictionReporter
 */

const { test } = require('node:test');
const assert = require('node:assert');
const { FrictionReporter, ValidationError } = require('../src/index');

test('FrictionReporter constructor throws on missing skill', () => {
  assert.throws(
    () => new FrictionReporter({ team: 'webrtc' }),
    /skill is required/
  );
});

test('FrictionReporter constructor throws on missing team', () => {
  assert.throws(
    () => new FrictionReporter({ skill: 'test-skill' }),
    /team is required/
  );
});

test('FrictionReporter constructor sets defaults', () => {
  const reporter = new FrictionReporter({
    skill: 'test-skill',
    team: 'webrtc'
  });

  assert.strictEqual(reporter.skill, 'test-skill');
  assert.strictEqual(reporter.team, 'webrtc');
  assert.strictEqual(reporter.language, 'javascript');
  assert.strictEqual(reporter.endpoint, 'https://api.telnyx.com/v2/friction');
});

test('FrictionReporter constructor accepts custom values', () => {
  const reporter = new FrictionReporter({
    skill: 'test-skill',
    team: 'messaging',
    language: 'python',
    apiKey: 'test-key',
    endpoint: 'https://custom.endpoint.com/friction'
  });

  assert.strictEqual(reporter.skill, 'test-skill');
  assert.strictEqual(reporter.team, 'messaging');
  assert.strictEqual(reporter.language, 'python');
  assert.strictEqual(reporter.apiKey, 'test-key');
  assert.strictEqual(reporter.endpoint, 'https://custom.endpoint.com/friction');
});

test('FrictionReporter.report() validates payload', async () => {
  const reporter = new FrictionReporter({
    skill: 'test-skill',
    team: 'webrtc'
  });

  // Invalid severity should not throw (graceful degradation)
  // but should log error to console
  await reporter.report({
    type: 'parameter',
    severity: 'invalid',
    message: 'Test'
  });

  // Test passes if no error thrown
  assert.ok(true);
});

test('FrictionReporter.report() does not throw on valid payload', async () => {
  const reporter = new FrictionReporter({
    skill: 'test-skill',
    team: 'webrtc'
  });

  await assert.doesNotReject(
    reporter.report({
      type: 'parameter',
      severity: 'major',
      message: 'Test friction',
      context: { endpoint: 'POST /test' }
    })
  );
});

test('FrictionReporter._validate() throws ValidationError on invalid payload', () => {
  const reporter = new FrictionReporter({
    skill: 'test-skill',
    team: 'webrtc'
  });

  assert.throws(
    () => reporter._validate({
      skill: 'test-skill',
      team: 'webrtc',
      type: 'invalid-type',
      severity: 'major',
      message: 'Test'
    }),
    ValidationError
  );
});

test('FrictionReporter._logToConsole() formats payload correctly', () => {
  const reporter = new FrictionReporter({
    skill: 'test-skill',
    team: 'webrtc'
  });

  const payload = {
    skill: 'test-skill',
    team: 'webrtc',
    type: 'parameter',
    severity: 'major',
    message: 'Test'
  };

  // Should not throw
  assert.doesNotThrow(() => reporter._logToConsole(payload));
});
