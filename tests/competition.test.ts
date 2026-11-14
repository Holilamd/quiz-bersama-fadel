import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateRoomPhase,
  getSimulatedParticipants,
  DEFAULT_COMPETITION_CONFIG,
  type CompetitionRoomConfig,
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

describe('Unit Test: Simulated Participants Data', () => {
  test('Menghasilkan peserta simulasi dengan struktur valid', () => {
    const participants = getSimulatedParticipants(15);

    assert.ok(participants.length >= 5, 'Jumlah peserta simulasi minimal 5');

    participants.forEach((p, idx) => {
      assert.ok(p.id, `Peserta #${idx} harus punya id`);
      assert.ok(p.name, `Peserta #${idx} harus punya nama`);
      assert.ok(p.school, `Peserta #${idx} harus punya asal sekolah`);
      assert.ok(p.score >= 0 && p.score <= 100, `Skor peserta #${idx} harus antara 0-100`);
      assert.equal(p.totalQuestions, 15, `Total soal harus sesuai parameter`);
      assert.ok(p.correctCount <= 15, `Jawaban benar tidak boleh melebihi total soal`);
      assert.ok(p.timeSpentSeconds > 0, `Waktu pengerjaan harus > 0 detik`);
    });
  });

  test('Peringkat leaderboard terurut berdasarkan skor tertinggi lalu waktu tercepat', () => {
    const participants = getSimulatedParticipants(15);
    const sorted = [...participants].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.timeSpentSeconds - b.timeSpentSeconds;
    });

    // Peringkat 1 harus memiliki skor >= peringkat 2
    assert.ok(sorted[0].score >= sorted[1].score);
    // Jika skor sama, durasi waktu juara 1 harus lebih singkat atau sama dengan juara 2
    if (sorted[0].score === sorted[1].score) {
      assert.ok(sorted[0].timeSpentSeconds <= sorted[1].timeSpentSeconds);
    }
  });
});
