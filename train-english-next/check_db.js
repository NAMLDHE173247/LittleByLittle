const mongoose = require('mongoose');
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

async function checkDB() {
  const uri = "mongodb+srv://namle173247_db_user:9reJJZPuT6txzwsC@cluster0.hs62wxt.mongodb.net/littlebylittle?retryWrites=true&w=majority&appName=Cluster0";
  
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
    console.log("Connected successfully to MongoDB Atlas");
    
    const db = mongoose.connection.db;
    
    // List collections
    const collections = await db.listCollections().toArray();
    console.log("\n=== COLLECTIONS ===");
    const colNames = collections.map(c => c.name);
    console.log(colNames);
    
    // Get sample documents
    console.log("\n=== SAMPLE DATA ===");
    for (const colName of colNames) {
      const col = db.collection(colName);
      const count = await col.countDocuments();
      const sample = await col.findOne({});
      console.log(`\nCollection: ${colName} (Total: ${count} documents)`);
      console.log(JSON.stringify(sample, null, 2));
    }
    
  } catch (err) {
    console.error("Error connecting to MongoDB:", err);
  } finally {
    await mongoose.disconnect();
  }
}

checkDB();
