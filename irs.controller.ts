// ============================================================
// NizamCore - IRS Controller
// Layer: Controller (HTTP, DTO validation, response shape)
// ============================================================

import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { IsString, IsUUID, IsEnum, Matches } from "class-validator";
import { IrsService } from "./irs.service";

// ─── Request DTO ─────────────────────────────────────────────
class TambahIrsRequestDto {
  @IsUUID()
  mahasiswaId: string;

  @IsUUID()
  kelasId: string;

  @Matches(/^\d{4}\/\d{4}$/, {
    message: 'Format tahunAkademik harus "YYYY/YYYY". Contoh: "2024/2025"',
  })
  tahunAkademik: string;

  @IsEnum(["GANJIL", "GENAP"], {
    message: 'Semester harus "GANJIL" atau "GENAP"',
  })
  semester: "GANJIL" | "GENAP";
}

// ─── Controller ──────────────────────────────────────────────
@Controller("api/irs")
export class IrsController {
  constructor(private readonly irsService: IrsService) {}

  // POST /api/irs
  // Tambah kelas ke IRS mahasiswa (dengan validasi clash jadwal)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async tambahKelasKeIrs(@Body() dto: TambahIrsRequestDto) {
    return this.irsService.tambahKelasKeIrs(dto);
  }

  // GET /api/irs/:mahasiswaId?tahunAkademik=2024/2025&semester=GANJIL
  // Lihat rekap IRS seorang mahasiswa
  @Get(":mahasiswaId")
  async lihatIrs(
    @Param("mahasiswaId") mahasiswaId: string,
    @Query("tahunAkademik") tahunAkademik: string,
    @Query("semester") semester: string
  ) {
    return this.irsService.lihatIrsMahasiswa(
      mahasiswaId,
      tahunAkademik,
      semester
    );
  }
}

// ============================================================
// NizamCore - Jadwal Sesi Controller
// Endpoint untuk CRUD sesi jadwal sebuah kelas
// ============================================================

import {
  Body as BodyDec,
  Controller as Ctrl,
  Delete,
  Get as GetDec,
  Param as ParamDec,
  Post as PostDec,
  Put,
  HttpCode as HttpCodeDec,
  HttpStatus as HttpStatusEnum,
} from "@nestjs/common";
import { IsString as IsStr, IsInt, Min, Max, IsOptional } from "class-validator";
import { JadwalSesiService } from "./jadwal-sesi.service";

class BuatSesiDto {
  @IsUUID()
  kelasId: string;

  @IsEnum(["SENIN","SELASA","RABU","KAMIS","JUMAT","SABTU","MINGGU"])
  hari: string;

  @Matches(/^\d{2}:\d{2}$/, { message: 'Format: "HH:MM"' })
  jamMulai: string;

  @IsInt()
  @Min(30)
  @Max(300)
  durasiMenit: number; // sistem hitung jamSelesai otomatis

  @IsOptional()
  @IsStr()
  ruangan?: string;
}

@Ctrl("api/jadwal-sesi")
export class JadwalSesiController {
  constructor(private readonly jadwalSesiService: JadwalSesiService) {}

  // POST /api/jadwal-sesi
  // Tambah sesi baru untuk sebuah kelas
  @PostDec()
  @HttpCodeDec(HttpStatusEnum.CREATED)
  async buatSesi(@BodyDec() dto: BuatSesiDto) {
    return this.jadwalSesiService.buatSesi(dto);
  }

  // GET /api/jadwal-sesi/kelas/:kelasId
  // Lihat semua sesi jadwal sebuah kelas
  @GetDec("kelas/:kelasId")
  async lihatSesiByKelas(@ParamDec("kelasId") kelasId: string) {
    return this.jadwalSesiService.findByKelas(kelasId);
  }

  // DELETE /api/jadwal-sesi/:sesiId
  // Hapus satu sesi jadwal
  @Delete(":sesiId")
  @HttpCodeDec(HttpStatusEnum.OK)
  async hapusSesi(@ParamDec("sesiId") sesiId: string) {
    return this.jadwalSesiService.hapusSesi(sesiId);
  }
}
