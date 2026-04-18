
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config();

const purgeAll = async () => {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/bharatbill';
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(); // Uses the DB from the URI or default
    const result = await db.collection('parties').deleteMany({});
    console.log(`🧹 ABSOLUTE PURGE EXECUTED: ${result.deletedCount} nodes removed from ${db.databaseName}.`);
  } catch (err) {
    console.error('❌ Purge Failed:', err);
  } finally {
    await client.close();
    process.exit(0);
  }
};

purgeAll();
