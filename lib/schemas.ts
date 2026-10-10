import { z } from 'zod';

export const syllabusSchema = z.object({
  roleTitle: z.string().min(2),
  estimatedWeeks: z.number().int().min(1).max(52),
  modules: z.array(z.object({
    moduleId: z.string(),
    title: z.string().min(2),
    objective: z.string().min(10),
    keyTopics: z.array(z.string()).min(2).max(8),
    estimatedHours: z.number().min(1).max(100),
  })).length(4),
});

export const interviewSchema = z.object({
  score: z.number().min(1).max(10),
  strengths: z.array(z.string()).min(1).max(5),
  blindSpots: z.array(z.string()).min(1).max(5),
  followUpQuestion: z.string().min(5),
});

export const quizSchema = z.object({
  title: z.string().min(3),
  questions: z.array(z.object({
    question: z.string().min(8),
    options: z.array(z.string()).length(4),
    correctAnswer: z.number().int().min(0).max(3),
    explanation: z.string().min(8),
  })).length(5),
});

export type Syllabus = z.infer<typeof syllabusSchema>;
export type InterviewEvaluation = z.infer<typeof interviewSchema>;
export type Quiz = z.infer<typeof quizSchema>;
