/**
 * Migration Script: Tạo admin mặc định & gán dữ liệu cũ cho admin
 * 
 * Chạy 1 lần duy nhất sau khi deploy auth system:
 *   npx ts-node-dev src/scripts/migrateData.ts
 */
import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import dns from "dns";
import User from "../models/User";
import Deck from "../models/Deck";
import UserWordProgress from "../models/UserWordProgress";

dns.setServers(["8.8.8.8", "8.8.4.4"]);

const OLD_USER_ID = "000000000000000000000001";

async function migrate() {
  const mongoURI = process.env.MONGODB_URI;
  if (!mongoURI) {
    console.error("❌ MONGODB_URI not set");
    process.exit(1);
  }

  await mongoose.connect(mongoURI);
  console.log("✅ Connected to MongoDB");

  // 1. Tạo tài khoản admin (nếu chưa có)
  let admin = await User.findOne({ email: "admin@littlebylittle.com" });
  if (!admin) {
    admin = await User.create({
      email: "admin@littlebylittle.com",
      password: "admin123",
      name: "Admin",
      role: "admin",
    });
    console.log(`✅ Created admin account: admin@littlebylittle.com / admin123`);
  } else {
    console.log(`ℹ️  Admin account already exists: ${admin.email}`);
  }

  const adminId = admin._id;

  // 2. Gán tất cả Deck chưa có userId cho admin
  const decksWithoutUser = await Deck.find({ userId: { $exists: false } });
  if (decksWithoutUser.length > 0) {
    await Deck.updateMany(
      { userId: { $exists: false } },
      { $set: { userId: adminId } }
    );
    console.log(`✅ Assigned ${decksWithoutUser.length} decks to admin`);
  } else {
    // Also handle decks with null userId
    const decksNullUser = await Deck.find({ userId: null });
    if (decksNullUser.length > 0) {
      await Deck.updateMany(
        { userId: null },
        { $set: { userId: adminId } }
      );
      console.log(`✅ Assigned ${decksNullUser.length} decks (null userId) to admin`);
    } else {
      console.log("ℹ️  No decks need migration");
    }
  }

  // 3. Cập nhật UserWordProgress từ OLD_USER_ID sang admin._id
  const oldProgressCount = await UserWordProgress.countDocuments({
    userId: new mongoose.Types.ObjectId(OLD_USER_ID),
  });

  if (oldProgressCount > 0) {
    await UserWordProgress.updateMany(
      { userId: new mongoose.Types.ObjectId(OLD_USER_ID) },
      { $set: { userId: adminId } }
    );
    console.log(`✅ Migrated ${oldProgressCount} progress records to admin`);
  } else {
    console.log("ℹ️  No progress records need migration");
  }

  // 4. Xóa unique index cũ trên Deck.name (nếu có) vì giờ đổi thành compound index
  try {
    const deckCollection = mongoose.connection.collection("decks");
    const indexes = await deckCollection.indexes();
    const nameIndex = indexes.find(
      (idx) => idx.key && idx.key.name === 1 && idx.unique && !idx.key.userId
    );
    if (nameIndex && nameIndex.name) {
      await deckCollection.dropIndex(nameIndex.name);
      console.log(`✅ Dropped old unique index on Deck.name`);
    }
  } catch (err: any) {
    if (err.codeName !== "IndexNotFound") {
      console.warn("⚠️  Could not drop old Deck name index:", err.message);
    }
  }

  console.log("\n🎉 Migration complete!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Admin login credentials:");
  console.log("  Email:    admin@littlebylittle.com");
  console.log("  Password: admin123");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  await mongoose.disconnect();
  process.exit(0);
}

migrate().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
