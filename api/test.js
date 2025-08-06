// Simple test endpoint to verify CORS is working

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Max-Age': '86400',
};

export default async function handler(request) {
    console.log('Test endpoint called:', request.method, request.url);
    console.log('Origin:', request.headers.get('origin'));
    
    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
        console.log('Handling OPTIONS preflight request for test endpoint');
        return new Response(null, {
            status: 200,
            headers: {
                ...corsHeaders,
                'Content-Type': 'text/plain',
            },
        });
    }

    // Return simple test response
    return new Response(JSON.stringify({ 
        message: 'CORS test successful!',
        timestamp: new Date().toISOString(),
        method: request.method,
        origin: request.headers.get('origin')
    }), {
        status: 200,
        headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
        },
    });
}