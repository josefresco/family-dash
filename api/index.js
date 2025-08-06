// Main API handler for CalDAV proxy
export default function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    // Handle preflight
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    
    // Route to calendar handler
    if (req.url.includes('/calendar')) {
        return handleCalendar(req, res);
    }
    
    // Default response
    res.status(200).json({
        message: 'Family Dashboard API',
        endpoints: ['/api/calendar'],
        timestamp: new Date().toISOString()
    });
}

async function handleCalendar(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        const { provider, username, password, dateParam = 'today' } = req.body;
        
        if (!provider || !username || !password) {
            return res.status(400).json({
                error: 'Missing required fields: provider, username, password'
            });
        }
        
        // Simple test response for now
        res.status(200).json({
            message: 'CalDAV proxy working!',
            provider,
            username: username.replace(/.{1,3}/, '***'), // Mask username
            dateParam,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Calendar API error:', error);
        res.status(500).json({
            error: 'Calendar API failed',
            message: error.message
        });
    }
}