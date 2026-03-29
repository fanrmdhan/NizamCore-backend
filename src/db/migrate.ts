import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import "dotenv/config";

const connectionString = process.env.DATABASE_URL!;

async function runMigrations() {
  console.log("⏳ Running database migrations...");
  const migrationClient = postgres(connectionString, { max: 1 });
  const db = drizzle(migrationClient);
  await migrate(db, { migrationsFolder: "./src/db/migrations" });
  await migrationClient.end();
  console.log("✅ Migrations completed successfully!");
  process.exit(0);
}

runMigrations().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
