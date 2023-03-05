const { MongoClient } = require('mongodb');

async function connectToDatabase() {
  const client = new MongoClient(process.env.MONGO_URL);
  await client.connect();
  return client.db('arbitrage-bot');
}

async function saveOpportunities(opportunities) {
  const db = await connectToDatabase();
  const opportunitiesCollection = db.collection('opportunities');
  await opportunitiesCollection.insertMany(opportunities);
}
