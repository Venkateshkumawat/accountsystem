import mongoose from "mongoose";
import dotenv from "dotenv";
import dns from "dns";

dotenv.config();

/**
 * NexusBill Database Connector
 * Optimized for MongoDB Atlas with SRV Auto-Resolution.
 */
const connectDB = async () => {
  try {
    // SECURITY: Use Cloudflare DNS (1.1.1.1) to resolve Atlas SRV records
    // This solves the "querySrv ECONNREFUSED" error found in restricted networks.
    dns.setServers(["1.1.1.1", "1.0.0.1"]);

    const uri = process.env.MONGO_URI || "mongodb://localhost:27017/nexusbill";
    const conn = await mongoose.connect(uri);
    console.log(`✅ Nexus Registry Online: Connected to ${conn.connection.host}`);
  } catch (error: any) {
    console.error(`❌ Connection Failure: ${error.message}`);
    
    // Fallback: If SRV fails, we alert the user with corrective action
    if (error.message.includes("querySrv")) {
      console.warn("⚠️  DNS Resolution Failed. Your network might be blocking Atlas SRV records.");
      console.warn("👉 Suggestion: Check if your IP is whitelisted in MongoDB Atlas or use a legacy (non-srv) connection string.");
    }
    
    process.exit(1);
  }
};

export default connectDB;
