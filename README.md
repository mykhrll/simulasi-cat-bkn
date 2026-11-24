# 🏛️ SIMULASI CAT BKN — Platform Latihan & Simulasi SKD & SKB CPNS

![Version](https://img.shields.io/badge/Version-2.2.0%20Stable-0F2C59?style=for-the-badge)
![Format](https://img.shields.io/badge/Standar%20BKN-110%20Soal%20%7C%20100%20Menit-1D4ED8?style=for-the-badge)
![Platform](https://img.shields.io/badge/Platform-Mobile%20%26%20Desktop%20PWA-16A34A?style=for-the-badge)
![AI Powered](https://img.shields.io/badge/Generator-Hybrid%20AI%20%2B%20Parametric-F59E0B?style=for-the-badge)

Aplikasi web interaktif berbasis **Computer Assisted Test (CAT)** untuk latihan mandiri **Seleksi Kompetensi Dasar (SKD)** dan pengenalan **Seleksi Kompetensi Bidang (SKB) CPNS**. Dirancang responsif agar berjalan mulus di **browser ponsel (Mobile Web)**, **laptop/desktop**, maupun dipasang langsung sebagai aplikasi mandiri (**Progressive Web App / PWA**) lengkap dengan ikon aplikasi resmi.

---

## ✨ Fitur Utama

1. **Standar Resmi Ujian SKD BKN (110 Soal • 100 Menit • Skor Maksimal 550):**
   * **TWK (Tes Wawasan Kebangsaan):** 30 soal (Benar `+5`, Salah/Kosong `0`, Nilai Ambang Batas: `65`).
   * **TIU (Tes Intelegensia Umum):** 35 soal (Benar `+5`, Salah/Kosong `0`, Nilai Ambang Batas: `80`).
   * **TKP (Tes Karakteristik Pribadi):** 45 soal (Skala bobot gradasi `5 - 4 - 3 - 2 - 1`, Kosong `0`, Nilai Ambang Batas: `166`).
2. **Pusat Info Resmi, Timeline CPNS 2026–2027 & Checklist Berkas SSCASN:**
   * Menampilkan jadwal tahapan seleksi CPNS 2026–2027 (Pembuatan Akun SSCASN, Pengumuman Formasi, Pembukaan Pendaftaran, Seleksi Administrasi, hingga Jadwal SKD/SKB CAT BKN) beserta tautan cepat ke portal resmi `sscasn.bkn.go.id`.
   * Dilengkapi **Checklist Persiapan Berkas SSCASN** interaktif yang tersimpan otomatis di browser perangkat Anda.
3. **Panduan Lengkap Tahapan SKB, Mini Simulasi SKB CAT & Kalkulator Nilai Akhir (`40% SKD + 60% SKB`):**
   * Penjelasan lengkap komponen **SKB CAT BKN (100 soal / 90 menit)** serta tes tambahan non-CAT untuk instansi pusat (Kesamaptaan/Fisik, Pemeriksaan Kesehatan & PFK, Praktik Kerja/*Microteaching*, Psikotes, dan Wawancara).
   * Fitur **Mini Simulasi SKB CAT** langsung di Ruang CAT serta **Kalkulator Simulasi Nilai Akhir CPNS** untuk menghitung integrasi **40% SKD + 60% SKB**.
4. **Sinkronisasi Waktu Live WIB & Reset Paket Harian Otomatis (`00:00 WIB`):**
   * Menampilkan jam dan tanggal berjalan secara langsung (*real-time*) dalam zona **Waktu Indonesia Barat (`UTC+7`)** dengan pembaruan otomatis paket utama 110 soal setiap pukul **00:00 WIB**.
5. **Dua Mode Pengerjaan Fleksibel (Mode Ujian CAT & Mode Belajar Interaktif):**
   * **Mode Simulasi Ujian CAT:** Menyerupai suasana ujian asli dengan timer hitung mundur, navigasi nomor soal, penanda *Ragu-ragu*, serta skor dan pembahasan setelah ujian selesai.
   * **Mode Belajar Interaktif:** Dilengkapi tombol **Petunjuk (Hint)**, **Konfirmasi & Cek Jawaban**, serta **Batalkan Pilihan** (mencegah kunci jawaban terbuka otomatis jika tidak sengaja tertekan di layar HP) sebelum menampilkan pembahasan rinci.
6. **Generator Soal Tanpa Batas (Hybrid AI + Parametrik), Riwayat Hasil & Bank Soal Kustom:**
   * Bebas menentukan jumlah soal latihan (1 hingga 500 soal), menyimpan riwayat skor lengkap dengan fitur hapus riwayat, serta mendukung tambah soal manual dan impor/ekspor JSON.
7. **Dukungan Web App (PWA), Logo Aplikasi, Cookies & Izin Perangkat:**
   * Dilengkapi logo vektor **CAT BKN SKD** untuk *Add to Home Screen* / *Install App*, unduh logo PNG `512×512`, manajemen **Cookies**, dan **Pusat Izin Web App**.

---

## 📊 Struktur Penilaian & Ambang Batas SKD CPNS

| Subtes | Jumlah Soal | Durasi Total | Bobot Penilaian | Skor Maksimal | Nilai Ambang Batas (PG) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **TWK** (Tes Wawasan Kebangsaan) | 30 Soal | 100 Menit | Benar `5`, Salah/Kosong `0` | 150 | **65** |
| **TIU** (Tes Intelegensia Umum) | 35 Soal | *(Gabungan)* | Benar `5`, Salah/Kosong `0` | 175 | **80** |
| **TKP** (Tes Karakteristik Pribadi) | 45 Soal | *(Gabungan)* | Gradasi `5, 4, 3, 2, 1`, Kosong `0` | 225 | **166** |
| **Total Keseluruhan** | **110 Soal** | **100 Menit** | — | **550** | **311** *(Wajib lulus tiap subtes)* |

---

## 📁 Struktur File Repository

```text
simulasi/
├── index.html       # Aplikasi utama (ubah nama cat_bkn_simulasi_skd.html menjadi index.html)
├── env.js           # Konfigurasi environment API Key untuk fitur Generate Soal AI
├── README.md        # Dokumentasi lengkap aplikasi & panduan penggunaan
└── .gitignore       # Daftar file sistem/editor yang diabaikan Git
```

---

## 🚀 Cara Upload & Menjalankan di GitHub Pages

1. **Buat Repository Baru di GitHub:**
   * Masuk ke akun GitHub Anda, klik **New Repository**, beri nama misalnya `simulasi`, lalu pilih **Public**.
2. **Siapkan & Unggah File ke Repository:**
   * Ubah nama file `cat_bkn_simulasi_skd.html` menjadi **`index.html`** agar GitHub Pages otomatis membacanya sebagai halaman utama.
   * Unggah file **`index.html`**, **`env.js`**, **`README.md`**, dan **`.gitignore`** ke dalam folder utama (*root*) repository tersebut.
3. **Aktifkan GitHub Pages:**
   * Buka tab **Settings** pada repository Anda → pilih menu **Pages** di bilah kiri.
   * Pada bagian **Build and deployment** → **Source**, pilih **Deploy from a branch**, pilih branch `main` dengan folder `/root`, lalu klik **Save**.

---

## ⌨️ Pintasan Keyboard (Pengguna Laptop / Desktop)

* `A` – `E` atau `1` – `5` : Memilih opsi jawaban A sampai E.
* `Enter` : Mengonfirmasi dan mengecek jawaban *(khusus Mode Belajar Interaktif)*.
* `Delete` / `Backspace` : Membatalkan atau mengosongkan pilihan jawaban pada soal aktif.
* `←` / `→` *(Panah Kiri / Kanan)* : Berpindah ke soal sebelumnya atau berikutnya.
* `R` : Menandai atau menghapus status **Ragu-ragu** pada soal aktif.

---

## 📝 Catatan Rilis (Changelog)

### **v2.2.0** — *Current Release (Info CPNS 2026, Timeline & SKB Suite)*
* Penambahan tab **Info, Timeline & SKB** yang memuat jadwal resmi tahapan CPNS 2026–2027 dan tautan cepat portal SSCASN BKN.
* Penambahan panduan lengkap tahapan **SKB (CAT & Non-CAT)** beserta fitur **Mini Simulasi SKB CAT (15 Soal)** di Ruang CAT.
* Penambahan **Kalkulator Simulasi Nilai Akhir CPNS (40% SKD + 60% SKB)** yang dapat menarik skor SKD terakhir secara otomatis.
* Penambahan **Checklist Persiapan Berkas Pendaftaran SSCASN** interaktif yang tersimpan otomatis di browser.

### **v2.1.0** — *GitHub Pages & AI Hybrid Ready*
* Perbaikan render kartu soal di Ruang CAT pada perangkat mobile dan browser GitHub Pages.
* Penambahan dukungan konfigurasi environment (`env.js`) untuk generator soal hibrida (Gemini AI + Parametrik Instan).

### **v2.0.0** — *PWA, Live WIB & History Release*
* Sinkronisasi jam langsung **Waktu Indonesia Barat (WIB / UTC+7)** dengan reset otomatis paket harian pukul **00:00 WIB**.
* Penambahan logo resmi vektor **CAT BKN SKD**, Manifest PWA (`Install App`), manajemen **Cookies**, dan **Pusat Izin Web App**.
* Penambahan fitur tombol konfirmasi/batal pilihan pada Mode Belajar serta daftar **Riwayat Hasil Ujian** dengan fitur hapus riwayat.

### **v1.0.0** — *Initial Release*
* Rilis perdana simulasi CAT SKD CPNS standar 110 soal (30 TWK, 35 TIU, 45 TKP) dan bank soal kustom lokal.