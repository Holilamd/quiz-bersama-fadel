import React, { useState, useEffect, useMemo, useRef } from 'react';
import MathText from './MathText';
import CertificateModal from './CertificateModal';
import type { Quiz, Question, QuestionOption } from '../content/config';
import {
  Clock,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Check,
  AlertTriangle,
  ArrowLeft,
  Bookmark,
  RotateCcw,
  RefreshCw,
  Award,
  Lock,
} from 'lucide-react';

interface QuizPlayerProps {
  quiz: Quiz;
}

interface SavedSession {
  quizId: string;
  activeQuestions: Question[];
  selectedAnswers: Record<number, string>;
  flaggedQuestions: number[];
  currentIndex: number;
  timeLeft: number;
  selectedDifficulty: 'Semua' | 'Mudah' | 'Sedang' | 'Sulit';
  isSubmitted: boolean;
}

// Algoritma Fisher-Yates untuk mengacak urutan
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Acak opsi pilihan jawaban dan petakan ulang kunci jawaban
function randomizeQuestion(q: Question): Question {
  const originalCorrectOpt = q.options.find((opt) => opt.id === q.correctAnswer);
  const correctText = originalCorrectOpt ? originalCorrectOpt.text : '';

  const shuffledTexts = shuffleArray(q.options.map((opt) => opt.text));
  const optionLetters: ('A' | 'B' | 'C' | 'D' | 'E')[] = ['A', 'B', 'C', 'D', 'E'];

  let newCorrectAnswer = 'A';
  const newOptions: QuestionOption[] = shuffledTexts.map((text, idx) => {
    const letter = optionLetters[idx];
    if (text === correctText) {
      newCorrectAnswer = letter;
    }
    return {
      id: letter,
      text,
    };
  });

  return {
    ...q,
    options: newOptions,
    correctAnswer: newCorrectAnswer,
  };
}

export const QuizPlayer: React.FC<QuizPlayerProps> = ({ quiz }) => {
  const storageKey = `asah_otak_session_${quiz.id}`;
  const initialDurationSeconds = quiz.duration * 60;

  const [selectedDifficulty, setSelectedDifficulty] = useState<'Semua' | 'Mudah' | 'Sedang' | 'Sulit'>('Semua');
  const [activeQuestions, setActiveQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<number>>(new Set());
  const [timeLeft, setTimeLeft] = useState<number>(initialDurationSeconds);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

  // Modals & Sertifikat
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [showNewQuizConfirmModal, setShowNewQuizConfirmModal] = useState<boolean>(false);
  const [pendingDifficulty, setPendingDifficulty] = useState<'Semua' | 'Mudah' | 'Sedang' | 'Sulit' | null>(null);
  const [studentName, setStudentName] = useState<string>('');
  const [showCertificateModal, setShowCertificateModal] = useState<boolean>(false);

  // Filter pembahasan
  const [reviewFilter, setReviewFilter] = useState<'all' | 'wrong' | 'correct'>('all');

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialized = useRef<boolean>(false);

  const createFreshQuizSet = (difficulty: 'Semua' | 'Mudah' | 'Sedang' | 'Sulit'): Question[] => {
    let pool = quiz.questions;
    if (difficulty !== 'Semua') {
      const filtered = quiz.questions.filter((q) => q.difficulty === difficulty);
      if (filtered.length > 0) {
        pool = filtered;
      }
    }

    const shuffledPool = shuffleArray(pool);
    const countToTake = Math.min(quiz.shuffleCount || 5, shuffledPool.length);
    const selectedSubset = shuffledPool.slice(0, countToTake);
    return selectedSubset.map(randomizeQuestion);
  };

  // 1. Pulihkan sesi tersimpan dari localStorage agar refresh tidak mereset progres
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed: SavedSession = JSON.parse(saved);
        if (parsed.activeQuestions && parsed.activeQuestions.length > 0) {
          setActiveQuestions(parsed.activeQuestions);
          setSelectedAnswers(parsed.selectedAnswers || {});
          setFlaggedQuestions(new Set(parsed.flaggedQuestions || []));
          setCurrentIndex(parsed.currentIndex || 0);
          setTimeLeft(parsed.timeLeft !== undefined ? parsed.timeLeft : initialDurationSeconds);
          setSelectedDifficulty(parsed.selectedDifficulty || 'Semua');
          setIsSubmitted(Boolean(parsed.isSubmitted));
          isInitialized.current = true;
          return;
        }
      }
    } catch (e) {
      console.warn('Gagal membaca data sesi:', e);
    }

    const freshQuestions = createFreshQuizSet('Semua');
    setActiveQuestions(freshQuestions);
    setSelectedAnswers({});
    setFlaggedQuestions(new Set());
    setCurrentIndex(0);
    setTimeLeft(initialDurationSeconds);
    setIsSubmitted(false);
    isInitialized.current = true;
  }, [quiz.id]);

  // 2. Simpan progres setiap ada perubahan (Auto-Save)
  useEffect(() => {
    if (!isInitialized.current || typeof window === 'undefined' || activeQuestions.length === 0) return;

    try {
      const sessionToSave: SavedSession = {
        quizId: quiz.id,
        activeQuestions,
        selectedAnswers,
        flaggedQuestions: Array.from(flaggedQuestions),
        currentIndex,
        timeLeft,
        selectedDifficulty,
        isSubmitted,
      };
      localStorage.setItem(storageKey, JSON.stringify(sessionToSave));
    } catch (e) {
      console.warn('Gagal menyimpan sesi:', e);
    }
  }, [activeQuestions, selectedAnswers, flaggedQuestions, currentIndex, timeLeft, selectedDifficulty, isSubmitted, quiz.id]);

  // 3. Timer mundur
  useEffect(() => {
    if (isSubmitted || activeQuestions.length === 0) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current as NodeJS.Timeout);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isSubmitted, activeQuestions]);

  const handleStartNewQuestions = (diff: 'Semua' | 'Mudah' | 'Sedang' | 'Sulit' = selectedDifficulty) => {
    const freshQuestions = createFreshQuizSet(diff);
    setActiveQuestions(freshQuestions);
    setSelectedAnswers({});
    setFlaggedQuestions(new Set());
    setCurrentIndex(0);
    setTimeLeft(initialDurationSeconds);
    setSelectedDifficulty(diff);
    setIsSubmitted(false);
    setShowNewQuizConfirmModal(false);
    setPendingDifficulty(null);
  };

  const triggerNewQuizRequest = (targetDiff?: 'Semua' | 'Mudah' | 'Sedang' | 'Sulit') => {
    const diff = targetDiff || selectedDifficulty;
    const hasProgress = Object.keys(selectedAnswers).length > 0;
    if (!isSubmitted && hasProgress) {
      setPendingDifficulty(diff);
      setShowNewQuizConfirmModal(true);
    } else {
      handleStartNewQuestions(diff);
    }
  };

  const handleRetrySameQuestions = () => {
    setSelectedAnswers({});
    setFlaggedQuestions(new Set());
    setCurrentIndex(0);
    setTimeLeft(initialDurationSeconds);
    setIsSubmitted(false);
  };

  const totalQuestions = activeQuestions.length;
  const currentQuestion = activeQuestions[currentIndex];

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSelectOption = (optionId: string) => {
    if (isSubmitted) return;
    setSelectedAnswers((prev) => ({
      ...prev,
      [currentIndex]: optionId,
    }));
  };

  const toggleFlag = (index: number) => {
    setFlaggedQuestions((prev) => {
      const updated = new Set(prev);
      if (updated.has(index)) {
        updated.delete(index);
      } else {
        updated.add(index);
      }
      return updated;
    });
  };

  const answeredCount = Object.keys(selectedAnswers).length;
  const progressPercent = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  const handleSubmit = () => {
    setShowConfirmModal(false);
    setIsSubmitted(true);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  // Skor
  const scoreResults = useMemo(() => {
    let correct = 0;
    let wrong = 0;
    let unanswered = 0;

    activeQuestions.forEach((q, idx) => {
      const userAns = selectedAnswers[idx];
      if (!userAns) {
        unanswered++;
      } else if (userAns === q.correctAnswer) {
        correct++;
      } else {
        wrong++;
      }
    });

    const score = totalQuestions > 0 ? Math.round((correct / totalQuestions) * 100) : 0;
    const timeSpent = initialDurationSeconds - timeLeft;

    return {
      correct,
      wrong,
      unanswered,
      score,
      timeSpent,
    };
  }, [isSubmitted, selectedAnswers, activeQuestions, totalQuestions, timeLeft, initialDurationSeconds]);

  const filteredReviewQuestions = useMemo(() => {
    return activeQuestions
      .map((q, idx) => ({
        question: q,
        idx,
        userAnswer: selectedAnswers[idx],
        isCorrect: selectedAnswers[idx] === q.correctAnswer,
        isUnanswered: !selectedAnswers[idx],
      }))
      .filter((item) => {
        if (reviewFilter === 'correct') return item.isCorrect;
        if (reviewFilter === 'wrong') return !item.isCorrect;
        return true;
      });
  }, [activeQuestions, selectedAnswers, reviewFilter]);

  if (activeQuestions.length === 0 || !currentQuestion) {
    return (
      <div className="py-16 text-center text-slate-500 text-sm">
        Memuat lembar soal...
      </div>
    );
  }

  // ==========================================
  // VIEW: HASIL & PEMBAHASAN
  // ==========================================
  if (isSubmitted) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 pb-16">
        {/* Navigasi Atas */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <a
            href={`/quiz/${quiz.category}`}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-600 hover:text-blue-700 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali ke Daftar {quiz.categoryName || quiz.category}
          </a>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRetrySameQuestions}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              Ulangi Soal Ini
            </button>
            <button
              onClick={() => handleStartNewQuestions(selectedDifficulty)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Kerjakan Paket Soal Baru
            </button>
          </div>
        </div>

        {/* Kotak Ringkasan Nilai Bersih & Jelas */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-200 bg-slate-50">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Hasil Latihan &bull; {quiz.level}
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">{quiz.title}</h1>

            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-4xl sm:text-5xl font-extrabold text-slate-900">{scoreResults.score}</span>
              <span className="text-base text-slate-500 font-medium">/ 100</span>
            </div>
            <p className="mt-2 text-xs sm:text-sm text-slate-600">
              {scoreResults.score >= 70
                ? 'Hasil latihan baik. Pertahankan dan pelajari pembahasan di bawah untuk memperdalam pemahaman.'
                : 'Perlu latihan lagi. Cermati langkah pembahasan setiap nomor di bawah ini.'}
            </p>
          </div>

          {/* Rincian Jawaban */}
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 text-center text-xs">
            <div className="p-3.5">
              <span className="text-slate-500 font-semibold block">Jawaban Benar</span>
              <span className="text-xl font-bold text-emerald-700 mt-0.5 block">{scoreResults.correct}</span>
            </div>
            <div className="p-3.5">
              <span className="text-slate-500 font-semibold block">Jawaban Salah</span>
              <span className="text-xl font-bold text-rose-600 mt-0.5 block">{scoreResults.wrong}</span>
            </div>
            <div className="p-3.5">
              <span className="text-slate-500 font-semibold block">Tidak Dijawab</span>
              <span className="text-xl font-bold text-slate-600 mt-0.5 block">{scoreResults.unanswered}</span>
            </div>
            <div className="p-3.5">
              <span className="text-slate-500 font-semibold block">Waktu Digunakan</span>
              <span className="text-xl font-bold text-slate-800 mt-0.5 block">{formatTime(scoreResults.timeSpent)}</span>
            </div>
          </div>
        </div>

        {/* Kotak Generate Sertifikat Penghargaan (Khusus Nilai >= 90) */}
        {scoreResults.score >= 90 ? (
          <div className="bg-white rounded-xl border-2 border-emerald-500 p-5 sm:p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                <Award className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    Sertifikat Terbuka ✓
                  </span>
                  <span className="text-xs text-slate-500">Nilai {scoreResults.score}/100 (Syarat: Minimal 90)</span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-1">
                  Selamat! Kamu Berhak Mendapatkan Piagam Penghargaan
                </h3>
                <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                  Ketik nama lengkap siswa untuk menerbitkan piagam resmi tanda kelulusan dengan predikat istimewa. Sertifikat dapat dicetak atau disimpan ke PDF.
                </p>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (studentName.trim()) {
                      try {
                        localStorage.setItem('asah_otak_student_name', studentName.trim());
                      } catch {}
                      setShowCertificateModal(true);
                    }
                  }}
                  className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
                >
                  <input
                    type="text"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder="Ketik Nama Lengkap Siswa (Contoh: Ahmad Fauzan)"
                    className="flex-1 px-3.5 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent text-slate-900 bg-white"
                  />
                  <button
                    type="submit"
                    disabled={!studentName.trim()}
                    className="px-4 py-2 text-xs sm:text-sm font-bold text-white bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition inline-flex items-center justify-center gap-1.5 shrink-0"
                  >
                    <Award className="w-4 h-4" />
                    <span>Lihat & Cetak Sertifikat</span>
                  </button>
                </form>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5 text-slate-500" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                    Sertifikat Terkunci 🔒
                  </span>
                  <span className="text-xs text-slate-500">Nilai saat ini: {scoreResults.score}/100</span>
                </div>
                <h3 className="text-base font-bold text-slate-800 mt-1">
                  Sertifikat Penghargaan Terbuka untuk Nilai 90 ke Atas
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Piagam penghargaan resmi hanya diberikan bagi siswa yang mencapai nilai <b>minimal 90</b>. Jangan berkecil hati, pelajari kunci dan cara penyelesaian soal di bawah, lalu ulangi kuis untuk meraih nilai 90+!
                </p>

                <div className="mt-3.5 flex items-center gap-2">
                  <button
                    onClick={handleRetrySameQuestions}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Ulangi Soal Ini untuk Kejar Nilai 90+
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filter Pembahasan */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
          <div>
            <h2 className="text-base font-bold text-slate-900">Kunci Jawaban & Pembahasan</h2>
            <p className="text-xs text-slate-500">Pelajari cara pengerjaan untuk setiap nomor soal.</p>
          </div>

          <div className="flex items-center gap-1 bg-slate-200/70 p-1 rounded-lg text-xs font-semibold text-slate-700">
            <button
              onClick={() => setReviewFilter('all')}
              className={`px-2.5 py-1 rounded transition ${reviewFilter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'hover:text-slate-900'
                }`}
            >
              Semua ({totalQuestions})
            </button>
            <button
              onClick={() => setReviewFilter('wrong')}
              className={`px-2.5 py-1 rounded transition ${reviewFilter === 'wrong' ? 'bg-white text-rose-700 shadow-sm' : 'hover:text-slate-900'
                }`}
            >
              Salah / Kosong ({scoreResults.wrong + scoreResults.unanswered})
            </button>
            <button
              onClick={() => setReviewFilter('correct')}
              className={`px-2.5 py-1 rounded transition ${reviewFilter === 'correct' ? 'bg-white text-emerald-700 shadow-sm' : 'hover:text-slate-900'
                }`}
            >
              Benar ({scoreResults.correct})
            </button>
          </div>
        </div>

        {/* Daftar Pembahasan Per Soal */}
        <div className="space-y-4">
          {filteredReviewQuestions.map(({ question: q, idx, userAnswer, isCorrect, isUnanswered }) => {
            return (
              <div
                key={`${q.id}-${idx}`}
                className={`bg-white rounded-xl border p-5 ${isCorrect ? 'border-slate-200' : 'border-rose-300'
                  }`}
              >
                {/* Header Nomor */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                      Nomor {idx + 1}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      Tingkat: {q.difficulty}
                    </span>
                  </div>

                  {isCorrect ? (
                    <span className="text-xs font-semibold text-emerald-700 inline-flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Jawaban Benar ({userAnswer})
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-rose-700 inline-flex items-center gap-1 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                      <XCircle className="w-3.5 h-3.5 text-rose-600" />
                      {isUnanswered
                        ? `Tidak dijawab &bull; Kunci: ${q.correctAnswer}`
                        : `Jawaban Anda: ${userAnswer} &bull; Kunci: ${q.correctAnswer}`}
                    </span>
                  )}
                </div>

                {/* Teks Soal */}
                <div className="text-slate-900 text-sm sm:text-base font-medium leading-relaxed mb-4">
                  <MathText content={q.questionText} />
                </div>

                {/* Pilihan Jawaban */}
                <div className="space-y-2 mb-4">
                  {q.options.map((opt) => {
                    const isOptionCorrect = opt.id === q.correctAnswer;
                    const isOptionSelectedByUser = userAnswer === opt.id;

                    let optStyle = 'border-slate-200 bg-white text-slate-700';
                    let badgeStyle = 'bg-slate-100 border-slate-300 text-slate-700';

                    if (isOptionCorrect) {
                      optStyle = 'border-emerald-500 bg-emerald-50/70 text-emerald-950 font-medium';
                      badgeStyle = 'bg-emerald-600 text-white border-emerald-600';
                    } else if (isOptionSelectedByUser && !isOptionCorrect) {
                      optStyle = 'border-rose-300 bg-rose-50/60 text-rose-950 line-through';
                      badgeStyle = 'bg-rose-600 text-white border-rose-600';
                    }

                    return (
                      <div
                        key={opt.id}
                        className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-xs sm:text-sm ${optStyle}`}
                      >
                        <span
                          className={`w-6 h-6 flex items-center justify-center rounded border font-bold text-xs shrink-0 ${badgeStyle}`}
                        >
                          {opt.id}
                        </span>
                        <div className="flex-1 pt-0.5">
                          <MathText content={opt.text} />
                        </div>
                        {isOptionCorrect && (
                          <span className="text-[11px] font-semibold text-emerald-700 shrink-0">
                            (Kunci Jawaban)
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Penjelasan Pembahasan */}
                <div className="rounded-lg bg-slate-50 border border-slate-200 p-3.5 text-xs sm:text-sm text-slate-700">
                  <span className="font-bold text-slate-900 block mb-1">Pembahasan:</span>
                  <div className="leading-relaxed">
                    <MathText content={q.explanation} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Sertifikat */}
        {showCertificateModal && (
          <CertificateModal
            studentName={studentName}
            quizTitle={quiz.title}
            categoryName={quiz.categoryName || quiz.category}
            level={quiz.level}
            score={scoreResults.score}
            correctCount={scoreResults.correct}
            totalQuestions={totalQuestions}
            onClose={() => setShowCertificateModal(false)}
          />
        )}
      </div>
    );
  }

  // ==========================================
  // VIEW: PLAYING (SEDANG MENGERJAKAN)
  // ==========================================
  const isTimeCritical = timeLeft < 120;

  return (
    <div className="max-w-4xl mx-auto space-y-4 pb-12">
      {/* Bar Atas: Filter Tingkat & Tombol Paket Baru */}
      <div className="bg-white rounded-xl border border-slate-200 p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700">Tingkat:</span>
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-semibold">
            {(['Semua', 'Mudah', 'Sedang', 'Sulit'] as const).map((diff) => (
              <button
                key={diff}
                type="button"
                onClick={() => triggerNewQuizRequest(diff)}
                className={`px-2.5 py-1 rounded transition ${selectedDifficulty === diff
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                {diff === 'Semua' ? 'Campuran' : diff}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => triggerNewQuizRequest()}
          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-blue-700 py-1 transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Ganti Paket Soal</span>
        </button>
      </div>

      {/* Header Info Kuis */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                {quiz.categoryName || quiz.category}
              </span>
              <span className="text-xs text-slate-500 font-medium">{quiz.level}</span>
              <span className="text-[11px] text-slate-400">&bull; Disimpan otomatis</span>
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 mt-1">{quiz.title}</h1>
          </div>

          {/* Sisa Waktu & Selesai */}
          <div className="flex items-center gap-2.5">
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-sm font-bold border ${isTimeCritical
                  ? 'bg-rose-50 text-rose-700 border-rose-300'
                  : 'bg-slate-50 text-slate-800 border-slate-200'
                }`}
            >
              <Clock className="w-4 h-4 text-slate-500" />
              <span>{formatTime(timeLeft)}</span>
            </div>

            <button
              onClick={() => setShowConfirmModal(true)}
              className="px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg transition"
            >
              Selesai
            </button>
          </div>
        </div>

        {/* Progress Bar Sederhana */}
        <div className="mt-4 pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1">
            <span>Terjawab: {answeredCount} dari {totalQuestions} soal</span>
            <span>Nomor {currentIndex + 1} dari {totalQuestions}</span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-200"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Grid: Lembar Soal (Kiri) & Palet Nomor (Kanan) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Kolom Lembar Soal */}
        <div className="md:col-span-8 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 min-h-[380px] flex flex-col justify-between">
            <div>
              {/* Info Nomor Soal */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900">
                    Soal {currentIndex + 1}
                  </span>
                  <span className="text-xs text-slate-500">
                    (Tingkat {currentQuestion.difficulty})
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => toggleFlag(currentIndex)}
                  className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded border transition ${flaggedQuestions.has(currentIndex)
                      ? 'bg-amber-50 text-amber-800 border-amber-300'
                      : 'text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                >
                  <Bookmark
                    className={`w-3 h-3 ${flaggedQuestions.has(currentIndex) ? 'fill-amber-600 text-amber-600' : 'text-slate-400'
                      }`}
                  />
                  <span>{flaggedQuestions.has(currentIndex) ? 'Ditandai Ragu' : 'Tandai Ragu'}</span>
                </button>
              </div>

              {/* Teks Soal */}
              <div className="text-slate-900 text-base sm:text-lg font-medium leading-relaxed mb-6">
                <MathText content={currentQuestion.questionText} />
              </div>

              {/* Opsi Pilihan Jawaban */}
              <div className="space-y-2.5">
                {currentQuestion.options.map((option) => {
                  const isSelected = selectedAnswers[currentIndex] === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => handleSelectOption(option.id)}
                      className={`w-full text-left flex items-start gap-3 p-3.5 rounded-lg border text-sm transition ${isSelected
                          ? 'border-blue-600 bg-blue-50/50 text-slate-900 font-medium'
                          : 'border-slate-200 bg-white hover:border-slate-300 text-slate-800'
                        }`}
                    >
                      <span
                        className={`w-7 h-7 rounded flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${isSelected
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-700 border border-slate-300'
                          }`}
                      >
                        {option.id}
                      </span>
                      <div className="flex-1 pt-0.5">
                        <MathText content={option.text} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tombol Navigasi Sebelumnya / Selanjutnya */}
            <div className="flex items-center justify-between pt-6 mt-6 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                disabled={currentIndex === 0}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="w-4 h-4" />
                Sebelumnya
              </button>

              {currentIndex < totalQuestions - 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentIndex((prev) => Math.min(totalQuestions - 1, prev + 1))}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition"
                >
                  Selanjutnya
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 transition"
                >
                  Kumpulkan
                  <Check className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Kolom Palet Nomor Soal */}
        <div className="md:col-span-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 sticky top-20">
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-3">
              Nomor Soal
            </h3>

            <div className="grid grid-cols-5 gap-2">
              {activeQuestions.map((_, idx) => {
                const isCurrent = idx === currentIndex;
                const isAnswered = selectedAnswers[idx] !== undefined;
                const isFlagged = flaggedQuestions.has(idx);

                let btnStyle = 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50';

                if (isAnswered) {
                  btnStyle = 'bg-slate-800 text-white border-slate-800';
                }

                if (isCurrent) {
                  btnStyle += ' ring-2 ring-blue-600 ring-offset-1 font-bold';
                }

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentIndex(idx)}
                    className={`relative h-9 rounded text-xs font-semibold border flex items-center justify-center transition ${btnStyle}`}
                  >
                    {idx + 1}
                    {isFlagged && (
                      <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-amber-500 rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Keterangan */}
            <div className="mt-5 pt-3 border-t border-slate-100 space-y-1.5 text-[11px] text-slate-600">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-slate-800" />
                <span>Sudah dijawab</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded border border-slate-300 bg-white" />
                <span>Belum dijawab</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded border-2 border-blue-600 bg-white" />
                <span>Sedang dibuka</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-amber-400" />
                <span>Ragu-ragu</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Konfirmasi Selesai */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[2px]">
          <div className="bg-white rounded-xl max-w-sm w-full p-5 border border-slate-200 shadow-lg">
            <h3 className="font-bold text-slate-900 text-base mb-1">Kumpulkan Jawaban?</h3>
            <p className="text-xs text-slate-500 mb-4">
              Periksa ringkasan pengerjaan sebelum menyelesaikan kuis.
            </p>

            <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-700 space-y-1.5 mb-5 border border-slate-200">
              <div className="flex justify-between">
                <span>Soal Terjawab:</span>
                <span className="font-bold text-slate-900">{answeredCount} dari {totalQuestions}</span>
              </div>
              <div className="flex justify-between">
                <span>Belum Dijawab:</span>
                <span className="font-bold text-slate-900">{totalQuestions - answeredCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Sisa Waktu:</span>
                <span className="font-bold text-slate-900">{formatTime(timeLeft)}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition"
              >
                Kembali
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition"
              >
                Ya, Kumpulkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Ganti Paket Soal */}
      {showNewQuizConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[2px]">
          <div className="bg-white rounded-xl max-w-sm w-full p-5 border border-slate-200 shadow-lg">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-base mb-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <span>Ganti Paket Soal?</span>
            </div>
            <p className="text-xs text-slate-600 mb-5 leading-relaxed">
              Anda sedang mengerjakan soal ini. Jika mengganti paket soal baru, progres dan jawaban saat ini akan direset.
            </p>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowNewQuizConfirmModal(false);
                  setPendingDifficulty(null);
                }}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition"
              >
                Lanjutkan Soal Ini
              </button>
              <button
                type="button"
                onClick={() => handleStartNewQuestions(pendingDifficulty || selectedDifficulty)}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition"
              >
                Ganti Soal Baru
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuizPlayer;
