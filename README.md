# 🏛️ SIMULASI CAT BKN — Platform Latihan & Simulasi SKD CPNS

![Version](https://img.shields.io/badge/Version-2.1.0%20Stable-0F2C59?style=for-the-badge)
![Format](https://img.shields.io/badge/Standar%20BKN-110%20Soal%20%7C%20100%20Menit-1D4ED8?style=for-the-badge)
![Platform](https://img.shields.io/badge/Platform-Mobile%20%26%20Desktop%20PWA-16A34A?style=for-the-badge)
![AI Powered](https://img.shields.io/badge/Generator-Hybrid%20AI%20%2B%20Parametric-F59E0B?style=for-the-badge)

Aplikasi web interaktif berbasis **Computer Assisted Test (CAT)** untuk latihan mandiri **Seleksi Kompetensi Dasar (SKD) CPNS**. Dirancang responsif agar berjalan mulus di **browser ponsel (Mobile Web)**, **laptop/desktop**, maupun dipasang langsung sebagai aplikasi mandiri (**Progressive Web App / PWA**) lengkap dengan ikon aplikasi resmi.

---

## ✨ Fitur Utama

1. **Standar Resmi Ujian SKD BKN (110 Soal • 100 Menit • Skor Maksimal 550):**
   * **TWK (Tes Wawasan Kebangsaan):** 30 soal (Benar `+5`, Salah/Kosong `0`, Nilai Ambang Batas: `65`).
   * **TIU (Tes Intelegensia Umum):** 35 soal (Benar `+5`, Salah/Kosong `0`, Nilai Ambang Batas: `80`).
   * **TKP (Tes Karakteristik Pribadi):** 45 soal (Skala bobot gradasi `5 - 4 - 3 - 2 - 1`, Kosong `0`, Nilai Ambang Batas: `166`).
2. **Sinkronisasi Waktu Live WIB & Reset Paket Harian Otomatis (`00:00 WIB`):**
   * Menampilkan jam dan tanggal berjalan secara langsung (*real-time*) dalam zona **Waktu Indonesia Barat (`UTC+7`)**.
   * Paket utama 110 soal diperbarui otomatis setiap pergantian hari pukul **00:00 WIB**, atau dapat di-refresh kapan saja secara manual.
3. **Dua Mode Pengerjaan Fleksibel:**
   * **Mode Simulasi Ujian CAT:** Menyerupai suasana ujian asli dengan timer hitung mundur, navigasi nomor soal, penanda *Ragu-ragu*, serta skor dan pembahasan yang muncul setelah ujian selesai.
   * **Mode Belajar Interaktif:** Dilengkapi tombol **Petunjuk (Hint)**, **Konfirmasi & Cek Jawaban**, serta **Batalkan Pilihan** (mencegah kunci jawaban terbuka otomatis jika tidak sengaja tertekan di layar HP) sebelum menampilkan pembahasan rinci.
4. **Generator Soal Tanpa Batas (Hybrid AI + Parametrik):**
   * Bebas menentukan jumlah soal latihan (1 hingga 500 soal) baik secara proporsional maupun mengatur jumlah TWK, TIU, dan TKP secara terpisah.
   * Terintegrasi dengan konfigurasi environment (`env.js`) untuk merakit soal baru dari Gemini AI sekaligus mesin parametrik hitungan TIU yang menghasilkan angka dan pembahasan baru setiap sesi.
5. **Dashboard Evaluasi, Riwayat Hasil & Latihan Ulang Soal Salah:**
   * Menyimpan seluruh riwayat sesi ujian/latihan yang pernah dikerjakan lengkap dengan status kelulusan *Passing Grade* proporsional, fitur tinjau pembahasan per soal, serta tombol hapus riwayat per sesi maupun hapus semua.
   * Mengumpulkan otomatis soal yang dijawab salah, belum skor 5, atau ditandai ragu-ragu agar bisa dilatih ulang secara terfokus.
6. **Bank Soal Kustom & Impor/Ekspor JSON:**
   * Mendukung penambahan soal manual baru (TWK, TIU, maupun TKP berbobot 1–5) serta pencadangan/pemulihan koleksi soal melalui file JSON.
7. **Dukungan Web App (PWA), Logo Aplikasi, Cookies & Izin Perangkat:**
   * Dilengkapi logo vektor **CAT BKN SKD** yang otomatis terdaftar pada *Manifest Web App*, *Favicon*, dan *Apple Touch Icon* saat dipasang ke layar utama (*Add to Home Screen*), beserta tombol unduh logo PNG `512×512`.
   * Dilengkapi manajemen persetujuan **Cookies** serta pusat pengaturan **Izin Web App** (*Penyimpanan Persisten*, *Notifikasi Pengingat*, *Screen Wake Lock*, dan *Akses Papan Klip*).

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
3. **Konfigurasi Environment (`env.js`):**
   * File `env.js` dimuat otomatis oleh `index.html` melalui `<script src="env.js">`, sehingga pengguna lain yang membuka situs GitHub Pages Anda dapat langsung menggunakan fitur **Generate Soal** tanpa perlu memasukkan API Key secara manual.
4. **Aktifkan GitHub Pages:**
   * Buka tab **Settings** pada repository Anda → pilih menu **Pages** di bilah kiri.
   * Pada bagian **Build and deployment** → **Source**, pilih **Deploy from a branch**.
   * Pilih branch `main` dengan folder `/root`, lalu klik **Save**.
   * Tunggu 1–2 menit hingga tautan situs Anda aktif (contoh: `https://username.github.io/simulasi/`).

---

## ⌨️ Pintasan Keyboard (Pengguna Laptop / Desktop)

Saat berada di **Ruang CAT**, Anda dapat menggunakan tombol keyboard berikut untuk mempercepat pengerjaan:

* `A` – `E` atau `1` – `5` : Memilih opsi jawaban A sampai E.
* `Enter` : Mengonfirmasi dan mengecek jawaban *(khusus Mode Belajar Interaktif)*.
* `Delete` / `Backspace` : Membatalkan atau mengosongkan pilihan jawaban pada soal aktif.
* `←` / `→` *(Panah Kiri / Kanan)* : Berpindah ke soal sebelumnya atau berikutnya.
* `R` : Menandai atau menghapus status **Ragu-ragu** pada soal aktif.

---

## 📝 Catatan Rilis (Changelog)

### **v2.1.0** — *Current Release (GitHub Pages & AI Hybrid Ready)*
* Perbaikan render kartu soal di Ruang CAT pada perangkat mobile dan browser GitHub Pages.
* Penambahan dukungan konfigurasi environment (`env.js`) untuk generator soal hibrida (Gemini AI + Parametrik Instan).
* Penyempurnaan manajemen sesi, konfirmasi jawaban di Mode Belajar, dan validasi navigasi nomor soal.

### **v2.0.0** — *PWA, Live WIB & History Release*
* Sinkronisasi jam langsung **Waktu Indonesia Barat (WIB / UTC+7)** dengan reset otomatis paket harian pukul **00:00 WIB**.
* Penambahan logo resmi vektor **CAT BKN SKD**, Manifest PWA (`Install App`), manajemen **Cookies**, dan **Pusat Izin Web App**.
* Penambahan fitur tombol konfirmasi/batal pilihan pada Mode Belajar serta daftar **Riwayat Hasil Ujian** dengan fitur hapus riwayat.

### **v1.0.0** — *Initial Release*
* Rilis perdana simulasi CAT SKD CPNS standar 110 soal (30 TWK, 35 TIU, 45 TKP) dan bank soal kustom lokal.