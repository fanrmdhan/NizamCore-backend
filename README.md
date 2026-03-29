# 🎓 NizamCore — Backend API

Backend Sistem Informasi Akademik sederhana yang dibangun sebagai tugas mata kuliah Software Engineering. Proyek ini mengimplementasikan REST API untuk manajemen mata kuliah dengan sistem autentikasi dan otorisasi berbasis role.

---

## 🛠️ Tech Stack

| Komponen         | Teknologi                              |
|------------------|----------------------------------------|
| Runtime          | Node.js                                |
| Framework        | [Express.js](https://expressjs.com/)   |
| Database         | PostgreSQL                             |
| ORM              | Drizzle ORM                            |
| Autentikasi      | JWT (JSON Web Token)                   |
| Password Hashing | bcryptjs                               |
| Language         | TypeScript                             |

---

## 🏗️ Arsitektur: Clean Architecture

Proyek ini menerapkan **Clean Architecture** dengan pemisahan tanggung jawab yang jelas:

```
src/
├── index.ts                              # Entry point — inisialisasi server & register routes
│
├── db/
│   ├── index.ts                          # Koneksi database (Drizzle + postgres.js)
│   ├── migrate.ts                        # Script runner migrasi
│   ├── seed.ts                           # Script seeder data awal
│   ├── migrations/                       # File SQL hasil generate Drizzle Kit
│   └── schema/
│       ├── users.schema.ts               # Skema tabel `users`
│       ├── mata-kuliah.schema.ts         # Skema tabel `mata_kuliah`
│       └── index.ts                      # Re-export semua skema
│
├── common/
│   └── types/
│       └── index.ts                      # Shared types & helper respons API
│
├── middlewares/
│   └── auth.middleware.ts                # JWT verify + dosenOnly guard
│
└── modules/
    ├── auth/
    │   ├── auth.repository.ts            # [DATA LAYER]     Query database untuk user
    │   ├── auth.service.ts               # [BUSINESS LAYER] Logika login & verifikasi password
    │   └── auth.controller.ts            # [HTTP LAYER]     Route POST /auth/login
    │
    └── mata-kuliah/
        ├── mata-kuliah.repository.ts     # [DATA LAYER]     CRUD query database
        ├── mata-kuliah.service.ts        # [BUSINESS LAYER] Validasi & business rules
        └── mata-kuliah.controller.ts     # [HTTP LAYER]     Semua route /mata-kuliah
```

### Alur Request

```
HTTP Request
    │
    ▼
Controller (Express Router)
    │  menerima request, validasi input dasar
    ▼
Middleware (authenticate + dosenOnly)
    │  verifikasi JWT, cek role
    ▼
Service (Business Logic)
    │  validasi aturan bisnis (kode unik, SKS 1-6, dll.)
    ▼
Repository (Data Access)
    │  eksekusi query SQL via Drizzle ORM
    ▼
PostgreSQL Database
```

---

## 🗄️ Skema Database

### Tabel `users`

| Kolom           | Tipe         | Keterangan                          |
|-----------------|--------------|-------------------------------------|
| `id`            | UUID         | Primary key, auto-generate          |
| `username`      | VARCHAR(100) | Unik, tidak boleh kosong            |
| `password_hash` | VARCHAR(255) | Hash bcrypt dari password           |
| `role`          | ENUM         | Nilai: `'Dosen'` atau `'Mahasiswa'` |
| `created_at`    | TIMESTAMP    | Waktu dibuat, default `NOW()`       |

### Tabel `mata_kuliah`

| Kolom        | Tipe         | Keterangan                            |
|--------------|--------------|---------------------------------------|
| `id`         | UUID         | Primary key, auto-generate            |
| `nama`       | VARCHAR(200) | Nama mata kuliah                      |
| `kode`       | VARCHAR(20)  | Kode unik mata kuliah (misal: CS101)  |
| `bobot_sks`  | INTEGER      | Jumlah SKS (validasi: 1–6)            |
| `created_at` | TIMESTAMP    | Waktu dibuat                          |
| `updated_at` | TIMESTAMP    | Waktu terakhir diperbarui             |

---

## 🔐 Sistem Autentikasi & Otorisasi

### Cara Kerja JWT

1. User melakukan `POST /auth/login` dengan `username` dan `password`.
2. Server memverifikasi kredensial, lalu menerbitkan **JWT** yang berisi payload:
   ```json
   {
     "userId": "uuid-...",
     "username": "dosen_nizam",
     "role": "Dosen"
   }
   ```
3. Client menyimpan token dan mengirimkannya di setiap request berikutnya via header:
   ```
   Authorization: Bearer <token>
   ```
4. Middleware `authenticate` memverifikasi token, `dosenOnly` mengecek role sebelum request mencapai handler.

### Matrix Akses Endpoint

| Endpoint                  | Mahasiswa | Dosen |
|---------------------------|:---------:|:-----:|
| `POST /auth/login`        | ✅        | ✅    |
| `GET /mata-kuliah`        | ✅        | ✅    |
| `GET /mata-kuliah/:id`    | ✅        | ✅    |
| `POST /mata-kuliah`       | ❌ 403    | ✅    |
| `PATCH /mata-kuliah/:id`  | ❌ 403    | ✅    |
| `DELETE /mata-kuliah/:id` | ❌ 403    | ✅    |

---

## 📋 Dokumentasi Endpoint API

### Auth

#### `POST /auth/login`
Login dan dapatkan JWT token.

**Request Body:**
```json
{
  "username": "dosen_nizam",
  "password": "password123"
}
```

**Response Sukses (200):**
```json
{
  "success": true,
  "message": "Login berhasil",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "username": "dosen_nizam",
      "role": "Dosen"
    }
  }
}
```

**Response Gagal (401):**
```json
{
  "success": false,
  "message": "Username atau password salah"
}
```

---

### Mata Kuliah

#### `GET /mata-kuliah` — 🔓 Dosen & Mahasiswa
Mengambil seluruh daftar mata kuliah.

**Response (200):**
```json
{
  "success": true,
  "message": "Berhasil mengambil daftar mata kuliah",
  "data": [
    {
      "id": "uuid...",
      "nama": "Pemrograman Web",
      "kode": "CS301",
      "bobot_sks": 3,
      "created_at": "2025-01-01T00:00:00.000Z",
      "updated_at": "2025-01-01T00:00:00.000Z"
    }
  ]
}
```

#### `GET /mata-kuliah/:id` — 🔓 Dosen & Mahasiswa
Mengambil detail satu mata kuliah berdasarkan ID.

#### `POST /mata-kuliah` — 🔒 Dosen Only
Menambahkan mata kuliah baru.

**Request Body:**
```json
{
  "nama": "Pemrograman Web",
  "kode": "CS301",
  "bobot_sks": 3
}
```

#### `PATCH /mata-kuliah/:id` — 🔒 Dosen Only
Memperbarui data mata kuliah (partial update, semua field opsional).

**Request Body:**
```json
{
  "nama": "Pemrograman Web Lanjut",
  "bobot_sks": 4
}
```

#### `DELETE /mata-kuliah/:id` — 🔒 Dosen Only
Menghapus mata kuliah berdasarkan ID.

---

## 🚀 Cara Menjalankan di Lokal

### Prasyarat

Pastikan sudah terinstall:
- **[Node.js](https://nodejs.org/)** v18+
- **[npm](https://www.npmjs.com/)** (sudah include bersama Node.js)
- **PostgreSQL** v14+ — aktif dan berjalan
- **Git**

### Langkah 1 — Clone Repository

```bash
git clone <url-repository-anda>
cd nizamcore
```

### Langkah 2 — Install Dependensi

```bash
npm install
```

### Langkah 3 — Konfigurasi Environment

```bash
# Windows
copy .env.example .env

# Mac / Linux
cp .env.example .env
```

Buka file `.env` dan sesuaikan isinya:

```env
DATABASE_URL=postgres://postgres:PASSWORD_KAMU@localhost:5432/nizamcore
JWT_SECRET=ganti_dengan_string_panjang_dan_acak
JWT_EXPIRES_IN=7d
PORT=3000
```

### Langkah 4 — Buat Database

Buka **pgAdmin 4**, lalu:
1. Klik kanan **Databases** → **Create** → **Database**
2. Isi nama: `nizamcore`
3. Klik **Save**

Atau via terminal (jika psql sudah ada di PATH):
```bash
psql -U postgres -c "CREATE DATABASE nizamcore;"
```

### Langkah 5 — Generate & Jalankan Migrasi

```bash
# Generate file SQL dari skema Drizzle
npm run db:generate

# Jalankan migrasi ke database
npm run db:migrate
```

### Langkah 6 — Seed Data Awal

```bash
npm run db:seed
```

Akun yang tersedia setelah seeding:

| Username          | Password      | Role       |
|-------------------|---------------|------------|
| `dosen_nizam`     | `password123` | Dosen      |
| `mahasiswa_ali`   | `password123` | Mahasiswa  |

### Langkah 7 — Jalankan Server

```bash
# Mode development (auto-restart saat file berubah)
npm run dev

# Mode production
npm run build
npm run start
```

Server berjalan di: **`http://localhost:3000`**

---

## 🧪 Contoh Testing dengan cURL

### 1. Login sebagai Dosen

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"username\": \"dosen_nizam\", \"password\": \"password123\"}"
```

Simpan nilai `token` dari response.

### 2. Tambah Mata Kuliah (Dosen)

```bash
curl -X POST http://localhost:3000/mata-kuliah \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN_DOSEN>" \
  -d "{\"nama\": \"Pemrograman Web\", \"kode\": \"CS301\", \"bobot_sks\": 3}"
```

### 3. Lihat Semua Mata Kuliah

```bash
curl http://localhost:3000/mata-kuliah \
  -H "Authorization: Bearer <TOKEN>"
```

### 4. Uji Penolakan Akses Mahasiswa

```bash
# Login sebagai mahasiswa
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"username\": \"mahasiswa_ali\", \"password\": \"password123\"}"

# Coba POST (seharusnya 403 Forbidden)
curl -X POST http://localhost:3000/mata-kuliah \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN_MAHASISWA>" \
  -d "{\"nama\": \"Test\", \"kode\": \"XX999\", \"bobot_sks\": 2}"
```

**Expected Response (403):**
```json
{
  "success": false,
  "message": "Akses ditolak. Fitur ini hanya dapat digunakan oleh Dosen."
}
```

### 5. Update Mata Kuliah (Dosen)

```bash
curl -X PATCH http://localhost:3000/mata-kuliah/<ID> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN_DOSEN>" \
  -d "{\"bobot_sks\": 4}"
```

### 6. Hapus Mata Kuliah (Dosen)

```bash
curl -X DELETE http://localhost:3000/mata-kuliah/<ID> \
  -H "Authorization: Bearer <TOKEN_DOSEN>"
```

---

## 📦 Ringkasan Perintah

| Perintah              | Fungsi                                         |
|-----------------------|------------------------------------------------|
| `npm install`         | Install semua dependensi                       |
| `npm run dev`         | Jalankan server development (hot-reload)       |
| `npm run build`       | Compile TypeScript ke JavaScript               |
| `npm run start`       | Jalankan server production                     |
| `npm run db:generate` | Generate file migrasi SQL dari skema Drizzle   |
| `npm run db:migrate`  | Jalankan migrasi ke database                   |
| `npm run db:seed`     | Masukkan data awal (user Dosen & Mahasiswa)    |
| `npm run db:studio`   | Buka Drizzle Studio (GUI database di browser)  |

---

## 👤 Informasi Proyek

- **Mata Kuliah:** Software Engineering
- **Nama Proyek:** NizamCore
- **Deskripsi:** Backend sistem informasi akademik dengan fitur autentikasi JWT dan manajemen mata kuliah berbasis role menggunakan Express.js + Drizzle ORM + PostgreSQL.
