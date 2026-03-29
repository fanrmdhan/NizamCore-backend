// ============================================================
// NizamCore - Schedule Clash Validation Utility
// Level 3: Advanced Scheduling
//
// 📐 PENJELASAN ALGORITMA OVERLAP WAKTU
// ─────────────────────────────────────────────────────────────
// Untuk mendeteksi dua sesi jadwal yang beririsan, kita
// menggunakan "Interval Overlap Theorem":
//
//   Dua interval [A_mulai, A_selesai] dan [B_mulai, B_selesai]
//   OVERLAP jika dan hanya jika:
//
//       A_mulai < B_selesai  AND  B_mulai < A_selesai
//
//   Kebalikannya: dua interval TIDAK overlap jika:
//       A_selesai <= B_mulai  OR  B_selesai <= A_mulai
//   (A selesai sebelum B mulai, atau B selesai sebelum A mulai)
//
// Langkah Implementasi:
//   1. Konversi "HH:MM" → menit sejak tengah malam (integer)
//      Contoh: "08:30" → 8*60+30 = 510 menit
//   2. Bentuk pasangan (hari, mulai_menit, selesai_menit)
//   3. Bandingkan hanya sesi yang harinya SAMA dulu
//      (sesi Senin vs Selasa tidak mungkin bentrok)
//   4. Terapkan formula overlap di atas
// ============================================================

export interface SesiWaktu {
  hari: string;       // "SENIN" | "SELASA" | ...
  jamMulai: string;   // "HH:MM" atau "HH:MM:SS"
  jamSelesai: string; // "HH:MM" atau "HH:MM:SS"
  kelasId?: string;   // optional: untuk pesan error yang lebih informatif
  namaKelas?: string;
}

export interface HasilValidasi {
  bentrok: boolean;
  pesanError?: string;
  detail?: {
    sesiA: SesiWaktu;
    sesiB: SesiWaktu;
  };
}

// ─── Helper: Konversi "HH:MM[:SS]" → menit sejak tengah malam
// Contoh: "08:30"    → 510
//         "13:00:00" → 780
//         "09:50"    → 590
export function waktuKeMenit(waktu: string): number {
  const [jam, menit] = waktu.split(":").map(Number);
  return jam * 60 + menit;
}

// ─── Core: Cek apakah DUA sesi waktu beririsan ───────────────
// Menggunakan Interval Overlap Theorem.
// Catatan: kita pakai "<" bukan "<=" agar kelas yang berurutan
// tepat (08:00-10:00 dan 10:00-12:00) TIDAK dianggap bentrok.
export function cekOverlapDuaSesi(
  sesiA: SesiWaktu,
  sesiB: SesiWaktu
): boolean {
  // Langkah 1: Harus hari yang sama. Jika berbeda hari → pasti tidak bentrok.
  if (sesiA.hari !== sesiB.hari) return false;

  // Langkah 2: Konversi ke menit
  const aMulai    = waktuKeMenit(sesiA.jamMulai);
  const aSelesai  = waktuKeMenit(sesiA.jamSelesai);
  const bMulai    = waktuKeMenit(sesiB.jamMulai);
  const bSelesai  = waktuKeMenit(sesiB.jamSelesai);

  // Langkah 3: Interval Overlap Theorem
  //   Overlap jika: aMulai < bSelesai AND bMulai < aSelesai
  return aMulai < bSelesai && bMulai < aSelesai;
}

// ─── Main: Validasi sesi baru terhadap daftar sesi yang sudah ada
// Mengembalikan hasil pertama yang bentrok (fail-fast).
export function validasiClashJadwal(
  sesiSaatIniDiambil: SesiWaktu[], // semua sesi dari kelas yang SUDAH ada di IRS
  sesiBaruDiajukan: SesiWaktu[]    // semua sesi dari kelas yang INGIN ditambahkan
): HasilValidasi {
  for (const sesiAda of sesiSaatIniDiambil) {
    for (const sesiBaru of sesiBaruDiajukan) {
      if (cekOverlapDuaSesi(sesiAda, sesiBaru)) {
        // Format pesan error yang informatif
        const formatWaktu = (s: SesiWaktu) =>
          `${s.hari} ${s.jamMulai.slice(0, 5)}–${s.jamSelesai.slice(0, 5)}`;

        return {
          bentrok: true,
          pesanError:
            `Jadwal bentrok! Sesi ${formatWaktu(sesiBaru)}` +
            (sesiBaru.namaKelas ? ` (${sesiBaru.namaKelas})` : "") +
            ` bertabrakan dengan sesi ${formatWaktu(sesiAda)}` +
            (sesiAda.namaKelas ? ` (${sesiAda.namaKelas})` : "") +
            ` yang sudah ada di IRS Anda.`,
          detail: { sesiA: sesiAda, sesiB: sesiBaru },
        };
      }
    }
  }

  return { bentrok: false };
}

// ─── Ilustrasi Algoritma (untuk keperluan dokumentasi) ──────
//
// Contoh:
//   Sesi A (Pemrograman Web):   SELASA 08:00–10:00 → [480, 600]
//   Sesi B (Basis Data):        SELASA 09:00–11:00 → [540, 660]
//
//   Cek: 480 < 660 → ✅   DAN   540 < 600 → ✅
//   Hasil: OVERLAP → ❌ Ditolak
//
//   Sesi A (Pemrograman Web):   SELASA 08:00–10:00 → [480, 600]
//   Sesi C (Jaringan Komputer): SELASA 10:00–12:00 → [600, 720]
//
//   Cek: 480 < 720 → ✅   DAN   600 < 600 → ❌ (TIDAK)
//   Hasil: TIDAK overlap → ✅ Diizinkan
//
//   Sesi A (Pemrograman Web):   SELASA 08:00–10:00 → [480, 600]
//   Sesi D (Kalkulus):          KAMIS  08:00–10:00 → [480, 600]
//
//   Cek hari: SELASA ≠ KAMIS → langsung TIDAK overlap → ✅ Diizinkan
