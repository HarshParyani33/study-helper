export interface Subject {
  _id: string;
  name: string;
  description: string;
  conceptCount?: number;
  questionCount?: number;
  dueCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Concept {
  _id: string;
  subjectId: string | { _id: string; name: string };
  title: string;
  slug: string;
  explanation: string;
  importance: 'low' | 'medium' | 'high';
  difficulty: 'easy' | 'medium' | 'hard';
  practicalExample?: string;
  commonMistakes: string[];
  prerequisites: string[];
  relatedConcepts: string[];
  sourceIds?: any[];
  questionCount?: number;
  dueQuestionCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Question {
  _id: string;
  conceptId: string | {
    _id: string;
    title: string;
    slug: string;
    importance: string;
    difficulty: string;
    explanation: string;
    practicalExample?: string;
    commonMistakes?: string[];
  };
  subjectId: string | { _id: string; name: string };
  type: 'recall' | 'explanation' | 'comparison' | 'application' | 'interview' | 'scenario' | 'cross-topic';
  difficulty: 'easy' | 'medium' | 'hard';
  front: string;
  back: string;
  evaluationCriteria: string[];
  nextReviewAt: string;
  fsrsCard?: {
    due: string;
    stability: number;
    difficulty: number;
    reps: number;
    lapses: number;
    state: number;
  };
}

export interface ReviewSubmitResult {
  success: boolean;
  reviewId: string;
  nextReviewAt: string;
  scheduledDays: number;
  reps: number;
  lapses: number;
  stability: number;
  difficulty: number;
}

export interface AnswerEvaluation {
  score: number;
  feedback: string;
  suggestedRating: number;
  missingKeyPoints: string[];
  strengths: string[];
}

export interface IngestionReport {
  isDuplicateSource: boolean;
  subject: { id: string; name: string };
  source: { id: string; title: string; contentHash: string; type: string };
  summary: {
    conceptsCreated: number;
    conceptsEnriched: number;
    questionsCreated: number;
    totalConceptsInSubject: number;
  };
  details: {
    newConcepts: string[];
    enrichedConcepts: string[];
    questionsGenerated: { concept: string; question: string; type: string }[];
  };
}

export interface DashboardSummary {
  metrics: {
    totalSubjects: number;
    totalConcepts: number;
    totalQuestions: number;
    totalReviews: number;
    dueQuestions: number;
    retentionRate: number;
  };
  recentReviews: { _id: string; count: number; avgRating: number }[];
  ratingDistribution: { _id: number; count: number }[];
  subjectBreakdown: { id: string; name: string; concepts: number; questions: number; due: number }[];
}

export interface KnowledgeGraphData {
  nodes: {
    id: string;
    slug: string;
    data: {
      label: string;
      subject: string;
      importance: string;
      difficulty: string;
      status: 'due' | 'learning' | 'new';
      totalQuestions: number;
      dueQuestions: number;
      explanation: string;
    };
    position: { x: number; y: number };
  }[];
  edges: {
    id: string;
    source: string;
    target: string;
    animated?: boolean;
    label?: string;
    style?: any;
  }[];
}

export interface FreshStartData {
  subjectName: string;
  inactivityDuration: string;
  overview: string;
  importantConcepts: { title: string; slug: string; summary: string; importance: string }[];
  dependencies: { concept: string; prerequisites: string[] }[];
  diagnosticQuestions: { questionId: string; question: string; expectedAnswer: string; conceptTitle: string }[];
  identifiedWeakAreas: { conceptTitle: string; reason: string; urgency: 'high' | 'medium' | 'low' }[];
  prioritizedRecoveryPlan: { stage: string; focus: string; concepts: string[]; estimatedMinutes: number }[];
  nextLearningSteps: string[];
}

export interface InterviewData {
  subjectName: string;
  difficulty: string;
  interviewDate?: string;
  essentialConcepts: { title: string; whyImportant: string; keyArchitecturePoints: string[] }[];
  interviewQuestions: { id: string; question: string; modelAnswer: string; followUps: string[]; tradeoffs: string }[];
  engineeringScenarios: { title: string; problemStatement: string; solutionApproach: string; pitfallsToAvoid: string }[];
  commonMisconceptions: { myth: string; reality: string; betterAnswer: string }[];
  revisionChecklist: { category: string; item: string; verified: boolean }[];
}

// ----------------------------------------------------
// Study Planner Types
// ----------------------------------------------------

export interface StudyPlan {
  _id: string;
  name: string;
  startDate: string;
  endDate: string;
  defaultStartTime: string;
  totalDays: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ScoreBreakdown {
  react: number;
  dsa: number;
  afternoon: number;
  jobSearch: number;
  notes: number;
}

export interface ProfileDailyProgress {
  profileId: 'you' | 'girlfriend';
  displayName: string;
  color: 'blue' | 'pink';
  score: number;
  scoreBreakdown: ScoreBreakdown;
  progress: {
    reactCompleted: boolean;
    dsaCompleted: boolean;
    afternoonCompleted: boolean;
    jobSearchCompleted: boolean;
    jobSearchDetails?: {
      targetRole?: string;
      companyApplied?: string;
      notes?: string;
    };
  };
  dsa: {
    topicId: string;
    completedProblemNumbers: number[];
    completedCount: number;
  };
}

export interface TaskTimeSlot {
  title: string;
  category: 'react' | 'lunch' | 'dsa' | 'afternoon' | 'job_search' | 'personal';
  startTime: string;
  endTime: string;
  durationMinutes: number;
  description?: string;
  link?: string;
  episodeNumber?: number;
  runtimeMinutes?: number;
  totalStudyMinutes?: number;
  activityName?: string;
  note?: string;
  isScored: boolean;
  points: number;
}

export interface StudyNoteData {
  _id: string;
  planId: string;
  date: string;
  profileId: 'you' | 'girlfriend';
  activityType: 'react' | 'dsa' | 'system-design' | 'project-learning' | 'job-search' | 'reflection';
  title: string;
  approach?: string;
  observations?: string;
  timeComplexity?: string;
  spaceComplexity?: string;
  content?: string;
  isBookmarked?: boolean;
  conceptId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DayStudyView {
  plan: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    totalDays: number;
    currentDayNumber: number;
    isInPlanRange: boolean;
  };
  date: string;
  overallProgress: {
    you: { totalScore: number; maxScore: number; percentage: number };
    girlfriend: { totalScore: number; maxScore: number; percentage: number };
  };
  timetable: TaskTimeSlot[];
  startTime: string;
  profiles: {
    you: ProfileDailyProgress;
    girlfriend: ProfileDailyProgress;
  };
  notes: StudyNoteData[];
}

export interface CalendarDayData {
  date: string;
  day: number;
  dayNumber: number | null;
  isInActivePlan: boolean;
  you: {
    score: number;
    reactCompleted: boolean;
    dsaQuestionsSolved: number;
    afternoonCompleted: boolean;
    jobSearchCompleted: boolean;
    hasNotes: boolean;
    hasActivity: boolean;
  };
  girlfriend: {
    score: number;
    reactCompleted: boolean;
    dsaQuestionsSolved: number;
    afternoonCompleted: boolean;
    jobSearchCompleted: boolean;
    hasNotes: boolean;
    hasActivity: boolean;
  };
}

export interface CalendarMonthData {
  plan: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    totalDays: number;
  };
  year: number;
  month: number;
  days: CalendarDayData[];
}

export interface DSAQuestion {
  number: number;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  url: string;
}

export interface DSAPatternTopic {
  id: string;
  name: string;
  description: string;
  questions: DSAQuestion[];
}

export interface ReactEpisode {
  day: number;
  episodeNumber: number;
  title: string;
  runtimeMinutes: number;
  totalStudyMinutes: number;
  url: string;
}
