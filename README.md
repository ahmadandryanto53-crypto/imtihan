# إمتحان (Imtihan) - Sistem Ujian Online Terintegrasi (CBT)

Aplikasi CBT (Computer-Based Test) berbasis web berstandar profesional untuk jenjang SD (kelas 1–6), SMP (kelas 7–9), dan SMA (kelas 10–12).

## 1. Identitas & Desain
- **Nama Aplikasi**: إمتحان (Imtihan)
- **Tipografi**: Konsisten menggunakan Google Fonts `Courier Prime`.
- **Warna**: Biru langit (`sky-700`), latar putih bersih (`bg-white`), border abu-abu muda (`border-slate-200`), dan aksen merah hanya untuk peringatan/pelanggaran.
- **Kondisi Awal**: Seluruh tabel, data akun, soal, ujian, dan riwayat dalam kondisi kosong (empty state murni tanpa data tiruan/dummy).

## 2. Struktur Pengguna & Hak Akses
- **Administrator**:
  - Email bootstrapped admin: `ahmadandryanto53@guru.sd.belajar.id`
  - Mengelola data siswa, guru, rombel/kelas, mata pelajaran, bank soal, dan jadwal ujian secara global.
  - Memantau ujian live realtime dan melihat rekapitulasi semua nilai.
  - Memeriksa Audit Log keamanan sistem.
- **Guru Pengampu**:
  - Mengelola Bank Soal (Pilihan Ganda 1 jawaban, Multi-choice, Benar/Salah, Isian Singkat, dan Esai).
  - Mengimpor soal via file CSV/XLSX.
  - Menjadwalkan ujian, mengelola token ujian, acak soal & opsi jawaban.
  - Memantau pengerjaan siswa secara realtime.
  - Menilai soal esai dengan rubrik dan memberikan skor akhir.
  - Mengekspor laporan nilai ke format Excel.
- **Siswa Peserta**:
  - Mengakses ujian yang aktif dan sesuai dengan kelas/jenjang.
  - Memasukkan token ujian sebelum memulai.
  - Pengerjaan dengan mode Fullscreen wajib.
  - Autosave otomatis ke Cloud Firestore.
  - Deteksi pelanggaran otomatis (berpindah tab, keluar fullscreen, hilang fokus):
    - Pelanggaran ke-1: Peringatan keras di layar.
    - Pelanggaran ke-2: Ujian otomatis dihentikan dan jawaban terakhir langsung dikumpulkan.
  - Countdown timer tersinkronisasi server.

## 3. Teknologi & Backend
- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS
- **Database & Auth**: Google Cloud Firestore & Firebase Authentication
- **Rules**: Firestore Security Rules ABAC + Least Privilege
- **Spreadsheet**: Export/Import CSV dan Excel

## 4. Cara Menjalankan
1. Instal dependensi:
   ```bash
   npm install
   ```
2. Jalankan server pengembangan lokal:
   ```bash
   npm run dev
   ```
3. Buka browser pada alamat `http://localhost:3000`.
4. Masuk pertama kali menggunakan Akun Google `ahmadandryanto53@guru.sd.belajar.id` untuk langsung mengaktifkan hak Administrator.
