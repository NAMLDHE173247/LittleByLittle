import mongoose from "mongoose";
import dns from "dns";
import dotenv from "dotenv";
import User from "../models/User";

dns.setServers(["8.8.8.8", "8.8.4.4"]);
dotenv.config();

async function migrate() {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI!);
    console.log(`\n🔗 Connected to: ${conn.connection.name}`);

    // Update tất cả các user đang có status là 'pending' (hoặc chưa có) thành 'active'
    const result = await User.updateMany(
      { $or: [{ status: { $exists: false } }, { status: "pending" }] },
      { $set: { status: "active" } }
    );

    console.log(`✅ Cập nhật thành công ${result.modifiedCount} users thành 'active'`);

    // Hiện danh sách user
    const users = await User.find({});
    for (const user of users) {
      console.log(`  👤 ${user.email} - Role: ${user.role} - Status: ${user.status}`);
    }

    await mongoose.disconnect();
    console.log("\n✅ Done.\n");
  } catch (err) {
    console.error("❌ Error:", err);
    process.exit(1);
  }
}

migrate();
