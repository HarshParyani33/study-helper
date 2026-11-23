import { z } from 'zod';

export const createPlanSchema = z.object({
  name: z.string().min(1, 'Plan name is required').max(100),
  description: z.string().max(500).optional().default(''),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be YYYY-MM-DD'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be YYYY-MM-DD'),
  status: z.enum(['active', 'completed', 'archived']).default('active'),
  defaultStartTime: z.enum(['10:30', '11:00']).default('10:30'),
  totalDays: z.number().int().min(1).max(365).default(10),
});

export const updatePlanSchema = createPlanSchema.partial();

export const updateTaskProgressSchema = z.object({
  planId: z.string().min(1, 'planId is required'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  profileId: z.enum(['you', 'girlfriend']),
  taskKey: z.enum(['reactCompleted', 'dsaCompleted', 'afternoonCompleted', 'jobSearchCompleted']).optional(),
  completed: z.boolean().optional(),
  jobSearchDetails: z.object({
    role: z.string().optional().default(''),
    company: z.string().optional().default(''),
    activity: z.string().optional().default(''),
    note: z.string().optional().default(''),
  }).optional(),
  startTime: z.enum(['10:30', '11:00']).optional(),
});

export const updateDSASessionSchema = z.object({
  planId: z.string().min(1, 'planId is required'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  profileId: z.enum(['you', 'girlfriend']),
  topicId: z.string().min(1, 'topicId is required'),
  completedProblemNumbers: z.array(z.number().int()).optional(),
  notes: z.string().optional(),
});

export const createStudyNoteSchema = z.object({
  planId: z.string().min(1, 'planId is required'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  profileId: z.enum(['you', 'girlfriend']),
  activityType: z.enum(['react', 'dsa', 'system-design', 'project-learning', 'job-search', 'reflection']).default('reflection'),
  title: z.string().min(1, 'Title is required').max(200),
  content: z.string().optional().default(''),
  approach: z.string().optional().default(''),
  keyObservation: z.string().optional().default(''),
  timeComplexity: z.string().optional().default(''),
  spaceComplexity: z.string().optional().default(''),
  commonMistakes: z.string().optional().default(''),
  relatedConceptId: z.string().optional(),
});

export const updateStudyNoteSchema = createStudyNoteSchema.partial().omit({ planId: true, profileId: true });

export const convertNoteToConceptSchema = z.object({
  noteId: z.string().min(1),
  subjectName: z.string().min(1).default('System Design'),
  importance: z.enum(['low', 'medium', 'high']).default('high'),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
});

// Timer Schemas
export const startTimerSchema = z.object({
  planId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  profileId: z.enum(['you', 'girlfriend']),
  activityId: z.string().min(1),
  activityName: z.string().min(1),
});

export const timerActionSchema = z.object({
  timerId: z.string().min(1),
});

// Schedule Editor Schemas
export const scheduleItemSchema = z.object({
  activityId: z.string().min(1),
  name: z.string().min(1),
  activityType: z.enum(['react', 'break', 'transition', 'dsa', 'afternoon', 'system-design', 'project-learning', 'job-search', 'personal', 'custom']),
  targetProfile: z.enum(['both', 'you', 'girlfriend']).default('both'),
  videoUrl: z.string().optional().default(''),
  videoRuntimeMinutes: z.number().int().min(0).default(0),
  extraBufferMinutes: z.number().int().min(0).default(0),
  durationMinutes: z.number().int().min(1).default(60),
  isFlexible: z.boolean().default(false),
  isScored: z.boolean().default(false),
  maxPoints: z.number().int().min(0).default(0),
  notes: z.string().optional().default(''),
});

export const batchUpdateScheduleSchema = z.object({
  planId: z.string().min(1),
  dayNumber: z.number().int().min(1),
  items: z.array(scheduleItemSchema),
});

export const importScheduleSchema = z.object({
  planId: z.string().min(1),
  dayNumber: z.number().int().min(1),
  csvContent: z.string().min(1),
});
