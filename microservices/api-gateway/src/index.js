const express = require('express');
const app = express();

const PORT = process.env.PORT || 3000;

app.get('/health', (req, res) => {
  res.json({ status: 'API Gateway is running' });
});

app.listen(PORT, () => {
  console.log(`API Gateway listening on port ${PORT}`);
});
