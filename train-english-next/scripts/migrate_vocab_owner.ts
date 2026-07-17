import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import User from "../src/lib/db/models/User";
import Vocabulary from "../src/lib/db/models/Vocabulary";
import UserWordProgress from "../src/lib/db/models/UserWordProgress";
import { normalizeVocabularyWord } from "../src/lib/utils/vocabularyUtils";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function dbConnect() {
  if (mongoose.connection.readyState >= 1) return;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not defined");
  await mongoose.connect(uri);
}

const FORCE_DEDUP = process.argv.includes("--force-dedup");
const DRY_RUN = process.argv.includes("--dry-run");

async function migrate() {
  await dbConnect();
  
  const owner = await User.findOne({ email: "namle173247@gmail.com" });
  if (!owner) {
    console.error("Owner user 'namle173247@gmail.com' not found!");
    process.exitCode = 1;
    return;
  }
  
  console.log(`[1] Found owner: ${owner.email} (${owner._id})`);

  // 1. Identify vocabs that need migration
  const vocabsToMigrate = await Vocabulary.find({
    $or: [
      { userId: { $exists: false } },
      { userId: null }
    ]
  });

  console.log(`[2] Found ${vocabsToMigrate.length} vocabularies to migrate`);
  if (vocabsToMigrate.length === 0) {
    console.log("No vocabularies need migration.");
    return;
  }

  // 2. Normalize and check for duplicates within the target owner's scope
  const duplicateGroups = new Map<string, string[]>(); // normalizedWord -> array of _id
  
  // First, map what we are migrating
  for (const v of vocabsToMigrate) {
    const norm = normalizeVocabularyWord(v.word);
    if (!duplicateGroups.has(norm)) {
      duplicateGroups.set(norm, []);
    }
    duplicateGroups.get(norm)!.push(v._id.toString());
  }

  // Also check if any of these norm words ALREADY exist for the owner in DB
  const existingVocabs = await Vocabulary.find({
    userId: owner._id,
    normalizedWord: { $in: Array.from(duplicateGroups.keys()) }
  });

  for (const ext of existingVocabs) {
    const norm = ext.normalizedWord;
    if (duplicateGroups.has(norm)) {
      duplicateGroups.get(norm)!.push(ext._id.toString());
    }
  }

  // Filter only true duplicates
  const actualDuplicates = Array.from(duplicateGroups.entries()).filter(([_, ids]) => ids.length > 1);

  if (actualDuplicates.length > 0) {
    console.warn(`[!] FOUND ${actualDuplicates.length} DUPLICATE GROUPS!`);
    if (!FORCE_DEDUP) {
      console.log("Duplicate groups (run with --force-dedup to auto-merge):");
      for (const [norm, ids] of actualDuplicates.slice(0, 10)) {
        console.log(`  - '${norm}': ${ids.join(", ")}`);
      }
      if (actualDuplicates.length > 10) console.log(`  ... and ${actualDuplicates.length - 10} more`);
      process.exitCode = 1;
      return;
    }
  }

  if (DRY_RUN) {
    console.log("DRY RUN ENABLED. Exiting before making changes.");
    return;
  }

  // 3. Resolve duplicates if FORCE_DEDUP is on
  if (FORCE_DEDUP && actualDuplicates.length > 0) {
    console.log("[3] Resolving duplicates...");
    for (const [norm, ids] of actualDuplicates) {
      // Keep the first one, delete the rest
      const keepId = ids[0];
      const removeIds = ids.slice(1);
      
      // Merge deckIds
      const allDocs = await Vocabulary.find({ _id: { $in: ids } });
      const allDeckIds = allDocs.flatMap(d => d.deckIds.map((id: any) => id.toString()));
      const uniqueDeckIds = [...new Set(allDeckIds)];
      
      await Vocabulary.findByIdAndUpdate(keepId, { deckIds: uniqueDeckIds });
      
      // Move UserWordProgress from removeIds to keepId
      // Note: A user could theoretically have progress on BOTH the duplicate and the main one. 
      // If they do, we'll just delete the progress on the duplicate to avoid unique index violation on UserWordProgress.
      for (const removeId of removeIds) {
        // Find all progress for the word we are removing
        const progresses = await UserWordProgress.find({ wordId: removeId });
        for (const p of progresses) {
          // Does the user already have progress for the kept word?
          const existing = await UserWordProgress.findOne({ userId: p.userId, wordId: keepId });
          if (existing) {
            // Delete the duplicate progress
            await UserWordProgress.findByIdAndDelete(p._id);
          } else {
            // Move progress to the kept word
            await UserWordProgress.findByIdAndUpdate(p._id, { wordId: keepId });
          }
        }
      }
      
      // Delete the duplicate vocabs
      await Vocabulary.deleteMany({ _id: { $in: removeIds } });
    }
    console.log(`Resolved ${actualDuplicates.length} duplicate groups.`);
  }

  // 4. Migrate the vocabs (assign userId, normalizedWord)
  console.log("[4] Applying userId and normalizedWord to vocabularies...");
  // Re-fetch what needs migration in case duplicates were deleted
  const remainingToMigrate = await Vocabulary.find({
    $or: [
      { userId: { $exists: false } },
      { userId: null }
    ]
  });

  let modifiedCount = 0;
  for (const v of remainingToMigrate) {
    v.userId = owner._id;
    v.normalizedWord = normalizeVocabularyWord(v.word);
    
    // Cross-user progress cleanup:
    // If progress exists for this wordId but userId !== owner._id, delete it
    const deletedProgress = await UserWordProgress.deleteMany({
      wordId: v._id,
      userId: { $ne: owner._id }
    });
    if (deletedProgress.deletedCount > 0) {
      console.log(`  - Deleted ${deletedProgress.deletedCount} cross-user progress records for word '${v.word}'`);
    }

    // Clean deckIds (ensure all deckIds belong to owner)
    // For now we just keep the deckIds as is, assuming old decks belong to the same admin.
    // Realistically, to verify deck ownership:
    // const decks = await mongoose.model("Deck").find({ _id: { $in: v.deckIds } });
    // v.deckIds = decks.filter(d => d.userId.toString() === owner._id.toString()).map(d => d._id);

    await v.save();
    modifiedCount++;
  }

  console.log(`[5] Migration completed successfully! Migrated ${modifiedCount} vocabularies.`);
}

migrate()
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exitCode = 1;
  })
  .finally(() => {
    mongoose.connection.close();
  });
