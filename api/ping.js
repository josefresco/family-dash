// Ultra simple ping test
module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json({ ping: 'pong', time: Date.now() });
};