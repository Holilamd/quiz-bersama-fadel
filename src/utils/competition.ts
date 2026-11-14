export interface CompetitionRoomConfig {
  id: string;
  title: string;
  description: string;
  quizId: string;
  category: string;
  level: string;
  examDate: string; // e.g. "2026-11-14"
  startTime: string; // e.g. "12:00"
  endTime: string; // e.g. "13:00"
  totalQuestions: number; // e.g. 15
  isActive: boolean;
}

export interface CompetitionParticipant {
  id: string;
  name: string;
  school: string;
  grade: string;
  score: number;
  correctCount: number;
  totalQuestions: number;
  timeSpentSeconds: number;
  submittedAt: string;
  isCurrentUser?: boolean;
}

export const DEFAULT_COMPETITION_CONFIG: CompetitionRoomConfig = {
  id: 'room-sd-nasional-01',
  title: 'Olimpiade Sains & Matematika SD Serentak',
  description: 'Ujian serentak kompetisi tingkat SD dengan penilaian peringkat otomatis berdasarkan nilai dan kecepatan pengerjaan.',
  quizId: 'mat-kelas-4-statistika-dan-kpk',
  category: 'matematika',
  level: 'Kelas 4 SD',
  examDate: new Date().toISOString().split('T')[0],
  startTime: '12:00',
  endTime: '13:00',
  totalQuestions: 15,
  isActive: true,
};

const ROOM_STORAGE_KEY = 'asah_otak_competition_room_config';
const PARTICIPANTS_STORAGE_KEY = 'asah_otak_competition_participants';
const ADMIN_AUTH_KEY = 'asah_otak_admin_auth';
const ADMIN_PASSWORD_KEY = 'asah_otak_admin_password';

export const DEFAULT_ADMIN_USERNAME = 'admin';
export const DEFAULT_ADMIN_PASSWORD = 'admin123';

export function getAdminPassword(): string {
  if (typeof window === 'undefined') return DEFAULT_ADMIN_PASSWORD;
  try {
    return localStorage.getItem(ADMIN_PASSWORD_KEY) || DEFAULT_ADMIN_PASSWORD;
  } catch {
    return DEFAULT_ADMIN_PASSWORD;
  }
}

export function setAdminPassword(newPassword: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ADMIN_PASSWORD_KEY, newPassword);
  } catch {}
}

export function isAdminAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const sessionAuth = sessionStorage.getItem(ADMIN_AUTH_KEY);
    if (sessionAuth === 'true') return true;
    const localAuth = localStorage.getItem(ADMIN_AUTH_KEY);
    if (localAuth === 'true') return true;
  } catch {}
  return false;
}

export function setAdminAuthenticated(auth: boolean, remember: boolean = false): void {
  if (typeof window === 'undefined') return;
  try {
    if (auth) {
      sessionStorage.setItem(ADMIN_AUTH_KEY, 'true');
      if (remember) {
        localStorage.setItem(ADMIN_AUTH_KEY, 'true');
      }
    } else {
      sessionStorage.removeItem(ADMIN_AUTH_KEY);
      localStorage.removeItem(ADMIN_AUTH_KEY);
    }
  } catch {}
}

export function getCompetitionConfig(): CompetitionRoomConfig {
  if (typeof window === 'undefined') return DEFAULT_COMPETITION_CONFIG;
  try {
    const raw = localStorage.getItem(ROOM_STORAGE_KEY);
    if (raw) {
      return { ...DEFAULT_COMPETITION_CONFIG, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.warn('Gagal membaca setting room:', e);
  }
  return DEFAULT_COMPETITION_CONFIG;
}

export function saveCompetitionConfig(config: CompetitionRoomConfig): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ROOM_STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.warn('Gagal menyimpan setting room:', e);
  }
}

export function getStoredParticipants(): CompetitionParticipant[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(PARTICIPANTS_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {}
  return [];
}

export function saveParticipantResult(participant: CompetitionParticipant): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = getStoredParticipants();
    const normalizedName = participant.name.trim().toLowerCase();
    // Hapus data lama peserta ini jika nama atau ID-nya sudah ada
    const filtered = existing.filter(
      (p) => p.id !== participant.id && p.name.trim().toLowerCase() !== normalizedName
    );
    filtered.push(participant);
    localStorage.setItem(PARTICIPANTS_STORAGE_KEY, JSON.stringify(filtered));
  } catch (e) {}
}

export function deleteStoredParticipant(participantId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = getStoredParticipants().filter((p) => p.id !== participantId);
    localStorage.setItem(PARTICIPANTS_STORAGE_KEY, JSON.stringify(existing));
  } catch (e) {}
}

export function resetStoredParticipants(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(PARTICIPANTS_STORAGE_KEY);
  } catch (e) {}
}

// Check room status based on real device time vs configured startTime & endTime
export type RoomPhase = 'LOBBY' | 'EXAM' | 'ANNOUNCEMENT';

export function calculateRoomPhase(
  config: CompetitionRoomConfig,
  currentDate: Date = new Date()
): {
  phase: RoomPhase;
  secondsToStart: number;
  secondsToEnd: number;
  formattedCurrentTime: string;
} {
  const [startH, startM] = config.startTime.split(':').map(Number);
  const [endH, endM] = config.endTime.split(':').map(Number);

  const [year, month, day] = config.examDate.split('-').map(Number);

  const startDateTime = new Date(year, month - 1, day, startH, startM, 0, 0);
  const endDateTime = new Date(year, month - 1, day, endH, endM, 0, 0);

  const nowMs = currentDate.getTime();
  const startMs = startDateTime.getTime();
  const endMs = endDateTime.getTime();

  const secondsToStart = Math.max(0, Math.floor((startMs - nowMs) / 1000));
  const secondsToEnd = Math.max(0, Math.floor((endMs - nowMs) / 1000));

  let phase: RoomPhase = 'LOBBY';
  if (nowMs < startMs) {
    phase = 'LOBBY';
  } else if (nowMs >= startMs && nowMs < endMs) {
    phase = 'EXAM';
  } else {
    phase = 'ANNOUNCEMENT';
  }

  const hours = currentDate.getHours().toString().padStart(2, '0');
  const minutes = currentDate.getMinutes().toString().padStart(2, '0');
  const seconds = currentDate.getSeconds().toString().padStart(2, '0');
  const formattedCurrentTime = `${hours}:${minutes}:${seconds}`;

  return {
    phase,
    secondsToStart,
    secondsToEnd,
    formattedCurrentTime,
  };
}
