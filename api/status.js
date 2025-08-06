// Status check - minimal function
exports.default = (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
};