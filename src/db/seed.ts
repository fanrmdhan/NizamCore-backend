import { db } from "./index";
import { users } from "./schema";
import bcrypt from "bcryptjs";
import "dotenv/config";

async function seed() {
  console.log("🌱 Seeding database...");

  const hashedPassword = await bcrypt.hash("password123", 10);

  await db
    .insert(users)
    .values([
      { username: "dosen_nizam",     password_hash: hashedPassword, role: "Dosen" },
      { username: "mahasiswa_ali",   password_hash: hashedPassword, role: "Mahasiswa" },
    ])
    .onConflictDoNothing();

  console.log("✅ Seeding completed!");
  console.log("📋 Akun yang dibuat:");
  console.log("   - username: dosen_nizam    | password: password123 | role: Dosen");
  console.log("   - username: mahasiswa_ali  | password: password123 | role: Mahasiswa");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
