import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.js';
import Business from './src/models/Business.js';
import dns from 'dns';

dotenv.config();

async function check() {
  try {
    dns.setServers(["1.1.1.1", "1.0.0.1"]);
    await mongoose.connect(process.env.MONGO_URI || '');
    console.log('Connected to DB');

    const user = await User.findOne({ email: 'jay@gmail.com'.toLowerCase() });
    console.log('User found:', user ? {
      name: user.name,
      email: user.email,
      businessId: user.businessId,
      businessObjectId: user.businessObjectId,
      role: user.role
    } : 'No user found');

    if (user && user.businessId) {
      const business = await Business.findOne({ businessId: user.businessId.toUpperCase() });
      console.log('Business found by businessId:', business ? {
        businessId: business.businessId,
        businessName: business.businessName,
        _id: business._id
      } : 'No business found by businessId');

      if (user.businessObjectId) {
        const bizByObj = await Business.findById(user.businessObjectId);
        console.log('Business found by businessObjectId:', bizByObj ? {
          businessId: bizByObj.businessId,
          businessName: bizByObj.businessName
        } : 'No business found by ObjectId');
      }
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
