import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const mongoUri = process.env.MONGO_URI;

// We'll import Business using a dynamic import or just a schema to be safe
const businessSchema = new mongoose.Schema({
  businessId: String,
  _id: mongoose.Types.ObjectId,
});

async function runCleanup() {
  if (!mongoUri) {
    console.error("❌ MONGO_URI missing");
    return;
  }

  // Connect once via the default connection pool (Atlas handles this better)
  console.log("📡 Initializing Master Uplink via Default Connection...");
  await mongoose.connect(mongoUri, { dbName: "qna_db" });
  console.log("✅ Master Registry Node [qna_db] is Online.");

  const Business = mongoose.model("BusinessCleanupModel", businessSchema, "businesses");
  const businesses = await Business.find({});
  console.log(`🔍 Auditing ${businesses.length} active business nodes...`);

  for (const b of businesses) {
    const objId = b._id.toString();
    const shortId = (b as any).businessId;
    
    if (!shortId || !objId) continue;

    const staleDbName = `business_${objId}`;
    const primaryDbName = `business_${shortId}`;

    if (staleDbName === primaryDbName) continue;

    console.log(`🚧 Node [${staleDbName}] check for migration to [${primaryDbName}]...`);

    try {
      // 🛰️ Use useDb to context switch without opening new connections
      const sourceDb = mongoose.connection.useDb(staleDbName);
      const targetDb = mongoose.connection.useDb(primaryDbName);

      const collections = await sourceDb.db.listCollections().toArray();
      
      if (collections.length === 0) {
        console.log(`      ✨ Node [${staleDbName}] is vacant.`);
      } else {
        console.log(`      🚚 Processing ${collections.length} collections for migration...`);
        for (const collInfo of collections) {
          const collName = collInfo.name;
          const sourceColl = sourceDb.db.collection(collName);
          const targetColl = targetDb.db.collection(collName);
          
          const docs = await sourceColl.find({}).toArray();
          if (docs.length > 0) {
            console.log(`         📦 Migrating ${docs.length} documents from [${collName}]...`);
            for (const doc of docs) {
              await targetColl.updateOne({ _id: doc._id }, { $set: doc }, { upsert: true });
            }
          }
        }
        console.log(`      ✅ Data transfer complete from [${staleDbName}].`);
      }

      // 🧨 Terminate stale node
      console.log(`      🧨 Commissioning purge of staleness: [${staleDbName}]...`);
      await sourceDb.db.dropDatabase();
      console.log(`      💥 Staleness purged successfully.`);
      
    } catch (err) {
      console.error(`      ❌ Nexus Protocol Failure on [${staleDbName}]:`, (err as Error).message);
    }
  }

  await mongoose.connection.close();
  console.log("🏁 Nexus Cleanup Protocol Terminated Successfully.");
}

runCleanup().catch(err => {
  console.error("FATAL Nexus Error:", err);
  process.exit(1);
});
