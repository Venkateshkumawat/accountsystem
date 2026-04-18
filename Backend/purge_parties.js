
import mongoose from 'mongoose';
import Party from './src/models/Party.js';
import dotenv from 'dotenv';
dotenv.config();

const purgeAll = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || '');
    console.log('🛰️ Connected to Nexus Matrix');
    
    const res = await Party.deleteMany({});
    console.log(`🧹 ABSOLUTE PURGE EXECUTED: ${res.deletedCount} nodes removed from digital registry.`);
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Purge Failed:', err);
    process.exit(1);
  }
};

purgeAll();
