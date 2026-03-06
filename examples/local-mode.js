/**
 * Local Mode Example
 * 
 * Reports are saved as YAML files to ~/.openclaw/friction-logs/
 * Use for development, testing, or offline operation
 */

const { FrictionReporter } = require('@telnyx/friction-sdk');

// Initialize reporter in local mode
const friction = new FrictionReporter({
  skill: 'my-skill',
  team: 'webrtc',
  output: 'local',
  localDir: '/tmp/friction-logs'  // Optional: custom directory
});

async function example() {
  // Report friction
  await friction.report({
    type: 'docs',
    severity: 'major',
    message: 'No example for WebRTC mobile push setup',
    context: {
      doc_url: 'https://developers.telnyx.com/docs/api/v2/webrtc/mobile-push-credentials',
      missing: 'iOS push credential example',
      time_spent_seconds: 300
    }
  });

  console.log('Friction report saved locally!');

  // List all local logs
  const logs = friction.listLocalLogs();
  console.log(`\nFound ${logs.length} local logs:`);
  logs.slice(0, 3).forEach(log => console.log(`  - ${log}`));

  // Read the most recent log
  if (logs.length > 0) {
    const recent = friction.readLocalLog(logs[0]);
    console.log('\nMost recent report:');
    console.log(JSON.stringify(recent, null, 2));
  }
}

example();
