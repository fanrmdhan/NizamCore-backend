// ============================================================
// NizamCore - Database Schema (Drizzle ORM)
// Level 3: Advanced Scheduling
// ============================================================

import {
  pgTable,
  uuid,
  varchar,
  integer,
  smallint,
  time,
  timestamp,
  boolean,
  pgEnum,
  primaryKey,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── Enum: Hari Pertemuan ────────────────────────────────────
// Menggunakan angka (0=Senin s.d. 6=Minggu) untuk memudahkan
// komparasi numerik saat validasi bentrok jadwal.
export const hariEnum = pgEnum("hari_enum", [
  "SENIN",
  "SELASA",
  "RABU",
  "KAMIS",
  "JUMAT",
  "SABTU",
  "MINGGU",
]);

// ─── Tabel: Mata Kuliah ──────────────────────────────────────
export const mataKuliah = pgTable("mata_kuliah", {
  id: uuid("id").defaultRandom().primaryKey(),
  kode: varchar("kode", { length: 10 }).notNull().unique(),
  nama: varchar("nama", { length: 255 }).notNull(),
  sks: smallint("sks").notNull(),
  semester: smallint("semester").notNull(),
  isAktif: boolean("is_aktif").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Tabel: Kelas (Satu Mata Kuliah bisa punya banyak Kelas) ─
export const kelas = pgTable("kelas", {
  id: uuid("id").defaultRandom().primaryKey(),
  mataKuliahId: uuid("mata_kuliah_id")
    .notNull()
    .references(() => mataKuliah.id, { onDelete: "cascade" }),
  namaKelas: varchar("nama_kelas", { length: 10 }).notNull(), // A, B, C, dst.
  kapasitas: smallint("kapasitas").notNull().default(40),
  dosenId: uuid("dosen_id"), // FK ke tabel dosen (jika ada)
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Tabel: Jadwal Sesi ──────────────────────────────────────
// ✅ KUNCI: Satu Kelas bisa memiliki BANYAK sesi per minggu
//    Contoh: Pemrograman Web → Selasa 08:00-10:00 + Kamis 13:00-14:00
export const jadwalSesi = pgTable(
  "jadwal_sesi",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    // Relasi ke Kelas (bukan langsung ke Mata Kuliah)
    kelasId: uuid("kelas_id")
      .notNull()
      .references(() => kelas.id, { onDelete: "cascade" }),

    // Hari pertemuan
    hari: hariEnum("hari").notNull(),

    // Waktu mulai & selesai disimpan sebagai TIME (HH:MM:SS)
    // Drizzle memetakannya ke string "HH:MM:SS" di runtime
    jamMulai: time("jam_mulai").notNull(),
    jamSelesai: time("jam_selesai").notNull(),

    // Durasi dalam menit (redundan, tapi berguna untuk query cepat)
    durasiMenit: smallint("durasi_menit").notNull(),

    // Ruangan
    ruangan: varchar("ruangan", { length: 50 }),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    // Index untuk mempercepat query pengecekan bentrok
    idxHari: index("idx_jadwal_hari").on(table.hari),
    idxKelasHari: index("idx_jadwal_kelas_hari").on(table.kelasId, table.hari),
  })
);

// ─── Tabel: Mahasiswa ────────────────────────────────────────
export const mahasiswa = pgTable("mahasiswa", {
  id: uuid("id").defaultRandom().primaryKey(),
  nim: varchar("nim", { length: 20 }).notNull().unique(),
  nama: varchar("nama", { length: 255 }).notNull(),
  angkatan: smallint("angkatan").notNull(),
  isAktif: boolean("is_aktif").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Tabel: IRS (Isian Rencana Studi) ───────────────────────
// Satu baris = satu mahasiswa mengambil satu Kelas pada satu semester
export const irs = pgTable(
  "irs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    mahasiswaId: uuid("mahasiswa_id")
      .notNull()
      .references(() => mahasiswa.id, { onDelete: "cascade" }),
    kelasId: uuid("kelas_id")
      .notNull()
      .references(() => kelas.id, { onDelete: "cascade" }),
    tahunAkademik: varchar("tahun_akademik", { length: 9 }).notNull(), // "2024/2025"
    semester: varchar("semester", { length: 6 }).notNull(), // "GANJIL" | "GENAP"
    status: varchar("status", { length: 20 }).notNull().default("DIAJUKAN"),
    // DIAJUKAN → DISETUJUI → DITOLAK | DIBATALKAN
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    // Seorang mahasiswa tidak boleh mengambil kelas yang sama dua kali
    // dalam semester yang sama
    uniqueIrs: uniqueIndex("uq_irs_mahasiswa_kelas_semester").on(
      table.mahasiswaId,
      table.kelasId,
      table.tahunAkademik,
      table.semester
    ),
    idxMahasiswaSemester: index("idx_irs_mahasiswa_semester").on(
      table.mahasiswaId,
      table.tahunAkademik,
      table.semester
    ),
  })
);

// ─── Relations (untuk query dengan JOIN) ────────────────────
export const mataKuliahRelations = relations(mataKuliah, ({ many }) => ({
  kelasList: many(kelas),
}));

export const kelasRelations = relations(kelas, ({ one, many }) => ({
  mataKuliah: one(mataKuliah, {
    fields: [kelas.mataKuliahId],
    references: [mataKuliah.id],
  }),
  jadwalSesiList: many(jadwalSesi),
  irsList: many(irs),
}));

export const jadwalSesiRelations = relations(jadwalSesi, ({ one }) => ({
  kelas: one(kelas, {
    fields: [jadwalSesi.kelasId],
    references: [kelas.id],
  }),
}));

export const mahasiswaRelations = relations(mahasiswa, ({ many }) => ({
  irsList: many(irs),
}));

export const irsRelations = relations(irs, ({ one }) => ({
  mahasiswa: one(mahasiswa, {
    fields: [irs.mahasiswaId],
    references: [mahasiswa.id],
  }),
  kelas: one(kelas, {
    fields: [irs.kelasId],
    references: [kelas.id],
  }),
}));

// ─── Type Exports ────────────────────────────────────────────
export type MataKuliah = typeof mataKuliah.$inferSelect;
export type NewMataKuliah = typeof mataKuliah.$inferInsert;
export type Kelas = typeof kelas.$inferSelect;
export type NewKelas = typeof kelas.$inferInsert;
export type JadwalSesi = typeof jadwalSesi.$inferSelect;
export type NewJadwalSesi = typeof jadwalSesi.$inferInsert;
export type Mahasiswa = typeof mahasiswa.$inferSelect;
export type Irs = typeof irs.$inferSelect;
export type NewIrs = typeof irs.$inferInsert;
