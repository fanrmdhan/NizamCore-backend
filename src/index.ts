import express from "express";
import "dotenv/config";
import authRouter from "./modules/auth/auth.controller";
import mataKuliahRouter from "./modules/mata-kuliah/mata-kuliah.controller";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// ─── Global Middleware ────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Health Check ─────────────────────────────
app.get("/", (_req, res) => {
  res.json({
    success: true,
    message: "🎓 NizamCore API berjalan dengan baik!",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

// ─── Routes ───────────────────────────────────
app.use("/auth", authRouter);
app.use("/mata-kuliah", mataKuliahRouter);

// ─── 404 Handler ──────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: "Endpoint tidak ditemukan" });
});

// ─── Global Error Handler ─────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ success: false, message: "Terjadi kesalahan pada server" });
});

// ─── Start Server ─────────────────────────────
app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════╗
  ║        🎓  NizamCore API Server          ║
  ║──────────────────────────────────────────║
  ║  Status  : Running                       ║
  ║  Port    : ${PORT}                            ║
  ║  Runtime : Node.js + Express.js          ║
  ║  Database: PostgreSQL + Drizzle ORM      ║
  ╚══════════════════════════════════════════╝
  `);
});

export default app;
