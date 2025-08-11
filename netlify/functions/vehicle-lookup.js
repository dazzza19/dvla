// netlify/functions/vehicle-lookup.js
const fetch = require('node-fetch');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    const { registration } = JSON.parse(event.body);
    
    if (!registration) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Registration number is required' })
      };
    }

    // Validate API key is set
    if (!process.env.DVLA_API_KEY) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'DVLA API key not configured',
          details: 'Please set DVLA_API_KEY in Netlify environment variables'
        })
      };
    }

    // Get authentication token
    const authResponse = await fetch('https://auth.driver-vehicle-licensing.api.gov.uk/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'x-api-key': process.env.DVLA_API_KEY
      },
      body: 'grant_type=client_credentials'
    });
    
    if (!authResponse.ok) {
      const authError = await authResponse.text();
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Authentication failed',
          details: 'Secure APIs require onboarding. Please complete the onboarding process with DVLA.',
          authError: authError,
          authStatus: authResponse.status
        })
      };
    }
    
    const authData = await authResponse.json();
    
    // Call vehicle enquiry API
    const vehicleResponse = await fetch('https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authData.access_token}`,
        'x-api-key': process.env.DVLA_API_KEY
      },
      body: JSON.stringify({ registrationNumber: registration })
    });
    
    if (vehicleResponse.ok) {
      const vehicleData = await vehicleResponse.json();
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(vehicleData)
      };
    } else {
      const errorData = await vehicleResponse.text();
      return {
        statusCode: vehicleResponse.status,
        headers,
        body: JSON.stringify({ 
          error: `Vehicle enquiry failed: ${vehicleResponse.status}`,
          details: errorData
        })
      };
    }
  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: error.message,
        help: 'Secure APIs require onboarding. Please contact DVLA API support at DVLAAPIAccess@dvla.gov.uk to complete the onboarding process.'
      })
    };
  }
};
