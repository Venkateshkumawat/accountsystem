import mongoose from 'mongoose';
import User from '../models/User.js';
import Business from '../models/Business.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Registry Healing Protocol
 * This script identifies BusinessAdmins missing their businessObjectId linkage
 * and repairs the bridge by matching them to their Business documents.
 */
export const healRegistry = async () => {
  console.log('📡 Nexus Engine: Initiating Registry Healing Protocol...');
  
  try {
    const disconnectedUsers = await User.find({
      role: 'businessAdmin',
      $or: [
        { businessObjectId: { $exists: false } },
        { businessObjectId: null }
      ]
    });

    console.log(`🔍 Found ${disconnectedUsers.length} disconnected BusinessAdmin nodes.`);

    let healedCount = 0;
    for (const user of disconnectedUsers) {
      if (user.businessId) {
        const business = await Business.findOne({ businessId: user.businessId });
        if (business) {
          user.businessObjectId = business._id as mongoose.Types.ObjectId;
          user.businessAdminId = user._id as mongoose.Types.ObjectId;
          await user.save();
          healedCount++;
          console.log(`✅ Healed Identity Link: ${user.email} -> ${business.businessName} (${user.businessId})`);
        } else {
          console.warn(`⚠️ Orphaned Node: User ${user.email} has ID ${user.businessId} but no matching Business document found.`);
        }
      }
    }

    console.log(`🏁 Healing Complete: ${healedCount} nodes successfully re-synchronized.`);
  } catch (err) {
    console.error('❌ Registry Healing Failed:', err);
  }
};
