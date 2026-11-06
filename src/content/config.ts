import { defineCollection, z } from 'astro:content';

export const questionOptionSchema = z.object({
  id: z.enum(['A', 'B', 'C', 'D', 'E']),
  text: z.string(),
});

export const questionSchema = z.object({
  id: z.union([z.number(), z.string()]),
  questionText: z.string(),
  options: z.array(questionOptionSchema).min(2),
  correctAnswer: z.string(),
  explanation: z.string(),
  difficulty: z.enum(['Mudah', 'Sedang', 'Sulit']).default('Mudah'),
});

export const quizSchema = z.object({
  id: z.string(),
  title: z.string(),
  category: z.string(), // e.g. 'matematika', 'ipa', 'bahasa', 'tematik'
  categoryName: z.string().optional(),
  description: z.string().optional(),
  level: z.string().default('SD'),
  difficulty: z.enum(['Mudah', 'Sedang', 'Sulit']).default('Sedang'),
  duration: z.number().positive(), // in minutes
  shuffleCount: z.number().optional().default(5), // jumlah soal per sesi acak
  questions: z.array(questionSchema).min(1),
});

const quizCollection = defineCollection({
  type: 'data',
  schema: quizSchema,
});

export const collections = {
  quiz: quizCollection,
};

export type QuestionOption = z.infer<typeof questionOptionSchema>;
export type Question = z.infer<typeof questionSchema>;
export type Quiz = z.infer<typeof quizSchema>;
