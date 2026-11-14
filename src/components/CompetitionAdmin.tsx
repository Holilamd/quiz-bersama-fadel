import React, { useState, useEffect } from 'react';
import {
  Settings,
  Clock,
  Save,
  RotateCcw,
  Trophy,
  Users,
  CheckCircle2,
  ExternalLink,
  Zap,
  Trash2,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  LogOut,
  Shield,
  AlertCircle,
  X,
} from 'lucide-react';
import {
  type CompetitionRoomConfig,
  type CompetitionParticipant,
  getCompetitionConfig,
  saveCompetitionConfig,
  getStoredParticipants,
  deleteStoredParticipant,
  resetStoredParticipants,
  calculateRoomPhase,
  DEFAULT_COMPETITION_CONFIG,
  isAdminAuthenticated,
  setAdminAuthenticated,
  getAdminPassword,
  setAdminPassword,
  DEFAULT_ADMIN_USERNAME,
} from '../utils/competition';
import type { Quiz } from '../content/config';

interface CompetitionAdminProps {
  quizzes: { id: string; data: Quiz }[];
}

export const CompetitionAdmin: React.FC<CompetitionAdminProps> = ({ quizzes }) => {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(true);
  const [loginUsername, setLoginUsername] = useState<string>('admin');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [loginError, setLoginError] = useState<string>('');

  // Change Password Modal State
  const [showChangePasswordModal, setShowChangePasswordModal] = useState<boolean>(false);
  const [newPasswordInput, setNewPasswordInput] = useState<string>('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState<string>('');
  const [changePasswordMsg, setChangePasswordMsg] = useState<{ text: string; isError: boolean } | null>(null);

  // Competition Config & Participants
  const [config, setConfig] = useState<CompetitionRoomConfig>(DEFAULT_COMPETITION_CONFIG);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [participantsCount, setParticipantsCount] = useState<number>(0);
  const [participantsList, setParticipantsList] = useState<CompetitionParticipant[]>([]);
  const [currentRealTime, setCurrentRealTime] = useState<string>('');
  const [currentPhase, setCurrentPhase] = useState<'LOBBY' | 'EXAM' | 'ANNOUNCEMENT'>('LOBBY');

  const refreshParticipants = () => {
    const data = getStoredParticipants();
    // Urutkan skor tertinggi lalu waktu tercepat
    data.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.timeSpentSeconds - b.timeSpentSeconds;
    });
    setParticipantsList(data);
    setParticipantsCount(data.length);
  };

  useEffect(() => {
    // Check initial authentication
    const authStatus = isAdminAuthenticated();
    setIsAuthenticated(authStatus);
    setIsCheckingAuth(false);

    const loaded = getCompetitionConfig();
    setConfig(loaded);
    refreshParticipants();

    const interval = setInterval(() => {
      const now = new Date();
      const status = calculateRoomPhase(loaded, now);
      setCurrentRealTime(status.formattedCurrentTime);
      setCurrentPhase(status.phase);
    }, 1000);

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'asah_otak_competition_participants') {
        refreshParticipants();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    const currentSavedPass = getAdminPassword();
    if (loginUsername.trim().toLowerCase() !== DEFAULT_ADMIN_USERNAME.toLowerCase()) {
      setLoginError('Username tidak valid. Gunakan username administrator yang benar.');
      return;
    }

    if (loginPassword !== currentSavedPass) {
      setLoginError('Password salah. Periksa kembali password administrator Anda.');
      return;
    }

    setAdminAuthenticated(true, rememberMe);
    setIsAuthenticated(true);
    setLoginPassword('');
  };

  const handleLogout = () => {
    if (window.confirm('Keluar dari sesi administrator?')) {
      setAdminAuthenticated(false);
      setIsAuthenticated(false);
      setLoginPassword('');
    }
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPasswordInput || newPasswordInput.length < 4) {
      setChangePasswordMsg({ text: 'Password baru minimal 4 karakter.', isError: true });
      return;
    }
    if (newPasswordInput !== confirmPasswordInput) {
      setChangePasswordMsg({ text: 'Konfirmasi password tidak cocok.', isError: true });
      return;
    }
    setAdminPassword(newPasswordInput);
    setChangePasswordMsg({ text: 'Password admin berhasil diperbarui!', isError: false });
    setTimeout(() => {
      setShowChangePasswordModal(false);
      setChangePasswordMsg(null);
      setNewPasswordInput('');
      setConfirmPasswordInput('');
    }, 1500);
  };

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    saveCompetitionConfig(config);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  // Preset 1: Jam 12:00 - 13:00 Hari Ini
  const handlePresetStandard = () => {
    const today = new Date().toISOString().split('T')[0];
    const updated: CompetitionRoomConfig = {
      ...config,
      examDate: today,
      startTime: '12:00',
      endTime: '13:00',
    };
    setConfig(updated);
    saveCompetitionConfig(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  // Preset 2: Mulai Sekarang (Durasi 15 Menit) - Untuk Demo Langsung Ujian
  const handlePresetStartNow = () => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const startH = now.getHours().toString().padStart(2, '0');
    const startM = now.getMinutes().toString().padStart(2, '0');

    const endObj = new Date(now.getTime() + 15 * 60 * 1000);
    const endH = endObj.getHours().toString().padStart(2, '0');
    const endM = endObj.getMinutes().toString().padStart(2, '0');

    const updated: CompetitionRoomConfig = {
      ...config,
      examDate: today,
      startTime: `${startH}:${startM}`,
      endTime: `${endH}:${endM}`,
    };
    setConfig(updated);
    saveCompetitionConfig(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  // Preset 3: Mulai 1 Menit Lagi (Untuk Demo Countdown Ruang Tunggu)
  const handlePresetStartIn1Min = () => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    const startObj = new Date(now.getTime() + 1 * 60 * 1000);
    const startH = startObj.getHours().toString().padStart(2, '0');
    const startM = startObj.getMinutes().toString().padStart(2, '0');

    const endObj = new Date(now.getTime() + 16 * 60 * 1000);
    const endH = endObj.getHours().toString().padStart(2, '0');
    const endM = endObj.getMinutes().toString().padStart(2, '0');

    const updated: CompetitionRoomConfig = {
      ...config,
      examDate: today,
      startTime: `${startH}:${startM}`,
      endTime: `${endH}:${endM}`,
    };
    setConfig(updated);
    saveCompetitionConfig(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  // Preset 4: Langsung Lewat Jam Selesai (Untuk Demo Papan Pengumuman Juara)
  const handlePresetFinished = () => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    const startObj = new Date(now.getTime() - 60 * 60 * 1000);
    const startH = startObj.getHours().toString().padStart(2, '0');
    const startM = startObj.getMinutes().toString().padStart(2, '0');

    const endObj = new Date(now.getTime() - 5 * 60 * 1000);
    const endH = endObj.getHours().toString().padStart(2, '0');
    const endM = endObj.getMinutes().toString().padStart(2, '0');

    const updated: CompetitionRoomConfig = {
      ...config,
      examDate: today,
      startTime: `${startH}:${startM}`,
      endTime: `${endH}:${endM}`,
    };
    setConfig(updated);
    saveCompetitionConfig(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleResetData = () => {
    if (window.confirm('Reset seluruh data peserta ujian yang tersimpan di room ini?')) {
      resetStoredParticipants();
      refreshParticipants();
      alert('Seluruh data peserta berhasil di-reset.');
    }
  };

  const handleDeleteParticipant = (id: string, name: string) => {
    if (window.confirm(`Hapus data ujian peserta '${name}'?`)) {
      deleteStoredParticipant(id);
      refreshParticipants();
    }
  };

  const phaseBadge = {
    LOBBY: 'bg-amber-50 text-amber-800 border-amber-300',
    EXAM: 'bg-emerald-50 text-emerald-800 border-emerald-300 animate-pulse',
    ANNOUNCEMENT: 'bg-blue-50 text-blue-800 border-blue-300',
  };

  const phaseLabel = {
    LOBBY: 'Ruang Tunggu (Lobby Terkunci)',
    EXAM: 'Ujian Serentak Sedang Berlangsung!',
    ANNOUNCEMENT: 'Ujian Selesai (Papan Pengumuman Peringkat Terbuka)',
  };

  // ====================================================
  // VIEW: LOADING AUTH STATE
  // ====================================================
  if (isCheckingAuth) {
    return (
      <div className="min-h-[40vh] flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-slate-500 font-semibold">Memeriksa hak akses administrator...</span>
      </div>
    );
  }

  // ====================================================
  // VIEW: LOGIN GATE ADMIN (JIKA BELUM LOGIN)
  // ====================================================
  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto my-8 sm:my-14 px-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
          {/* Header Icon & Title */}
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center mx-auto mb-3 text-blue-600 shadow-xs">
              <Lock className="w-7 h-7" />
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold mb-2">
              <Shield className="w-3.5 h-3.5 text-blue-600" />
              <span>Portal Administrator AsahOtak</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Login Admin Room
            </h1>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Silakan login untuk mengatur jadwal room kompetisi, memilih paket soal, dan memantau peringkat peserta.
            </p>
          </div>

          {/* Form Login */}
          <form onSubmit={handleLogin} className="space-y-4">
            {loginError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Username Admin
              </label>
              <input
                type="text"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-900"
                placeholder="admin"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Password Admin
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 pr-10 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-900 font-mono"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-slate-600 select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span>Ingat login di browser ini</span>
              </label>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition shadow-sm flex items-center justify-center gap-2"
            >
              <KeyRound className="w-4 h-4" />
              <span>Masuk Panel Admin</span>
            </button>
          </form>

          {/* Default Credentials Hint Box */}
          <div className="mt-6 p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-[11px] leading-relaxed">
            <span className="font-bold text-slate-700 block mb-0.5">ℹ️ Akses Akun Default:</span>
            <span>Username: <code className="bg-white px-1.5 py-0.5 rounded border border-slate-300 font-mono font-bold text-blue-700">admin</code></span>
            <span className="mx-2">•</span>
            <span>Password: <code className="bg-white px-1.5 py-0.5 rounded border border-slate-300 font-mono font-bold text-blue-700">admin123</code></span>
            <p className="text-[10px] text-slate-400 mt-1">* Password dapat diganti setelah Anda login.</p>
          </div>

          <div className="mt-5 text-center">
            <a href="/" className="text-xs text-slate-500 hover:text-blue-600 transition">
              ← Kembali ke Beranda Utama
            </a>
          </div>
        </div>
      </div>
    );
  }

  // ====================================================
  // VIEW: AUTHENTICATED ADMIN PANEL
  // ====================================================
  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      {/* Header Admin */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
              <span>Admin Terverifikasi</span>
            </span>
            <span className="text-xs text-slate-500">Jam Perangkat: <b>{currentRealTime || '--:--:--'} WIB</b></span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 mt-1">
            Setting Room Kompetisi & Ujian Serentak
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Atur judul perlombaan, paket bank soal, jam buka (mulai), dan jam tutup (selesai) secara dinamis.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a
            href="/kompetisi"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition shadow-sm shrink-0"
          >
            <span>Buka Room Peserta</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <button
            type="button"
            onClick={() => setShowChangePasswordModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
            title="Ganti Password Admin"
          >
            <KeyRound className="w-3.5 h-3.5 text-slate-600" />
            <span>Ganti Password</span>
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition"
            title="Keluar dari Panel Admin"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-600" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Modal Ganti Password Admin */}
      {showChangePasswordModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-blue-600" />
                <span>Ganti Password Admin</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowChangePasswordModal(false);
                  setChangePasswordMsg(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-3 mt-4">
              {changePasswordMsg && (
                <div
                  className={`p-2.5 rounded-lg text-xs font-semibold flex items-center gap-2 ${
                    changePasswordMsg.isError
                      ? 'bg-rose-50 border border-rose-200 text-rose-700'
                      : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  }`}
                >
                  {changePasswordMsg.isError ? (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  )}
                  <span>{changePasswordMsg.text}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Password Baru (Min 4 Karakter)
                </label>
                <input
                  type="password"
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-900"
                  placeholder="Password baru..."
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Konfirmasi Password Baru
                </label>
                <input
                  type="password"
                  value={confirmPasswordInput}
                  onChange={(e) => setConfirmPasswordInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-900"
                  placeholder="Ulangi password baru..."
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowChangePasswordModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition shadow-xs"
                >
                  Simpan Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Live Status Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Clock className="w-5 h-5 text-slate-500" />
          <div>
            <span className="text-xs text-slate-500 block">Status Room Saat Ini:</span>
            <span className={`text-xs font-bold px-2.5 py-0.5 rounded border inline-block mt-0.5 ${phaseBadge[currentPhase]}`}>
              {phaseLabel[currentPhase]}
            </span>
          </div>
        </div>

        <div className="text-xs text-slate-600 sm:text-right">
          <span>Jadwal Aktif: </span>
          <b className="text-slate-900">{config.startTime} s/d {config.endTime} WIB</b>
          <span className="block text-[11px] text-slate-500">Tanggal: {config.examDate}</span>
        </div>
      </div>

      {/* Preset Cepat Demo */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-4 sm:p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-blue-700" />
          <h2 className="text-xs sm:text-sm font-bold text-blue-900">
            Tombol Preset Cepat (Uji Coba & Demo Langsung)
          </h2>
        </div>
        <p className="text-xs text-blue-800/80 leading-relaxed">
          Gunakan tombol di bawah ini untuk mengubah jadwal room dalam 1-klik tanpa perlu menghitung jam secara manual:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-1">
          <button
            type="button"
            onClick={handlePresetStandard}
            className="p-2.5 bg-white hover:bg-blue-600 hover:text-white text-slate-800 text-xs font-semibold rounded-lg border border-blue-200 transition text-left shadow-2xs"
          >
            <span className="font-bold block text-blue-700 group-hover:text-white">12:00 - 13:00 Hari Ini</span>
            <span className="text-[11px] text-slate-500">Sesuai Permintaan Resmi</span>
          </button>

          <button
            type="button"
            onClick={handlePresetStartNow}
            className="p-2.5 bg-white hover:bg-emerald-600 hover:text-white text-slate-800 text-xs font-semibold rounded-lg border border-blue-200 transition text-left shadow-2xs"
          >
            <span className="font-bold block text-emerald-700">Mulai Sekarang (15 Mnt)</span>
            <span className="text-[11px] text-slate-500">Langsung Buka Soal CBT</span>
          </button>

          <button
            type="button"
            onClick={handlePresetStartIn1Min}
            className="p-2.5 bg-white hover:bg-amber-600 hover:text-white text-slate-800 text-xs font-semibold rounded-lg border border-blue-200 transition text-left shadow-2xs"
          >
            <span className="font-bold block text-amber-700">Mulai 1 Menit Lagi</span>
            <span className="text-[11px] text-slate-500">Tes Countdown Lobby</span>
          </button>

          <button
            type="button"
            onClick={handlePresetFinished}
            className="p-2.5 bg-white hover:bg-indigo-600 hover:text-white text-slate-800 text-xs font-semibold rounded-lg border border-blue-200 transition text-left shadow-2xs"
          >
            <span className="font-bold block text-indigo-700">Selesai (Pengumuman)</span>
            <span className="text-[11px] text-slate-500">Lihat Leaderboard Juara</span>
          </button>
        </div>
      </div>

      {/* Form Konfigurasi Dinamis */}
      <form onSubmit={handleSave} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Settings className="w-4 h-4 text-blue-600" />
            <span>Form Pengaturan Room Dinamis</span>
          </h2>
          {savedSuccess && (
            <span className="text-xs font-bold text-emerald-700 inline-flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Perubahan Disimpan!
            </span>
          )}
        </div>

        {/* Judul & Deskripsi */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Judul Kompetisi / Nama Ujian
            </label>
            <input
              type="text"
              value={config.title}
              onChange={(e) => setConfig({ ...config, title: e.target.value })}
              className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-slate-900 font-medium"
              placeholder="Contoh: Olimpiade Sains & Matematika SD Serentak 2026"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Deskripsi Perlombaan
            </label>
            <textarea
              rows={2}
              value={config.description}
              onChange={(e) => setConfig({ ...config, description: e.target.value })}
              className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-slate-900"
              placeholder="Tuliskan keterangan tata tertib singkat untuk peserta..."
            />
          </div>
        </div>

        {/* Pilihan Paket Soal */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Pilih Paket Bank Soal (Dari 22 Paket Tersedia)
            </label>
            <select
              value={config.quizId}
              onChange={(e) => {
                const selected = quizzes.find((q) => q.id === e.target.value);
                setConfig({
                  ...config,
                  quizId: e.target.value,
                  category: selected?.data.category || config.category,
                  level: selected?.data.level || config.level,
                });
              }}
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-slate-900 font-medium bg-white"
            >
              {quizzes.map((q) => (
                <option key={q.id} value={q.id}>
                  [{q.data.level}] {q.data.title} ({q.data.questions.length} Soal)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Jumlah Butir Soal per Peserta
            </label>
            <select
              value={config.totalQuestions}
              onChange={(e) => setConfig({ ...config, totalQuestions: Number(e.target.value) })}
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-slate-900 font-medium bg-white"
            >
              <option value={10}>10 Soal (Format Singkat)</option>
              <option value={15}>15 Soal (Standar Kompetisi)</option>
              <option value={20}>20 Soal (Ujian Lengkap)</option>
            </select>
          </div>
        </div>

        {/* Waktu Pelaksanaan */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
            Jadwal Waktu Serentak
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Tanggal Ujian (YYYY-MM-DD)
              </label>
              <input
                type="date"
                value={config.examDate}
                onChange={(e) => setConfig({ ...config, examDate: e.target.value })}
                className="w-full px-3 py-1.5 text-xs sm:text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-900 bg-white"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Jam Buka / Mulai (WIB)
              </label>
              <input
                type="time"
                value={config.startTime}
                onChange={(e) => setConfig({ ...config, startTime: e.target.value })}
                className="w-full px-3 py-1.5 text-xs sm:text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-900 bg-white font-mono font-bold"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Jam Selesai / Tutup (WIB)
              </label>
              <input
                type="time"
                value={config.endTime}
                onChange={(e) => setConfig({ ...config, endTime: e.target.value })}
                className="w-full px-3 py-1.5 text-xs sm:text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-900 bg-white font-mono font-bold"
                required
              />
            </div>
          </div>
          <p className="text-[11px] text-slate-500">
            * Catatan: Peserta yang masuk setelah Jam Mulai tetap akan berakhir serentak pada Jam Selesai.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={handleResetData}
            className="px-3.5 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition border border-rose-200 inline-flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Data Peserta</span>
          </button>

          <button
            type="submit"
            className="px-5 py-2 text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition shadow-sm inline-flex items-center gap-1.5"
          >
            <Save className="w-4 h-4" />
            <span>Simpan Pengaturan Room</span>
          </button>
        </div>
      </form>

      {/* Daftar Peserta Asli Terdaftar (Tanpa Dummy) */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              <span>Daftar Peserta Asli Ujian ({participantsList.length} Peserta)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Hanya menampilkan data peserta asli yang telah mengumpulkan lembar jawaban (100% data riil tanpa dummy).
            </p>
          </div>
          {participantsList.length > 0 && (
            <button
              type="button"
              onClick={handleResetData}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 inline-flex items-center gap-1 self-start sm:self-auto"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Kosongkan Semua Peserta</span>
            </button>
          )}
        </div>

        {participantsList.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">Belum Ada Peserta yang Mengumpulkan</p>
            <p className="text-slate-400 mt-0.5">Data peserta asli akan otomatis muncul di sini begitu ada siswa yang mengumpulkan ujian.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4 text-center">Peringkat</th>
                  <th className="py-3 px-4">Nama Peserta</th>
                  <th className="py-3 px-4">Asal Sekolah</th>
                  <th className="py-3 px-4 text-center">Jawaban Benar</th>
                  <th className="py-3 px-4 text-center">Waktu Pengerjaan</th>
                  <th className="py-3 px-4 text-center">Waktu Selesai</th>
                  <th className="py-3 px-4 text-right">Skor Akhir</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {participantsList.map((p, idx) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 text-center font-bold">
                      <span
                        className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                          idx === 0
                            ? 'bg-amber-400 text-white'
                            : idx === 1
                            ? 'bg-slate-300 text-slate-800'
                            : idx === 2
                            ? 'bg-amber-600 text-white'
                            : 'text-slate-600'
                        }`}
                      >
                        {idx + 1}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">{p.name}</td>
                    <td className="py-3 px-4 text-slate-600">{p.school}</td>
                    <td className="py-3 px-4 text-center text-slate-700">
                      {p.correctCount}/{p.totalQuestions}
                    </td>
                    <td className="py-3 px-4 text-center text-slate-600">
                      {Math.floor(p.timeSpentSeconds / 60)}m {p.timeSpentSeconds % 60}s
                    </td>
                    <td className="py-3 px-4 text-center text-slate-500 font-mono text-[11px]">
                      {p.submittedAt} WIB
                    </td>
                    <td className="py-3 px-4 text-right font-black text-sm text-blue-700">
                      {p.score}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleDeleteParticipant(p.id, p.name)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 transition rounded hover:bg-rose-50"
                        title="Hapus peserta ini"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompetitionAdmin;
