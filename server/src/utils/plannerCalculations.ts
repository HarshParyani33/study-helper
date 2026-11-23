import { REACT_EPISODES, ReactEpisode } from '../data/reactEpisodes.js';

export interface TaskTimeSlot {
  id: string;
  name: string;
  category: 'react' | 'lunch' | 'dsa' | 'afternoon' | 'job-search' | 'personal';
  startTimeFormatted: string; // e.g. "10:30 AM"
  endTimeFormatted: string;   // e.g. "12:08 PM"
  durationFormatted: string;  // e.g. "1h 38m"
  isScored: boolean;
  maxPoints: number;
  details?: any;
}

export function parseTimeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + (minutes || 0);
}

export function formatMinutesToTime(totalMinutes: number): string {
  const norm = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  let h = Math.floor(norm / 60);
  const m = norm % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  const mm = m < 10 ? `0${m}` : `${m}`;
  return `${h}:${mm} ${ampm}`;
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function getAfternoonActivityForDay(dayNumber: number): {
  type: 'project-learning' | 'system-design';
  title: string;
  durationMinutes: number;
} {
  // Days 1, 3, 5, 7, 9: Project Learning — 1 hour
  // Days 2, 4, 6, 8, 10: System Design — Padho with Pratyush
  const isSystemDesign = dayNumber % 2 === 0;
  if (isSystemDesign) {
    return {
      type: 'system-design',
      title: 'System Design — Padho with Pratyush',
      durationMinutes: 90, // 1h 30m
    };
  }
  return {
    type: 'project-learning',
    title: 'Project Learning — 1 hour',
    durationMinutes: 60,
  };
}

export function calculateDailyTimetable(
  dayNumber: number,
  startTime: '10:30' | '11:00' = '10:30'
): TaskTimeSlot[] {
  const startMin = parseTimeToMinutes(startTime);

  // 1. React Session
  const episode: ReactEpisode = REACT_EPISODES[dayNumber - 1] || REACT_EPISODES[0];
  const reactStudyMinutes = Math.ceil(episode.totalStudySeconds / 60);
  const reactEndMin = startMin + reactStudyMinutes;

  // 2. Lunch Break: exactly 35 minutes
  const lunchDuration = 35;
  const lunchStartMin = reactEndMin;
  const lunchEndMin = lunchStartMin + lunchDuration;

  // 3. DSA Session: exactly 1h 30m (90 minutes)
  const dsaDuration = 90;
  const dsaStartMin = lunchEndMin;
  const dsaEndMin = dsaStartMin + dsaDuration;

  // 4. Afternoon Learning: Alternates between Project Learning and System Design
  const afternoon = getAfternoonActivityForDay(dayNumber);
  const afternoonStartMin = dsaEndMin;
  const afternoonEndMin = afternoonStartMin + afternoon.durationMinutes;

  // 5. Job Search: flexible timing in late afternoon
  const jobSearchStartMin = afternoonEndMin + 15; // 15 min buffer
  const jobSearchEndMin = jobSearchStartMin + 45;  // 45 min

  const slots: TaskTimeSlot[] = [
    {
      id: 'react',
      name: `React — Episode ${episode.episodeNumber}: ${episode.title}`,
      category: 'react',
      startTimeFormatted: formatMinutesToTime(startMin),
      endTimeFormatted: formatMinutesToTime(reactEndMin),
      durationFormatted: formatDuration(reactStudyMinutes),
      isScored: true,
      maxPoints: 2,
      details: {
        episodeNumber: episode.episodeNumber,
        title: episode.title,
        videoUrl: episode.videoUrl,
        runtimeFormatted: episode.runtimeFormatted,
        totalStudyFormatted: episode.totalStudyFormatted,
      },
    },
    {
      id: 'lunch',
      name: 'Lunch Break (35 minutes)',
      category: 'lunch',
      startTimeFormatted: formatMinutesToTime(lunchStartMin),
      endTimeFormatted: formatMinutesToTime(lunchEndMin),
      durationFormatted: '35m',
      isScored: false,
      maxPoints: 0,
    },
    {
      id: 'dsa',
      name: 'DSA Problem Solving (1h 30m)',
      category: 'dsa',
      startTimeFormatted: formatMinutesToTime(dsaStartMin),
      endTimeFormatted: formatMinutesToTime(dsaEndMin),
      durationFormatted: '1h 30m',
      isScored: true,
      maxPoints: 3,
    },
    {
      id: 'afternoon',
      name: afternoon.title,
      category: 'afternoon',
      startTimeFormatted: formatMinutesToTime(afternoonStartMin),
      endTimeFormatted: formatMinutesToTime(afternoonEndMin),
      durationFormatted: formatDuration(afternoon.durationMinutes),
      isScored: true,
      maxPoints: 2,
      details: {
        type: afternoon.type,
      },
    },
    {
      id: 'job-search',
      name: 'Job Search',
      category: 'job-search',
      startTimeFormatted: formatMinutesToTime(jobSearchStartMin),
      endTimeFormatted: formatMinutesToTime(jobSearchEndMin),
      durationFormatted: '45m',
      isScored: true,
      maxPoints: 2,
    },
    {
      id: 'bigg-boss',
      name: 'Bigg Boss',
      category: 'personal',
      startTimeFormatted: '9:00 PM',
      endTimeFormatted: '10:00 PM',
      durationFormatted: '1h',
      isScored: false,
      maxPoints: 0,
    },
    {
      id: 'valorant',
      name: 'Valorant',
      category: 'personal',
      startTimeFormatted: '10:00 PM',
      endTimeFormatted: '12:00 AM',
      durationFormatted: '2h',
      isScored: false,
      maxPoints: 0,
    },
  ];

  return slots;
}

export interface ScoreInput {
  reactCompleted: boolean;
  dsaCompletedQuestionsCount: number; // 0, 1, 2, 3+
  afternoonCompleted: boolean;
  jobSearchCompleted: boolean;
  hasNonEmptyNote: boolean;
}

export function calculateDailyScore(input: ScoreInput): {
  totalScore: number;
  breakdown: {
    react: number;
    dsa: number;
    afternoon: number;
    jobSearch: number;
    notes: number;
  };
} {
  const react = input.reactCompleted ? 2 : 0;
  
  // DSA points: 3 for >= 3 questions, 2 for 2 questions, 1 for 1 question, 0 otherwise
  let dsa = 0;
  if (input.dsaCompletedQuestionsCount >= 3) {
    dsa = 3;
  } else if (input.dsaCompletedQuestionsCount === 2) {
    dsa = 2;
  } else if (input.dsaCompletedQuestionsCount === 1) {
    dsa = 1;
  }

  const afternoon = input.afternoonCompleted ? 2 : 0;
  const jobSearch = input.jobSearchCompleted ? 2 : 0;
  const notes = input.hasNonEmptyNote ? 1 : 0;

  const totalScore = react + dsa + afternoon + jobSearch + notes;

  return {
    totalScore: Math.min(10, Math.max(0, totalScore)),
    breakdown: {
      react,
      dsa,
      afternoon,
      jobSearch,
      notes,
    },
  };
}
