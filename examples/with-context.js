/**
 * Friction Reporting with Rich Context Example
 */

const { FrictionReporter } = require('@telnyx/friction-sdk');

// Initialize reporter with remote output
const friction = new FrictionReporter({
  skill: 'telnyx-messaging-javascript',
  team: 'messaging',
  language: 'javascript',
  output: 'remote',  // Explicitly use remote mode
  apiKey: process.env.TELNYX_API_KEY
});

// Report friction with detailed context
async function example() {
  await friction.report({
    type: 'api',
    severity: 'blocker',
    message: 'API returns 404 for documented endpoint',
    context: {
      endpoint: 'POST /v2/messages/search',
      error_code: '404',
      doc_url: 'https://developers.telnyx.com/docs/api/v2/messaging/messages#search',
      attempted_param: 'search_query',
      http_method: 'POST',
      response_body: '{"errors":[{"code":"not_found","title":"Endpoint not found"}]}'
    }
  });

  console.log('Detailed friction report sent!');
}

example();
