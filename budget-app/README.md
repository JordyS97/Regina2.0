# REGINA 2.0 — Budget Proposal & Approval

Aplikasi pengajuan dan persetujuan budget untuk jaringan dealer (Astra Motor NTB).
Dibangun dengan Next.js (App Router), Firebase Auth, Firestore, dan Firebase Storage.

## Alur kerja (goal aplikasi)

```
User / Supervisor  ──►  Supervisor  ──►  Sub Dept Head  ──►  Finance Head  ──►  Region Head  ──►  Approved
   (Submission)                                                                      ▲
                                                                     dapat di-bypass oleh Super Admin
                                                                     (toggle "Region Approval" di Tracking)
```

- **Submission** — hanya role `User` dan `Supervisor`. Proposal berisi judul, perihal,
  latar belakang, tipe, sumber budget (GL Account / Added Fee (Biaya Titipan C6) /
  Retail JoinProm), tabel rincian biaya, dealer, dan lampiran.
- Proposal dari seorang **Supervisor langsung masuk ke Sub Dept Head** — tidak ada yang
  menyetujui pengajuannya sendiri.
- **Approvals** — tiap approver hanya melihat proposal yang sedang berada di mejanya,
  ditambah pengajuannya sendiri dan proposal yang pernah ia proses.
- **Rejection** menghentikan alur dan wajib disertai alasan.
- **Dashboard** — KPI dan grafik dari data Firestore secara real-time. Proposal `Rejected`
  tidak dihitung sebagai pemakaian budget.
- **Super Admin** — Enterprise Dashboard, System Overview (konsumsi per G/L account),
  Proposal Tracking (bottleneck + bypass Region Head), dan User Management.

Logika alur ini terpusat di `src/lib/proposals.ts` dan ditegakkan ulang di
`firestore.rules`, sehingga UI dan database tidak bisa berbeda aturan.

## Konfigurasi

Buat `.env.local` di folder `budget-app`:

```bash
# Firebase Web SDK (client) — dari Firebase Console → Project settings → Your apps
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Firebase Admin SDK (server) — service account JSON, boleh raw JSON atau base64.
# Dibutuhkan oleh menu User Management (buat user & reset password).
FIREBASE_SERVICE_ACCOUNT_KEY=

# Opsional, hanya untuk instalasi awal: email ini otomatis menjadi SuperAdmin
# pada login pertama, supaya direktori user bisa diisi. Kosongkan di produksi.
NEXT_PUBLIC_BOOTSTRAP_ADMIN_EMAIL=
```

Tanpa variabel `NEXT_PUBLIC_FIREBASE_*`, aplikasi tetap jalan tetapi tidak terhubung
ke backend — semua halaman akan mengarahkan ke `/login`.

## Menjalankan

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # build produksi
npm run lint
```

## Deployment

**Vercel** (project `ntb-regina2-0`) sudah terhubung ke repo GitHub ini dan otomatis
build setiap push. Root Directory di-set ke `budget-app`, framework Next.js.
Push ke `main` → production; push ke branch lain → preview URL.

Variabel `NEXT_PUBLIC_*` di-inline saat build, jadi **setiap kali variabel diubah di
Vercel, project harus di-redeploy** agar perubahannya ikut terbawa.

**Firebase rules tidak ikut ter-deploy oleh Vercel.** Rules di repo ini adalah bagian
dari kontrol akses aplikasi, bukan sekadar contoh — selama belum di-deploy, database
masih memakai rules lama. Deploy manual setiap kali berubah:

```bash
cd budget-app
firebase login
firebase deploy --only firestore:rules,storage:rules
```

Project Firebase (`regina2-1`) sudah dipin di `.firebaserc`, jadi tidak perlu
flag `--project`.

Ringkasan aturan:

- `users` — dapat dibaca semua user login; role dan dealer **hanya** dapat diubah
  Super Admin; user biasa hanya boleh mengubah namanya sendiri.
- `proposals` — dibuat atas nama pengaju sendiri dan selalu masuk dari tahap awal;
  hanya approver pada tahap berjalan yang boleh memindahkan status, dan tidak boleh
  atas proposalnya sendiri; nominal, dealer, dan G/L account terkunci setelah dikirim.
- `storage` — upload dibatasi ke folder `proposals/`, maksimal 10 MB, dan hanya
  tipe dokumen/gambar.

## Akun

Akun dibuat oleh Super Admin melalui **User Management** (password default
`NTBRegina2.0`, dapat di-reset dari halaman yang sama). Halaman login tidak lagi
mendaftarkan akun baru secara otomatis.

## Catatan data

`src/lib/mock-data.ts` masih menyediakan daftar **G/L Account** dan **dealer** sebagai
master data statis. Saldo `budgetUsed` di sana bersifat saldo awal; pemakaian aktual
dihitung ulang dari proposal yang berjalan/di-approve pada halaman System Overview.
Pindahkan master data ini ke Firestore bila sudah tersedia sumber resminya.
