// Edge Runtime test - better CORS handling
export const config = {
  runtime: 'edge',
}

export default async function handler(request) {
  console.log('Edge function called:', request.method, request.url);

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  // Main response
  return new Response(JSON.stringify({
    message: 'Edge function working!',
    timestamp: new Date().toISOString(),
    method: request.method,
    origin: request.headers.get('origin'),
  }), {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}