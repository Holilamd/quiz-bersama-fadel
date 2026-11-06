# AsahOtak - Bank Latihan Soal SD (Kelas 1–4)

Platform latihan soal mandiri untuk siswa Sekolah Dasar kelas 1 sampai 4 dengan mata pelajaran Matematika, IPAS, Bahasa Indonesia, dan Tematik.

Dibuat menggunakan **Astro**, **React**, dan **Tailwind CSS** tanpa ketergantungan database backend. Seluruh bank soal dikelola secara lokal menggunakan Astro Content Collections dalam format JSON.

---

## Fitur Utama

1. **Format CBT Sederhana**: Tampilan lembar soal bersih, kontras tinggi, dan ramah anak.
2. **Sesi Tersimpan Otomatis**: Progres pengerjaan, jawaban yang sudah dipilih, dan sisa waktu tersimpan di browser (`localStorage`). Merefresh halaman (`F5`) tidak akan menghilangkan jawaban atau mengubah soal.
3. **Acak Soal Baru Sesuai Permintaan**: Soal baru dapat diambil melalui tombol ganti paket atau setelah menyelesaikan kuis.
4. **Pilihan Tingkat Kesulitan**: Tersedia opsi tingkat Mudah, Sedang, atau Tantangan.
5. **Kunci Jawaban & Pembahasan**: Setelah kuis dikumpulkan, siswa dan orang tua dapat membaca langkah penyelesaian setiap butir soal.

---

## Struktur Berkas

```text
karya/AsahOtak/
├── src/
│   ├── content/
│   │   ├── config.ts              # Skema validasi data kuis (Zod)
│   │   └── quiz/                  # Bank soal (file JSON)
│   ├── components/
│   │   ├── Header.astro           # Navigasi utama
│   │   ├── Footer.astro           # Keterangan halaman
│   │   ├── CategoryCard.astro     # Kartu mata pelajaran
│   │   ├── QuizCard.astro         # Kartu paket soal
│   │   ├── MathText.tsx           # Parser rumus Matematika & IPA
│   │   └── QuizPlayer.tsx         # Komponen interaktif kuis & pembahasan
│   ├── layouts/
│   │   └── Layout.astro           # Kerangka dasar HTML & CSS
│   ├── pages/
│   │   ├── index.astro            # Halaman utama
│   │   └── quiz/
│   │       ├── [category].astro   # Daftar soal per mata pelajaran
│   │       └── [category]/
│   │           └── [slug].astro   # Lembar pengerjaan kuis
│   └── utils/
│       └── categories.ts          # Data mata pelajaran dan jenjang kelas
├── astro.config.mjs
├── tailwind.config.mjs
└── package.json
```

---

## Menjalankan Aplikasi

```bash
cd karya/AsahOtak

# Jalankan server lokal
npm run dev -- --host

# Build untuk produksi
npm run build
```
Buka di browser: [http://localhost:4321/](http://localhost:4321/)
