import React, { useState } from 'react';
import { api } from '../services/api.js';
import {
  Database,
  Download,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  HardDrive,
  Cpu,
  Key,
} from 'lucide-react';

interface SettingsBackupProps {
  onDataChanged: () => void;
}

export const SettingsBackup: React.FC<SettingsBackupProps> = ({ onDataChanged }) => {
  const [exporting, setExporting] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleExportBackup = async () => {
    try {
      setExporting(true);
      setMessage(null);
      const backup = await api.exportBackup();

      // Trigger browser download
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `learning-os-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setMessage({ type: 'success', text: 'Backup JSON exported and downloaded successfully.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Export failed' });
    } finally {
      setExporting(false);
    }
  };

  const handleRestoreBackup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restoreFile) return;

    try {
      setRestoring(true);
      setMessage(null);
      const text = await restoreFile.text();
      const backupData = JSON.parse(text);

      await api.restoreBackup(backupData, true);
      setMessage({ type: 'success', text: 'Database restored cleanly from backup snapshot!' });
      onDataChanged();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to restore backup' });
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="space-y-1">
        <h3 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
          <Database className="w-5 h-5 text-emerald-400" />
          Settings & Knowledge Backups
        </h3>
        <p className="text-xs text-zinc-400">
          Export full JSON snapshots of your subjects, concepts, questions, and review history, or restore an existing backup.
        </p>
      </div>

      {/* Status Alert */}
      {message && (
        <div className={`p-4 rounded-xl text-xs flex items-center gap-2 ${
          message.type === 'success'
            ? 'bg-emerald-950/30 border border-emerald-500/40 text-emerald-300'
            : 'bg-rose-950/30 border border-rose-900/50 text-rose-300'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Backup and Restore Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Export Backup Card */}
        <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800 space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Download className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-zinc-100">Export Knowledge Snapshot</h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Downloads a timestamped JSON file containing all 5 collections (subjects, sources, concepts, questions, reviews) and FSRS states.
            </p>
          </div>

          <button
            onClick={handleExportBackup}
            disabled={exporting}
            className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{exporting ? 'Generating JSON...' : 'Export Complete Backup'}</span>
          </button>
        </div>

        {/* Restore Backup Card */}
        <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800 space-y-4">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Upload className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-zinc-100">Restore from JSON</h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Restore previously exported knowledge files into your MongoDB instance without losing review history integrity.
            </p>
          </div>

          <form onSubmit={handleRestoreBackup} className="space-y-3">
            <input
              type="file"
              accept=".json"
              onChange={e => {
                if (e.target.files && e.target.files[0]) {
                  setRestoreFile(e.target.files[0]);
                }
              }}
              className="w-full text-xs text-zinc-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-mono file:bg-zinc-800 file:text-zinc-200 hover:file:bg-zinc-700"
            />

            <button
              type="submit"
              disabled={restoring || !restoreFile}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              <span>{restoring ? 'Restoring Database...' : 'Restore Snapshot'}</span>
            </button>
          </form>
        </div>
      </div>

      {/* System Status Table */}
      <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800 space-y-4">
        <h4 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
          <Cpu className="w-4 h-4 text-emerald-400" /> System Architecture & Environment
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-850 space-y-1">
            <span className="text-zinc-500 block text-[11px]">Database Engine</span>
            <div className="flex items-center gap-2 text-zinc-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>MongoDB Atlas / Embedded Local Instance</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-850 space-y-1">
            <span className="text-zinc-500 block text-[11px]">Spaced Repetition Scheduler</span>
            <div className="flex items-center gap-2 text-zinc-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>FSRS 4.5 (Target Retention: 90%)</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-850 space-y-1">
            <span className="text-zinc-500 block text-[11px]">AI Extraction & Evaluation Provider</span>
            <div className="flex items-center gap-2 text-zinc-200">
              <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
              <span>Modular LLM (Offline Heuristic / Gemini / OpenAI)</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-850 space-y-1">
            <span className="text-zinc-500 block text-[11px]">Frontend Stack</span>
            <div className="flex items-center gap-2 text-zinc-200">
              <span className="w-2 h-2 rounded-full bg-teal-400"></span>
              <span>React 18 + Vite + Tailwind + React Flow + Recharts</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
