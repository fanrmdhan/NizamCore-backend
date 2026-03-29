// ============================================================
// NizamCore - IRS Repository
// Layer: Repository (data access only, no business logic)
// ============================================================

import { Injectable } from "@nestjs/common";
import { db } from "../db/drizzle.client"; // instance Drizzle
import { eq, and, inArray } from "drizzle-orm";
import { irs, kelas, jadwalSesi, mataKuliah } from "../db/schema";

// DTO: Data sesi lengkap yang dibutuhkan untuk validasi clash
export interface KelasWithSesi {
  kelasId: string;
  namaKelas: string;
  kodeMataKuliah: string;
  namaMataKuliah: string;
  sesiList: {
    id: string;
    hari: string;
    jamMulai: string;
    jamSelesai: string;
    durasiMenit: number;
    ruangan: string | null;
  }[];
}

@Injectable()
export class IrsRepository {
  // ─── Ambil semua kelas beserta sesi yang sudah di-IRS-kan
  //     oleh seorang mahasiswa pada semester tertentu ──────────
  async findKelasAktifMahasiswa(
    mahasiswaId: string,
    tahunAkademik: string,
    semester: string
  ): Promise<KelasWithSesi[]> {
    // Query 1: Ambil semua kelasId yang aktif di IRS mahasiswa
    const irsAktif = await db
      .select({ kelasId: irs.kelasId })
      .from(irs)
      .where(
        and(
          eq(irs.mahasiswaId, mahasiswaId),
          eq(irs.tahunAkademik, tahunAkademik),
          eq(irs.semester, semester),
          // Hanya status yang masih "aktif" (bukan DIBATALKAN/DITOLAK)
          inArray(irs.status, ["DIAJUKAN", "DISETUJUI"])
        )
      );

    if (irsAktif.length === 0) return [];

    const kelasIds = irsAktif.map((r) => r.kelasId);

    // Query 2: Ambil detail kelas + mata kuliah + semua sesi jadwal
    const rows = await db
      .select({
        kelasId: kelas.id,
        namaKelas: kelas.namaKelas,
        kodeMataKuliah: mataKuliah.kode,
        namaMataKuliah: mataKuliah.nama,
        sesiId: jadwalSesi.id,
        hari: jadwalSesi.hari,
        jamMulai: jadwalSesi.jamMulai,
        jamSelesai: jadwalSesi.jamSelesai,
        durasiMenit: jadwalSesi.durasiMenit,
        ruangan: jadwalSesi.ruangan,
      })
      .from(kelas)
      .innerJoin(mataKuliah, eq(kelas.mataKuliahId, mataKuliah.id))
      .leftJoin(jadwalSesi, eq(jadwalSesi.kelasId, kelas.id))
      .where(inArray(kelas.id, kelasIds));

    // Kelompokkan baris menjadi struktur KelasWithSesi[]
    const kelasMap = new Map<string, KelasWithSesi>();

    for (const row of rows) {
      if (!kelasMap.has(row.kelasId)) {
        kelasMap.set(row.kelasId, {
          kelasId: row.kelasId,
          namaKelas: row.namaKelas,
          kodeMataKuliah: row.kodeMataKuliah,
          namaMataKuliah: row.namaMataKuliah,
          sesiList: [],
        });
      }

      if (row.sesiId) {
        kelasMap.get(row.kelasId)!.sesiList.push({
          id: row.sesiId,
          hari: row.hari,
          jamMulai: row.jamMulai,
          jamSelesai: row.jamSelesai,
          durasiMenit: row.durasiMenit,
          ruangan: row.ruangan,
        });
      }
    }

    return Array.from(kelasMap.values());
  }

  // ─── Ambil satu kelas beserta semua sesinya ──────────────────
  async findKelasWithSesi(kelasId: string): Promise<KelasWithSesi | null> {
    const rows = await db
      .select({
        kelasId: kelas.id,
        namaKelas: kelas.namaKelas,
        kodeMataKuliah: mataKuliah.kode,
        namaMataKuliah: mataKuliah.nama,
        sesiId: jadwalSesi.id,
        hari: jadwalSesi.hari,
        jamMulai: jadwalSesi.jamMulai,
        jamSelesai: jadwalSesi.jamSelesai,
        durasiMenit: jadwalSesi.durasiMenit,
        ruangan: jadwalSesi.ruangan,
      })
      .from(kelas)
      .innerJoin(mataKuliah, eq(kelas.mataKuliahId, mataKuliah.id))
      .leftJoin(jadwalSesi, eq(jadwalSesi.kelasId, kelas.id))
      .where(eq(kelas.id, kelasId));

    if (rows.length === 0) return null;

    return {
      kelasId: rows[0].kelasId,
      namaKelas: rows[0].namaKelas,
      kodeMataKuliah: rows[0].kodeMataKuliah,
      namaMataKuliah: rows[0].namaMataKuliah,
      sesiList: rows
        .filter((r) => r.sesiId)
        .map((r) => ({
          id: r.sesiId!,
          hari: r.hari,
          jamMulai: r.jamMulai,
          jamSelesai: r.jamSelesai,
          durasiMenit: r.durasiMenit,
          ruangan: r.ruangan,
        })),
    };
  }

  // ─── Insert IRS baru ─────────────────────────────────────────
  async createIrs(data: {
    mahasiswaId: string;
    kelasId: string;
    tahunAkademik: string;
    semester: string;
  }) {
    const [result] = await db
      .insert(irs)
      .values({
        mahasiswaId: data.mahasiswaId,
        kelasId: data.kelasId,
        tahunAkademik: data.tahunAkademik,
        semester: data.semester,
        status: "DIAJUKAN",
      })
      .returning();

    return result;
  }
}
