import mongoose from "mongoose";
import dns from "dns";
import dotenv from "dotenv";

dns.setServers(["8.8.8.8", "8.8.4.4"]);
dotenv.config();

async function inspectDB() {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI!);
    console.log(`\n🔗 Connected to: ${conn.connection.host}`);
    console.log(`📦 Database: ${conn.connection.name}\n`);

    const db = conn.connection.db!;
    const collections = await db.listCollections().toArray();

    if (collections.length === 0) {
      console.log("⚠️  Database is empty — no collections found.\n");
    } else {
      console.log(`📂 Collections (${collections.length}):\n`);
      for (const col of collections) {
        const collection = db.collection(col.name);
        const count = await collection.countDocuments();
        const sample = await collection.findOne();

        console.log(`  ├─ ${col.name} (${count} documents)`);
        if (sample) {
          const keys = Object.keys(sample);
          console.log(`  │   Fields: ${keys.join(", ")}`);
          console.log(`  │   Sample: ${JSON.stringify(sample, null, 2).split("\n").join("\n  │   ")}`);
        }
        console.log(`  │`);
      }
    }

    await mongoose.disconnect();
    console.log("✅ Disconnected.\n");
  } catch (err) {
    console.error("❌ Error:", err);
    process.exit(1);
  }
}

inspectDB();
