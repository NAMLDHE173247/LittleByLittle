import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import Vocabulary from "../src/lib/db/models/Vocabulary";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function dbConnect() {
  if (mongoose.connection.readyState >= 1) return;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not defined");
  await mongoose.connect(uri);
}

async function checkStats() {
  await dbConnect();
  
  const total = await Vocabulary.countDocuments({});
  
  const missingOwner = await Vocabulary.countDocuments({
    $or: [
      { userId: { $exists: false } },
      { userId: null }
    ]
  });

  const missingNormalized = await Vocabulary.countDocuments({
    $or: [
      { normalizedWord: { $exists: false } },
      { normalizedWord: null },
      { normalizedWord: "" }
    ]
  });

  console.log(`Total vocabularies: ${total}`);
  console.log(`Missing owner after migration: ${missingOwner}`);
  console.log(`Missing normalizedWord after migration: ${missingNormalized}`);

  mongoose.connection.close();
}

checkStats();
