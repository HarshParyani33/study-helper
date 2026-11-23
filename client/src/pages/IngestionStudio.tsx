import React, { useState } from 'react';
import { api } from '../services/api.js';
import { Subject, IngestionReport } from '../types/index.js';
import {
  UploadCloud,
  FileText,
  FileUp,
  Sparkles,
  CheckCircle2,
  Copy,
  Layers,
  ArrowRight,
  AlertCircle,
  Hash,
} from 'lucide-react';

interface IngestionStudioProps {
  subjects: Subject[];
  onIngestionComplete: () => void;
  onNavigateToRecall: () => void;
}

export const IngestionStudio: React.FC<IngestionStudioProps> = ({
  subjects,
  onIngestionComplete,
  onNavigateToRecall,
}) => {
  const [mode, setMode] = useState<'text' | 'file'>('text');
  const [subjectName, setSubjectName] = useState('System Design');
  const [customSubject, setCustomSubject] = useState('');
  const [sourceTitle, setSourceTitle] = useState('');
  const [sourceType, setSourceType] = useState<'notes' | 'pdf' | 'transcript' | 'article' | 'code'>('notes');
  const [content, setContent] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<IngestionReport | null>(null);

  const activeSubjectName = customSubject.trim() ? customSubject.trim() : subjectName;

  const handleIngestText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !activeSubjectName || !sourceTitle.trim()) {
      setError('Please fill in Subject, Source Title, and Content.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await api.ingestRaw({
        subjectName: activeSubjectName,
        sourceTitle: sourceTitle.trim(),
        sourceType,
        content: content.trim(),
      });
      setReport(res.report);
      onIngestionComplete();
    } catch (err: any) {
      setError(err.message || 'Ingestion failed');
    } finally {
      setLoading(false);
    }
  };

  const handleIngestFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setError('Please select a file to ingest.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('subjectName', activeSubjectName);
      if (sourceTitle.trim()) {
        formData.append('sourceTitle', sourceTitle.trim());
      }

      const res = await api.ingestFile(formData);
      setReport(res.report);
      onIngestionComplete();
    } catch (err: any) {
      setError(err.message || 'File ingestion failed');
    } finally {
      setLoading(false);
    }
  };

  const loadSampleNotes = () => {
    setSubjectName('System Design');
    setSourceTitle('Distributed Rate Limiting & Sliding Windows');
    setSourceType('notes');
    setContent(`# Rate Limiting in Distributed Architectures
Rate limiting restricts the number of requests a user or client can make within a specified time window to protect APIs against Denial-of-Service attacks, brute-force requests, and downstream cascading resource exhaustion.

## Token Bucket Algorithm
The token bucket algorithm maintains a centralized or local bucket with a maximum capacity of tokens. Tokens are continuously replenished at a constant rate. When a request arrives, it attempts to consume one or more tokens.
- Example: AWS API Gateway and Stripe payment APIs use token buckets for burst handling.
- Common Mistake: Storing token counters in localized application memory instead of shared Redis, allowing users to exceed rate limits by hitting multiple stateless backend nodes.
- Prerequisites: load-balancing, redis-caching.

## Sliding Window Log
Tracks the exact timestamp of every request in a sorted set (e.g. Redis ZSET).
- Advantages: Zero boundary burst vulnerability.
- Tradeoff: High memory footprint for high-throughput endpoints.`);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 animate-fadeIn">
      {/* Header Info */}
      <div className="space-y-1">
        <h3 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
          <UploadCloud className="w-5 h-5 text-emerald-400" />
          Ingestion Studio
        </h3>
        <p className="text-xs text-zinc-400">
          Transform raw text, articles, transcripts, or PDF notes into structured concepts, dependencies, and FSRS active recall questions.
        </p>
      </div>

      {/* Mode Switcher */}
      <div className="flex items-center gap-2 border-b border-zinc-900 pb-4">
        <button
          onClick={() => { setMode('text'); setReport(null); setError(null); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
            mode === 'text'
              ? 'bg-zinc-800 text-emerald-400 border border-zinc-700'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Paste Text / Markdown</span>
        </button>

        <button
          onClick={() => { setMode('file'); setReport(null); setError(null); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
            mode === 'file'
              ? 'bg-zinc-800 text-emerald-400 border border-zinc-700'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <FileUp className="w-4 h-4" />
          <span>Upload File (PDF, MD, TXT)</span>
        </button>

        <button
          type="button"
          onClick={loadSampleNotes}
          className="ml-auto text-xs text-zinc-500 hover:text-emerald-400 flex items-center gap-1.5 font-mono"
        >
          <Copy className="w-3.5 h-3.5" />
          <span>Load Sample Notes</span>
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-red-950/30 border border-red-900/50 text-red-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Ingestion Report Display */}
      {report && (
        <div className="p-6 rounded-2xl bg-zinc-900/90 border border-emerald-500/40 shadow-xl space-y-5 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <h4 className="text-sm font-bold text-zinc-100">
                {report.isDuplicateSource ? 'Identical Source Already Ingested' : 'Ingestion Pipeline Succeeded!'}
              </h4>
            </div>
            <span className="font-mono text-xs text-zinc-500 flex items-center gap-1">
              <Hash className="w-3.5 h-3.5" />
              {report.source.contentHash.substring(0, 12)}...
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-mono text-xs">
            <div className="p-3 bg-zinc-950/80 rounded-xl border border-zinc-850">
              <span className="text-zinc-500 block">Subject</span>
              <span className="text-zinc-200 font-semibold">{report.subject.name}</span>
            </div>
            <div className="p-3 bg-zinc-950/80 rounded-xl border border-zinc-850">
              <span className="text-zinc-500 block">New Concepts</span>
              <span className="text-emerald-400 font-bold">{report.summary.conceptsCreated}</span>
            </div>
            <div className="p-3 bg-zinc-950/80 rounded-xl border border-zinc-850">
              <span className="text-zinc-500 block">Enriched Concepts</span>
              <span className="text-indigo-400 font-bold">{report.summary.conceptsEnriched}</span>
            </div>
            <div className="p-3 bg-zinc-950/80 rounded-xl border border-zinc-850">
              <span className="text-zinc-500 block">Questions Created</span>
              <span className="text-teal-400 font-bold">{report.summary.questionsCreated}</span>
            </div>
          </div>

          {report.details.questionsGenerated.length > 0 && (
            <div className="space-y-2">
              <h5 className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                Generated Spaced Repetition Questions:
              </h5>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                {report.details.questionsGenerated.map((q, idx) => (
                  <div key={idx} className="p-2.5 rounded-lg bg-zinc-950/60 border border-zinc-850 text-xs space-y-1">
                    <div className="flex items-center justify-between text-zinc-500">
                      <span className="font-semibold text-zinc-300">{q.concept}</span>
                      <span className="font-mono text-[10px] uppercase text-emerald-400">{q.type}</span>
                    </div>
                    <p className="text-zinc-400">{q.question}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              onClick={() => { setReport(null); setContent(''); }}
              className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-colors"
            >
              Ingest More
            </button>
            <button
              onClick={onNavigateToRecall}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-semibold shadow-md transition-all"
            >
              <span>Start Daily Recall</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Ingestion Forms */}
      {!report && mode === 'text' && (
        <form onSubmit={handleIngestText} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Subject Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Target Subject</label>
              <div className="flex gap-2">
                <select
                  value={subjectName}
                  onChange={e => { setSubjectName(e.target.value); setCustomSubject(''); }}
                  className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500 font-mono"
                >
                  {subjects.map(s => (
                    <option key={s._id} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                  <option value="System Design">System Design</option>
                  <option value="Distributed Systems">Distributed Systems</option>
                  <option value="TypeScript & Node.js">TypeScript & Node.js</option>
                </select>
                <input
                  type="text"
                  placeholder="Or new subject..."
                  value={customSubject}
                  onChange={e => setCustomSubject(e.target.value)}
                  className="w-40 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Source Title & Type */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Source Title & Type</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Chapter 4: Distributed Caching"
                  value={sourceTitle}
                  onChange={e => setSourceTitle(e.target.value)}
                  className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
                  required
                />
                <select
                  value={sourceType}
                  onChange={e => setSourceType(e.target.value as any)}
                  className="bg-zinc-900 border border-zinc-800 rounded-xl px-2.5 py-2 text-xs text-zinc-300 focus:outline-none focus:border-emerald-500 font-mono"
                >
                  <option value="notes">Notes</option>
                  <option value="transcript">Transcript</option>
                  <option value="article">Article</option>
                  <option value="code">Code</option>
                </select>
              </div>
            </div>
          </div>

          {/* Raw Content Area */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-300 flex items-center justify-between">
              <span>Learning Material Content (Markdown supported)</span>
              <span className="text-[11px] font-mono text-zinc-500">{content.length} characters</span>
            </label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Paste notes, transcripts, architectural summaries, or explanations here..."
              rows={12}
              className="w-full bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 text-xs font-mono text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-emerald-500 leading-relaxed"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs rounded-xl shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            <span>{loading ? 'Processing & Deduplicating...' : 'Ingest & Generate Spaced Repetition Questions'}</span>
          </button>
        </form>
      )}

      {!report && mode === 'file' && (
        <form onSubmit={handleIngestFile} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Target Subject</label>
              <select
                value={subjectName}
                onChange={e => setSubjectName(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500 font-mono"
              >
                {subjects.map(s => (
                  <option key={s._id} value={s.name}>
                    {s.name}
                  </option>
                ))}
                <option value="System Design">System Design</option>
                <option value="Distributed Systems">Distributed Systems</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Source Title (Optional)</label>
              <input
                type="text"
                placeholder="Defaults to file name"
                value={sourceTitle}
                onChange={e => setSourceTitle(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* File Drag & Drop Box */}
          <div className="border-2 border-dashed border-zinc-800 hover:border-emerald-500/50 rounded-2xl p-8 text-center bg-zinc-900/30 transition-all cursor-pointer">
            <input
              type="file"
              accept=".pdf,.txt,.md,.ts,.py"
              id="fileInput"
              onChange={e => {
                if (e.target.files && e.target.files[0]) {
                  setSelectedFile(e.target.files[0]);
                  if (!sourceTitle) setSourceTitle(e.target.files[0].name);
                }
              }}
              className="hidden"
            />
            <label htmlFor="fileInput" className="cursor-pointer space-y-3 block">
              <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center mx-auto text-zinc-400">
                <FileUp className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-zinc-200">
                  {selectedFile ? selectedFile.name : 'Click to select or drag and drop file'}
                </p>
                <p className="text-[11px] text-zinc-500 font-mono">
                  Supported formats: PDF, Markdown (.md), Text (.txt), Code files
                </p>
              </div>
              {selectedFile && (
                <span className="inline-block text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {(selectedFile.size / 1024).toFixed(1)} KB Ready
                </span>
              )}
            </label>
          </div>

          <button
            type="submit"
            disabled={loading || !selectedFile}
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs rounded-xl shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            <span>{loading ? 'Reading & Processing File...' : 'Upload & Process with Ingestion Engine'}</span>
          </button>
        </form>
      )}
    </div>
  );
};
