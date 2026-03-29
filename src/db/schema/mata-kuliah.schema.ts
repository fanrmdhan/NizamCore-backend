import { pgTable, uuid, varchar, integer, timestamp } from "drizzle-orm/pg-core";

export const mataKuliah = pgTable("mata_kuliah", {
  id: uuid("id").primaryKey().defaultRandom(),
  nama: varchar("nama", { length: 200 }).notNull(),
  kode: varchar("kode", { length: 20 }).notNull().unique(),
  bobot_sks: integer("bobot_sks").notNull(),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
});

export type MataKuliah = typeof mataKuliah.$inferSelect;
export type NewMataKuliah = typeof mataKuliah.$inferInsert;
