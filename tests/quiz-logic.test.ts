import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

describe('Unit Test: Quiz Scoring, Passing & Certificate Rules', () => {
  // Formula nilai: Math.round((correct / total) * 100)
  function calculateScore(correct: number, total: number): number {
    if (total <= 0) return 0;
    return Math.round((correct / total) * 100);
  }

  // Kriteria kelulusan (>= 70%)
  function isPassed(score: number): boolean {
    return score >= 70;
  }

  // Syarat buka Piagam Penghargaan digital (>= 90%)
  function isCertificateUnlocked(score: number): boolean {
    return score >= 90;
  }

  // Predikat nilai
  function getScorePredicate(score: number): string {
    if (score >= 90) return 'Sangat Memuaskan';
    if (score >= 80) return 'Memuaskan';
    if (score >= 70) return 'Cukup (Lulus)';
    return 'Perlu Remedial';
  }

  test('Perhitungan skor 100% (sempurna)', () => {
    const score = calculateScore(10, 10);
    assert.equal(score, 100);
    assert.equal(isPassed(score), true);
    assert.equal(isCertificateUnlocked(score), true);
    assert.equal(getScorePredicate(score), 'Sangat Memuaskan');
  });

  test('Perhitungan skor 90% (syarat minimal piagam)', () => {
    const score = calculateScore(9, 10);
    assert.equal(score, 90);
    assert.equal(isPassed(score), true);
    assert.equal(isCertificateUnlocked(score), true);
    assert.equal(getScorePredicate(score), 'Sangat Memuaskan');
  });

  test('Perhitungan skor 80% (lulus, piagam terkunci)', () => {
    const score = calculateScore(8, 10);
    assert.equal(score, 80);
    assert.equal(isPassed(score), true);
    assert.equal(isCertificateUnlocked(score), false);
    assert.equal(getScorePredicate(score), 'Memuaskan');
  });

  test('Perhitungan skor 70% (KKM minimal batas lulus)', () => {
    const score = calculateScore(7, 10);
    assert.equal(score, 70);
    assert.equal(isPassed(score), true);
    assert.equal(isCertificateUnlocked(score), false);
    assert.equal(getScorePredicate(score), 'Cukup (Lulus)');
  });

  test('Perhitungan skor 60% (di bawah KKM, remedial)', () => {
    const score = calculateScore(6, 10);
    assert.equal(score, 60);
    assert.equal(isPassed(score), false);
    assert.equal(isCertificateUnlocked(score), false);
    assert.equal(getScorePredicate(score), 'Perlu Remedial');
  });

  test('Perhitungan skor pecahan dibulatkan dengan benar (misal: 11 dari 15 soal = 73%)', () => {
    const score = calculateScore(11, 15);
    // 11 / 15 * 100 = 73.333... -> dibulatkan jadi 73
    assert.equal(score, 73);
    assert.equal(isPassed(score), true);
  });

  test('Perhitungan skor 14 dari 15 soal (93% -> piagam terbuka)', () => {
    const score = calculateScore(14, 15);
    // 14 / 15 * 100 = 93.333... -> 93
    assert.equal(score, 93);
    assert.equal(isCertificateUnlocked(score), true);
  });
});

describe('Unit Test: Question Slicing & Session Configuration', () => {
  const mockBankSoal = Array.from({ length: 20 }, (_, i) => ({
    id: `q-${i + 1}`,
    text: `Soal #${i + 1}`,
  }));

  test('Pengambilan paket 10 soal standar', () => {
    const sliced = mockBankSoal.slice(0, 10);
    assert.equal(sliced.length, 10);
  });

  test('Pengambilan paket 15 soal kompetisi', () => {
    const sliced = mockBankSoal.slice(0, 15);
    assert.equal(sliced.length, 15);
  });

  test('Pengambilan paket seluruh soal (20 butir)', () => {
    const sliced = mockBankSoal.slice(0, 20);
    assert.equal(sliced.length, 20);
  });
});
