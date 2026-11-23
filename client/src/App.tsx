import React, { useState, useEffect } from 'react';
import { Sidebar, PageId } from './components/Sidebar.js';
import { Header } from './components/Header.js';
import { Dashboard } from './pages/Dashboard.js';
import { DailyRecall } from './pages/DailyRecall.js';
import { IngestionStudio } from './pages/IngestionStudio.js';
import { KnowledgeGraph } from './pages/KnowledgeGraph.js';
import { ConceptLibrary } from './pages/ConceptLibrary.js';
import { FreshStart } from './pages/FreshStart.js';
import { InterviewMode } from './pages/InterviewMode.js';
import { SurpriseRecall } from './pages/SurpriseRecall.js';
import { Analytics } from './pages/Analytics.js';
import { SettingsBackup } from './pages/SettingsBackup.js';
import { StudyPlanner } from './pages/StudyPlanner.js';
import { api } from './services/api.js';
import { Subject } from './types/index.js';

export const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<PageId>('dashboard');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [dueCount, setDueCount] = useState<number>(0);

  useEffect(() => {
    loadGlobalData();
  }, []);

  const loadGlobalData = async () => {
    try {
      const subjList = await api.getSubjects();
      setSubjects(subjList);

      const due = await api.getDueQuestions();
      setDueCount(due.length);
    } catch (err) {
      console.error('Failed to load subjects or due questions:', err);
    }
  };

  const handleNavigate = (page: PageId, subjectId?: string) => {
    if (subjectId) {
      setSelectedSubjectId(subjectId);
    }
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-950 text-zinc-100 font-sans">
      {/* Sidebar */}
      <Sidebar
        currentPage={currentPage}
        onNavigate={page => handleNavigate(page)}
        dueCount={dueCount}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <Header
          currentPage={currentPage}
          subjects={subjects}
          selectedSubjectId={selectedSubjectId}
          onSelectSubject={id => setSelectedSubjectId(id)}
          onNavigate={handleNavigate}
          dueCount={dueCount}
          onRefresh={loadGlobalData}
        />

        <main className="flex-1 overflow-y-auto">
          {currentPage === 'dashboard' && (
            <Dashboard
              onNavigate={handleNavigate}
              onRefreshDue={loadGlobalData}
            />
          )}

          {currentPage === 'planner' && (
            <StudyPlanner onNavigateToRecall={() => handleNavigate('recall')} />
          )}

          {currentPage === 'recall' && (
            <DailyRecall
              subjectId={selectedSubjectId || undefined}
              onFinished={() => {
                loadGlobalData();
                handleNavigate('dashboard');
              }}
            />
          )}

          {currentPage === 'surprise' && (
            <SurpriseRecall
              onFinished={() => {
                loadGlobalData();
                handleNavigate('dashboard');
              }}
            />
          )}

          {currentPage === 'ingest' && (
            <IngestionStudio
              subjects={subjects}
              onIngestionComplete={loadGlobalData}
              onNavigateToRecall={() => handleNavigate('recall')}
            />
          )}

          {currentPage === 'graph' && (
            <KnowledgeGraph
              subjectId={selectedSubjectId || undefined}
              onNavigateToRecall={() => handleNavigate('recall')}
            />
          )}

          {currentPage === 'concepts' && (
            <ConceptLibrary
              initialSubjectId={selectedSubjectId}
              subjects={subjects}
              onNavigateToRecall={() => handleNavigate('recall')}
            />
          )}

          {currentPage === 'fresh-start' && (
            <FreshStart
              subjects={subjects}
              onNavigateToRecall={() => handleNavigate('recall')}
            />
          )}

          {currentPage === 'interview' && (
            <InterviewMode subjects={subjects} />
          )}

          {currentPage === 'analytics' && <Analytics />}

          {currentPage === 'settings' && (
            <SettingsBackup onDataChanged={loadGlobalData} />
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
