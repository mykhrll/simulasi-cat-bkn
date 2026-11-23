<!-- ... existing code ... -->
## 🚀 Cara Upload & Menjalankan di GitHub Pages

1. **Buat Repository Baru di GitHub:**
   * Masuk ke akun GitHub Anda, klik **New Repository**, beri nama misalnya `simulasi`, lalu pilih **Public**.
2. **Siapkan File Utama:**
   * Ubah nama file aplikasi `cat_bkn_simulasi_skd.html` menjadi **`index.html`** agar GitHub Pages otomatis membacanya sebagai halaman utama.
   * Unggah file **`index.html`**, **`env.js`**, **`README.md`**, dan **`.gitignore`** ke dalam repository tersebut.
3. **Konfigurasi Environment (`env.js`):**
   * File `env.js` sudah terhubung langsung dengan `<script src="env.js">` di dalam `index.html`, sehingga pengguna umum yang mengakses situs GitHub Pages Anda dapat langsung men-generate soal baru tanpa perlu memasukkan API Key secara manual.
4. **Aktifkan GitHub Pages:**
   * Buka menu **Settings** → pilih tab **Pages** di bilah kiri.
   * Pada bagian **Build and deployment** → **Source**, pilih **Deploy from a branch**.
   * Pilih branch `main` (folder `/root`), lalu klik **Save**.

---
<!-- ... existing code ... -->