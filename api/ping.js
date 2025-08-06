// Ultra simple ping test with proper CORS
module.exports = (req, res) => {
  console.log('Ping endpoint called:', req.method, req.headers.origin);
  
  // Set CORS headers first
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS preflight for ping');
    res.status(200).end();
    return;
  }
  
  // Main response
  res.status(200).json({ 
    ping: 'pong', 
    time: Date.now(),
    method: req.method,
    origin: req.headers.origin 
  });
};