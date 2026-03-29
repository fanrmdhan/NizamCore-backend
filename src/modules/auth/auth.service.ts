import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { AuthRepository } from "./auth.repository";
import { JwtPayload } from "../../common/types";

export interface LoginDto {
  username: string;
  password: string;
}

export interface LoginResult {
  token: string;
  user: {
    id: string;
    username: string;
    role: "Dosen" | "Mahasiswa";
  };
}

// Service: bertanggung jawab pada business logic autentikasi
export class AuthService {
  private repository: AuthRepository;

  constructor() {
    this.repository = new AuthRepository();
  }

  async login(dto: LoginDto): Promise<LoginResult> {
    // 1. Cari user berdasarkan username
    const user = await this.repository.findByUsername(dto.username);
    if (!user) {
      throw new Error("Username atau password salah");
    }

    // 2. Verifikasi password dengan bcrypt
    const isValid = await bcrypt.compare(dto.password, user.password_hash);
    if (!isValid) {
      throw new Error("Username atau password salah");
    }

    // 3. Buat JWT payload dengan role di dalamnya
    const payload: JwtPayload = {
      userId: user.id,
      username: user.username,
      role: user.role,
    };

    // 4. Sign token
    const secret = process.env.JWT_SECRET ?? "fallback_secret";
    const expiresIn = process.env.JWT_EXPIRES_IN ?? "7d";
    const token = jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);

    return {
      token,
      user: { id: user.id, username: user.username, role: user.role },
    };
  }
}
