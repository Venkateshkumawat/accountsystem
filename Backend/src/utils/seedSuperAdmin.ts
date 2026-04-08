import SuperAdminConfig from '../models/SuperAdminConfig.js';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';

dotenv.config();

/**
 * SuperAdmin Provisioning Protocol (Hybrid System)
 * Auth is 100% via ENV, but we store config/metadata in DB.
 * Uses upsert logic to guarantee only 1 config document exists.
 */
export const seedSuperAdmin = async (): Promise<void> => {
  try {
    const envSecretKey = process.env.SUPER_ADMIN_SECRET_KEY;
    if (!envSecretKey) {
      throw new Error('SUPER_ADMIN_SECRET_KEY not set in .env');
    }

    // We no longer rely on pre-save hooks for upsering the key cleanly, 
    // we'll explicitly hash it here so we can do a proper updateOne.
    // Or we simply check the model.
    let config = await SuperAdminConfig.findOne();

    if (!config) {
       // Since pre-save hook handles hashing on create/save:
       config = new SuperAdminConfig({
          secretKey: envSecretKey,
          isInitialized: true,
          name: "SuperAdmin"
       });
       await config.save();
       console.log('✅ SuperAdmin: Config Node Initialized.');
    } else {
       // If it exists, ensure the key matches. If not, re-sync.
       const isMatch = await config.compareSecretKey(envSecretKey);
       if (!isMatch) {
          config.secretKey = envSecretKey; // hook hashes it
          await config.save();
          console.log('✅ SuperAdmin: Config Key re-synced with .env.');
       } else {
          console.log('✅ SuperAdmin: Config Node Verified.');
       }
    }

    // Ensure absolutely NO duplicate configs
    const configCount = await SuperAdminConfig.countDocuments();
    if (configCount > 1) {
       console.warn('⚠️ SuperAdmin: Detected duplicate configs. Cleaning up...');
       const configs = await SuperAdminConfig.find().sort({ createdAt: 1 });
       // keep the first one, delete rest
       for (let i = 1; i < configs.length; i++) {
           await SuperAdminConfig.findByIdAndDelete(configs[i]._id);
       }
       console.log('✅ SuperAdmin: Cleaned up duplicates.');
    }

  } catch (error) {
    console.error('❌ SuperAdmin Seeding Failure:', error);
  }
};
