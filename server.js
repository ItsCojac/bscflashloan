const express = require('express');
const path = require('path');
const { findArbitrageOpportunities } = require('./arbitrage-bot');

const app = express();

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', async (req, res) => {
  const opportunities = await findArbitrageOpportunities();
  res.send(opportunities);
});

app.listen(3000, () => {
  console.log('Server listening on port 3000');
});
