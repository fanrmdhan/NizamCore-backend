-- ============================================================
-- NizamCore Migration: Level 3 Advanced Scheduling
-- Jalankan dengan: npx drizzle-kit push:pg
-- atau: npx drizzle-kit generate:pg && psql < migration.sql
-- ============================================================

-- Enum Hari
CREATE TYPE hari_enum AS ENUM (
  'SENIN','SELASA','RABU','KAMIS','JUMAT','SABTU','MINGGU'
);

-- Tabel Mata Kuliah (jika belum ada dari BE-001)
CREATE TABLE IF NOT EXISTS mata_kuliah (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kode        VARCHAR(10) NOT NULL UNIQUE,
  nama        VARCHAR(255) NOT NULL,
  sks         SMALLINT NOT NULL,
  semester    SMALLINT NOT NULL,
  is_aktif    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Tabel Kelas (satu MK bisa punya banyak kelas: A, B, C...)
CREATE TABLE IF NOT EXISTS kelas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mata_kuliah_id  UUID NOT NULL REFERENCES mata_kuliah(id) ON DELETE CASCADE,
  nama_kelas      VARCHAR(10) NOT NULL,
  kapasitas       SMALLINT NOT NULL DEFAULT 40,
  dosen_id        UUID,
  created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ✅ Tabel Jadwal Sesi (BARU di Level 3)
-- Mendukung satu kelas punya BANYAK sesi per minggu
CREATE TABLE IF NOT EXISTS jadwal_sesi (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kelas_id      UUID NOT NULL REFERENCES kelas(id) ON DELETE CASCADE,
  hari          hari_enum NOT NULL,
  jam_mulai     TIME NOT NULL,
  jam_selesai   TIME NOT NULL,
  durasi_menit  SMALLINT NOT NULL,
  ruangan       VARCHAR(50),
  created_at    TIMESTAMP NOT NULL DEFAULT NOW(),

  -- Constraint: jam_selesai harus setelah jam_mulai
  CONSTRAINT chk_waktu_valid CHECK (jam_selesai > jam_mulai)
);

-- Index untuk optimasi query pengecekan bentrok
CREATE INDEX idx_jadwal_hari       ON jadwal_sesi(hari);
CREATE INDEX idx_jadwal_kelas_hari ON jadwal_sesi(kelas_id, hari);

-- Tabel Mahasiswa (jika belum ada)
CREATE TABLE IF NOT EXISTS mahasiswa (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nim         VARCHAR(20) NOT NULL UNIQUE,
  nama        VARCHAR(255) NOT NULL,
  angkatan    SMALLINT NOT NULL,
  is_aktif    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Tabel IRS
CREATE TABLE IF NOT EXISTS irs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mahasiswa_id    UUID NOT NULL REFERENCES mahasiswa(id) ON DELETE CASCADE,
  kelas_id        UUID NOT NULL REFERENCES kelas(id) ON DELETE CASCADE,
  tahun_akademik  VARCHAR(9) NOT NULL,
  semester        VARCHAR(6) NOT NULL CHECK (semester IN ('GANJIL','GENAP')),
  status          VARCHAR(20) NOT NULL DEFAULT 'DIAJUKAN'
                  CHECK (status IN ('DIAJUKAN','DISETUJUI','DITOLAK','DIBATALKAN')),
  created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMP NOT NULL DEFAULT NOW(),

  UNIQUE (mahasiswa_id, kelas_id, tahun_akademik, semester)
);

CREATE INDEX idx_irs_mahasiswa_semester
  ON irs(mahasiswa_id, tahun_akademik, semester);

-- ─── Contoh Data untuk Testing ───────────────────────────────
INSERT INTO mata_kuliah (kode, nama, sks, semester) VALUES
  ('IF301', 'Pemrograman Web', 3, 5),
  ('IF302', 'Basis Data Lanjut', 3, 5),
  ('IF303', 'Jaringan Komputer', 3, 5);

INSERT INTO kelas (id, mata_kuliah_id, nama_kelas) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001',
   (SELECT id FROM mata_kuliah WHERE kode='IF301'), 'A'),
  ('aaaaaaaa-0000-0000-0000-000000000002',
   (SELECT id FROM mata_kuliah WHERE kode='IF302'), 'A'),
  ('aaaaaaaa-0000-0000-0000-000000000003',
   (SELECT id FROM mata_kuliah WHERE kode='IF303'), 'A');

-- Pemrograman Web Kelas A: 2 sesi per minggu
INSERT INTO jadwal_sesi (kelas_id, hari, jam_mulai, jam_selesai, durasi_menit, ruangan) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001', 'SELASA', '08:00', '10:00', 120, 'Lab 01'),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'KAMIS',  '13:00', '15:00', 120, 'Lab 01');

-- Basis Data Lanjut Kelas A: 1 sesi
INSERT INTO jadwal_sesi (kelas_id, hari, jam_mulai, jam_selesai, durasi_menit, ruangan) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000002', 'RABU', '08:00', '10:00', 120, 'R.201');

-- Jaringan Komputer Kelas A: bentrok dengan Pemweb (SELASA 09-11)
INSERT INTO jadwal_sesi (kelas_id, hari, jam_mulai, jam_selesai, durasi_menit, ruangan) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000003', 'SELASA', '09:00', '11:00', 120, 'R.301');
