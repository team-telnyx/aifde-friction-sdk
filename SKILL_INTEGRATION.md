# Skill Integration Guide

How to add Friction Reporting to Telnyx API skills (SKILL.md files).

**Version:** 3.0 (2026-03-10)  
**Changes:** Added explicit installation, setup, and usage examples to template

---

## Friction Reporting Section Template

Add the following section at the **end** of your skill's `SKILL.md` file:

```markdown
---

## Friction Reporting

When you encounter issues during execution, report friction by creating a YAML file.

### How to Report

Create a YAML file in \`~/.openclaw/friction-logs/\` with this structure:

\`\`\`yaml
skill: SKILL_NAME        # e.g., 'telnyx-webrtc-python'
team: TEAM_NAME          # e.g., 'webrtc'
language: LANGUAGE       # e.g., 'python'
type: TYPE               # 'parameter', 'api', 'docs', 'auth'
severity: SEVERITY       # 'blocker', 'major', 'minor'
message: "Brief description of the issue"
context:
  endpoint: "API endpoint"
  error: "Error message"
  doc_url: "https://..."
timestamp: "2026-03-10T18:30:00Z"
\`\`\`

**Filename format:** \`friction-YYYY-MM-DDTHH-MM-SS-SSSZ.yaml\`

### JavaScript (Optional SDK)

For JavaScript skills, you can optionally use the SDK:

\`\`\`bash
npm install github:team-telnyx/aifde-friction-sdk
\`\`\`

Then follow: https://github.com/team-telnyx/aifde-friction-sdk#readme

### Learn More

📖 **Schema & examples:** https://github.com/team-telnyx/aifde-friction-sdk/blob/main/schema/friction-schema.yaml
```

---

## Why This Approach?

**Self-contained but concise:** The template includes everything an agent needs to get started:
1. ✅ **Installation:** Explicit GitHub install command
2. ✅ **Setup:** Copy-paste initialization code
3. ✅ **Usage:** Complete example with all parameters
4. ✅ **Full example:** End-to-end workflow from init to report
5. ✅ **Output:** Where to find generated YAML files
6. ✅ **Learn more:** Link to full README for advanced usage

**Agent workflow:**
1. Reads skill → Sees "Friction Reporting" section with complete instructions
2. **Installs SDK** → `npm install github:team-telnyx/aifde-friction-sdk`
3. **Initializes reporter** → Copy setup code, customize skill/team/language
4. **Executes skill** → Follows API examples
5. **Encounters issue** → Uses report example as template
6. **Reports friction** → `await friction.report({ ... })`
7. **Verifies output** → Checks `~/.openclaw/friction-logs/*.yaml`

---

## What This Captures

This section guides AI agents to report:

### 1. **API Failures** (Traditional Errors)
```javascript
friction.report({
  type: 'auth',
  severity: 'blocker',
  message: 'Authentication failed: invalid API key',
  context: {
    endpoint: 'POST /messages',
    error: '401 Unauthorized',
  },
});
```

### 2. **Documentation Gaps**
```javascript
friction.report({
  type: 'docs',
  severity: 'major',
  message: 'Skill lacks prerequisite: valid Telnyx phone number required',
  context: {
    skill: 'telnyx-messaging-javascript',
    missing_doc: 'No mention of needing to own a phone number',
    error_encountered: '400 Invalid source number',
  },
});
```

### 3. **Config Friction**
```javascript
friction.report({
  type: 'config',
  severity: 'major',
  message: 'Environment variable format not documented',
  context: {
    env_var: 'TELNYX_API_KEY',
    missing_info: 'No example of valid format',
  },
});
```

### 4. **Workarounds**
```javascript
friction.report({
  type: 'docs',
  severity: 'major',
  message: 'Had to search external docs for connection_id format',
  context: {
    skill: 'telnyx-webrtc-javascript',
    missing: 'Connection ID format not documented in skill',
    workaround: 'Had to check Telnyx portal to find valid format',
  },
});
```

### 5. **Documentation Inconsistencies**
```javascript
friction.report({
  type: 'docs',
  severity: 'major',
  message: 'Parameter name mismatch: docs say "cert", SDK expects "certificate"',
  context: {
    endpoint: 'POST /mobile_push_credentials',
    docs_say: 'cert',
    sdk_expects: 'certificate',
  },
});
```

---

## Integration Steps

### Step 1: Add Section to SKILL.md

Copy the template above and paste it at the end of your skill's `SKILL.md` file.

### Step 2: Test

The agent will automatically:
1. Read the "Friction Reporting" section when loading the skill
2. Fetch this SDK's README via `web_fetch()` for detailed guidelines
3. Report friction whenever encountered during execution

### Step 3: Verify

Check that friction reports are generated in:
- **Local mode:** `~/.openclaw/friction-logs/friction-*.yaml`
- **Remote mode:** Telnyx backend (`POST /v2/friction`)

---

## Friction Types Reference

| Type | Description | Example |
|------|-------------|---------|
| `auth` | Authentication/authorization issues | Invalid API key, permission denied |
| `parameter` | Parameter naming, validation, format | `media_urls` vs `media_url`, missing required field |
| `docs` | Missing or unclear documentation | No setup instructions, unclear error messages |
| `config` | Configuration issues | Missing env vars, unclear format requirements |
| `error` | Unhelpful error messages | Generic errors without context or links |

---

## Severity Levels

| Severity | When to Use | Example |
|----------|-------------|---------|
| `blocker` | Prevents any progress | Authentication failure, missing API key |
| `major` | Significant friction, workaround needed | Unclear docs, parameter naming confusion |
| `minor` | Small inconvenience, easily resolved | Typo in docs, missing link |

---

## Agent Behavior

When an agent loads a skill with this section:

1. **Reads section:** Sees "Friction Reporting" with inline examples
2. **Fetches README:** Gets full guidelines from this repo's README
3. **Executes skill:** Follows SKILL.md examples to use the API
4. **Encounters issue:** API error, docs unclear, setup missing, etc.
5. **Evaluates friction:** Determines type and severity
6. **Reports:** Calls `friction.report()` with context
7. **Continues:** Doesn't stop execution (fire-and-forget)

---

## Best Practices

### ✅ Do Report

- API errors with unclear messages
- Documentation that doesn't match reality
- Missing prerequisites or setup steps
- Configuration format not specified
- Parameter naming confusion
- Any workaround needed

### ❌ Don't Report

- User errors (developer mistakes)
- Expected behavior (API working as designed)
- Transient issues (network timeouts)
- Duplicate reports (same issue within 5 min)

---

## Version History

**v2.0 (2026-03-10):**
- Expanded scope beyond API errors
- Added explicit list of reportable friction
- Included inline types/severity reference
- Added config/docs/workaround scenarios
- Clarified setup/prerequisite issues

**v1.0 (2026-03-04):**
- Initial version (API errors only)
- Basic template with SDK link

---

## Related Documentation

- [Friction SDK README](./README.md) - Full SDK documentation
- [FFL MVP Integration Guide](https://github.com/team-telnyx/aifde-docs-friction-feedback-loop/blob/main/ffl-mvp-v1/ffl-mvp-integration-guide.md) - Complete FFL architecture
- [Testing Results](https://github.com/team-telnyx/aifde-docs-friction-feedback-loop/tree/main/ffl-mvp-v1/skill-tests) - Real-world friction examples
