// Simple test endpoint - CommonJS format
module.exports = (req, res) => {
  console.log('Hello API called:', req.method, req.url);
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  res.status(200).json({ 
    message: 'Hello from Vercel API!',
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url
  });
};