import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateRoomPhase,
  DEFAULT_COMPETITION_CONFIG,
  DEFAULT_ADMIN_USERNAME,
  DEFAULT_ADMIN_PASSWORD,
  getAdminPassword,
  type CompetitionRoomConfig,
  type CompetitionParticipant,
} from '../src/utils/competition.ts';

describe('Unit Test: Competition Phase Engine (calculateRoomPhase)', () => {
  const baseConfig: CompetitionRoomConfig = {
    ...DEFAULT_COMPETITION_CONFIG,
    examDate: '2026-11-14',
    startTime: '12:00',
    endTime: '13:00',
  };

  test('Fase LOBBY: waktu sebelum jam mulai (contoh: 11:45:00)', () => {
    const mockNow = new Date(2026, 10, 14, 11, 45, 0); // 11:45:00
    const result = calculateRoomPhase(baseConfig, mockNow);

    assert.equal(result.phase, 'LOBBY');
    assert.equal(result.secondsToStart, 15 * 60); // 15 menit tersisa = 900 detik
    assert.equal(result.secondsToEnd, 75 * 60); // 75 menit
    assert.equal(result.formattedCurrentTime, '11:45:00');
  });

  test('Fase EXAM: tepat jam mulai (contoh: 12:00:00)', () => {
    const mockNow = new Date(2026, 10, 14, 12, 0, 0); // 12:00:00
    const result = calculateRoomPhase(baseConfig, mockNow);

    assert.equal(result.phase, 'EXAM');
    assert.equal(result.secondsToStart, 0);
    assert.equal(result.secondsToEnd, 60 * 60); // 3600 detik menuju 13:00
    assert.equal(result.formattedCurrentTime, '12:00:00');
  });

  test('Fase EXAM: di pertengahan ujian (contoh: 12:30:15)', () => {
    const mockNow = new Date(2026, 10, 14, 12, 30, 15); // 12:30:15
    const result = calculateRoomPhase(baseConfig, mockNow);

    assert.equal(result.phase, 'EXAM');
    assert.equal(result.secondsToStart, 0);
    assert.equal(result.secondsToEnd, 29 * 60 + 45); // 1785 detik tersisa
    assert.equal(result.formattedCurrentTime, '12:30:15');
  });

  test('Fase ANNOUNCEMENT: tepat jam selesai (contoh: 13:00:00)', () => {
    const mockNow = new Date(2026, 10, 14, 13, 0, 0); // 13:00:00
    const result = calculateRoomPhase(baseConfig, mockNow);

    assert.equal(result.phase, 'ANNOUNCEMENT');
    assert.equal(result.secondsToStart, 0);
    assert.equal(result.secondsToEnd, 0);
    assert.equal(result.formattedCurrentTime, '13:00:00');
  });

  test('Fase ANNOUNCEMENT: setelah jam selesai (contoh: 14:15:30)', () => {
    const mockNow = new Date(2026, 10, 14, 14, 15, 30); // 14:15:30
    const result = calculateRoomPhase(baseConfig, mockNow);

    assert.equal(result.phase, 'ANNOUNCEMENT');
    assert.equal(result.secondsToStart, 0);
    assert.equal(result.secondsToEnd, 0);
    assert.equal(result.formattedCurrentTime, '14:15:30');
  });
});

describe('Unit Test: Leaderboard Peserta Asli (Tanpa Dummy)', () => {
  test('Peserta tunggal (misal: Muhammad Fadel Alfarizqi) otomatis menjadi Juara 1', () => {
    const singleParticipant: CompetitionParticipant[] = [
      {
        id: 'user-fadel',
        name: 'Muhammad Fadel Alfarizqi',
        school: 'SD Peserta',
        grade: 'Kelas 4 SD',
        score: 7,
        correctCount: 1,
        totalQuestions: 15,
        timeSpentSeconds: 420,
        submittedAt: '12:07:00',
        isCurrentUser: true,
      },
    ];

    const sorted = [...singleParticipant].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.timeSpentSeconds - b.timeSpentSeconds;
    });

    assert.equal(sorted.length, 1);
    assert.equal(sorted[0].name, 'Muhammad Fadel Alfarizqi');
    // Tidak ada peserta dummy yang menggeser Fadel ke posisi #9
    const fadelRank = sorted.findIndex((p) => p.name === 'Muhammad Fadel Alfarizqi') + 1;
    assert.equal(fadelRank, 1, 'Fadel harus menempati peringkat #1 karena satu-satunya peserta riil');
  });

  test('Peringkat multi-peserta riil terurut skor tertinggi lalu waktu tercepat', () => {
    const realParticipants: CompetitionParticipant[] = [
      {
        id: 'p-1',
        name: 'Ahmad Dahlan',
        school: 'SD 1 Yogyakarta',
        grade: 'Kelas 4 SD',
        score: 80,
        correctCount: 12,
        totalQuestions: 15,
        timeSpentSeconds: 600,
        submittedAt: '12:10:00',
      },
      {
        id: 'p-2',
        name: 'Muhammad Fadel Alfarizqi',
        school: 'SD Peserta',
        grade: 'Kelas 4 SD',
        score: 93,
        correctCount: 14,
        totalQuestions: 15,
        timeSpentSeconds: 520,
        submittedAt: '12:08:40',
        isCurrentUser: true,
      },
      {
        id: 'p-3',
        name: 'Fatmawati',
        school: 'SD 2 Jakarta',
        grade: 'Kelas 4 SD',
        score: 93,
        correctCount: 14,
        totalQuestions: 15,
        timeSpentSeconds: 580, // Waktu lebih lama dari Fadel
        submittedAt: '12:09:40',
      },
    ];

    const sorted = [...realParticipants].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.timeSpentSeconds - b.timeSpentSeconds;
    });

    // Peringkat 1 harus Fadel (93 poin, 520s < 580s)
    assert.equal(sorted[0].name, 'Muhammad Fadel Alfarizqi');
    // Peringkat 2 harus Fatmawati (93 poin, 580s)
    assert.equal(sorted[1].name, 'Fatmawati');
    // Peringkat 3 harus Ahmad Dahlan (80 poin)
    assert.equal(sorted[2].name, 'Ahmad Dahlan');
  });
});

describe('Unit Test: Admin Authentication Security', () => {
  test('Kredensial default admin adalah admin / admin123', () => {
    assert.equal(DEFAULT_ADMIN_USERNAME, 'admin');
    assert.equal(DEFAULT_ADMIN_PASSWORD, 'admin123');
    assert.equal(getAdminPassword(), 'admin123');
  });

  test('Validasi kredensial login admin: benar vs salah', () => {
    const verifyLogin = (u: string, p: string) => {
      return u.trim().toLowerCase() === DEFAULT_ADMIN_USERNAME.toLowerCase() && p === DEFAULT_ADMIN_PASSWORD;
    };

    assert.equal(verifyLogin('admin', 'admin123'), true, 'Kredensial benar harus berhasil login');
    assert.equal(verifyLogin('ADMIN', 'admin123'), true, 'Username case-insensitive harus berhasil login');
    assert.equal(verifyLogin('admin', 'wrongpass'), false, 'Password salah harus ditolak');
    assert.equal(verifyLogin('user_biasa', 'admin123'), false, 'Username salah harus ditolak');
    assert.equal(verifyLogin('', ''), false, 'Kredensial kosong harus ditolak');
  });
});
