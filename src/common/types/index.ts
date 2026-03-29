import { Response } from "express";

// Payload yang disimpan di dalam JWT
export interface JwtPayload {
  userId: string;
  username: string;
  role: "Dosen" | "Mahasiswa";
}

// Extend Express Request agar bisa menyimpan data user dari JWT
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

// Helper respons sukses
export const sendSuccess = <T>(
  res: Response,
  message: string,
  data?: T,
  statusCode = 200
) => {
  return res.status(statusCode).json({ success: true, message, data });
};

// Helper respons error
export const sendError = (
  res: Response,
  message: string,
  statusCode = 400
) => {
  return res.status(statusCode).json({ success: false, message });
};
