import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Business from './src/models/Business.js';

dotenv.config();

const checkData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/qna_db');
    console.log('Connected to DB');
    
    const businesses = await Business.find({});
    console.log(`Checking ${businesses.length} businesses...`);
    
    for (const b of businesses) {
        if (!b.planEndDate) {
            console.log(`⚠️ Business ${b.businessName} (${b.businessId}) is missing planEndDate!`);
        }
    }
    
    console.log('Done');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

checkData();
