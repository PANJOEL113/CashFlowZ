# CashFlowZ

[![License: ISC](https://img.shields.io/badge/License-ISC-yellow.svg)](https://opensource.org/licenses/ISC)
[![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Chart.js](https://img.shields.io/badge/Chart.js-4.4.3-F8BD28?style=for-the-badge)](https://www.chartjs.org/)

---

## 👋 Selamat Datang

**CashFlowZ** adalah aplikasi pencatatan keuangan pribadi berbasis web (SPA PWA) untuk membantu kamu mengelola pemasukan, pengeluaran, transfer, akun, kategori, merchant, dan tabungan — seluruhnya di browsermu, dengan sinkronisasi real-time ke Firebase.

---

## 📋 Ringkasan Proyek

CashFlowZ adalah aplikasi Single Page Application (SPA) yang dibangun dengan HTML5, CSS3, dan Vanilla JavaScript (ES Modules + Classic scripts). Aplikasi ini menggunakan Firebase sebagai backend untuk Authentication dan Firestore database, dilengkapi Service Worker untuk kemampuan offline dan fitur PWA (Progressive Web App).

Aplikasi ini dirancang dengan **genre modern-minimal** dan **brand-green** (hue ≈ 155°), menggunakan font **Inter**, **Manrope**, dan **JetBrains Mono** untuk tampilan yang bersih dan profesional. Antarmuka menyesuaikan antara desktop (sidebar kiri) dan mobile (bottom navigation dengan FAB).

---

## ✅ Daftar Fitur

Fitur berikut tersedia sepenuhnya berdasarkan kode yang ada:

### Autentikasi & Session
- **Login/Logout** — Email + password via Firebase Authentication
- **Remember Me** — localStorage (session survive tutup browser) atau sessionStorage (hapus tutup tab)
- **Lupa Password** — Kirim link reset via Firebase
- **Session state listener** — Deteksi logout server-side secara real-time

### Dashboard
- Greeting personal: "Selamat {waktu}, {nama}" yang berubah otomatis tiap jam
- Live clock update setiap 10 detik
- Summary card: **Saldo saat ini** (animasi count-up) + perbandingan % dengan periode lalu
- Total pemasukan & pengeluaran periode
- **Line chart cashflow** — income vs expense per tanggal
- Daftar **5 transaksi terbaru** (klik → detail modal)
- **Saldo per akun** — komputasi otomatis (initial balance + income - expense + transfer)
- **Progress bar target tabungan** — tampilkan jika ada target
- **Insight otomatis** — cashflow membaik/menurun, rasio pengeluaran, kategori teratas, merchant teratas, status tabungan

### Transaksi (Tambah/Edit/Delete)
- **Type switch:** Pemasukan / Pengeluaran / Transfer
- Tanggal, jumlah (validasi > 0)
- **Akun** — dropdown diurutkan berdasarkan frekuensi penggunaan
- **Kategori** — tile select dengan emoji, fitur quick-add inline
- **Subkategori** — dropdown per kategori, quick-add inline
- **Merchant** — dropdown dengan daftar merchant, quick-add inline
- **Catatan** — textarea opsional
- **Lampiran foto** — unggah, compress max 800px, JPEG quality 0.3, max 5MB, auto-convert HEIC/HEIF via heic2any
- **Validasi:** Semua field required sesuai type
- **Undo delete** — toast dengan tombol Batalkan setelah hapus

### Filter & Navigasi
- **Filter pill:** Semua / Pemasukan / Pengeluaran / Transfer
- **Period filter:** Hari Ini, Minggu Ini, Bulan Ini, Tahun Ini, Custom (rentang tanggal)
- **Search real-time** — berdasarkan title, kategori, subkategori, merchant, note, amount
- **Sort:** Terbaru, Terlama, Nominal Tertinggi/Terendah, A-Z, Z-A
- **Pagination:** 20 per halaman dengan prev/next

### Insight (Analisis Mendalam)
- **6 chart interaktif** (Chart.js 4.4.3):
  1. Line chart: Tren Pemasukan vs Pengeluaran
  2. Doughnut chart: Pengeluaran per Kategori
  3. Pie chart: Pemasukan per Kategori
  4. Line chart: Tren Saldo Kumulatif
  5. Bar chart: Perbandingan Bulanan
  6. Doughnut chart: Pengeluaran per Merchant
- Breakdown kategori (clickable → drill-down ke subkategori/note)
- Breakdown akun (clickable → drill-down transaksi)
- Breakdown merchant (clickable → drill-down summary + transaksi)
- Sort + period filter untuk semua data

### Manajemen Data (CRUD)
- **Dompet (Akun):** Tambah/edit/hapus akun + saldo awal + upload logo (crop square 64px PNG)
- **Kategori:** Tab pemasukan/pengeluaran, tambah/edit/hapus, fitur subkategori CRUD
- **Merchant:** Tambah/edit/hapus, default Shopee & TikTok Shop
- **Target Tabungan:** Tambah/edit/hapus, progress bar di dashboard, transfer ke tabungan saat membuat transaksi tipe transfer
- **Ekspor Data:**
  - **CSV** — filter date range/akun/kategori/type → download `rekap-keuangan.csv`
  - **JSON Backup** — full data → download `cashflow-backup-YYYY-MM-DD.json`
  - **PDF** — HTML → pop-up → `window.print()`. Isi: header, summary, top 5 transaksi, 3 chart (line/donut/bar), saldo akun, kategori, tabungan — dengan CSS print styling
- **Import / Restore** — Upload JSON → validasi format → batch replace (max 500 ops/batch) → reload halaman

### Profil & Setelan
- **Foto profil** — upload → crop lingkaran interaktif (drag untuk posisi) → resize 300px JPEG 0.85
- **Dark Mode** — toggle switch di Profil & Profile Menu → persist ke Firestore
- **Status koneksi** — badge real-time (Online/Offline/Syncing/Pending)
- **Activity log** — mencatat otomatis create/update/delete untuk semua entities (100 log terbaru di Firestore)
- **Logout** — dengan konfirmasi

### PWA & Offline
- **Service Worker** — pre-cache semua static assets + JS views + CSS + logo + manifest + firebase modules; cache-first untuk assets, network-first untuk CDN + fallback
- **Manifest** — standalone, portrait, theme `#29AC6B`, shortcut "Tambah Transaksi"
- **Sync Queue** — localStorage queue untuk transaksi offline (add/update/delete), auto-process saat online
- **Connection Status** — badge real-time di profil
- **Content caching** — in-memory cache via DataStore

### Keyboard Shortcut
- **Ctrl+S / Cmd+S** — Simpan form transaksi atau edit profil
- **Ctrl+F / Cmd+F** — Focus + select search input
- **Escape** — Tutup modal

### Animasi & Micro-interactions
- View transition: fade + translateY (360ms ease-out)
- Card hover: translateY(-2px) + shadow lift
- Button hover: translateY(-1px) + brightness 1.06
- Button active: scale(0.97)
- Count-up: easeOutCubic animation untuk angka nominal
- Toast in/out: slide from right / to right
- Modal rise: translateY(18px) → 0 + opacity
- Splash logo: fadeIn + hover (float) animation
- Progress bar: gradient width animation 2s
- Skeleton shimmer: background-position loop 1.4s
- Chart animation: 800ms easeOutQuart

---

## 📁 Struktur Folder

```
CashFlowZ-Final v2.5 hapus ai/
├── index.html            — Halaman utama (Splash → Welcome → Login → App Shell)
├── package.json          — Dependencies: sharp (PNG generator)
├── firebase.json         — Firebase Hosting config + Firestore settings
├── .firebaserc           — Firebase project alias: cashflow-92373
├── .gitignore            — File yang di-ignore Git
├── manifest.json         — PWA manifest (standalone, theme #29AC6B)
├── sw.js                 — Service Worker (pre-cache + offline sync)
├── asset/
│   └── logo/             — Logo SVG + PNG sizes (icon-180, icon-192, icon-512, favicon-32, logofull)
│       └── LOGO FIKS/    — Logo SVG full version
├── css/
│   ├── base.css          — Design system: warna, typografi, radius, shadow, focus ring
│   ├── layout.css        — Layout desktops & responsive
│   ├── views.css         — Styling per halaman
│   ├── components.css    — Styling komponen UI (button, card, modal, toast, empty state)
│   └── responsive.css    — Breakpoints: 400 / 520 / 900 / 1180 px
├── firebase/             — Firebase modules (config, auth, firestore — ES modules)
│   ├── firebase-config.js — Inisialisasi Firebase v10.13.2
│   ├── auth.js          — Login/logout/password reset, global window.FBAuth
│   └── firestore.js     — Firestore CRUD, user doc + transactions subcollection, global window.FBStore
├── js/
│   ├── auth.js           — Bootstrap auth, session management, showSplash/showLogin/showApp
│   ├── storage.js        — DataStore: semua CRUD, sync, compute balance, activity log, savings, merchants
│   ├── utils.js          — Utilitas: formatRupiah, formatDate, formatDateShort, generateId, escapeHtml, theming, ConnectionStatus, SyncQueue, HEIC converter
│   ├── charts.js         — Chart utilities: palette, grid, themed colors
│   ├── layout.js         — Sidebar, chrome, bottom nav, profile menu/dropdown, ProfileMenu module
│   ├── router.js         — Hash-based routing (/#/dashboard, /#/transaction, /#/insight, /#/profile)
│   ├── views/
│   │   ├── dashboard.js  — Render dashboard ringkasan + chart + insights
│   │   ├── transaction.js — Daftar transaksi dengan filter/sort/search/pagination
│   │   ├── insight.js    — 6 chart + breakdown kategori/akun/merchant
│   │   ├── insight-detail.js — Drill-down per entity (kategori/akun/merchant)
│   │   ├── profile.js    — Profil: foto, nama, dark mode, export, activity log, logout
│   │   └── setting.js    — CRUD: akun/kategori/merchant/tabungan + export JSON/CSV/PDF + import restore
│   ├── components/
│   │   ├── toast.js      — Toast notifications (max 5, error/success/info)
│   │   ├── modal.js      — Modal dialog + confirmDialog
│   │   ├── sort-filter.js — Render + wire sort/filter dropdowns
│   │   └── period-filter.js — Render + wire period filter (custom date range)
│   └── modals/
│       └── transaction.js — Form tambah/edit transaksi lengkap (type/akun/kategori/subkategori/merchant/attachment)
├── js/views/setting.js   — Meliputi semua CRUD + export/import (1616 lines)
├── js/modals/transaction.js — Form tambah/edit transaksi (596 lines)
├── 404.html              — Halaman fallback (redirect ke Dashboard)
├── firestore.rules       — Firestore security rules (users/{uid} + transactions)
├── firestore.indexes.json — Indexes (kosong, dibuat saat perlu)
├── AUDIT_CASHFLOWZ.md    — Laporan audit lengkap (dokumen internal)
└── gen-png.js            — Script generate PNG dari SVG (dengan sharp)
```

---

## ⚙️ Cara Menjalankan Proyek

### Persyaratan
- Browser modern (Chrome, Firefox, Safari, Edge)
- Koneksi internet untuk inisialisasi Firebase (Auth + Firestore)
- Untuk offline: sudah pernah login once, data tersimpan di sessionStorage + localStorage Sync Queue

### Langkah-langkah

1. **Clone atau unduh repositori ini**
2. **Buka `index.html`** di browser (double-click atau drag ke browser)
   - Atau jalankan via lokal server: `npx serve` atau `python -m http.server`
3. **Login pertama kalinya:**
   - Masukkan email dan password yang sudah terdaftar di Firebase Console
   - Pilih "Ingat saya" jika ingin session selanjutnya tetap terbuka setelah menutup browser
4. **Atau gunakan session yang tersimpan** — Jika pernah login sebelumnya, aplikasi akan langsung menampilkan antarmuka (offline-first), lalu mendeteksi status auth di background

### Fitur tambahan saat development
- Untuk generate ulang logo PNG dari SVG: `node gen-png.js` (membutuhkan `sharp`)
- Untuk deploy ke Firebase Hosting: `firebase deploy`
- Untuk memeriksa Firestore rules/indexes: `firebase firestore:rules:deploy` / `firebase firestore:indexes:deploy`

---

## ⚙️ Konfigurasi Penting

### Firebase
File konfigurasi terletak di `firebase/firebase-config.js`:

```js
const firebaseConfig = {
  apiKey: "AIzaSyBMmr5DBGQxqgnppBjVLeum4bhKpbu1pYU",
  authDomain: "cashflow-92373.firebaseapp.com",
  projectId: "cashflow-92373",
  storageBucket: "cashflow-92373.firebasestorage.app",
  messagingSenderId: "1008000715079",
  appId: "1:1008000715079:web:c6c8ffa2b7e8d1369e6462",
  measurementId: "G-BWHFP0PEVQ",
};
```

- **Project ID:** `cashflow-92373`
- **Hosting target:** `cflowz` (dilihat dari `.firebaserc` dan `firebase.json`)
- **Atur di Firebase Console:**
  - **Authentication:** Email/password provider (aktifkan)
  - **Firestore:** Database default, location `asia-southeast2`
  - **Atau atur rules/indexes** melalui `firestore.rules` dan `firestore.indexes.json`

### Environment Variables
- `.firebaserc` berisi alias project: `cashflow-92373`
- `.env` (tidak ada di repo — buat sendiri jika butuh variabel sensitif)
- **Tidak ada kunci API di klien** — firebase-config.js berisi apiKey yang terbuka (standar untuk Firebase client SDK), pastikan project Firebase sudah dikonfigurasi dengan benar

### Tema (Dark Mode)
- Tema disimpan di Firestore `users/{uid}/settings.theme`
- `data-theme="dark"` atau `data-theme="light"` di `<html>`
- Toggle di halaman Profil & Profile Menu
- Fallback ke `light` jika gagal load dari Firestore

---

## 🏗️ Arsitektur Sederhana

```mermaid
graph TD
    subgraph Frontend
        HTML[index.html] -->|Browser| CSS[CSS: base/layout/views/components]
        JS[JS modules] -->|ES Module| firebaseConfig
        JS -->|Classic script| window.FBAuth & window.FBStore
        SW[sw.js] -->|Service Worker| Cache[Cache API]
        Manifest[manifest.json] -->|PWA| Icons&Theme
    end

    subgraph Firebase
        FBAuth[Firebase Auth] -->|Login/Logout| User[User Session]
        FBStore[Firestore] -->|CRUD ops| DataStore[js/storage.js]
        FBAnalytics[Analytics] -->|Conditional| App
    end

    subgraph Routing
        Router[js/router.js] -->|Hash change| View[View Render]
        View -->|Render| Dashboard|Transaction|Insight|Profile|Setting
    end

    User -->|sessionStorage| SessionStore
    DataStore -->|initUser| cache[In-memory cache]
    DataStore -->|subscribe| realtime[Firestore listener]
    realtime -->|update| cache
    Cache -->|fast read| Views
    SyncQueue[SyncQueue] -->|localStorage| offlineQueue
    offlineQueue -->|processAll| FBStore| saat online
```

**Alur utama:**
1. `index.html` dimuat → splash screen → `js/auth.js` cek session cached → `showApp()` → `Layout.renderChrome()` → `renderRoute()`
2. Router mendeteksi `#/path` → load view script → render view dengan data dari `DataStore`
3. DataStore membaca dari `window.FBStore` (Firestore) + in-memory cache
4. Saat online: SyncQueue otomatis process pending transactions
5. Dark mode: toggle → `applyTheme()` + `DataStore.saveSettings()` → persist Firestore

---

## 🛣️ Roadmap

| No | Fitur | Status | Catatan |
|---|---|---|---|
| 1 | **Registrasi mandiri** — allow create account dari dalam app | 📋 | Tidak ada saat ini — akun harus dibuat manual di Firebase Console |
| 2 | **Validasi HEIC/HEIF** — konversi foto dari iPhone secara default | 📋 | Sudah ada library `heic2any` di `utils.js`, but butuh user trigger |
| 3 | **Auto-bulan sebelumnya** — pada period filter default ke bulan lalu | 📋 | Bisa ditambahkan di `utils.js `_rangeBoundsISO |
| 4 | **Export lebih lanjut** — Excel (.xlsx) selain CSV/JSON/PDF | 📋 | Butuh library seperti `xlsx` |
| 5 | **Multi-language** — dukungan Bahasa Inggris alongside Indonesia | 📋 | Semua teks sudah pakai variabel, butuh i18n framework |
| 6 | **Laporan grafik lebih detail** — export chart image (PNG/SVG) | 📋 | Sudah ada di PDF export, tapi bisa ditambahkan opsi standalone |
| 7 | **Widget dashboard kustom** — pilih komponen yang tampil di dashboard | 📋 | Bisa ditambahkan di `dashboard.js` |
| 8 | **Peringatan kuota storage Firestore** — notifikasi saat mendekati limit 1MB/doc | 📋 | Sudah ada check `request.resource.size() < 1024 * 1024` di rules |

---

## 📝 Catatan Pengembangan

- **Firebase config hanya satu file** — `firebase/firebase-config.js` adalah satu-satunya file yang berisi project config. Semua modul Firebase diimpor dari sini.
- **Modular SDK v9+** — Menggunakan ES module imports dari CDN (`https://www.gstatic.com/firebasejs/10.13.2/...`).
- **Mixed script types** — Ada `type="module"` scripts (firebase config, auth, firestore) dan classic `<script>` tags (storage.js, utils.js, charts.js, components, views). Modular ones expose `window.__FIREBASE_READY__`, `window.FBAuth`, `window.FBStore` for classic scripts.
- **Offline-first design** — Data disimpan di `sessionStorage` (SessionStore) + `localStorage` (SyncQueue). Saat kembali online, pending transactions dikirim ke Firebase otomatis.
- **Firestore rules strictly user-isolated** — Setiap user hanya bisa baca/tulis doc-nya sendiri di `users/{uid}`. Tidak ada username list atau konvensi email.
- **Ukuran doc Firestore limit 1MB** — Gambar di-transpress (quality 0.3, max 800px) sebelum disimpan. `sharp` digunakan untuk generate PNG dari SVG logo.
- **Service Worker cache** — Pre-cache assets saat install, dynamic cache untuk respons API, fallback ke network untuk yang tidak ter-cache.
- **Semua state manager manual** — Tidak pakai Redux/Vuex/Rekit. State disimpan di:
  - `window.__dashboardClockInterval` — dashboard clock
  - `currentSession` — session object di `js/auth.js`
  - `cache` di `js/storage.js` — in-memory cache per user
  - `sessionStorage` via `SessionStore`
  - `localStorage` via `SyncQueue`
- **View scripts di-load statis** — Dari `index.html` agar tersedia sebelum router menjalankan `renderRoute()` (hindari "XxxView is not defined").
- **Lucide icons** di-load dari CDN: `<script src="https://cdn.jsdelivr.net/npm/lucide@0.379.0/dist/umd/lucide.js"></script>`, kemudian `window.lucide.createIcons()` dipanggil via `refreshIcons()`.
- **Chart.js 4.4.3** di-load dari CDN, dengan kustom theme warna berdasarkan `data-theme` (light/dark).
- **Gambar HEIC/HEIF** — Konverter library di-load dari CDN secara lazzy saat needed (`heic2any`).

---

## ❓ FAQ Singkat

**Q: Lupa password, bagaimana?**  
A: Klik "Lupa Password?" di halaman login → masukkan email → akan dikirim link reset ke email terdaftar (via Firebase Auth).

**Q: Data hilang setelah clear cache/browsernya?**  
A: Data transaksi baru disimpan ke Firebase Firestore (authoritative). Tapi setting tema, nama profil, foto -> disimpan di Firestore `users/{uid}/settings` dan `users/{uid}/profile`. Jika clear semuanya, data akan kosong namun akun tetap bisa login dan data akan muncul kembali.

**Q: Bisa pakai tanpa internet?**  
A: Bisa. Jika pernah login once, session akan tersimpan di `sessionStorage`. Transaksi baru saat offline akan antre di `localStorage` Sync Queue dan otomatis terkirim saat koneksi kembali. Tampilan tetap bisa diakses tapi fitur real-time (charts update otomatis) akan mati sampai online.

**Q: Bagaimana cara mengganti tema dark/light?**  A: Pindahkan switch di halaman Profil ke atas atau ke Profile Menu di sidebar/avatar. Tema akan tersimpan otomatis ke Firebase Firestore.

**Q: Bagaimana cara menghapus akun permanent?**  
A: Akun dibuat di Firebase Console (Authentication -> Users -> Add user). Untuk menghapus, gunakan Firebase Console atau `admin SDK`. Dari sisi klien, hanya bisa `logout` saja — tidak ada fitur delete account dari dalam app.

**Q: Format tanggal kenapa Gregorian tapi tampil Bahasa Indonesia?**  A: Semua fungsi format tanggal menggunakan `toLocaleDateString("id-ID", ...)` di `js/utils.js`, jadi meski date disimpan sebagai ISO string, tampilannya akan selalu dalam bahasa Indonesia.

---

## 👤 Footer

**CashFlowZ** · Aplikasi pencatatan keuangan pribadi · Dibuat dengan ❤️ menggunakan Vanilla JS, Firebase, dan Chart.js

- **Project ID:** `cashflow-92373`
- **Hosting:** Firebase Hosting
- **Versi:** v2.5 Final (tanpa AI)
- **Lisensi:** ISC