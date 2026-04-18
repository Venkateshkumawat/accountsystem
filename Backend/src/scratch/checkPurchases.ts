import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import dns from 'dns';

dns.setServers(['1.1.1.1', '1.0.0.1']);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/accountsystem";

async function checkData() {
  try {
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB");

    const db = mongoose.connection.db;
    if (!db) throw new Error("DB not found");
    
    // Find one purchase to check fields
    const purchase = await db.collection('purchases').findOne({});
    console.log("Sample Purchase:", JSON.stringify(purchase, null, 2));
    
    // Check totals
    const total = await db.collection('purchases').aggregate([
        { $group: { _id: null, total: { $sum: "$grandTotal" }, count: { $sum: 1 } } }
    ]).toArray();
    console.log("Global Totals:", total);

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

checkData();
