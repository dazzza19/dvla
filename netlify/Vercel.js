// api/lookupVehicle.js (Netlify function)
exports.handler = async (event) => {
  const { registration } = JSON.parse(event.body);
  
  // Use your server-side code to call DVLA API
  const authResponse = await fetch('https://auth.driver-vehicle-licensing.api.gov.uk/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'x-api-key': process.env.DVLA_API_KEY
    },
    body: 'grant_type=client_credentials'
  });
  
  const authData = await authResponse.json();
  
  const vehicleResponse = await fetch('https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authData.access_token}`,
      'x-api-key': process.env.DVLA_API_KEY
    },
    body: JSON.stringify({ registrationNumber: registration })
  });
  
  const vehicleData = await vehicleResponse.json();
  
  return {
    statusCode: 200,
    body: JSON.stringify(vehicleData)
  };
};