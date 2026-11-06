import React from 'react';
import { Printer, X, Award, CheckCircle } from 'lucide-react';

interface CertificateModalProps {
  studentName: string;
  quizTitle: string;
  categoryName: string;
  level: string;
  score: number;
  correctCount: number;
  totalQuestions: number;
  onClose: () => void;
}

export const CertificateModal: React.FC<CertificateModalProps> = ({
  studentName,
  quizTitle,
  categoryName,
  level,
  score,
  correctCount,
  totalQuestions,
  onClose,
}) => {
  const currentDate = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const getPredicate = (scoreVal: number) => {
    if (scoreVal === 100) return { text: 'NILAI SEMPURNA (A+)', desc: 'Menjawab seluruh butir soal dengan benar tanpa kesalahan' };
    return { text: 'PREDIKAT ISTIMEWA (A)', desc: 'Menunjukkan ketelitian dan penguasaan materi di atas batas minimal kelulusan (90+)' };
  };

  const predicate = getPredicate(score);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto print:p-0 print:bg-white print:static">
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-certificate, #printable-certificate * {
            visibility: visible;
          }
          #printable-certificate {
            position: fixed;
            left: 0;
            top: 0;
            width: 100vw;
            height: 100vh;
            margin: 0;
            padding: 2.5rem;
            box-shadow: none !important;
            border-width: 4px !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="relative max-w-3xl w-full my-6 print:m-0 print:max-w-none">
        {/* Tombol Aksi di Luar Sertifikat */}
        <div className="no-print flex items-center justify-between mb-3 bg-white/90 p-3 rounded-xl border border-slate-200 shadow-sm backdrop-blur">
          <div className="flex items-center gap-2 text-slate-700 text-xs font-semibold">
            <Award className="w-4 h-4 text-amber-600" />
            <span>Sertifikat Siap Dicetak atau Disimpan sebagai PDF</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-sm transition"
            >
              <Printer className="w-3.5 h-3.5" />
              Cetak / Simpan PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
              title="Tutup"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ============================================================== */}
        {/* AREA SERTIFIKAT RESMI (PRINTABLE) */}
        {/* ============================================================== */}
        <div
          id="printable-certificate"
          className="bg-white rounded-xl border-8 border-double border-slate-800 p-8 sm:p-12 shadow-2xl relative overflow-hidden text-center text-slate-800"
          style={{ minHeight: '520px' }}
        >
          {/* Garis Aksen Sudut Tradisional */}
          <div className="absolute top-3 left-3 w-8 h-8 border-t-2 border-l-2 border-amber-600 pointer-events-none" />
          <div className="absolute top-3 right-3 w-8 h-8 border-t-2 border-r-2 border-amber-600 pointer-events-none" />
          <div className="absolute bottom-3 left-3 w-8 h-8 border-b-2 border-l-2 border-amber-600 pointer-events-none" />
          <div className="absolute bottom-3 right-3 w-8 h-8 border-b-2 border-r-2 border-amber-600 pointer-events-none" />

          {/* Header Lembaga / Aplikasi */}
          <div className="mb-4">
            <div className="inline-flex items-center justify-center gap-2">
              <span className="w-6 h-6 rounded bg-slate-900 text-white font-bold text-xs flex items-center justify-center">
                AO
              </span>
              <span className="text-xs font-bold tracking-widest uppercase text-slate-600">
                ASAH OTAK &bull; BANK SOAL DASAR INDONESIA
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-slate-900 tracking-wider mt-2 uppercase">
              Piagam Penghargaan
            </h2>
            <p className="text-xs font-medium text-slate-500 tracking-wide mt-0.5">
              Nomor: AO/SD/{new Date().getFullYear()}/{Math.floor(1000 + Math.random() * 9000)}
            </p>
          </div>

          <div className="my-3">
            <p className="text-xs text-slate-600 italic">Diberikan dengan penuh apresiasi kepada:</p>
            <div className="mt-2 mb-1">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-serif tracking-tight border-b-2 border-slate-800 pb-1 inline-block px-6">
                {studentName || 'Siswa Berprestasi'}
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-700 mt-2">
              Jenjang: {level}
            </p>
          </div>

          {/* Keterangan Capaian */}
          <div className="max-w-xl mx-auto my-4 text-xs sm:text-sm text-slate-700 leading-relaxed">
            <p>
              Telah berhasil menyelesaikan rangkaian evaluasi latihan mandiri pada topik materi:
            </p>
            <p className="font-bold text-slate-900 text-sm sm:text-base mt-1">
              "{quizTitle}" &bull; {categoryName}
            </p>
          </div>

          {/* Nilai & Predikat Box */}
          <div className="my-5 inline-flex flex-col sm:flex-row items-center gap-4 bg-slate-50 border border-slate-300 rounded-lg px-6 py-3">
            <div className="text-center sm:text-left">
              <span className="text-[11px] font-bold text-slate-500 uppercase block">Nilai Akhir</span>
              <span className="text-2xl font-extrabold text-slate-900">
                {score} <span className="text-sm font-normal text-slate-500">/ 100</span>
              </span>
            </div>
            <div className="hidden sm:block w-px h-8 bg-slate-300" />
            <div className="text-center sm:text-left">
              <span className="text-[11px] font-bold text-slate-500 uppercase block">Capaian & Predikat</span>
              <span className="text-sm font-bold text-emerald-800 block">
                {predicate.text}
              </span>
              <span className="text-[11px] text-slate-500">
                ({correctCount} dari {totalQuestions} soal terjawab benar)
              </span>
            </div>
          </div>

          {/* Tanggal & Kolom Tanda Tangan */}
          <div className="mt-8 pt-4 border-t border-slate-200 grid grid-cols-2 gap-4 text-xs">
            <div className="text-center">
              <p className="text-slate-500">Mengetahui,</p>
              <p className="font-semibold text-slate-800">Orang Tua / Wali Murid</p>
              <div className="h-12 flex items-end justify-center">
                <span className="border-b border-dashed border-slate-400 w-36 block" />
              </div>
            </div>

            <div className="text-center">
              <p className="text-slate-500">{currentDate}</p>
              <p className="font-semibold text-slate-800">Tim Evaluasi AsahOtak</p>
              <div className="h-12 flex items-end justify-center">
                <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>TERVERIFIKASI SISTEM</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CertificateModal;

