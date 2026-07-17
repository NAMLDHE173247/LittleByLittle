import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import User from "../src/lib/db/models/User";
import Vocabulary from "../src/lib/db/models/Vocabulary";
import { VocabularyService } from "../src/lib/services/vocabulary.service";

async function dbConnect() {
  if (mongoose.connection.readyState >= 1) return;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not defined");
  await mongoose.connect(uri);
}

async function runTests() {
  await dbConnect();
  
  // 1. Get/Create Test Users
  let userA = await User.findOne({ email: "test_a@example.com" });
  if (!userA) {
    userA = await User.create({ name: "User A", email: "test_a@example.com", password: "password", role: "user" });
  }
  let userB = await User.findOne({ email: "test_b@example.com" });
  if (!userB) {
    userB = await User.create({ name: "User B", email: "test_b@example.com", password: "password", role: "user" });
  }

  const uidA = userA._id.toString();
  const uidB = userB._id.toString();

  // Clear data for test users
  await Vocabulary.deleteMany({ userId: { $in: [uidA, uidB] } });

  console.log("=== Running Isolation & Duplication Tests ===");

  try {
    // TEST 1: User A creates a word
    console.log("\\n[Test 1] User A creates 'Apple'");
    const vocabA1 = await VocabularyService.create({ word: "Apple", type: "word", meanings: ["Quả táo"] }, uidA);
    if (!vocabA1) throw new Error("Failed to create Apple for User A");
    console.log("  => Success");

    // TEST 2: User A creates duplicate 'apple'
    console.log("\\n[Test 2] User A creates duplicate 'apple'");
    let didThrow = false;
    try {
      await VocabularyService.create({ word: "apple", type: "word", meanings: ["Quả táo nhỏ"] }, uidA);
    } catch (err: any) {
      if (err.message.includes("đã tồn tại")) didThrow = true;
    }
    if (!didThrow) throw new Error("User A was able to create duplicate word!");
    console.log("  => Success (Duplicate prevented)");

    // TEST 3: User B creates 'apple' (should succeed, isolation)
    console.log("\\n[Test 3] User B creates 'apple' (Isolation check)");
    const vocabB1 = await VocabularyService.create({ word: "apple", type: "word", meanings: ["Táo của B"] }, uidB);
    if (!vocabB1) throw new Error("User B failed to create apple");
    console.log("  => Success (User B created apple successfully)");

    // TEST 4: IDOR - User B tries to update User A's word
    console.log("\\n[Test 4] User B tries to update User A's word (IDOR check)");
    let idorThrow = false;
    try {
      await VocabularyService.update(vocabA1._id.toString(), { meanings: ["Hacked"] }, uidB);
    } catch (err: any) {
      if (err.message.includes("not found")) idorThrow = true;
    }
    if (!idorThrow) throw new Error("User B was able to update User A's word!");
    console.log("  => Success (IDOR prevented)");

    // TEST 5: Bulk Import Duplicate Handling
    console.log("\\n[Test 5] User B Bulk Imports with duplicates");
    const bulkData = [
      { word: "Banana", meanings: ["Chuối"] }, // New
      { word: "APPLE", meanings: ["Táo to"] }, // Duplicate existing
      { word: "Orange", meanings: ["Cam"] },   // New
      { word: "orange", meanings: ["Cam 2"] }  // Duplicate in request
    ];
    
    const bulkResult = await VocabularyService.bulkImport(bulkData, [], uidB);
    console.log("  Bulk Result:", bulkResult);
    if (bulkResult.createdCount !== 2) throw new Error("Expected 2 inserted words (Banana, Orange)");
    if (bulkResult.existingCount !== 1) throw new Error("Expected 1 existing word (APPLE)");
    if (bulkResult.duplicateInRequestCount !== 1) throw new Error("Expected 1 duplicate in request (orange)");
    console.log("  => Success (Bulk Import handled duplicates correctly)");

    // VERIFY INDEXES
    console.log("\\n[Verify] Checking MongoDB Indexes on Vocabulary...");
    const indexes = await Vocabulary.collection.indexes();
    
    const uniqueIndex = indexes.find(
      (index: any) =>
        index.key?.userId === 1 &&
        index.key?.normalizedWord === 1
    );

    if (!uniqueIndex?.unique) {
      throw new Error("Compound index userId + normalizedWord is not unique");
    }
    console.log(JSON.stringify(uniqueIndex, null, 2));
    
    console.log("\\nAll HTTP API and Isolation tests passed successfully!");
  } catch (err) {
    console.error("\\nTEST FAILED:", err);
    process.exitCode = 1;
  } finally {
    // Cleanup
    await Vocabulary.deleteMany({ userId: { $in: [uidA, uidB] } });
    await User.deleteMany({ _id: { $in: [uidA, uidB] } });
    mongoose.connection.close();
  }
}

runTests();
