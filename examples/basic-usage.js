/**
 * Basic Friction Reporting Example
 */

const { FrictionReporter } = require('@telnyx/friction-sdk');

// Initialize reporter
const friction = new FrictionReporter({
  skill: 'telnyx-webrtc-javascript',
  team: 'webrtc',
  apiKey: process.env.TELNYX_API_KEY
});

// Report a simple friction
async function example() {
  await friction.report({
    type: 'parameter',
    severity: 'major',
    message: 'API expects "certificate" but documentation says "cert"'
  });

  console.log('Friction reported!');
}

example();
