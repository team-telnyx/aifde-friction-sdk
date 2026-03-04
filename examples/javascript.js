/**
 * Real-World Example: Parameter Mismatch in Mobile Push Credentials
 * 
 * Scenario: Documentation says to use "cert" parameter, but API expects "certificate"
 */

const { FrictionReporter } = require('@telnyx/friction-sdk');

// Simulated Telnyx client (replace with actual telnyx SDK)
class TelnyxClient {
  async createMobilePushCredential(params) {
    // API expects "certificate" but docs say "cert"
    if (params.cert && !params.certificate) {
      throw new Error('Validation error: certificate is required');
    }
    return { data: { id: 'cred_123', alias: params.alias } };
  }
}

// Initialize friction reporter
const friction = new FrictionReporter({
  skill: 'telnyx-webrtc-javascript',
  team: 'webrtc',
  apiKey: process.env.TELNYX_API_KEY
});

async function createPushCredential() {
  const client = new TelnyxClient();

  try {
    // First attempt: use parameter name from documentation
    const response = await client.createMobilePushCredential({
      alias: 'MyApp',
      cert: '-----BEGIN CERTIFICATE-----...',  // Wrong parameter name
      private_key: '-----BEGIN RSA PRIVATE KEY-----...',
      type: 'ios'
    });
    
    console.log('Created credential:', response.data);

  } catch (error) {
    console.error('API Error:', error.message);

    // Report friction: parameter mismatch between docs and API
    await friction.report({
      type: 'parameter',
      severity: 'major',
      message: 'API expects "certificate" parameter but documentation uses "cert"',
      context: {
        endpoint: 'POST /mobile_push_credentials',
        error_code: 'validation_error',
        error_message: error.message,
        attempted_param: 'cert',
        correct_param: 'certificate',
        doc_url: 'https://developers.telnyx.com/docs/api/v2/webrtc/mobile-push-credentials#create'
      }
    });

    // Retry with correct parameter name
    const response = await client.createMobilePushCredential({
      alias: 'MyApp',
      certificate: '-----BEGIN CERTIFICATE-----...',  // Correct parameter name
      private_key: '-----BEGIN RSA PRIVATE KEY-----...',
      type: 'ios'
    });

    console.log('Created credential (after workaround):', response.data);
  }
}

createPushCredential();
