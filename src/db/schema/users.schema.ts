import { pgTable, uuid, varchar, pgEnum, timestamp } from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["Dosen", "Mahasiswa"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: varchar("username", { length: 100 }).notNull().unique(),
  password_hash: varchar("password_hash", { length: 255 }).notNull(),
  role: userRoleEnum("role").notNull(),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
