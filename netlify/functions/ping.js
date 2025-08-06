// Simple ping test function for Netlify
exports.handler = async (event, context) => {
  console.log('Netlify ping function called:', event.httpMethod, event.headers.origin);
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Main response
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      ping: 'pong',
      time: Date.now(),
      method: event.httpMethod,
      origin: event.headers.origin || 'none',
      message: 'Netlify function working!'
    })
  };
};