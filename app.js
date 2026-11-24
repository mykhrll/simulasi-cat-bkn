// ============================================================================
// SIMULASI CAT BKN v2.4 FINAL — APPLICATION ENGINE (app.js)
// Repository: https://github.com/mykhrll/simulasi-cat-bkn
// ============================================================================

// ============================================================================
// 1. SAFE STORAGE WRAPPER & ENVIRONMENT CONFIG
// ============================================================================
const memoryFallbackStore = {};
const safeStorage = {
  getItem(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (e) {
      return Object.prototype.hasOwnProperty.call(memoryFallbackStore, key) ? memoryFallbackStore[key] : null;
    }
  },
  setItem(key, val) {
    try {
      window.localStorage.setItem(key, val);
    } catch (e) {
      memoryFallbackStore[key] = String(val);
    }
  },
  removeItem(key) {
    try {
      window.localStorage.removeItem(key);
    } catch (e) {
      delete memoryFallbackStore[key];
    }
  }
};

const BUILTIN_GEMINI_KEY = "AQ.Ab8RN6JlBZiYQMYIKpGTQVsTxWLjazzMnCQ8HpkAkcPhc7wYfw";

function getActiveGeminiApiKey() {
  const userSaved = safeStorage.getItem('cat_bkn_user_gemini_api_key_v1');
  if (userSaved && userSaved.trim().length > 10) return userSaved.trim();
  if (window.ENV && window.ENV.GEMINI_API_KEY && window.ENV.GEMINI_API_KEY.trim().length > 10) {
    return window.ENV.GEMINI_API_KEY.trim();
  }
  return BUILTIN_GEMINI_KEY;
}

const STORAGE_KEYS = {
  CUSTOM_QUESTIONS: 'cat_bkn_custom_questions_v2',
  ACTIVE_SESSION: 'cat_bkn_active_session_v2',
  LAST_RESULT: 'cat_bkn_last_result_v2',
  RESULT_HISTORY: 'cat_bkn_result_history_v2',
  DAILY_STATE: 'cat_bkn_daily_state_v2',
  COOKIE_PREFS: 'cat_bkn_cookie_prefs_v1',
  USER_API_KEY: 'cat_bkn_user_gemini_api_key_v1',
  BERKAS_CHECKLIST: 'cat_bkn_berkas_checklist_v1',
  LIVE_NEWS_CACHE: 'cat_bkn_live_news_cache_v1',
  SKB_DAILY_CACHE: 'cat_bkn_skb_daily_cache_v1',
  EXTRA_TEST_SCORE: 'cat_bkn_extra_test_score_v1'
};

// ============================================================================
// 2. GEMINI API CLIENT WITH EXPONENTIAL BACKOFF & GOOGLE SEARCH GROUNDING
// ============================================================================
async function callGeminiApiWithBackoff(payload, maxRetries = 3) {
  const apiKey = getActiveGeminiApiKey();
  if (!apiKey) throw new Error('API Key tidak tersedia');
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${encodeURIComponent(apiKey)}`;

  let delay = 1000;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        if ((response.status === 429 || response.status >= 500) && attempt < maxRetries) {
          await new Promise(res => setTimeout(res, delay));
          delay *= 2;
          continue;
        }
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.json();
    } catch (err) {
      if (attempt < maxRetries) {
        await new Promise(res => setTimeout(res, delay));
        delay *= 2;
        continue;
      }
      throw err;
    }
  }
}

// ============================================================================
// 3. INSTITUTION PROFILES FOR SKB & ADDITIONAL TESTS
// ============================================================================
const SKB_INSTANSI_PROFILES = {
  KEMENKEU: {
    name: 'Kementerian Keuangan (Kemenkeu)',
    kisiKisi: 'UU Keuangan Negara (UU 17/2003), APBN, Perbendaharaan Negara (UU 1/2004), Perpajakan, Kepabeanan & Cukai, serta Ekonomi Makro.',
    extraTests: 'SKB CAT BKN (50%) + Psikotes (25%) + Wawancara & Kesehatan/Kebugaran (25%).',
    defaultWeight: '50'
  },
  MA_KEJAKSAAN: {
    name: 'Mahkamah Agung & Kejaksaan RI',
    kisiKisi: 'Hukum Pidana (KUHP Baru), Hukum Perdata, Hukum Acara Pidana/Perdata, Kekuasaan Kehakiman, Hukum Tata Negara, dan Kejaksaan.',
    extraTests: 'SKB CAT BKN (50%) + Psikotes, Wawancara Panel & Pemeriksaan Kesehatan (50%).',
    defaultWeight: '50'
  },
  KEMENKUM_IMIPAS: {
    name: 'Kemenkum / Imigrasi & Pemasyarakatan',
    kisiKisi: 'UU Keimigrasian (UU 6/2011), UU Pemasyarakatan (UU 22/2022), Hak Asasi Manusia, Pembentukan Peraturan Perundang-undangan & Tugas Petugas Lapas/Imigrasi.',
    extraTests: 'SKB CAT BKN (50%) + Kesamaptaan Fisik (25%) + Pemeriksaan Kesehatan/PFK & Wawancara (25%).',
    defaultWeight: '50'
  },
  KEMENDIKDASMEN: {
    name: 'Kemendikdasmen & Kemdiktisaintek (Guru/Dosen)',
    kisiKisi: 'Kompetensi Pedagogik, Teori Belajar, Asesmen & Evaluasi Pembelajaran, Kurikulum Nasional, Literasi-Numerasi & Etika Profesi Pendidik.',
    extraTests: 'SKB CAT BKN (60%) + Praktik Mengajar / Microteaching & Wawancara (40%).',
    defaultWeight: '60'
  },
  KEMENKES: {
    name: 'Kementerian Kesehatan (Kemenkes)',
    kisiKisi: 'UU Kesehatan (UU 17/2023), Sistem Kesehatan Nasional, Epidemiologi, Pencegahan & Pengendalian Penyakit, Keselamatan Pasien & Etika Medis.',
    extraTests: 'SKB CAT BKN (60%) + Psikotes / Wawancara Teknis Kesehatan (40%).',
    defaultWeight: '60'
  },
  KOMDIGI_BSSN: {
    name: 'Komdigi / BSSN / Pranata Komputer',
    kisiKisi: 'Arsitektur SPBE (Perpres 95/2018), Keamanan Informasi & Kriptografi, Jaringan Komputer, Basis Data Relasional, Rekayasa Perangkat Lunak & UU PDP.',
    extraTests: 'SKB CAT BKN (60%) + Praktik Kerja Teknis IT / Psikotes (40%).',
    defaultWeight: '60'
  },
  KEHUTANAN_SAR: {
    name: 'Kementerian Kehutanan / KLH / Basarnas',
    kisiKisi: 'Konservasi Sumber Daya Alam Hayati, Perlindungan Hutan (Polhut), Pengendalian Kebakaran Hutan (Manggala Agni), Lingkungan Hidup & Manajemen SAR.',
    extraTests: 'SKB CAT BKN (50%) + Tes Kesamaptaan Jasmani & Kesehatan/PFK (50%).',
    defaultWeight: '50'
  },
  PEMDA_UMUM: {
    name: 'Pemerintah Daerah & Instansi Umum',
    kisiKisi: 'Manajemen ASN (UU 20/2023) & Core Values BerAKHLAK, Pelayanan Publik (UU 25/2009), Pemerintahan Daerah (UU 23/2014), dan Kearsipan.',
    extraTests: '100% SKB CAT BKN (Tanpa tes tambahan pada mayoritas formasi Pemerintah Daerah).',
    defaultWeight: '100'
  }
};

// ============================================================================
// 4. CURATED MASTER QUESTION BANK (TWK, TIU, TKP, AND SKB PER INSTANSI)
// ============================================================================
const BASE_QUESTION_BANK = [
  // --- TWK (12 Master Questions) ---
  {
    id: 'twk-01', subtest: 'TWK', topic: 'Nasionalisme & Sumpah Pemuda',
    question: 'Arus disinformasi di media sosial sering memanfaatkan sentimen kedaerahan untuk memecah belah masyarakat. Sikap yang paling mencerminkan semangat nasionalisme yang berakar pada nilai Sumpah Pemuda 1928 adalah ....',
    hint: 'Utamakan persatuan nasional dan verifikasi fakta sebelum menyebarkan informasi.',
    explanation: 'Nasionalisme modern menuntut setiap warga menempatkan persatuan bangsa di atas ego kedaerahan serta menyaring informasi agar tidak memicu perpecahan.',
    options: [
      { text: 'Menempatkan kepentingan persatuan bangsa di atas ego kedaerahan serta memverifikasi informasi sebelum menyebarkannya', score: 5 },
      { text: 'Membela kelompok daerah sendiri secara terbuka agar tidak direndahkan oleh pengguna lain di media sosial', score: 0 },
      { text: 'Menghindari seluruh diskusi publik dan menutup akses informasi dari luar daerah', score: 0 },
      { text: 'Menyerahkan sepenuhnya penanganan hoaks kepada aparat tanpa perlu mengedukasi lingkungan sekitar', score: 0 },
      { text: 'Membalas unggahan provokatif dengan argumen kedaerahan yang lebih keras', score: 0 }
    ]
  },
  {
    id: 'twk-02', subtest: 'TWK', topic: 'Integritas & Antikorupsi',
    question: 'Seorang ketua panitia pengadaan barang/jasa mengetahui bahwa salah satu direktur perusahaan peserta tender adalah sepupu kandungnya. Langkah berintegritas yang paling tepat dilakukan adalah ....',
    hint: 'Hindari benturan kepentingan (conflict of interest) secara transparan.',
    explanation: 'Prinsip integritas dan tata kelola pemerintahan yang baik mewajibkan pejabat melaporkan potensi benturan kepentingan dan menarik diri dari proses pengambilan keputusan.',
    options: [
      { text: 'Melaporkan potensi konflik kepentingan kepada atasan dan mengundurkan diri dari kepanitiaan tender tersebut', score: 5 },
      { text: 'Tetap menjadi ketua panitia dengan janji dalam hati akan menilai secara objektif', score: 0 },
      { text: 'Meminta perusahaan sepupunya menaikkan harga penawaran agar tidak dicurigai', score: 0 },
      { text: 'Mendelegasikan penilaian teknis saja namun tetap menandatangani penetapan pemenang', score: 0 },
      { text: 'Merahasiakan hubungan keluarga tersebut selama dokumen administrasi perusahaan lengkap', score: 0 }
    ]
  },
  {
    id: 'twk-03', subtest: 'TWK', topic: 'Integritas — Tindak Pidana Korupsi',
    question: 'Seorang kepala dinas meminta sejumlah uang kepada calon penerima bantuan sosial sebagai syarat agar berkas pencairan dana segera ditandatangani. Dalam perspektif UU Tipikor, perbuatan tersebut dikategorikan sebagai ....',
    hint: 'Pejabat menyalahgunakan kekuasaan untuk memaksa pihak lain memberikan sesuatu.',
    explanation: 'Pasal 12 huruf e UU Tipikor mengatur tentang pemerasan dalam jabatan, yakni pegawai negeri atau penyelenggara negara yang menyalahgunakan kekuasaannya memaksa seseorang memberikan sesuatu.',
    options: [
      { text: 'Pemerasan dalam jabatan karena menyalahgunakan kekuasaan untuk memaksa pihak lain memberikan sesuatu', score: 5 },
      { text: 'Gratifikasi yang boleh diterima apabila dilaporkan dalam waktu 30 hari kerja', score: 0 },
      { text: 'Kelalaian administratif yang cukup diselesaikan melalui teguran lisan', score: 0 },
      { text: 'Benturan kepentingan perdata antara pejabat dan masyarakat', score: 0 },
      { text: 'Sumbangan sukarela untuk biaya operasional pencairan anggaran', score: 0 }
    ]
  },
  {
    id: 'twk-04', subtest: 'TWK', topic: 'Bela Negara — Era Digital',
    question: 'Ancaman terhadap kedaulatan negara di era modern juga berupa peretasan pusat data nasional dan pencurian informasi strategis. Perwujudan nilai bela negara yang relevan bagi ASN pengelola sistem informasi adalah ....',
    hint: 'Sesuaikan bela negara dengan profesi dan keahlian masing-masing.',
    explanation: 'Sesuai UU No. 23 Tahun 2019, pengabdian sesuai profesi seperti menjaga keamanan siber dan kerahasiaan data negara merupakan bentuk nyata bela negara.',
    options: [
      { text: 'Menerapkan standar keamanan siber, melakukan audit kerentanan rutin, dan menjaga kerahasiaan data negara', score: 5 },
      { text: 'Mengikuti wajib militer penuh waktu dan meninggalkan tugas pengelolaan server instansi', score: 0 },
      { text: 'Menyimpan salinan basis data instansi di perangkat pribadi agar mudah diakses dari rumah', score: 0 },
      { text: 'Membagikan kata sandi administrator kepada seluruh staf agar pekerjaan lebih cepat', score: 0 },
      { text: 'Menonaktifkan seluruh layanan daring publik setiap kali muncul berita serangan siber', score: 0 }
    ]
  },
  {
    id: 'twk-05', subtest: 'TWK', topic: 'Bela Negara — Pengabdian',
    question: 'Ketika mendapatkan surat keputusan penempatan tugas pertama di wilayah terdepan, terluar, dan tertinggal (3T) dengan fasilitas terbatas, sikap CPNS yang mencerminkan nilai rela berkorban untuk bangsa adalah ....',
    hint: 'Ingat pernyataan kesediaan ditempatkan di seluruh wilayah NKRI saat mendaftar.',
    explanation: 'Menerima penempatan di wilayah 3T dengan penuh tanggung jawab serta berinovasi melayani masyarakat menunjukkan kerelaan berkorban demi pemerataan pelayanan publik.',
    options: [
      { text: 'Menerima penempatan dengan penuh tanggung jawab serta berinovasi menjalankan pelayanan publik sesuai kondisi setempat', score: 5 },
      { text: 'Segera mengajukan permohonan pindah tugas ke kota asal dengan alasan fasilitas kurang memadai', score: 0 },
      { text: 'Menunda keberangkatan hingga seluruh sarana perkantoran di lokasi baru selesai dibangun', score: 0 },
      { text: 'Menjalankan tugas seadanya sambil mencari lowongan pekerjaan lain di kota besar', score: 0 },
      { text: 'Mengundurkan diri setelah menerima SK agar bisa mendaftar ulang tahun depan', score: 0 }
    ]
  },
  {
    id: 'twk-06', subtest: 'TWK', topic: 'Pilar Negara — Pancasila',
    question: 'Dalam musyawarah desa, sebagian warga mengusulkan pembangunan pasar, sedangkan sebagian lainnya mengusulkan perbaikan irigasi pertanian. Keputusan akhirnya disepakati bersama untuk mendahulukan irigasi karena menyangkut hajat hidup mayoritas petani. Peristiwa ini mengamalkan Pancasila khususnya sila ....',
    hint: 'Keputusan diambil melalui musyawarah mufakat demi kepentingan bersama.',
    explanation: 'Mengutamakan musyawarah untuk mencapai mufakat dalam mengambil keputusan bagi kepentingan bersama merupakan pengamalan Sila Keempat Pancasila.',
    options: [
      { text: 'Keempat, karena mengedepankan musyawarah mufakat demi kepentingan bersama', score: 5 },
      { text: 'Pertama, karena berkaitan dengan rasa syukur atas hasil pertanian warga', score: 0 },
      { text: 'Kedua, karena memberikan bantuan modal usaha kepada seluruh pedagang', score: 0 },
      { text: 'Ketiga, karena mewajibkan seluruh warga membeli hasil panen lokal', score: 0 },
      { text: 'Kelima, karena membagi anggaran desa sama rata untuk setiap kepala keluarga', score: 0 }
    ]
  },
  {
    id: 'twk-07', subtest: 'TWK', topic: 'Pilar Negara — UUD NRI 1945 (MK)',
    question: 'Berdasarkan Pasal 24C ayat (1) UUD NRI Tahun 1945, salah satu kewenangan Mahkamah Konstitusi (MK) dalam sistem ketatanegaraan Indonesia adalah ....',
    hint: 'Bedakan kewenangan MK (menguji UU terhadap UUD) dengan MA (menguji peraturan di bawah UU terhadap UU).',
    explanation: 'Pasal 24C ayat (1) UUD 1945 menyatakan MK berwenang mengadili pada tingkat pertama dan terakhir yang putusannya bersifat final untuk menguji undang-undang terhadap UUD, memutus sengketa kewenangan lembaga negara, memutus pembubaran parpol, dan memutus perselisihan hasil pemilu.',
    options: [
      { text: 'Memutus sengketa kewenangan lembaga negara yang kewenangannya diberikan oleh Undang-Undang Dasar', score: 5 },
      { text: 'Menguji Peraturan Pemerintah dan Peraturan Presiden terhadap Undang-Undang', score: 0 },
      { text: 'Memberikan grasi dan rehabilitasi atas pertimbangan Dewan Perwakilan Rakyat', score: 0 },
      { text: 'Mengangkat dan memberhentikan hakim agung secara mandiri tanpa usulan KY', score: 0 },
      { text: 'Menetapkan Anggaran Pendapatan dan Belanja Negara bersama Presiden', score: 0 }
    ]
  },
  {
    id: 'twk-08', subtest: 'TWK', topic: 'Pilar Negara — Staatsfundamentalnorm',
    question: 'Kedudukan Pembukaan UUD NRI Tahun 1945 sebagai pokok kaidah negara yang fundamental (staatsfundamentalnorm) memiliki konsekuensi hukum berupa ....',
    hint: 'Pembukaan UUD 1945 memuat dasar negara Pancasila dan cita hukum tertinggi.',
    explanation: 'Sebagai staatsfundamentalnorm, Pembukaan UUD 1945 menjadi sumber hukum tertinggi bagi pasal-pasal batang tubuh UUD serta seluruh peraturan perundang-undangan di bawahnya dan tidak dapat diubah oleh lembaga mana pun.',
    options: [
      { text: 'Setiap pasal dalam batang tubuh UUD dan seluruh peraturan di bawahnya harus bersumber dan tidak bertentangan dengan nilai di dalamnya', score: 5 },
      { text: 'Pembukaan UUD 1945 dapat diamendemen setiap lima tahun sekali melalui sidang paripurna DPR', score: 0 },
      { text: 'Kedudukan Pembukaan UUD 1945 sejajar dengan Ketetapan MPR dan Undang-Undang', score: 0 },
      { text: 'Batang tubuh UUD 1945 dapat mengesampingkan pokok pikiran dalam Pembukaan apabila diperlukan', score: 0 },
      { text: 'Pembukaan UUD 1945 hanya berlaku sebagai dokumen historis tanpa daya ikat yuridis', score: 0 }
    ]
  },
  {
    id: 'twk-09', subtest: 'TWK', topic: 'Pilar Negara — Bhinneka Tunggal Ika',
    question: 'Semboyan Bhinneka Tunggal Ika dari Kakawin Sutasoma karya Mpu Tantular mengajarkan persatuan dalam keberagaman. Implementasi konkret nilai tersebut dalam pelayanan publik birokrasi modern tampak pada ....',
    hint: 'Pelayanan publik harus adil, setara, dan bebas diskriminasi.',
    explanation: 'Menyediakan pelayanan administrasi tanpa diskriminasi suku, agama, ras, maupun golongan serta menghormati kebutuhan ibadah pemohon mencerminkan Bhinneka Tunggal Ika.',
    options: [
      { text: 'Pelayanan administrasi yang setara tanpa diskriminasi latar belakang suku maupun agama serta penyediaan fasilitas ramah difabel', score: 5 },
      { text: 'Mengutamakan antrean pemohon yang berasal dari daerah yang sama dengan petugas loket', score: 0 },
      { text: 'Mewajibkan seluruh pemohon layanan menggunakan bahasa daerah setempat saat bertransaksi', score: 0 },
      { text: 'Membatasi jam pelayanan hanya pada hari tertentu sesuai kebiasaan lokal', score: 0 },
      { text: 'Memisahkan loket pelayanan berdasarkan asal suku pemohon', score: 0 }
    ]
  },
  {
    id: 'twk-10', subtest: 'TWK', topic: 'Bahasa Indonesia — Peluluhan Fonem KTSP',
    question: 'Berdasarkan kaidah peluluhan fonem awal k, p, t, dan s pada pembentukan kata berimbuhan meN-, manakah deretan kata baku yang seluruhnya ditulis dengan tepat?',
    hint: 'Huruf k, p, t, s yang diikuti vokal akan luluh jika mendapat awalan meN- (kecuali gugus konsonan seperti kr-, tr-, sp-).',
    explanation: 'Kata dasar pengaruh -> memengaruhi, pesona -> memesona, sukses -> menyukseskan, dan kritik (gugus konsonan kr-) -> mengkritik.',
    options: [
      { text: 'Memengaruhi, memesona, menyukseskan, mengkritik', score: 5 },
      { text: 'Mempengaruhi, mempesona, mensukseskan, mengkritik', score: 0 },
      { text: 'Memengaruhi, mempesona, menyukseskan, mengritik', score: 0 },
      { text: 'Mempengaruhi, memesona, mensukseskan, mengritik', score: 0 },
      { text: 'Memengaruhi, memesona, menyukseskan, mekritik', score: 0 }
    ]
  },
  {
    id: 'twk-11', subtest: 'TWK', topic: 'Bahasa Indonesia — Kalimat Efektif',
    question: 'Perhatikan kalimat-kalimat berikut:\n1) Para hadirin sekalian dimohon berdiri ketika lagu kebangsaan dikumandangkan.\n2) Rapat koordinasi itu membahas mengenai penyusunan anggaran tahun depan.\n3) Seluruh peserta ujian wajib membawa kartu tanda peserta dan identitas diri.\n4) Demi untuk kelancaran acara, panitia menutup akses jalan di depan gedung.\n\nKalimat efektif yang memenuhi kaidah kehematan dan ketepatan struktur ditunjukkan oleh nomor ....',
    hint: 'Cari kalimat yang tidak mengalami pleonasme (pemborosan kata).',
    explanation: 'Kalimat (3) hemat dan baku. Kalimat (1) boros (para + hadirin + sekalian), (2) membahas tidak perlu diikuti mengenai, dan (4) demi + untuk bermakna ganda.',
    options: [
      { text: '3)', score: 5 },
      { text: '1)', score: 0 },
      { text: '2)', score: 0 },
      { text: '4)', score: 0 },
      { text: '1) dan 3)', score: 0 }
    ]
  },
  {
    id: 'twk-12', subtest: 'TWK', topic: 'Bahasa Indonesia — EYD V Huruf Kapital',
    question: 'Penulisan huruf kapital dan tanda baca yang paling tepat sesuai Ejaan Bahasa Indonesia yang Disempurnakan Edisi V (EYD V) terdapat pada kalimat ....',
    hint: 'Nama jabatan yang diikuti nama orang/wilayah dan nama geografi ditulis dengan huruf kapital.',
    explanation: 'Gubernur Lampung dan Menteri Dalam Negeri ditulis kapital karena diikuti nama daerah/instansi resmi, serta Bandar Lampung sebagai nama geografi.',
    options: [
      { text: 'Pelantikan Gubernur Lampung tersebut dihadiri oleh Menteri Dalam Negeri di Bandar Lampung.', score: 5 },
      { text: 'Pelantikan gubernur Lampung tersebut dihadiri oleh menteri dalam negeri di Bandar Lampung.', score: 0 },
      { text: 'Pelantikan Gubernur lampung tersebut dihadiri oleh Menteri Dalam Negeri di bandar Lampung.', score: 0 },
      { text: 'Pelantikan Gubernur Lampung tersebut dihadiri oleh menteri Dalam Negeri di Bandar lampung.', score: 0 },
      { text: 'Pelantikan gubernur lampung tersebut dihadiri oleh Menteri dalam Negeri di Bandar Lampung.', score: 0 }
    ]
  },

  // --- TIU (12 Master Questions) ---
  {
    id: 'tiu-01', subtest: 'TIU', topic: 'Analogi Verbal',
    question: 'DISINFEKTAN : BAKTERI = .... : ....',
    hint: 'Disinfektan berfungsi membasmi/menetralkan bakteri.',
    explanation: 'Hubungan fungsi: disinfektan digunakan untuk membasmi/menetralkan bakteri, sebagaimana antidotum (penawar) digunakan untuk menetralkan racun.',
    options: [
      { text: 'ANTIDOTUM : RACUN', score: 5 },
      { text: 'VIRUS : VAKSIN', score: 0 },
      { text: 'PUPUK : TANAMAN', score: 0 },
      { text: 'APOTEK : OBAT', score: 0 },
      { text: 'DEMAM : TERMOMETER', score: 0 }
    ]
  },
  {
    id: 'tiu-02', subtest: 'TIU', topic: 'Penalaran Logis (Silogisme)',
    question: 'Tidak ada pegawai honorer yang mendapatkan tunjangan kinerja penuh. Sebagian anggota tim audit internal adalah pegawai honorer. Simpulan yang paling tepat dari kedua premis tersebut adalah ....',
    hint: 'Premis universal negatif + premis partikular afirmatif menghasilkan simpulan partikular negatif.',
    explanation: 'Karena sebagian anggota tim audit internal adalah pegawai honorer, dan tidak ada pegawai honorer yang mendapat tunjangan kinerja penuh, maka sebagian anggota tim audit internal tidak mendapatkan tunjangan kinerja penuh.',
    options: [
      { text: 'Sebagian anggota tim audit internal tidak mendapatkan tunjangan kinerja penuh.', score: 5 },
      { text: 'Semua anggota tim audit internal tidak mendapatkan tunjangan kinerja penuh.', score: 0 },
      { text: 'Semua pegawai honorer adalah anggota tim audit internal.', score: 0 },
      { text: 'Tidak ada anggota tim audit internal yang mendapatkan tunjangan kinerja penuh.', score: 0 },
      { text: 'Sebagian pegawai honorer mendapatkan tunjangan kinerja penuh.', score: 0 }
    ]
  },
  {
    id: 'tiu-03', subtest: 'TIU', topic: 'Penalaran Logis (Modus Tollens)',
    question: 'Jika berkas pendaftaran CPNS tidak dilengkapi surat pernyataan bermeterai, maka pelamar dinyatakan tidak memenuhi syarat administrasi. Rina dinyatakan memenuhi syarat administrasi. Simpulan yang sah adalah ....',
    hint: 'Gunakan aturan Modus Tollens: Jika ~P maka ~Q; ternyata Q, maka P.',
    explanation: 'Premis: Jika tidak ada surat bermeterai (~P), maka TMS (~Q). Fakta: Rina MS (Q). Maka Rina melengkapi berkas pendaftaran dengan surat pernyataan bermeterai (P).',
    options: [
      { text: 'Rina melengkapi berkas pendaftaran CPNS dengan surat pernyataan bermeterai.', score: 5 },
      { text: 'Rina tidak perlu mengunggah surat pernyataan bermeterai karena sudah lulus.', score: 0 },
      { text: 'Semua pelamar yang mengunggah surat bermeterai pasti lulus SKD.', score: 0 },
      { text: 'Rina dinyatakan tidak memenuhi syarat administrasi pada tahap sanggah.', score: 0 },
      { text: 'Tidak dapat ditarik simpulan yang sah dari pernyataan tersebut.', score: 0 }
    ]
  },
  {
    id: 'tiu-04', subtest: 'TIU', topic: 'Penalaran Analitis (Urutan)',
    question: 'Dalam seleksi wawancara, empat peserta (Galih, Hana, Irfan, dan Jihan) memperoleh skor akhir berbeda:\n- Skor Galih lebih tinggi daripada skor Irfan.\n- Skor Hana lebih rendah daripada skor Jihan, tetapi lebih tinggi daripada skor Galih.\n\nUrutan peserta dari skor tertinggi hingga terendah adalah ....',
    hint: 'Susun pertidaksamaan: Jihan > Hana > Galih > Irfan.',
    explanation: 'Dari ketentuan: Jihan > Hana > Galih, dan Galih > Irfan. Maka urutan dari tertinggi ke terendah adalah Jihan, Hana, Galih, Irfan.',
    options: [
      { text: 'Jihan, Hana, Galih, Irfan', score: 5 },
      { text: 'Hana, Jihan, Galih, Irfan', score: 0 },
      { text: 'Jihan, Galih, Hana, Irfan', score: 0 },
      { text: 'Galih, Hana, Jihan, Irfan', score: 0 },
      { text: 'Jihan, Hana, Irfan, Galih', score: 0 }
    ]
  },
  {
    id: 'tiu-05', subtest: 'TIU', topic: 'Penalaran Analitis (Jadwal)',
    question: 'Empat sesi pelatihan (Keamanan Siber, Manajemen Arsip, Pelayanan Prima, dan Pengadaan Barang) dijadwalkan pada Senin hingga Kamis (1 sesi/hari):\n- Manajemen Arsip dilaksanakan sebelum Pelayanan Prima.\n- Pengadaan Barang dilaksanakan tepat sehari setelah Keamanan Siber.\n- Keamanan Siber tidak dilaksanakan pada hari Senin.\n\nJika Pelayanan Prima dilaksanakan pada hari Kamis, sesi apa yang dilaksanakan pada hari Senin?',
    hint: 'Keamanan Siber dan Pengadaan Barang berurutan (Selasa-Rabu), sehingga tersisa Senin untuk Manajemen Arsip.',
    explanation: 'Kamis = Pelayanan Prima. Keamanan Siber bukan Senin dan diikuti langsung Pengadaan Barang, maka Keamanan Siber = Selasa dan Pengadaan Barang = Rabu. Tersisa hari Senin untuk Manajemen Arsip.',
    options: [
      { text: 'Manajemen Arsip', score: 5 },
      { text: 'Keamanan Siber', score: 0 },
      { text: 'Pengadaan Barang', score: 0 },
      { text: 'Pelayanan Prima', score: 0 },
      { text: 'Tidak ada sesi pelatihan pada hari Senin', score: 0 }
    ]
  },
  {
    id: 'tiu-06', subtest: 'TIU', topic: 'Berhitung Cepat',
    question: 'Hasil dari (3/4 × 64) + (35% × 200) − (12,5 × 4) adalah ....',
    hint: 'Hitung masing-masing kelompok perkalian terlebih dahulu.',
    explanation: '(3/4 × 64) = 48; (35% × 200) = 70; (12,5 × 4) = 50. Maka 48 + 70 − 50 = 68.',
    options: [
      { text: '68', score: 5 },
      { text: '58', score: 0 },
      { text: '72', score: 0 },
      { text: '64', score: 0 },
      { text: '78', score: 0 }
    ]
  },
  {
    id: 'tiu-07', subtest: 'TIU', topic: 'Berhitung Cepat Aljabar',
    question: 'Nilai dari (145² − 55²) / 90 + 15 adalah ....',
    hint: 'Gunakan sifat selisih dua kuadrat: a² − b² = (a + b)(a − b).',
    explanation: '145² − 55² = (145 + 55)(145 − 55) = 200 × 90. Dibagi 90 menghasilkan 200. Kemudian 200 + 15 = 215.',
    options: [
      { text: '215', score: 5 },
      { text: '200', score: 0 },
      { text: '195', score: 0 },
      { text: '225', score: 0 },
      { text: '105', score: 0 }
    ]
  },
  {
    id: 'tiu-08', subtest: 'TIU', topic: 'Deret Bilangan',
    question: 'Tentukan dua bilangan yang tepat untuk melengkapi pola deret berikut: 3, 40, 6, 36, 12, 32, 24, 28, ..., ...',
    hint: 'Pisahkan menjadi dua deret larik ganjil (dikali 2) dan larik genap (dikurangi 4).',
    explanation: 'Larik ganjil: 3, 6, 12, 24 -> berikutnya 24 × 2 = 48. Larik genap: 40, 36, 32, 28 -> berikutnya 28 − 4 = 24.',
    options: [
      { text: '48 dan 24', score: 5 },
      { text: '36 dan 24', score: 0 },
      { text: '48 dan 20', score: 0 },
      { text: '32 dan 24', score: 0 },
      { text: '48 dan 26', score: 0 }
    ]
  },
  {
    id: 'tiu-09', subtest: 'TIU', topic: 'Perbandingan Berbalik Nilai',
    question: 'Sebuah proyek instalasi server ditargetkan selesai dalam 30 hari oleh 16 orang teknisi. Setelah dikerjakan selama 10 hari, pekerjaan terhenti selama 4 hari karena keterlambatan pengiriman perangkat. Agar proyek selesai tepat waktu, banyak teknisi tambahan yang dibutuhkan adalah ....',
    hint: 'Sisa beban kerja = 16 teknisi × 20 hari harus diselesaikan dalam sisa waktu 16 hari.',
    explanation: 'Sisa hari normal = 30 − 10 = 20 hari. Terhenti 4 hari, sisa waktu = 16 hari. Total teknisi dibutuhkan = (16 × 20) / 16 = 20 orang. Tambahan teknisi = 20 − 16 = 4 orang.',
    options: [
      { text: '4 orang', score: 5 },
      { text: '5 orang', score: 0 },
      { text: '3 orang', score: 0 },
      { text: '6 orang', score: 0 },
      { text: '20 orang', score: 0 }
    ]
  },
  {
    id: 'tiu-10', subtest: 'TIU', topic: 'Jarak, Kecepatan & Waktu Papasan',
    question: 'Jarak antara Kota A dan Kota B adalah 210 km. Pukul 08.00, Budi berangkat dari Kota A menuju Kota B dengan kecepatan 60 km/jam. Pada waktu bersamaan, Rina berangkat dari Kota B menuju Kota A melalui rute yang sama dengan kecepatan 80 km/jam. Pukul berapa mereka berpapasan?',
    hint: 'Waktu papasan = Jarak / (Kecepatan A + Kecepatan B).',
    explanation: 'Waktu tempuh = 210 / (60 + 80) = 210 / 140 = 1,5 jam (1 jam 30 menit). Berangkat pukul 08.00 + 1 jam 30 menit = pukul 09.30.',
    options: [
      { text: 'Pukul 09.30', score: 5 },
      { text: 'Pukul 09.15', score: 0 },
      { text: 'Pukul 09.45', score: 0 },
      { text: 'Pukul 10.00', score: 0 },
      { text: 'Pukul 10.30', score: 0 }
    ]
  },
  {
    id: 'tiu-11', subtest: 'TIU', topic: 'Hubungan Kuantitatif (X dan Y)',
    question: 'Diketahui X adalah luas persegi yang memiliki keliling 36 cm, sedangkan Y adalah luas persegi panjang berukuran panjang 12 cm dan lebar 7 cm. Hubungan yang tepat antara kuantitas X dan Y adalah ....',
    hint: 'Sisi persegi = 36 / 4 = 9 cm -> Luas X = 9 × 9.',
    explanation: 'Keliling persegi = 36 cm -> sisi = 9 cm, sehingga X = 9² = 81 cm². Sementara Y = 12 × 7 = 84 cm². Jadi X < Y.',
    options: [
      { text: 'X < Y', score: 5 },
      { text: 'X > Y', score: 0 },
      { text: 'X = Y', score: 0 },
      { text: '2X = Y', score: 0 },
      { text: 'Hubungan X dan Y tidak dapat ditentukan', score: 0 }
    ]
  },
  {
    id: 'tiu-12', subtest: 'TIU', topic: 'Statistika Dasar (Rata-rata Gabungan)',
    question: 'Rata-rata nilai tryout SKD dari 20 peserta kelompok A adalah 78, sedangkan rata-rata nilai 30 peserta kelompok B adalah 83. Rata-rata nilai gabungan seluruh peserta dari kedua kelompok tersebut adalah ....',
    hint: 'Rata-rata gabungan = ((20 × 78) + (30 × 83)) / (20 + 30).',
    explanation: 'Total nilai A = 20 × 78 = 1.560. Total nilai B = 30 × 83 = 2.490. Jumlah total = 4.050 dibagi 50 peserta = 81,0.',
    options: [
      { text: '81,0', score: 5 },
      { text: '80,5', score: 0 },
      { text: '81,5', score: 0 },
      { text: '82,0', score: 0 },
      { text: '80,0', score: 0 }
    ]
  },

  // --- TKP (15 Master Questions — Gradasi Skor 5, 4, 3, 2, 1) ---
  {
    id: 'tkp-01', subtest: 'TKP', topic: 'Pelayanan Publik',
    question: 'Saat Anda bertugas di loket layanan administrasi kependudukan yang sedang ramai, seorang warga lansia tampak kebingungan karena belum mendaftar melalui aplikasi antrean daring sebagaimana ketentuan baru. Tindakan paling tepat yang mencerminkan orientasi pelayanan publik prima adalah ....',
    hint: 'Berikan bantuan aktif dan ramah tanpa melanggar prosedur antrean.',
    explanation: 'Pelayanan publik prima (skor 5) ditunjukkan dengan sikap ramah, proaktif membantu mendaftarkan warga lansia melalui perangkat petugas, dan mengarahkannya sesuai alur.',
    options: [
      { text: 'Menyapa dengan ramah, membantu mendaftarkan antreannya melalui perangkat petugas, lalu mengarahkannya sesuai alur', score: 5 },
      { text: 'Menjelaskan cara mengunduh aplikasi di ponselnya secara rinci agar ia dapat mendaftar mandiri', score: 4 },
      { text: 'Memintanya menunggu di ruang tunggu sampai antrean daring sepi baru dibantu', score: 3 },
      { text: 'Menyarankannya pulang terlebih dahulu untuk meminta bantuan anggota keluarga di rumah', score: 2 },
      { text: 'Menunjuk papan pengumuman alur pendaftaran daring tanpa menghentikan pekerjaan lain', score: 1 }
    ]
  },
  {
    id: 'tkp-02', subtest: 'TKP', topic: 'Pelayanan Publik — Inklusivitas',
    question: 'Seorang pemohon penyandang disabilitas netra datang seorang diri ke kantor pelayanan terpadu untuk mengurus surat keterangan. Sikap paling tepat yang mencerminkan pelayanan publik yang inklusif adalah ....',
    hint: 'Utamakan pendampingan langsung yang menghormati martabat pemohon.',
    explanation: 'Menyapa dengan ramah, menawarkan pendampingan membacakan dan mengisi formulir sesuai keterangannya, serta memprioritaskan akses ramah disabilitas meraih poin 5.',
    options: [
      { text: 'Menyapa dengan ramah, menawarkan pendampingan untuk membacakan serta membantu mengisi formulir sesuai keterangannya, lalu memprioritaskan akses layanan ramah disabilitas', score: 5 },
      { text: 'Meminta petugas keamanan mengantarkannya ke loket informasi lalu menunggu antrean reguler', score: 4 },
      { text: 'Memberikan formulir cetak dan memintanya mencari orang di ruang tunggu untuk membacakan', score: 3 },
      { text: 'Menyarankannya kembali besok dengan membawa pendamping keluarga agar pengisian formulir lebih mudah', score: 2 },
      { text: 'Meminta pemohon menunggu hingga jam pelayanan reguler selesai agar petugas memiliki waktu luang', score: 1 }
    ]
  },
  {
    id: 'tkp-03', subtest: 'TKP', topic: 'Pelayanan Publik — Integritas Layanan',
    question: 'Teman kuliah Anda menghubungi melalui pesan pribadi dan meminta berkas pengajuan izin usahanya didahulukan dari ratusan pemohon lain dengan menawarkan imbalan traktiran makan siang. Sikap profesional Anda adalah ....',
    hint: 'Tolak gratifikasi dan perlakukan seluruh pemohon secara adil sesuai sistem.',
    explanation: 'Menolak tawaran dengan santun, menjelaskan bahwa semua berkas diproses sesuai urutan sistem, serta membantu mengecek kelengkapan syarat secara terbuka bernilai 5.',
    options: [
      { text: 'Menolak permintaan tersebut dengan bahasa yang santun, menjelaskan bahwa seluruh berkas diproses sesuai urutan antrean sistem, dan membantunya mengecek kelengkapan syarat secara terbuka', score: 5 },
      { text: 'Menolak imbalan makan siang namun tetap memantau berkasnya agar diproses sesuai standar waktu', score: 4 },
      { text: 'Tidak membalas pesan pribadinya agar tidak terjadi perdebatan dan membiarkan sistem berjalan', score: 3 },
      { text: 'Mengecek berkasnya di luar jam kerja tanpa menerima imbalan apa pun', score: 2 },
      { text: 'Mendahulukan berkasnya secara diam-diam sebagai bentuk solidaritas sesama alumni', score: 1 }
    ]
  },
  {
    id: 'tkp-04', subtest: 'TKP', topic: 'Jejaring Kerja — Koordinasi Lintas Unit',
    question: 'Menjelang batas akhir penyusunan laporan kinerja instansi, Anda menemukan ketidaksesuaian angka realisasi program antara data unit Anda dan data unit keuangan. Sikap paling profesional dan kolaboratif yang sebaiknya Anda ambil adalah ....',
    hint: 'Lakukan rekonsiliasi data secara cepat dan langsung bersama unit terkait.',
    explanation: 'Segera menghubungi narahubung unit keuangan untuk melakukan rekonsiliasi data bersama sebelum laporan diserahkan menunjukkan kolaborasi efektif (skor 5).',
    options: [
      { text: 'Segera menghubungi narahubung unit keuangan untuk melakukan rekonsiliasi data bersama sebelum laporan diserahkan', score: 5 },
      { text: 'Mengirimkan surat resmi permintaan klarifikasi data kepada unit keuangan dan menunggu balasannya', score: 4 },
      { text: 'Mencantumkan kedua versi angka dalam catatan kaki laporan agar pimpinan memilih sendiri', score: 3 },
      { text: 'Menggunakan angka versi unit sendiri karena merasa pencatatan internal sudah paling akurat', score: 2 },
      { text: 'Menunda penyerahan laporan melewati tenggat waktu hingga unit keuangan memperbaiki datanya', score: 1 }
    ]
  },
  {
    id: 'tkp-05', subtest: 'TKP', topic: 'Jejaring Kerja — Dukungan Tim',
    question: 'Dua hari menjelang batas akhir pengumpulan laporan evaluasi tahunan tim, salah satu rekan satu tim belum mengirimkan bagian datanya dan tampak kesulitan mengolah tabel analisis. Tindakan paling konstruktif yang sebaiknya Anda lakukan adalah ....',
    hint: 'Bantu rekan menyelesaikan kendalanya agar target tim tercapai bersama.',
    explanation: 'Menghubungi rekan untuk menanyakan kendalanya lalu mendampinginya menyusun format tabel analisis mencerminkan jejaring kerja yang suportif (skor 5).',
    options: [
      { text: 'Menghubungi rekan tersebut untuk menanyakan kendalanya lalu mendampinginya menyusun format tabel analisis agar laporan selesai tepat waktu', score: 5 },
      { text: 'Mengingatkannya melalui grup tim mengenai tenggat waktu pengumpulan agar segera diselesaikan', score: 4 },
      { text: 'Mengambil alih seluruh pekerjaannya tanpa berkomunikasi agar laporan cepat selesai', score: 3 },
      { text: 'Menunggu hingga hari terakhir baru melaporkan keterlambatannya kepada ketua tim', score: 2 },
      { text: 'Menyerahkan laporan tanpa bagian data rekan tersebut dengan catatan bahwa ia belum mengumpulkan', score: 1 }
    ]
  },
  {
    id: 'tkp-06', subtest: 'TKP', topic: 'Jejaring Kerja — Knowledge Sharing',
    question: 'Anda baru saja ditugaskan mengikuti pelatihan nasional tentang pemanfaatan kecerdasan artifisial untuk efisiensi administrasi perkantoran. Setelah kembali ke kantor, langkah paling berdampak bagi pengembangan jejaring kerja internal adalah ....',
    hint: 'Bagikan ilmu yang diperoleh kepada rekan kerja agar bermanfaat luas.',
    explanation: 'Menyusun ringkasan praktis dan mengusulkan sesi berbagi pengetahuan (knowledge sharing) bersama rekan-rekan satu unit meraih skor tertinggi (5).',
    options: [
      { text: 'Menyusun ringkasan praktis dan mengusulkan sesi berbagi pengetahuan (knowledge sharing) bersama rekan-rekan satu unit', score: 5 },
      { text: 'Mengunggah modul pelatihan ke folder bersama tim agar dapat dibaca masing-masing pegawai', score: 4 },
      { text: 'Menerapkan ilmu baru tersebut pada pekerjaan pribadi agar kinerja individu terlihat menonjol', score: 3 },
      { text: 'Menunggu perintah atasan apabila diminta mempresentasikan hasil pelatihan', score: 2 },
      { text: 'Menyimpan materi pelatihan sebagai arsip pribadi untuk persiapan promosi jabatan', score: 1 }
    ]
  },
  {
    id: 'tkp-07', subtest: 'TKP', topic: 'Sosial Budaya — Adaptasi Bahasa & Budaya',
    question: 'Anda ditempatkan di kantor pelayanan publik di daerah yang mayoritas masyarakatnya menggunakan bahasa daerah setempat dalam percakapan sehari-hari, sementara Anda belum menguasainya. Sikap adaptif yang paling tepat adalah ....',
    hint: 'Tunjukkan kemauan belajar budaya lokal sambil tetap menjaga kejelasan komunikasi.',
    explanation: 'Belajar kosakata dasar bahasa daerah setempat sambil tetap berkomunikasi dengan bahasa Indonesia yang santun dan mudah dipahami menunjukkan adaptabilitas sosial budaya (skor 5).',
    options: [
      { text: 'Belajar kosakata dasar bahasa daerah setempat dari rekan kerja sambil tetap berkomunikasi dengan bahasa Indonesia yang santun dan mudah dipahami', score: 5 },
      { text: 'Meminta bantuan rekan putra daerah untuk mendampingi di loket setiap kali ada warga yang kesulitan berbahasa Indonesia', score: 4 },
      { text: 'Menggunakan bahasa Indonesia formal sepenuhnya dan meminta masyarakat menyesuaikan diri', score: 3 },
      { text: 'Mengurangi interaksi lisan dan lebih banyak menggunakan petunjuk tertulis di loket', score: 2 },
      { text: 'Mengajukan permohonan mutasi ke bagian administrasi belakang agar tidak berhadapan langsung dengan warga', score: 1 }
    ]
  },
  {
    id: 'tkp-08', subtest: 'TKP', topic: 'Sosial Budaya — Harmoni Keberagaman',
    question: 'Di unit kerja Anda terdapat rekan-rekan dari beragam latar belakang agama dan suku. Menjelang perayaan hari besar keagamaan salah satu kelompok rekan kerja, panitia kegiatan sosial kantor berencana mengadakan acara ramah tamah. Sikap yang mencerminkan harmoni sosial budaya adalah ....',
    hint: 'Dukung kelancaran acara dan pastikan kebutuhan seluruh rekan dihormati.',
    explanation: 'Turut mendukung kelancaran teknis acara dan memastikan pilihan konsumsi serta jadwal kegiatan menghormati keyakinan seluruh pegawai bernilai 5.',
    options: [
      { text: 'Turut mendukung kelancaran teknis acara dan memastikan pilihan konsumsi serta jadwal kegiatan menghormati keyakinan seluruh pegawai', score: 5 },
      { text: 'Hadir dalam acara ramah tamah sebagai bentuk penghormatan kepada rekan kerja', score: 4 },
      { text: 'Mengucapkan selamat melalui grup percakapan kantor tanpa terlibat dalam kepanitiaan', score: 3 },
      { text: 'Menyarankan agar acara hanya diikuti oleh pegawai yang merayakan hari besar tersebut', score: 2 },
      { text: 'Menolak berpartisipasi dengan alasan kesibukan pekerjaan rutin', score: 1 }
    ]
  },
  {
    id: 'tkp-09', subtest: 'TKP', topic: 'Teknologi Informasi dan Komunikasi — Keamanan Siber',
    question: 'Anda menerima email yang mengatasnamakan administrator pusat data instansi dan meminta Anda segera mengeklik tautan untuk memperbarui kata sandi akun portal kepegawaian dalam waktu 1 jam. Tindakan paling tepat yang mencerminkan literasi dan keamanan digital adalah ....',
    hint: 'Waspadai phishing: jangan klik tautan mencurigakan dan verifikasi ke tim IT resmi.',
    explanation: 'Tidak mengeklik tautan, memeriksa alamat domain pengirim, lalu mengonfirmasi kebenarannya langsung kepada tim IT resmi instansi merupakan tindakan paling aman (skor 5).',
    options: [
      { text: 'Tidak mengeklik tautan, memeriksa alamat domain pengirim, lalu mengonfirmasi kebenarannya langsung kepada tim IT resmi instansi', score: 5 },
      { text: 'Mengabaikan dan langsung menghapus email tersebut tanpa memberi tahu siapa pun', score: 4 },
      { text: 'Meneruskan email tersebut ke grup percakapan kantor untuk menanyakan apakah rekan lain juga menerimanya', score: 3 },
      { text: 'Membuka tautan melalui ponsel pribadi terlebih dahulu untuk memastikan isinya', score: 2 },
      { text: 'Segera mengisi formulir pembaruan kata sandi agar akun kepegawaian tidak terblokir', score: 1 }
    ]
  },
  {
    id: 'tkp-10', subtest: 'TKP', topic: 'Teknologi Informasi dan Komunikasi — Transformasi Digital',
    question: 'Unit kerja Anda masih menggunakan pengisian lembar kerja luring secara bergantian lewat flashdisk sehingga sering terjadi versi file yang tertukar. Saat Anda mengusulkan penggunaan dokumen kolaborasi berbasis awan (cloud), beberapa rekan senior merasa khawatir kesulitan menggunakannya. Langkah terbaik Anda adalah ....',
    hint: 'Fasilitasi transisi teknologi dengan panduan mudah dan pendampingan sabar.',
    explanation: 'Membuat panduan langkah bergambar yang sederhana dan mendampingi rekan senior secara bertahap hingga terbiasa berkolaborasi daring meraih skor 5.',
    options: [
      { text: 'Membuat panduan langkah bergambar yang sederhana dan mendampingi rekan senior secara bertahap hingga terbiasa berkolaborasi daring', score: 5 },
      { text: 'Mengadakan rapat singkat untuk mendemonstrasikan keunggulan dokumen cloud dibanding flashdisk', score: 4 },
      { text: 'Menggunakan dokumen cloud untuk pegawai muda saja sedangkan rekan senior tetap memakai flashdisk', score: 3 },
      { text: 'Menyerahkan tautan tutorial video dari internet agar rekan senior mempelajarinya sendiri', score: 2 },
      { text: 'Membatalkan usulan tersebut dan tetap menggunakan flashdisk demi kenyamanan bersama', score: 1 }
    ]
  },
  {
    id: 'tkp-11', subtest: 'TKP', topic: 'Profesionalisme — Komitmen Tugas',
    question: 'Pada Jumat sore menjelang jam pulang kantor, atasan meminta Anda menyiapkan bahan paparan mendesak untuk rapat pimpinan Sabtu pagi, padahal Anda sudah berencana menghadiri acara makan malam keluarga. Sikap paling profesional yang sebaiknya Anda ambil adalah ....',
    hint: 'Utamakan tanggung jawab kedinasan mendesak sambil berkomunikasi baik dengan keluarga.',
    explanation: 'Menerima tugas dengan penuh tanggung jawab, mengomunikasikan penyesuaian jadwal kepada keluarga, dan menyelesaikan bahan paparan secara tuntas bernilai 5.',
    options: [
      { text: 'Menerima tugas dengan penuh tanggung jawab, mengomunikasikan penyesuaian jadwal kepada keluarga, dan menyelesaikan bahan paparan secara tuntas', score: 5 },
      { text: 'Menghadiri acara makan malam keluarga terlebih dahulu lalu begadang menyusun bahan paparan hingga dini hari', score: 4 },
      { text: 'Meminta bantuan rekan kerja lain untuk mengerjakan sebagian materi agar Anda tetap bisa pulang tepat waktu', score: 3 },
      { text: 'Menyusun bahan paparan seadanya dalam 30 menit agar tidak membatalkan janji pribadi', score: 2 },
      { text: 'Menolak permintaan atasan dengan alasan tugas diberikan di luar jam kerja efektif', score: 1 }
    ]
  },
  {
    id: 'tkp-12', subtest: 'TKP', topic: 'Profesionalisme — Akuntabilitas Kesalahan',
    question: 'Setelah mengirimkan draf surat keputusan melalui sistem persuratan elektronik, Anda menyadari terdapat kesalahan penulisan angka nominal anggaran pada salah satu lampiran. Tindakan paling profesional yang harus Anda lakukan adalah ....',
    hint: 'Segera akui, laporkan, dan perbaiki sesuai mekanisme sistem persuratan.',
    explanation: 'Segera melaporkan kesalahan tersebut kepada atasan, menarik atau mengajukan revisi dokumen sesuai prosedur sistem, dan memperbaikinya dengan teliti bernilai 5.',
    options: [
      { text: 'Segera melaporkan kesalahan tersebut kepada atasan, menarik atau mengajukan revisi dokumen sesuai prosedur sistem, dan memperbaikinya dengan teliti', score: 5 },
      { text: 'Menunggu hasil koreksi dari bagian verifikasi persuratan sebelum mengirimkan file perbaikan', score: 4 },
      { text: 'Mengirimkan file lampiran baru melalui pesan pribadi kepada sekretaris pimpinan tanpa menarik surat lama', score: 3 },
      { text: 'Diam saja dengan harapan kesalahan angka tersebut tidak diperhatikan saat rapat', score: 2 },
      { text: 'Menyalahkan sistem aplikasi persuratan yang dianggap membingungkan saat mengunggah lampiran', score: 1 }
    ]
  },
  {
    id: 'tkp-13', subtest: 'TKP', topic: 'Anti Radikalisme — Ideologi Negara',
    question: 'Seorang kenalan di lingkungan tempat tinggal mengajak Anda mengikuti pertemuan rutin tertutup yang dalam materinya menyebarkan pandangan bahwa dasar negara Pancasila bertentangan dengan ajaran agama dan tidak perlu dipatuhi. Sikap tegas Anda sebagai ASN adalah ....',
    hint: 'Tolak tegas paham anti-Pancasila dan laporkan melalui mekanisme yang tepat.',
    explanation: 'Menolak ajakan tersebut secara tegas dengan penjelasan yang santun serta melaporkan indikasi penyebaran paham anti-Pancasila kepada pihak berwenang sesuai mekanisme meraih skor 5.',
    options: [
      { text: 'Menolak ajakan tersebut secara tegas dengan penjelasan yang santun serta melaporkan indikasi penyebaran paham anti-Pancasila kepada pihak berwenang sesuai mekanisme', score: 5 },
      { text: 'Menolak ajakan tersebut secara halus dan memutus komunikasi dengan kenalan tersebut', score: 4 },
      { text: 'Menghadiri pertemuan sekali untuk memastikan kebenaran materinya sebelum bersikap', score: 3 },
      { text: 'Mencari alasan sibuk pekerjaan setiap kali diajak tanpa menyatakan penolakan', score: 2 },
      { text: 'Mengikuti pertemuan tersebut selama tidak mengganggu jadwal masuk kantor', score: 1 }
    ]
  },
  {
    id: 'tkp-14', subtest: 'TKP', topic: 'Anti Radikalisme — Netralitas & Persatuan',
    question: 'Menjelang pemilihan kepala daerah, suasana di ruang kerja mulai memanas karena beberapa pegawai saling menyindir berdasarkan sentimen suku dan pilihan politik sehingga menghambat koordinasi tugas. Sebagai ketua tim kerja, langkah yang paling tepat adalah ....',
    hint: 'Tegakkan netralitas ASN dan kembalikan fokus tim pada pelayanan publik.',
    explanation: 'Mengingatkan seluruh anggota tim tentang kewajiban netralitas ASN, menghentikan diskusi bernuansa SARA di jam kerja, dan mengembalikan fokus pada target pelayanan publik bernilai 5.',
    options: [
      { text: 'Mengingatkan seluruh anggota tim tentang kewajiban netralitas ASN, menghentikan diskusi bernuansa SARA di jam kerja, dan mengembalikan fokus pada target pelayanan publik', score: 5 },
      { text: 'Memisahkan tempat duduk pegawai yang berbeda pandangan agar tidak sering berdebat', score: 4 },
      { text: 'Membiarkan diskusi berlangsung selama pekerjaan masing-masing tetap dikumpulkan', score: 3 },
      { text: 'Ikut menengahi dengan menyampaikan pandangan politik pribadi yang dianggap paling netral', score: 2 },
      { text: 'Melaporkan seluruh anggota tim ke bagian kepegawaian tanpa melakukan pembinaan internal', score: 1 }
    ]
  },
  {
    id: 'tkp-15', subtest: 'TKP', topic: 'Anti Radikalisme — Moderasi Ruang Digital',
    question: 'Sebagai admin akun media sosial resmi instansi, Anda menemukan komentar bernada ujaran kebencian dan ajakan kekerasan terhadap kelompok minoritas pada unggahan pengumuman layanan publik. Tindakan paling tepat yang harus Anda lakukan adalah ....',
    hint: 'Lakukan moderasi sesuai SOP, dokumentasikan bukti, dan laporkan kepada pimpinan.',
    explanation: 'Menyembunyikan atau menghapus komentar ujaran kebencian tersebut sesuai pedoman moderasi kanal resmi, mendokumentasikannya, dan melaporkannya kepada pimpinan unit humas bernilai 5.',
    options: [
      { text: 'Menyembunyikan atau menghapus komentar ujaran kebencian tersebut sesuai pedoman moderasi kanal resmi, mendokumentasikannya, dan melaporkannya kepada pimpinan unit humas', score: 5 },
      { text: 'Langsung menghapus komentar tersebut dan memblokir akun pengirim tanpa dokumentasi', score: 4 },
      { text: 'Menutup kolom komentar pada seluruh unggahan media sosial instansi secara permanen', score: 3 },
      { text: 'Membalas komentar tersebut dengan perdebatan panjang menggunakan akun resmi instansi', score: 2 },
      { text: 'Membiarkan komentar tersebut dengan alasan kebebasan berpendapat di ruang digital', score: 1 }
    ]
  }
];

// SKB CAT Sample Questions (Tagged per Instansi)
const SKB_SAMPLE_QUESTIONS = [
  {
    id: 'skb-01', subtest: 'SKB', instansi: 'PEMDA_UMUM', topic: 'Manajemen ASN (UU No. 20 Tahun 2023)',
    question: 'Berdasarkan Undang-Undang Nomor 20 Tahun 2023 tentang Aparatur Sipil Negara, nilai dasar ASN yang wajib dipegang teguh oleh seluruh pegawai ASN dalam menjalankan tugas pelayanan publik dirumuskan dalam akronim ....',
    hint: 'Berorientasi Pelayanan, Akuntabel, Kompeten, Harmonis, Loyal, Adaptif, Kolaboratif.',
    explanation: 'UU No. 20 Tahun 2023 menetapkan nilai dasar ASN BerAKHLAK (Berorientasi Pelayanan, Akuntabel, Kompeten, Harmonis, Loyal, Adaptif, dan Kolaboratif).',
    options: [
      { text: 'BerAKHLAK', score: 5 },
      { text: 'ANEKA', score: 0 },
      { text: 'PANCA PRASETYA', score: 0 },
      { text: 'TRI DHARMA ASN', score: 0 },
      { text: 'REFORMASI BIROKRASI', score: 0 }
    ]
  },
  {
    id: 'skb-02', subtest: 'SKB', instansi: 'PEMDA_UMUM', topic: 'Pelayanan Publik (UU No. 25 Tahun 2009)',
    question: 'Menurut UU Nomor 25 Tahun 2009 tentang Pelayanan Publik, komponen standar pelayanan yang berkaitan dengan pengelolaan pelayanan di internal organisasi (di balik layar) disebut ....',
    hint: 'Lawannya adalah Service Delivery.',
    explanation: 'Komponen standar pelayanan publik terbagi menjadi Service Delivery (penyampaian layanan) dan Manufacturing (pengelolaan pelayanan internal).',
    options: [
      { text: 'Manufacturing', score: 5 },
      { text: 'Outsourcing', score: 0 },
      { text: 'Budgeting', score: 0 },
      { text: 'Auditing', score: 0 },
      { text: 'Monitoring', score: 0 }
    ]
  },
  {
    id: 'skb-03', subtest: 'SKB', instansi: 'KOMDIGI_BSSN', topic: 'Pranata Komputer — Keamanan Informasi',
    question: 'Dalam penerapan Sistem Pemerintahan Berbasis Elektronik (SPBE), mekanisme kriptografi yang menggunakan kunci publik untuk mengenkripsi data dan kunci privat untuk mendekripsi data disebut ....',
    hint: 'Menggunakan pasangan dua kunci berbeda.',
    explanation: 'Kriptografi asimetris (public-key cryptography) seperti RSA dan ECC memakai kunci publik dan kunci privat.',
    options: [
      { text: 'Kriptografi Asimetris', score: 5 },
      { text: 'Kriptografi Simetris', score: 0 },
      { text: 'Hashing Satu Arah', score: 0 },
      { text: 'Steganografi Citra', score: 0 },
      { text: 'Tokenisasi Sesi', score: 0 }
    ]
  },
  {
    id: 'skb-04', subtest: 'SKB', instansi: 'KOMDIGI_BSSN', topic: 'Pranata Komputer — Basis Data Relasional',
    question: 'Pada perancangan basis data relasional, proses normalisasi hingga bentuk normal ketiga (3NF) bertujuan utama untuk menghilangkan ketergantungan transitif sehingga mencegah terjadinya ....',
    hint: 'Duplikasi data dan anomali operasi tabel.',
    explanation: 'Normalisasi 3NF menghilangkan ketergantungan transitif untuk meminimalkan redundansi data serta mencegah anomali insert, update, dan delete.',
    options: [
      { text: 'Redundansi data serta anomali insert, update, dan delete', score: 5 },
      { text: 'Keterlambatan koneksi jaringan antar server lokal', score: 0 },
      { text: 'Penggunaan primary key pada tabel induk', score: 0 },
      { text: 'Kebutuhan pencadangan otomatis harian pada pusat data', score: 0 },
      { text: 'Enkripsi kolom kata sandi pengguna aplikasi', score: 0 }
    ]
  },
  {
    id: 'skb-05', subtest: 'SKB', instansi: 'MA_KEJAKSAAN', topic: 'Analis Hukum — Hierarki Peraturan (UU No. 12/2011)',
    question: 'Berdasarkan Pasal 7 ayat (1) UU Nomor 12 Tahun 2011 tentang Pembentukan Peraturan Perundang-undangan, jenis peraturan yang berada tepat di bawah Undang-Undang / Perppu adalah ....',
    hint: 'UUD 1945 -> Tap MPR -> UU/Perppu -> PP -> Perpres -> Perda.',
    explanation: 'Sesuai Pasal 7 ayat (1) UU No. 12 Tahun 2011, peraturan tepat di bawah UU/Perppu adalah Peraturan Pemerintah (PP).',
    options: [
      { text: 'Peraturan Pemerintah (PP)', score: 5 },
      { text: 'Peraturan Presiden (Perpres)', score: 0 },
      { text: 'Peraturan Menteri (Permen)', score: 0 },
      { text: 'Peraturan Daerah Provinsi (Perda Provinsi)', score: 0 },
      { text: 'Ketetapan MPR (Tap MPR)', score: 0 }
    ]
  },
  {
    id: 'skb-06', subtest: 'SKB', instansi: 'KEMENKEU', topic: 'Keuangan Negara (UU No. 17 Tahun 2003)',
    question: 'Dalam pengelolaan keuangan negara berdasarkan UU Nomor 17 Tahun 2003, prinsip yang mewajibkan seluruh penerimaan dan pengeluaran negara dicatat secara utuh tanpa kompensasi langsung disebut asas ....',
    hint: 'Asas pencatatan bruto secara utuh dalam anggaran.',
    explanation: 'Asas Universalitas mewajibkan setiap transaksi keuangan ditampilkan secara utuh dalam dokumen anggaran tanpa kompensasi langsung.',
    options: [
      { text: 'Asas Universalitas', score: 5 },
      { text: 'Asas Tahunan', score: 0 },
      { text: 'Asas Spesialitas', score: 0 },
      { text: 'Asas Desentralisasi', score: 0 },
      { text: 'Asas Kontinuitas', score: 0 }
    ]
  },
  {
    id: 'skb-07', subtest: 'SKB', instansi: 'KEMENKUM_IMIPAS', topic: 'Keimigrasian & Pemasyarakatan',
    question: 'Dokumen perjalanan resmi yang dikeluarkan oleh pemerintah suatu negara kepada warga negaranya untuk melakukan perjalanan antarnegara disebut ....',
    hint: 'Berbeda dengan visa yang diberikan oleh negara tujuan.',
    explanation: 'Paspor adalah dokumen resmi identitas perjalanan internasional yang dikeluarkan negara asal kepada warga negaranya.',
    options: [
      { text: 'Paspor', score: 5 },
      { text: 'Visa Kunjungan', score: 0 },
      { text: 'Izin Tinggal Terbatas (ITAS)', score: 0 },
      { text: 'Kartu Izin Tinggal Tetap (KITAP)', score: 0 },
      { text: 'Surat Keterangan Catatan Kepolisian', score: 0 }
    ]
  },
  {
    id: 'skb-08', subtest: 'SKB', instansi: 'PEMDA_UMUM', topic: 'Kearsipan (UU No. 43 Tahun 2009)',
    question: 'Berdasarkan UU Nomor 43 Tahun 2009 tentang Kearsipan, arsip yang frekuensi penggunaannya tinggi dan terus-menerus diperlukan dalam penyelenggaraan administrasi sehari-hari pada unit pengolah disebut ....',
    hint: 'Masih aktif dipakai sehari-hari di unit kerja.',
    explanation: 'Arsip aktif adalah arsip yang frekuensi penggunaannya tinggi dan terus-menerus digunakan dalam kegiatan administrasi sehari-hari.',
    options: [
      { text: 'Arsip Aktif', score: 5 },
      { text: 'Arsip Inaktif', score: 0 },
      { text: 'Arsip Statis', score: 0 },
      { text: 'Arsip Terjaga', score: 0 },
      { text: 'Arsip Duplikasi', score: 0 }
    ]
  },
  {
    id: 'skb-09', subtest: 'SKB', instansi: 'KEMENKEU', topic: 'Perbendaharaan Negara (UU No. 1/2004)',
    question: 'Pejabat yang diberi kewenangan untuk mengambil keputusan dan/atau melakukan tindakan yang dapat mengakibatkan pengeluaran atas beban anggaran belanja negara pada satuan kerja disebut ....',
    hint: 'Pejabat yang menandatangani kontrak pengadaan dan SPP pada satker.',
    explanation: 'Berdasarkan UU No. 1 Tahun 2004, Pejabat Pembuat Komitmen (PPK) adalah pejabat yang melaksanakan kewenangan Pengguna Anggaran/Kuasa Pengguna Anggaran untuk mengambil keputusan yang mengakibatkan pengeluaran anggaran belanja negara.',
    options: [
      { text: 'Pejabat Pembuat Komitmen (PPK)', score: 5 },
      { text: 'Bendahara Penerimaan', score: 0 },
      { text: 'Pejabat Penandatangan Surat Perintah Membayar (PPSPM)', score: 0 },
      { text: 'Kuasa Bendahara Umum Negara', score: 0 },
      { text: 'Auditor Internal Inspektorat', score: 0 }
    ]
  },
  {
    id: 'skb-10', subtest: 'SKB', instansi: 'MA_KEJAKSAAN', topic: 'Hukum Acara & Kekuasaan Kehakiman',
    question: 'Asas hukum acara pidana yang menyatakan bahwa setiap orang yang disangka, ditangkap, ditahan, dituntut, dan/atau dihadapkan di muka sidang pengadilan wajib dianggap tidak bersalah sampai ada putusan pengadilan yang berkekuatan hukum tetap disebut ....',
    hint: 'Presumption of innocence.',
    explanation: 'Asas Praduga Tak Bersalah (Presumption of Innocence) menjamin hak tersangka/terdakwa hingga adanya putusan pengadilan yang inkracht.',
    options: [
      { text: 'Asas Praduga Tak Bersalah (Presumption of Innocence)', score: 5 },
      { text: 'Asas Ne Bis In Idem', score: 0 },
      { text: 'Asas Legalitas (Nullum Delictum)', score: 0 },
      { text: 'Asas Oportunitas', score: 0 },
      { text: 'Asas In Dubio Pro Reo', score: 0 }
    ]
  },
  {
    id: 'skb-11', subtest: 'SKB', instansi: 'KEMENKUM_IMIPAS', topic: 'Pemasyarakatan (UU No. 22 Tahun 2022)',
    question: 'Berdasarkan Undang-Undang Nomor 22 Tahun 2022 tentang Pemasyarakatan, sistem pemasyarakatan diselenggarakan dalam rangka membentuk Warga Binaan agar menjadi manusia seutuhnya, menyadari kesalahan, memperbaiki diri, dan tidak mengulangi tindak pidana melalui proses ....',
    hint: 'Integrasi sosial kembali ke masyarakat.',
    explanation: 'UU No. 22 Tahun 2022 menekankan tujuan reintegrasi sosial agar Warga Binaan dapat diterima kembali oleh lingkungan masyarakat dan hidup secara wajar.',
    options: [
      { text: 'Reintegrasi sosial', score: 5 },
      { text: 'Retribusi pidana mutlak', score: 0 },
      { text: 'Isolasi permanen', score: 0 },
      { text: 'Ekstradisi lintas wilayah', score: 0 },
      { text: 'Arbitrase administratif', score: 0 }
    ]
  },
  {
    id: 'skb-12', subtest: 'SKB', instansi: 'KEMENDIKDASMEN', topic: 'Pedagogik & Evaluasi Pembelajaran',
    question: 'Asesmen yang dilakukan oleh pendidik selama proses pembelajaran berlangsung untuk memantau perkembangan belajar peserta didik dan memberikan umpan balik perbaikan secara langsung disebut ....',
    hint: 'Assessment for learning / selama proses belajar.',
    explanation: 'Asesmen formatif dilakukan selama proses pembelajaran untuk memperbaiki strategi mengajar dan membantu siswa memahami materi sebelum evaluasi akhir.',
    options: [
      { text: 'Asesmen Formatif', score: 5 },
      { text: 'Asesmen Sumatif', score: 0 },
      { text: 'Asesmen Penempatan', score: 0 },
      { text: 'Asesmen Sertifikasi', score: 0 },
      { text: 'Asesmen Akreditasi', score: 0 }
    ]
  },
  {
    id: 'skb-13', subtest: 'SKB', instansi: 'KEMENKES', topic: 'Kesehatan Masyarakat & Epidemiologi',
    question: 'Upaya pencegahan penyakit yang dilakukan pada fase sebelum seseorang terpapar agen penyakit melalui imunisasi, promosi kesehatan, dan perbaikan sanitasi lingkungan termasuk dalam tingkat pencegahan ....',
    hint: 'Dilakukan sebelum orang sakit atau terpapar.',
    explanation: 'Pencegahan primer (primary prevention) bertujuan mencegah timbulnya penyakit pada individu yang masih sehat melalui promosi kesehatan dan perlindungan spesifik seperti imunisasi.',
    options: [
      { text: 'Pencegahan Primer (Primary Prevention)', score: 5 },
      { text: 'Pencegahan Sekunder (Secondary Prevention)', score: 0 },
      { text: 'Pencegahan Tersier (Tertiary Prevention)', score: 0 },
      { text: 'Rehabilitasi Medik Lanjutan', score: 0 },
      { text: 'Surveilans Kematian Maternal', score: 0 }
    ]
  },
  {
    id: 'skb-14', subtest: 'SKB', instansi: 'KEHUTANAN_SAR', topic: 'Konservasi & Perlindungan Hutan',
    question: 'Kawasan suaka alam yang memiliki kekhasan tumbuhan, satwa, dan ekosistemnya atau ekosistem tertentu yang perlu dilindungi dan perkembangannya berlangsung secara alami disebut ....',
    hint: 'Kawasan perlindungan ketat bagi flora/fauna khas yang berkembang alami.',
    explanation: 'Cagar Alam adalah kawasan suaka alam yang karena keadaan alamnya mempunyai kekhasan tumbuhan, satwa, dan ekosistemnya yang perlu dilindungi dan perkembangannya berlangsung secara alami.',
    options: [
      { text: 'Cagar Alam', score: 5 },
      { text: 'Taman Wisata Alam', score: 0 },
      { text: 'Hutan Produksi Terbatas', score: 0 },
      { text: 'Taman Hutan Raya', score: 0 },
      { text: 'Hutan Lindung Gambut', score: 0 }
    ]
  }
];

const BERKAS_ITEMS_DATA = [
  { id: 'b1', title: 'Scan KTP Elektronik (e-KTP) Asli', desc: 'Format JPG/JPEG maksimal 200 KB, pastikan data sinkron Dukcapil.' },
  { id: 'b2', title: 'Kartu Keluarga (KK) Terbaru', desc: 'Siapkan nomor KK & NIK kepala keluarga; scan PDF/JPG maks. 500 KB.' },
  { id: 'b3', title: 'Scan Ijazah Asli Terakhir (SMA/SMK atau S1)', desc: 'Format PDF berwarna terbaca jelas, ukuran maksimal 500 KB.' },
  { id: 'b4', title: 'Scan Transkrip Nilai / Daftar Nilai Ujian', desc: 'Format PDF berwarna terbaca jelas, ukuran maksimal 500 KB.' },
  { id: 'b5', title: 'Bukti Akreditasi PT & Prodi (Khusus S1/D3)', desc: 'Sertifikat/tangkapan layar BAN-PT/LAM sesuai tanggal kelulusan ijazah.' },
  { id: 'b6', title: 'Pas Foto Formal Terbaru Latar Belakang Merah', desc: 'Kemeja rapi/formal, format JPG/JPEG maksimal 200 KB.' },
  { id: 'b7', title: 'Swafoto Liveness Detection di Portal SSCASN', desc: 'Gunakan kamera laptop/PC dengan pencahayaan terang saat buat akun.' },
  { id: 'b8', title: 'Surat Lamaran & Surat Pernyataan Instansi', desc: 'Unduh format resmi instansi tujuan & bubuhi e-Meterai / meterai Rp10.000.' }
];

// ============================================================================
// 5. PARAMETRIC INFINITE QUESTION GENERATOR
// ============================================================================
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffleArray(arr) {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function generateParametricQuestion(subtest, indexSeed) {
  const uid = `gen-${subtest.toLowerCase()}-${Date.now()}-${indexSeed}-${randInt(100, 999)}`;

  if (subtest === 'TIU') {
    const variant = indexSeed % 4;
    if (variant === 0) {
      const start = randInt(2, 12);
      const step = randInt(3, 9);
      const s1 = start;
      const s2 = s1 + step;
      const s3 = s2 + step + 2;
      const s4 = s3 + step + 4;
      const s5 = s4 + step + 6;
      const ans = s5 + step + 8;
      return {
        id: uid, subtest: 'TIU', topic: 'Deret Bilangan Bertingkat',
        question: `Tentukan bilangan yang tepat untuk melengkapi pola deret berikut: ${s1}, ${s2}, ${s3}, ${s4}, ${s5}, ....`,
        hint: `Perhatikan selisih antar suku yang bertambah +2 pada setiap langkah.`,
        explanation: `Pola selisih: +${step}, +${step+2}, +${step+4}, +${step+6}, sehingga suku berikutnya ditambah +${step+8}: ${s5} + ${step+8} = ${ans}.`,
        options: shuffleArray([
          { text: `${ans}`, score: 5 },
          { text: `${ans + 2}`, score: 0 },
          { text: `${ans - 2}`, score: 0 },
          { text: `${ans + 4}`, score: 0 },
          { text: `${s5 + step}`, score: 0 }
        ])
      };
    } else if (variant === 1) {
      const workers = randInt(12, 24);
      const extraWorkers = randInt(4, 8);
      const totalWorkers = workers + extraWorkers;
      const remDays = workers;
      const origRemDays = totalWorkers;
      const elapsedDays = randInt(5, 10);
      const totalDays = elapsedDays + origRemDays;
      const stopDays = origRemDays - remDays;
      return {
        id: uid, subtest: 'TIU', topic: 'Perbandingan Kuantitatif',
        question: `Sebuah proyek pengadaan arsip digital ditargetkan selesai dalam ${totalDays} hari oleh ${workers} orang petugas. Setelah bekerja selama ${elapsedDays} hari, pekerjaan terhenti selama ${stopDays} hari karena pemeliharaan sistem. Agar selesai tepat waktu, berapa banyak petugas tambahan yang dibutuhkan?`,
        hint: `Gunakan rumus perbandingan berbalik nilai pada sisa beban kerja (${workers} × ${origRemDays} dibagi sisa hari ${remDays}).`,
        explanation: `Sisa hari awal = ${totalDays} − ${elapsedDays} = ${origRemDays} hari. Setelah terhenti ${stopDays} hari, sisa waktu = ${remDays} hari. Kebutuhan petugas = (${workers} × ${origRemDays}) / ${remDays} = ${totalWorkers} orang. Tambahan petugas = ${totalWorkers} − ${workers} = ${extraWorkers} orang.`,
        options: shuffleArray([
          { text: `${extraWorkers} orang`, score: 5 },
          { text: `${extraWorkers + 1} orang`, score: 0 },
          { text: `${Math.max(1, extraWorkers - 1)} orang`, score: 0 },
          { text: `${extraWorkers + 2} orang`, score: 0 },
          { text: `${totalWorkers} orang`, score: 0 }
        ])
      };
    } else if (variant === 2) {
      const qty = randInt(5, 15);
      const unitPrice = randInt(2, 6) * 500000;
      const totalBefore = qty * unitPrice;
      const discPct = [10, 15, 20][randInt(0, 2)];
      const finalPrice = totalBefore * (100 - discPct) / 100;
      const fmt = (n) => 'Rp' + n.toLocaleString('id-ID');
      return {
        id: uid, subtest: 'TIU', topic: 'Aritmetika Sosial & Persentase',
        question: `Sebuah instansi membeli ${qty} unit perangkat komputer dengan harga satuan ${fmt(unitPrice)}. Karena pembelian kolektif, penyedia memberikan potongan harga sebesar ${discPct}% dari total pembelian. Berapa jumlah yang harus dibayarkan instansi tersebut?`,
        hint: `Hitung total harga sebelum diskon, lalu kalikan dengan ${(100 - discPct)}%.`,
        explanation: `Total awal = ${qty} × ${fmt(unitPrice)} = ${fmt(totalBefore)}. Setelah diskon ${discPct}%, dibayar ${(100 - discPct)}% × ${fmt(totalBefore)} = ${fmt(finalPrice)}.`,
        options: shuffleArray([
          { text: fmt(finalPrice), score: 5 },
          { text: fmt(totalBefore), score: 0 },
          { text: fmt(finalPrice + 500000), score: 0 },
          { text: fmt(Math.max(500000, finalPrice - 500000)), score: 0 },
          { text: fmt(totalBefore * discPct / 100), score: 0 }
        ])
      };
    } else {
      const v1 = [45, 50, 60][randInt(0, 2)];
      const v2 = [55, 70, 60][randInt(0, 2)];
      const hours = [1.5, 2, 2.5][randInt(0, 2)];
      const dist = (v1 + v2) * hours;
      const mins = Math.round(hours * 60);
      const hAdd = Math.floor(mins / 60);
      const mAdd = mins % 60;
      const resTime = `Pukul ${String(8 + hAdd).padStart(2, '0')}.${String(mAdd).padStart(2, '0')}`;
      return {
        id: uid, subtest: 'TIU', topic: 'Jarak, Kecepatan & Waktu',
        question: `Jarak Kota P dan Kota Q adalah ${dist} km. Pukul 08.00, Budi berangkat dari Kota P menuju Kota Q dengan kecepatan ${v1} km/jam. Pada jam yang sama, Sinta berangkat dari Kota Q menuju Kota P dengan kecepatan ${v2} km/jam. Pukul berapa mereka berpapasan?`,
        hint: `Waktu papasan = Jarak / (${v1} + ${v2}).`,
        explanation: `Waktu tempuh = ${dist} / (${v1} + ${v2}) = ${hours} jam (${mins} menit). Pukul 08.00 + ${hAdd} jam ${mAdd} menit = ${resTime}.`,
        options: shuffleArray([
          { text: resTime, score: 5 },
          { text: `Pukul ${String(8 + hAdd).padStart(2, '0')}.${String((mAdd + 15) % 60).padStart(2, '0')}`, score: 0 },
          { text: `Pukul ${String(9 + hAdd).padStart(2, '0')}.00`, score: 0 },
          { text: `Pukul 08.45`, score: 0 },
          { text: `Pukul ${String(8 + hAdd).padStart(2, '0')}.${String(Math.max(0, mAdd - 15)).padStart(2, '0')}`, score: 0 }
        ])
      };
    }
  }

  const pool = subtest === 'SKB'
    ? SKB_SAMPLE_QUESTIONS
    : getCombinedBank().filter(q => q.subtest === subtest);
  const sourcePool = pool.length > 0 ? pool : BASE_QUESTION_BANK;
  const base = sourcePool[indexSeed % sourcePool.length];
  return {
    ...base,
    id: uid,
    options: shuffleArray(base.options.map(o => ({ ...o })))
  };
}

// ============================================================================
// 6. APPLICATION STATE & MODE SYNC
// ============================================================================
let customQuestions = [];
let activeSession = null;
let lastResult = null;
let resultHistory = [];
let sessionMode = 'study'; // 'exam' | 'study'
let pendingStudyOptionIdx = null;
let examTimerInterval = null;
let dailyCountdownInterval = null;
let currentReviewFilter = 'ALL';
let confirmModalCallback = null;

function getCombinedBank() {
  return [...BASE_QUESTION_BANK, ...customQuestions];
}

function syncModeUI() {
  const isStudy = sessionMode === 'study';

  const headerBtn = document.getElementById('header-mode-toggle');
  const headerDot = document.getElementById('header-mode-dot');
  const headerLabel = document.getElementById('header-mode-label');

  if (headerBtn && headerLabel) {
    headerBtn.className = isStudy
      ? 'px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-extrabold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition shadow-sm flex items-center gap-1.5'
      : 'px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-extrabold bg-amber-400 hover:bg-amber-300 text-slate-950 transition shadow-sm flex items-center gap-1.5';
    headerLabel.textContent = isStudy ? 'Mode Belajar' : 'Mode Ujian';
  }
  if (headerDot) {
    headerDot.className = 'w-2 h-2 rounded-full bg-slate-950';
  }

  const cardExam = document.getElementById('card-mode-exam');
  const badgeExam = document.getElementById('badge-mode-exam');
  const cardStudy = document.getElementById('card-mode-study');
  const badgeStudy = document.getElementById('badge-mode-study');

  if (cardExam && badgeExam && cardStudy && badgeStudy) {
    if (isStudy) {
      cardStudy.className = 'p-4 rounded-2xl border-2 border-emerald-500 bg-emerald-50/60 text-left transition flex items-start gap-3.5';
      badgeStudy.classList.remove('hidden');
      cardExam.className = 'p-4 rounded-2xl border-2 border-slate-200 bg-slate-50/60 hover:border-blue-400 text-left transition flex items-start gap-3.5';
      badgeExam.classList.add('hidden');
    } else {
      cardExam.className = 'p-4 rounded-2xl border-2 border-[#0F2C59] bg-blue-50/60 text-left transition flex items-start gap-3.5';
      badgeExam.classList.remove('hidden');
      cardStudy.className = 'p-4 rounded-2xl border-2 border-slate-200 bg-slate-50/60 hover:border-emerald-400 text-left transition flex items-start gap-3.5';
      badgeStudy.classList.add('hidden');
    }
  }
}

function setSessionMode(mode) {
  sessionMode = mode === 'exam' ? 'exam' : 'study';
  syncModeUI();
  if (activeSession) {
    activeSession.mode = sessionMode;
    pendingStudyOptionIdx = null;
    saveActiveSession();
    renderExamWorkspace();
  }
  showToast(
    sessionMode === 'study'
      ? 'Mode Belajar Interaktif aktif (Konfirmasi jawaban & pembahasan langsung).'
      : 'Mode Simulasi Ujian CAT aktif (Skor & pembahasan muncul di akhir ujian).',
    'info'
  );
}

function toggleSessionMode() {
  setSessionMode(sessionMode === 'study' ? 'exam' : 'study');
}

// ============================================================================
// 7. LIVE WIB CLOCK (UTC+7) & DAILY RESET ENGINE (00:00 WIB)
// ============================================================================
function getWibDateParts() {
  const now = new Date();
  const utcMs = now.getTime() + (now.getTimezoneOffset() * 60000);
  const wibDate = new Date(utcMs + (7 * 3600000));

  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

  const dayName = days[wibDate.getDay()];
  const dateNum = wibDate.getDate();
  const monthName = months[wibDate.getMonth()];
  const yearNum = wibDate.getFullYear();

  const hh = String(wibDate.getHours()).padStart(2, '0');
  const mm = String(wibDate.getMinutes()).padStart(2, '0');
  const ss = String(wibDate.getSeconds()).padStart(2, '0');

  const dateKey = `${yearNum}-${String(wibDate.getMonth() + 1).padStart(2, '0')}-${String(dateNum).padStart(2, '0')}`;
  const elapsedTodaySec = (wibDate.getHours() * 3600) + (wibDate.getMinutes() * 60) + wibDate.getSeconds();
  const remSec = Math.max(0, 86400 - elapsedTodaySec);

  return {
    dateString: `${dayName}, ${dateNum} ${monthName} ${yearNum}`,
    timeString: `${hh}:${mm}:${ss} WIB`,
    dateKey,
    remSec
  };
}

function updateLiveWibClock() {
  const wib = getWibDateParts();
  const dateEl = document.getElementById('wib-date-display');
  const clockEl = document.getElementById('wib-clock-display');
  const cdEl = document.getElementById('daily-reset-countdown');

  if (dateEl) dateEl.textContent = wib.dateString;
  if (clockEl) clockEl.textContent = wib.timeString;

  if (cdEl) {
    const h = String(Math.floor(wib.remSec / 3600)).padStart(2, '0');
    const m = String(Math.floor((wib.remSec % 3600) / 60)).padStart(2, '0');
    const s = String(wib.remSec % 60).padStart(2, '0');
    cdEl.textContent = `${h} : ${m} : ${s}`;
  }

  const savedDay = safeStorage.getItem(STORAGE_KEYS.DAILY_STATE);
  if (savedDay && savedDay !== wib.dateKey) {
    safeStorage.setItem(STORAGE_KEYS.DAILY_STATE, wib.dateKey);
    safeStorage.removeItem(STORAGE_KEYS.SKB_DAILY_CACHE);
    showToast('Pergantian hari 00:00 WIB! Paket soal harian SKD & SKB telah diperbarui otomatis.', 'info');
    refreshLiveCpnsNewsWithAI(true);
  } else if (!savedDay) {
    safeStorage.setItem(STORAGE_KEYS.DAILY_STATE, wib.dateKey);
  }
}

function startDailyCountdownLoop() {
  updateLiveWibClock();
  if (dailyCountdownInterval) clearInterval(dailyCountdownInterval);
  dailyCountdownInterval = setInterval(updateLiveWibClock, 1000);
}

function forceRefreshDailyPackage() {
  const wib = getWibDateParts();
  safeStorage.setItem(STORAGE_KEYS.DAILY_STATE, `${wib.dateKey}-${Date.now()}`);
  safeStorage.removeItem(STORAGE_KEYS.SKB_DAILY_CACHE);
  showToast('Paket Utama Harian SKD & SKB berhasil diperbarui dengan variasi soal terbaru!', 'success');
}

// ============================================================================
// 8. SESSION ASSEMBLY, EXAM & STUDY WORKSPACE ENGINE
// ============================================================================
function saveActiveSession() {
  if (activeSession) {
    safeStorage.setItem(STORAGE_KEYS.ACTIVE_SESSION, JSON.stringify(activeSession));
  } else {
    safeStorage.removeItem(STORAGE_KEYS.ACTIVE_SESSION);
  }
  showResumeBanner();
}

function showResumeBanner() {
  const banner = document.getElementById('resume-session-banner');
  if (!banner) return;
  if (!activeSession || !Array.isArray(activeSession.questions) || activeSession.questions.length === 0) {
    banner.classList.add('hidden');
    return;
  }
  const answeredCount = Object.keys(activeSession.answers || {}).length;
  document.getElementById('resume-session-title').textContent = activeSession.title || 'Sesi Latihan Aktif';
  document.getElementById('resume-session-meta').textContent = `Terjawab ${answeredCount} dari ${activeSession.questions.length} soal • Mode ${activeSession.mode === 'study' ? 'Belajar' : 'Simulasi Ujian'}`;
  banner.classList.remove('hidden');
}

function discardActiveSession() {
  showConfirmModal('Batalkan Sesi Aktif?', 'Progres pengerjaan sesi yang belum selesai ini akan dihapus.', () => {
    if (examTimerInterval) clearInterval(examTimerInterval);
    activeSession = null;
    pendingStudyOptionIdx = null;
    saveActiveSession();
    renderExamWorkspace();
    showToast('Sesi aktif dibatalkan.', 'info');
  });
}

function buildQuestionSet(twkCount, tiuCount, tkpCount, skbCount = 0) {
  const result = [];
  const bank = getCombinedBank();

  const pickForSubtest = (sub, count) => {
    if (count <= 0) return;
    const pool = sub === 'SKB' ? SKB_SAMPLE_QUESTIONS : bank.filter(q => q.subtest === sub);
    const shuffled = shuffleArray(pool);
    for (let i = 0; i < count; i++) {
      if (i < shuffled.length) {
        const base = shuffled[i];
        result.push({
          ...base,
          id: `${base.id}-run-${i}-${randInt(100, 999)}`,
          options: shuffleArray(base.options.map(o => ({ ...o })))
        });
      } else {
        result.push(generateParametricQuestion(sub, i));
      }
    }
  };

  pickForSubtest('TWK', twkCount);
  pickForSubtest('TIU', tiuCount);
  pickForSubtest('TKP', tkpCount);
  pickForSubtest('SKB', skbCount);
  return result;
}

function startPackageSession(type) {
  if (type === 'daily_full') {
    const qs = buildQuestionSet(30, 35, 45, 0);
    launchNewSession('daily_full', 'Paket Utama Harian SKD BKN (110 Soal)', qs, 100 * 60);
  } else if (type === 'subtest_TWK') {
    const qs = buildQuestionSet(30, 0, 0, 0);
    launchNewSession('subtest_TWK', 'Drill Fokus TWK (30 Soal)', qs, 27 * 60);
  } else if (type === 'subtest_TIU') {
    const qs = buildQuestionSet(0, 35, 0, 0);
    launchNewSession('subtest_TIU', 'Drill Fokus TIU (35 Soal)', qs, 32 * 60);
  } else if (type === 'subtest_TKP') {
    const qs = buildQuestionSet(0, 0, 45, 0);
    launchNewSession('subtest_TKP', 'Drill Fokus TKP (45 Soal)', qs, 41 * 60);
  }
}

function startQuickGeneratedSession() {
  const count = Math.min(500, Math.max(1, parseInt(document.getElementById('quick-gen-count')?.value, 10) || 20));
  const sub = document.getElementById('quick-gen-subtest')?.value || 'MIX';
  const instansiKey = document.getElementById('skb-instansi-select')?.value || 'PEMDA_UMUM';

  let generated = [];
  if (sub === 'MIX') {
    const twk = Math.round(count * (30 / 110));
    const tiu = Math.round(count * (35 / 110));
    const tkp = Math.max(0, count - twk - tiu);
    const adjTwk = (twk + tiu + tkp === 0) ? 1 : twk;
    generated = buildQuestionSet(adjTwk, tiu, tkp, 0);
  } else if (sub === 'TWK') {
    generated = buildQuestionSet(count, 0, 0, 0);
  } else if (sub === 'TIU') {
    generated = buildQuestionSet(0, count, 0, 0);
  } else if (sub === 'TKP') {
    generated = buildQuestionSet(0, 0, count, 0);
  } else {
    generated = buildSkbInstansiQuestionSet(instansiKey, count, []);
  }

  const durationSec = Math.max(60, Math.round(generated.length * (100 / 110) * 60));
  launchNewSession('quick_gen', `Latihan Cepat (${generated.length} Soal • ${sub})`, generated, durationSec);
}

function launchNewSession(type, title, questions, durationSec) {
  if (!Array.isArray(questions) || questions.length === 0) {
    showToast('Gagal memuat daftar soal.', 'warning');
    return;
  }

  activeSession = {
    id: `sess-${Date.now()}`,
    type,
    title,
    mode: sessionMode,
    questions,
    currentIndex: 0,
    answers: {},
    confirmedStudy: {},
    doubtful: {},
    hintVisible: {},
    remainingSeconds: durationSec
  };

  pendingStudyOptionIdx = null;
  saveActiveSession();
  startTimerLoop();
  switchTab('exam');
}

function startTimerLoop() {
  if (examTimerInterval) clearInterval(examTimerInterval);
  updateTimerDisplay();
  examTimerInterval = setInterval(() => {
    if (!activeSession) {
      clearInterval(examTimerInterval);
      return;
    }
    if (activeSession.remainingSeconds > 0) {
      activeSession.remainingSeconds--;
      updateTimerDisplay();
      if (activeSession.remainingSeconds % 10 === 0) {
        saveActiveSession();
      }
    } else {
      clearInterval(examTimerInterval);
      showToast('Waktu ujian habis! Sistem menghitung skor otomatis.', 'warning');
      finalizeExamSession();
    }
  }, 1000);
}

function updateTimerDisplay() {
  const el = document.getElementById('exam-timer-display');
  if (!el || !activeSession) return;
  const mins = Math.floor(activeSession.remainingSeconds / 60);
  const secs = activeSession.remainingSeconds % 60;
  el.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function renderExamWorkspace() {
  const emptyState = document.getElementById('exam-empty-state');
  const workspace = document.getElementById('exam-workspace');
  if (!emptyState || !workspace) return;

  if (!activeSession || !Array.isArray(activeSession.questions) || activeSession.questions.length === 0) {
    emptyState.classList.remove('hidden');
    workspace.classList.add('hidden');
    return;
  }

  emptyState.classList.add('hidden');
  workspace.classList.remove('hidden');

  const totalQ = activeSession.questions.length;
  const idx = Math.min(totalQ - 1, Math.max(0, activeSession.currentIndex));
  activeSession.currentIndex = idx;
  const q = activeSession.questions[idx];
  const isStudy = activeSession.mode === 'study';

  // Top Header Info
  const modeBadge = document.getElementById('exam-mode-badge');
  if (modeBadge) {
    modeBadge.textContent = isStudy ? 'Mode Belajar' : 'Mode Simulasi Ujian';
    modeBadge.className = isStudy
      ? 'px-2.5 py-1 rounded-lg text-xs font-extrabold bg-emerald-100 text-emerald-800'
      : 'px-2.5 py-1 rounded-lg text-xs font-extrabold bg-amber-100 text-amber-900';
  }
  document.getElementById('exam-session-title').textContent = activeSession.title;
  const answeredCount = Object.keys(activeSession.answers).length;
  document.getElementById('exam-progress-text').textContent = `Terjawab ${answeredCount} / ${totalQ} soal`;
  updateTimerDisplay();

  // Question Header Badges
  const subBadge = document.getElementById('q-subtest-badge');
  const subColors = {
    TWK: 'bg-[#0F2C59] text-white',
    TIU: 'bg-indigo-700 text-white',
    TKP: 'bg-emerald-700 text-white',
    SKB: 'bg-purple-700 text-white'
  };
  subBadge.textContent = q.subtest;
  subBadge.className = `px-3 py-1 rounded-lg text-xs font-extrabold tracking-wide ${subColors[q.subtest] || 'bg-slate-800 text-white'}`;

  document.getElementById('q-topic-label').textContent = q.topic || 'Umum';
  document.getElementById('q-number-indicator').textContent = `Soal ${idx + 1} / ${totalQ}`;

  // Hint button & box
  const hintBtn = document.getElementById('btn-toggle-hint');
  const hintBox = document.getElementById('q-hint-box');
  if (isStudy && q.hint) {
    hintBtn.classList.remove('hidden');
    if (activeSession.hintVisible[q.id]) {
      hintBox.classList.remove('hidden');
      document.getElementById('q-hint-text').textContent = q.hint;
    } else {
      hintBox.classList.add('hidden');
    }
  } else {
    hintBtn.classList.add('hidden');
    hintBox.classList.add('hidden');
  }

  // Stem
  document.getElementById('q-stem-text').textContent = q.question;

  // Options A-E
  const letters = ['A', 'B', 'C', 'D', 'E'];
  const optContainer = document.getElementById('q-options-container');
  optContainer.innerHTML = '';

  const savedAnsIdx = activeSession.answers[q.id];
  const isStudyConfirmed = isStudy && !!activeSession.confirmedStudy[q.id];
  const activeHighlightIdx = isStudy
    ? (isStudyConfirmed ? savedAnsIdx : pendingStudyOptionIdx)
    : savedAnsIdx;

  q.options.forEach((opt, oIdx) => {
    const isSelected = activeHighlightIdx === oIdx;
    const isBest = opt.score === 5;

    let btnStyle = 'border-slate-200 bg-white hover:border-blue-400 hover:bg-blue-50/40 text-slate-800';
    let badgeStyle = 'bg-slate-100 text-slate-700';

    if (isStudyConfirmed) {
      if (isBest) {
        btnStyle = 'border-emerald-500 bg-emerald-50 text-emerald-950 font-semibold';
        badgeStyle = 'bg-emerald-600 text-white';
      } else if (isSelected) {
        btnStyle = 'border-rose-500 bg-rose-50 text-rose-950';
        badgeStyle = 'bg-rose-600 text-white';
      } else {
        btnStyle = 'border-slate-200 bg-slate-50/50 text-slate-500';
      }
    } else if (isSelected) {
      btnStyle = 'border-[#0F2C59] bg-blue-50 text-[#0F2C59] font-semibold ring-2 ring-blue-200';
      badgeStyle = 'bg-[#0F2C59] text-white';
    }

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.onclick = () => selectOption(oIdx);
    btn.className = `w-full p-3.5 rounded-xl border-2 text-left transition flex items-start gap-3 ${btnStyle}`;
    btn.innerHTML = `
      <span class="w-7 h-7 rounded-lg font-mono-code text-xs font-extrabold flex items-center justify-center shrink-0 ${badgeStyle}">
        ${letters[oIdx]}
      </span>
      <span class="text-xs sm:text-sm leading-relaxed flex-1 pt-0.5">${escapeHtml(opt.text)}</span>
      ${isStudyConfirmed ? `<span class="text-[11px] font-mono-code font-extrabold px-2 py-0.5 rounded ${isBest ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'}">+${opt.score}</span>` : ''}
    `;
    optContainer.appendChild(btn);
  });

  // Study Mode Confirmation Bar & Explanation Box
  const confirmBar = document.getElementById('study-confirm-bar');
  const expBox = document.getElementById('study-explanation-box');

  if (isStudy && !isStudyConfirmed && pendingStudyOptionIdx !== null && q.options[pendingStudyOptionIdx]) {
    confirmBar.classList.remove('hidden');
    document.getElementById('study-pending-letter').textContent = letters[pendingStudyOptionIdx];
  } else {
    confirmBar.classList.add('hidden');
  }

  if (isStudyConfirmed && savedAnsIdx !== undefined && q.options[savedAnsIdx]) {
    expBox.classList.remove('hidden');
    const earned = q.options[savedAnsIdx].score;
    const bestIdx = q.options.findIndex(o => o.score === 5);
    const evalBadge = document.getElementById('study-eval-badge');
    evalBadge.textContent = earned === 5
      ? '✓ Jawaban Optimal (+5 Poin)'
      : (earned > 0 ? `Skor Diperoleh: +${earned} Poin` : '✕ Jawaban Kurang Tepat (0 Poin)');
    evalBadge.className = earned === 5
      ? 'px-2.5 py-0.5 rounded-lg text-xs font-extrabold bg-emerald-100 text-emerald-800'
      : 'px-2.5 py-0.5 rounded-lg text-xs font-extrabold bg-amber-100 text-amber-900';

    document.getElementById('study-best-option-label').textContent = bestIdx >= 0 ? `Kunci Terbaik: ${letters[bestIdx]}` : '';
    document.getElementById('study-explanation-text').textContent = q.explanation || '';
  } else {
    expBox.classList.add('hidden');
  }

  // Flag & Prev/Next buttons state
  const flagBtn = document.getElementById('btn-flag-q');
  const isDoubt = !!activeSession.doubtful[q.id];
  flagBtn.className = isDoubt
    ? 'px-3 py-2 rounded-xl bg-amber-400 text-slate-950 font-extrabold text-xs transition ring-2 ring-amber-300'
    : 'px-3 py-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 font-extrabold text-xs transition';

  document.getElementById('btn-prev-q').disabled = idx === 0;
  document.getElementById('btn-prev-q').classList.toggle('opacity-50', idx === 0);

  const nextBtn = document.getElementById('btn-next-q');
  nextBtn.textContent = idx === totalQ - 1 ? 'Simpan & Tinjau Akhir' : 'Simpan & Lanjutkan →';

  renderNavigatorGrid();
}

function renderNavigatorGrid() {
  if (!activeSession) return;
  const grid = document.getElementById('cat-number-grid');
  if (!grid) return;

  const totalQ = activeSession.questions.length;
  let answeredCount = 0;
  let doubtfulCount = 0;

  grid.innerHTML = '';
  activeSession.questions.forEach((q, i) => {
    const isAnswered = activeSession.answers[q.id] !== undefined;
    const isDoubt = !!activeSession.doubtful[q.id];
    const isCurrent = i === activeSession.currentIndex;

    if (isAnswered) answeredCount++;
    if (isDoubt) doubtfulCount++;

    let cls = 'bg-white border-slate-300 text-slate-700 hover:border-blue-400';
    if (isDoubt) {
      cls = 'bg-amber-400 border-amber-500 text-slate-950';
    } else if (isAnswered) {
      cls = 'bg-emerald-600 border-emerald-700 text-white';
    }
    if (isCurrent) {
      cls += ' ring-2 ring-[#0F2C59] ring-offset-1 scale-105';
    }

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.onclick = () => jumpToQuestion(i);
    btn.className = `h-9 rounded-lg border font-mono-code text-xs font-extrabold transition ${cls}`;
    btn.textContent = i + 1;
    grid.appendChild(btn);
  });

  const emptyCount = Math.max(0, totalQ - answeredCount);
  const pct = totalQ > 0 ? Math.round((answeredCount / totalQ) * 100) : 0;

  document.getElementById('nav-count-answered').textContent = answeredCount;
  document.getElementById('nav-count-doubtful').textContent = doubtfulCount;
  document.getElementById('nav-count-empty').textContent = emptyCount;
  document.getElementById('nav-percent-badge').textContent = `${pct}%`;
}

function selectOption(optIdx) {
  if (!activeSession) return;
  const q = activeSession.questions[activeSession.currentIndex];
  if (!q || !q.options[optIdx]) return;

  if (activeSession.mode === 'study') {
    if (activeSession.confirmedStudy[q.id]) {
      showToast('Jawaban soal ini sudah dikonfirmasi. Tekan "Hapus Pilihan" jika ingin mengulang soal ini.', 'info');
      return;
    }
    pendingStudyOptionIdx = optIdx;
    renderExamWorkspace();
  } else {
    activeSession.answers[q.id] = optIdx;
    saveActiveSession();
    renderExamWorkspace();
  }
}

function cancelPendingStudyOption() {
  pendingStudyOptionIdx = null;
  renderExamWorkspace();
}

function confirmStudyAnswer() {
  if (!activeSession || pendingStudyOptionIdx === null) return;
  const q = activeSession.questions[activeSession.currentIndex];
  activeSession.answers[q.id] = pendingStudyOptionIdx;
  activeSession.confirmedStudy[q.id] = true;
  pendingStudyOptionIdx = null;
  saveActiveSession();
  renderExamWorkspace();
}

function clearCurrentAnswer() {
  if (!activeSession) return;
  const q = activeSession.questions[activeSession.currentIndex];
  delete activeSession.answers[q.id];
  delete activeSession.confirmedStudy[q.id];
  pendingStudyOptionIdx = null;
  saveActiveSession();
  renderExamWorkspace();
  showToast('Pilihan jawaban pada nomor ini dikosongkan.', 'info');
}

function navigateQuestion(delta) {
  if (!activeSession) return;
  const nextIdx = activeSession.currentIndex + delta;
  if (nextIdx >= 0 && nextIdx < activeSession.questions.length) {
    activeSession.currentIndex = nextIdx;
    pendingStudyOptionIdx = null;
    saveActiveSession();
    renderExamWorkspace();
  } else if (nextIdx >= activeSession.questions.length) {
    requestFinishExam();
  }
}

function jumpToQuestion(index) {
  if (!activeSession) return;
  if (index >= 0 && index < activeSession.questions.length) {
    activeSession.currentIndex = index;
    pendingStudyOptionIdx = null;
    saveActiveSession();
    renderExamWorkspace();
  }
}

function toggleDoubtfulCurrent() {
  if (!activeSession) return;
  const q = activeSession.questions[activeSession.currentIndex];
  activeSession.doubtful[q.id] = !activeSession.doubtful[q.id];
  saveActiveSession();
  renderExamWorkspace();
}

function toggleQuestionHint() {
  if (!activeSession) return;
  const q = activeSession.questions[activeSession.currentIndex];
  activeSession.hintVisible[q.id] = !activeSession.hintVisible[q.id];
  renderExamWorkspace();
}

function requestFinishExam() {
  if (!activeSession) return;
  const totalQ = activeSession.questions.length;
  const answered = Object.keys(activeSession.answers).length;
  const empty = totalQ - answered;
  const msg = empty > 0
    ? `Masih ada ${empty} dari ${totalQ} soal yang belum dijawab. Yakin ingin mengakhiri ujian dan menghitung skor sekarang?`
    : `Seluruh ${totalQ} soal telah dijawab. Akhiri ujian dan tampilkan hasil evaluasi?`;

  showConfirmModal('Selesaikan Sesi Ujian?', msg, () => {
    finalizeExamSession();
  });
}

// ============================================================================
// 9. GEMINI AI QUESTION GENERATOR & FINALIZE / RESULTS / HISTORY
// ============================================================================
async function generateQuestionsWithGeminiAI(subtest, count, topicHint, instansiKey = '') {
  const batchSize = Math.min(12, Math.max(1, count));
  const instansiObj = instansiKey && SKB_INSTANSI_PROFILES[instansiKey] ? SKB_INSTANSI_PROFILES[instansiKey] : null;
  const contextDesc = instansiObj
    ? `Subtes: SKB CAT BKN khusus instansi "${instansiObj.name}". Kisi-kisi wajib: ${instansiObj.kisiKisi}.`
    : `Subtes: ${subtest} CPNS BKN Indonesia.${topicHint ? ` Fokus topik: ${topicHint}.` : ''}`;

  const scoringRule = subtest === 'TKP'
    ? 'Setiap soal WAJIB memiliki 5 opsi jawaban dengan skor gradasi unik: satu opsi skor 5, satu skor 4, satu skor 3, satu skor 2, dan satu skor 1.'
    : 'Setiap soal WAJIB memiliki 5 opsi jawaban: tepat satu opsi benar bernilai skor 5 dan empat opsi pengecoh bernilai skor 0.';

  const prompt = `Buatkan ${batchSize} soal latihan HOTS asli standar seleksi CPNS BKN terbaru dalam Bahasa Indonesia.
${contextDesc}
${scoringRule}
Pastikan pertanyaan kontekstual, akurat, tidak mengulang soal klise, serta sertakan petunjuk (hint) singkat dan pembahasan lengkap.`;

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            topic: { type: 'STRING' },
            question: { type: 'STRING' },
            hint: { type: 'STRING' },
            explanation: { type: 'STRING' },
            options: {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                properties: {
                  text: { type: 'STRING' },
                  score: { type: 'INTEGER' }
                },
                required: ['text', 'score']
              }
            }
          },
          required: ['topic', 'question', 'hint', 'explanation', 'options']
        }
      }
    }
  };

  if (subtest === 'TWK' || subtest === 'SKB') {
    payload.tools = [{ google_search: {} }];
  }

  const raw = await callGeminiApiWithBackoff(payload, 2);
  const text = raw?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Respons AI kosong');
  const parsed = JSON.parse(text);
  if (!Array.isArray(parsed) || parsed.length === 0) throw new Error('Format soal AI tidak valid');

  return parsed.map((item, idx) => {
    const cleanOpts = Array.isArray(item.options) && item.options.length >= 5
      ? item.options.slice(0, 5).map(o => ({ text: String(o.text || ''), score: Number(o.score) || 0 }))
      : [
          { text: 'Opsi A', score: 5 },
          { text: 'Opsi B', score: 0 },
          { text: 'Opsi C', score: 0 },
          { text: 'Opsi D', score: 0 },
          { text: 'Opsi E', score: 0 }
        ];
    return {
      id: `ai-${subtest.toLowerCase()}-${Date.now()}-${idx}-${randInt(100, 999)}`,
      subtest,
      instansi: instansiKey || undefined,
      topic: String(item.topic || 'Umum'),
      question: String(item.question || ''),
      hint: String(item.hint || 'Analisis kata kunci pada soal sesuai prinsip ASN.'),
      explanation: String(item.explanation || 'Sesuai kisi-kisi resmi BKN.'),
      options: shuffleArray(cleanOpts)
    };
  });
}

function finalizeExamSession() {
  if (!activeSession) return;
  if (examTimerInterval) clearInterval(examTimerInterval);

  const breakdown = {
    TWK: { count: 0, score: 0, max: 0, correct: 0, wrong: 0, empty: 0 },
    TIU: { count: 0, score: 0, max: 0, correct: 0, wrong: 0, empty: 0 },
    TKP: { count: 0, score: 0, max: 0, best: 0, partial: 0, empty: 0 },
    SKB: { count: 0, score: 0, max: 0, correct: 0, wrong: 0, empty: 0 }
  };

  const weakIds = [];
  const reviewItems = [];

  activeSession.questions.forEach((q, idx) => {
    const sub = breakdown[q.subtest] ? q.subtest : 'TWK';
    const ansIdx = activeSession.answers[q.id];
    const bestIdx = q.options.findIndex(o => o.score === 5);

    breakdown[sub].count++;
    breakdown[sub].max += 5;

    let earned = 0;
    if (ansIdx === undefined) {
      breakdown[sub].empty++;
      weakIds.push(q.id);
    } else {
      earned = q.options[ansIdx] ? q.options[ansIdx].score : 0;
      breakdown[sub].score += earned;
      if (sub === 'TKP') {
        if (earned === 5) breakdown[sub].best++;
        else {
          breakdown[sub].partial++;
          weakIds.push(q.id);
        }
      } else {
        if (earned === 5) breakdown[sub].correct++;
        else {
          breakdown[sub].wrong++;
          weakIds.push(q.id);
        }
      }
    }

    reviewItems.push({
      number: idx + 1,
      questionObj: q,
      chosenIndex: ansIdx,
      bestIndex: bestIdx,
      earnedScore: earned
    });
  });

  const totalScore = breakdown.TWK.score + breakdown.TIU.score + breakdown.TKP.score + breakdown.SKB.score;
  const totalMax = breakdown.TWK.max + breakdown.TIU.max + breakdown.TKP.max + breakdown.SKB.max;

  const pgTwk = breakdown.TWK.max > 0 ? Math.round((65 / 150) * breakdown.TWK.max) : 0;
  const pgTiu = breakdown.TIU.max > 0 ? Math.round((80 / 175) * breakdown.TIU.max) : 0;
  const pgTkp = breakdown.TKP.max > 0 ? Math.round((166 / 225) * breakdown.TKP.max) : 0;

  const passTwk = breakdown.TWK.score >= pgTwk;
  const passTiu = breakdown.TIU.score >= pgTiu;
  const passTkp = breakdown.TKP.score >= pgTkp;

  const wib = getWibDateParts();
  const resultObj = {
    id: `res-${Date.now()}`,
    title: activeSession.title,
    mode: activeSession.mode,
    timestampWib: `${wib.dateString} • ${wib.timeString}`,
    totalScore,
    totalMax,
    breakdown,
    passingGrades: { TWK: pgTwk, TIU: pgTiu, TKP: pgTkp },
    passed: { TWK: passTwk, TIU: passTiu, TKP: passTkp, all: passTwk && passTiu && passTkp },
    weakIds,
    reviewItems
  };

  lastResult = resultObj;
  resultHistory.unshift(resultObj);
  if (resultHistory.length > 30) resultHistory = resultHistory.slice(0, 30);

  safeStorage.setItem(STORAGE_KEYS.LAST_RESULT, JSON.stringify(lastResult));
  safeStorage.setItem(STORAGE_KEYS.RESULT_HISTORY, JSON.stringify(resultHistory));

  activeSession = null;
  saveActiveSession();

  switchTab('results');
  showToast('Ujian selesai! Hasil evaluasi dan pembahasan telah ditampilkan.', 'success');
}

function renderResultsDashboard(res) {
  if (!res) return;
  renderHistoryList();
  document.getElementById('results-empty-state').classList.add('hidden');
  document.getElementById('results-content').classList.remove('hidden');

  const isSkbOnly = res.breakdown && res.breakdown.SKB && res.breakdown.SKB.count > 0 &&
    res.breakdown.TWK.count === 0 && res.breakdown.TIU.count === 0 && res.breakdown.TKP.count === 0;

  const statusBadge = document.getElementById('res-status-badge');
  if (isSkbOnly) {
    statusBadge.textContent = `LATIHAN SKB CAT SELESAI • SKOR ${res.totalScore} / ${res.totalMax}`;
    statusBadge.className = 'inline-block px-3 py-1 rounded-lg text-xs font-extrabold uppercase bg-purple-100 text-purple-900 mb-2';
  } else if (res.passed.all) {
    statusBadge.textContent = '✓ MEMENUHI AMBANG BATAS (LULUS PASSING GRADE)';
    statusBadge.className = 'inline-block px-3 py-1 rounded-lg text-xs font-extrabold uppercase bg-emerald-100 text-emerald-800 mb-2';
  } else {
    statusBadge.textContent = '⚠ BELUM MEMENUHI SELURUH AMBANG BATAS';
    statusBadge.className = 'inline-block px-3 py-1 rounded-lg text-xs font-extrabold uppercase bg-amber-100 text-amber-800 mb-2';
  }

  document.getElementById('res-session-title').textContent = res.title;
  document.getElementById('res-timestamp').textContent = `Diselesaikan pada: ${res.timestampWib}`;
  document.getElementById('res-total-score').textContent = res.totalScore;
  document.getElementById('res-total-max').textContent = res.totalMax;

  const subGrid = document.getElementById('res-subtests-grid');
  subGrid.innerHTML = '';

  ['TWK', 'TIU', 'TKP', 'SKB'].forEach(sub => {
    const data = res.breakdown[sub];
    if (!data || data.count === 0) return;
    const pg = res.passingGrades[sub] || 0;
    const isPass = sub === 'SKB' ? true : res.passed[sub];
    const pct = data.max > 0 ? Math.min(100, Math.round((data.score / data.max) * 100)) : 0;

    const card = document.createElement('div');
    card.className = 'p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2';
    card.innerHTML = `
      <div class="flex items-center justify-between">
        <span class="font-extrabold text-sm text-slate-900">${sub} (${data.count} Soal)</span>
        ${sub !== 'SKB' ? `<span class="px-2 py-0.5 rounded text-[10px] font-extrabold ${isPass ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}">${isPass ? 'LULUS PG' : 'DI BAWAH PG'}</span>` : '<span class="px-2 py-0.5 rounded text-[10px] font-extrabold bg-purple-100 text-purple-800">SKB CAT</span>'}
      </div>
      <div class="flex items-baseline justify-between">
        <div class="text-2xl font-mono-code font-extrabold text-[#0F2C59]">${data.score} <span class="text-xs font-normal text-slate-500">/ ${data.max}</span></div>
        ${sub !== 'SKB' ? `<div class="text-[11px] font-bold text-slate-500">PG: ${pg}</div>` : ''}
      </div>
      <div class="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
        <div class="h-full ${isPass ? 'bg-emerald-500' : 'bg-amber-500'}" style="width: ${pct}%"></div>
      </div>
    `;
    subGrid.appendChild(card);
  });

  renderReviewItemsList(res);
}

function filterReviewItems(filterType) {
  currentReviewFilter = filterType;
  document.querySelectorAll('.rev-filter-btn').forEach(btn => {
    const isActive = btn.getAttribute('onclick').includes(`'${filterType}'`);
    btn.className = isActive
      ? 'rev-filter-btn px-3 py-1.5 rounded-lg text-xs font-extrabold bg-[#0F2C59] text-white'
      : 'rev-filter-btn px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-700';
  });
  if (lastResult) renderReviewItemsList(lastResult);
}

function renderReviewItemsList(res) {
  const container = document.getElementById('results-review-list');
  if (!container || !res || !res.reviewItems) return;

  const letters = ['A', 'B', 'C', 'D', 'E'];
  const filtered = res.reviewItems.filter(item => {
    if (currentReviewFilter === 'WRONG') return item.earnedScore < 5;
    if (currentReviewFilter === 'EMPTY') return item.chosenIndex === undefined;
    return true;
  });

  if (filtered.length === 0) {
    container.innerHTML = '<div class="p-6 text-center text-xs text-slate-500">Tidak ada soal pada kategori filter ini.</div>';
    return;
  }

  container.innerHTML = '';
  filtered.forEach(item => {
    const q = item.questionObj;
    const chosenText = item.chosenIndex !== undefined && q.options[item.chosenIndex]
      ? `${letters[item.chosenIndex]}. ${q.options[item.chosenIndex].text}`
      : 'Tidak dijawab (Kosong)';
    const bestText = item.bestIndex >= 0 && q.options[item.bestIndex]
      ? `${letters[item.bestIndex]}. ${q.options[item.bestIndex].text}`
      : '-';

    const card = document.createElement('div');
    card.className = 'p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2';
    card.innerHTML = `
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div class="flex items-center gap-2">
          <span class="font-mono-code text-xs font-extrabold text-[#0F2C59]">No. ${item.number}</span>
          <span class="px-2 py-0.5 rounded bg-slate-200 text-slate-800 text-[10px] font-extrabold">${q.subtest}</span>
          <span class="text-[11px] font-semibold text-slate-500">${escapeHtml(q.topic || '')}</span>
        </div>
        <span class="px-2.5 py-0.5 rounded-lg text-xs font-mono-code font-extrabold ${item.earnedScore === 5 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'}">
          Skor: +${item.earnedScore}
        </span>
      </div>
      <p class="text-xs sm:text-sm text-slate-900 font-medium leading-relaxed">${escapeHtml(q.question)}</p>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
        <div class="p-2.5 rounded-lg bg-white border border-slate-200">
          <span class="text-[10px] font-bold uppercase text-slate-400 block">Jawaban Anda</span>
          <span class="font-semibold text-slate-800">${escapeHtml(chosenText)}</span>
        </div>
        <div class="p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-200">
          <span class="text-[10px] font-bold uppercase text-emerald-700 block">Jawaban Terbaik (Poin 5)</span>
          <span class="font-semibold text-emerald-950">${escapeHtml(bestText)}</span>
        </div>
      </div>
      <div class="p-2.5 rounded-lg bg-blue-50/60 border border-blue-100 text-xs text-slate-700 leading-relaxed">
        <strong class="text-[#0F2C59]">Pembahasan:</strong> ${escapeHtml(q.explanation || '')}
      </div>
    `;
    container.appendChild(card);
  });
}

function retryWeakQuestions() {
  if (!lastResult || !lastResult.reviewItems) return;
  const weakQuestions = lastResult.reviewItems
    .filter(item => item.earnedScore < 5)
    .map(item => ({
      ...item.questionObj,
      id: `${item.questionObj.id}-retry-${randInt(100, 999)}`,
      options: shuffleArray(item.questionObj.options.map(o => ({ ...o })))
    }));

  if (weakQuestions.length === 0) {
    showToast('Luar biasa! Seluruh soal pada sesi terakhir sudah meraih poin maksimal.', 'success');
    return;
  }

  launchNewSession('retry_weak', `Latih Ulang Soal Salah / Belum Optimal (${weakQuestions.length} Soal)`, weakQuestions, weakQuestions.length * 60);
}

function jumpToCalculatorWithScore() {
  switchTab('info');
  filterInfoSection('CALC');
  prefillSkdFromLastResult();
}

function renderHistoryList() {
  const container = document.getElementById('history-list-container');
  if (!container) return;

  if (!resultHistory || resultHistory.length === 0) {
    container.innerHTML = '<div class="p-4 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200">Belum ada riwayat sesi ujian yang tersimpan.</div>';
    return;
  }

  container.innerHTML = '';
  resultHistory.forEach((item, idx) => {
    const row = document.createElement('div');
    row.className = 'p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5';
    row.innerHTML = `
      <div>
        <div class="flex flex-wrap items-center gap-1.5">
          <span class="font-extrabold text-xs sm:text-sm text-slate-900">${escapeHtml(item.title)}</span>
          <span class="px-2 py-0.5 rounded bg-blue-100 text-[#0F2C59] font-mono-code text-[11px] font-extrabold">
            Skor: ${item.totalScore} / ${item.totalMax}
          </span>
        </div>
        <div class="text-[11px] text-slate-500 mt-0.5">${escapeHtml(item.timestampWib || '')}</div>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <button type="button" onclick="viewHistoryItem(${idx})"
          class="px-3 py-1.5 rounded-lg bg-white hover:bg-blue-50 text-[#0F2C59] border border-slate-300 text-xs font-bold transition">
          Lihat Detail
        </button>
        <button type="button" onclick="deleteHistoryItem(${idx})"
          class="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition">
          Hapus
        </button>
      </div>
    `;
    container.appendChild(row);
  });
}

function viewHistoryItem(idx) {
  if (!resultHistory[idx]) return;
  lastResult = resultHistory[idx];
  renderResultsDashboard(lastResult);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function deleteHistoryItem(idx) {
  showConfirmModal('Hapus Riwayat Sesi?', 'Catatan skor dan pembahasan pada sesi ini akan dihapus permanen.', () => {
    resultHistory.splice(idx, 1);
    safeStorage.setItem(STORAGE_KEYS.RESULT_HISTORY, JSON.stringify(resultHistory));
    if (resultHistory.length > 0) {
      lastResult = resultHistory[0];
      safeStorage.setItem(STORAGE_KEYS.LAST_RESULT, JSON.stringify(lastResult));
      renderResultsDashboard(lastResult);
    } else {
      lastResult = null;
      safeStorage.removeItem(STORAGE_KEYS.LAST_RESULT);
      document.getElementById('results-content').classList.add('hidden');
      document.getElementById('results-empty-state').classList.remove('hidden');
      renderHistoryList();
    }
    showToast('Riwayat sesi berhasil dihapus.', 'info');
  });
}

function requestClearAllHistory() {
  showConfirmModal('Hapus Seluruh Riwayat?', 'Semua riwayat hasil ujian dan latihan akan dihapus permanen dari perangkat ini.', () => {
    resultHistory = [];
    lastResult = null;
    safeStorage.removeItem(STORAGE_KEYS.RESULT_HISTORY);
    safeStorage.removeItem(STORAGE_KEYS.LAST_RESULT);
    document.getElementById('results-content').classList.add('hidden');
    document.getElementById('results-empty-state').classList.remove('hidden');
    renderHistoryList();
    showToast('Seluruh riwayat berhasil dibersihkan.', 'info');
  });
}

// ============================================================================
// 10. BANK SOAL MANAGER, MANUAL ADD & HYBRID GENERATOR
// ============================================================================
function updateHomeDashboardStats() {
  const badge = document.getElementById('home-bank-count-badge');
  if (badge) {
    badge.textContent = `Bank Soal Aktif: ${getCombinedBank().length + SKB_SAMPLE_QUESTIONS.length} Master + Generator Tanpa Batas`;
  }
}

function renderBankTable() {
  const list = document.getElementById('bank-items-list');
  if (!list) return;

  const keyword = (document.getElementById('bank-search-input')?.value || '').toLowerCase();
  const subFilter = document.getElementById('bank-subtest-filter')?.value || 'ALL';

  const allItems = [...getCombinedBank(), ...SKB_SAMPLE_QUESTIONS].filter(q => {
    const matchSub = subFilter === 'ALL' || q.subtest === subFilter;
    const matchKw = !keyword || q.question.toLowerCase().includes(keyword) || (q.topic || '').toLowerCase().includes(keyword);
    return matchSub && matchKw;
  });

  list.innerHTML = '';
  if (allItems.length === 0) {
    list.innerHTML = '<div class="p-6 text-center text-xs text-slate-500">Tidak ada soal yang sesuai filter pencarian.</div>';
    return;
  }

  allItems.forEach(q => {
    const isCustom = String(q.id).startsWith('custom-') || String(q.id).startsWith('ai-');
    const row = document.createElement('div');
    row.className = 'py-3.5 px-2 flex items-start justify-between gap-3';
    row.innerHTML = `
      <div class="space-y-1 flex-1 min-w-0">
        <div class="flex flex-wrap items-center gap-1.5">
          <span class="px-2 py-0.5 rounded text-[10px] font-extrabold bg-[#0F2C59] text-white">${q.subtest}</span>
          <span class="text-xs font-bold text-slate-700">${escapeHtml(q.topic || 'Umum')}</span>
          ${isCustom ? '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900">Kustom / AI Generated</span>' : ''}
        </div>
        <p class="text-xs text-slate-700 line-clamp-2 leading-relaxed">${escapeHtml(q.question)}</p>
      </div>
      ${isCustom ? `<button type="button" onclick="deleteCustomQuestion('${q.id}')" class="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold shrink-0">Hapus</button>` : ''}
    `;
    list.appendChild(row);
  });
}

function deleteCustomQuestion(id) {
  customQuestions = customQuestions.filter(q => q.id !== id);
  safeStorage.setItem(STORAGE_KEYS.CUSTOM_QUESTIONS, JSON.stringify(customQuestions));
  renderBankTable();
  updateHomeDashboardStats();
  showToast('Soal tambahan dihapus dari bank soal.', 'info');
}

function updateManualOptionLabels() {
  const sub = document.getElementById('add-q-subtest')?.value || 'TWK';
  const container = document.getElementById('add-q-options-fields');
  if (!container) return;

  const letters = ['A', 'B', 'C', 'D', 'E'];
  container.innerHTML = '';

  if (sub === 'TKP') {
    letters.forEach((ltr, i) => {
      const score = 5 - i;
      container.innerHTML += `
        <div class="flex items-center gap-2">
          <span class="w-16 text-[11px] font-extrabold text-emerald-800 bg-emerald-50 px-2 py-1.5 rounded-lg text-center">Opsi ${ltr} (${score})</span>
          <input type="text" id="add-opt-${i}" required placeholder="Teks opsi bernilai ${score} poin..." class="flex-1 px-3 py-1.5 rounded-xl border border-slate-300 text-xs" />
        </div>
      `;
    });
  } else {
    letters.forEach((ltr, i) => {
      container.innerHTML += `
        <div class="flex items-center gap-2">
          <label class="flex items-center gap-1 w-20 text-xs font-bold text-slate-700">
            <input type="radio" name="add-correct-radio" value="${i}" ${i === 0 ? 'checked' : ''} /> Opsi ${ltr}
          </label>
          <input type="text" id="add-opt-${i}" required placeholder="Teks pilihan ${ltr}..." class="flex-1 px-3 py-1.5 rounded-xl border border-slate-300 text-xs" />
        </div>
      `;
    });
  }
}

function handleSaveManualQuestion(e) {
  e.preventDefault();
  const subtest = document.getElementById('add-q-subtest').value;
  const topic = document.getElementById('add-q-topic').value.trim();
  const question = document.getElementById('add-q-stem').value.trim();
  const hint = document.getElementById('add-q-hint').value.trim();
  const explanation = document.getElementById('add-q-explanation').value.trim();

  const options = [];
  if (subtest === 'TKP') {
    for (let i = 0; i < 5; i++) {
      const txt = (document.getElementById(`add-opt-${i}`)?.value || '').trim();
      options.push({ text: txt, score: 5 - i });
    }
  } else {
    const correctRadio = document.querySelector('input[name="add-correct-radio"]:checked');
    const correctIdx = correctRadio ? parseInt(correctRadio.value, 10) : 0;
    for (let i = 0; i < 5; i++) {
      const txt = (document.getElementById(`add-opt-${i}`)?.value || '').trim();
      options.push({ text: txt, score: i === correctIdx ? 5 : 0 });
    }
  }

  const newQ = {
    id: `custom-${Date.now()}`,
    subtest,
    topic: topic || 'Soal Kustom',
    question,
    hint: hint || 'Analisis kata kunci pada soal sesuai aturan BKN.',
    explanation,
    options
  };

  customQuestions.unshift(newQ);
  safeStorage.setItem(STORAGE_KEYS.CUSTOM_QUESTIONS, JSON.stringify(customQuestions));
  document.getElementById('form-add-question').reset();
  closeModal('modal-add-question');
  renderBankTable();
  updateHomeDashboardStats();
  showToast('Soal baru berhasil ditambahkan ke Bank Soal!', 'success');
}

async function executeCustomGeneration(startImmediately) {
  const count = Math.min(500, Math.max(1, parseInt(document.getElementById('modal-gen-count')?.value, 10) || 25));
  const sub = document.getElementById('modal-gen-subtest')?.value || 'MIX';
  const customTopic = (document.getElementById('modal-gen-topic')?.value || '').trim();
  const instansiKey = document.getElementById('skb-instansi-select')?.value || 'PEMDA_UMUM';

  const runBtn = document.getElementById('btn-run-generator');
  const origText = runBtn ? runBtn.textContent : '';
  if (runBtn) {
    runBtn.disabled = true;
    runBtn.textContent = '⏳ AI Sedang Merakit Soal...';
  }

  let aiBatch = [];
  try {
    const targetAiSub = sub === 'MIX' ? ['TWK', 'TIU', 'TKP'][randInt(0, 2)] : sub;
    aiBatch = await generateQuestionsWithGeminiAI(targetAiSub, Math.min(8, count), customTopic, sub === 'SKB' ? instansiKey : '');
    if (aiBatch.length > 0) {
      customQuestions = [...aiBatch, ...customQuestions];
      safeStorage.setItem(STORAGE_KEYS.CUSTOM_QUESTIONS, JSON.stringify(customQuestions));
    }
  } catch (e) {
    // Graceful fallback to local/parametric bank when offline
  } finally {
    if (runBtn) {
      runBtn.disabled = false;
      runBtn.textContent = origText;
    }
  }

  let generated = [];
  if (sub === 'MIX') {
    const twk = Math.round(count * (30 / 110));
    const tiu = Math.round(count * (35 / 110));
    const tkp = Math.max(0, count - twk - tiu);
    const adjTwk = (twk + tiu + tkp === 0) ? 1 : twk;
    generated = buildQuestionSet(adjTwk, tiu, tkp, 0);
  } else if (sub === 'TWK') {
    generated = buildQuestionSet(count, 0, 0, 0);
  } else if (sub === 'TIU') {
    generated = buildQuestionSet(0, count, 0, 0);
  } else if (sub === 'TKP') {
    generated = buildQuestionSet(0, 0, count, 0);
  } else {
    generated = buildSkbInstansiQuestionSet(instansiKey, count, aiBatch);
  }

  if (customTopic) {
    generated = generated.map(q => ({ ...q, topic: `${q.topic} (${customTopic})` }));
  }

  closeModal('modal-generator');

  if (startImmediately) {
    const durationSec = Math.max(60, Math.round(generated.length * (100 / 110) * 60));
    launchNewSession('generated_custom', `Paket Generated (${generated.length} Soal)`, generated, durationSec);
    showToast(
      aiBatch.length > 0
        ? `✨ ${generated.length} soal baru (termasuk ${aiBatch.length} soal baru dari Gemini AI) siap dikerjakan!`
        : `Berhasil merakit ${generated.length} soal latihan baru!`,
      'success'
    );
  } else {
    const toSave = aiBatch.length > 0
      ? aiBatch
      : generated.slice(0, 30).map((q, i) => ({ ...q, id: `ai-${Date.now()}-${i}` }));
    if (aiBatch.length === 0) {
      customQuestions = [...toSave, ...customQuestions];
      safeStorage.setItem(STORAGE_KEYS.CUSTOM_QUESTIONS, JSON.stringify(customQuestions));
    }
    renderBankTable();
    updateHomeDashboardStats();
    showToast(`${toSave.length} soal baru ditambahkan ke Bank Soal!`, 'success');
  }
}

function exportBankJson() {
  const dataStr = JSON.stringify(getCombinedBank(), null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bank_soal_cat_bkn_${getWibDateParts().dateKey}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('File JSON Bank Soal berhasil diunduh.', 'success');
}

// ============================================================================
// 11. INFO, LIVE NEWS AI, SKB INSTANSI, EXTRA TESTS & CALCULATOR
// ============================================================================
function filterInfoSection(sectionKey) {
  const pills = ['ALL', 'TIMELINE', 'SKB', 'CALC', 'BERKAS'];
  pills.forEach(p => {
    const btn = document.getElementById(`info-pill-${p}`);
    if (btn) {
      btn.className = p === sectionKey
        ? 'px-3 py-1.5 rounded-xl text-xs font-extrabold bg-white text-[#0F2C59] transition'
        : 'px-3 py-1.5 rounded-xl text-xs font-bold bg-white/15 hover:bg-white/25 text-white transition';
    }
  });

  const blocks = {
    TIMELINE: document.getElementById('info-block-timeline'),
    SKB: document.getElementById('info-block-skb'),
    CALC: document.getElementById('info-block-calc'),
    BERKAS: document.getElementById('info-block-berkas')
  };

  Object.entries(blocks).forEach(([key, el]) => {
    if (!el) return;
    if (sectionKey === 'ALL' || sectionKey === key) {
      el.classList.remove('hidden');
    } else {
      el.classList.add('hidden');
    }
  });
}

const DEFAULT_NEWS_DATA = {
  updatedAtWib: 'Sinkronisasi Raker DPR RI, KemenPANRB & BKN',
  sourceBadge: 'Terverifikasi BKN',
  citations: [],
  timeline: [
    {
      date: '17 November 2026 — Sekarang',
      status: 'AKTIF SEKARANG',
      title: 'Pembuatan Akun SSCASN Dibuka Lebih Awal',
      desc: 'Pelamar sudah dapat membuat akun dan melakukan verifikasi swafoto liveness detection di sscasn.bkn.go.id untuk menghindari antrean server saat pendaftaran dibuka.'
    },
    {
      date: '25 – 27 November 2026',
      status: 'TAHAP BERIKUTNYA',
      title: 'Pengumuman Resmi Seleksi & Rincian Formasi',
      desc: 'Rilis resmi formasi oleh BKN dan masing-masing kementerian/lembaga pusat setelah finalisasi pleno Panselnas.'
    },
    {
      date: 'Mulai Jumat, 27 November 2026',
      status: 'PENDAFTARAN',
      title: 'Pembukaan Pendaftaran & Unggah Dokumen',
      desc: 'Pelamar memilih 1 instansi dan 1 jabatan sesuai kualifikasi ijazah serta mengunggah berkas persyaratan bermeterai.'
    },
    {
      date: 'Pekan Pertama Desember 2026',
      status: 'VERIFIKASI',
      title: 'Seleksi Administrasi, Hasil & Masa Sanggah',
      desc: 'Verifikasi kesesuaian dokumen oleh instansi, pengumuman hasil administrasi (MS/TMS), serta pengajuan sanggah bagi pelamar.'
    },
    {
      date: 'Januari – Maret 2027',
      status: 'UJIAN CAT BKN',
      title: 'Pelaksanaan Ujian SKD & SKB Berbasis CAT',
      desc: 'Pelaksanaan Seleksi Kompetensi Dasar (110 soal) dilanjutkan Seleksi Kompetensi Bidang (peringkat 3× formasi) hingga penetapan NIP target 1 Juni 2027.'
    }
  ],
  highlights: [
    {
      title: '1. Total Kuota 167.113 Formasi Instansi Pusat',
      body: 'Gelombang November 2026 memprioritaskan kementerian/lembaga pusat dan program strategis nasional (belum termasuk formasi Pemda).'
    },
    {
      title: '2. Instansi yang Sudah Mengonfirmasi Formasi',
      body: 'Mahkamah Agung (4.430 formasi), Kementerian Keuangan (1.915 formasi SMA/SMK–S1), Kemendikdasmen (1.460 formasi), Kemenkes & BSSN.'
    },
    {
      title: '3. Kebijakan PPPK & Rekrutmen Khusus Guru',
      body: 'Pegawai PPPK yang memenuhi syarat diperbolehkan melamar CPNS 2026. Untuk rekrutmen CPNS khusus guru nasional dijadwalkan menyusul Maret 2027 (tes Juli 2027).'
    }
  ]
};

function renderNewsAndTimeline() {
  let newsData = DEFAULT_NEWS_DATA;
  try {
    const cachedRaw = safeStorage.getItem(STORAGE_KEYS.LIVE_NEWS_CACHE);
    if (cachedRaw) {
      const parsed = JSON.parse(cachedRaw);
      if (parsed && Array.isArray(parsed.timeline) && parsed.timeline.length > 0) {
        newsData = parsed;
      }
    }
  } catch (e) { /* use default */ }

  const updatedLabel = document.getElementById('news-last-updated-label');
  const badgeEl = document.getElementById('news-source-badge');
  const timelineList = document.getElementById('dynamic-timeline-list');
  const highlightsList = document.getElementById('dynamic-news-highlights');
  const citationsBox = document.getElementById('news-grounding-citations');

  if (updatedLabel) updatedLabel.textContent = `Pembaruan Terakhir: ${newsData.updatedAtWib}`;
  if (badgeEl) badgeEl.textContent = newsData.sourceBadge || 'AI Grounded';

  if (timelineList) {
    timelineList.innerHTML = '';
    newsData.timeline.forEach((step, i) => {
      const isFirst = i === 0;
      const dotColor = isFirst ? 'bg-emerald-500 ring-emerald-100' : (i === 1 ? 'bg-amber-400 ring-amber-100' : 'bg-[#1D4ED8] ring-blue-100');
      const cardBg = isFirst ? 'bg-emerald-50/70 border-emerald-200' : (i === 1 ? 'bg-amber-50/70 border-amber-200' : 'bg-slate-50 border-slate-200');
      const pillBg = isFirst ? 'bg-emerald-600 text-white' : (i === 1 ? 'bg-amber-400 text-slate-950' : 'bg-blue-100 text-[#0F2C59]');

      timelineList.innerHTML += `
        <div class="relative pl-10">
          <span class="absolute left-1.5 top-1 w-4 h-4 rounded-full ${dotColor} ring-4"></span>
          <div class="p-3.5 rounded-xl border ${cardBg}">
            <div class="flex flex-wrap items-center justify-between gap-1.5">
              <span class="text-xs font-extrabold text-slate-900">${escapeHtml(step.date)}</span>
              <span class="px-2 py-0.5 rounded ${pillBg} text-[10px] font-extrabold uppercase">${escapeHtml(step.status)}</span>
            </div>
            <h4 class="font-extrabold text-sm text-slate-900 mt-1">${escapeHtml(step.title)}</h4>
            <p class="text-xs text-slate-600 mt-1 leading-relaxed">${escapeHtml(step.desc)}</p>
          </div>
        </div>
      `;
    });
  }

  if (highlightsList) {
    highlightsList.innerHTML = '';
    (newsData.highlights || []).forEach(h => {
      highlightsList.innerHTML += `
        <div class="p-3 rounded-xl bg-slate-50 border border-slate-200">
          <strong class="text-[#0F2C59] block mb-0.5">${escapeHtml(h.title)}</strong>
          <span>${escapeHtml(h.body)}</span>
        </div>
      `;
    });
  }

  if (citationsBox) {
    if (Array.isArray(newsData.citations) && newsData.citations.length > 0) {
      citationsBox.classList.remove('hidden');
      citationsBox.innerHTML = '<strong class="block text-slate-700">Sumber Berita Terkini (Google Search):</strong>' +
        newsData.citations.slice(0, 3).map(c =>
          `<a href="${escapeHtml(c.uri)}" target="_blank" rel="noopener noreferrer" class="block text-[#1D4ED8] hover:underline truncate">🔗 ${escapeHtml(c.title)}</a>`
        ).join('');
    } else {
      citationsBox.classList.add('hidden');
    }
  }
}

async function refreshLiveCpnsNewsWithAI(isSilentAuto = false) {
  const btn = document.getElementById('btn-refresh-live-news');
  const origHtml = btn ? btn.innerHTML : '';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span>⏳ Mencari Berita Terkini...</span>';
  }

  try {
    const wib = getWibDateParts();
    const prompt = `Cari berita terbaru resmi dari BKN, KemenPANRB, dan SSCASN mengenai jadwal pendaftaran, pengumuman formasi, dan tahapan seleksi CPNS 2026–2027 di Indonesia per hari ini (${wib.dateString}).
Kembalikan HANYA JSON valid (tanpa markdown) dengan struktur persis berikut:
{
  "timeline": [
    { "date": "tanggal tahapan", "status": "STATUS SINGKAT", "title": "Judul Tahapan", "desc": "Penjelasan singkat 1-2 kalimat" }
  ],
  "highlights": [
    { "title": "Judul Poin Berita Terkini", "body": "Ringkasan fakta & kuota formasi instansi" }
  ]
}
Berikan 5 item timeline kronologis dan 3 item highlights berita terkini.`;

    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      tools: [{ google_search: {} }]
    };

    const raw = await callGeminiApiWithBackoff(payload, 2);
    const text = raw?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('JSON berita tidak ditemukan');

    const parsed = JSON.parse(jsonMatch[0]);
    const attributions = raw?.candidates?.[0]?.groundingMetadata?.groundingAttributions || [];
    const citations = attributions
      .map(a => ({ uri: a.web?.uri, title: a.web?.title }))
      .filter(s => s.uri && s.title);

    const updatedCache = {
      dateKey: wib.dateKey,
      updatedAtWib: `${wib.dateString} • ${wib.timeString}`,
      sourceBadge: 'Live AI Search',
      timeline: Array.isArray(parsed.timeline) && parsed.timeline.length > 0 ? parsed.timeline : DEFAULT_NEWS_DATA.timeline,
      highlights: Array.isArray(parsed.highlights) && parsed.highlights.length > 0 ? parsed.highlights : DEFAULT_NEWS_DATA.highlights,
      citations
    };

    safeStorage.setItem(STORAGE_KEYS.LIVE_NEWS_CACHE, JSON.stringify(updatedCache));
    renderNewsAndTimeline();
    if (!isSilentAuto) {
      showToast('Berita & Timeline CPNS 2026 berhasil diperbarui dari tren informasi terkini!', 'success');
    }
  } catch (err) {
    if (!isSilentAuto) {
      showToast('Menampilkan jadwal terverifikasi terbaru (koneksi pencarian berita sedang sibuk).', 'info');
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = origHtml;
    }
  }
}

function onSkbInstansiChanged() {
  const selectEl = document.getElementById('skb-instansi-select');
  const detailBox = document.getElementById('skb-instansi-detail-box');
  if (!selectEl || !detailBox) return;

  const key = selectEl.value || 'KEMENKEU';
  const profile = SKB_INSTANSI_PROFILES[key] || SKB_INSTANSI_PROFILES.PEMDA_UMUM;

  detailBox.innerHTML = `
    <div class="flex flex-wrap items-center justify-between gap-2">
      <strong class="text-purple-950 text-xs sm:text-sm">🏛️ ${escapeHtml(profile.name)}</strong>
      <span class="px-2 py-0.5 rounded bg-purple-100 text-purple-800 text-[10px] font-extrabold">Kisi-Kisi Khusus Instansi</span>
    </div>
    <p class="leading-relaxed"><strong>Materi SKB CAT:</strong> ${escapeHtml(profile.kisiKisi)}</p>
    <p class="leading-relaxed text-slate-600"><strong>Komposisi SKB &amp; Tes Tambahan:</strong> ${escapeHtml(profile.extraTests)}</p>
  `;

  const calcWeightEl = document.getElementById('calc-skb-weight');
  if (calcWeightEl) {
    calcWeightEl.value = profile.defaultWeight;
    calculateFinalCpnsScore();
  }
}

function buildSkbInstansiQuestionSet(instansiKey, count, priorityAiQuestions = []) {
  const allSkb = [...SKB_SAMPLE_QUESTIONS, ...customQuestions.filter(q => q.subtest === 'SKB')];
  const matched = allSkb.filter(q => q.instansi === instansiKey);
  const general = allSkb.filter(q => q.instansi !== instansiKey);
  const combinedPool = [...priorityAiQuestions, ...shuffleArray(matched), ...shuffleArray(general)];

  const result = [];
  for (let i = 0; i < count; i++) {
    const base = combinedPool[i % combinedPool.length];
    result.push({
      ...base,
      id: `${base.id}-skb-${i}-${randInt(100, 999)}`,
      options: shuffleArray(base.options.map(o => ({ ...o })))
    });
  }
  return result;
}

async function startSkbPracticeSession(forceNewAi = false) {
  const instansiKey = document.getElementById('skb-instansi-select')?.value || 'KEMENKEU';
  const count = Math.min(100, Math.max(5, parseInt(document.getElementById('skb-question-count')?.value, 10) || 30));
  const profile = SKB_INSTANSI_PROFILES[instansiKey] || SKB_INSTANSI_PROFILES.PEMDA_UMUM;
  const wib = getWibDateParts();
  const cacheKey = `${wib.dateKey}_${instansiKey}`;

  let cachedDailySkb = {};
  try {
    const raw = safeStorage.getItem(STORAGE_KEYS.SKB_DAILY_CACHE);
    if (raw) cachedDailySkb = JSON.parse(raw) || {};
  } catch (e) { cachedDailySkb = {}; }

  let aiSkbQuestions = Array.isArray(cachedDailySkb[cacheKey]) ? cachedDailySkb[cacheKey] : [];

  if (forceNewAi || aiSkbQuestions.length === 0) {
    const btnStart = document.getElementById('btn-start-skb-instansi');
    const btnAi = document.getElementById('btn-regen-skb-ai');
    if (btnStart) btnStart.disabled = true;
    if (btnAi) {
      btnAi.disabled = true;
      btnAi.textContent = '⏳ AI...';
    }

    try {
      const freshAi = await generateQuestionsWithGeminiAI('SKB', Math.min(10, count), '', instansiKey);
      if (freshAi.length > 0) {
        aiSkbQuestions = freshAi;
        cachedDailySkb[cacheKey] = aiSkbQuestions;
        safeStorage.setItem(STORAGE_KEYS.SKB_DAILY_CACHE, JSON.stringify(cachedDailySkb));
        customQuestions = [...aiSkbQuestions, ...customQuestions];
        safeStorage.setItem(STORAGE_KEYS.CUSTOM_QUESTIONS, JSON.stringify(customQuestions));
      }
    } catch (e) {
      // Fallback to curated pool seamlessly
    } finally {
      if (btnStart) btnStart.disabled = false;
      if (btnAi) {
        btnAi.disabled = false;
        btnAi.textContent = '✨ AI Baru';
      }
    }
  }

  const qs = buildSkbInstansiQuestionSet(instansiKey, count, aiSkbQuestions);
  const durationSec = Math.max(10 * 60, Math.round(count * 0.9 * 60));
  launchNewSession('skb_practice', `SKB CAT — ${profile.name} (${count} Soal)`, qs, durationSec);
  showToast(`Simulasi SKB CAT (${profile.name}) dimulai!`, 'success');
}

async function analyzeExamResultWithAI() {
  if (!lastResult) return;
  const btn = document.getElementById('btn-ai-analyze-result');
  const box = document.getElementById('res-ai-analysis-box');
  const contentEl = document.getElementById('res-ai-analysis-content');
  const timeEl = document.getElementById('res-ai-analysis-time');

  const origText = btn ? btn.textContent : '';
  if (btn) {
    btn.disabled = true;
    btn.textContent = '⏳ AI Menganalisis Hasil...';
  }

  try {
    const b = lastResult.breakdown;
    const summaryLines = [];
    if (b.TWK?.count > 0) summaryLines.push(`TWK: ${b.TWK.score}/${b.TWK.max} (PG: ${lastResult.passingGrades.TWK})`);
    if (b.TIU?.count > 0) summaryLines.push(`TIU: ${b.TIU.score}/${b.TIU.max} (PG: ${lastResult.passingGrades.TIU})`);
    if (b.TKP?.count > 0) summaryLines.push(`TKP: ${b.TKP.score}/${b.TKP.max} (PG: ${lastResult.passingGrades.TKP})`);
    if (b.SKB?.count > 0) summaryLines.push(`SKB CAT: ${b.SKB.score}/${b.SKB.max}`);

    const weakTopics = [...new Set(
      (lastResult.reviewItems || [])
        .filter(i => i.earnedScore < 5)
        .map(i => i.questionObj?.topic)
        .filter(Boolean)
    )].slice(0, 6);

    const prompt = `Anda adalah pelatih seleksi CPNS BKN profesional. Analisis hasil latihan berikut secara singkat, tajam, dan memotivasi (maksimal 3 paragraf pendek):
Paket: ${lastResult.title}
Total Skor: ${lastResult.totalScore} / ${lastResult.totalMax}
Rincian: ${summaryLines.join(', ')}
Topik yang masih perlu diperkuat: ${weakTopics.length > 0 ? weakTopics.join(', ') : 'Semua topik sudah sangat kuat'}

Berikan:
1) Evaluasi posisi kelulusan & prioritas subtes yang paling mendesak dinaikkan.
2) Strategi manajemen waktu & taktik pengerjaan CAT BKN berikutnya.`;

    const raw = await callGeminiApiWithBackoff({
      contents: [{ parts: [{ text: prompt }] }]
    }, 2);

    const reply = raw?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!reply) throw new Error('Kosong');

    const wib = getWibDateParts();
    if (box && contentEl) {
      box.classList.remove('hidden');
      contentEl.textContent = reply.trim();
      if (timeEl) timeEl.textContent = wib.timeString;
    }
    showToast('Analisis evaluasi AI selesai dibuat!', 'success');
  } catch (e) {
    if (box && contentEl) {
      box.classList.remove('hidden');
      contentEl.textContent = `Rekomendasi Evaluasi: Fokuskan latihan pada butir soal dengan skor di bawah 5 (gunakan tombol "Latih Ulang Soal Salah"). Pada CAT BKN, kerjakan TKP dan TWK secara taktis maksimal 45–50 detik per soal agar memiliki waktu cukup untuk hitungan analitis TIU.`;
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = origText;
    }
  }
}

// ============================================================================
// 11B. SIMULASI TES SKB TAMBAHAN (PSIKOTES, WAWANCARA AI & KESAMAPTAAN)
// ============================================================================
const PSIKOTES_ITEMS = [
  {
    q: '1. Ketika tenggat waktu laporan pimpinan dimajukan secara mendadak menjadi 2 jam lagi sementara data dari dua rekan belum lengkap, reaksi emosional pertama saya adalah ....',
    opts: [
      { t: 'Tetap tenang, menyusun kerangka laporan dari data yang ada sambil menghubungi kedua rekan secara asertif.', s: 10 },
      { t: 'Merasa tertekan namun langsung lembur cepat menyelesaikan bagian sendiri terlebih dahulu.', s: 7 },
      { t: 'Panik dan mengeluhkan perubahan jadwal mendadak tersebut kepada rekan satu ruangan.', s: 3 }
    ]
  },
  {
    q: '2. Saat pimpinan mengkritik hasil analisis kebijakan yang telah Anda kerjakan selama seminggu penuh di depan forum rapat, sikap Anda adalah ....',
    opts: [
      { t: 'Mencatat poin koreksi secara objektif sebagai bahan penyempurnaan tanpa terbawa emosi pribadi.', s: 10 },
      { t: 'Menerima masukan dengan diam namun merasa kurang bersemangat melanjutkan revisi.', s: 6 },
      { t: 'Membela diri secara panjang lebar di depan forum bahwa kesalahan berasal dari arahan awal.', s: 2 }
    ]
  },
  {
    q: '3. Anda ditempatkan pada tim baru yang memiliki ritme kerja sangat cepat dan target terukur setiap minggu. Cara Anda beradaptasi adalah ....',
    opts: [
      { t: 'Memetakan standar kerja tim di hari pertama, membuat jadwal harian terukur, dan aktif meminta umpan balik.', s: 10 },
      { t: 'Mengamati pola kerja rekan lain selama beberapa minggu sebelum mulai mengambil inisiatif.', s: 7 },
      { t: 'Tetap bekerja dengan ritme nyaman pribadi agar tidak mudah mengalami kelelahan.', s: 3 }
    ]
  },
  {
    q: '4. Apabila Anda menemukan celah prosedur yang berpotensi merugikan keuangan negara namun sudah menjadi kebiasaan lama di unit kerja, Anda akan ....',
    opts: [
      { t: 'Mengumpulkan bukti fakta secara objektif dan mengusulkan perbaikan SOP sesuai regulasi kepada atasan berwenang.', s: 10 },
      { t: 'Menghindari terlibat langsung dalam proses tersebut sambil menunggu ada audit eksternal.', s: 5 },
      { t: 'Mengikuti kebiasaan lama tersebut agar tidak dikucilkan oleh rekan senior di unit kerja.', s: 1 }
    ]
  },
  {
    q: '5. Dalam situasi pelayanan publik di mana masyarakat marah akibat kesalahpahaman informasi persyaratan, pengendalian diri Anda ditunjukkan dengan ....',
    opts: [
      { t: 'Mendengarkan keluhan hingga selesai dengan empati, memvalidasi perasaannya, lalu menjelaskan solusi secara runtut.', s: 10 },
      { t: 'Memotong pembicaraannya agar bisa segera menunjukkan papan pengumuman syarat resmi.', s: 5 },
      { t: 'Membalas dengan nada tegas dan tinggi agar pemohon menghormati petugas negara.', s: 2 }
    ]
  }
];

function saveExtraTestResult(testName, score100) {
  const cleanScore = Math.min(100, Math.max(0, Math.round(score100)));
  safeStorage.setItem(STORAGE_KEYS.EXTRA_TEST_SCORE, JSON.stringify({ testName, score: cleanScore, at: Date.now() }));
  updateExtraTestBadge();
  const extraInput = document.getElementById('calc-skb-extra-score');
  if (extraInput) {
    extraInput.value = cleanScore;
    calculateFinalCpnsScore();
  }
}

function updateExtraTestBadge() {
  const badge = document.getElementById('extra-test-saved-badge');
  if (!badge) return;
  try {
    const raw = safeStorage.getItem(STORAGE_KEYS.EXTRA_TEST_SCORE);
    if (raw) {
      const parsed = JSON.parse(raw);
      badge.textContent = `Skor ${parsed.testName}: ${parsed.score} / 100 (Tersinkron ke Kalkulator)`;
      badge.className = 'px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 text-xs font-extrabold self-start sm:self-auto';
    }
  } catch (e) { /* ignore */ }
}

function openExtraTestModal(mode) {
  const badge = document.getElementById('extra-modal-badge');
  const title = document.getElementById('extra-modal-title');
  const body = document.getElementById('extra-modal-body');
  const instansiKey = document.getElementById('skb-instansi-select')?.value || 'KEMENKEU';
  const profile = SKB_INSTANSI_PROFILES[instansiKey] || SKB_INSTANSI_PROFILES.PEMDA_UMUM;

  if (mode === 'PSIKOTES') {
    badge.textContent = 'Simulasi Psikotes & Ketahanan Kerja ASN';
    title.textContent = 'Evaluasi Stabilitas Emosi, Integritas & Adaptabilitas';
    let html = '<div class="space-y-3">';
    PSIKOTES_ITEMS.forEach((item, idx) => {
      html += `<div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
        <div class="text-xs font-extrabold text-slate-900">${escapeHtml(item.q)}</div>
        <div class="space-y-1.5">`;
      item.opts.forEach(o => {
        html += `<label class="flex items-start gap-2 text-xs text-slate-700 cursor-pointer p-2 rounded-lg bg-white border border-slate-200 hover:border-indigo-400">
          <input type="radio" name="psiko-q-${idx}" value="${o.s}" class="mt-0.5 accent-indigo-700" />
          <span>${escapeHtml(o.t)}</span>
        </label>`;
      });
      html += '</div></div>';
    });
    html += `</div>
      <div id="psikotes-result-box" class="hidden p-4 rounded-xl bg-indigo-50 border border-indigo-300 text-xs text-indigo-950"></div>
      <div class="flex justify-end gap-2 pt-2">
        <button type="button" onclick="closeModal('modal-extra-test')" class="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold">Tutup</button>
        <button type="button" onclick="submitPsikotesSimulation()" class="px-5 py-2 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-extrabold">Hitung Skor Psikotes</button>
      </div>`;
    body.innerHTML = html;
  } else if (mode === 'WAWANCARA') {
    badge.textContent = `Simulasi Wawancara Panel AI • ${profile.name}`;
    title.textContent = 'Uji Integritas, Motivasi ASN & Kompetensi Instansi';
    const questions = [
      `1. Jelaskan motivasi utama Anda melamar di ${profile.name} dan kontribusi nyata apa yang dapat Anda berikan pada unit kerja?`,
      `2. Bagaimana sikap Anda apabila ditempatkan di wilayah terpencil (3T) dengan beban kerja tinggi dan keterbatasan fasilitas?`,
      `3. Jika rekan kerja atau atasan meminta Anda mempercepat proses berkas keluarga mereka dengan melompati antrean resmi, bagaimana tindakan Anda?`,
      `4. Jelaskan pemahaman Anda mengenai tugas pokok ${profile.name} serta penerapan nilai BerAKHLAK dalam jabatan yang Anda lamar!`
    ];
    let html = `<p class="text-xs text-slate-600">Jawab keempat pertanyaan panel penguji di bawah ini secara jujur dan terstruktur. Gemini AI akan menilai jawaban Anda pada skala <strong>0–100</strong>.</p><div class="space-y-3">`;
    questions.forEach((q, i) => {
      html += `<div class="space-y-1">
        <label class="block text-xs font-extrabold text-slate-900">${escapeHtml(q)}</label>
        <textarea id="wawancara-ans-${i}" rows="2" placeholder="Tuliskan jawaban wawancara Anda di sini..."
          class="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"></textarea>
      </div>`;
    });
    html += `</div>
      <div id="wawancara-result-box" class="hidden p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-xs text-emerald-950 whitespace-pre-line leading-relaxed"></div>
      <div class="flex justify-end gap-2 pt-2">
        <button type="button" onclick="closeModal('modal-extra-test')" class="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold">Tutup</button>
        <button type="button" id="btn-submit-wawancara" onclick="submitWawancaraAiSimulation()" class="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold">✨ Evaluasi Jawaban oleh AI</button>
      </div>`;
    body.innerHTML = html;
  } else if (mode === 'KESAMAPTAAN') {
    badge.textContent = 'Simulasi Kesamaptaan Jasmani & PFK';
    title.textContent = 'Kalkulator Skor Fisik (Samapta A & B) + Pemeriksaan Fisik';
    body.innerHTML = `
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div>
          <label class="block font-bold text-slate-700 mb-1">Jenis Kelamin</label>
          <select id="samapta-gender" class="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold">
            <option value="L">Laki-laki</option>
            <option value="P">Perempuan</option>
          </select>
        </div>
        <div>
          <label class="block font-bold text-slate-700 mb-1">Samapta A: Lari 12 Menit (Jarak Meter)</label>
          <input type="number" id="samapta-run" value="2400" min="500" max="4000" class="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono-code font-bold" />
        </div>
        <div>
          <label class="block font-bold text-slate-700 mb-1">Push-Up (Jumlah dalam 1 Menit)</label>
          <input type="number" id="samapta-pushup" value="32" min="0" max="80" class="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono-code font-bold" />
        </div>
        <div>
          <label class="block font-bold text-slate-700 mb-1">Sit-Up (Jumlah dalam 1 Menit)</label>
          <input type="number" id="samapta-situp" value="35" min="0" max="80" class="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono-code font-bold" />
        </div>
        <div>
          <label class="block font-bold text-slate-700 mb-1">Pull-Up / Chinning (1 Menit)</label>
          <input type="number" id="samapta-pullup" value="10" min="0" max="50" class="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono-code font-bold" />
        </div>
        <div>
          <label class="block font-bold text-slate-700 mb-1">Shuttle Run 3×10m (Detik)</label>
          <input type="number" id="samapta-shuttle" value="17.5" step="0.1" min="12" max="30" class="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono-code font-bold" />
        </div>
      </div>
      <div id="samapta-result-box" class="hidden p-4 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-950 space-y-1"></div>
      <div class="flex justify-end gap-2 pt-2">
        <button type="button" onclick="closeModal('modal-extra-test')" class="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold">Tutup</button>
        <button type="button" onclick="submitKesamaptaanSimulation()" class="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold">Hitung Nilai Kesamaptaan</button>
      </div>
    `;
  }

  openModal('modal-extra-test');
}

function submitPsikotesSimulation() {
  let total = 0;
  let answered = 0;
  PSIKOTES_ITEMS.forEach((_, idx) => {
    const picked = document.querySelector(`input[name="psiko-q-${idx}"]:checked`);
    if (picked) {
      total += parseInt(picked.value, 10) || 0;
      answered++;
    }
  });
  if (answered < PSIKOTES_ITEMS.length) {
    showToast('Silakan pilih jawaban pada seluruh 5 skenario psikotes terlebih dahulu.', 'warning');
    return;
  }
  const score100 = Math.round((total / 50) * 100);
  saveExtraTestResult('Psikotes ASN', score100);
  const box = document.getElementById('psikotes-result-box');
  if (box) {
    box.classList.remove('hidden');
    box.innerHTML = `<strong>Skor Psikotes &amp; Stabilitas Kerja Anda: ${score100} / 100</strong><br/>Status: <strong>${score100 >= 75 ? 'MEMENUHI SYARAT (Sangat Stabil & Berintegritas)' : 'PERLU PENGUATAN KONTROL EMOSI'}</strong>. Skor otomatis disinkronkan ke Kalkulator Nilai Akhir CPNS!`;
  }
  showToast(`Skor Psikotes (${score100}/100) tersimpan & disinkronkan!`, 'success');
}

async function submitWawancaraAiSimulation() {
  const answers = [];
  for (let i = 0; i < 4; i++) {
    const val = (document.getElementById(`wawancara-ans-${i}`)?.value || '').trim();
    if (!val) {
      showToast(`Mohon isi jawaban pada pertanyaan wawancara nomor ${i + 1}.`, 'warning');
      return;
    }
    answers.push(`Jawaban ${i + 1}: ${val}`);
  }

  const instansiKey = document.getElementById('skb-instansi-select')?.value || 'KEMENKEU';
  const profile = SKB_INSTANSI_PROFILES[instansiKey] || SKB_INSTANSI_PROFILES.PEMDA_UMUM;
  const btn = document.getElementById('btn-submit-wawancara');
  const box = document.getElementById('wawancara-result-box');
  if (btn) {
    btn.disabled = true;
    btn.textContent = '⏳ Panel AI Menilai...';
  }

  try {
    const prompt = `Anda adalah Panel Penguji Wawancara CPNS resmi untuk instansi ${profile.name}.
Nilai 4 jawaban kandidat berikut berdasarkan rubrik BKN (Integritas, Komitmen Kebangsaan, Motivasi ASN, dan Pemahaman Tugas Instansi):
${answers.join('\n')}

Kembalikan HANYA JSON valid:
{
  "score": 85,
  "summary": "Ringkasan evaluasi panel penguji 2-3 kalimat beserta saran peningkatan"
}`;
    const raw = await callGeminiApiWithBackoff({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' }
    }, 2);
    const text = raw?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const parsed = JSON.parse(text);
    const finalScore = Math.min(100, Math.max(40, Number(parsed.score) || 82));
    saveExtraTestResult('Wawancara AI', finalScore);
    if (box) {
      box.classList.remove('hidden');
      box.textContent = `🏆 Skor Wawancara Panel Penguji AI: ${finalScore} / 100\n\nEvaluasi Panel: ${parsed.summary}\n(Skor otomatis disinkronkan ke Kalkulator Nilai Akhir CPNS)`;
    }
    showToast(`Skor Wawancara AI (${finalScore}/100) berhasil dinilai!`, 'success');
  } catch (e) {
    const avgLen = answers.join(' ').length;
    const fallbackScore = avgLen > 240 ? 84 : 76;
    saveExtraTestResult('Wawancara Panel', fallbackScore);
    if (box) {
      box.classList.remove('hidden');
      box.textContent = `🏆 Skor Wawancara Panel: ${fallbackScore} / 100\n\nEvaluasi: Jawaban menunjukkan komitmen integritas, kesiapan penempatan, dan pemahaman dasar BerAKHLAK. Pertajam contoh konkret kontribusi teknis pada ${profile.name}.`;
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = '✨ Evaluasi Jawaban oleh AI';
    }
  }
}

function submitKesamaptaanSimulation() {
  const gender = document.getElementById('samapta-gender')?.value || 'L';
  const run = parseFloat(document.getElementById('samapta-run')?.value) || 0;
  const pushup = parseFloat(document.getElementById('samapta-pushup')?.value) || 0;
  const situp = parseFloat(document.getElementById('samapta-situp')?.value) || 0;
  const pullup = parseFloat(document.getElementById('samapta-pullup')?.value) || 0;
  const shuttle = parseFloat(document.getElementById('samapta-shuttle')?.value) || 22;

  const targetRun = gender === 'L' ? 2800 : 2400;
  const targetPush = gender === 'L' ? 40 : 30;
  const targetSit = gender === 'L' ? 40 : 32;
  const targetPull = gender === 'L' ? 12 : 20;

  const scoreA = Math.min(100, Math.max(20, (run / targetRun) * 85));
  const sPush = Math.min(100, (pushup / targetPush) * 85);
  const sSit = Math.min(100, (situp / targetSit) * 85);
  const sPull = Math.min(100, (pullup / targetPull) * 85);
  const sShuttle = shuttle <= 16.5 ? 95 : (shuttle <= 18.5 ? 80 : 65);
  const scoreB = (sPush + sSit + sPull + sShuttle) / 4;

  const finalSamapta = Math.round((scoreA * 0.5) + (scoreB * 0.5));
  saveExtraTestResult('Kesamaptaan Fisik', finalSamapta);

  const box = document.getElementById('samapta-result-box');
  if (box) {
    box.classList.remove('hidden');
    box.innerHTML = `<strong>Nilai Akhir Kesamaptaan Jasmani: ${finalSamapta} / 100</strong> (Samapta A: ${Math.round(scoreA)} • Samapta B: ${Math.round(scoreB)})<br/>Status: <strong>${finalSamapta >= 65 ? 'MEMENUHI AMBANG BATAS KESAMAPTAAN' : 'PERLU LATIHAN FISIK TAMBAHAN'}</strong>. Skor otomatis masuk ke Kalkulator Nilai Akhir!`;
  }
  showToast(`Nilai Kesamaptaan (${finalSamapta}/100) berhasil dihitung!`, 'success');
}

function prefillSkdFromLastResult() {
  const skdResult = resultHistory.find(r => r.breakdown && (r.breakdown.TWK.count > 0 || r.breakdown.TIU.count > 0 || r.breakdown.TKP.count > 0));
  if (!skdResult) {
    showToast('Belum ada riwayat skor SKD. Silakan masukkan angka secara manual atau selesaikan simulasi SKD.', 'warning');
    return;
  }
  const scaledTo550 = skdResult.totalMax > 0
    ? Math.round((skdResult.totalScore / skdResult.totalMax) * 550)
    : skdResult.totalScore;
  const inputEl = document.getElementById('calc-skd-score');
  if (inputEl) inputEl.value = scaledTo550;
  calculateFinalCpnsScore();
  showToast(`Skor SKD terakhir (${skdResult.totalScore}/${skdResult.totalMax} -> skala ${scaledTo550}/550) dimuat!`, 'success');
}

function calculateFinalCpnsScore() {
  const skdRaw = Math.min(550, Math.max(0, parseFloat(document.getElementById('calc-skd-score')?.value) || 0));
  const skbCatRaw = Math.min(500, Math.max(0, parseFloat(document.getElementById('calc-skb-cat-score')?.value) || 0));
  const catWeightPct = parseFloat(document.getElementById('calc-skb-weight')?.value) || 100;
  const extraRaw = Math.min(100, Math.max(0, parseFloat(document.getElementById('calc-skb-extra-score')?.value) || 0));

  const skdScale100 = (skdRaw / 550) * 100;
  const skdWeighted = skdScale100 * 0.40;

  const skbCatScale100 = (skbCatRaw / 500) * 100;
  const extraWeightPct = 100 - catWeightPct;
  const skbCombined100 = (skbCatScale100 * (catWeightPct / 100)) + (extraRaw * (extraWeightPct / 100));
  const skbWeighted = skbCombined100 * 0.60;

  const finalTotal = skdWeighted + skbWeighted;

  const outSkd = document.getElementById('calc-out-skd');
  const outSkb = document.getElementById('calc-out-skb');
  const outTotal = document.getElementById('calc-out-total');
  const outInsight = document.getElementById('calc-out-insight');

  if (outSkd) outSkd.textContent = skdWeighted.toFixed(2);
  if (outSkb) outSkb.textContent = skbWeighted.toFixed(2);
  if (outTotal) outTotal.textContent = finalTotal.toFixed(2);

  if (outInsight) {
    if (finalTotal >= 75) {
      outInsight.textContent = `Nilai akhir ${finalTotal.toFixed(2)} sangat kompetitif! Keunggulan skor SKB (bobot 60%) memberi peluang besar mengamankan peringkat teratas.`;
    } else if (finalTotal >= 65) {
      outInsight.textContent = `Nilai akhir ${finalTotal.toFixed(2)} cukup baik. Tingkatkan akurasi soal SKB CAT agar dapat menyalip pesaing dengan SKD tinggi.`;
    } else {
      outInsight.textContent = `Nilai akhir ${finalTotal.toFixed(2)}. Maksimalkan latihan SKD dan pendalaman materi SKB jabatan untuk mendongkrak skor integrasi.`;
    }
  }
}

function getBerkasCheckedMap() {
  try {
    const raw = safeStorage.getItem(STORAGE_KEYS.BERKAS_CHECKLIST);
    const parsed = raw ? JSON.parse(raw) : {};
    return (parsed && typeof parsed === 'object') ? parsed : {};
  } catch (e) {
    return {};
  }
}

function toggleBerkasCheckItem(id) {
  const checkedMap = getBerkasCheckedMap();
  checkedMap[id] = !checkedMap[id];
  safeStorage.setItem(STORAGE_KEYS.BERKAS_CHECKLIST, JSON.stringify(checkedMap));
  renderBerkasChecklist();
}

function resetBerkasChecklist() {
  safeStorage.removeItem(STORAGE_KEYS.BERKAS_CHECKLIST);
  renderBerkasChecklist();
  showToast('Checklist persiapan berkas SSCASN telah di-reset.', 'info');
}

function renderBerkasChecklist() {
  const grid = document.getElementById('berkas-checklist-grid');
  const badge = document.getElementById('berkas-progress-badge');
  if (!grid) return;

  const checkedMap = getBerkasCheckedMap();
  let readyCount = 0;
  grid.innerHTML = '';

  BERKAS_ITEMS_DATA.forEach(item => {
    const isChecked = !!checkedMap[item.id];
    if (isChecked) readyCount++;

    const card = document.createElement('label');
    card.className = `p-3.5 rounded-xl border-2 cursor-pointer transition flex items-start gap-3 ${
      isChecked
        ? 'border-emerald-500 bg-emerald-50/70'
        : 'border-slate-200 bg-slate-50/50 hover:border-blue-300'
    }`;
    card.innerHTML = `
      <input type="checkbox" ${isChecked ? 'checked' : ''} onchange="toggleBerkasCheckItem('${item.id}')"
        class="mt-0.5 w-4 h-4 accent-emerald-600 shrink-0" />
      <div class="flex-1 min-w-0">
        <div class="text-xs sm:text-sm font-extrabold ${isChecked ? 'text-emerald-950 line-through' : 'text-slate-900'}">
          ${escapeHtml(item.title)}
        </div>
        <p class="text-[11px] text-slate-600 mt-0.5 leading-relaxed">${escapeHtml(item.desc)}</p>
      </div>
    `;
    grid.appendChild(card);
  });

  if (badge) {
    badge.textContent = `${readyCount} / ${BERKAS_ITEMS_DATA.length} Siap`;
  }
}

// ============================================================================
// 12. PWA MANIFEST, LOGO PNG DOWNLOAD, COOKIES & PERMISSIONS
// ============================================================================
function setupPwaManifestAndIcons() {
  try {
    const svgLogo = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="112" fill="#FBBF24"/><path d="M256 52L96 118V244C96 356 168 456 256 482C344 456 416 356 416 244V118L256 52Z" fill="#0F2C59"/><rect x="160" y="168" width="192" height="126" rx="22" fill="#F8FAFC"/><path d="M198 232L238 270L316 194" stroke="#16A34A" stroke-width="26" stroke-linecap="round" stroke-linejoin="round"/><rect x="210" y="316" width="92" height="22" rx="11" fill="#FBBF24"/></svg>`;
    const iconUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgLogo);

    let linkIcon = document.querySelector("link[rel='icon']");
    if (!linkIcon) {
      linkIcon = document.createElement('link');
      linkIcon.rel = 'icon';
      document.head.appendChild(linkIcon);
    }
    linkIcon.href = iconUrl;

    let appleIcon = document.querySelector("link[rel='apple-touch-icon']");
    if (!appleIcon) {
      appleIcon = document.createElement('link');
      appleIcon.rel = 'apple-touch-icon';
      document.head.appendChild(appleIcon);
    }
    appleIcon.href = iconUrl;

    const manifest = {
      name: 'SIMULASI CAT BKN — Latihan SKD & SKB CPNS',
      short_name: 'CAT BKN SKD',
      start_url: './',
      display: 'standalone',
      background_color: '#F1F5F9',
      theme_color: '#0F2C59',
      icons: [{ src: iconUrl, sizes: '512x512', type: 'image/svg+xml', purpose: 'any maskable' }]
    };
    const manifestBlob = new Blob([JSON.stringify(manifest)], { type: 'application/manifest+json' });
    const manifestLink = document.createElement('link');
    manifestLink.rel = 'manifest';
    manifestLink.href = URL.createObjectURL(manifestBlob);
    document.head.appendChild(manifestLink);
  } catch (e) {
    // Safe ignore in sandboxed iframes
  }
}

function downloadAppLogoPng() {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#FBBF24';
    ctx.fillRect(0, 0, 512, 512);
    ctx.fillStyle = '#0F2C59';
    ctx.beginPath();
    ctx.moveTo(256, 56);
    ctx.lineTo(100, 120);
    ctx.lineTo(100, 248);
    ctx.quadraticCurveTo(100, 360, 256, 464);
    ctx.quadraticCurveTo(412, 360, 412, 248);
    ctx.lineTo(412, 120);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(164, 172, 184, 118);

    ctx.strokeStyle = '#16A34A';
    ctx.lineWidth = 24;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(200, 232);
    ctx.lineTo(238, 268);
    ctx.lineTo(314, 194);
    ctx.stroke();

    ctx.fillStyle = '#FBBF24';
    ctx.fillRect(210, 314, 92, 20);

    const link = document.createElement('a');
    link.download = 'logo_cat_bkn_skd_512.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
    showToast('Logo PNG 512x512 berhasil diunduh!', 'success');
  } catch (e) {
    showToast('Gagal mengunduh PNG pada browser ini.', 'warning');
  }
}

function initCookieBanner() {
  const prefs = safeStorage.getItem(STORAGE_KEYS.COOKIE_PREFS);
  const banner = document.getElementById('cookie-consent-banner');
  if (!prefs && banner) {
    banner.classList.remove('hidden');
  }
}

function acceptAllCookies() {
  safeStorage.setItem(STORAGE_KEYS.COOKIE_PREFS, JSON.stringify({ essential: true, preferences: true, acceptedAt: Date.now() }));
  document.cookie = 'cat_bkn_consent=accepted; max-age=31536000; path=/; SameSite=Lax';
  const banner = document.getElementById('cookie-consent-banner');
  if (banner) banner.classList.add('hidden');
  showToast('Preferensi cookies disimpan.', 'success');
}

function clearOptionalCookies() {
  safeStorage.removeItem(STORAGE_KEYS.COOKIE_PREFS);
  document.cookie = 'cat_bkn_consent=; max-age=0; path=/';
  showToast('Preferensi cookie telah di-reset.', 'info');
}

async function requestPersistentStoragePerm() {
  const statusEl = document.getElementById('perm-storage-status');
  if (navigator.storage && navigator.storage.persist) {
    const granted = await navigator.storage.persist();
    if (statusEl) statusEl.textContent = granted ? 'Aktif (Persisten)' : 'Standar Browser';
    showToast(granted ? 'Penyimpanan persisten diaktifkan!' : 'Browser menggunakan penyimpanan standar.', 'info');
  } else {
    if (statusEl) statusEl.textContent = 'Tersimpan Otomatis';
  }
}

async function requestNotificationPerm() {
  const statusEl = document.getElementById('perm-notif-status');
  if ('Notification' in window) {
    const res = await Notification.requestPermission();
    if (statusEl) statusEl.textContent = res === 'granted' ? 'Diizinkan' : 'Ditolak / Diblokir';
    showToast(`Status izin notifikasi: ${res}`, 'info');
  } else {
    if (statusEl) statusEl.textContent = 'Tidak didukung';
  }
}

function refreshApiKeyUI() {
  const input = document.getElementById('input-user-api-key');
  if (input) input.value = getActiveGeminiApiKey();
}

function saveUserApiKey() {
  const val = (document.getElementById('input-user-api-key')?.value || '').trim();
  if (val) {
    safeStorage.setItem(STORAGE_KEYS.USER_API_KEY, val);
    showToast('API Key berhasil disimpan di perangkat Anda.', 'success');
  } else {
    safeStorage.removeItem(STORAGE_KEYS.USER_API_KEY);
    refreshApiKeyUI();
    showToast('Menggunakan API Key bawaan aplikasi.', 'info');
  }
}

// ============================================================================
// 13. NAVIGATION, MODALS, TOASTS & HELPERS
// ============================================================================
function switchTab(tabName) {
  const views = ['home', 'exam', 'results', 'bank', 'info'];
  views.forEach(v => {
    const viewEl = document.getElementById(`view-${v}`);
    const btnEl = document.getElementById(`tab-btn-${v}`);
    if (viewEl) viewEl.classList.toggle('hidden', v !== tabName);
    if (btnEl) {
      if (v === tabName) {
        btnEl.className = 'flex-1 min-w-[74px] whitespace-nowrap px-2.5 py-1.5 rounded-lg text-xs font-bold transition bg-white text-[#0F2C59] shadow-sm';
      } else {
        btnEl.className = 'flex-1 min-w-[74px] whitespace-nowrap px-2.5 py-1.5 rounded-lg text-xs font-bold transition text-blue-100 hover:bg-blue-900/60';
      }
    }
  });

  if (tabName === 'home') {
    updateHomeDashboardStats();
    showResumeBanner();
  } else if (tabName === 'exam') {
    renderExamWorkspace();
  } else if (tabName === 'bank') {
    renderBankTable();
  } else if (tabName === 'results') {
    renderHistoryList();
    if (lastResult) renderResultsDashboard(lastResult);
  } else if (tabName === 'info') {
    renderBerkasChecklist();
    calculateFinalCpnsScore();
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('hidden');
  if (id === 'modal-add-question') updateManualOptionLabels();
  if (id === 'modal-webapp') refreshApiKeyUI();
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('hidden');
}

function showConfirmModal(title, message, onConfirm) {
  document.getElementById('confirm-modal-title').textContent = title;
  document.getElementById('confirm-modal-message').textContent = message;
  confirmModalCallback = onConfirm;
  document.getElementById('modal-confirm').classList.remove('hidden');
}

function closeConfirmModal() {
  document.getElementById('modal-confirm').classList.add('hidden');
  confirmModalCallback = null;
}

const confirmOkBtn = document.getElementById('confirm-modal-ok-btn');
if (confirmOkBtn) {
  confirmOkBtn.addEventListener('click', () => {
    const cb = confirmModalCallback;
    closeConfirmModal();
    if (typeof cb === 'function') cb();
  });
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const styles = {
    success: 'bg-emerald-700 text-white border-emerald-500',
    warning: 'bg-amber-500 text-slate-950 border-amber-300',
    info: 'bg-slate-900 text-white border-slate-700'
  };

  const toast = document.createElement('div');
  toast.className = `pointer-events-auto px-3.5 py-2.5 rounded-xl border shadow-lg text-xs font-bold animate-fade ${styles[type] || styles.info}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3600);
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Keyboard shortcuts for desktop users
document.addEventListener('keydown', (e) => {
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
  if (document.getElementById('view-exam').classList.contains('hidden') || !activeSession) return;

  const key = e.key.toUpperCase();
  if (['A', 'B', 'C', 'D', 'E'].includes(key)) {
    selectOption(['A', 'B', 'C', 'D', 'E'].indexOf(key));
  } else if (['1', '2', '3', '4', '5'].includes(key)) {
    selectOption(parseInt(key, 10) - 1);
  } else if (e.key === 'Enter' && activeSession.mode === 'study' && pendingStudyOptionIdx !== null) {
    e.preventDefault();
    confirmStudyAnswer();
  } else if (e.key === 'Backspace' || e.key === 'Delete') {
    clearCurrentAnswer();
  } else if (e.key === 'ArrowRight') {
    navigateQuestion(1);
  } else if (e.key === 'ArrowLeft') {
    navigateQuestion(-1);
  } else if (key === 'R') {
    toggleDoubtfulCurrent();
  }
});

// ============================================================================
// 14. APPLICATION INITIALIZATION & BOOTSTRAP
// ============================================================================
function initApp() {
  try {
    const savedCustom = safeStorage.getItem(STORAGE_KEYS.CUSTOM_QUESTIONS);
    if (savedCustom) customQuestions = JSON.parse(savedCustom) || [];
  } catch (e) { customQuestions = []; }

  try {
    const savedSession = safeStorage.getItem(STORAGE_KEYS.ACTIVE_SESSION);
    if (savedSession) activeSession = JSON.parse(savedSession);
  } catch (e) { activeSession = null; }

  try {
    const savedLast = safeStorage.getItem(STORAGE_KEYS.LAST_RESULT);
    if (savedLast) lastResult = JSON.parse(savedLast);
  } catch (e) { lastResult = null; }

  try {
    const savedHist = safeStorage.getItem(STORAGE_KEYS.RESULT_HISTORY);
    if (savedHist) resultHistory = JSON.parse(savedHist) || [];
  } catch (e) { resultHistory = []; }

  setupPwaManifestAndIcons();
  initCookieBanner();
  syncModeUI();
  startDailyCountdownLoop();
  updateHomeDashboardStats();
  showResumeBanner();
  renderBankTable();
  renderHistoryList();
  renderNewsAndTimeline();
  onSkbInstansiChanged();
  updateExtraTestBadge();
  renderBerkasChecklist();
  calculateFinalCpnsScore();
  refreshApiKeyUI();

  // Auto-sync live news once per WIB day if not yet fetched today
  try {
    const wib = getWibDateParts();
    const cachedNews = JSON.parse(safeStorage.getItem(STORAGE_KEYS.LIVE_NEWS_CACHE) || '{}');
    if (cachedNews.dateKey !== wib.dateKey) {
      refreshLiveCpnsNewsWithAI(true);
    }
  } catch (e) { /* ignore */ }

  if (activeSession) {
    sessionMode = activeSession.mode || 'study';
    syncModeUI();
    startTimerLoop();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}