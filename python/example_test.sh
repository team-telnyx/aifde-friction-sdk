#!/bin/bash
# Test friction-report CLI

echo "Testing friction-report CLI..."
echo ""

# Test 1: Minimal report
echo "Test 1: Minimal report"
friction-report \
  --skill telnyx-webrtc-javascript \
  --team webrtc \
  --language javascript \
  --type parameter \
  --severity major \
  --message "Documentation example connection_id doesn't work"

echo ""

# Test 2: With context
echo "Test 2: With context"
friction-report \
  --skill telnyx-messaging-python \
  --team messaging \
  --language python \
  --type docs \
  --severity major \
  --message "No example for sending MMS" \
  --context '{"endpoint":"POST /v2/messages","doc_url":"https://developers.telnyx.com/docs/api/v2/messaging"}'

echo ""

# Test 3: Check output files
echo "Test 3: Verify output"
ls -lh ~/.openclaw/friction-logs/friction-*.yaml | tail -2
echo ""
echo "Latest report:"
cat ~/.openclaw/friction-logs/friction-*.yaml | tail -20
