import React, { useState, useEffect, useMemo, useRef } from 'react';
import MathText from './MathText';
import CertificateModal from './CertificateModal';
import {
  Clock,
  Trophy,
  Award,
  Users,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Home,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Lock,
} from 'lucide-react';
import {
  type CompetitionRoomConfig,
  type CompetitionParticipant,
  getCompetitionConfig,
  calculateRoomPhase,
  getStoredParticipants,
  saveParticipantResult,
  getSimulatedParticipants,
  DEFAULT_COMPETITION_CONFIG,
} from '../utils/competition';
import type { Quiz, Question, QuestionOption } from '../content/config';

interface CompetitionRoomProps {
  quizzes: { id: string; data: Quiz }[];
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export const CompetitionRoom: React.FC<CompetitionRoomProps> = ({ quizzes }) => {
  const [config, setConfig] = useState<CompetitionRoomConfig>(DEFAULT_COMPETITION_CONFIG);
  const [phase, setPhase] = useState<'LOBBY' | 'EXAM' | 'ANNOUNCEMENT'>('LOBBY');
  const [secondsToStart, setSecondsToStart] = useState<number>(0);
  const [secondsToEnd, setSecondsToEnd] = useState<number>(0);
  const [currentClock, setCurrentClock] = useState<string>('');

  // Identitas Siswa
  const [studentName, setStudentName] = useState<string>('');
  const [studentSchool, setStudentSchool] = useState<string>('');
  const [isRegistered, setIsRegistered] = useState<boolean>(false);

  // CBT State
  const [activeQuestions, setActiveQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<number>>(new Set());
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [examStartTimeMs, setExamStartTimeMs] = useState<number>(0);
  const [timeSpentSeconds, setTimeSpentSeconds] = useState<number>(0);

  // Modals & Certificate
  const [showConfirmSubmitModal, setShowConfirmSubmitModal] = useState<boolean>(false);
  const [showCertificateModal, setShowCertificateModal] = useState<boolean>(false);

  // Active quiz pool
  const activeQuiz = useMemo(() => {
    const found = quizzes.find((q) => q.id === config.quizId);
    return found ? found.data : quizzes[0]?.data;
  }, [quizzes, config.quizId]);

  // Load config & saved participant info
  useEffect(() => {
    const loadedConfig = getCompetitionConfig();
    setConfig(loadedConfig);

    try {
      const savedName = localStorage.getItem('asah_otak_student_name') || '';
      const savedSchool = localStorage.getItem('asah_otak_student_school') || '';
      if (savedName) setStudentName(savedName);
      if (savedSchool) setStudentSchool(savedSchool);
      if (savedName && savedSchool) setIsRegistered(true);
    } catch {}

    // Check submission state in this room
    try {
      const submissionKey = `comp_sub_${loadedConfig.id}`;
      const hasSub = localStorage.getItem(submissionKey);
      if (hasSub) {
        setIsSubmitted(true);
      }
    } catch {}
  }, []);

  // Timer loop tracking real device clock
  useEffect(() => {
    const updatePhase = () => {
      const now = new Date();
      const calc = calculateRoomPhase(config, now);
      setPhase(calc.phase);
      setSecondsToStart(calc.secondsToStart);
      setSecondsToEnd(calc.secondsToEnd);
      setCurrentClock(calc.formattedCurrentTime);

      // Auto-submit if time runs out while in exam
      if (calc.phase === 'ANNOUNCEMENT' && !isSubmitted && activeQuestions.length > 0) {
        handleSubmitExam();
      }
    };

    updatePhase();
    const interval = setInterval(updatePhase, 1000);
    return () => clearInterval(interval);
  }, [config, isSubmitted, activeQuestions]);

  // Initialize questions when room enters EXAM phase
  useEffect(() => {
    if (phase === 'EXAM' && activeQuestions.length === 0 && activeQuiz) {
      const subset = activeQuiz.questions.slice(0, Math.min(config.totalQuestions, activeQuiz.questions.length));
      setActiveQuestions(subset);
      setExamStartTimeMs(Date.now());
    }
  }, [phase, activeQuiz, config.totalQuestions, activeQuestions.length]);

  const formatCountdown = (totalSec: number) => {
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim() || !studentSchool.trim()) return;
    try {
      localStorage.setItem('asah_otak_student_name', studentName.trim());
      localStorage.setItem('asah_otak_student_school', studentSchool.trim());
    } catch {}
    setIsRegistered(true);
  };

  const handleSubmitExam = () => {
    let correct = 0;
    activeQuestions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.correctAnswer) {
        correct++;
      }
    });

    const totalQ = activeQuestions.length || config.totalQuestions || 15;
    const scoreVal = Math.round((correct / totalQ) * 100);
    const spent = examStartTimeMs > 0 ? Math.floor((Date.now() - examStartTimeMs) / 1000) : 1200;
    setTimeSpentSeconds(spent);
    setIsSubmitted(true);
    setShowConfirmSubmitModal(false);

    try {
      localStorage.setItem(`comp_sub_${config.id}`, 'true');
    } catch {}

    const myResult: CompetitionParticipant = {
      id: `self-${Date.now()}`,
      name: studentName.trim() || 'Peserta Anda',
      school: studentSchool.trim() || 'SD Peserta',
      grade: config.level,
      score: scoreVal,
      correctCount: correct,
      totalQuestions: totalQ,
      timeSpentSeconds: spent,
      submittedAt: currentClock || '12:30:00',
      isCurrentUser: true,
    };

    saveParticipantResult(myResult);
  };

  // Compute full leaderboard
  const leaderboard = useMemo(() => {
    const stored = getStoredParticipants();
    const simulated = getSimulatedParticipants(config.totalQuestions);

    // Merge stored participants with simulated ones
    const combined = [...stored, ...simulated.filter((s) => !stored.some((p) => p.name === s.name))];

    // Sort by: 1. Score desc, 2. Time spent asc (faster is better)
    combined.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.timeSpentSeconds - b.timeSpentSeconds;
    });

    return combined;
  }, [config.totalQuestions, isSubmitted]);

  // Current user rank
  const myRank = useMemo(() => {
    const idx = leaderboard.findIndex((p) => p.isCurrentUser || p.name === studentName.trim());
    return idx >= 0 ? idx + 1 : null;
  }, [leaderboard, studentName]);

  const myParticipantData = useMemo(() => {
    return leaderboard.find((p) => p.isCurrentUser || p.name === studentName.trim());
  }, [leaderboard, studentName]);

  // ====================================================
  // VIEW 1: LOBBY (SEBELUM JAM MULAI)
  // ====================================================
  if (phase === 'LOBBY') {
    return (
      <div className="max-w-3xl mx-auto space-y-6 pb-16">
        {/* Header Banner */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 shadow-sm text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold mb-4">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>Ruang Tunggu Ujian Serentak (Lobby)</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {config.title}
          </h1>

          <p className="mt-2 text-xs sm:text-sm text-slate-600 max-w-xl mx-auto leading-relaxed">
            {config.description}
          </p>

          {/* Countdown Clock Box */}
          <div className="mt-6 bg-slate-900 text-white rounded-xl p-5 max-w-md mx-auto shadow-md">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Hitung Mundur Waktu Mulai (Pukul {config.startTime} WIB)
            </span>
            <div className="font-mono text-3xl sm:text-4xl font-extrabold text-amber-400 tracking-wider">
              {formatCountdown(secondsToStart)}
            </div>
            <span className="text-xs text-slate-400 mt-2 block">
              Jam Perangkat Anda: <b>{currentClock} WIB</b>
            </span>
          </div>
        </div>

        {/* Form Pendaftaran Siswa */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900">
              Konfirmasi Data Peserta Ujian
            </h2>
          </div>

          {!isRegistered ? (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Lengkap Siswa *
                </label>
                <input
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="Contoh: Muhammad Fadel Pratama"
                  required
                  className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Asal Sekolah / Kelas *
                </label>
                <input
                  type="text"
                  value={studentSchool}
                  onChange={(e) => setStudentSchool(e.target.value)}
                  placeholder="Contoh: SD Negeri 01 Mentari - Kelas 4"
                  required
                  className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-slate-900"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-lg text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition shadow-sm"
              >
                Konfirmasi & Masuk Antrian Room
              </button>
            </form>
          ) : (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Data Peserta Siap</span>
              </div>
              <div className="text-xs text-emerald-900 space-y-0.5">
                <p>Nama: <b>{studentName}</b></p>
                <p>Sekolah: <b>{studentSchool}</b></p>
                <p>Jenjang: <b>{config.level}</b></p>
              </div>
              <button
                type="button"
                onClick={() => setIsRegistered(false)}
                className="text-[11px] font-semibold text-emerald-700 underline pt-1 block"
              >
                Ubah Nama atau Sekolah
              </button>
            </div>
          )}

          {/* Locked CTA */}
          <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-xs text-slate-500 text-center sm:text-left">
              Soal akan otomatis terbuka serentak tepat pukul <b>{config.startTime} WIB</b>.
            </span>
            <button
              disabled
              className="w-full sm:w-auto px-5 py-2.5 rounded-lg text-xs font-bold text-slate-400 bg-slate-100 border border-slate-200 cursor-not-allowed inline-flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4" />
              <span>Ujian Terkunci (Buka Jam {config.startTime})</span>
            </button>
          </div>
        </div>

        {/* Petunjuk & Tata Tertib */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Tata Tertib & Ketentuan Kompetisi
          </h3>
          <ul className="text-xs text-slate-600 space-y-2 list-disc list-inside leading-relaxed">
            <li>Kompetisi berlangsung mulai pukul <b>{config.startTime} WIB</b> dan berakhir tepat pukul <b>{config.endTime} WIB</b>.</li>
            <li>Jumlah butir soal sebanyak <b>{config.totalQuestions} butir soal pilihan ganda</b>.</li>
            <li>Peringkat ditentukan berdasarkan <b>Skor Tertinggi</b> dan <b>Kecepatan Submit</b>.</li>
            <li>Setelah pukul <b>{config.endTime} WIB</b>, sistem otomatis menutup ujian dan membuka Menu Pengumuman Peringkat.</li>
          </ul>
        </div>
      </div>
    );
  }

  // ====================================================
  // VIEW 3: ANNOUNCEMENT (SETELAH JAM SELESAI >= 13:00)
  // ATAU SISWA SUDAH SUBMIT UJIAN
  // ====================================================
  if (phase === 'ANNOUNCEMENT' || isSubmitted) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 pb-16">
        {/* Banner Pengumuman */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 shadow-sm text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold mb-3">
            <Trophy className="w-4 h-4 text-blue-600" />
            <span>Papan Pengumuman Hasil Peringkat Resmi</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Klasemen Akhir {config.title}
          </h1>

          <p className="mt-2 text-xs sm:text-sm text-slate-600 max-w-xl mx-auto">
            Ujian resmi ditutup pada pukul <b>{config.endTime} WIB</b>. Berikut adalah perolehan nilai dan peringkat resmi seluruh peserta.
          </p>

          {/* Kartu Status Peringkat Siswa Pribadi */}
          {myParticipantData && (
            <div className="mt-6 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-xl p-6 max-w-xl mx-auto shadow-md">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-center sm:text-left">
                  <span className="text-xs font-semibold text-blue-200 block uppercase tracking-wider">
                    Hasil Ujian Anda
                  </span>
                  <h3 className="text-xl font-bold mt-0.5">{myParticipantData.name}</h3>
                  <p className="text-xs text-blue-200">{myParticipantData.school}</p>
                </div>

                <div className="flex items-center gap-4 bg-white/10 px-4 py-2.5 rounded-lg backdrop-blur-xs">
                  <div className="text-center">
                    <span className="text-[11px] text-blue-200 block">Peringkat</span>
                    <span className="text-2xl font-black text-amber-300">
                      #{myRank}
                    </span>
                  </div>
                  <div className="w-px h-8 bg-white/20" />
                  <div className="text-center">
                    <span className="text-[11px] text-blue-200 block">Skor Akhir</span>
                    <span className="text-2xl font-black text-white">
                      {myParticipantData.score}
                    </span>
                  </div>
                </div>
              </div>

              {myParticipantData.score >= 90 && (
                <div className="mt-4 pt-4 border-t border-white/20 flex flex-col sm:flex-row items-center justify-between gap-2">
                  <span className="text-xs text-emerald-200">
                    Selamat! Anda meraih nilai istimewa & berhak atas Piagam Penghargaan.
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowCertificateModal(true)}
                    className="px-3.5 py-1.5 text-xs font-bold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-lg transition inline-flex items-center gap-1.5 shadow-xs"
                  >
                    <Award className="w-3.5 h-3.5" />
                    <span>Cetak Piagam Juara</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Podium 3 Besar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {leaderboard.slice(0, 3).map((p, idx) => {
            const medals = ['🥇 Juara 1', '🥈 Juara 2', '🥉 Juara 3'];
            const colors = [
              'border-amber-400 bg-amber-50/50',
              'border-slate-300 bg-slate-50/50',
              'border-amber-600/40 bg-amber-50/30',
            ];
            return (
              <div
                key={p.id}
                className={`rounded-xl border-2 p-5 text-center shadow-xs flex flex-col justify-between ${colors[idx]}`}
              >
                <div>
                  <span className="text-xs font-black uppercase tracking-wider text-slate-800 block">
                    {medals[idx]}
                  </span>
                  <div className="w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center mx-auto my-3 text-xl font-bold shadow-xs">
                    {idx === 0 ? '🏆' : idx === 1 ? '🥈' : '🥉'}
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 line-clamp-1">{p.name}</h4>
                  <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{p.school}</p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-around text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Nilai</span>
                    <span className="font-extrabold text-slate-900 text-base">{p.score}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Waktu</span>
                    <span className="font-semibold text-slate-700">{Math.floor(p.timeSpentSeconds / 60)}m</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Tabel Lengkap Leaderboard */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              <span>Daftar Peringkat Lengkap ({leaderboard.length} Peserta)</span>
            </h3>
            <span className="text-xs text-slate-500">Urut berdasarkan Skor & Waktu</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4 text-center">Peringkat</th>
                  <th className="py-3 px-4">Nama Peserta</th>
                  <th className="py-3 px-4">Asal Sekolah</th>
                  <th className="py-3 px-4 text-center">Jawaban Benar</th>
                  <th className="py-3 px-4 text-center">Waktu Pengerjaan</th>
                  <th className="py-3 px-4 text-right">Skor Akhir</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leaderboard.map((item, index) => {
                  const isMe = item.isCurrentUser || item.name === studentName.trim();
                  return (
                    <tr
                      key={item.id}
                      className={isMe ? 'bg-blue-50/80 font-bold text-blue-900' : 'hover:bg-slate-50'}
                    >
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                            index === 0
                              ? 'bg-amber-400 text-white'
                              : index === 1
                              ? 'bg-slate-300 text-slate-800'
                              : index === 2
                              ? 'bg-amber-600 text-white'
                              : 'text-slate-600'
                          }`}
                        >
                          {index + 1}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {item.name} {isMe && <span className="ml-1 text-[10px] text-blue-700 bg-blue-100 px-1.5 py-0.2 rounded font-bold">(Anda)</span>}
                      </td>
                      <td className="py-3 px-4 text-slate-600">{item.school}</td>
                      <td className="py-3 px-4 text-center text-slate-700">
                        {item.correctCount}/{item.totalQuestions}
                      </td>
                      <td className="py-3 px-4 text-center text-slate-600">
                        {Math.floor(item.timeSpentSeconds / 60)}m {item.timeSpentSeconds % 60}s
                      </td>
                      <td className="py-3 px-4 text-right font-extrabold text-sm text-slate-900">
                        {item.score}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Navigasi Bawah */}
        <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
          <a
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition shadow-xs"
          >
            <Home className="w-4 h-4 text-blue-600" />
            <span>Kembali ke Beranda Utama</span>
          </a>

          <a
            href="/admin/kompetisi"
            className="text-xs text-slate-500 hover:text-blue-700 underline"
          >
            Kelola Jadwal Room (Admin)
          </a>
        </div>

        {showCertificateModal && myParticipantData && (
          <CertificateModal
            studentName={myParticipantData.name}
            quizTitle={config.title}
            categoryName={`Kompetisi ${config.level}`}
            level={config.level}
            score={myParticipantData.score}
            correctCount={myParticipantData.correctCount}
            totalQuestions={myParticipantData.totalQuestions}
            onClose={() => setShowCertificateModal(false)}
          />
        )}
      </div>
    );
  }

  // ====================================================
  // VIEW 2: EXAM (JAM 12:00 - 13:00) UJIAN SERENTAK
  // ====================================================
  const currentQuestion = activeQuestions[currentIndex];
  const totalQuestions = activeQuestions.length;
  const answeredCount = Object.keys(selectedAnswers).length;
  const isTimeCritical = secondsToEnd < 300; // < 5 menit

  if (!currentQuestion) {
    return (
      <div className="py-16 text-center text-slate-500 text-sm">
        Memuat lembar ujian serentak...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4 pb-16">
      {/* Top Banner Waktu Serentak */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 animate-pulse">
              ● Ujian Serentak Berlangsung
            </span>
            <span className="text-xs text-slate-500 font-medium">Peserta: <b>{studentName}</b></span>
          </div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 mt-1">{config.title}</h1>
        </div>

        {/* Timer Mundur Menuju Jam Selesai */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Selesai Pukul {config.endTime}</span>
            <div
              className={`font-mono text-base sm:text-lg font-black px-3 py-1 rounded-lg border ${
                isTimeCritical
                  ? 'bg-rose-50 text-rose-700 border-rose-300 animate-pulse'
                  : 'bg-slate-50 text-slate-800 border-slate-200'
              }`}
            >
              {formatCountdown(secondsToEnd)}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowConfirmSubmitModal(true)}
            className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition shadow-sm shrink-0"
          >
            Selesai Ujian
          </button>
        </div>
      </div>

      {/* Lembar Soal CBT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Kolom Soal */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded">
                Soal Nomor {currentIndex + 1} dari {totalQuestions}
              </span>
              <button
                type="button"
                onClick={() => {
                  setFlaggedQuestions((prev) => {
                    const next = new Set(prev);
                    if (next.has(currentIndex)) next.delete(currentIndex);
                    else next.add(currentIndex);
                    return next;
                  });
                }}
                className={`text-xs font-semibold px-2.5 py-1 rounded transition border ${
                  flaggedQuestions.has(currentIndex)
                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {flaggedQuestions.has(currentIndex) ? '★ Ditandai Ragu' : '☆ Ragu-ragu'}
              </button>
            </div>

            {/* Teks Soal */}
            <div className="text-sm sm:text-base font-medium text-slate-900 leading-relaxed min-h-[70px]">
              <MathText content={currentQuestion.questionText} />
            </div>

            {/* Pilihan Jawaban */}
            <div className="space-y-2 pt-2">
              {currentQuestion.options.map((opt) => {
                const isSelected = selectedAnswers[currentIndex] === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSelectedAnswers({ ...selectedAnswers, [currentIndex]: opt.id })}
                    className={`w-full p-3 rounded-xl border text-left text-xs sm:text-sm font-medium transition flex items-center gap-3 ${
                      isSelected
                        ? 'bg-blue-50 border-blue-600 text-blue-900 ring-1 ring-blue-600'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                        isSelected
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {opt.id}
                    </span>
                    <span className="flex-1">
                      <MathText content={opt.text} />
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Tombol Navigasi Prev/Next */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Sebelumnya</span>
              </button>

              <button
                type="button"
                disabled={currentIndex === totalQuestions - 1}
                onClick={() => setCurrentIndex((prev) => Math.min(totalQuestions - 1, prev + 1))}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1"
              >
                <span>Berikutnya</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Palet Nomor Soal */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Daftar Nomor Soal
            </h3>

            <div className="grid grid-cols-5 gap-2">
              {activeQuestions.map((_, idx) => {
                const isAnswered = Boolean(selectedAnswers[idx]);
                const isFlagged = flaggedQuestions.has(idx);
                const isCurrent = idx === currentIndex;

                let btnClass = 'bg-slate-50 text-slate-700 border-slate-200';
                if (isCurrent) btnClass = 'ring-2 ring-blue-600 font-bold border-blue-600';
                if (isAnswered) btnClass += ' bg-blue-600 text-white font-bold border-blue-600';
                if (isFlagged) btnClass = 'bg-amber-400 text-slate-900 font-bold border-amber-500';

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-9 rounded-lg border text-xs font-semibold transition ${btnClass}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 space-y-1">
              <div className="flex items-center justify-between">
                <span>Terjawab:</span>
                <b className="text-blue-700">{answeredCount} dari {totalQuestions}</b>
              </div>
              <div className="flex items-center justify-between">
                <span>Belum Terjawab:</span>
                <b>{totalQuestions - answeredCount}</b>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Konfirmasi Submit */}
      {showConfirmSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[2px]">
          <div className="bg-white rounded-xl max-w-sm w-full p-5 border border-slate-200 shadow-lg space-y-3">
            <h4 className="text-base font-bold text-slate-900">Kumpulkan Lembar Ujian?</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Anda telah menjawab <b>{answeredCount}</b> dari <b>{totalQuestions}</b> soal. Jawaban akan langsung dinilai dan dimasukkan ke papan peringkat kompetisi.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmSubmitModal(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition"
              >
                Periksa Lagi
              </button>
              <button
                type="button"
                onClick={handleSubmitExam}
                className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition"
              >
                Ya, Kumpulkan Sekarang
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompetitionRoom;
