import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import dns from 'dns';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from Backend/.env
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function globalDecommission() {
  try {
    console.log('🌌 Nexus Platform: Initiating Global Data Reset Protocol...');
    
    // Industrial DNS resolution for Atlas SRV
    dns.setServers(['1.1.1.1', '1.0.0.1']);

    const uri = process.env.MONGO_URI;

    if (!uri) throw new Error('MONGO_URI not found in environment');

    await mongoose.connect(uri);

    console.log('✅ Uplink Established with Global Registry.');

    // Define target collections for wiping
    const collections = [
      'products',
      'invoices',
      'activities',
      'purchases',
      'payments',
      'staffs',
      'offers'
    ];

    for (const colName of collections) {
      try {
        const collection = mongoose.connection.collection(colName);
        const result = await collection.deleteMany({});
        console.log(`🧹 Decommissioned ${result.deletedCount} nodes from [${colName}]`);
      } catch (err) {
        console.log(`⚠️ Skip: Collection [${colName}] may not exist or is already empty.`);
      }
    }

    console.log('\n✨ Reset Complete: Your NexusBill instance is now a Zero-Knowledge Baseline.');
    console.log('🚀 Ready for fresh industrial deployment.');
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Reset Protocol Failed:', err);
    process.exit(1);
  }
}

globalDecommission();
