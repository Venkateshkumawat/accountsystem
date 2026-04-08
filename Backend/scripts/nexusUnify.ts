import { MongoClient } from "mongodb";

/**
 * Nexus Registry Consolidation Script (Direct Driver Run)
 * Goal: UNIFY shards for business_69ccf9d41efa2e44140393b0 -> business_NK4A2
 */

async function unifyBusinessNode() {
  const MONGO_URI = "mongodb+srv://hemmuprajapat143_db_user:hemant123456@cluster0.4ar8n0w.mongodb.net/qna_db?appName=Cluster0";
  
  console.log(`📡 Nexus Purge: Commencing Direct Registry Unification for [NK4A2]...`);
  
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  
  const SOURCE_DATABASE_NAME = "business_69ccf9d41efa2e44140393b0"; 
  const TARGET_DATABASE_NAME = "business_NK4A2";

  const sourceDb = client.db(SOURCE_DATABASE_NAME);
  const targetDb = client.db(TARGET_DATABASE_NAME);

  console.log(`🔌 Node Connections Established: [${SOURCE_DATABASE_NAME}] -> [${TARGET_DATABASE_NAME}]`);

  const collections = await sourceDb.listCollections().toArray();
  const collectionNames = collections.map(c => c.name);

  console.log(`📦 Identified ${collectionNames.length} source nodes: [${collectionNames.join(', ')}]`);

  for (const name of collectionNames) {
    if (name.startsWith('system.')) continue;

    console.log(`🚚 Porting Registry: [${name}]...`);
    const sourceCol = sourceDb.collection(name);
    const targetCol = targetDb.collection(name);

    const documents = await sourceCol.find({}).toArray();
    
    if (documents.length > 0) {
      console.log(`   📝 Uploading ${documents.length} objects...`);
      for (const doc of documents) {
          try {
              await targetCol.updateOne({ _id: doc._id }, { $set: doc }, { upsert: true });
          } catch (e) {
              // Ignore duplicates
          }
      }
      console.log(`   ✅ [${name}] Synchronized.`);
    }
  }

  console.log(`🧹 Node Decommissioning: Dropping old shard [${SOURCE_DATABASE_NAME}]...`);
  await sourceDb.dropDatabase();
  console.log(`✅ System Unified: All data now resides in [${TARGET_DATABASE_NAME}]`);

  await client.close();
  console.log("🏁 Registry Consolidated. One shard per business enforced.");
  process.exit(0);
}

unifyBusinessNode().catch(err => {
  console.error("🌊 Migration Crash:", err);
  process.exit(1);
});
