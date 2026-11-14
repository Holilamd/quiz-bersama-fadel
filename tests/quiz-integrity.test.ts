import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('Unit Test: Bank Soal & Content Integrity (22 Paket Soal)', () => {
  const quizDir = path.resolve('src/content/quiz');
  const files = fs.readdirSync(quizDir).filter((f) => f.endsWith('.json'));

  test('Harus terdapat tepat 22 paket bank soal JSON', () => {
    assert.equal(files.length, 22, `Jumlah paket soal harus 22, ditemukan: ${files.length}`);
  });

  let totalQuestionsCount = 0;

  files.forEach((file) => {
    describe(`Validasi Paket: ${file}`, () => {
      const fullPath = path.join(quizDir, file);
      const raw = fs.readFileSync(fullPath, 'utf-8');
      let data: any;

      test('Format JSON valid', () => {
        assert.doesNotThrow(() => {
          data = JSON.parse(raw);
        }, `File ${file} bukan format JSON valid`);
      });

      test('Memiliki metadata wajib (id, title, category, level, duration, questions)', () => {
        data = JSON.parse(raw);
        assert.ok(data.id && typeof data.id === 'string', `${file}: id harus string tidak kosong`);
        assert.ok(data.title && typeof data.title === 'string', `${file}: title harus string`);
        assert.ok(['matematika', 'ipa', 'bahasa', 'tematik'].includes(data.category), `${file}: kategori '${data.category}' tidak valid`);
        assert.ok(data.level && typeof data.level === 'string', `${file}: level harus string`);
        assert.ok(typeof data.duration === 'number' && data.duration > 0, `${file}: duration harus number positif`);
        assert.ok(Array.isArray(data.questions), `${file}: questions harus array`);
      });

      test('Memiliki tepat atau minimal 20 butir soal per paket', () => {
        data = JSON.parse(raw);
        assert.ok(
          data.questions.length >= 20,
          `${file}: harus punya minimal 20 soal, hanya ada ${data.questions.length}`
        );
        totalQuestionsCount += data.questions.length;
      });

      test('Setiap butir soal memiliki questionText, options (A-D), explanation, dan correctAnswer valid', () => {
        data = JSON.parse(raw);
        const questionIds = new Set<string | number>();

        data.questions.forEach((q: any, qIdx: number) => {
          // Cek ID unik
          assert.ok(q.id !== undefined && q.id !== null, `${file} Q#${qIdx}: ID tidak boleh kosong`);
          assert.ok(!questionIds.has(q.id), `${file}: Duplikat question ID '${q.id}'`);
          questionIds.add(q.id);

          // Cek teks soal
          assert.ok(
            q.questionText && q.questionText.trim().length > 0,
            `${file} Q#${qIdx}: questionText tidak boleh kosong`
          );

          // Cek opsi
          assert.ok(
            Array.isArray(q.options) && q.options.length >= 3,
            `${file} Q#${qIdx}: Minimal harus 3-4 pilihan jawaban`
          );

          const optionIds = new Set<string>();
          q.options.forEach((opt: any, optIdx: number) => {
            assert.ok(opt.id, `${file} Q#${qIdx} Opt#${optIdx}: Opsi harus punya ID (A, B, C, D)`);
            assert.ok(
              opt.text && opt.text.trim().length > 0,
              `${file} Q#${qIdx} Opt#${optIdx}: Teks opsi '${opt.id}' tidak boleh kosong`
            );
            assert.ok(!optionIds.has(opt.id), `${file} Q#${qIdx}: Duplikat option ID '${opt.id}'`);
            optionIds.add(opt.id);
          });

          // Cek correctAnswer valid dan ada dalam daftar opsi
          assert.ok(q.correctAnswer, `${file} Q#${qIdx}: correctAnswer wajib ada`);
          assert.ok(
            optionIds.has(q.correctAnswer),
            `${file} Q#${qIdx} ('${q.id}'): correctAnswer '${q.correctAnswer}' tidak ditemukan di opsi: [${Array.from(optionIds).join(', ')}]`
          );

          // Cek penjelasan pembahasan
          assert.ok(
            q.explanation && q.explanation.trim().length > 0,
            `${file} Q#${qIdx}: explanation wajib ada untuk pembahasan siswa`
          );
        });
      });
    });
  });

  test('Total bank soal akumulatif minimal 440 butir soal', () => {
    assert.ok(
      totalQuestionsCount >= 440,
      `Total seluruh bank soal harus >= 440, ditemukan: ${totalQuestionsCount}`
    );
  });
});
