# Audit Report — CashFlowZ

## 1. GAMBARAN APLIKASI

| Atribut | Detail |
|---|---|
| **Nama** | CashFlowZ |
| **Tujuan** | Aplikasi pencatatan keuangan pribadi — kelola pemasukan, pengeluaran, transfer, dan tabungan |
| **Bahasa** | Indonesia sepenuhnya |
| **Frontend** | HTML5 + CSS3 + Vanilla JavaScript (ES Modules + Classic scripts) |
| **Backend** | Firebase v10.13.2 (Firestore, Authentication, Analytics) |
| **Library** | Chart.js 4.4.3, Lucide Icons 0.379, heic2any (opsional), Google Fonts (Inter, Manrope, JetBrains Mono) |
| **PWA** | Service Worker + Manifest (standalone, cache-first strategy) |
| **Hosting** | Firebase Hosting (site: `cflowz`) |

---

## 2. HALAMAN

| Halaman | File | Fungsi |
|---|---|---|
| **Splash Screen** | `index.html` + `js/auth.js` | Layar pembuka dengan logo + progress bar, otomatis hilang setelah 3,8 detik |
| **Welcome** | `index.html` | Halaman sambutan dengan logo besar + tombol "Masuk" |
| **Login** | `js/auth.js` | Form email + password + "Ingat Saya" + "Lupa Password?" |
| **Dashboard** | `js/views/dashboard.js` | Ringkasan: greeting + jam, saldo + perbandingan, chart cashflow, transaksi terbaru (5), saldo akun, preview tabungan, insight otomatis |
| **Transaksi** | `js/views/transaction.js` | Daftar transaksi dengan filter (type/akun/kategori), sort, search real-time, pagination 20/halaman |
| **Insight** | `js/views/insight.js` | 6 chart (line, donut, pie, trend, bar, merchant donut) + breakdown kategori/akun/merchant — semua bisa diklik untuk drill-down |
| **Insight Detail** | `js/views/insight-detail.js` | Drill-down per kategori/akun/merchant: summary + accordion transaksi + subkategori grouping |
| **Profil** | `js/views/profile.js` | Foto profil (dengan crop lingkaran), nama, email, status koneksi, menu dompet/kategori/merchant/tabungan, dark mode, export, activity log, logout |
| **Reset Password** | Modal di `index.html` + `js/auth.js` | Kirim link reset password ke email |

**Tidak ada:** Halaman Register (akun dibuat manual via Firebase Console), halaman 404 (fallback ke Dashboard).

---

## 3. MENU NAVIGASI

### Desktop (>900px)

| Menu | Lokasi | Isi |
|---|---|---|
| **Sidebar** | Kiri, sticky | Logo, 4 nav item (Dashboard/Transaksi/Insight/Profil), button profil bawah |
| **Desktop Topbar** | Kanan atas | Tombol "Tambah" (hanya muncul di Dashboard) |
| **Profile Dropdown** | Muncul saat klik avatar di sidebar | Avatar, nama, email, status badge, quick actions (Dompet/Kategori/Merchant/Tabungan), Dark Mode toggle, Export, Logout |

### Mobile (≤900px)

| Menu | Lokasi | Isi |
|---|---|---|
| **Mobile Topbar** | Atas | Hanya judul halaman |
| **Bottom Navigation** | Fixed bawah | 4 icon nav + FAB (Tambah Transaksi) di tengah — border-radius 22px, glass effect |
| **Profile Sheet** | Bottom sheet modal | Sama dengan dropdown desktop, dengan swipe-to-dismiss |

### Navigation Items

| Key | Label | Icon |
|---|---|---|
| dashboard | Dashboard | layout-dashboard |
| transaction | Transaksi | arrow-left-right |
| insight | Insight | pie-chart |
| profile | Profil | user |

---

## 4. SELURUH FITUR

### Dashboard
- Greeting personal ("Selamat {waktu}, {nama}") — berubah otomatis tiap jam
- Live clock real-time update 10 detik
- Summary card: saldo saat ini (count-up animation) + perbandingan persentase dengan periode lalu
- Total pemasukan & pengeluaran periode ini
- Line chart cashflow (income vs expense per tanggal)
- Daftar 5 transaksi terbaru (klik → detail modal)
- Saldo per akun
- Progress bar target tabungan
- Insight otomatis: cashflow membaik/menurun, rasio pengeluaran, kategori teratas, merchant teratas, status tabungan

### Transaksi
- **Filter:** type pill (Semua/Pemasukan/Pengeluaran/Transfer)
- **Filter dropdown:** Akun + Kategori
- **Search:** real-time by title, kategori, subkategori, merchant, note, amount
- **Sort:** Terbaru, Terlama, Nominal Tertinggi/Terendah, A-Z, Z-A
- **Period filter:** Hari Ini, Minggu Ini, Bulan Ini, Tahun Ini, Custom (date range)
- **Pagination:** 20 per halaman dengan prev/next
- **Klik row:** modal detail transaksi lengkap (type, tanggal, akun, kategori, merchant, note, lampiran, timestamps, sync status) → bisa Edit atau Hapus

### Insight
- 6 chart interaktif (Chart.js):
  1. Line chart: Tren Pemasukan vs Pengeluaran
  2. Doughnut chart: Pengeluaran per Kategori
  3. Pie chart: Pemasukan per Kategori
  4. Line chart: Tren Saldo Kumulatif
  5. Bar chart: Perbandingan Bulanan
  6. Doughnut chart: Pengeluaran per Merchant
- Breakdown kategori (clickable → drill-down)
- Breakdown akun (clickable → drill-down)
- Breakdown merchant (clickable → drill-down)
- Sort + period filter untuk semua data

### Insight Detail (Drill-down)
- Per kategori: accordion utama + accordion per subkategori/note
- Per merchant: summary cards (total, income, expense, max, avg, first/last date) + accordion transaksi
- Per akun: daftar transaksi dengan sort + search
- Period filter + search dalam entity

### Manajemen Dompet (CRUD Modal)
- Tambah: nama + saldo awal (opsional) + upload logo (crop square 64px PNG)
- Edit: semua field + ganti logo
- Hapus: dengan konfirmasi + transaksi terkait ikut terhapus
- Sortir berdasarkan frekuensi penggunaan
- Balance komputasi otomatis (initial + income - expense + transfer)

### Manajemen Kategori (CRUD Modal)
- Tab Pemasukan / Pengeluaran
- Tambah: nama + emoji (picker keyboard native HP)
- Edit: nama + emoji
- Hapus: konfirmasi, transaksi tidak terhapus
- **Subkategori:** CRUD per kategori (tambah/edit/hapus)
- **Quick Add:** Tambah kategori & subkategori langsung dari form transaksi
- Validasi duplicate name

### Manajemen Merchant (CRUD Modal)
- Tambah: nama + upload logo (crop square 64px PNG)
- Edit: nama + logo
- Hapus: konfirmasi, transaksi tidak terhapus
- Default: Shopee & TikTok Shop
- **Quick Add:** Tambah merchant langsung dari form transaksi

### Target Tabungan (CRUD Modal)
- Tambah: nama, target nominal, sudah terkumpul, tanggal target, warna, icon (emoji), catatan
- Edit: semua field
- Hapus: konfirmasi, riwayat transfer tetap tersimpan
- Progress bar di Dashboard
- Transfer ke tabungan (tipe transaksi transfer → pilih target)

### Transaksi (Form Tambah/Edit)
- Type switch: Pemasukan / Pengeluaran / Transfer
- Tanggal, jumlah (validasi > 0, auto-abs)
- Akun (dropdown, diurutkan berdasarkan frekuensi)
- Kategori (tile select dengan emoji, quick-add inline)
- Subkategori (dropdown, quick-add inline)
- Merchant (dropdown, quick-add inline)
- Catatan (textarea)
- Lampiran foto (compress max 800px, JPEG quality 0.3, max 5MB)
- Validasi: semua field required sesuai type

### Export
- **CSV:** filter date range/akun/kategori/type → download `rekap-keuangan.csv`
- **JSON Backup:** full data → download `cashflow-backup-YYYY-MM-DD.json`
- **PDF:** HTML → pop-up → `window.print()`. Isi: header, summary, top 5 transaksi, 3 chart (line/donut/bar), saldo akun, kategori, tabungan — dengan CSS print styling

### Import / Restore
- Upload file JSON → validasi format (harus ada `transactions` & `categories`)
- Cek kecocokan email (konfirmasi jika berbeda)
- Batch replace: delete semua transaksi lama → write ulang (batch 500 operasi)
- Reload halaman setelah sukses

### Authentication
- Login: email + password via Firebase Auth
- Remember Me: localStorage vs session persistence
- Lupa Password: sendPasswordResetEmail via Firebase
- Session cache: sessionStorage + offline fallback
- Auth state listener: deteksi logout server-side
- **Tidak ada registrasi mandiri** — akun dibuat di Firebase Console

### PWA & Offline
- **Service Worker:** pre-cache semua static assets + JS views + CSS + logo + manifest + firebase modules; cache-first untuk assets, network-first untuk CDN + fallback
- **Manifest:** standalone, portrait, theme `#29AC6B`
- **Sync Queue:** localStorage queue untuk transaksi offline (add/update/delete), auto-process saat online
- **Connection Status:** real-time badge (Online/Offline/Syncing/Pending) di profil
- **Content caching:** in-memory cache via DataStore
- **Install PWA:** Tidak ada custom install prompt

### Foto & Attachment
- **Avatar:** Upload → crop lingkaran interaktif (drag untuk posisi) → resize 300px JPEG 0.85
- **Logo Akun/Merchant:** Upload → crop square 64px PNG (transparency preserved)
- **Lampiran Transaksi:** Upload → compress max 800px, JPEG quality 0.3, max 5MB
- **HEIC/HEIF Converter:** Konversi otomatis foto dari iPhone/HP via heic2any CDN
- **Photo Viewer:** Fullscreen overlay untuk melihat foto

### Activity Log
- Mencatat otomatis setiap create/update/delete untuk semua entities
- 100 log terbaru disimpan di Firestore
- Ditampilkan di modal dengan icon + timestamp

### Keyboard Shortcut

| Shortcut | Fungsi |
|---|---|
| **Ctrl+S / Cmd+S** | Simpan form transaksi atau edit profil |
| **Ctrl+F / Cmd+F** | Focus + select search input |
| **Escape** | Tutup modal |

### Animasi & Micro-interactions
- View transition: fade + translateY (360ms ease-out)
- Card hover: translateY(-2px) + shadow lift
- Button hover: translateY(-1px) + brightness 1.06
- Button active: scale(0.97)
- Count-up: easeOutCubic animation untuk angka nominal
- Toast in: slide from right
- Toast out: slide to right
- Modal rise: translateY(18px) → 0 + opacity
- Splash logo: fadeIn + hover (float) animation
- Progress bar: gradient width animation 2s
- Skeleton shimmer: background-position loop 1.4s
- Chart animation: 800ms easeOutQuart
- Nav item: background + color transition 130ms

---

## 5. TAMPILAN (UI/UX)

### Tema

| Mode | Background | Surface | Text |
|---|---|---|---|
| **Light** | `#F4FCF7` (putih hijau) | `rgba(236,253,245,0.85)` | `#16352A` (hijau tua) |
| **Dark** | `#0C1210` (hitam hijau) | `rgba(20,30,27,0.90)` | `#EAF0ED` (putih hijau) |

### Warna

| Role | Light | Dark |
|---|---|---|
| **Brand** | `#29AC6B` | `#29AC6B` |
| **Gradient** | `#29AC6B → #10B981 → #06B6D4 → #3B82F6` | same |
| **Income** | `#22C55E` | `#4ADE80` |
| **Expense** | `#EF4444` | `#F87171` |
| **Transfer** | `#38BDF8` | `#7DD3FC` |
| **Info** | `#38BDF8` | `#38BDF8` |
| **Gold** | `#F7C345` | `#F7C345` |

### Typography

| Penggunaan | Font | Weight |
|---|---|---|
| Body | Inter | 400 (13.5px) |
| Heading | Manrope | 700 |
| Angka/Nominal | JetBrains Mono | 400-700 |

### Border Radius

| Level | Value |
|---|---|
| XS | 8px |
| SM | 12px |
| MD | 16px |
| LG | 20px |
| Button | 18px |
| Pill | 999px |

### Shadow

- **Card:** `0 2px 12px rgba(0,0,0,0.04)` + green tint
- **Lift:** `0 12px 32px rgba(34,197,94,0.12)`
- **Modal:** `0 20px 60px rgba(0,0,0,0.15)`
- **Dropdown:** `0 8px 32px rgba(0,0,0,0.10)`
- Dark mode: semua shadow lebih gelap

### Komponen Visual

| Komponen | Style |
|---|---|
| **Button** | Pill shape (18px), inline-flex with icon + gap |
| **Button Primary** | Gradient `#22C55E → #06B6D4`, white text, shadow |
| **Button Outline** | Transparent, 1.5px border, hover → brand fill |
| **Button Danger** | Red `#EF4444` |
| **Card** | Surface solid, border, `border-radius: 20px`, hover lift |
| **Input** | Border `1.5px`, focus → brand border + ring shadow |
| **Modal** | `border-radius: 20px`, shadow modal, overlay backdrop-blur(4px), slide-up animation |
| **Toast** | Surface solid, shadow lift, slide-in from right, max 5 |
| **Empty State** | Circle icon (60px) + title + subtitle + optional button |
| **Skeleton** | Shimmer animation (`linear-gradient` 200% width loop 1.4s) |
| **Badge** | Pill, colored background per type |
| **Filter Pill** | Rounded pill, active → gradient |
| **Switch** | 38x22px slider, green checked |
| **Chart** | Chart.js dengan kustom: rounded tooltip, legend bottom, grid minimal |
| **Icon** | Lucide icons (all SVG via JS), ukuran 14-20px |

### Glass Effect

- Sidebar: `backdrop-filter: blur(18px)`
- Auth card: `backdrop-filter: blur(14px)`
- Bottom nav (mobile): `backdrop-filter: blur(20px)`
- Modal overlay: `backdrop-filter: blur(4px)`
- Card: `backdrop-filter: blur(14px)`

### Animasi

- **Splash logo:** fadeIn + hover float infinite
- **Progress bar:** 2s gradient width
- **View transisi:** fadeIn + translateY (360ms)
- **Modal rise:** translateY + opacity (360ms)
- **Toast in/out:** translateX slide (220ms)
- **Card hover:** translateY(-2px) + shadow
- **Button hover:** translateY(-1px) + brightness
- **Count-up:** requestAnimationFrame easeOutCubic
- **Chart:** 800ms easeOutQuart
- **Skeleton:** shimmer 1.4s infinite
- **Checkbox check:** scale in + color
- **Login card:** fadeIn + translateY (500ms)
- **Dropdown:** scale + translateY (200ms)

---

## 6. DARK MODE

### Cara Kerja

1. **CSS Variables:** Semua warna didefinisikan sebagai CSS custom properties di `:root` (light) dan `[data-theme="dark"]` (dark override)
2. **Attribute:** `<html data-theme="dark">` — di-set via JS `applyTheme()`
3. **Toggle:** Switch di Profil & Profile Menu → `toggleTheme()` → flip `data-theme` + save ke Firestore settings
4. **Init:** `initThemeFromStorage()` → load dari Firestore → apply tema

### Komponen yang Berubah

| Komponen | Light | Dark |
|---|---|---|
| Background (`--bg`) | `#F4FCF7` | `#0C1210` |
| Surface | `rgba(236,253,245,0.85)` | `rgba(20,30,27,0.90)` |
| Surface Solid | `#FFFFFF` | `#182420` |
| Surface Border | `#D7F3E5` | `#242E2A` |
| Text Primary | `#16352A` | `#EAF0ED` |
| Text Secondary | `#5F7F72` | `#99A9A3` |
| Text Muted | `#8CA39B` | `#5C6E68` |
| Brand 100 | `#DCFCE7` | `#1A3028` |
| Coral 100 | `#FEE2E2` | `#2E1E1E` |
| Gold 100 | `#FFF3D4` | `#2E2A1A` |
| Info 100 | `#E0F2FE` | `#1A2A30` |
| Metal 100 | `#F4FCF7` | `#121A17` |
| Shadow | green tint | black tint |
| Income text | `#22C55E` | `#4ADE80` |
| Expense text | `#EF4444` | `#F87171` |
| Transfer text | `#38BDF8` | `#7DD3FC` |
| Body gradient bg | green radial | darker green radial |
| Sidebar | surface blur | `rgba(10,16,14,0.96)` |
| Auth card | glass blur | `var(--surface-solid)`, no blur |
| Card::before overlay | white gradient | green subtle gradient |
| Splash bg | white gradient | dark gradient |
| Nav active | same gradient | same (white text) |
| Icon: moon/sun | moon visible, sun hidden | sun visible, moon hidden |

### Persistensi

- Tersimpan di Firestore (`users/{uid}/settings.theme`)
- Di-load saat login (`initThemeFromStorage`)
- Fallback ke light jika gagal load

---

## 7. RESPONSIVE

### Desktop (>900px)

- **Sidebar:** 220px fixed left, sticky, dengan backdrop blur
- **Content:** Full width dengan padding `20px 26px 60px`
- **Topbar:** Di dalam main area, judul + actions
- **Desktop Topbar:** Pojok kanan atas, tombol "Tambah"
- **Profile:** Dropdown absolute positioning
- **Grid 2** kolom untuk dashboard & insight
- **Scrollbar:** Custom thin green scrollbar

### Breakpoint ≤1180px

- Grid 2 kolom → 1 kolom

### Mobile (≤900px)

- **Sidebar:** Sembunyi
- **Desktop Topbar:** Sembunyi
- **Bottom Navigation:** Fixed, `left:16px; right:16px; bottom:14px + safe-area`, height 60px, border-radius 22px, glass effect, 4 nav items + FAB
- **Mobile Topbar:** Hanya judul halaman
- **Main padding:** `12px 14px 104px` (104px = ruang bottom nav)
- **Modal:** Full width, bottom sheet style (rounded hanya atas), max-height 88vh
- **Profile Menu:** Bottom sheet modal
- **Transaction actions:** Selalu visible (opacity 1)
- **Grid forms:** 1 kolom
- **Touch-friendly:** Buttons, inputs, icons lebih besar
- **Toast:** `left:16px; right:16px; width:auto; bottom:80px + safe-area`
- **Chart:** Height lebih pendek (180px vs default 200px)

### Mobile Kecil (≤520px)

- Auth card padding lebih kecil
- Login logo 200px
- Emoji grid 6 kolom
- Filter & period trigger lebih compact

### Sangat Kecil (≤400px)

- Main padding minimal: `8px 10px 90px`
- Bottom nav: `left:10px; right:10px; height:56px`
- Font lebih kecil
- Greeting lebih compact
- Summary balance font 22px

### Safe Area

- Bottom nav: `bottom: calc(14px + env(safe-area-inset-bottom))`
- Modal mobile: `padding-bottom: calc(env(safe-area-inset-bottom, 16px) + 4px)`

---

## 8. KESIMPULAN

| Aspek | Detail |
|---|---|
| **Nama** | CashFlowZ |
| **Jenis** | SPA PWA pencatatan keuangan pribadi |
| **Halaman** | 7 (Splash, Welcome, Login, Dashboard, Transaksi, Insight, Insight Detail, Profil) |
| **Modal (sub-halaman)** | 10+ (Reset Password, Tambah/Edit Transaksi, Detail Transaksi, Dompet CRUD, Kategori CRUD, Merchant CRUD, Tabungan CRUD, Edit Profil, Crop Foto, Activity Log, Export, Import) |
| **Menu Navigasi** | 2 mode: Sidebar (desktop) + Bottom Nav dengan FAB (mobile) |
| **Fitur** | 50+ (CRUD transaksi/akun/kategori/subkategori/merchant/tabungan, filter, sort, search, pagination, 6 chart, export CSV/JSON/PDF, import restore, activity log, dark mode, 3 keyboard shortcuts, undo delete, crop foto interaktif, HEIC converter, attachment foto, sync queue offline, real-time sync, count-up animation, skeleton loading) |
| **Tema** | 2 (Light + Dark) — CSS variables + Firestore persist |
| **Teknologi** | Vanilla JS, Firebase v10.13.2, Chart.js 4.4.3, Lucide 0.379, Service Worker, localStorage, sessionStorage |
| **PWA** | Service Worker pre-cache + dynamic cache, Manifest (standalone, portrait), Shortcut "Tambah Transaksi" |
| **Offline** | Sync Queue (localStorage), in-memory cache, auto-sync saat online, connection status badge |
| **Firebase** | Firestore (database), Auth (email/password), Analytics (conditional), Hosting |
| **Export** | CSV (filtered), JSON (full backup), PDF (laporan dengan chart via print) |
| **Import** | JSON restore dengan validasi + batch replace (max 500 ops/batch) |
| **Responsive** | 4 breakpoints (400/520/900/1180px) + safe-area + touch optimization |
| **Akun Baru** | Tidak ada registrasi — akun dibuat manual via Firebase Console |
| **Dependensi** | sharp (PNG generator), heic2any (HEIC converter, CDN) |
