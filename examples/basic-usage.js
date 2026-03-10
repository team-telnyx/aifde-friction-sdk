/**
 * Basic Friction Reporting Example
 */

const { FrictionReporter } = require('@telnyx/friction-sdk');

// Initialize reporter (auto mode - uses remote if API key available, otherwise local)
const friction = new FrictionReporter({
  skill: 'my-skill',
  team: 'webrtc',
  language: 'javascript'
  // output: 'auto' (default)
  // apiKey: process.env.TELNYX_API_KEY (default)
});

// Report friction
async function example() {
  await friction.report({
    type: 'parameter',
    severity: 'major',
    message: 'API expects "certificate" but documentation says "cert"',
    context: {
      endpoint: 'POST /v2/mobile_push_credentials',
      attempted_param: 'cert',
      correct_param: 'certificate'
    }
  });

  console.log('Friction report sent!');
}

example();
