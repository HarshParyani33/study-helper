import { z } from 'zod';

export const createSubjectSchema = z.object({
  name: z.string().min(1, 'Subject name is required').max(100),
  description: z.string().max(1000).optional().default(''),
});

export const updateSubjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(1000).optional(),
});

