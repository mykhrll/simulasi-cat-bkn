# 🏛️ CAT BKN — Platform Simulasi & Latihan Mandiri SKD CPNS

![Version](https://img.shields.io/badge/version-2.0.0-0F2C59?style=for-the-badge)
![Standard](https://img.shields.io/badge/Standar_BKN-110_Soal_%7C_100_Menit-1D4ED8?style=for-the-badge)
![Platform](https://img.shields.io/badge/Platform-Mobile_%26_Desktop_PWA-16A34A?style=for-the-badge)
![Architecture](https://img.shields.io/badge/Architecture-Single--File_HTML5-F59E0B?style=for-the-badge)

Aplikasi web interaktif berbasis **Computer Assisted Test (CAT)** yang dirancang untuk membantu calon peserta seleksi CPNS berlatih **Seleksi Kompetensi Dasar (SKD)** sesuai standar resmi Badan Kepegawaian Negara (BKN). Dibangun dalam arsitektur *single-file* mandiri tanpa memerlukan *server backend* eksternal, sehingga ringan, cepat, mendukung mode *offline* setelah dimuat, dan siap di-*hosting* gratis melalui **GitHub Pages**.

---

## ✨ Fitur Utama (v2.0.0)

### 1. Standar Resmi Ujian SKD BKN (110 Soal • 100 Menit)
* **Komposisi Soal Akurat:** **30 TWK** (Tes Wawasan Kebangsaan), **35 TIU** (Tes Intelegensia Umum), dan **45 TKP** (Tes Karakteristik Pribadi).
* **Sistem Penilaian & Ambang Batas (*Passing Grade*):**
  * **TWK:** Benar `+5`, Salah/Kosong `0` (Maksimal `150`, Ambang Batas `65`).
  * **TIU:** Benar `+5`, Salah/Kosong `0` (Maksimal `175`, Ambang Batas `80`).
  * **TKP:** Skala gradasi `5 • 4 • 3 • 2 • 1`, Kosong `0` (Maksimal `225`, Ambang Batas `166`).
  * **Total Skor Maksimal:** `550` (dengan penyesuaian ambang batas proporsional otomatis untuk paket latihan kustom).

### 2. Dua Mode Pengerjaan Fleksibel
* **⏱ Mode Simulasi Ujian CAT:** Menyerupai suasana ujian asli dengan *countdown timer*, navigasi nomor soal 2 kolom (hijau terjawab, kuning ragu-ragu, putih kosong), serta penyembunyian kunci jawaban hingga ujian selesai.
* **📖 Mode Belajar Interaktif:**
  * Dilengkapi tombol **💡 Petunjuk (Hint)** pada tiap soal.
  * **Konfirmasi & Pembatalan Pilihan:** Ketika memilih opsi `A–E`, jawaban tidak langsung terkunci sehingga Anda dapat menekan **✕ Batalkan Pilihan** jika salah sentuh atau **✓ Konfirmasi & Cek Jawaban** untuk melihat skor dan pembahasan rinci seketika.

### 3. Sinkronisasi Waktu Indonesia Barat (WIB) & Reset Harian 24 Jam
* Menampilkan **Jam & Tanggal Live WIB (`UTC+7`)** secara *real-time*.
* Paket Utama Harian (110 Soal) otomatis diperbarui (*reset*) setiap pergantian hari tepat pukul **00:00 WIB**, atau dapat diperbarui secara manual kapan saja melalui tombol **↻ Perbarui Paket Harian Sekarang**.

### 4. Generator Soal Tanpa Batas & Integrasi Prompt Gemini
* **Generator Parametrik Otomatis:** Buat paket latihan dengan jumlah soal bebas (`1` hingga `500` soal) baik secara proporsional maupun kustom per subtes (termasuk soal hitungan TIU dengan angka & pembahasan dinamis).
* **Bank Soal Kustom & Impor/Ekspor JSON:** Tambahkan soal secara manual, ekspor cadangan soal dalam format `.json`, atau salin *prompt* otomatis untuk meminta paket soal baru dari **Gemini AI** lalu mengimpornya langsung ke aplikasi.

### 5. Dashboard Hasil, Riwayat Evaluasi & Drill Soal Salah
* Menyimpan riwayat seluruh sesi ujian dan latihan lengkap dengan tanggal, rincian skor TWK/TIU/TKP, status kelulusan *passing grade*, filter pembahasan, serta fitur hapus riwayat per sesi maupun hapus semua.
* Fitur **↻ Latih Ulang Soal Salah / Ragu** untuk memfokuskan latihan pada butir soal yang belum mendapat skor optimal (`5`).

### 6. Dukungan Web App (PWA), Logo Resmi, Cookies & Izin Perangkat
* **Logo Vektor Resmi (SVG) & Manifest PWA:** Dapat di-*install* ke layar utama Android, iOS, maupun Desktop (*Add to Home Screen* / *Install App*) lengkap dengan ikon aplikasi dan fitur unduh logo `PNG 512×512`.
* **Pusat Manajemen Cookies & Izin:** Mendukung pengaturan kategori *cookies* lokal, izin **Penyimpanan Persisten**, **Notifikasi Pengingat Belajar**, **Layar Tetap Menyala (*Screen Wake Lock*)**, serta **Papan Klip (*Clipboard*)**.

---

## 🚀 Cara Upload & Menjalankan di GitHub Pages

1. **Buat Repository Baru di GitHub:**
   * Masuk ke akun GitHub Anda, klik **New Repository**, beri nama misalnya `simulasi-cat-bkn-skd`, lalu pilih **Public**.
2. **Siapkan File Utama:**
   * Ubah nama file aplikasi `cat_bkn_simulasi_skd.html` menjadi **`index.html`** agar GitHub Pages otomatis membacanya sebagai halaman utama.
   * Unggah file `index.html` dan `README.md` ini ke dalam repository tersebut.
3. **Aktifkan GitHub Pages:**
   * Buka menu **Settings** → pilih tab **Pages** di bilah kiri.
   * Pada bagian **Build and deployment** → **Source**, pilih **Deploy from a branch**.
   * Pilih branch `main` (folder `/root`), lalu klik **Save**.
4. **Akses Aplikasi:**
   * Tunggu sekitar 1–2 menit hingga tautan situs Anda muncul (contoh: `https://username.github.io/simulasi-cat-bkn-skd/`). Aplikasi siap diakses melalui browser HP maupun laptop serta dapat langsung di-*install* sebagai Web App.

---

## ⌨️ Pintasan Keyboard (Mode Desktop)

| Tombol Keyboard | Fungsi di Ruang CAT |
| :--- | :--- |
| `A`, `B`, `C`, `D`, `E` atau `1–5` | Memilih opsi jawaban |
| `Enter` | Mengonfirmasi pilihan jawaban (khusus Mode Belajar) |
| `Delete` / `Backspace` | Membatalkan / menghapus pilihan pada soal aktif |
| `←` / `→` (Panah Kiri/Kanan) | Berpindah ke soal sebelumnya / berikutnya |
| `R` | Menandai atau menghapus tanda **Ragu-ragu** |

---

## 📋 Riwayat Versi (Changelog)

* **`v2.0.0` (Saat Ini — Major Release):**
  * Penambahan logo resmi vektor SVG (`CAT BKN`), manifest Web App (PWA), dan fitur ekspor logo `PNG 512px`.
  * Penambahan *banner* persetujuan & panel manajemen **Cookies** serta **Pusat Izin Web App** (*Persistent Storage, Notifications, Screen Wake Lock, Clipboard*).
  * Audit menyeluruh dan perbaikan bug pada mesin ujian, navigasi responsif mobile/desktop, serta keamanan penyimpanan `safeStorage`.
* **`v1.4.0`:**
  * Sinkronisasi siklus reset paket soal harian menggunakan **Live Time Waktu Indonesia Barat (WIB / UTC+7)** menuju pukul `00:00 WIB`.
* **`v1.3.0`:**
  * Penambahan tombol konfirmasi & pembatalan pilihan pada Mode Belajar Interaktif, tombol hapus pilihan, serta dashboard **Riwayat Hasil Ujian** dengan fitur hapus riwayat.
* **`v1.2.0`:**
  * Peningkatan standar simulasi menjadi **110 Soal Resmi BKN** (30 TWK, 35 TIU, 45 TKP — 100 Menit) dan generator soal tanpa batas jumlah.
* **`v1.1.0`:**
  * Penambahan siklus pembaruan paket soal 24 jam, generator soal parametrik otomatis, dan pembuat *prompt* JSON untuk Gemini.
* **`v1.0.0`:**
  * Rilis awal platform simulasi CAT dengan 50 soal terkurasi, Mode Ujian, Mode Belajar, dan manajemen Bank Soal JSON.