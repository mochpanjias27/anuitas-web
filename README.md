# Anuitas Lab

Website pembelajaran interaktif anuitas berbasis studi kasus untuk mata kuliah **Matematika Keuangan**, Departemen Matematika FMIPA Universitas Padjadjaran.

Mahasiswa belajar mandiri lewat alur: **Situasi → Tebakan awal → Lintasan waktu 3D → Mesin Hitung → Keputusan & refleksi → Eksperimen "bagaimana jika"**.

## Isi

| Halaman | Alamat | Keterangan |
|---|---|---|
| Beranda | `#/` | Hero 3D (koin meluncur ke t = 0 dan menumpuk menjadi PV), katalog kasus dengan progres |
| Studi Kasus 01–06 | `#/kasus/1` … `#/kasus/6` | PV anuitas biasa, arus kas tidak sama, mencari angsuran, dana pensiun, anuitas di muka, anuitas ditunda |
| Ringkasan Rumus | `#/rumus` | Kartu rumus + penurunan PV dari deret geometri langkah demi langkah |
| Uji Pemahaman | `#/latihan` | 10 soal acak, pembahasan sesuai angka soal, deteksi kesalahan umum, skor per topik |

Kasus 07–10 (FV, FV ditunda, asuransi pendidikan, brosur kredit) tercantum di katalog sebagai "Segera".

Tidak ada login maupun backend. Nama, NPM, progres kasus, dan riwayat skor disimpan di `localStorage` browser mahasiswa, hanya untuk refleksi.

## Menjalankan secara lokal

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # hasil di dist/
```

## Deploy ke Vercel

1. Buka [vercel.com/new](https://vercel.com/new) dan impor repo `anuitas-web`.
2. Vercel mendeteksi **Vite** secara otomatis (Build Command `npm run build`, Output Directory `dist`). Tidak perlu variabel lingkungan.
3. Klik **Deploy**. Setiap push ke `main` akan men-deploy ulang otomatis.

Routing memakai hash (`#/kasus/1`), jadi tidak perlu aturan rewrite.

## Struktur

```
src/
  main.js            router & identitas mahasiswa
  styles.css         tema frost-chrome (putih-es, krom, hijau volt, sian)
  data/cases.js      definisi studi kasus (narasi, parameter, tahap Mesin Hitung)
  data/quiz.js       generator soal Uji Pemahaman
  lib/finance.js     a_n|, ä_n|, s_n|, PV arus kas, pencarian titik balik bunga
  three/             adegan 3D (Three.js): hero, lintasan waktu, material bersama
  views/             halaman beranda, kasus, rumus, latihan
public/logo-unpad.png
```

## Menambah atau mengubah studi kasus

Semua kasus ada di `src/data/cases.js`. Setiap kasus berupa satu objek dengan:

- `params` dan `defaults`: slider eksperimen dan nilai awal (`j` = bunga nominal per tahun dalam %, `conv` = banyak konversi per tahun);
- `scenarios` (opsional): beberapa varian, misalnya Kasus 1–3 dana pensiun;
- `story`, `options`, `guess`: teks situasi dan tebakan awal;
- `streams`: arus kas tiap pilihan (`annuityFlows` untuk anuitas, `{t, amt}` untuk arus kas bebas), dengan `timeline: true` untuk yang ditampilkan di lintasan 3D;
- `steps`: tahap Mesin Hitung (pilihan ganda atau isian angka dengan toleransi `rel`);
- `conclusion`: teks refleksi setelah mesin selesai.

Angka di narasi dihitung dari parameter, jadi teks selalu cocok dengan hasil perhitungan.
