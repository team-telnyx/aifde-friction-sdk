# Friction Reporting for AI Agents

The **@telnyx/friction-sdk** enables AI agents to automatically report friction encountered when using Telnyx APIs. This helps identify documentation mismatches, parameter errors, and API behavior issues in real-time.

## Overview

**What is friction reporting?**

Friction reporting allows AI agents to notify Telnyx when they encounter issues like:
- Parameter naming mismatches between documentation and APIs
- Unexpected API behavior
- Missing or unclear documentation
- Authentication problems

Reports are sent to Telnyx's observability infrastructure for analysis and resolution.

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
  team: 'webrtc',
  apiKey: process.env.TELNYX_API_KEY  // Optional - defaults to env var
});

// Report friction
await friction.report({
  type: 'parameter',
  severity: 'major',
  message: 'API expects "certificate" but docs say "cert"',
  context: {
    endpoint: 'POST /mobile_push_credentials',
    attempted_param: 'cert',
    correct_param: 'certificate'
  }
});
```

## When to Report

### Parameter Mismatch (`type: 'parameter'`)

Report when API parameters don't match documentation:

**Examples:**
- Documentation says `cert` but API expects `certificate`
- API accepts camelCase but docs show snake_case
- Required parameter not documented
- Optional parameter documented as required

**Severity Guidelines:**
- **blocker**: Parameter completely missing from docs, no way to discover it
- **major**: Name mismatch requiring trial-and-error or workaround
- **minor**: Inconsistent naming but discoverable from error messages

### API Behavior Issues (`type: 'api'`)

Report when API behavior differs from documentation:

**Examples:**
- Endpoint returns different response format than documented
- HTTP status codes don't match docs
- Endpoint returns `null` when docs say it returns an object
- Rate limiting not documented

**Severity Guidelines:**
- **blocker**: API completely unusable or returns errors for valid input
- **major**: Requires significant workaround or multiple retries
- **minor**: Works but differs from documented behavior

### Documentation Issues (`type: 'docs'`)

Report when documentation is missing or unclear:

**Examples:**
- No examples provided for complex operations
- Error codes not explained
- Missing field descriptions
- Outdated documentation

**Severity Guidelines:**
- **blocker**: Critical operation has no documentation
- **major**: Documentation exists but is misleading or incomplete
- **minor**: Minor typos or formatting issues

### Authentication Issues (`type: 'auth'`)

Report when authentication doesn't work as documented:

**Examples:**
- Valid API key rejected
- Scopes/permissions not documented
- Token refresh flow unclear
- Authentication headers format mismatch

**Severity Guidelines:**
- **blocker**: Cannot authenticate at all with documented method
- **major**: Authentication works but requires undocumented steps
- **minor**: Minor confusion about auth setup

## Severity Guidelines

| Severity | Definition | Example |
|----------|------------|---------|
| **blocker** | Completely blocks execution, no workaround possible | Endpoint returns 404, authentication always fails |
| **major** | Requires workaround or multiple retries | Parameter mismatch, unclear error messages |
| **minor** | Confusing but resolvable with effort | Typo in docs, inconsistent naming |

## Context Recommendations

Always include relevant context to help diagnose the issue:

**Recommended fields:**
- `endpoint` - API endpoint (e.g., `POST /v2/credentials`)
- `error_code` - HTTP status or error code
- `doc_url` - Link to relevant documentation
- `attempted_param` - Parameter name you tried
- `correct_param` - Parameter name that worked

**Example with rich context:**
```javascript
await friction.report({
  type: 'parameter',
  severity: 'major',
  message: 'Mobile push credential creation fails with documented parameter names',
  context: {
    endpoint: 'POST /v2/mobile_push_credentials',
    error_code: '422',
    error_message: 'Validation failed: certificate is required',
    attempted_param: 'cert',
    correct_param: 'certificate',
    doc_url: 'https://developers.telnyx.com/docs/api/v2/webrtc/mobile-push-credentials'
  }
});
```

**Avoid including:**
- API keys, tokens, or secrets
- Customer PII (emails, phone numbers, addresses)
- Large payloads (keep context < 1KB)

## Common Scenarios

### Scenario 1: Parameter Name Mismatch

```javascript
const { FrictionReporter } = require('@telnyx/friction-sdk');
const Telnyx = require('telnyx');

const client = new Telnyx({ apiKey: process.env.TELNYX_API_KEY });
const friction = new FrictionReporter({
  skill: 'telnyx-webrtc-javascript',
  team: 'webrtc'
});

async function createCredential() {
  try {
    // Try with parameter name from docs
    await client.mobilePushCredentials.create({
      alias: 'MyApp',
      cert: '...'  // Docs say "cert"
    });
  } catch (error) {
    // Report the mismatch
    await friction.report({
      type: 'parameter',
      severity: 'major',
      message: 'Documentation uses "cert" but API expects "certificate"',
      context: {
        endpoint: 'POST /mobile_push_credentials',
        attempted_param: 'cert',
        correct_param: 'certificate',
        error_code: error.code
      }
    });

    // Retry with correct param
    return client.mobilePushCredentials.create({
      alias: 'MyApp',
      certificate: '...'  // Actual API parameter
    });
  }
}
```

### Scenario 2: Unexpected API Response

```javascript
async function searchMessages(query) {
  try {
    const response = await client.messages.search({ query });
    
    // API returned null but docs say it returns array
    if (response.data === null) {
      await friction.report({
        type: 'api',
        severity: 'major',
        message: 'API returns null instead of empty array as documented',
        context: {
          endpoint: 'GET /v2/messages/search',
          expected_type: 'array',
          actual_type: 'null',
          doc_url: 'https://developers.telnyx.com/docs/api/v2/messaging/messages#search'
        }
      });

      // Workaround: treat null as empty array
      return [];
    }

    return response.data;
  } catch (error) {
    throw error;
  }
}
```

### Scenario 3: Missing Documentation

```javascript
async function updateNumber(numberId, settings) {
  try {
    await client.numbers.update(numberId, settings);
  } catch (error) {
    // Undocumented error code
    if (error.code === 'NUMBER_LOCKED') {
      await friction.report({
        type: 'docs',
        severity: 'major',
        message: 'Error code "NUMBER_LOCKED" not documented',
        context: {
          endpoint: 'PATCH /v2/numbers/:id',
          error_code: 'NUMBER_LOCKED',
          doc_url: 'https://developers.telnyx.com/docs/api/v2/numbers#update'
        }
      });

      // Handle with best guess
      console.log('Number appears to be locked, cannot update');
    }
    throw error;
  }
}
```

## Best Practices

### 1. Report Once Per Issue

Don't report on every retry - report when you first discover the issue:

```javascript
// ❌ Bad: Reports on every retry
for (let i = 0; i < 3; i++) {
  try {
    await api.call();
    break;
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
await friction.report({
  type: 'parameter',
  severity: 'major',
  message: 'Parameter error'
});

// ✅ Good: Specific
await friction.report({
  type: 'parameter',
  severity: 'major',
  message: 'API expects "certificate" but documentation uses "cert"',
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
await friction.report({
  severity: 'blocker',  // Not actually blocking
  message: 'Typo in documentation'
});

// ✅ Good: Appropriate severity
await friction.report({
  severity: 'minor',  // Correctly classified
  message: 'Documentation has typo: "recieve" should be "receive"'
});
```

### 4. Don't Over-Report

Skip reporting for:
- **User errors**: Invalid input from the end user
- **Expected errors**: 404 when checking if resource exists
- **Temporary issues**: Network timeouts, rate limits

```javascript
// ❌ Bad: Reports expected error
try {
  const user = await api.users.get(userId);
} catch (error) {
  if (error.code === 404) {
    await friction.report({ ... });  // Don't report - this is expected!
  }
}

// ✅ Good: Only report unexpected errors
try {
  const user = await api.users.get(userId);
} catch (error) {
  if (error.code === 500) {
    await friction.report({
      type: 'api',
      severity: 'blocker',
      message: 'Internal server error when fetching user',
      context: { error_code: '500' }
    });
  }
}
```

## API Reference

### `FrictionReporter`

#### Constructor

```javascript
new FrictionReporter(options)
```

**Options:**
- `skill` (string, required) - Skill identifier (e.g., `'telnyx-webrtc-javascript'`)
- `team` (string, required) - Product team: `webrtc`, `messaging`, `voice`, `numbers`, `ai`, `fax`, `iot`, `default`
- `language` (string, optional) - SDK language: `javascript`, `python`, `go`, `ruby`, `java`. Default: `'javascript'`
- `apiKey` (string, optional) - Telnyx API key. Defaults to `process.env.TELNYX_API_KEY`
- `endpoint` (string, optional) - Custom API endpoint. Default: `'https://api.telnyx.com/v2/friction'`

#### Methods

##### `report(options)`

Report friction encountered during execution.

```javascript
await reporter.report({
  type: 'parameter' | 'api' | 'docs' | 'auth',
  severity: 'blocker' | 'major' | 'minor',
  message: string,
  context: object  // optional
})
```

**Parameters:**
- `type` (string, required) - Friction category
- `severity` (string, required) - Impact level
- `message` (string, required) - Human-readable description (max 500 chars)
- `context` (object, optional) - Additional context

**Returns:** Promise that resolves when report is sent (fire-and-forget)

**Note:** This method never throws. Errors are logged to console but don't block execution.

## Graceful Degradation

The SDK operates in **graceful degradation mode** when no API key is configured:

```javascript
// No API key provided
const friction = new FrictionReporter({
  skill: 'my-skill',
  team: 'messaging'
  // No apiKey
});

// Reports are logged to console only
await friction.report({
  type: 'parameter',
  severity: 'major',
  message: 'Test friction'
});
// Output: [Friction Report] { "skill": "my-skill", ... }
```

This allows:
- Development/testing without credentials
- Community skills without Telnyx accounts
- Continued execution if API is down

## Rate Limiting

The Telnyx API enforces rate limits:
- **100 reports per hour per account**
- Exceeding this returns `429 Too Many Requests`
- SDK logs the error but continues execution

To avoid hitting limits:
- Don't report on every retry
- Deduplicate similar errors
- Only report genuine friction (not user errors)

## FAQ

### When should I NOT report friction?

Don't report:
- **User errors**: Invalid input from the end user
- **Expected errors**: 404 when checking if a resource exists
- **Temporary issues**: Network timeouts, transient rate limits
- **Development mistakes**: Errors caused by your own code bugs

### How often can I report?

The rate limit is **100 reports per hour per account**. Report real issues, not every retry.

### What if I don't have a Telnyx API key?

The SDK will operate in **console-only mode** - reports are logged locally but not sent to Telnyx.

### Can I use this in community skills?

Yes! If you have a Telnyx API key configured, friction reports help improve the platform for everyone.

### What happens if reporting fails?

Nothing. The SDK uses **fire-and-forget** - errors are logged but never thrown. Your code continues normally.

## Troubleshooting

### SDK not sending reports

**Check:**
1. Is `TELNYX_API_KEY` environment variable set?
2. Is the API key valid? (Test with a Telnyx API call)
3. Network connectivity OK?

**Debug:**
```javascript
const friction = new FrictionReporter({
  skill: 'my-skill',
  team: 'messaging',
  apiKey: process.env.TELNYX_API_KEY
});

// SDK logs if no API key:
// [Friction SDK] No API key configured - friction reports will be logged to console only
```

### `401 Unauthorized`

Your API key is invalid or expired:
1. Verify key at https://portal.telnyx.com
2. Regenerate if needed
3. Update environment variable

### `429 Too Many Requests`

You've hit the rate limit (100 reports/hour):
1. Wait 1 hour
2. Reduce reporting frequency
3. Deduplicate similar errors

## Examples

See the [`examples/`](./examples) directory:
- [`basic-usage.js`](./examples/basic-usage.js) - Simple friction report
- [`with-context.js`](./examples/with-context.js) - Report with rich context
- [`javascript.js`](./examples/javascript.js) - Real-world parameter mismatch scenario

## Support

- **GitHub Issues**: https://github.com/team-telnyx/aifde-friction-sdk/issues
- **Documentation**: https://developers.telnyx.com/docs/ai/friction-reporting
- **Email**: ai-support@telnyx.com

## License

MIT
