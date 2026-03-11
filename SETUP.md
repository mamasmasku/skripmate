# 🚀 ScriptMate — Panduan Setup Lengkap

## Struktur File Baru

```
project/
├── api/
│   ├── auth.ts          ← Login, ganti password
│   ├── credits.ts       ← Kelola kredit & user (admin)
│   ├── gemini.ts        ← Generate prompt (dimodifikasi)
│   ├── payment.ts       ← Midtrans payment gateway
│   └── setup.ts         ← Buat admin pertama (sekali pakai)
├── lib/
│   ├── supabase.ts      ← Supabase client
│   └── jwtHelper.ts     ← JWT helper
├── src/
│   ├── hooks/
│   │   └── useAuth.ts
│   ├── components/
│   │   ├── LoginScreen.tsx
│   │   ├── CreditDisplay.tsx
│   │   ├── BuyCreditsModal.tsx
│   │   └── AdminPanel.tsx
│   └── App.tsx          ← Dimodifikasi
├── supabase/migrations/
│   └── 001_init.sql
├── vercel.json
├── package.json         ← Diupdate (tambah dependencies baru)
└── .env.example
```

---

## 📋 Step 1 — Setup Supabase

1. Buka [supabase.com](https://supabase.com) → buat project baru
2. Masuk ke **SQL Editor**
3. Copy-paste isi file `supabase/migrations/001_init.sql` → klik **Run**
4. Catat:
   - **Project URL**: `https://xxxxxxxx.supabase.co` → `SUPABASE_URL`
   - **service_role key** (di Settings → API): → `SUPABASE_SERVICE_KEY`

---

## 📋 Step 2 — Setup Midtrans

1. Daftar di [midtrans.com](https://midtrans.com)
2. Masuk ke **Sandbox** dulu untuk testing
3. Di Settings → Access Keys:
   - Catat **Server Key** → `MIDTRANS_SERVER_KEY`
   - Catat **Client Key** → `VITE_MIDTRANS_CLIENT_KEY`
4. Di Settings → Configuration → Notification URL, isi:
   ```
   https://nama-app.vercel.app/api/payment
   ```
   Dengan body: `{ "action": "webhook" }`
   
   **Catatan**: Midtrans webhook mengirim POST ke URL kamu. Pastikan URL benar.

---

## 📋 Step 3 — Setup Environment Variables di Vercel

Di Vercel Dashboard → Project → Settings → Environment Variables, tambahkan:

| Variable | Nilai |
|----------|-------|
| `SUPABASE_URL` | URL project Supabase |
| `SUPABASE_SERVICE_KEY` | service_role key dari Supabase |
| `JWT_SECRET` | String acak panjang (min 64 char) |
| `GEMINI_API_KEY` | API key di LiteLLM proxy kamu |
| `MIDTRANS_SERVER_KEY` | Server key dari Midtrans |
| `MIDTRANS_IS_PRODUCTION` | `false` (sandbox) atau `true` (production) |
| `SETUP_SECRET_KEY` | String rahasia untuk buat admin pertama |
| `APP_URL` | URL Vercel app kamu |
| `VITE_MIDTRANS_CLIENT_KEY` | Client key dari Midtrans |

---

## 📋 Step 4 — Deploy ke Vercel

```bash
# Install dependencies baru dulu
npm install

# Push ke GitHub
git add .
git commit -m "feat: add auth, credits, payment system"
git push origin main
```

Vercel akan auto-deploy dari GitHub.

---

## 📋 Step 5 — Buat Admin Pertama

Setelah deploy, panggil endpoint setup **sekali saja**:

```bash
curl -X POST https://nama-app.vercel.app/api/setup \
  -H "Content-Type: application/json" \
  -d '{
    "setupKey": "isi_SETUP_SECRET_KEY_kamu",
    "username": "admin",
    "password": "password_admin_kamu"
  }'
```

Atau bisa pakai Postman/Insomnia/Thunder Client.

---

## 📋 Step 6 — Mulai Gunakan

1. Login dengan akun admin yang baru dibuat
2. Buka **Panel Admin** (ikon ⚙️ di header)
3. Tab **Buat User** → buat akun untuk user
4. Tab **Top Up** → isi kredit manual
5. User bisa beli kredit sendiri lewat tombol **+ Top Up**

---

## 🔄 Cara Kerja Sistem

### Varian Free
- Login dengan akun yang dibuat admin
- Hanya Mode **Bebas** yang aktif
- Wajib isi Gemini API Key sendiri (tersimpan di browser)
- Tidak memerlukan kredit

### Varian Pro
- Role `pro` atau `admin`
- Semua mode aktif (Bebas, Rapi, Urai, Skrip Jualan)
- Menggunakan API key server (tidak perlu isi sendiri)
- Kredit dipotong per generate:
  - Mode Bebas/Rapi: 1 kredit × jumlah segmen × jumlah konten
  - Mode Urai: 1 kredit × estimasi segmen dari panjang skrip
  - Skrip Jualan: 1 kredit × jumlah skrip
- Bisa beli kredit sendiri via QRIS/OVO/Dana/GoPay dll.

### Top Up Kredit (otomatis upgrade ke Pro)
Setelah user berhasil membeli kredit, role otomatis diubah ke `pro`.

---

## 🏦 Paket Kredit

| Paket | Kredit | Harga |
|-------|--------|-------|
| Starter | 50 kredit | Rp 10.000 |
| Standard | 120 kredit | Rp 25.000 |
| Pro | 300 kredit | Rp 50.000 |

Ubah harga di `api/payment.ts` → const `CREDIT_PACKAGES`.

---

## 🔗 Embed di Blogger

Tambahkan di post/widget Blogger:

```html
<iframe 
  src="https://nama-app.vercel.app" 
  width="100%" 
  height="900px" 
  frameborder="0"
  style="border:none; border-radius:12px;"
></iframe>
```

Semua CORS header sudah di-set di setiap API endpoint.

---

## ⚠️ Catatan Penting

1. **Jangan commit `.env`** ke GitHub — hanya `.env.example`
2. **`SUPABASE_SERVICE_KEY`** adalah service_role key yang punya akses penuh — **jangan expose ke frontend**
3. Setelah buat admin pertama, **hapus atau amankan `SETUP_SECRET_KEY`** di Vercel
4. Untuk production Midtrans: ubah `MIDTRANS_IS_PRODUCTION=true` dan ganti key ke production key
5. Di `BuyCreditsModal.tsx`, ubah `const isProd = false` menjadi `true` saat production
