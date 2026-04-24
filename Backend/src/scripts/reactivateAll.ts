import mongoose from 'mongoose';
import Business from '../models/Business.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * 🛡️ Nexus Master Recovery Script
 * Logic: Reactivates all business nodes and extends subscription by 1 year.
 * Purpose: Solve 403 Forbidden errors during development/testing.
 */
const reactivateAll = async () => {
    const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/qna_db';
    
    try {
        console.log('🔗 Connecting to Nexus Data Node...');
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected.');

        const nextYear = new Date();
        nextYear.setFullYear(nextYear.getFullYear() + 1);

        console.log('🛰️ Initiating Global Reactivation Protocol...');
        const result = await Business.updateMany(
            {}, 
            { 
                $set: { 
                    isActive: true, 
                    status: 'active',
                    planEndDate: nextYear
                } 
            }
        );

        console.log(`✅ Success: ${result.modifiedCount} business nodes reactivated and extended.`);
        
    } catch (err) {
        console.error('❌ Recovery Protocol Failed:', err);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected.');
    }
};

reactivateAll();
