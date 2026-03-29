import { Router, Request, Response } from "express";
import { AuthService } from "./auth.service";
import { sendSuccess, sendError } from "../../common/types";

const router = Router();
const authService = new AuthService();

/**
 * POST /auth/login
 * Login dan dapatkan JWT token
 */
router.post("/login", async (req: Request, res: Response) => {
  const { username, password } = req.body;

  // Validasi input
  if (!username || !password) {
    return sendError(res, "Username dan password wajib diisi", 422);
  }

  try {
    const result = await authService.login({ username, password });
    return sendSuccess(res, "Login berhasil", result);
  } catch (error) {
    return sendError(
      res,
      error instanceof Error ? error.message : "Login gagal",
      401
    );
  }
});

export default router;
