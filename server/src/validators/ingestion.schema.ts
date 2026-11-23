import { z } from 'zod';

export const rawIngestionSchema = z.object({
  subjectName: z.string().min(1, 'Subject name is required'),
  sourceTitle: z.string().min(1, 'Source title is required'),
  sourceType: z.enum(['notes', 'pdf', 'transcript', 'article', 'screenshot', 'code']).default('notes'),
  content: z.string().min(10, 'Content must have at least 10 characters'),
});

export const structuredConceptSchema = z.object({
  title: z.string().min(1),
  slug: z.string().optional(),
  explanation: z.string().min(5),
  importance: z.enum(['low', 'medium', 'high']).default('medium'),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  practicalExample: z.string().optional().default(''),
  commonMistakes: z.array(z.string()).optional().default([]),
  prerequisites: z.array(z.string()).optional().default([]),
  relatedConcepts: z.array(z.string()).optional().default([]),
  generatedQuestions: z.array(
    z.object({
      type: z.enum(['recall', 'explanation', 'comparison', 'application', 'interview', 'scenario', 'cross-topic']),
      difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
      front: z.string().min(3),
      back: z.string().min(1),
      evaluationCriteria: z.array(z.string()).optional().default([]),
    })
  ).optional().default([]),
});

export const commitIngestionSchema = z.object({
  subjectName: z.string().min(1),
  sourceTitle: z.string().min(1),
  sourceType: z.enum(['notes', 'pdf', 'transcript', 'article', 'screenshot', 'code']).default('notes'),
  contentHash: z.string().min(1),
  rawContent: z.string().optional().default(''),
  concepts: z.array(structuredConceptSchema).min(1, 'At least one concept is required'),
});

