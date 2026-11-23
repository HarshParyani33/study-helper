import { z } from 'zod';

export const submitReviewSchema = z.object({
  questionId: z.string().min(1, 'Question ID is required'),
  rating: z.number().int().min(1).max(4), // 1: Again, 2: Hard, 3: Good, 4: Easy
  userAnswer: z.string().optional().default(''),
  evaluation: z.string().optional().default(''),
  elapsedMs: z.number().nonnegative().optional().default(0),
});

export const evaluateAnswerSchema = z.object({
  questionId: z.string().min(1, 'Question ID is required'),
  userAnswer: z.string().min(1, 'User answer is required to evaluate'),
});

