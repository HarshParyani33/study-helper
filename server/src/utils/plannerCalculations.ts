import { REACT_EPISODES, ReactEpisode } from '../data/reactEpisodes.js';

export interface TaskTimeSlot {
  id: string; // 'react' | 'lunch' | 'transition-dsa' | 'dsa' | 'transition-afternoon' | 'afternoon' | 'job-search' | 'bigg-boss' | 'valorant' | custom
  name: string;
  category: 'react' | 'break' | 'transition' | 'dsa' | 'afternoon' | 'job-search' | 'personal' | 'custom';
  startTimeFormatted: string; // e.g. "11:00 AM"
  endTimeFormatted: string;   // e.g. "12:30 PM"
  startTimeMinutes: number;   // minutes from midnight
  endTimeMinutes: number;     // minutes from midnight
  durationMinutes: number;    // estimated duration in minutes
  durationFormatted: string;  // e.g. "1h 30m"
  isBreakOrTransition: boolean; // true for lunch / transition
  isScored: boolean;
  maxPoints: number;
  isFlexible?: boolean;
  targetMissed5PM?: boolean;
  videoUrl?: string;
  videoRuntimeMinutes?: number;
  extraBufferMinutes?: number;
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

export function formatSecondsToStopwatch(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  const hh = h < 10 ? `0${h}` : `${h}`;
  const mm = m < 10 ? `0${m}` : `${m}`;
  const ss = s < 10 ? `0${s}` : `${s}`;
  return `${hh}:${mm}:${ss}`;
}

export function formatDurationDifference(
  actualSeconds: number,
  estimatedMinutes: number
): {
  diffMinutes: number;
  formatted: string;
  isOvertime: boolean;
  status: 'under' | 'equal' | 'over';
} {
  const actualMinutes = Math.round(actualSeconds / 60);
  const diffMinutes = actualMinutes - estimatedMinutes;

  if (diffMinutes === 0) {
    return { diffMinutes: 0, formatted: 'On time', isOvertime: false, status: 'equal' };
  }
  if (diffMinutes > 0) {
    return {
      diffMinutes,
      formatted: `+${diffMinutes}m`,
      isOvertime: true,
      status: 'over',
    };
  }
  return {
    diffMinutes,
    formatted: `${diffMinutes}m`,
    isOvertime: false,
    status: 'under',
  };
}

export function getAfternoonActivityForDay(dayNumber: number): {
  type: 'project-learning' | 'system-design';
  title: string;
  durationMinutes: number;
} {
  // Days 1, 3, 5, 7, 9: Project Learning — 1 hour
  // Days 2, 4, 6, 8, 10: System Design — Padho with Pratyush (default 1 hour = 60m)
  const isSystemDesign = dayNumber % 2 === 0;
  if (isSystemDesign) {
    return {
      type: 'system-design',
      title: 'System Design — Padho with Pratyush',
      durationMinutes: 60, // 1 hour
    };
  }
  return {
    type: 'project-learning',
    title: 'Project Learning — 1 hour',
    durationMinutes: 60, // 1 hour
  };
}

export function calculateDailyTimetable(
  dayNumber: number,
  startTime: '10:30' | '11:00' = '10:30',
  customScheduleItems?: any[]
): TaskTimeSlot[] {
  // If custom schedule items are provided, calculate from them
  if (customScheduleItems && customScheduleItems.length > 0) {
    let currentMin = parseTimeToMinutes(startTime);
    const slots: TaskTimeSlot[] = [];

    for (const item of customScheduleItems) {
      const dur = item.durationMinutes || 60;
      const startMin = item.isFlexible ? currentMin : currentMin;
      const endMin = item.isFlexible ? currentMin + dur : currentMin + dur;

      slots.push({
        id: item.activityId || item._id,
        name: item.name,
        category: item.activityType,
        startTimeFormatted: item.isFlexible ? 'Flexible' : formatMinutesToTime(startMin),
        endTimeFormatted: item.isFlexible ? 'Flexible' : formatMinutesToTime(endMin),
        startTimeMinutes: startMin,
        endTimeMinutes: endMin,
        durationMinutes: dur,
        durationFormatted: item.isFlexible ? 'Flexible' : formatDuration(dur),
        isBreakOrTransition: item.activityType === 'break' || item.activityType === 'transition',
        isScored: !!item.isScored,
        maxPoints: item.maxPoints || 0,
        isFlexible: !!item.isFlexible,
        videoUrl: item.videoUrl,
        videoRuntimeMinutes: item.videoRuntimeMinutes,
        extraBufferMinutes: item.extraBufferMinutes,
        details: item.details,
      });

      if (!item.isFlexible) {
        currentMin = endMin;
      }
    }
    return slots;
  }

  // Standard dynamic timetable based on exact formula
  const startMin = parseTimeToMinutes(startTime);

  // 1. React Session: Video runtime + 30 minutes buffer
  const episode: ReactEpisode = REACT_EPISODES[dayNumber - 1] || REACT_EPISODES[0];
  const videoRuntimeMin = Math.round(episode.runtimeSeconds / 60);
  const bufferMin = 30; // 30 minutes for pausing, understanding, notes
  const reactStudyMinutes = videoRuntimeMin + bufferMin;
  const reactEndMin = startMin + reactStudyMinutes;

  // 2. Lunch Break: 60 minutes, begins immediately after React
  const lunchDuration = 60;
  const lunchStartMin = reactEndMin;
  const lunchEndMin = lunchStartMin + lunchDuration;

  // 3. Post-lunch Transition: 15 minutes buffer
  const transition1Duration = 15;
  const transition1StartMin = lunchEndMin;
  const transition1EndMin = transition1StartMin + transition1Duration;

  // 4. DSA Session: 90 minutes (1h 30m)
  const dsaDuration = 90;
  const dsaStartMin = transition1EndMin;
  const dsaEndMin = dsaStartMin + dsaDuration;

  // 5. Post-DSA Transition: 15 minutes buffer
  const transition2Duration = 15;
  const transition2StartMin = dsaEndMin;
  const transition2EndMin = transition2StartMin + transition2Duration;

  // 6. Afternoon Learning: 60 minutes (1h)
  const afternoon = getAfternoonActivityForDay(dayNumber);
  const afternoonStartMin = transition2EndMin;
  const afternoonEndMin = afternoonStartMin + afternoon.durationMinutes;
  const targetMissed5PM = afternoonStartMin > 17 * 60; // 5:00 PM is 17:00

  // 7. Job Search: Flexible timing, manual start/finish
  const jobSearchStartMin = afternoonEndMin;
  const jobSearchDuration = 45;
  const jobSearchEndMin = jobSearchStartMin + jobSearchDuration;

  // 8. Bigg Boss: 9:00 PM – 10:00 PM (21:00 – 22:00)
  const biggBossStartMin = 21 * 60;
  const biggBossEndMin = 22 * 60;

  // 9. Valorant: 10:00 PM – 12:00 AM (22:00 – 24:00)
  const valorantStartMin = 22 * 60;
  const valorantEndMin = 24 * 60;

  const slots: TaskTimeSlot[] = [
    {
      id: 'react',
      name: `React — Episode ${episode.episodeNumber}: ${episode.title}`,
      category: 'react',
      startTimeFormatted: formatMinutesToTime(startMin),
      endTimeFormatted: formatMinutesToTime(reactEndMin),
      startTimeMinutes: startMin,
      endTimeMinutes: reactEndMin,
      durationMinutes: reactStudyMinutes,
      durationFormatted: formatDuration(reactStudyMinutes),
      isBreakOrTransition: false,
      isScored: true,
      maxPoints: 2,
      videoUrl: episode.videoUrl,
      videoRuntimeMinutes: videoRuntimeMin,
      extraBufferMinutes: bufferMin,
      details: {
        episodeNumber: episode.episodeNumber,
        title: episode.title,
        videoUrl: episode.videoUrl,
        runtimeFormatted: episode.runtimeFormatted,
        totalStudyFormatted: formatDuration(reactStudyMinutes),
      },
    },
    {
      id: 'lunch',
      name: 'Lunch Break (60 mins)',
      category: 'break',
      startTimeFormatted: formatMinutesToTime(lunchStartMin),
      endTimeFormatted: formatMinutesToTime(lunchEndMin),
      startTimeMinutes: lunchStartMin,
      endTimeMinutes: lunchEndMin,
      durationMinutes: lunchDuration,
      durationFormatted: '1h',
      isBreakOrTransition: true,
      isScored: false,
      maxPoints: 0,
    },
    {
      id: 'transition-dsa',
      name: 'Post-Lunch Transition (15 mins)',
      category: 'transition',
      startTimeFormatted: formatMinutesToTime(transition1StartMin),
      endTimeFormatted: formatMinutesToTime(transition1EndMin),
      startTimeMinutes: transition1StartMin,
      endTimeMinutes: transition1EndMin,
      durationMinutes: transition1Duration,
      durationFormatted: '15m',
      isBreakOrTransition: true,
      isScored: false,
      maxPoints: 0,
    },
    {
      id: 'dsa',
      name: 'DSA Problem Solving (1h 30m)',
      category: 'dsa',
      startTimeFormatted: formatMinutesToTime(dsaStartMin),
      endTimeFormatted: formatMinutesToTime(dsaEndMin),
      startTimeMinutes: dsaStartMin,
      endTimeMinutes: dsaEndMin,
      durationMinutes: dsaDuration,
      durationFormatted: '1h 30m',
      isBreakOrTransition: false,
      isScored: true,
      maxPoints: 3,
    },
    {
      id: 'transition-afternoon',
      name: 'Afternoon Transition (15 mins)',
      category: 'transition',
      startTimeFormatted: formatMinutesToTime(transition2StartMin),
      endTimeFormatted: formatMinutesToTime(transition2EndMin),
      startTimeMinutes: transition2StartMin,
      endTimeMinutes: transition2EndMin,
      durationMinutes: transition2Duration,
      durationFormatted: '15m',
      isBreakOrTransition: true,
      isScored: false,
      maxPoints: 0,
    },
    {
      id: 'afternoon',
      name: afternoon.title,
      category: 'afternoon',
      startTimeFormatted: formatMinutesToTime(afternoonStartMin),
      endTimeFormatted: formatMinutesToTime(afternoonEndMin),
      startTimeMinutes: afternoonStartMin,
      endTimeMinutes: afternoonEndMin,
      durationMinutes: afternoon.durationMinutes,
      durationFormatted: formatDuration(afternoon.durationMinutes),
      isBreakOrTransition: false,
      isScored: true,
      maxPoints: 2,
      targetMissed5PM,
      details: {
        type: afternoon.type,
      },
    },
    {
      id: 'job-search',
      name: 'Job Search',
      category: 'job-search',
      startTimeFormatted: 'Flexible',
      endTimeFormatted: 'Flexible',
      startTimeMinutes: jobSearchStartMin,
      endTimeMinutes: jobSearchEndMin,
      durationMinutes: jobSearchDuration,
      durationFormatted: 'Manual',
      isBreakOrTransition: false,
      isFlexible: true,
      isScored: true,
      maxPoints: 2,
    },
    {
      id: 'bigg-boss',
      name: 'Bigg Boss',
      category: 'personal',
      startTimeFormatted: '9:00 PM',
      endTimeFormatted: '10:00 PM',
      startTimeMinutes: biggBossStartMin,
      endTimeMinutes: biggBossEndMin,
      durationMinutes: 60,
      durationFormatted: '1h',
      isBreakOrTransition: true,
      isScored: false,
      maxPoints: 0,
    },
    {
      id: 'valorant',
      name: 'Valorant',
      category: 'personal',
      startTimeFormatted: '10:00 PM',
      endTimeFormatted: '12:00 AM',
      startTimeMinutes: valorantStartMin,
      endTimeMinutes: valorantEndMin,
      durationMinutes: 120,
      durationFormatted: '2h',
      isBreakOrTransition: true,
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
