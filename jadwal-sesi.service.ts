// ============================================================
// NizamCore - JadwalSesi Service
// Layer: Service — mengelola sesi jadwal kelas
// ============================================================

import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import { db } from "../db/drizzle.client";
import { eq } from "drizzle-orm";
import { jadwalSesi, kelas } from "../db/schema";

export interface BuatSesiDto {
  kelasId: string;
  hari: string;
  jamMulai: string;   // "HH:MM"
  durasiMenit: number;
  ruangan?: string;
}

@Injectable()
export class JadwalSesiService {
  // ─── Helper: tambahkan menit ke string waktu "HH:MM" ────────
  private tambahMenit(waktu: string, menit: number): string {
    const [jam, min] = waktu.split(":").map(Number);
    const totalMenit = jam * 60 + min + menit;
    const jamBaru = Math.floor(totalMenit / 60);
    const menitBaru = totalMenit % 60;

    if (jamBaru >= 24) {
      throw new BadRequestException(
        `Jadwal melewati tengah malam (jam ${jamBaru}:${menitBaru}). ` +
        `Durasi terlalu panjang atau jam mulai terlalu larut.`
      );
    }

    return `${String(jamBaru).padStart(2, "0")}:${String(menitBaru).padStart(2, "0")}`;
  }

  // ─── Buat sesi baru ──────────────────────────────────────────
  async buatSesi(dto: BuatSesiDto) {
    // Pastikan kelas ada
    const [kelasData] = await db
      .select()
      .from(kelas)
      .where(eq(kelas.id, dto.kelasId))
      .limit(1);

    if (!kelasData) {
      throw new NotFoundException(`Kelas ID "${dto.kelasId}" tidak ditemukan.`);
    }

    // Hitung jamSelesai dari jamMulai + durasi
    const jamSelesai = this.tambahMenit(dto.jamMulai, dto.durasiMenit);

    // Format ke "HH:MM:SS" (format Drizzle TIME)
    const jamMulaiDB   = `${dto.jamMulai}:00`;
    const jamSelesaiDB = `${jamSelesai}:00`;

    const [sesiBaruDibuat] = await db
      .insert(jadwalSesi)
      .values({
        kelasId:     dto.kelasId,
        hari:        dto.hari as any,
        jamMulai:    jamMulaiDB,
        jamSelesai:  jamSelesaiDB,
        durasiMenit: dto.durasiMenit,
        ruangan:     dto.ruangan ?? null,
      })
      .returning();

    return {
      sukses: true,
      pesan: `Sesi ${dto.hari} ${dto.jamMulai}–${jamSelesai} berhasil ditambahkan.`,
      data: {
        id:          sesiBaruDibuat.id,
        kelasId:     sesiBaruDibuat.kelasId,
        hari:        sesiBaruDibuat.hari,
        jamMulai:    sesiBaruDibuat.jamMulai.slice(0, 5),
        jamSelesai:  sesiBaruDibuat.jamSelesai.slice(0, 5),
        durasiMenit: sesiBaruDibuat.durasiMenit,
        ruangan:     sesiBaruDibuat.ruangan,
      },
    };
  }

  // ─── Lihat semua sesi sebuah kelas ──────────────────────────
  async findByKelas(kelasId: string) {
    const sesiList = await db
      .select()
      .from(jadwalSesi)
      .where(eq(jadwalSesi.kelasId, kelasId))
      .orderBy(jadwalSesi.hari, jadwalSesi.jamMulai);

    return {
      kelasId,
      totalSesi: sesiList.length,
      sesiList: sesiList.map((s) => ({
        id:          s.id,
        hari:        s.hari,
        jamMulai:    s.jamMulai.slice(0, 5),
        jamSelesai:  s.jamSelesai.slice(0, 5),
        durasiMenit: s.durasiMenit,
        ruangan:     s.ruangan ?? "-",
      })),
    };
  }

  // ─── Hapus satu sesi ─────────────────────────────────────────
  async hapusSesi(sesiId: string) {
    const [dihapus] = await db
      .delete(jadwalSesi)
      .where(eq(jadwalSesi.id, sesiId))
      .returning();

    if (!dihapus) {
      throw new NotFoundException(`Sesi ID "${sesiId}" tidak ditemukan.`);
    }

    return { sukses: true, pesan: "Sesi jadwal berhasil dihapus.", id: sesiId };
  }
}
