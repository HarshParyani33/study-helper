import {
  Subject,
  Concept,
  Question,
  ReviewSubmitResult,
  AnswerEvaluation,
  IngestionReport,
  DashboardSummary,
  KnowledgeGraphData,
  FreshStartData,
  InterviewData,
} from '../types/index.js';

const BASE_URL = '/api/v1';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data = await response.json();
  if (!response.ok || data.success === false) {
    throw new Error(data.error || `HTTP error ${response.status}`);
  }
  return data.data !== undefined ? data.data : data;
}

export const api = {
  // Subjects
  async getSubjects(): Promise<Subject[]> {
    return request<Subject[]>('/subjects');
  },
  async createSubject(data: { name: string; description?: string }): Promise<Subject> {
    return request<Subject>('/subjects', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  async deleteSubject(id: string): Promise<void> {
    return request<void>(`/subjects/${id}`, { method: 'DELETE' });
  },

  // Concepts
  async getConcepts(params: { subjectId?: string; importance?: string; difficulty?: string; search?: string } = {}): Promise<Concept[]> {
    const query = new URLSearchParams();
    if (params.subjectId) query.append('subjectId', params.subjectId);
    if (params.importance) query.append('importance', params.importance);
    if (params.difficulty) query.append('difficulty', params.difficulty);
    if (params.search) query.append('search', params.search);
    return request<Concept[]>(`/concepts?${query.toString()}`);
  },
  async getConceptByIdOrSlug(idOrSlug: string): Promise<Concept & { questions: Question[] }> {
    return request<Concept & { questions: Question[] }>(`/concepts/${idOrSlug}`);
  },
  async createConcept(data: Partial<Concept>): Promise<Concept> {
    return request<Concept>('/concepts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  async deleteConcept(id: string): Promise<void> {
    return request<void>(`/concepts/${id}`, { method: 'DELETE' });
  },
  async addQuestionToConcept(conceptId: string, question: Partial<Question>): Promise<Question> {
    return request<Question>(`/concepts/${conceptId}/questions`, {
      method: 'POST',
      body: JSON.stringify(question),
    });
  },

  // Ingestion
  async ingestRaw(data: { subjectName: string; sourceTitle: string; sourceType?: string; content: string }): Promise<{ report: IngestionReport }> {
    return request<{ report: IngestionReport }>('/ingest/raw', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  async ingestFile(formData: FormData): Promise<{ report: IngestionReport }> {
    const res = await fetch(`${BASE_URL}/ingest/file`, {
      method: 'POST',
      body: formData, // No Content-Type header so browser sets multipart boundary
    });
    const data = await res.json();
    if (!res.ok || data.success === false) {
      throw new Error(data.error || 'Failed to ingest file');
    }
    return data;
  },

  // Daily Recall & FSRS
  async getDueQuestions(subjectId?: string): Promise<Question[]> {
    const query = subjectId ? `?subjectId=${subjectId}` : '';
    return request<Question[]>(`/recall/due${query}`);
  },
  async getSurpriseRecall(limit = 10): Promise<Question[]> {
    return request<Question[]>(`/recall/surprise?limit=${limit}`);
  },
  async submitReview(data: {
    questionId: string;
    rating: number; // 1: Again, 2: Hard, 3: Good, 4: Easy
    userAnswer?: string;
    evaluation?: string;
    elapsedMs?: number;
  }): Promise<ReviewSubmitResult> {
    return request<ReviewSubmitResult>('/recall/review', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  async evaluateAnswer(data: { questionId: string; userAnswer: string }): Promise<AnswerEvaluation> {
    return request<AnswerEvaluation>('/recall/evaluate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Fresh Start
  async generateFreshStart(subjectId: string, inactivityDuration = '30 days'): Promise<FreshStartData> {
    return request<FreshStartData>('/fresh-start/generate', {
      method: 'POST',
      body: JSON.stringify({ subjectId, inactivityDuration }),
    });
  },

  // Interview Mode
  async generateInterviewPrep(subjectId: string, difficulty = 'senior', interviewDate?: string): Promise<InterviewData> {
    return request<InterviewData>('/interview/generate', {
      method: 'POST',
      body: JSON.stringify({ subjectId, difficulty, interviewDate }),
    });
  },

  // Stats & Graphs
  async getDashboardSummary(): Promise<DashboardSummary> {
    return request<DashboardSummary>('/stats/summary');
  },
  async getKnowledgeGraph(subjectId?: string): Promise<KnowledgeGraphData> {
    const query = subjectId ? `?subjectId=${subjectId}` : '';
    return request<KnowledgeGraphData>(`/stats/graph${query}`);
  },

  // Backups
  async exportBackup(): Promise<any> {
    const res = await fetch(`${BASE_URL}/backup/export`);
    if (!res.ok) throw new Error('Failed to download backup');
    return res.json();
  },
  async restoreBackup(backupData: any, clearExisting = false): Promise<any> {
    return request<any>(`/backup/restore?clearExisting=${clearExisting}`, {
      method: 'POST',
      body: JSON.stringify(backupData),
    });
  },
};
