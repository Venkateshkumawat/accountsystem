import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const mongoUri = process.env.MONGO_URI;

if (!mongoUri) {
  throw new Error("📡 Nexus Environment Failure: MONGO_URI missing from registry.");
}

const connectionCache: { [key: string]: mongoose.Connection } = {};

/**
 * Nexus Protocol: Resolve Dynamic Database Node
 * @param tenantId Unique tenant reference ID (MUST be the 5-character short ID for consistency)
 * @returns An established Mongoose connection to the business-specific database
 */
export const getTenantConnection = async (tenantId: string): Promise<mongoose.Connection> => {
  // Defensive check: If tenantId looks like a MongoDB ObjectId, it might be a legacy call
  // We prefer the human-readable short ID for database naming.
  
  // 1. Check if node is already cached and active
  if (connectionCache[tenantId]) {
    if (connectionCache[tenantId].readyState === 1) {
      return connectionCache[tenantId];
    }
    await connectionCache[tenantId].close();
    delete connectionCache[tenantId];
  }

  // 2. Establish a new Uplink to the tenant's private collection store
  const dbName = `business_${tenantId}`;
  
  console.log(`📡 Nexus Protocol: Initializing Dynamic Uplink [${dbName}]...`);

  // Using dbName option is more robust than manual URI manipulation
  const connection = mongoose.createConnection(mongoUri, {
    dbName,
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 15000,
    connectTimeoutMS: 20000,
  });

  // Wait for node to online
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Uplink Timeout for Node: ${dbName}`)), 25000);
    connection.once("open", () => {
      clearTimeout(timeout);
      resolve(true);
    });
    connection.once("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });

  connectionCache[tenantId] = connection;
  return connection;
};
