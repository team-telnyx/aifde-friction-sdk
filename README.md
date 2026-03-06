# @telnyx/friction-sdk

SDK for AI agents to report friction encountered when using Telnyx APIs.

## Overview

When AI agents encounter issues using Telnyx APIs (parameter mismatches, unclear errors, missing docs), they should report friction. This SDK provides a simple way to capture and route these reports.

## Installation

```bash
npm install @telnyx/friction-sdk
```

## Quick Start

```javascript
const { FrictionReporter } = require('@telnyx/friction-sdk');

// Initialize reporter
const friction = new FrictionReporter({
  skill: 'telnyx-webrtc-javascript',
  team: 'webrtc'
});

// Report friction
await friction.report({
  type: 'parameter',
  severity: 'major',
  message: 'API expects "certificate" but docs say "cert"',
  context: {
    endpoint: 'POST /v2/mobile_push_credentials',
    attempted_param: 'cert',
    correct_param: 'certificate'
  }
});
```

---

## Output Modes

The SDK supports four output modes:

### `auto` (default)

Automatically chooses where to send reports:
- **With API key** → `remote` (sends to Telnyx backend)
- **Without API key** → `local` (saves YAML files)

```javascript
const friction = new FrictionReporter({
  skill: 'my-skill',
  team: 'webrtc'
  // output: 'auto' (default)
});
```

### `local`

Saves friction reports as YAML files to `~/.openclaw/friction-logs/`

**Use for:**
- Local development/testing
- Offline operation
- Community skills without Telnyx account

```javascript
const friction = new FrictionReporter({
  skill: 'my-skill',
  team: 'webrtc',
  output: 'local',
  localDir: '/custom/path'  // Optional
});

await friction.report({
  type: 'api',
  severity: 'major',
  message: 'API returned 500'
});
// Saved: ~/.openclaw/friction-logs/friction-2026-03-06T18-30-00-000Z.yaml
```

**Helper methods:**
```javascript
// List local logs (newest first)
const logs = friction.listLocalLogs();

// Read a specific log
const report = friction.readLocalLog(logs[0]);
console.log(report);
```

### `remote`

Sends reports to Telnyx backend API (`https://api.telnyx.com/v2/friction`)

**Use for:**
- Production deployments
- Real-time team notifications
- Centralized analytics

```javascript
const friction = new FrictionReporter({
  skill: 'my-skill',
  team: 'webrtc',
  output: 'remote',
  apiKey: process.env.TELNYX_API_KEY  // Required
});

await friction.report({
  type: 'docs',
  severity: 'blocker',
  message: 'No example for WebRTC setup'
});
// Sent to backend (async, fire-and-forget)
```

### `both`

Saves locally **and** sends to backend

**Use for:**
- Redundancy (local backup + remote analytics)
- Debugging (local inspection + team notifications)
- Transition from local to remote

```javascript
const friction = new FrictionReporter({
  skill: 'my-skill',
  team: 'webrtc',
  output: 'both',
  apiKey: process.env.TELNYX_API_KEY
});

await friction.report({
  type: 'auth',
  severity: 'major',
  message: 'API key format unclear in docs'
});
// ✅ Saved: ~/.openclaw/friction-logs/friction-*.yaml
// ✅ Sent: https://api.telnyx.com/v2/friction
```

**Behavior:**
- Local save is **synchronous** (blocks until written)
- Remote send is **asynchronous** (fire-and-forget)
- If remote fails, local file is already saved

---

## Configuration

```javascript
const friction = new FrictionReporter({
  // Required
  skill: 'string',           // Skill identifier
  team: 'string',            // Product team
  
  // Optional
  language: 'javascript',    // SDK language (default: 'javascript')
  apiKey: 'KEY...',          // API key (default: process.env.TELNYX_API_KEY)
  output: 'auto',            // 'auto', 'local', 'remote', 'both' (default: 'auto')
  localDir: '/path/to/logs'  // Local dir (default: ~/.openclaw/friction-logs)
});
```

### Valid Teams

`webrtc`, `messaging`, `voice`, `numbers`, `ai`, `fax`, `iot`, `default`

---

## When to Report Friction

### ✅ Report When:

**Parameter Mismatch**
```javascript
// Documentation says "cert" but API expects "certificate"
friction.report({
  type: 'parameter',
  severity: 'major',
  message: 'Parameter name mismatch between docs and API',
  context: {
    expected_param: 'cert',
    actual_param: 'certificate',
    doc_url: 'https://developers.telnyx.com/...'
  }
});
```

**API Behavior Differs from Docs**
```javascript
// API returns 500 but docs say 200
friction.report({
  type: 'api',
  severity: 'blocker',
  message: 'API returns 500 for valid request',
  context: {
    endpoint: 'POST /v2/messages',
    expected_status: 200,
    actual_status: 500
  }
});
```

**Missing Documentation**
```javascript
// No example for critical operation
friction.report({
  type: 'docs',
  severity: 'major',
  message: 'No example for WebRTC mobile push setup',
  context: {
    doc_url: 'https://developers.telnyx.com/...',
    missing: 'iOS push credential example'
  }
});
```

**Authentication Issues**
```javascript
// API key format unclear
friction.report({
  type: 'auth',
  severity: 'minor',
  message: 'API key format not documented',
  context: {
    doc_url: 'https://developers.telnyx.com/docs/api/auth'
  }
});
```

### ❌ Don't Report:

- User input errors (invalid phone numbers, etc.)
- Expected errors (404 when checking existence)
- Network timeouts (transient issues)
- Your own code bugs

---

## Report Structure

```javascript
friction.report({
  // Classification (required)
  type: 'parameter' | 'api' | 'docs' | 'auth',
  severity: 'blocker' | 'major' | 'minor',
  message: 'string',  // Human-readable description
  
  // Additional context (optional but recommended)
  context: {
    endpoint: 'string',           // API endpoint
    error_code: 'string',         // HTTP status or error code
    doc_url: 'string',            // Link to relevant docs
    attempted_param: 'string',    // What you tried
    correct_param: 'string',      // What worked
    retry_count: number,          // Number of retries
    workaround_found: boolean,    // Did you find a fix?
    workaround: 'string',         // How to work around
    time_spent_seconds: number    // Debug time
  }
});
```

### Severity Guidelines

| Severity | When to Use | Example |
|----------|-------------|---------|
| `blocker` | Cannot complete task, no workaround | Parameter completely undocumented |
| `major` | Requires significant workaround | Name mismatch, trial-and-error needed |
| `minor` | Confusing but resolvable | Typo in docs, inconsistent naming |

---

## Context Recommendations

**Always include:**
- `endpoint` - API endpoint affected
- `doc_url` - Link to relevant documentation
- Error details (`error_code`, error message)

**When applicable:**
- `attempted_param` / `correct_param` - For parameter issues
- `retry_count` - If you retried
- `workaround_found` / `workaround` - If you found a fix
- `time_spent_seconds` - How long you spent debugging

**Never include:**
- API keys, tokens, or secrets
- Customer PII (emails, phone numbers)
- Large payloads (keep context < 1KB)

---

## Examples

### Example 1: Parameter Mismatch

```javascript
const { FrictionReporter } = require('@telnyx/friction-sdk');

const friction = new FrictionReporter({
  skill: 'telnyx-webrtc-javascript',
  team: 'webrtc'
});

// Trying to create push credential with documented parameter
try {
  await telnyx.mobilePushCredentials.create({
    alias: 'MyApp',
    cert: '...'  // From docs
  });
} catch (error) {
  // Report the mismatch
  await friction.report({
    type: 'parameter',
    severity: 'major',
    message: 'Documentation uses "cert" but API expects "certificate"',
    context: {
      endpoint: 'POST /v2/mobile_push_credentials',
      attempted_param: 'cert',
      correct_param: 'certificate',
      error_code: '422',
      doc_url: 'https://developers.telnyx.com/docs/api/v2/webrtc/mobile-push-credentials'
    }
  });
  
  // Retry with correct parameter
  await telnyx.mobilePushCredentials.create({
    alias: 'MyApp',
    certificate: '...'  // Actual parameter
  });
}
```

### Example 2: API Error

```javascript
const friction = new FrictionReporter({
  skill: 'telnyx-messaging-python',
  team: 'messaging'
});

try {
  await telnyx.messages.create({
    to: '+1234567890',
    from: '+0987654321',
    text: 'Hello'
  });
} catch (error) {
  if (error.status === 500) {
    // Report unexpected server error
    await friction.report({
      type: 'api',
      severity: 'blocker',
      message: 'API returns 500 for valid message request',
      context: {
        endpoint: 'POST /v2/messages',
        error_code: '500',
        retry_count: 3
      }
    });
  }
  throw error;
}
```

### Example 3: Missing Documentation

```javascript
const friction = new FrictionReporter({
  skill: 'telnyx-voice-javascript',
  team: 'voice'
});

// After spending 10 minutes looking for examples
await friction.report({
  type: 'docs',
  severity: 'major',
  message: 'No example for call forwarding with SIP headers',
  context: {
    doc_url: 'https://developers.telnyx.com/docs/api/v2/call-control',
    missing: 'SIP header forwarding example',
    time_spent_seconds: 600
  }
});
```

---

## Best Practices

### 1. Report Once Per Issue

```javascript
// ❌ Bad: Reports on every retry
for (let i = 0; i < 3; i++) {
  try {
    await api.call();
  } catch (error) {
    await friction.report({ ... });  // Reported 3 times!
  }
}

// ✅ Good: Report once, then retry
let reported = false;
for (let i = 0; i < 3; i++) {
  try {
    await api.call();
    break;
  } catch (error) {
    if (!reported) {
      await friction.report({ ... });
      reported = true;
    }
  }
}
```

### 2. Be Specific

```javascript
// ❌ Bad: Vague
friction.report({
  type: 'parameter',
  severity: 'major',
  message: 'Parameter error'
});

// ✅ Good: Specific
friction.report({
  type: 'parameter',
  severity: 'major',
  message: 'API expects "certificate" but docs say "cert"',
  context: {
    attempted_param: 'cert',
    correct_param: 'certificate',
    doc_url: 'https://...'
  }
});
```

### 3. Use Correct Severity

```javascript
// ❌ Bad: Everything is "blocker"
friction.report({
  severity: 'blocker',
  message: 'Typo in docs'  // Not actually blocking
});

// ✅ Good: Appropriate severity
friction.report({
  severity: 'minor',
  message: 'Typo in docs: "recieve" should be "receive"'
});
```

---

## OpenTelemetry Integration

The SDK automatically includes trace context in reports:

```javascript
{
  "trace_id": "abc123...",  // W3C trace ID (32 hex chars)
  "span_id": "def456...",   // Span ID (16 hex chars)
  // ... rest of report
}
```

**Trace propagation:**
- Uses active OTel span if available
- Generates random trace ID if no span
- Includes W3C `traceparent` header in API requests

---

## Graceful Degradation

The SDK never blocks execution:

- **No API key?** Falls back to local mode
- **Network error?** Logs error, continues
- **Validation error?** Logs warning, continues
- **Remote send fails in `both` mode?** Local file already saved

---

## FAQ

**Q: When should I report friction?**  
A: When APIs don't match docs, errors are unclear, or examples are missing.

**Q: What if I don't have a Telnyx API key?**  
A: SDK defaults to `local` mode - reports saved to YAML files.

**Q: How often can I report?**  
A: Report real issues, not every retry. Rate limit: 100 reports/hour/account.

**Q: Can I use this in community skills?**  
A: Yes! Works in local mode without API key.

**Q: What happens if reporting fails?**  
A: Errors are logged but never thrown. Your code continues normally.

---

## Support

- **GitHub Issues**: https://github.com/team-telnyx/aifde-friction-sdk/issues
- **Documentation**: https://developers.telnyx.com/docs/ai/friction-reporting

---

## License

MIT
