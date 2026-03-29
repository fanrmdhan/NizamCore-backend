import { Router, Request, Response } from "express";
import { MataKuliahService } from "./mata-kuliah.service";
import { authenticate, dosenOnly } from "../../middlewares/auth.middleware";
import { sendSuccess, sendError } from "../../common/types";

const router = Router();
const service = new MataKuliahService();

// ─────────────────────────────────────────────────────────
//  GET /mata-kuliah        → Dosen & Mahasiswa (login dulu)
//  GET /mata-kuliah/:id    → Dosen & Mahasiswa (login dulu)
// ─────────────────────────────────────────────────────────

/**
 * GET /mata-kuliah
 * Ambil semua mata kuliah — bisa diakses Dosen & Mahasiswa
 */
router.get("/", authenticate, async (req: Request, res: Response) => {
  try {
    const data = await service.getAll();
    return sendSuccess(res, "Berhasil mengambil daftar mata kuliah", data);
  } catch {
    return sendError(res, "Terjadi kesalahan pada server", 500);
  }
});

/**
 * GET /mata-kuliah/:id
 * Ambil detail satu mata kuliah — bisa diakses Dosen & Mahasiswa
 */
router.get("/:id", authenticate, async (req: Request, res: Response) => {
  try {
    const data = await service.getById(req.params.id);
    return sendSuccess(res, "Berhasil mengambil data mata kuliah", data);
  } catch (error) {
    return sendError(
      res,
      error instanceof Error ? error.message : "Tidak ditemukan",
      404
    );
  }
});

// ─────────────────────────────────────────────────────────
//  POST / PATCH / DELETE   → Dosen ONLY
//  Mahasiswa akan dapat 403 Forbidden
// ─────────────────────────────────────────────────────────

/**
 * POST /mata-kuliah
 * Tambah mata kuliah baru — DOSEN ONLY
 */
router.post(
  "/",
  authenticate,
  dosenOnly,
  async (req: Request, res: Response) => {
    const { nama, kode, bobot_sks } = req.body;

    if (!nama || !kode || bobot_sks === undefined) {
      return sendError(res, "Field nama, kode, dan bobot_sks wajib diisi", 422);
    }

    try {
      const data = await service.create({ nama, kode, bobot_sks: Number(bobot_sks) });
      return sendSuccess(res, "Mata kuliah berhasil ditambahkan", data, 201);
    } catch (error) {
      return sendError(
        res,
        error instanceof Error ? error.message : "Gagal membuat mata kuliah",
        400
      );
    }
  }
);

/**
 * PATCH /mata-kuliah/:id
 * Update data mata kuliah — DOSEN ONLY
 */
router.patch(
  "/:id",
  authenticate,
  dosenOnly,
  async (req: Request, res: Response) => {
    const { nama, kode, bobot_sks } = req.body;

    try {
      const data = await service.update(req.params.id, {
        ...(nama && { nama }),
        ...(kode && { kode }),
        ...(bobot_sks !== undefined && { bobot_sks: Number(bobot_sks) }),
      });
      return sendSuccess(res, "Mata kuliah berhasil diperbarui", data);
    } catch (error) {
      const isNotFound = (error as Error).message.includes("tidak ditemukan");
      return sendError(
        res,
        error instanceof Error ? error.message : "Gagal memperbarui",
        isNotFound ? 404 : 400
      );
    }
  }
);

/**
 * DELETE /mata-kuliah/:id
 * Hapus mata kuliah — DOSEN ONLY
 */
router.delete(
  "/:id",
  authenticate,
  dosenOnly,
  async (req: Request, res: Response) => {
    try {
      await service.delete(req.params.id);
      return sendSuccess(res, "Mata kuliah berhasil dihapus");
    } catch (error) {
      const isNotFound = (error as Error).message.includes("tidak ditemukan");
      return sendError(
        res,
        error instanceof Error ? error.message : "Gagal menghapus",
        isNotFound ? 404 : 500
      );
    }
  }
);

export default router;
