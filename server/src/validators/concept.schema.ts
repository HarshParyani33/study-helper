import { z } from 'zod';

export const createConceptSchema = z.object({
  subjectId: z.string().min(1, 'Subject ID is required'),
  title: z.string().min(1, 'Concept title is required').max(200),
  slug: z.string().optional(),
  explanation: z.string().min(5, 'Explanation must be at least 5 characters'),
  importance: z.enum(['low', 'medium', 'high']).default('medium'),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  practicalExample: z.string().optional().default(''),
  commonMistakes: z.array(z.string()).optional().default([]),
  prerequisites: z.array(z.string()).optional().default([]),
  relatedConcepts: z.array(z.string()).optional().default([]),
  sourceIds: z.array(z.string()).optional().default([]),
});

export const updateConceptSchema = createConceptSchema.partial().omit({ subjectId: true });

