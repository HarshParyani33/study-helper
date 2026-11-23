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
  User,
  Heart,
  Briefcase,
  Code2,
  Video,
  Trophy,
  Flame,
  Bookmark,
  Trash2,
  Edit3,
  Copy,
  Archive,
  Layers,
  Play,
  RotateCcw,
  Check,
  AlertCircle,
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

  // Profile Task Toggle Handler
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

      // Refresh calendar indicators
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
      // Refresh daily view and calendar
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
          <p className="text-xs font-mono text-zinc-500">Loading Study Planner & Roadmap...</p>
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
            {/* Progress bar */}
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
            {/* Progress bar */}
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
      {/* 2. CALENDAR VIEW */}
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
            // Calculate first day of month padding
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
                      {/* Date Header */}
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

                      {/* Profile Indicators & Scores */}
                      <div className="space-y-1 w-full pt-1">
                        {/* You indicator */}
                        <div className="flex items-center justify-between text-[10px] font-mono leading-none">
                          <div className="flex items-center gap-1">
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                dayItem.you.score > 0 ? 'bg-blue-400 shadow-sm shadow-blue-500' : 'bg-zinc-700'
                              }`}
                            ></span>
                            <span className="text-zinc-400">Y</span>
                          </div>
                          <span
                            className={dayItem.you.score > 0 ? 'text-blue-400 font-bold' : 'text-zinc-600'}
                          >
                            {dayItem.you.score}/10
                          </span>
                        </div>

                        {/* Girlfriend indicator */}
                        <div className="flex items-center justify-between text-[10px] font-mono leading-none">
                          <div className="flex items-center gap-1">
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                dayItem.girlfriend.score > 0 ? 'bg-pink-400 shadow-sm shadow-pink-500' : 'bg-zinc-700'
                              }`}
                            ></span>
                            <span className="text-zinc-400">GF</span>
                          </div>
                          <span
                            className={dayItem.girlfriend.score > 0 ? 'text-pink-400 font-bold' : 'text-zinc-600'}
                          >
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
      {/* 3. DAILY STUDY VIEW (TIMETABLE & TASKS) */}
      {/* -------------------------------------------------------------------------------- */}
      <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 shadow-sm space-y-4">
        {/* Timetable Header & Start Time Switcher */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800/60">
          <div>
            <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              Daily Study Routine & Timetable
            </h2>
            <p className="text-xs text-zinc-400">
              Ordered tasks with dynamic finish times, runtime calculations, and dual-profile tracking.
            </p>
          </div>

          {/* 10:30 vs 11:00 AM start time selector */}
          <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-xl p-1 text-xs">
            <span className="text-zinc-400 px-2 font-mono">Start Time:</span>
            <button
              onClick={() => handleStartTimeChange('10:30')}
              className={`px-3 py-1 rounded-lg font-medium transition ${
                dailyView?.startTime === '10:30'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              10:30 AM
            </button>
            <button
              onClick={() => handleStartTimeChange('11:00')}
              className={`px-3 py-1 rounded-lg font-medium transition ${
                dailyView?.startTime === '11:00'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              11:00 AM
            </button>
          </div>
        </div>

        {/* Timetable Tasks Stack */}
        <div className="space-y-3">
          {dailyView?.timetable.map((slot, idx) => {
            if (slot.category === 'react') {
              return (
                <div
                  key={idx}
                  className="bg-zinc-950/70 border border-zinc-800/80 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        {slot.startTime} – {slot.endTime}
                      </span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        +2 pts
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                      <Video className="w-4 h-4 text-blue-400" />
                      {slot.title}
                    </h3>
                    <p className="text-xs text-zinc-400">{slot.description}</p>
                    {slot.link && (
                      <a
                        href={slot.link}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition pt-1"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" /> Watch Episode on YouTube
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>

                  {/* Dual Checkboxes */}
                  <div className="flex items-center gap-3 bg-zinc-900/80 border border-zinc-800 rounded-xl p-2.5">
                    {/* You Checkbox */}
                    <button
                      onClick={() =>
                        handleToggleTask('you', 'reactCompleted', !!dailyView.profiles.you.progress.reactCompleted)
                      }
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition ${
                        dailyView.profiles.you.progress.reactCompleted
                          ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                          : 'bg-zinc-800/40 border-zinc-700 text-zinc-400 hover:border-blue-500/50'
                      }`}
                    >
                      {dailyView.profiles.you.progress.reactCompleted ? (
                        <CheckCircle2 className="w-4 h-4 text-blue-400" />
                      ) : (
                        <Circle className="w-4 h-4 text-zinc-500" />
                      )}
                      You Done
                    </button>

                    {/* Girlfriend Checkbox */}
                    <button
                      onClick={() =>
                        handleToggleTask(
                          'girlfriend',
                          'reactCompleted',
                          !!dailyView.profiles.girlfriend.progress.reactCompleted
                        )
                      }
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition ${
                        dailyView.profiles.girlfriend.progress.reactCompleted
                          ? 'bg-pink-600/20 border-pink-500 text-pink-300'
                          : 'bg-zinc-800/40 border-zinc-700 text-zinc-400 hover:border-pink-500/50'
                      }`}
                    >
                      {dailyView.profiles.girlfriend.progress.reactCompleted ? (
                        <CheckCircle2 className="w-4 h-4 text-pink-400" />
                      ) : (
                        <Circle className="w-4 h-4 text-zinc-500" />
                      )}
                      Girlfriend Done
                    </button>
                  </div>
                </div>
              );
            }

            if (slot.category === 'lunch') {
              return (
                <div
                  key={idx}
                  className="bg-zinc-950/30 border border-zinc-900/60 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs text-zinc-500"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-zinc-400">
                      {slot.startTime} – {slot.endTime}
                    </span>
                    <span>•</span>
                    <span className="font-medium text-zinc-400">{slot.title}</span>
                    <span>({slot.durationMinutes} mins)</span>
                  </div>
                  <span className="text-[11px] font-mono text-zinc-600">Rest & Recharge</span>
                </div>
              );
            }

            if (slot.category === 'dsa') {
              return (
                <div
                  key={idx}
                  className="bg-zinc-950/70 border border-zinc-800/80 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {slot.startTime} – {slot.endTime}
                      </span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        +1 to 3 pts
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                      <Code2 className="w-4 h-4 text-emerald-400" />
                      {slot.title}
                    </h3>
                    <p className="text-xs text-zinc-400">{slot.description}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href="#dsa-section"
                      className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium flex items-center gap-1.5 transition"
                    >
                      Go to DSA Matrix
                      <ChevronRight className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              );
            }

            if (slot.category === 'afternoon') {
              return (
                <div
                  key={idx}
                  className="bg-zinc-950/70 border border-zinc-800/80 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                        {slot.startTime} – {slot.endTime}
                      </span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                        +2 pts
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-purple-400" />
                      {slot.title}
                    </h3>
                    <p className="text-xs text-zinc-400">{slot.description}</p>
                  </div>

                  {/* Dual Checkboxes */}
                  <div className="flex items-center gap-3 bg-zinc-900/80 border border-zinc-800 rounded-xl p-2.5">
                    <button
                      onClick={() =>
                        handleToggleTask(
                          'you',
                          'afternoonCompleted',
                          !!dailyView.profiles.you.progress.afternoonCompleted
                        )
                      }
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition ${
                        dailyView.profiles.you.progress.afternoonCompleted
                          ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                          : 'bg-zinc-800/40 border-zinc-700 text-zinc-400 hover:border-blue-500/50'
                      }`}
                    >
                      {dailyView.profiles.you.progress.afternoonCompleted ? (
                        <CheckCircle2 className="w-4 h-4 text-blue-400" />
                      ) : (
                        <Circle className="w-4 h-4 text-zinc-500" />
                      )}
                      You Done
                    </button>

                    <button
                      onClick={() =>
                        handleToggleTask(
                          'girlfriend',
                          'afternoonCompleted',
                          !!dailyView.profiles.girlfriend.progress.afternoonCompleted
                        )
                      }
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition ${
                        dailyView.profiles.girlfriend.progress.afternoonCompleted
                          ? 'bg-pink-600/20 border-pink-500 text-pink-300'
                          : 'bg-zinc-800/40 border-zinc-700 text-zinc-400 hover:border-pink-500/50'
                      }`}
                    >
                      {dailyView.profiles.girlfriend.progress.afternoonCompleted ? (
                        <CheckCircle2 className="w-4 h-4 text-pink-400" />
                      ) : (
                        <Circle className="w-4 h-4 text-zinc-500" />
                      )}
                      Girlfriend Done
                    </button>
                  </div>
                </div>
              );
            }

            if (slot.category === 'job_search') {
              return (
                <div
                  key={idx}
                  className="bg-zinc-950/70 border border-zinc-800/80 rounded-xl p-4 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          {slot.startTime} – {slot.endTime}
                        </span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          +2 pts
                        </span>
                      </div>
                      <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-amber-400" />
                        {slot.title}
                      </h3>
                      <p className="text-xs text-zinc-400">{slot.description}</p>
                    </div>

                    {/* Dual Checkboxes */}
                    <div className="flex items-center gap-3 bg-zinc-900/80 border border-zinc-800 rounded-xl p-2.5">
                      <button
                        onClick={() =>
                          handleToggleTask(
                            'you',
                            'jobSearchCompleted',
                            !!dailyView.profiles.you.progress.jobSearchCompleted
                          )
                        }
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition ${
                          dailyView.profiles.you.progress.jobSearchCompleted
                            ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                            : 'bg-zinc-800/40 border-zinc-700 text-zinc-400 hover:border-blue-500/50'
                        }`}
                      >
                        {dailyView.profiles.you.progress.jobSearchCompleted ? (
                          <CheckCircle2 className="w-4 h-4 text-blue-400" />
                        ) : (
                          <Circle className="w-4 h-4 text-zinc-500" />
                        )}
                        You Done
                      </button>

                      <button
                        onClick={() =>
                          handleToggleTask(
                            'girlfriend',
                            'jobSearchCompleted',
                            !!dailyView.profiles.girlfriend.progress.jobSearchCompleted
                          )
                        }
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition ${
                          dailyView.profiles.girlfriend.progress.jobSearchCompleted
                            ? 'bg-pink-600/20 border-pink-500 text-pink-300'
                            : 'bg-zinc-800/40 border-zinc-700 text-zinc-400 hover:border-pink-500/50'
                        }`}
                      >
                        {dailyView.profiles.girlfriend.progress.jobSearchCompleted ? (
                          <CheckCircle2 className="w-4 h-4 text-pink-400" />
                        ) : (
                          <Circle className="w-4 h-4 text-zinc-500" />
                        )}
                        Girlfriend Done
                      </button>
                    </div>
                  </div>

                  {/* Profile Job Search Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-zinc-800/50 text-xs">
                    {/* You Fields */}
                    <div className="bg-zinc-900/40 border border-blue-500/20 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-blue-400">You — Application Tracker</span>
                        <button
                          onClick={() => handleSaveJobSearch('you')}
                          className="px-2 py-0.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium text-[11px] transition"
                        >
                          Save
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Role (e.g. Frontend Eng)"
                          value={jobSearchEditYou.targetRole}
                          onChange={e => setJobSearchEditYou(prev => ({ ...prev, targetRole: e.target.value }))}
                          className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-blue-500"
                        />
                        <input
                          type="text"
                          placeholder="Company (e.g. Stripe)"
                          value={jobSearchEditYou.companyApplied}
                          onChange={e => setJobSearchEditYou(prev => ({ ...prev, companyApplied: e.target.value }))}
                          className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <input
                        type="text"
                        placeholder="Notes / link to application"
                        value={jobSearchEditYou.notes}
                        onChange={e => setJobSearchEditYou(prev => ({ ...prev, notes: e.target.value }))}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    {/* Girlfriend Fields */}
                    <div className="bg-zinc-900/40 border border-pink-500/20 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-pink-400">Girlfriend — Application Tracker</span>
                        <button
                          onClick={() => handleSaveJobSearch('girlfriend')}
                          className="px-2 py-0.5 rounded bg-pink-600 hover:bg-pink-500 text-white font-medium text-[11px] transition"
                        >
                          Save
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Role (e.g. SDE II)"
                          value={jobSearchEditGf.targetRole}
                          onChange={e => setJobSearchEditGf(prev => ({ ...prev, targetRole: e.target.value }))}
                          className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-pink-500"
                        />
                        <input
                          type="text"
                          placeholder="Company (e.g. Microsoft)"
                          value={jobSearchEditGf.companyApplied}
                          onChange={e => setJobSearchEditGf(prev => ({ ...prev, companyApplied: e.target.value }))}
                          className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-pink-500"
                        />
                      </div>
                      <input
                        type="text"
                        placeholder="Notes / referral contact"
                        value={jobSearchEditGf.notes}
                        onChange={e => setJobSearchEditGf(prev => ({ ...prev, notes: e.target.value }))}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-pink-500"
                      />
                    </div>
                  </div>
                </div>
              );
            }

            if (slot.category === 'personal') {
              return (
                <div
                  key={idx}
                  className="bg-zinc-950/40 border border-zinc-900/60 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs text-zinc-500"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-zinc-400">
                      {slot.startTime} – {slot.endTime}
                    </span>
                    <span>•</span>
                    <span className="font-medium text-zinc-300">{slot.title}</span>
                  </div>
                  <span className="text-[11px] font-mono text-zinc-600">Personal Evening Routine (Unscored)</span>
                </div>
              );
            }

            return null;
          })}
        </div>
      </div>

      {/* -------------------------------------------------------------------------------- */}
      {/* 4. DSA QUESTION TRACKER */}
      {/* -------------------------------------------------------------------------------- */}
      <div id="dsa-section" className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 shadow-sm space-y-4">
        {/* DSA Tracker Header */}
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

          {/* Profile Switcher for DSA */}
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

        {/* Pattern Topic Dropdown / Selector */}
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

          {/* Solved Target Banner */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-zinc-400 font-mono">
              Daily Target: <span className="text-emerald-400 font-bold">2–3 questions</span>
            </span>
            <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono">
              Score: +{Math.min(activeDSACompletedList.length, 3)} pts
            </span>
          </div>
        </div>

        {/* 10 Questions Matrix */}
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
          {/* Profile Filter */}
          <div className="flex items-center gap-1 bg-zinc-950 border border-zinc-800 rounded-lg p-1">
            <button
              onClick={() => setActiveNoteProfile('all' as any)}
              className={`px-2.5 py-1 rounded font-medium transition ${
                (activeNoteProfile as string) === 'all'
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

          {/* Activity Filter */}
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

                  {/* Complexities */}
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

                {/* Concept Library Export Button */}
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
              {/* Profile selector */}
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

              {/* Title & Activity */}
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

              {/* Approach & Observations */}
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

              {/* Complexities */}
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
