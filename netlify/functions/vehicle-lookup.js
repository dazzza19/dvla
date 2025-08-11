const fetch = require('node-fetch');

exports.handler = async (event) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    // Parse the request body
    const { registration } = JSON.parse(event.body);
    
    if (!registration) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Registration number is required' })
      };
    }

    // First, get authentication token from DVLA Authentication API
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
          details: authError 
        })
      };
    }
    
    const authData = await authResponse.json();
    
    // Now make the vehicle enquiry with the access token
    const vehicleResponse = await fetch('https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authData.access_token}`,
        'x-api-key': process.env.DVLA_API_KEY
      },
      body: JSON.stringify({
        registrationNumber: registration
      })
    });
    
    if (vehicleResponse.ok) {
      const vehicleData = await vehicleResponse.json();
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(vehicleData)
      };
    } else if (vehicleResponse.status === 404) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Vehicle not found. Please check the registration number.' })
      };
    } else {
      const errorData = await vehicleResponse.text();
      return {
        statusCode: vehicleResponse.status,
        headers,
        body: JSON.stringify({ 
          error: `DVLA API Error: ${vehicleResponse.status}`,
          details: errorData
        })
      };
    }
  } catch (error) {
    console.error('Error in vehicle lookup:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      })
    };
  }
};