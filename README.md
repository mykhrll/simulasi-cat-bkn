# 🏛️ SIMULASI CAT BKN — Platform Latihan & Simulasi SKD & SKB CPNS

![Version](https://img.shields.io/badge/Version-2.4.0%20Final%20Release-0F2C59?style=for-the-badge)
![Format](https://img.shields.io/badge/Standar%20BKN-110%20Soal%20%7C%20100%20Menit-1D4ED8?style=for-the-badge)
![Platform](https://img.shields.io/badge/Platform-Mobile%20%26%20Desktop%20PWA-16A34A?style=for-the-badge)
![AI Powered](https://img.shields.io/badge/Gemini%20AI-Live%20News%20%26%20SKB%20Instansi-F59E0B?style=for-the-badge)

🔗 **Repository GitHub:** [https://github.com/mykhrll/simulasi-cat-bkn](https://github.com/mykhrll/simulasi-cat-bkn)  
🌐 **Live Web App (GitHub Pages):** [https://mykhrll.github.io/simulasi-cat-bkn/](https://mykhrll.github.io/simulasi-cat-bkn/)

Aplikasi web interaktif berbasis **Computer Assisted Test (CAT)** untuk latihan mandiri **Seleksi Kompetensi Dasar (SKD)**, **Seleksi Kompetensi Bidang (SKB) per Instansi**, serta **Simulasi Tes SKB Tambahan (Non-CAT)** CPNS yang terintegrasi dengan **Gemini AI** dan **Google Search Grounding**. Dirancang responsif agar berjalan mulus di **browser ponsel (Mobile Web)**, **laptop/desktop**, maupun dipasang sebagai aplikasi mandiri (**Progressive Web App / PWA**).

---

## 📁 Struktur File Repository

Aplikasi dirancang dengan struktur kode terpisah yang bersih dan modular tanpa memerlukan proses *build* yang rumit:

```text
simulasi-cat-bkn/
├── index.html          # Struktur antarmuka utama (UI Tailwind CSS, Ruang CAT, Modal & PWA)
├── app.js              # Mesin logika aplikasi (Timer CAT, Bank Soal, Generator AI, Kalkulator & Riwayat)
├── env.js              # Konfigurasi environment API Key Gemini agar fitur AI aktif otomatis
├── env.example.js      # Template konfigurasi environment untuk pengembangan lokal
├── .gitignore          # Daftar pengecualian file sistem operasi & editor
└── README.md           # Dokumentasi lengkap fitur, passing grade, panduan deploy & changelog
```

---

## ✨ Fitur Utama Aplikasi

1. **Standar Resmi Ujian SKD BKN (110 Soal • 100 Menit • Skor Maksimal 550):**
   * **TWK (Tes Wawasan Kebangsaan):** 30 soal (Benar `+5`, Salah/Kosong `0`, Nilai Ambang Batas: `65`).
   * **TIU (Tes Intelegensia Umum):** 35 soal (Benar `+5`, Salah/Kosong `0`, Nilai Ambang Batas: `80`).
   * **TKP (Tes Karakteristik Pribadi):** 45 soal (Skala bobot gradasi `5 - 4 - 3 - 2 - 1`, Kosong `0`, Nilai Ambang Batas: `166`).
2. **Pembaruan Berita & Timeline CPNS 2026–2027 Otomatis (AI + Google Search):**
   * Terintegrasi dengan **Gemini AI Search Grounding** untuk memperbarui tren berita terbaru, kuota formasi kementerian, dan jadwal tahapan SSCASN BKN setiap hari (atau kapan pun saat menekan tombol **🔄 Update Berita Live**).
   * Dilengkapi **Checklist Persiapan Berkas SSCASN** interaktif yang tersimpan otomatis di perangkat pengguna.
3. **Simulasi SKB CAT Menyesuaikan Instansi & Reset Harian `00:00 WIB`:**
   * Mendukung pilihan 8 kelompok instansi tujuan (**Kemenkeu**, **Mahkamah Agung & Kejaksaan**, **Kemenkum / Imigrasi & Pemasyarakatan**, **Kemendikdasmen & Kemdiktisaintek**, **Kemenkes**, **Komdigi / BSSN**, **Kehutanan / KLH / Basarnas**, dan **Pemerintah Daerah & Umum**).
   * Paket soal SKB CAT menyesuaikan kisi-kisi instansi terkait, di-reset otomatis setiap pergantian hari pukul **00:00 WIB**, dan dapat di-generate ulang kapan saja menggunakan **Gemini AI**.
4. **Simulasi Lengkap Tes SKB Tambahan (Non-CAT):**
   * **Psikotes & Ketahanan Kerja ASN:** Simulasi studi kasus stabilitas emosi dan integritas kerja (skala `0–100`).
   * **Wawancara Panel Penguji AI:** Simulasi 4 pertanyaan wawancara panel sesuai instansi pilihan yang dinilai langsung oleh **Gemini AI** (skala `0–100`).
   * **Kesamaptaan Jasmani & PFK:** Kalkulator uji fisik BKN/Kemenkum/Polhut (Lari 12 menit, *push-up*, *sit-up*, *pull-up*, *shuttle run*) dengan hasil otomatis tersinkron ke **Kalkulator Nilai Akhir CPNS (`40% SKD + 60% SKB`)**.
5. **Dua Mode Pengerjaan Fleksibel & Diagnosis Evaluasi AI:**
   * **Mode Simulasi Ujian CAT:** Timer hitung mundur realistis, navigasi nomor soal, penanda *Ragu-ragu*, serta skor dan **Analisis Evaluasi & Strategi Belajar AI** setelah selesai.
   * **Mode Belajar Interaktif:** Dilengkapi tombol **Petunjuk (Hint)**, **Konfirmasi & Cek Jawaban**, serta **Batalkan Pilihan** (mencegah salah pencet di layar ponsel) sebelum menampilkan pembahasan rinci.
6. **Manajer Bank Soal, Generator Tanpa Batas & PWA:**
   * Generate soal baru mulai dari `1` hingga `500` soal secara instan (Hybrid Gemini AI & Parametrik), tambah soal manual, ekspor JSON, dukungan logo vektor **CAT BKN SKD** untuk *Install App*, serta manajemen **Cookies & Izin Perangkat**.

---

## 📊 Tabel Ketentuan & Ambang Batas Resmi SKD CPNS

| Subtes | Jumlah Soal | Bobot Nilai Benar | Bobot Nilai Salah / Kosong | Nilai Ambang Batas (*Passing Grade*) | Skor Maksimal |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **TWK** | 30 Soal | `+5` | `0` | **65** | 150 |
| **TIU** | 35 Soal | `+5` | `0` | **80** | 175 |
| **TKP** | 45 Soal | Gradasi `5, 4, 3, 2, 1` | `0` | **166** | 225 |
| **TOTAL** | **110 Soal** | — | — | **311** *(Wajib Lulus per Subtes)* | **550** |

> **Pembobotan Kelulusan Akhir CPNS:** Integrasi **40% Nilai SKD** + **60% Nilai SKB** (peringkat 3× formasi yang lolos *Passing Grade* SKD).

---

## 🚀 Cara Menjalankan & Deploy di GitHub Pages

1. Pastikan file `index.html`, `app.js`, `env.js`, dan `README.md` berada di *root* folder repository `simulasi-cat-bkn` pada branch `main`.
2. Buka tab **Settings** → **Pages** pada repository GitHub Anda.
3. Pada bagian **Build and deployment**, pilih **Deploy from a branch** → Branch `main` → Folder `/ (root)`, lalu klik **Save**.
4. Tunggu beberapa saat hingga situs aktif di `https://mykhrll.github.io/simulasi-cat-bkn/`.
5. Untuk memasang sebagai aplikasi di HP: buka tautan tersebut di Chrome/Safari, lalu pilih **Tambahkan ke Layar Utama (*Add to Home Screen / Install App*)**.

---

## 📝 Catatan Rilis Lengkap (Changelog)

### **v2.4.0** — *Final Release (Clean Modular Architecture `index.html` + `app.js`)*
* Pemisahan arsitektur kode menjadi **`index.html`** (UI & struktur CAT) dan **`app.js`** (mesin logika penuh tanpa pemotongan diff) agar mudah dikelola dan di-deploy pada GitHub Pages.
* Penyempurnaan kelengkapan master bank soal (**TWK, TIU, TKP gradasi 1–5, dan SKB CAT per Instansi**) serta pemulihan penuh seluruh alur konfirmasi *Mode Belajar*, navigasi CAT, dan penyimpanan riwayat lokal.

### **v2.3.0** — *Gemini AI Integration, SKB Per Instansi & Tes Tambahan Non-CAT*
* Integrasi **Gemini AI (`gemini-3-flash-preview`)** dengan *Google Search Grounding* untuk pembaruan berita & timeline CPNS 2026–2027 secara live setiap hari WIB.
* Penambahan pemilih **8 Instansi / Kementerian Tujuan** pada fitur SKB CAT dengan reset otomatis setiap pukul `00:00 WIB`.
* Penambahan suite **Simulasi Tes SKB Tambahan (Non-CAT)**: Psikotes ASN, Wawancara Panel Penguji AI, dan Kalkulator Kesamaptaan Fisik yang terhubung ke **Kalkulator Nilai Akhir (`40% SKD + 60% SKB`)**.
* Penambahan **Analisis Evaluasi & Strategi Belajar AI** pada halaman Hasil & Riwayat.

### **v2.2.0** — *Info CPNS 2026, Timeline & Panduan SKB*
* Penambahan tab **Info, Timeline & SKB** dengan jadwal tahapan seleksi SSCASN BKN, checklist persiapan berkas pendaftaran, dan kalkulator integrasi nilai akhir.

### **v2.1.0** — *Live WIB Clock, Study Confirmation & History Manager*
* Penambahan jam digital **WIB (UTC+7)** *real-time* beserta hitung mundur otomatis menuju reset harian `00:00 WIB`.
* Penambahan tombol **Konfirmasi / Batalkan Pilihan** pada Mode Belajar Interaktif untuk mencegah salah sentuh pada perangkat layar sentuh.
* Penambahan fitur **Riwayat Hasil Ujian** dengan opsi tinjau ulang pembahasan maupun hapus riwayat.

### **v2.0.0** — *Progressive Web App (PWA), Logo & Unlimited Question Generator*
* Penambahan logo resmi vektor & unduh ikon PNG `512×512`, dukungan *manifest* PWA, pengaturan **Cookies & Izin Perangkat**, serta generator soal otomatis tanpa batas (`1–500` soal).

### **v1.0.0** — *Initial Release*
* Rilis awal platform simulasi CAT BKN standar 110 soal (`30 TWK + 35 TIU + 45 TKP`), durasi 100 menit, navigasi nomor soal, penanda ragu-ragu, dan perhitungan *Passing Grade*.