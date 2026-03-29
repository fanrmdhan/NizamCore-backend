// ============================================================
// NizamCore - IRS Service
// Layer: Service (Business Logic)
// ============================================================

import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { IrsRepository } from "./irs.repository";
import {
  validasiClashJadwal,
  SesiWaktu,
} from "../scheduling/utils/clash-validation.util";

export interface TambahIrsDto {
  mahasiswaId: string;
  kelasId: string;
  tahunAkademik: string; // "2024/2025"
  semester: "GANJIL" | "GENAP";
}

@Injectable()
export class IrsService {
  constructor(private readonly irsRepository: IrsRepository) {}

  // ────────────────────────────────────────────────────────────
  // USE CASE: Mahasiswa mengajukan penambahan kelas ke IRS
  // ────────────────────────────────────────────────────────────
  async tambahKelasKeIrs(dto: TambahIrsDto) {
    // ── STEP 1: Pastikan kelas yang ingin diambil valid & punya jadwal
    const kelasBaru = await this.irsRepository.findKelasWithSesi(dto.kelasId);

    if (!kelasBaru) {
      throw new NotFoundException(
        `Kelas dengan ID "${dto.kelasId}" tidak ditemukan.`
      );
    }

    if (kelasBaru.sesiList.length === 0) {
      throw new BadRequestException(
        `Kelas ${kelasBaru.namaKelas} (${kelasBaru.kodeMataKuliah}) belum memiliki jadwal sesi. ` +
          `Hubungi admin untuk mengatur jadwal terlebih dahulu.`
      );
    }

    // ── STEP 2: Ambil semua kelas + sesinya yang SUDAH ada di IRS mahasiswa
    const kelasAktif = await this.irsRepository.findKelasAktifMahasiswa(
      dto.mahasiswaId,
      dto.tahunAkademik,
      dto.semester
    );

    // ── STEP 3: Cek apakah mahasiswa sudah mengambil kelas ini
    const sudahAda = kelasAktif.some((k) => k.kelasId === dto.kelasId);
    if (sudahAda) {
      throw new ConflictException(
        `Anda sudah mengambil kelas ${kelasBaru.namaKelas} ` +
          `(${kelasBaru.kodeMataKuliah}) di semester ini.`
      );
    }

    // ── STEP 4: Siapkan data sesi untuk algoritma validasi clash

    // Kumpulkan SEMUA sesi dari semua kelas yang sudah ada di IRS
    const sesiYangSudahAda: SesiWaktu[] = kelasAktif.flatMap((k) =>
      k.sesiList.map((s) => ({
        hari: s.hari,
        jamMulai: s.jamMulai,
        jamSelesai: s.jamSelesai,
        kelasId: k.kelasId,
        namaKelas: `${k.kodeMataKuliah} Kelas ${k.namaKelas}`,
      }))
    );

    // Sesi-sesi dari kelas baru yang ingin ditambahkan
    const sesiBaru: SesiWaktu[] = kelasBaru.sesiList.map((s) => ({
      hari: s.hari,
      jamMulai: s.jamMulai,
      jamSelesai: s.jamSelesai,
      kelasId: kelasBaru.kelasId,
      namaKelas: `${kelasBaru.kodeMataKuliah} Kelas ${kelasBaru.namaKelas}`,
    }));

    // ── STEP 5: Jalankan algoritma clash validation
    const hasilValidasi = validasiClashJadwal(sesiYangSudahAda, sesiBaru);

    if (hasilValidasi.bentrok) {
      // Lempar 409 Conflict dengan pesan yang informatif
      throw new ConflictException(hasilValidasi.pesanError);
    }

    // ── STEP 6: Semua validasi lolos → simpan ke database
    const irsBaruDibuat = await this.irsRepository.createIrs({
      mahasiswaId: dto.mahasiswaId,
      kelasId: dto.kelasId,
      tahunAkademik: dto.tahunAkademik,
      semester: dto.semester,
    });

    return {
      sukses: true,
      pesan: `Berhasil menambahkan ${kelasBaru.kodeMataKuliah} - ${kelasBaru.namaMataKuliah} ` +
             `Kelas ${kelasBaru.namaKelas} ke IRS Anda.`,
      data: {
        irsId: irsBaruDibuat.id,
        kelasId: kelasBaru.kelasId,
        mataKuliah: kelasBaru.namaMataKuliah,
        kelas: kelasBaru.namaKelas,
        jadwal: kelasBaru.sesiList.map((s) => ({
          hari: s.hari,
          jamMulai: s.jamMulai.slice(0, 5),
          jamSelesai: s.jamSelesai.slice(0, 5),
          ruangan: s.ruangan,
        })),
        status: "DIAJUKAN",
      },
    };
  }

  // ────────────────────────────────────────────────────────────
  // USE CASE: Lihat rekap IRS mahasiswa
  // ────────────────────────────────────────────────────────────
  async lihatIrsMahasiswa(
    mahasiswaId: string,
    tahunAkademik: string,
    semester: string
  ) {
    const kelasAktif = await this.irsRepository.findKelasAktifMahasiswa(
      mahasiswaId,
      tahunAkademik,
      semester
    );

    const totalSks = kelasAktif.length * 3; // simplified; idealnya dari field sks

    return {
      mahasiswaId,
      tahunAkademik,
      semester,
      totalMataKuliah: kelasAktif.length,
      estimasiSks: totalSks,
      daftarKelas: kelasAktif.map((k) => ({
        kelasId: k.kelasId,
        mataKuliah: `${k.kodeMataKuliah} - ${k.namaMataKuliah}`,
        kelas: k.namaKelas,
        jadwal: k.sesiList.map((s) => ({
          hari: s.hari,
          waktu: `${s.jamMulai.slice(0, 5)}–${s.jamSelesai.slice(0, 5)}`,
          ruangan: s.ruangan ?? "-",
        })),
      })),
    };
  }
}
