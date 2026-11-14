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
    const existing = getStoredParticipants().filter((p) => p.id !== participant.id && !p.isCurrentUser);
    existing.push(participant);
    localStorage.setItem(PARTICIPANTS_STORAGE_KEY, JSON.stringify(existing));
  } catch (e) {}
}

export function resetStoredParticipants(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(PARTICIPANTS_STORAGE_KEY);
  } catch (e) {}
}

// Generate realistic simulated competition participants
export function getSimulatedParticipants(totalQ: number = 15): CompetitionParticipant[] {
  return [
    {
      id: 'sim-1',
      name: 'Nadia Putri Amanda',
      school: 'SD Mentari Bangsa Jakarta',
      grade: 'Kelas 4 SD',
      score: 100,
      correctCount: totalQ,
      totalQuestions: totalQ,
      timeSpentSeconds: 1240, // 20m 40s
      submittedAt: '12:20:40',
    },
    {
      id: 'sim-2',
      name: 'Rafi Alamsyah',
      school: 'SD Pertiwi Bandung',
      grade: 'Kelas 4 SD',
      score: 95,
      correctCount: Math.round(totalQ * 0.95),
      totalQuestions: totalQ,
      timeSpentSeconds: 1480,
      submittedAt: '12:24:40',
    },
    {
      id: 'sim-3',
      name: 'Kezia Aurelia',
      school: 'SD Harapan Bangsa Surabaya',
      grade: 'Kelas 4 SD',
      score: 93,
      correctCount: Math.round(totalQ * 0.93),
      totalQuestions: totalQ,
      timeSpentSeconds: 1650,
      submittedAt: '12:27:30',
    },
    {
      id: 'sim-4',
      name: 'Dimas Bagaskara',
      school: 'SD Cendekia Yogyakarta',
      grade: 'Kelas 4 SD',
      score: 87,
      correctCount: Math.round(totalQ * 0.87),
      totalQuestions: totalQ,
      timeSpentSeconds: 1820,
      submittedAt: '12:30:20',
    },
    {
      id: 'sim-5',
      name: 'Aisyah Zahra',
      school: 'SD Islam Terpadu Semarang',
      grade: 'Kelas 4 SD',
      score: 85,
      correctCount: Math.round(totalQ * 0.85),
      totalQuestions: totalQ,
      timeSpentSeconds: 2100,
      submittedAt: '12:35:00',
    },
    {
      id: 'sim-6',
      name: 'Christian Wijaya',
      school: 'SD Santo Yoseph Medan',
      grade: 'Kelas 4 SD',
      score: 80,
      correctCount: Math.round(totalQ * 0.80),
      totalQuestions: totalQ,
      timeSpentSeconds: 2240,
      submittedAt: '12:37:20',
    },
    {
      id: 'sim-7',
      name: 'Fathir Nugroho',
      school: 'SD Negeri 1 Denpasar',
      grade: 'Kelas 4 SD',
      score: 75,
      correctCount: Math.round(totalQ * 0.75),
      totalQuestions: totalQ,
      timeSpentSeconds: 2450,
      submittedAt: '12:40:50',
    },
    {
      id: 'sim-8',
      name: 'Siti Rahmawati',
      school: 'SD Teladan Makassar',
      grade: 'Kelas 4 SD',
      score: 70,
      correctCount: Math.round(totalQ * 0.70),
      totalQuestions: totalQ,
      timeSpentSeconds: 2700,
      submittedAt: '12:45:00',
    },
  ];
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
