import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import {
  StudyPlan,
  DayStudyView,
  CalendarMonthData,
  CalendarDayData,
  StudyNoteData,
  DSAPatternTopic,
  ReactEpisode,
  Subject,
  ScheduleItemData,
  TaskTimeSlot,
} from '../types/index.js';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  Circle,
  ExternalLink,
  Plus,
  BookOpen,
  Sparkles,
  Briefcase,
  Code2,
  Video,
  Trash2,
  Edit3,
  Copy,
  Archive,
  Play,
  Pause,
  Square,
  Check,
  AlertCircle,
  Table,
  FileSpreadsheet,
  Download,
  Upload,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react';

interface StudyPlannerProps {
  onNavigateToRecall?: () => void;
}

export const StudyPlanner: React.FC<StudyPlannerProps> = () => {
  // Global & Plan State
  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('default');
  const [currentPlan, setCurrentPlan] = useState<StudyPlan | null>(null);

  // Date & Calendar State
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [calendarYear, setCalendarYear] = useState<number>(new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState<number>(new Date().getMonth() + 1); // 1-12
  const [calendarData, setCalendarData] = useState<CalendarMonthData | null>(null);

  // Daily View Data
  const [dailyView, setDailyView] = useState<DayStudyView | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Live Timer Ticker (1-second update for running stopwatches)
  const [, setTicker] = useState<number>(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setTicker(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // DSA Matrix Data & Selection
  const [dsaTopics, setDsaTopics] = useState<DSAPatternTopic[]>([]);
  const [activeDSAProfile, setActiveDSAProfile] = useState<'you' | 'girlfriend'>('you');
  const [reactEpisodes, setReactEpisodes] = useState<ReactEpisode[]>([]);

  // Notes State
  const [notes, setNotes] = useState<StudyNoteData[]>([]);
  const [activeNoteProfile, setActiveNoteProfile] = useState<'you' | 'girlfriend' | 'all'>('all');
  const [modalAuthorProfile, setModalAuthorProfile] = useState<'you' | 'girlfriend'>('you');
  const [activeNoteActivity, setActiveNoteActivity] = useState<string>('all');
  const [isNoteModalOpen, setIsNoteModalOpen] = useState<boolean>(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteForm, setNoteForm] = useState({
    title: '',
    activityType: 'dsa' as 'react' | 'dsa' | 'system-design' | 'project-learning' | 'job-search' | 'reflection',
    approach: '',
    observations: '',
    timeComplexity: '',
    spaceComplexity: '',
    content: '',
  });

  // Convert to Concept Modal
  const [convertToConceptModal, setConvertToConceptModal] = useState<{
    isOpen: boolean;
    note: StudyNoteData | null;
    subjectId: string;
    importance: string;
    difficulty: string;
  }>({
    isOpen: false,
    note: null,
    subjectId: '',
    importance: 'medium',
    difficulty: 'medium',
  });
  const [subjects, setSubjects] = useState<Subject[]>([]);

  // Plan Management Modal
  const [isPlanModalOpen, setIsPlanModalOpen] = useState<boolean>(false);
  const [newPlanForm, setNewPlanForm] = useState({
    name: '10-Day Tech Sprint',
    startDate: todayStr,
    totalDays: 10,
    defaultStartTime: '10:30',
  });

  // Job search input local edits
  const [jobSearchEditYou, setJobSearchEditYou] = useState({ targetRole: '', companyApplied: '', notes: '' });
  const [jobSearchEditGf, setJobSearchEditGf] = useState({ targetRole: '', companyApplied: '', notes: '' });

  // ----------------------------------------------------
  // Spreadsheet Schedule Editor State
  // ----------------------------------------------------
  const [isScheduleEditorOpen, setIsScheduleEditorOpen] = useState<boolean>(false);
  const [scheduleItems, setScheduleItems] = useState<ScheduleItemData[]>([]);
  const [isPasteModalOpen, setIsPasteModalOpen] = useState<boolean>(false);
  const [pastedContent, setPastedContent] = useState<string>('');
  const [scheduleValidationError, setScheduleValidationError] = useState<string | null>(null);

  // Initial Data Fetch
  useEffect(() => {
    loadInitialData();
  }, []);

  // Fetch calendar and daily view whenever plan or date changes
  useEffect(() => {
    if (selectedPlanId) {
      loadCalendarAndDailyView(selectedPlanId, selectedDate, calendarYear, calendarMonth);
    }
  }, [selectedPlanId, selectedDate, calendarYear, calendarMonth]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [allPlans, topics, episodes, subjs] = await Promise.all([
        api.getPlans(),
        api.getDSATopics(),
        api.getReactEpisodes(),
        api.getSubjects(),
      ]);
      setPlans(allPlans);
      setDsaTopics(topics);
      setReactEpisodes(episodes);
      setSubjects(subjs);

      const active = allPlans.find(p => p.isActive) || allPlans[0];
      if (active) {
        setSelectedPlanId(active._id);
        setCurrentPlan(active);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to initialize study planner');
    } finally {
      setLoading(false);
    }
  };

  const loadCalendarAndDailyView = async (planId: string, date: string, year: number, month: number) => {
    try {
      const [cal, day] = await Promise.all([
        api.getCalendar(planId, year, month),
        api.getDailyView(planId, date),
      ]);
      setCalendarData(cal);
      setDailyView(day);
      setNotes(day.notes || []);

      if (day.profiles.you?.progress?.jobSearchDetails) {
        setJobSearchEditYou({
          targetRole: day.profiles.you.progress.jobSearchDetails.targetRole || '',
          companyApplied: day.profiles.you.progress.jobSearchDetails.companyApplied || '',
          notes: day.profiles.you.progress.jobSearchDetails.notes || '',
        });
      }
      if (day.profiles.girlfriend?.progress?.jobSearchDetails) {
        setJobSearchEditGf({
          targetRole: day.profiles.girlfriend.progress.jobSearchDetails.targetRole || '',
          companyApplied: day.profiles.girlfriend.progress.jobSearchDetails.companyApplied || '',
          notes: day.profiles.girlfriend.progress.jobSearchDetails.notes || '',
        });
      }
    } catch (err: any) {
      console.error('Failed to load calendar/daily view:', err);
    }
  };

  // ----------------------------------------------------
  // Live Timer Handlers
  // ----------------------------------------------------
  const handleStartTimer = async (activityId: string, activityName: string, profileId: 'you' | 'girlfriend') => {
    if (!dailyView) return;
    try {
      setIsUpdating(true);
      const updated = await api.startTimer({
        planId: dailyView.plan.id,
        date: selectedDate,
        profileId,
        activityId,
        activityName,
      });
      setDailyView(updated);
    } catch (err: any) {
      alert(err.message || 'Failed to start timer');
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePauseTimer = async (timerId: string) => {
    try {
      setIsUpdating(true);
      const updated = await api.pauseTimer(timerId);
      setDailyView(updated);
    } catch (err: any) {
      alert(err.message || 'Failed to pause timer');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleResumeTimer = async (timerId: string) => {
    try {
      setIsUpdating(true);
      const updated = await api.resumeTimer(timerId);
      setDailyView(updated);
    } catch (err: any) {
      alert(err.message || 'Failed to resume timer');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleFinishTimer = async (timerId: string) => {
    try {
      setIsUpdating(true);
      const updated = await api.finishTimer(timerId);
      setDailyView(updated);
      const cal = await api.getCalendar(selectedPlanId, calendarYear, calendarMonth);
      setCalendarData(cal);
    } catch (err: any) {
      alert(err.message || 'Failed to finish timer');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDiscardTimer = async (timerId: string) => {
    if (!confirm('Discard this stopwatch session? Recorded time will be reset.')) return;
    try {
      setIsUpdating(true);
      const updated = await api.discardTimer(timerId);
      setDailyView(updated);
    } catch (err: any) {
      alert(err.message || 'Failed to discard timer');
    } finally {
      setIsUpdating(false);
    }
  };

  // Profile Task Toggle Handler (Manual Checkbox fallback)
  const handleToggleTask = async (
    profileId: 'you' | 'girlfriend',
    taskField: 'reactCompleted' | 'afternoonCompleted' | 'jobSearchCompleted',
    currentValue: boolean
  ) => {
    if (!dailyView) return;
    try {
      setIsUpdating(true);
      const updatePayload: any = {
        planId: dailyView.plan.id,
        date: selectedDate,
        profileId,
        taskKey: taskField,
        completed: !currentValue,
      };

      const updated = await api.updateTaskProgress(updatePayload);
      setDailyView(updated);

      const cal = await api.getCalendar(selectedPlanId, calendarYear, calendarMonth);
      setCalendarData(cal);
    } catch (err: any) {
      alert(`Error updating task: ${err.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  // Start Time Switcher Handler
  const handleStartTimeChange = async (newTime: '10:30' | '11:00') => {
    if (!dailyView) return;
    try {
      setIsUpdating(true);
      const updated = await api.updateTaskProgress({
        planId: dailyView.plan.id,
        date: selectedDate,
        profileId: 'you',
        startTime: newTime,
      });
      setDailyView(updated);
    } catch (err: any) {
      alert(`Error updating start time: ${err.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  // Job Search Save Handler
  const handleSaveJobSearch = async (profileId: 'you' | 'girlfriend') => {
    if (!dailyView) return;
    try {
      setIsUpdating(true);
      const details = profileId === 'you' ? jobSearchEditYou : jobSearchEditGf;
      const updated = await api.updateTaskProgress({
        planId: dailyView.plan.id,
        date: selectedDate,
        profileId,
        taskKey: 'jobSearchCompleted',
        completed: true,
        jobSearchDetails: {
          role: details.targetRole,
          company: details.companyApplied,
          activity: details.notes,
          note: details.notes,
        },
      });
      setDailyView(updated);
      const cal = await api.getCalendar(selectedPlanId, calendarYear, calendarMonth);
      setCalendarData(cal);
    } catch (err: any) {
      alert(`Error saving job search: ${err.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  // DSA Topic Change Handler
  const handleDSATopicChange = async (profileId: 'you' | 'girlfriend', topicId: string) => {
    if (!dailyView) return;
    try {
      setIsUpdating(true);
      const currentCompleted = dailyView.profiles[profileId]?.dsa?.completedProblemNumbers || [];
      const updated = await api.updateDSASession({
        planId: dailyView.plan.id,
        date: selectedDate,
        profileId,
        topicId,
        completedProblemNumbers: currentCompleted,
      });
      setDailyView(updated);
    } catch (err: any) {
      alert(`Error changing DSA topic: ${err.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  // DSA Question Solved Toggle Handler
  const handleToggleDSAQuestion = async (
    profileId: 'you' | 'girlfriend',
    problemNumber: number,
    topicId: string
  ) => {
    if (!dailyView) return;
    try {
      setIsUpdating(true);
      const currentCompleted = dailyView.profiles[profileId]?.dsa?.completedProblemNumbers || [];
      const newCompleted = currentCompleted.includes(problemNumber)
        ? currentCompleted.filter(num => num !== problemNumber)
        : [...currentCompleted, problemNumber];

      const updated = await api.updateDSASession({
        planId: dailyView.plan.id,
        date: selectedDate,
        profileId,
        topicId,
        completedProblemNumbers: newCompleted,
      });
      setDailyView(updated);
      const cal = await api.getCalendar(selectedPlanId, calendarYear, calendarMonth);
      setCalendarData(cal);
    } catch (err: any) {
      alert(`Error updating DSA question: ${err.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  // Notes Handlers
  const handleOpenNoteModal = (note?: StudyNoteData) => {
    if (note) {
      setEditingNoteId(note._id);
      setNoteForm({
        title: note.title,
        activityType: note.activityType,
        approach: note.approach || '',
        observations: note.observations || '',
        timeComplexity: note.timeComplexity || '',
        spaceComplexity: note.spaceComplexity || '',
        content: note.content || '',
      });
      setModalAuthorProfile(note.profileId);
    } else {
      setEditingNoteId(null);
      setNoteForm({
        title: '',
        activityType: 'dsa',
        approach: '',
        observations: '',
        timeComplexity: 'O(N)',
        spaceComplexity: 'O(1)',
        content: '',
      });
      setModalAuthorProfile(activeNoteProfile === 'girlfriend' ? 'girlfriend' : 'you');
    }
    setIsNoteModalOpen(true);
  };

  const handleSaveNote = async () => {
    if (!dailyView || !noteForm.title.trim()) {
      alert('Please enter a note title.');
      return;
    }
    try {
      setIsUpdating(true);
      if (editingNoteId) {
        await api.updateNote(editingNoteId, {
          ...noteForm,
          profileId: modalAuthorProfile,
        });
      } else {
        await api.createNote({
          planId: dailyView.plan.id,
          date: selectedDate,
          profileId: modalAuthorProfile,
          ...noteForm,
        });
      }
      setIsNoteModalOpen(false);
      const day = await api.getDailyView(selectedPlanId, selectedDate);
      setDailyView(day);
      setNotes(day.notes || []);
      const cal = await api.getCalendar(selectedPlanId, calendarYear, calendarMonth);
      setCalendarData(cal);
    } catch (err: any) {
      alert(`Error saving note: ${err.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteNote = async (id: string) => {
    if (!confirm('Are you sure you want to delete this study note?')) return;
    try {
      setIsUpdating(true);
      await api.deleteNote(id);
      const day = await api.getDailyView(selectedPlanId, selectedDate);
      setDailyView(day);
      setNotes(day.notes || []);
      const cal = await api.getCalendar(selectedPlanId, calendarYear, calendarMonth);
      setCalendarData(cal);
    } catch (err: any) {
      alert(`Error deleting note: ${err.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleConvertToConcept = async () => {
    if (!convertToConceptModal.note || !convertToConceptModal.subjectId) {
      alert('Please select a Subject in the Concept Library');
      return;
    }
    try {
      setIsUpdating(true);
      const selectedSubj = subjects.find(s => s._id === convertToConceptModal.subjectId);
      await api.convertNoteToConcept({
        noteId: convertToConceptModal.note._id,
        subjectName: selectedSubj?.name || 'General',
        importance: convertToConceptModal.importance,
        difficulty: convertToConceptModal.difficulty,
      });
      alert('Note successfully converted into a Concept Library entry!');
      setConvertToConceptModal({ isOpen: false, note: null, subjectId: '', importance: 'medium', difficulty: 'medium' });
      const day = await api.getDailyView(selectedPlanId, selectedDate);
      setDailyView(day);
      setNotes(day.notes || []);
    } catch (err: any) {
      alert(`Conversion error: ${err.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  // ----------------------------------------------------
  // Schedule Spreadsheet Editor Operations
  // ----------------------------------------------------
  const handleOpenScheduleEditor = async () => {
    if (!dailyView) return;
    try {
      setIsUpdating(true);
      const items = await api.getSchedule(dailyView.plan.id, dailyView.plan.currentDayNumber);
      setScheduleItems(items);
      setIsScheduleEditorOpen(true);
    } catch (err: any) {
      alert('Failed to load schedule items: ' + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleScheduleItemChange = (index: number, field: keyof ScheduleItemData, value: any) => {
    setScheduleItems(prev => {
      const copy = [...prev];
      const item = { ...copy[index], [field]: value };
      if (field === 'videoRuntimeMinutes' || field === 'extraBufferMinutes') {
        const vRuntime = field === 'videoRuntimeMinutes' ? Number(value) : (item.videoRuntimeMinutes || 0);
        const vBuffer = field === 'extraBufferMinutes' ? Number(value) : (item.extraBufferMinutes || 30);
        item.durationMinutes = vRuntime > 0 ? vRuntime + vBuffer : item.durationMinutes;
      }
      copy[index] = item;
      return copy;
    });
  };

  const handleAddScheduleRow = () => {
    setScheduleItems(prev => [
      ...prev,
      {
        activityId: `custom-${Date.now()}`,
        name: 'New Study Activity',
        activityType: 'custom',
        targetProfile: 'both',
        videoRuntimeMinutes: 0,
        extraBufferMinutes: 0,
        durationMinutes: 60,
        isFlexible: false,
        isScored: true,
        maxPoints: 1,
      },
    ]);
  };

  const handleDuplicateScheduleRow = (index: number) => {
    setScheduleItems(prev => {
      const copy = [...prev];
      const orig = copy[index];
      copy.splice(index + 1, 0, {
        ...orig,
        activityId: `copy-${Date.now()}`,
        name: `${orig.name} (Copy)`,
      });
      return copy;
    });
  };

  const handleDeleteScheduleRow = (index: number) => {
    setScheduleItems(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleSaveSchedule = async () => {
    if (!dailyView) return;
    try {
      setIsUpdating(true);
      await api.updateSchedule(dailyView.plan.id, dailyView.plan.currentDayNumber, scheduleItems);
      setIsScheduleEditorOpen(false);
      const day = await api.getDailyView(selectedPlanId, selectedDate);
      setDailyView(day);
    } catch (err: any) {
      alert('Error saving schedule: ' + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleImportCsv = async () => {
    if (!dailyView || !pastedContent.trim()) {
      alert('Please paste table data or CSV content');
      return;
    }
    try {
      setIsUpdating(true);
      setScheduleValidationError(null);
      const imported = await api.importSchedule(dailyView.plan.id, dailyView.plan.currentDayNumber, pastedContent);
      setScheduleItems(imported);
      setIsPasteModalOpen(false);
      setPastedContent('');
      const day = await api.getDailyView(selectedPlanId, selectedDate);
      setDailyView(day);
    } catch (err: any) {
      setScheduleValidationError(err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleExportCsv = async () => {
    if (!dailyView) return;
    try {
      const csv = await api.exportSchedule(dailyView.plan.id, dailyView.plan.currentDayNumber);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `study-schedule-day-${dailyView.plan.currentDayNumber}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Export failed: ' + err.message);
    }
  };

  const handleResetSchedule = async () => {
    if (!dailyView) return;
    if (!confirm('Reset schedule to default calculated timetable? Custom items will be replaced.')) return;
    try {
      setIsUpdating(true);
      const items = await api.resetSchedule(dailyView.plan.id, dailyView.plan.currentDayNumber);
      setScheduleItems(items);
      const day = await api.getDailyView(selectedPlanId, selectedDate);
      setDailyView(day);
    } catch (err: any) {
      alert('Reset failed: ' + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDownloadTemplate = () => {
    const template = `Day,Activity,Activity Type,Video Runtime,Extra Buffer,Duration,Target Profile
1,React — Episode 1,react,68,30,98,both
1,Lunch Break (60 mins),break,0,0,60,both
1,Post-Lunch Transition (15 mins),transition,0,0,15,both
1,DSA Problem Solving (1h 30m),dsa,0,0,90,both
1,Afternoon Transition (15 mins),transition,0,0,15,both
1,Project Learning — 1 hour,project-learning,0,0,60,both
1,Job Search,job-search,0,0,45,both
1,Bigg Boss,personal,0,0,60,both
1,Valorant,personal,0,0,120,both`;
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'study-schedule-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Plan Management Handlers
  const handleCreatePlan = async () => {
    if (!newPlanForm.name.trim() || !newPlanForm.startDate) {
      alert('Please fill out all plan fields');
      return;
    }
    try {
      setIsUpdating(true);
      const plan = await api.createPlan(newPlanForm);
      setPlans(prev => [plan, ...prev]);
      setSelectedPlanId(plan._id);
      setCurrentPlan(plan);
      setIsPlanModalOpen(false);
    } catch (err: any) {
      alert(`Error creating plan: ${err.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDuplicatePlan = async () => {
    if (!selectedPlanId) return;
    try {
      setIsUpdating(true);
      const dup = await api.duplicatePlan(selectedPlanId);
      setPlans(prev => [dup, ...prev]);
      setSelectedPlanId(dup._id);
      setCurrentPlan(dup);
      alert(`Plan cloned as: ${dup.name}`);
    } catch (err: any) {
      alert(`Error duplicating plan: ${err.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleArchivePlan = async () => {
    if (!selectedPlanId) return;
    if (!confirm('Archive this study plan?')) return;
    try {
      setIsUpdating(true);
      await api.archivePlan(selectedPlanId);
      const allPlans = await api.getPlans();
      setPlans(allPlans);
      if (allPlans.length > 0) {
        setSelectedPlanId(allPlans[0]._id);
        setCurrentPlan(allPlans[0]);
      }
    } catch (err: any) {
      alert(`Error archiving plan: ${err.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  // Calendar Navigation
  const handlePrevMonth = () => {
    if (calendarMonth === 1) {
      setCalendarMonth(12);
      setCalendarYear(prev => prev - 1);
    } else {
      setCalendarMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (calendarMonth === 12) {
      setCalendarMonth(1);
      setCalendarYear(prev => prev + 1);
    } else {
      setCalendarMonth(prev => prev + 1);
    }
  };

  // Month names
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Helper to format date display
  const formatDateDisplay = (dateStr: string) => {
    try {
      const parts = dateStr.split('-');
      const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // Helper to format live stopwatch time
  const formatStopwatchTimer = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const hh = h < 10 ? `0${h}` : `${h}`;
    const mm = m < 10 ? `0${m}` : `${m}`;
    const ss = s < 10 ? `0${s}` : `${s}`;
    return `${hh}:${mm}:${ss}`;
  };

  // Active DSA topic object for selected profile
  const activeDSATopicId = dailyView?.profiles[activeDSAProfile]?.dsa?.topicId || 'arrays-hashing';
  const currentDSATopic = dsaTopics.find(t => t.id === activeDSATopicId) || dsaTopics[0];
  const activeDSACompletedList = dailyView?.profiles[activeDSAProfile]?.dsa?.completedProblemNumbers || [];

  // Filtered notes
  const filteredNotes = notes.filter(n => {
    const matchProfile = activeNoteProfile === 'all' || n.profileId === activeNoteProfile;
    const matchActivity = activeNoteActivity === 'all' || n.activityType === activeNoteActivity;
    return matchProfile && matchActivity;
  });

  if (loading && !dailyView) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
          <p className="text-xs font-mono text-zinc-500">Loading Study Planner & Timetable...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* -------------------------------------------------------------------------------- */}
      {/* 1. OVERVIEW & PROGRESS HEADER */}
      {/* -------------------------------------------------------------------------------- */}
      <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 shadow-sm backdrop-blur-md">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-zinc-800/60">
          {/* Plan Selector & Date */}
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">Active Study Plan</span>
              <button
                onClick={() => setIsPlanModalOpen(true)}
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition"
              >
                <Plus className="w-3.5 h-3.5" /> New Plan
              </button>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={selectedPlanId}
                onChange={e => {
                  setSelectedPlanId(e.target.value);
                  const p = plans.find(pl => pl._id === e.target.value);
                  if (p) setCurrentPlan(p);
                }}
                className="bg-zinc-950 border border-zinc-800 text-zinc-100 text-sm font-semibold rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500"
              >
                {plans.map(p => (
                  <option key={p._id} value={p._id}>
                    {p.name} ({p.startDate} — {p.totalDays}d)
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleDuplicatePlan}
                  title="Duplicate plan"
                  className="p-1.5 text-zinc-400 hover:text-zinc-200 bg-zinc-800/60 rounded-lg hover:bg-zinc-800 transition"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleArchivePlan}
                  title="Archive plan"
                  className="p-1.5 text-zinc-400 hover:text-zinc-200 bg-zinc-800/60 rounded-lg hover:bg-zinc-800 transition"
                >
                  <Archive className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Selected Date Indicator */}
          <div className="flex items-center gap-3 bg-zinc-950/70 border border-zinc-800/80 rounded-xl px-4 py-2">
            <CalendarIcon className="w-4 h-4 text-zinc-400" />
            <div>
              <p className="text-[11px] uppercase tracking-wider font-mono text-zinc-500">Selected Date</p>
              <p className="text-sm font-medium text-zinc-200">
                {formatDateDisplay(selectedDate)}
                {dailyView?.plan.isInPlanRange && (
                  <span className="ml-2 text-xs font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Day {dailyView.plan.currentDayNumber} of {dailyView.plan.totalDays}
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Dual Progress Bars & Daily Scores */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
          {/* You (Blue) */}
          <div className="bg-zinc-950/50 border border-blue-500/20 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50"></div>
                <span className="text-sm font-semibold text-blue-400">You</span>
                <span className="text-xs text-zinc-400 font-mono">
                  {dailyView?.overallProgress.you.percentage || 0}% overall
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-zinc-400">Daily Score:</span>
                <span className="text-sm font-bold text-blue-400 font-mono">
                  {dailyView?.profiles.you.score ?? 0}/10
                </span>
              </div>
            </div>
            <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-blue-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${dailyView?.overallProgress.you.percentage || 0}%` }}
              ></div>
            </div>
          </div>

          {/* Girlfriend (Pink) */}
          <div className="bg-zinc-950/50 border border-pink-500/20 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-pink-500 shadow-sm shadow-pink-500/50"></div>
                <span className="text-sm font-semibold text-pink-400">Girlfriend</span>
                <span className="text-xs text-zinc-400 font-mono">
                  {dailyView?.overallProgress.girlfriend.percentage || 0}% overall
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-zinc-400">Daily Score:</span>
                <span className="text-sm font-bold text-pink-400 font-mono">
                  {dailyView?.profiles.girlfriend.score ?? 0}/10
                </span>
              </div>
            </div>
            <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-pink-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${dailyView?.overallProgress.girlfriend.percentage || 0}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* -------------------------------------------------------------------------------- */}
      {/* 2. COMPACT TIMETABLE & LIVE STOPWATCH ENGINE */}
      {/* -------------------------------------------------------------------------------- */}
      <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 shadow-sm space-y-4">
        {/* Timetable Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800/60">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2.5">
              <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" />
                Daily Study Routine
              </h2>
              {dailyView?.totalPlannedFormatted && (
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                  Planned: {dailyView.totalPlannedFormatted}
                </span>
              )}
            </div>
          </div>

          {/* Right Controls: Start Time Toggle & Edit Schedule */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Start Time Toggle */}
            <div className="flex items-center gap-1 bg-zinc-950 border border-zinc-800 rounded-xl p-1 text-xs">
              <span className="text-zinc-500 px-2 font-mono">Start:</span>
              <button
                onClick={() => handleStartTimeChange('10:30')}
                className={`px-2.5 py-1 rounded-lg font-medium transition ${
                  dailyView?.startTime === '10:30'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                10:30 AM
              </button>
              <button
                onClick={() => handleStartTimeChange('11:00')}
                className={`px-2.5 py-1 rounded-lg font-medium transition ${
                  dailyView?.startTime === '11:00'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                11:00 AM
              </button>
            </div>

            {/* Edit Schedule Button */}
            <button
              onClick={handleOpenScheduleEditor}
              className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium flex items-center gap-1.5 transition border border-zinc-700"
            >
              <Table className="w-3.5 h-3.5 text-blue-400" />
              Edit Schedule
            </button>
          </div>
        </div>

        {/* Current Activity Banner ("What should I be doing now?") */}
        {dailyView?.currentActivity && (
          <div className="bg-gradient-to-r from-blue-950/40 via-zinc-900/60 to-purple-950/30 border border-blue-500/30 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></div>
              <div>
                <p className="text-[11px] font-mono uppercase text-blue-400 font-semibold tracking-wider">
                  Active Now
                </p>
                <p className="text-sm font-semibold text-zinc-100">{dailyView.currentActivity.name}</p>
              </div>
            </div>
            <div className="text-right font-mono text-xs text-zinc-400">
              <span>Planned: {dailyView.currentActivity.startTimeFormatted} – {dailyView.currentActivity.endTimeFormatted}</span>
              <span className="ml-2 text-zinc-500">({dailyView.currentActivity.durationFormatted})</span>
            </div>
          </div>
        )}

        {/* Compact Timetable Grid */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 text-[11px] font-mono text-zinc-500 uppercase tracking-wider">
                <th className="py-2.5 px-3">Activity</th>
                <th className="py-2.5 px-3">Planned Time</th>
                <th className="py-2.5 px-3">Est. Duration</th>
                <th className="py-2.5 px-3">You (Blue)</th>
                <th className="py-2.5 px-3">Girlfriend (Pink)</th>
                <th className="py-2.5 px-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {dailyView?.timetable.map((slot: TaskTimeSlot) => {
                // Subtle Timeline Separator for Break / Transition
                if (slot.isBreakOrTransition) {
                  return (
                    <tr
                      key={slot.id}
                      className="bg-zinc-950/30 text-zinc-500 hover:bg-zinc-900/20 transition-colors"
                    >
                      <td colSpan={2} className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-zinc-700"></span>
                          <span className="font-medium text-zinc-400">{slot.name}</span>
                        </div>
                      </td>
                      <td className="py-2 px-3 font-mono text-zinc-500">
                        {slot.startTimeFormatted} – {slot.endTimeFormatted} ({slot.durationFormatted})
                      </td>
                      <td colSpan={2} className="py-2 px-3 text-[11px] font-mono text-zinc-600">
                        Rest / Transition Window
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-zinc-600">
                        Break
                      </td>
                    </tr>
                  );
                }

                // Actual Activity Row
                const youRunning = slot.youTimer?.status === 'running';
                const youPaused = slot.youTimer?.status === 'paused';
                const youCompleted = slot.youTimer?.status === 'completed' || dailyView.profiles.you.progress.reactCompleted && slot.category === 'react';

                const gfRunning = slot.girlfriendTimer?.status === 'running';
                const gfPaused = slot.girlfriendTimer?.status === 'paused';
                const gfCompleted = slot.girlfriendTimer?.status === 'completed' || dailyView.profiles.girlfriend.progress.reactCompleted && slot.category === 'react';

                return (
                  <tr
                    key={slot.id}
                    className={`transition-colors ${
                      slot.isCurrent
                        ? 'bg-blue-950/20 hover:bg-blue-950/30 ring-1 ring-blue-500/30'
                        : 'hover:bg-zinc-800/30'
                    }`}
                  >
                    {/* 1. Activity Name & Links */}
                    <td className="py-3 px-3">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          {slot.category === 'react' && <Video className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />}
                          {slot.category === 'dsa' && <Code2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />}
                          {slot.category === 'afternoon' && <BookOpen className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />}
                          {slot.category === 'job-search' && <Briefcase className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />}
                          <span className="font-semibold text-zinc-200">{slot.name}</span>
                        </div>

                        {/* Extra contextual links */}
                        <div className="flex items-center gap-2 pt-0.5 text-[11px]">
                          {slot.videoUrl && (
                            <a
                              href={slot.videoUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-400 hover:text-blue-300 flex items-center gap-1 transition"
                            >
                              <Play className="w-3 h-3 fill-current" /> Watch Video
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                          {slot.category === 'dsa' && (
                            <a href="#dsa-section" className="text-emerald-400 hover:underline">
                              DSA Matrix ({dailyView.profiles[activeDSAProfile].dsa.completedCount}/10 solved)
                            </a>
                          )}
                          {slot.targetMissed5PM && (
                            <span className="text-amber-400 font-mono flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> Target 5:00 PM delayed
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* 2. Planned Time */}
                    <td className="py-3 px-3 font-mono text-zinc-300">
                      {slot.startTimeFormatted} – {slot.endTimeFormatted}
                    </td>

                    {/* 3. Estimated Duration */}
                    <td className="py-3 px-3 font-mono text-zinc-400">
                      {slot.durationFormatted}
                      {slot.isScored && (
                        <span className="ml-1.5 text-[10px] px-1 py-0.2 rounded bg-zinc-800 text-zinc-400">
                          +{slot.maxPoints} pts
                        </span>
                      )}
                    </td>

                    {/* 4. You (Blue Profile Stopwatch & Controls) */}
                    <td className="py-3 px-3">
                      <div className="bg-zinc-950/60 border border-blue-500/20 rounded-lg p-2 space-y-1.5 min-w-[190px]">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono text-blue-400 font-semibold uppercase">You</span>
                          <span
                            className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                              slot.youTimer?.isOvertime
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : 'bg-zinc-800 text-zinc-400'
                            }`}
                          >
                            {slot.youTimer?.diffFormatted || '—'}
                          </span>
                        </div>

                        {/* Stopwatch Display */}
                        <div className="flex items-center justify-between font-mono">
                          <span
                            className={`text-xs font-bold ${
                              youRunning ? 'text-blue-400 animate-pulse' : 'text-zinc-200'
                            }`}
                          >
                            {formatStopwatchTimer(slot.youTimer?.elapsedSeconds || 0)}
                          </span>

                          {/* Stopwatch Action Buttons */}
                          <div className="flex items-center gap-1">
                            {slot.youTimer?.status !== 'running' && slot.youTimer?.status !== 'completed' && (
                              <button
                                onClick={() => handleStartTimer(slot.id, slot.name, 'you')}
                                className="p-1 rounded bg-blue-600 hover:bg-blue-500 text-white transition"
                                title="Start Stopwatch"
                              >
                                <Play className="w-3 h-3 fill-current" />
                              </button>
                            )}
                            {slot.youTimer?.status === 'running' && (
                              <button
                                onClick={() => handlePauseTimer(slot.youTimer!.timerId!)}
                                className="p-1 rounded bg-amber-600 hover:bg-amber-500 text-white transition"
                                title="Pause Stopwatch"
                              >
                                <Pause className="w-3 h-3 fill-current" />
                              </button>
                            )}
                            {slot.youTimer?.status === 'paused' && (
                              <button
                                onClick={() => handleResumeTimer(slot.youTimer!.timerId!)}
                                className="p-1 rounded bg-blue-600 hover:bg-blue-500 text-white transition"
                                title="Resume Stopwatch"
                              >
                                <Play className="w-3 h-3 fill-current" />
                              </button>
                            )}
                            {(slot.youTimer?.status === 'running' || slot.youTimer?.status === 'paused') && (
                              <button
                                onClick={() => handleFinishTimer(slot.youTimer!.timerId!)}
                                className="p-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white transition"
                                title="Finish and Save Time"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                            )}
                            {slot.youTimer?.status === 'completed' && (
                              <span className="text-[11px] text-emerald-400 font-mono flex items-center gap-0.5">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Done
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actual time spent & start/finish timestamps */}
                        {slot.youTimer?.actualDurationFormatted && slot.youTimer.actualDurationFormatted !== '—' && (
                          <div className="text-[10px] font-mono text-zinc-500 flex items-center justify-between pt-0.5 border-t border-zinc-800/60">
                            <span>Actual: {slot.youTimer.actualDurationFormatted}</span>
                            {slot.youTimer.actualStartFormatted && (
                              <span>{slot.youTimer.actualStartFormatted}–{slot.youTimer.actualFinishFormatted || 'now'}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* 5. Girlfriend (Pink Profile Stopwatch & Controls) */}
                    <td className="py-3 px-3">
                      <div className="bg-zinc-950/60 border border-pink-500/20 rounded-lg p-2 space-y-1.5 min-w-[190px]">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono text-pink-400 font-semibold uppercase">Girlfriend</span>
                          <span
                            className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                              slot.girlfriendTimer?.isOvertime
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : 'bg-zinc-800 text-zinc-400'
                            }`}
                          >
                            {slot.girlfriendTimer?.diffFormatted || '—'}
                          </span>
                        </div>

                        {/* Stopwatch Display */}
                        <div className="flex items-center justify-between font-mono">
                          <span
                            className={`text-xs font-bold ${
                              gfRunning ? 'text-pink-400 animate-pulse' : 'text-zinc-200'
                            }`}
                          >
                            {formatStopwatchTimer(slot.girlfriendTimer?.elapsedSeconds || 0)}
                          </span>

                          {/* Stopwatch Action Buttons */}
                          <div className="flex items-center gap-1">
                            {slot.girlfriendTimer?.status !== 'running' && slot.girlfriendTimer?.status !== 'completed' && (
                              <button
                                onClick={() => handleStartTimer(slot.id, slot.name, 'girlfriend')}
                                className="p-1 rounded bg-pink-600 hover:bg-pink-500 text-white transition"
                                title="Start Stopwatch"
                              >
                                <Play className="w-3 h-3 fill-current" />
                              </button>
                            )}
                            {slot.girlfriendTimer?.status === 'running' && (
                              <button
                                onClick={() => handlePauseTimer(slot.girlfriendTimer!.timerId!)}
                                className="p-1 rounded bg-amber-600 hover:bg-amber-500 text-white transition"
                                title="Pause Stopwatch"
                              >
                                <Pause className="w-3 h-3 fill-current" />
                              </button>
                            )}
                            {slot.girlfriendTimer?.status === 'paused' && (
                              <button
                                onClick={() => handleResumeTimer(slot.girlfriendTimer!.timerId!)}
                                className="p-1 rounded bg-pink-600 hover:bg-pink-500 text-white transition"
                                title="Resume Stopwatch"
                              >
                                <Play className="w-3 h-3 fill-current" />
                              </button>
                            )}
                            {(slot.girlfriendTimer?.status === 'running' || slot.girlfriendTimer?.status === 'paused') && (
                              <button
                                onClick={() => handleFinishTimer(slot.girlfriendTimer!.timerId!)}
                                className="p-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white transition"
                                title="Finish and Save Time"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                            )}
                            {slot.girlfriendTimer?.status === 'completed' && (
                              <span className="text-[11px] text-emerald-400 font-mono flex items-center gap-0.5">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Done
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actual time spent & start/finish timestamps */}
                        {slot.girlfriendTimer?.actualDurationFormatted && slot.girlfriendTimer.actualDurationFormatted !== '—' && (
                          <div className="text-[10px] font-mono text-zinc-500 flex items-center justify-between pt-0.5 border-t border-zinc-800/60">
                            <span>Actual: {slot.girlfriendTimer.actualDurationFormatted}</span>
                            {slot.girlfriendTimer.actualStartFormatted && (
                              <span>{slot.girlfriendTimer.actualStartFormatted}–{slot.girlfriendTimer.actualFinishFormatted || 'now'}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* 6. Overall Row Status */}
                    <td className="py-3 px-3 text-right">
                      {youCompleted && gfCompleted ? (
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Completed
                        </span>
                      ) : youRunning || gfRunning ? (
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse">
                          Running
                        </span>
                      ) : slot.isCurrent ? (
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          Active Now
                        </span>
                      ) : slot.isPast ? (
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
                          Past
                        </span>
                      ) : (
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-950 text-zinc-500 border border-zinc-800">
                          Upcoming
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* -------------------------------------------------------------------------------- */}
      {/* 3. CALENDAR VIEW */}
      {/* -------------------------------------------------------------------------------- */}
      <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 shadow-sm">
        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-zinc-100">
              {monthNames[calendarMonth - 1]} {calendarYear}
            </h2>
            <button
              onClick={() => {
                const now = new Date();
                setCalendarYear(now.getFullYear());
                setCalendarMonth(now.getMonth() + 1);
                setSelectedDate(todayStr);
              }}
              className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition"
            >
              Today
            </button>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNextMonth}
              className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Days of week header */}
        <div className="grid grid-cols-7 gap-1.5 text-center mb-1 text-[11px] font-mono text-zinc-500 uppercase tracking-wider">
          <span>Sun</span>
          <span>Mon</span>
          <span>Tue</span>
          <span>Wed</span>
          <span>Thu</span>
          <span>Fri</span>
          <span>Sat</span>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1.5">
          {(() => {
            const firstDayIndex = new Date(calendarYear, calendarMonth - 1, 1).getDay();
            const blanks = Array.from({ length: firstDayIndex }, (_, i) => i);
            const days = calendarData?.days || [];

            return (
              <>
                {blanks.map(b => (
                  <div key={`blank-${b}`} className="min-h-[64px] rounded-xl bg-zinc-950/20 border border-transparent"></div>
                ))}
                {days.map((dayItem: CalendarDayData) => {
                  const isToday = dayItem.date === todayStr;
                  const isSelected = dayItem.date === selectedDate;

                  return (
                    <button
                      key={dayItem.date}
                      onClick={() => setSelectedDate(dayItem.date)}
                      className={`min-h-[72px] p-2 rounded-xl text-left border transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'bg-zinc-800/90 border-blue-500/80 shadow-md ring-1 ring-blue-500/50'
                          : isToday
                          ? 'bg-zinc-900/90 border-emerald-500/40 hover:bg-zinc-800/50'
                          : dayItem.isInActivePlan
                          ? 'bg-zinc-950/70 border-zinc-800/80 hover:bg-zinc-800/40'
                          : 'bg-zinc-950/30 border-zinc-900/40 text-zinc-600 hover:bg-zinc-900/30'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span
                          className={`text-xs font-semibold ${
                            isSelected
                              ? 'text-white'
                              : isToday
                              ? 'text-emerald-400 font-bold'
                              : dayItem.isInActivePlan
                              ? 'text-zinc-200'
                              : 'text-zinc-500'
                          }`}
                        >
                          {dayItem.day}
                        </span>
                        {dayItem.isInActivePlan && dayItem.dayNumber && (
                          <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-zinc-800 text-zinc-400">
                            D{dayItem.dayNumber}
                          </span>
                        )}
                      </div>

                      <div className="space-y-1 w-full pt-1">
                        <div className="flex items-center justify-between text-[10px] font-mono leading-none">
                          <div className="flex items-center gap-1">
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                dayItem.you.score > 0 ? 'bg-blue-400 shadow-sm shadow-blue-500' : 'bg-zinc-700'
                              }`}
                            ></span>
                            <span className="text-zinc-400">Y</span>
                          </div>
                          <span className={dayItem.you.score > 0 ? 'text-blue-400 font-bold' : 'text-zinc-600'}>
                            {dayItem.you.score}/10
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[10px] font-mono leading-none">
                          <div className="flex items-center gap-1">
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                dayItem.girlfriend.score > 0 ? 'bg-pink-400 shadow-sm shadow-pink-500' : 'bg-zinc-700'
                              }`}
                            ></span>
                            <span className="text-zinc-400">GF</span>
                          </div>
                          <span className={dayItem.girlfriend.score > 0 ? 'text-pink-400 font-bold' : 'text-zinc-600'}>
                            {dayItem.girlfriend.score}/10
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </>
            );
          })()}
        </div>
      </div>

      {/* -------------------------------------------------------------------------------- */}
      {/* 4. DSA QUESTION TRACKER */}
      {/* -------------------------------------------------------------------------------- */}
      <div id="dsa-section" className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800/60">
          <div>
            <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
              <Code2 className="w-4 h-4 text-emerald-400" />
              DSA Curated Question Bank
            </h2>
            <p className="text-xs text-zinc-400">
              16 Essential Patterns × 10 LeetCode Questions (160 total). Target: 2–3 problems daily (+1 to 3 pts).
            </p>
          </div>

          <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-xl p-1 text-xs">
            <button
              onClick={() => setActiveDSAProfile('you')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
                activeDSAProfile === 'you'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <div className="w-2 h-2 rounded-full bg-blue-400"></div>
              You ({dailyView?.profiles.you.dsa.completedCount || 0}/10 solved)
            </button>
            <button
              onClick={() => setActiveDSAProfile('girlfriend')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
                activeDSAProfile === 'girlfriend'
                  ? 'bg-pink-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <div className="w-2 h-2 rounded-full bg-pink-400"></div>
              Girlfriend ({dailyView?.profiles.girlfriend.dsa.completedCount || 0}/10 solved)
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-zinc-950/60 border border-zinc-800/60 rounded-xl p-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono text-zinc-400">Current Pattern:</span>
            <select
              value={activeDSATopicId}
              onChange={e => handleDSATopicChange(activeDSAProfile, e.target.value)}
              className="bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs font-semibold rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500"
            >
              {dsaTopics.map(topic => (
                <option key={topic.id} value={topic.id}>
                  {topic.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-zinc-400 font-mono">
              Daily Target: <span className="text-emerald-400 font-bold">2–3 questions</span>
            </span>
            <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono">
              Score: +{Math.min(activeDSACompletedList.length, 3)} pts
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {currentDSATopic?.questions.map(q => {
            const isSolved = activeDSACompletedList.includes(q.number);

            return (
              <div
                key={q.number}
                className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                  isSolved
                    ? activeDSAProfile === 'you'
                      ? 'bg-blue-950/30 border-blue-500/40 text-blue-100'
                      : 'bg-pink-950/30 border-pink-500/40 text-pink-100'
                    : 'bg-zinc-950/50 border-zinc-800/80 text-zinc-300 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <button
                    onClick={() => handleToggleDSAQuestion(activeDSAProfile, q.number, activeDSATopicId)}
                    className="focus:outline-none"
                  >
                    {isSolved ? (
                      <CheckCircle2
                        className={`w-5 h-5 flex-shrink-0 ${
                          activeDSAProfile === 'you' ? 'text-blue-400' : 'text-pink-400'
                        }`}
                      />
                    ) : (
                      <Circle className="w-5 h-5 flex-shrink-0 text-zinc-600 hover:text-zinc-400 transition" />
                    )}
                  </button>

                  <div className="truncate">
                    <p
                      className={`text-xs font-medium truncate ${
                        isSolved ? 'line-through opacity-80' : 'text-zinc-200'
                      }`}
                    >
                      <span className="font-mono text-zinc-500 mr-1.5">#{q.number}</span>
                      {q.title}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                      q.difficulty === 'Easy'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : q.difficulty === 'Medium'
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}
                  >
                    {q.difficulty}
                  </span>

                  <a
                    href={q.url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1 rounded bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition"
                    title="Open on LeetCode"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* -------------------------------------------------------------------------------- */}
      {/* 5. NOTES & KNOWLEDGE CAPTURE */}
      {/* -------------------------------------------------------------------------------- */}
      <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800/60">
          <div>
            <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-400" />
              Day Study Notes & Observations
            </h2>
            <p className="text-xs text-zinc-400">
              Approach analysis, time & space complexities, and 1-click export into the Concept Library (+1 pt).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleOpenNoteModal()}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Note
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1 bg-zinc-950 border border-zinc-800 rounded-lg p-1">
            <button
              onClick={() => setActiveNoteProfile('all')}
              className={`px-2.5 py-1 rounded font-medium transition ${
                activeNoteProfile === 'all'
                  ? 'bg-zinc-800 text-zinc-100'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Both
            </button>
            <button
              onClick={() => setActiveNoteProfile('you')}
              className={`px-2.5 py-1 rounded font-medium transition ${
                activeNoteProfile === 'you'
                  ? 'bg-blue-600 text-white'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              You
            </button>
            <button
              onClick={() => setActiveNoteProfile('girlfriend')}
              className={`px-2.5 py-1 rounded font-medium transition ${
                activeNoteProfile === 'girlfriend'
                  ? 'bg-pink-600 text-white'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Girlfriend
            </button>
          </div>

          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            {['all', 'dsa', 'react', 'system-design', 'project-learning', 'job-search'].map(act => (
              <button
                key={act}
                onClick={() => setActiveNoteActivity(act)}
                className={`px-2 py-0.5 rounded text-[11px] font-mono capitalize transition ${
                  activeNoteActivity === act
                    ? 'bg-zinc-700 text-zinc-100'
                    : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                }`}
              >
                {act.replace('-', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Notes Cards List */}
        {filteredNotes.length === 0 ? (
          <div className="p-8 text-center bg-zinc-950/40 border border-zinc-800/40 rounded-xl space-y-2">
            <Edit3 className="w-6 h-6 text-zinc-600 mx-auto" />
            <p className="text-xs text-zinc-400">No notes written for this date yet.</p>
            <button
              onClick={() => handleOpenNoteModal()}
              className="text-xs text-blue-400 hover:underline"
            >
              Write your first note to earn +1 daily score point
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredNotes.map(n => (
              <div
                key={n._id}
                className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-3.5 space-y-2.5 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          n.profileId === 'you' ? 'bg-blue-400' : 'bg-pink-400'
                        }`}
                      ></span>
                      <span
                        className={`text-[11px] font-mono uppercase font-semibold ${
                          n.profileId === 'you' ? 'text-blue-400' : 'text-pink-400'
                        }`}
                      >
                        {n.profileId}
                      </span>
                      <span className="text-zinc-600">•</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 uppercase">
                        {n.activityType}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenNoteModal(n)}
                        className="p-1 text-zinc-400 hover:text-zinc-200 transition"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteNote(n._id)}
                        className="p-1 text-zinc-400 hover:text-rose-400 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h4 className="text-sm font-semibold text-zinc-200">{n.title}</h4>

                  {n.approach && (
                    <div className="text-xs text-zinc-400">
                      <span className="text-zinc-500 font-mono">Approach: </span>
                      {n.approach}
                    </div>
                  )}

                  {n.observations && (
                    <div className="text-xs text-zinc-400">
                      <span className="text-zinc-500 font-mono">Observations: </span>
                      {n.observations}
                    </div>
                  )}

                  {(n.timeComplexity || n.spaceComplexity) && (
                    <div className="flex items-center gap-2 pt-1 font-mono text-[11px]">
                      {n.timeComplexity && (
                        <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-emerald-400">
                          Time: {n.timeComplexity}
                        </span>
                      )}
                      {n.spaceComplexity && (
                        <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-teal-400">
                          Space: {n.spaceComplexity}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between">
                  {n.conceptId ? (
                    <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Saved in Concept Library
                    </span>
                  ) : (
                    <button
                      onClick={() =>
                        setConvertToConceptModal({
                          isOpen: true,
                          note: n,
                          subjectId: subjects[0]?._id || '',
                          importance: 'medium',
                          difficulty: 'medium',
                        })
                      }
                      className="text-[11px] font-medium text-blue-400 hover:text-blue-300 flex items-center gap-1 transition"
                    >
                      <Sparkles className="w-3 h-3 text-amber-400" /> Save as Concept Library Entry
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* -------------------------------------------------------------------------------- */}
      {/* SPREADSHEET SCHEDULE EDITOR MODAL */}
      {/* -------------------------------------------------------------------------------- */}
      {isScheduleEditorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-blue-400" />
                <h3 className="text-base font-semibold text-zinc-100">
                  Schedule Spreadsheet Editor — Day {dailyView?.plan.currentDayNumber}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadTemplate}
                  className="px-2.5 py-1 text-xs font-mono text-zinc-400 hover:text-zinc-200 bg-zinc-800/80 rounded-lg hover:bg-zinc-800 transition flex items-center gap-1"
                >
                  <Download className="w-3 h-3" /> Template CSV
                </button>
                <button
                  onClick={() => setIsPasteModalOpen(true)}
                  className="px-2.5 py-1 text-xs font-mono text-blue-400 hover:text-blue-300 bg-blue-500/10 rounded-lg hover:bg-blue-500/20 transition flex items-center gap-1 border border-blue-500/20"
                >
                  <Upload className="w-3 h-3" /> Paste from Excel / CSV
                </button>
                <button
                  onClick={handleExportCsv}
                  className="px-2.5 py-1 text-xs font-mono text-zinc-400 hover:text-zinc-200 bg-zinc-800/80 rounded-lg hover:bg-zinc-800 transition flex items-center gap-1"
                >
                  <Download className="w-3 h-3" /> Export CSV
                </button>
                <button
                  onClick={handleResetSchedule}
                  className="px-2.5 py-1 text-xs font-mono text-rose-400 hover:text-rose-300 bg-rose-500/10 rounded-lg hover:bg-rose-500/20 transition flex items-center gap-1 border border-rose-500/20"
                >
                  <RotateCcw className="w-3 h-3" /> Reset
                </button>
                <button
                  onClick={() => setIsScheduleEditorOpen(false)}
                  className="text-zinc-400 hover:text-zinc-200 text-sm ml-2"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Editable Spreadsheet Grid */}
            <div className="flex-1 overflow-auto p-4">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 text-[11px] font-mono text-zinc-400 uppercase">
                    <th className="py-2 px-2">#</th>
                    <th className="py-2 px-2">Activity Name</th>
                    <th className="py-2 px-2">Type</th>
                    <th className="py-2 px-2">Video Runtime (m)</th>
                    <th className="py-2 px-2">Extra Buffer (m)</th>
                    <th className="py-2 px-2">Duration (m)</th>
                    <th className="py-2 px-2">Profile</th>
                    <th className="py-2 px-2">Video URL</th>
                    <th className="py-2 px-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {scheduleItems.map((row, idx) => (
                    <tr key={idx} className="hover:bg-zinc-800/40">
                      <td className="py-2 px-2 font-mono text-zinc-500">{idx + 1}</td>

                      {/* Name */}
                      <td className="py-2 px-2">
                        <input
                          type="text"
                          value={row.name}
                          onChange={e => handleScheduleItemChange(idx, 'name', e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-zinc-200 focus:outline-none focus:border-blue-500"
                        />
                      </td>

                      {/* Activity Type */}
                      <td className="py-2 px-2">
                        <select
                          value={row.activityType}
                          onChange={e => handleScheduleItemChange(idx, 'activityType', e.target.value)}
                          className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-zinc-200 focus:outline-none focus:border-blue-500 font-mono text-[11px]"
                        >
                          <option value="react">React</option>
                          <option value="break">Break</option>
                          <option value="transition">Transition</option>
                          <option value="dsa">DSA</option>
                          <option value="project-learning">Project</option>
                          <option value="system-design">Sys Design</option>
                          <option value="job-search">Job Search</option>
                          <option value="personal">Personal</option>
                          <option value="custom">Custom</option>
                        </select>
                      </td>

                      {/* Video Runtime */}
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          min={0}
                          value={row.videoRuntimeMinutes || 0}
                          onChange={e => handleScheduleItemChange(idx, 'videoRuntimeMinutes', parseInt(e.target.value, 10) || 0)}
                          className="w-16 bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-zinc-200 font-mono text-center focus:outline-none focus:border-blue-500"
                        />
                      </td>

                      {/* Extra Buffer */}
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          min={0}
                          value={row.extraBufferMinutes || 0}
                          onChange={e => handleScheduleItemChange(idx, 'extraBufferMinutes', parseInt(e.target.value, 10) || 0)}
                          className="w-16 bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-zinc-200 font-mono text-center focus:outline-none focus:border-blue-500"
                        />
                      </td>

                      {/* Duration Minutes */}
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          min={1}
                          value={row.durationMinutes || 60}
                          onChange={e => handleScheduleItemChange(idx, 'durationMinutes', parseInt(e.target.value, 10) || 60)}
                          className="w-16 bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-zinc-200 font-mono text-center focus:outline-none focus:border-blue-500"
                        />
                      </td>

                      {/* Target Profile */}
                      <td className="py-2 px-2">
                        <select
                          value={row.targetProfile || 'both'}
                          onChange={e => handleScheduleItemChange(idx, 'targetProfile', e.target.value)}
                          className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-zinc-200 focus:outline-none focus:border-blue-500 font-mono text-[11px]"
                        >
                          <option value="both">Both</option>
                          <option value="you">You</option>
                          <option value="girlfriend">Girlfriend</option>
                        </select>
                      </td>

                      {/* Video URL */}
                      <td className="py-2 px-2">
                        <input
                          type="text"
                          placeholder="https://youtube.com/..."
                          value={row.videoUrl || ''}
                          onChange={e => handleScheduleItemChange(idx, 'videoUrl', e.target.value)}
                          className="w-36 bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-zinc-200 text-[11px] focus:outline-none focus:border-blue-500"
                        />
                      </td>

                      {/* Actions */}
                      <td className="py-2 px-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleDuplicateScheduleRow(idx)}
                            className="p-1 text-zinc-400 hover:text-zinc-200 transition"
                            title="Duplicate Row"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteScheduleRow(idx)}
                            className="p-1 text-zinc-400 hover:text-rose-400 transition"
                            title="Delete Row"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <button
                onClick={handleAddScheduleRow}
                className="mt-3 px-3 py-1.5 rounded-lg border border-dashed border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-zinc-200 text-xs font-mono flex items-center gap-1.5 transition"
              >
                <Plus className="w-3.5 h-3.5" /> Add Activity Row
              </button>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-zinc-800 flex items-center justify-between">
              <span className="text-xs font-mono text-zinc-500">
                {scheduleItems.length} rows configured
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsScheduleEditorOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveSchedule}
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition"
                >
                  Save Schedule
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------------------- */}
      {/* BULK IMPORT / PASTE FROM EXCEL MODAL */}
      {/* -------------------------------------------------------------------------------- */}
      {isPasteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
                <Upload className="w-4 h-4 text-blue-400" />
                Paste Rows from Excel / Google Sheets
              </h3>
              <button
                onClick={() => {
                  setIsPasteModalOpen(false);
                  setScheduleValidationError(null);
                }}
                className="text-zinc-400 hover:text-zinc-200 text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-zinc-400">
              Copy rows directly from Excel or Google Sheets (or CSV) and paste below. The first row should contain headers (e.g. Activity, Duration, Type).
            </p>

            {scheduleValidationError && (
              <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-mono">
                {scheduleValidationError}
              </div>
            )}

            <textarea
              rows={8}
              placeholder={`Activity\tDuration\tType\nReact\t90\treact\nLunch\t60\tbreak\nDSA\t90\tdsa`}
              value={pastedContent}
              onChange={e => setPastedContent(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-xs font-mono text-zinc-200 focus:outline-none focus:border-blue-500"
            ></textarea>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
              <button
                onClick={() => {
                  setIsPasteModalOpen(false);
                  setScheduleValidationError(null);
                }}
                className="px-3 py-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleImportCsv}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
              >
                Parse and Load Rows
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------------------- */}
      {/* MODAL: ADD / EDIT NOTE */}
      {/* -------------------------------------------------------------------------------- */}
      {isNoteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-blue-400" />
                {editingNoteId ? 'Edit Study Note' : 'Add Study Note'}
              </h3>
              <button
                onClick={() => setIsNoteModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-200 text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-zinc-400 font-mono block mb-1">Author Profile</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setModalAuthorProfile('you')}
                    className={`flex-1 py-1.5 rounded-lg font-medium border transition ${
                      modalAuthorProfile === 'you'
                        ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                    }`}
                  >
                    You
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalAuthorProfile('girlfriend')}
                    className={`flex-1 py-1.5 rounded-lg font-medium border transition ${
                      modalAuthorProfile === 'girlfriend'
                        ? 'bg-pink-600/20 border-pink-500 text-pink-300'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                    }`}
                  >
                    Girlfriend
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-zinc-400 font-mono block mb-1">Title</label>
                  <input
                    type="text"
                    placeholder="e.g. 3Sum Two-Pointer Invariant"
                    value={noteForm.title}
                    onChange={e => setNoteForm(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 font-mono block mb-1">Activity</label>
                  <select
                    value={noteForm.activityType}
                    onChange={e => setNoteForm(prev => ({ ...prev, activityType: e.target.value as any }))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-200 focus:outline-none focus:border-blue-500"
                  >
                    <option value="dsa">DSA Practice</option>
                    <option value="react">React Session</option>
                    <option value="system-design">System Design</option>
                    <option value="project-learning">Project Learning</option>
                    <option value="job-search">Job Search</option>
                    <option value="reflection">General Reflection</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-zinc-400 font-mono block mb-1">Approach / Core Strategy</label>
                <textarea
                  rows={2}
                  placeholder="Sort array first, skip duplicates, use two pointers for remaining pair..."
                  value={noteForm.approach}
                  onChange={e => setNoteForm(prev => ({ ...prev, approach: e.target.value }))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-200 focus:outline-none focus:border-blue-500"
                ></textarea>
              </div>

              <div>
                <label className="text-zinc-400 font-mono block mb-1">Key Observations / Gotchas</label>
                <textarea
                  rows={2}
                  placeholder="Need to advance pointer while nums[left] === nums[left-1] to avoid duplicate triplets..."
                  value={noteForm.observations}
                  onChange={e => setNoteForm(prev => ({ ...prev, observations: e.target.value }))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-200 focus:outline-none focus:border-blue-500"
                ></textarea>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-zinc-400 font-mono block mb-1">Time Complexity</label>
                  <input
                    type="text"
                    placeholder="e.g. O(N^2)"
                    value={noteForm.timeComplexity}
                    onChange={e => setNoteForm(prev => ({ ...prev, timeComplexity: e.target.value }))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-200 font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 font-mono block mb-1">Space Complexity</label>
                  <input
                    type="text"
                    placeholder="e.g. O(1) or O(N)"
                    value={noteForm.spaceComplexity}
                    onChange={e => setNoteForm(prev => ({ ...prev, spaceComplexity: e.target.value }))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-200 font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
              <button
                onClick={() => setIsNoteModalOpen(false)}
                className="px-3 py-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNote}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
              >
                Save Note (+1 Point)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------------------- */}
      {/* MODAL: CONVERT NOTE TO CONCEPT LIBRARY ENTRY */}
      {/* -------------------------------------------------------------------------------- */}
      {convertToConceptModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Save Note to Concept Library
              </h3>
              <button
                onClick={() =>
                  setConvertToConceptModal({ isOpen: false, note: null, subjectId: '', importance: 'medium', difficulty: 'medium' })
                }
                className="text-zinc-400 hover:text-zinc-200 text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-zinc-400">
              This will create a permanent structured entry in your Personal Learning OS Concept Library, ready for Spaced Repetition (FSRS) and Recall!
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-zinc-400 font-mono block mb-1">Target Subject</label>
                <select
                  value={convertToConceptModal.subjectId}
                  onChange={e =>
                    setConvertToConceptModal(prev => ({ ...prev, subjectId: e.target.value }))
                  }
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-200 focus:outline-none focus:border-blue-500"
                >
                  {subjects.map(s => (
                    <option key={s._id} value={s._id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-zinc-400 font-mono block mb-1">Importance</label>
                  <select
                    value={convertToConceptModal.importance}
                    onChange={e =>
                      setConvertToConceptModal(prev => ({ ...prev, importance: e.target.value }))
                    }
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-200 focus:outline-none focus:border-blue-500"
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
                <div>
                  <label className="text-zinc-400 font-mono block mb-1">Difficulty</label>
                  <select
                    value={convertToConceptModal.difficulty}
                    onChange={e =>
                      setConvertToConceptModal(prev => ({ ...prev, difficulty: e.target.value }))
                    }
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-200 focus:outline-none focus:border-blue-500"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
              <button
                onClick={() =>
                  setConvertToConceptModal({ isOpen: false, note: null, subjectId: '', importance: 'medium', difficulty: 'medium' })
                }
                className="px-3 py-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleConvertToConcept}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
              >
                Convert & Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------------------- */}
      {/* MODAL: CREATE PLAN */}
      {/* -------------------------------------------------------------------------------- */}
      {isPlanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-blue-400" />
                Create New Study Plan
              </h3>
              <button
                onClick={() => setIsPlanModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-200 text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-zinc-400 font-mono block mb-1">Plan Name</label>
                <input
                  type="text"
                  value={newPlanForm.name}
                  onChange={e => setNewPlanForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. 10-Day Fullstack Sprint"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-zinc-400 font-mono block mb-1">Start Date</label>
                  <input
                    type="date"
                    value={newPlanForm.startDate}
                    onChange={e => setNewPlanForm(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 font-mono block mb-1">Total Days</label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={newPlanForm.totalDays}
                    onChange={e => setNewPlanForm(prev => ({ ...prev, totalDays: parseInt(e.target.value, 10) || 10 }))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-zinc-400 font-mono block mb-1">Default Start Time</label>
                <select
                  value={newPlanForm.defaultStartTime}
                  onChange={e => setNewPlanForm(prev => ({ ...prev, defaultStartTime: e.target.value }))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="10:30">10:30 AM</option>
                  <option value="11:00">11:00 AM</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
              <button
                onClick={() => setIsPlanModalOpen(false)}
                className="px-3 py-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePlan}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
              >
                Create Plan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
