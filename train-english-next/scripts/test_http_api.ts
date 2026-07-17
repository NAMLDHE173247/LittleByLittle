import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import mongoose from "mongoose";
import User from "../src/lib/db/models/User";

const BASE_URL = "http://localhost:3000/api";

async function dbConnect() {
  if (mongoose.connection.readyState >= 1) return;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not defined");
  await mongoose.connect(uri);
}

async function setupUsers() {
  await dbConnect();
  await User.deleteMany({ email: { $in: ["test_a_api@example.com", "test_b_api@example.com"] } });
  
  const r1 = await fetch(`${BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "API User A", email: "test_a_api@example.com", password: "Password123!" })
  });
  if (!r1.ok) console.error("Reg A failed:", await r1.text());
  
  const r2 = await fetch(`${BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "API User B", email: "test_b_api@example.com", password: "Password123!" })
  });
  if (!r2.ok) console.error("Reg B failed:", await r2.text());

  // Activate them
  await User.updateMany(
    { email: { $in: ["test_a_api@example.com", "test_b_api@example.com"] } },
    { status: "active" }
  );
}

async function cleanupUsers() {
  await User.deleteMany({ email: { $in: ["test_a_api@example.com", "test_b_api@example.com"] } });
  await mongoose.connection.close();
}

async function login(email: string) {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "Password123!" })
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Login failed for ${email}: ${res.status} ${text}`);
  }
  const data = await res.json();
  return data.data.token;
}

async function runApiTests() {
  console.log("=== Running HTTP API Regression Tests ===");
  try {
    await setupUsers();
    
    const tokenA = await login("test_a_api@example.com");
    const tokenB = await login("test_b_api@example.com");

    const authA = { "Authorization": `Bearer ${tokenA}`, "Content-Type": "application/json" };
    const authB = { "Authorization": `Bearer ${tokenB}`, "Content-Type": "application/json" };

    // Clear all for A
    await fetch(`${BASE_URL}/vocabulary/clear-all`, { method: "DELETE", headers: authA });
    // Clear all for B
    await fetch(`${BASE_URL}/vocabulary/clear-all`, { method: "DELETE", headers: authB });

    // --- User A ---
    console.log("\\n[1] User A creates vocabulary");
    const createA = await fetch(`${BASE_URL}/vocabulary`, {
      method: "POST",
      headers: authA,
      body: JSON.stringify({ word: "Strawberry", meanings: ["Dâu tây"] })
    });
    const resA = await createA.json();
    if (createA.status !== 201) {
      throw new Error(`A failed to create: ${createA.status} ${JSON.stringify(resA)}`);
    }
    const vocabIdA = resA.data._id;
    console.log("  => Success: Created", vocabIdA);

    // --- User B ---
    console.log("\\n[2] User B verifies isolation");
    // List
    const listB = await fetch(`${BASE_URL}/vocabulary`, { headers: authB });
    const listBData = await listB.json();
    if (listBData.data.length !== 0) throw new Error("B should have 0 words");
    
    // Metadata
    const metaB = await fetch(`${BASE_URL}/vocabulary/metadata`, { headers: authB });
    const metaBData = await metaB.json();
    if (metaBData.data.totalWords !== 0) throw new Error("B should have 0 totalWords in metadata");
    
    // Export
    const exportB = await fetch(`${BASE_URL}/vocabulary/export`, { headers: authB });
    const exportBData = await exportB.json();
    if (exportBData.data.length !== 0) throw new Error("B should export 0 words");
    
    console.log("  => Success: User B cannot see User A's words");

    console.log("\\n[3] User B IDOR attempts");
    // PUT
    const putB = await fetch(`${BASE_URL}/vocabulary/${vocabIdA}`, {
      method: "PUT",
      headers: authB,
      body: JSON.stringify({ meanings: ["Hacked"] })
    });
    if (putB.status !== 400 && putB.status !== 404) { 
       // Service throws Error("Vocabulary not found") which is caught as 400 in route.ts
       // Let's accept 400 or 404.
       throw new Error(`IDOR PUT failed, got status ${putB.status}`);
    }
    
    // DELETE
    const delB = await fetch(`${BASE_URL}/vocabulary/${vocabIdA}`, {
      method: "DELETE",
      headers: authB
    });
    if (delB.status !== 400 && delB.status !== 404) throw new Error(`IDOR DELETE failed, got status ${delB.status}`);
    console.log("  => Success: IDOR prevented");

    console.log("\\n[4] User B creates same word");
    const createB = await fetch(`${BASE_URL}/vocabulary`, {
      method: "POST",
      headers: authB,
      body: JSON.stringify({ word: "Strawberry", meanings: ["Dâu của B"] })
    });
    if (createB.status !== 201) throw new Error("B failed to create independent Strawberry");
    console.log("  => Success: User B created independent word");

    console.log("\\n[5] User B creates duplicate word (Checking 409)");
    const createBDup = await fetch(`${BASE_URL}/vocabulary`, {
      method: "POST",
      headers: authB,
      body: JSON.stringify({ word: "strawberry", meanings: ["Dâu duplicate"] })
    });
    if (createBDup.status !== 409) throw new Error(`Duplicate did not return 409, got ${createBDup.status}`);
    const dupRes = await createBDup.json();
    if (!dupRes.message.includes("Từ này đã tồn tại")) throw new Error("Duplicate message mismatch");
    console.log("  => Success: API correctly returned HTTP 409 Conflict");

    console.log("\\n[6] User A clears all");
    const clearA = await fetch(`${BASE_URL}/vocabulary/clear-all`, {
      method: "DELETE",
      headers: authA
    });
    if (clearA.status !== 200) throw new Error("Clear all failed");
    
    const listBAfter = await fetch(`${BASE_URL}/vocabulary`, { headers: authB });
    const listBAfterData = await listBAfter.json();
    if (listBAfterData.data.length !== 1) throw new Error("User A's clear-all affected User B!");
    console.log("  => Success: User A clear-all was isolated");

    // Check unique index manually by calling a custom script or here via Mongoose.
    console.log("\\nAll HTTP API tests passed successfully!");
  } catch (error) {
    console.error("\\nTEST FAILED:", error);
    process.exitCode = 1;
  } finally {
    await cleanupUsers();
  }
}

runApiTests();
