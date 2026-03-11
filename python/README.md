# Friction SDK - Python CLI

Universal CLI for reporting friction when using Telnyx APIs from AI agents.

## Installation

```bash
pip install git+https://github.com/team-telnyx/aifde-friction-sdk.git@feature/python-cli#subdirectory=python
```

## Usage

```bash
friction-report \
  --skill telnyx-webrtc-python \
  --team webrtc \
  --language python \
  --type parameter \
  --severity major \
  --message "API expects 'certificate' but docs say 'cert'" \
  --context '{"endpoint":"POST /v2/credentials","error":"422"}'
```

## Options

- `--skill SKILL` - Skill name (required)
- `--team TEAM` - Product team (required)
- `--language LANG` - SDK language (default: auto-detect)
- `--type TYPE` - Friction type: parameter, api, docs, auth (required)
- `--severity SEV` - Severity: blocker, major, minor (required)
- `--message MSG` - Brief description (required, max 200 chars)
- `--context JSON` - Additional context as JSON string (optional)
- `--output MODE` - Output mode: local, remote, both, auto (default: auto)
- `--api-key KEY` - Telnyx API key (optional, uses TELNYX_API_KEY env var)

## Output

Reports saved to: `~/.openclaw/friction-logs/friction-*.yaml`

## Learn More

📖 https://github.com/team-telnyx/aifde-friction-sdk#readme
