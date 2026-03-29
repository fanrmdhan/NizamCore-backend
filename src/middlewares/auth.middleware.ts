import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { JwtPayload, sendError } from "../common/types";

// Middleware 1: Verifikasi JWT dari header Authorization
export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return sendError(res, "Token tidak ditemukan. Silakan login terlebih dahulu.", 401);
  }

  const token = authHeader.split(" ")[1];

  try {
    const secret = process.env.JWT_SECRET ?? "fallback_secret";
    const decoded = jwt.verify(token, secret) as JwtPayload;
    req.user = decoded; // inject user ke request
    next();
  } catch {
    return sendError(res, "Token tidak valid atau sudah kadaluarsa.", 401);
  }
};

// Middleware 2: Guard khusus untuk role Dosen saja
export const dosenOnly = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return sendError(res, "Tidak terautentikasi.", 401);
  }

  if (req.user.role !== "Dosen") {
    return sendError(res, "Akses ditolak. Fitur ini hanya dapat digunakan oleh Dosen.", 403);
  }

  next();
};
