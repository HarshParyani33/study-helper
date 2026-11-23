import { z } from 'zod';

export const createSourceSchema = z.object({
  subjectId: z.string().min(1, 'Subject ID is required'),
  title: z.string().min(1, 'Source title is required'),
  type: z.enum(['notes', 'pdf', 'transcript', 'article', 'screenshot', 'code']).default('notes'),
  contentHash: z.string().min(1, 'Content hash is required'),
  fileReference: z.string().optional().default(''),
  rawContent: z.string().optional().default(''),
});

