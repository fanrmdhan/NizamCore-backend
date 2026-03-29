import { MataKuliahRepository } from "./mata-kuliah.repository";
import type { MataKuliah } from "../../db/schema";

export interface CreateMataKuliahDto {
  nama: string;
  kode: string;
  bobot_sks: number;
}

export interface UpdateMataKuliahDto {
  nama?: string;
  kode?: string;
  bobot_sks?: number;
}

export class MataKuliahService {
  private repository: MataKuliahRepository;

  constructor() {
    this.repository = new MataKuliahRepository();
  }

  async getAll(): Promise<MataKuliah[]> {
    return this.repository.findAll();
  }

  async getById(id: string): Promise<MataKuliah> {
    const mk = await this.repository.findById(id);
    if (!mk) throw new Error(`Mata kuliah dengan ID '${id}' tidak ditemukan`);
    return mk;
  }

  async create(dto: CreateMataKuliahDto): Promise<MataKuliah> {
    // Validasi kode unik
    const existing = await this.repository.findByKode(dto.kode);
    if (existing) throw new Error(`Kode mata kuliah '${dto.kode}' sudah digunakan`);

    // Validasi bobot SKS
    if (dto.bobot_sks < 1 || dto.bobot_sks > 6) {
      throw new Error("Bobot SKS harus antara 1 hingga 6");
    }

    return this.repository.create(dto);
  }

  async update(id: string, dto: UpdateMataKuliahDto): Promise<MataKuliah> {
    await this.getById(id); // pastikan ada

    if (dto.kode) {
      const existing = await this.repository.findByKode(dto.kode);
      if (existing && existing.id !== id) {
        throw new Error(`Kode mata kuliah '${dto.kode}' sudah digunakan`);
      }
    }

    if (dto.bobot_sks !== undefined && (dto.bobot_sks < 1 || dto.bobot_sks > 6)) {
      throw new Error("Bobot SKS harus antara 1 hingga 6");
    }

    const updated = await this.repository.update(id, dto);
    if (!updated) throw new Error("Gagal memperbarui mata kuliah");
    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.getById(id); // pastikan ada
    const deleted = await this.repository.delete(id);
    if (!deleted) throw new Error("Gagal menghapus mata kuliah");
  }
}
