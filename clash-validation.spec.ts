// ============================================================
// NizamCore - Unit Test: Algoritma Clash Validation
// Jalankan dengan: npx jest clash-validation
// ============================================================

import {
  waktuKeMenit,
  cekOverlapDuaSesi,
  validasiClashJadwal,
  SesiWaktu,
} from "../scheduling/utils/clash-validation.util";

describe("waktuKeMenit()", () => {
  it("mengonversi '08:00' menjadi 480", () => {
    expect(waktuKeMenit("08:00")).toBe(480);
  });

  it("mengonversi '13:30' menjadi 810", () => {
    expect(waktuKeMenit("13:30")).toBe(810);
  });

  it("mengonversi '00:00' menjadi 0", () => {
    expect(waktuKeMenit("00:00")).toBe(0);
  });

  it("mengabaikan detik '09:50:00' → 590", () => {
    expect(waktuKeMenit("09:50:00")).toBe(590);
  });
});

describe("cekOverlapDuaSesi()", () => {
  // ✅ KASUS 1: Hari berbeda → pasti tidak bentrok
  it("tidak overlap jika hari berbeda meskipun jam sama", () => {
    const sesiA: SesiWaktu = { hari: "SENIN",  jamMulai: "08:00", jamSelesai: "10:00" };
    const sesiB: SesiWaktu = { hari: "SELASA", jamMulai: "08:00", jamSelesai: "10:00" };
    expect(cekOverlapDuaSesi(sesiA, sesiB)).toBe(false);
  });

  // ❌ KASUS 2: Tumpang tindih sebagian (A dimulai saat B sedang berjalan)
  it("overlap: [08:00-10:00] vs [09:00-11:00]", () => {
    const sesiA: SesiWaktu = { hari: "SELASA", jamMulai: "08:00", jamSelesai: "10:00" };
    const sesiB: SesiWaktu = { hari: "SELASA", jamMulai: "09:00", jamSelesai: "11:00" };
    expect(cekOverlapDuaSesi(sesiA, sesiB)).toBe(true);
  });

  // ❌ KASUS 3: Satu sesi sepenuhnya di dalam sesi lain
  it("overlap: [08:00-12:00] vs [09:00-10:00] (contained)", () => {
    const sesiA: SesiWaktu = { hari: "RABU", jamMulai: "08:00", jamSelesai: "12:00" };
    const sesiB: SesiWaktu = { hari: "RABU", jamMulai: "09:00", jamSelesai: "10:00" };
    expect(cekOverlapDuaSesi(sesiA, sesiB)).toBe(true);
  });

  // ✅ KASUS 4: Sesi berurutan tepat (A selesai = B mulai) → TIDAK bentrok
  it("tidak overlap: [08:00-10:00] berurutan dengan [10:00-12:00]", () => {
    const sesiA: SesiWaktu = { hari: "KAMIS", jamMulai: "08:00", jamSelesai: "10:00" };
    const sesiB: SesiWaktu = { hari: "KAMIS", jamMulai: "10:00", jamSelesai: "12:00" };
    expect(cekOverlapDuaSesi(sesiA, sesiB)).toBe(false);
  });

  // ✅ KASUS 5: Sesi A berakhir jauh sebelum B mulai
  it("tidak overlap: [08:00-09:00] vs [13:00-15:00]", () => {
    const sesiA: SesiWaktu = { hari: "JUMAT", jamMulai: "08:00", jamSelesai: "09:00" };
    const sesiB: SesiWaktu = { hari: "JUMAT", jamMulai: "13:00", jamSelesai: "15:00" };
    expect(cekOverlapDuaSesi(sesiA, sesiB)).toBe(false);
  });

  // ❌ KASUS 6: Sesi persis sama
  it("overlap: sesi yang identik persis", () => {
    const sesiA: SesiWaktu = { hari: "SENIN", jamMulai: "10:00", jamSelesai: "12:00" };
    const sesiB: SesiWaktu = { hari: "SENIN", jamMulai: "10:00", jamSelesai: "12:00" };
    expect(cekOverlapDuaSesi(sesiA, sesiB)).toBe(true);
  });
});

describe("validasiClashJadwal() — skenario IRS realistis", () => {
  // Kelas yang sudah ada di IRS:
  //   Pemrograman Web: SELASA 08:00-10:00, KAMIS 13:00-15:00
  const sesiSudahAda: SesiWaktu[] = [
    { hari: "SELASA", jamMulai: "08:00", jamSelesai: "10:00", namaKelas: "Pemweb Kelas A" },
    { hari: "KAMIS",  jamMulai: "13:00", jamSelesai: "15:00", namaKelas: "Pemweb Kelas A" },
  ];

  it("✅ LOLOS: Basis Data (Rabu 08:00-10:00) — tidak ada bentrok", () => {
    const sesiBaru: SesiWaktu[] = [
      { hari: "RABU", jamMulai: "08:00", jamSelesai: "10:00", namaKelas: "Basis Data Kelas B" },
    ];
    const hasil = validasiClashJadwal(sesiSudahAda, sesiBaru);
    expect(hasil.bentrok).toBe(false);
  });

  it("❌ DITOLAK: Jaringan Komputer (Selasa 09:00-11:00) — bentrok dengan Pemweb", () => {
    const sesiBaru: SesiWaktu[] = [
      { hari: "SELASA", jamMulai: "09:00", jamSelesai: "11:00", namaKelas: "Jarkom Kelas C" },
    ];
    const hasil = validasiClashJadwal(sesiSudahAda, sesiBaru);
    expect(hasil.bentrok).toBe(true);
    expect(hasil.pesanError).toContain("bentrok");
  });

  it("❌ DITOLAK: Mata kuliah multi-sesi, salah satu sesinya bentrok", () => {
    // Kalkulus Lanjut: SENIN 08-10 ✅, KAMIS 14:00-16:00 ❌ (bentrok dengan Pemweb 13-15)
    const sesiBaru: SesiWaktu[] = [
      { hari: "SENIN", jamMulai: "08:00", jamSelesai: "10:00", namaKelas: "Kalkulus Kelas A" },
      { hari: "KAMIS", jamMulai: "14:00", jamSelesai: "16:00", namaKelas: "Kalkulus Kelas A" },
    ];
    const hasil = validasiClashJadwal(sesiSudahAda, sesiBaru);
    expect(hasil.bentrok).toBe(true);
    // Harus terdeteksi karena KAMIS 14:00-16:00 overlap dengan KAMIS 13:00-15:00
  });

  it("✅ LOLOS: IRS kosong — tidak ada sesi yang bisa bentrok", () => {
    const sesiBaru: SesiWaktu[] = [
      { hari: "SENIN", jamMulai: "08:00", jamSelesai: "10:00", namaKelas: "Kelas Pertama" },
    ];
    const hasil = validasiClashJadwal([], sesiBaru);
    expect(hasil.bentrok).toBe(false);
  });
});
