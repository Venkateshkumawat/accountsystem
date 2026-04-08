import SuperAdminConfig from '../models/SuperAdminConfig.js';

export const seedSuperAdmin = async (): Promise<void> => {
  try {
    const existingConfig = await SuperAdminConfig.getInstance();
    const secretKey = process.env.SUPER_ADMIN_SECRET_KEY;

    if (!secretKey) {
      throw new Error('SUPER_ADMIN_SECRET_KEY not set in .env');
    }

    if (!existingConfig) {
      // 1. Initial Seeding Protocol
      await SuperAdminConfig.create({
        secretKey,
        isInitialized: true,
      });
      console.log('✅ SuperAdmin: Initialized with secret key from .env');
    } else {
      // 2. RE-SYNC PROTOCOL: Check if .env key changed since last boot
      const isMatch = await existingConfig.compareSecretKey(secretKey);
      
      if (!isMatch) {
         console.warn('⚠️ SuperAdmin: .env key mismatch detected. Initiating Re-Sync Protocol...');
         existingConfig.secretKey = secretKey; // Model pre-save hook will handle re-hashing
         await existingConfig.save();
         console.log('✅ SuperAdmin: Secret key re-synced with current .env');
      } else {
         console.log('✅ SuperAdmin: Security Node Active & Valid.');
      }
    }

  } catch (error) {
    console.error('❌ Failed to seed SuperAdmin:', error);
    process.exit(1);
  }
};
