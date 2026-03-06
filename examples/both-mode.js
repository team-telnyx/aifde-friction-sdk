/**
 * Both Mode Example
 * 
 * Reports are saved locally AND sent to Telnyx backend
 * Use for redundancy (local backup + remote analytics)
 */

const { FrictionReporter } = require('@telnyx/friction-sdk');

// Initialize reporter in both mode
const friction = new FrictionReporter({
  skill: 'telnyx-voice-javascript',
  team: 'voice',
  output: 'both',  // Save locally + send to remote
  apiKey: process.env.TELNYX_API_KEY
});

async function example() {
  // Report friction
  await friction.report({
    type: 'auth',
    severity: 'minor',
    message: 'API key format not documented clearly',
    context: {
      doc_url: 'https://developers.telnyx.com/docs/api/auth',
      issue: 'No example showing KEY format vs Bearer token'
    }
  });

  console.log('✅ Report saved locally');
  console.log('✅ Report sent to remote (async)');

  // Local file is already saved (synchronous)
  const logs = friction.listLocalLogs();
  console.log(`\nLocal logs: ${logs.length} files`);

  // Remote send is fire-and-forget (asynchronous)
  // If remote fails, local file is still available
}

example();
