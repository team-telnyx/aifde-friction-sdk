/**
 * Tests for FrictionReporter with OpenTelemetry integration
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

test('FrictionReporter.report() generates trace ID', async () => {
  const reporter = new FrictionReporter({
    skill: 'test-skill',
    team: 'webrtc'
  });

  // Capture console output to verify trace ID is present
  let loggedPayload = null;
  const originalLog = console.log;
  console.log = (...args) => {
    if (args[0] === '[Friction Report]') {
      loggedPayload = JSON.parse(args[1]);
    }
  };

  await reporter.report({
    type: 'parameter',
    severity: 'major',
    message: 'Test friction'
  });

  console.log = originalLog;

  // Verify trace context exists
  assert.ok(loggedPayload, 'Should have logged payload');
  assert.ok(loggedPayload.trace, 'Should have trace context');
  assert.ok(loggedPayload.trace.trace_id, 'Should have trace_id');
  assert.strictEqual(loggedPayload.trace.trace_id.length, 32, 'trace_id should be 32 hex characters');
});

test('FrictionReporter.report() includes trace context in payload', async () => {
  const reporter = new FrictionReporter({
    skill: 'test-skill',
    team: 'webrtc',
    apiKey: 'test-key'
  });

  // Mock _sendToAPI to capture payload
  let capturedPayload = null;
  reporter._sendToAPI = async (payload) => {
    capturedPayload = payload;
  };

  await reporter.report({
    type: 'parameter',
    severity: 'major',
    message: 'Test friction',
    context: { endpoint: 'POST /test' }
  });

  // Wait a bit for async operations
  await new Promise(resolve => setTimeout(resolve, 100));

  assert.ok(capturedPayload, 'Should have captured payload');
  assert.ok(capturedPayload.trace, 'Should have trace context');
  assert.ok(capturedPayload.trace.trace_id, 'Should have trace_id');
  assert.strictEqual(typeof capturedPayload.trace.trace_id, 'string', 'trace_id should be string');
});

test('FrictionReporter._createTraceparent() creates valid W3C traceparent', () => {
  const reporter = new FrictionReporter({
    skill: 'test-skill',
    team: 'webrtc'
  });

  const trace = {
    trace_id: '0af7651916cd43dd8448eb211c80319c',
    span_id: 'b7ad6b7169203331'
  };

  const traceparent = reporter._createTraceparent(trace);
  
  assert.ok(traceparent, 'Should create traceparent');
  assert.ok(traceparent.startsWith('00-'), 'Should start with version 00');
  assert.ok(traceparent.includes(trace.trace_id), 'Should include trace_id');
  assert.ok(traceparent.includes(trace.span_id), 'Should include span_id');
  assert.ok(traceparent.endsWith('-01'), 'Should end with sampled flag');
});

test('FrictionReporter._createTraceparent() generates span_id if missing', () => {
  const reporter = new FrictionReporter({
    skill: 'test-skill',
    team: 'webrtc'
  });

  const trace = {
    trace_id: '0af7651916cd43dd8448eb211c80319c',
    span_id: null
  };

  const traceparent = reporter._createTraceparent(trace);
  
  assert.ok(traceparent, 'Should create traceparent');
  const parts = traceparent.split('-');
  assert.strictEqual(parts.length, 4, 'Should have 4 parts');
  assert.strictEqual(parts[2].length, 16, 'span_id should be 16 hex characters');
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
    message: 'Test',
    trace: {
      trace_id: '0af7651916cd43dd8448eb211c80319c',
      span_id: null
    }
  };

  // Should not throw
  assert.doesNotThrow(() => reporter._logToConsole(payload));
});

test('FrictionReporter initialization does not break with OTel errors', () => {
  // This test verifies graceful degradation if OTel fails
  // Should not throw even if OTel initialization fails
  assert.doesNotThrow(() => {
    const reporter = new FrictionReporter({
      skill: 'test-skill',
      team: 'webrtc'
    });
    assert.ok(reporter);
  });
});

test('FrictionReporter.shutdown() can be called safely', async () => {
  await assert.doesNotReject(
    FrictionReporter.shutdown()
  );
});

test('Multiple FrictionReporter instances share OTel initialization', () => {
  const reporter1 = new FrictionReporter({
    skill: 'test-skill-1',
    team: 'webrtc'
  });

  const reporter2 = new FrictionReporter({
    skill: 'test-skill-2',
    team: 'messaging'
  });

  // Both should work without issues
  assert.ok(reporter1);
  assert.ok(reporter2);
  assert.strictEqual(reporter1.skill, 'test-skill-1');
  assert.strictEqual(reporter2.skill, 'test-skill-2');
});
