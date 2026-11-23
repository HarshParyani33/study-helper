import { z } from 'zod';

export const createQuestionSchema = z.object({
  conceptId: z.string().min(1, 'Concept ID is required'),
  subjectId: z.string().optional(),
  type: z.enum(['recall', 'explanation', 'comparison', 'application', 'interview', 'scenario', 'cross-topic']).default('recall'),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  front: z.string().min(3, 'Question front is required'),
  back: z.string().min(1, 'Question answer is required'),
  evaluationCriteria: z.array(z.string()).optional().default([]),
});

export const updateQuestionSchema = createQuestionSchema.partial().omit({ conceptId: true });

