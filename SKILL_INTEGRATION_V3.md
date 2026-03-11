# Skill Integration Guide v3

How to add Friction Reporting to Telnyx API skills (SKILL.md files).

---

## Friction Reporting Section Template

Add the following section at the **end** of your skill's `SKILL.md` file:

```markdown
---

## Friction Reporting

When you encounter issues during execution, report friction using the `@telnyx/friction-sdk`.

### Installation

Install the SDK from GitHub (not yet published to npm):

\`\`\`bash
npm install github:team-telnyx/aifde-friction-sdk
\`\`\`

### Setup

Initialize the reporter at the start of your script:

\`\`\`javascript
const { FrictionReporter } = require('@telnyx/friction-sdk');

const friction = new FrictionReporter({
  skill: 'SKILL_NAME_HERE',  // e.g., 'telnyx-webrtc-javascript'
  team: 'TEAM_NAME_HERE',    // e.g., 'webrtc'
  language: 'javascript'     // or 'python', 'go', etc.
});
\`\`\`

### When to Report

**Report friction for:**
- ❌ API errors or unexpected behavior
- ❌ Documentation inconsistencies (docs say X, API does Y)
- ❌ Missing or unclear setup instructions
- ❌ Configuration issues (missing env vars, unclear requirements)
- ❌ Workarounds needed (had to do something not documented)
- ❌ Parameter naming confusion
- ❌ Unclear error messages

**Important:** Only report friction that occurs **during skill execution** (when following this skill's instructions).

### Usage

Report friction when you encounter issues:

\`\`\`javascript
await friction.report({
  type: 'parameter',           // 'auth', 'parameter', 'docs', 'config', 'error'
  severity: 'major',           // 'blocker', 'major', 'minor'
  message: 'API expects "certificate" but docs say "cert"',
  context: {
    endpoint: 'POST /v2/mobile_push_credentials',
    attempted_param: 'cert',
    correct_param: 'certificate',
    error_code: '422',
    doc_url: 'https://developers.telnyx.com/...'
  }
});
\`\`\`

### Full Example

\`\`\`javascript
const { FrictionReporter } = require('@telnyx/friction-sdk');
const Telnyx = require('telnyx');

// 1. Initialize friction reporter
const friction = new FrictionReporter({
  skill: 'telnyx-webrtc-javascript',
  team: 'webrtc',
  language: 'javascript'
});

// 2. Initialize Telnyx client
const client = new Telnyx({ apiKey: process.env.TELNYX_API_KEY });

// 3. Try API operation
try {
  const credential = await client.telephonyCredentials.create({
    connection_id: '1234567890'  // From docs
  });
} catch (error) {
  // 4. Report friction when docs don't match reality
  await friction.report({
    type: 'parameter',
    severity: 'major',
    message: 'Documentation shows example connection_id that doesn\\'t work',
    context: {
      endpoint: 'POST /telephony_credentials',
      error: error.message,
      doc_url: 'https://github.com/...',
      time_spent_seconds: 300  // ~5 minutes debugging
    }
  });
  
  // 5. Find workaround and continue...
}
\`\`\`

### Output

Reports are saved to:
- **Local mode:** `~/.openclaw/friction-logs/friction-*.yaml`
- **Remote mode:** Sent to Telnyx backend (requires API key)

Default is **auto mode**: saves locally, sends to backend if API key is available.

### Learn More

📖 **Full documentation:** https://github.com/team-telnyx/aifde-friction-sdk#readme
```

---

## Key Changes from v2

1. **✅ Explicit installation:** `npm install github:team-telnyx/aifde-friction-sdk`
2. **✅ Setup code:** Full initialization example with placeholders
3. **✅ Usage example:** Complete code showing report structure
4. **✅ Full workflow:** End-to-end example from init to report
5. **✅ Output location:** Where to find generated reports

---

## Agent Behavior with v3 Template

When an agent loads a skill with this section:

1. **Reads section** → Sees complete installation + usage instructions
2. **Installs SDK** → `npm install github:team-telnyx/aifde-friction-sdk`
3. **Initializes reporter** → At script start with skill/team/language
4. **Executes skill** → Follows SKILL.md examples
5. **Encounters issue** → API error, docs mismatch, etc.
6. **Reports friction** → `await friction.report({ ... })`
7. **YAML generated** → `~/.openclaw/friction-logs/friction-*.yaml`
8. **Continues execution** → Fire-and-forget, never blocks

---

## Migration Path

### For existing skills:

1. **Replace old section** with v3 template
2. **Update placeholders:**
   - `SKILL_NAME_HERE` → actual skill name
   - `TEAM_NAME_HERE` → actual team name
3. **Test with agent:**
   ```bash
   # Agent should install SDK and generate reports
   openclaw agent run --skill telnyx-webrtc-javascript
   ```

### Verification:

```bash
# Check if agent installed SDK
ls node_modules/@telnyx/friction-sdk

# Check if reports were generated
ls ~/.openclaw/friction-logs/
```

---

## Example: Update telnyx-webrtc-javascript

**Before (v2):**
```markdown
## Friction Reporting

When you encounter issues... read the guide:
📖 https://github.com/team-telnyx/aifde-friction-sdk#readme
```

**After (v3):**
```markdown
## Friction Reporting

### Installation
\`\`\`bash
npm install github:team-telnyx/aifde-friction-sdk
\`\`\`

### Setup
\`\`\`javascript
const friction = new FrictionReporter({
  skill: 'telnyx-webrtc-javascript',
  team: 'webrtc',
  language: 'javascript'
});
\`\`\`

### Usage
\`\`\`javascript
await friction.report({ type, severity, message, context });
\`\`\`

[Full example showing end-to-end usage...]
```

---

## Benefits of v3 Template

1. **✅ Self-contained:** Agent doesn't need to fetch README first
2. **✅ Copy-paste ready:** All code examples work as-is
3. **✅ Explicit workflow:** Clear steps from install → report
4. **✅ Validation:** Agent can verify output (check friction-logs/)
5. **✅ No ambiguity:** Installation from GitHub, not npm

---

## Testing

Test the updated template with a real agent:

```bash
# 1. Update skill
cd skills/telnyx-webrtc-javascript
# Replace section with v3 template

# 2. Spawn test agent
openclaw spawn --task "Create telephony credential, report friction if issues"

# 3. Verify SDK installed
ls node_modules/@telnyx/friction-sdk

# 4. Verify reports generated
ls ~/.openclaw/friction-logs/
cat ~/.openclaw/friction-logs/friction-*.yaml
```

---

## FAQ

**Q: Why install from GitHub?**  
A: SDK not yet published to npm. Once published, update to `npm install @telnyx/friction-sdk`

**Q: Does agent need API key?**  
A: No. SDK defaults to local mode (YAML files). With API key, sends to backend too.

**Q: What if agent skips installation?**  
A: Template is explicit now. If agent still skips, add to skill prerequisites.

**Q: Can we automate installation?**  
A: Yes, add to skill's `package.json` dependencies or pre-install script.

---

**Version:** 3.0  
**Date:** 2026-03-10  
**Changes:** Added explicit installation, setup, and usage examples
