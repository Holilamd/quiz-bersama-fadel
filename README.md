# AsahOtak - Bank Latihan Soal SD (Kelas 1–4)

Platform latihan soal mandiri untuk siswa Sekolah Dasar kelas 1 sampai 4 dengan mata pelajaran Matematika, IPAS, Bahasa Indonesia, dan Tematik & PPKn.

Dibuat menggunakan **Astro**, **React**, dan **Tailwind CSS** tanpa ketergantungan database backend. Seluruh bank soal dikelola secara lokal menggunakan Astro Content Collections dalam format JSON.

---

## Fitur Utama

1. **Format CBT Sederhana**: Tampilan lembar soal bersih, kontras tinggi, dan ramah anak.
2. **Bank Soal & Varian Melimpah**: Puluhan variasi soal terbagi dalam tingkat Mudah, Sedang, dan Tantangan.
3. **Sesi Tersimpan Otomatis**: Progres pengerjaan, jawaban yang sudah dipilih, dan sisa waktu tersimpan di browser (`localStorage`). Merefresh halaman (`F5`) tidak akan menghilangkan jawaban atau mengubah soal.
4. **Piagam Penghargaan Resmi (Syarat Nilai 90+)**:
   - Sertifikat penghargaan terkunci secara otomatis jika nilai di bawah 90.
   - Siswa yang meraih nilai **minimal 90 ke atas** berhak memasukkan nama dan menerbitkan Piagam Penghargaan bertanda tangan resmi yang siap dicetak atau disimpan ke PDF.
5. **Kunci Jawaban & Pembahasan**: Langkah penyelesaian dapat dipelajari secara mendalam setelah kuis disubmit.

---

## Menjalankan Aplikasi

```bash
cd C:\My-Document\App\leaning-code\karya\AsahOtak

# Jalankan server lokal
npm run dev -- --host
```
Akses di browser: [http://localhost:4321/](http://localhost:4321/)
