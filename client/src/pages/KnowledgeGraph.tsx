import React, { useState, useEffect, useCallback } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { api } from '../services/api.js';
import { KnowledgeGraphData } from '../types/index.js';
import {
  Network,
  Brain,
  Info,
  X,
  Layers,
  ArrowRight,
  BookOpen,
} from 'lucide-react';

interface KnowledgeGraphProps {
  subjectId?: string;
  onNavigateToRecall: () => void;
}

export const KnowledgeGraph: React.FC<KnowledgeGraphProps> = ({ subjectId, onNavigateToRecall }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(true);
  const [selectedConcept, setSelectedConcept] = useState<any | null>(null);

  useEffect(() => {
    loadGraph();
  }, [subjectId]);

  const loadGraph = async () => {
    try {
      setLoading(true);
      const graphData: KnowledgeGraphData = await api.getKnowledgeGraph(subjectId);

      const flowNodes = graphData.nodes.map(n => ({
        id: n.id,
        position: n.position,
        data: {
          ...n.data,
          raw: n,
        },
        style: {
          background: '#09090b',
          color: '#f4f4f5',
          border: `1.5px solid ${
            n.data.status === 'due'
              ? '#f43f5e'
              : n.data.status === 'learning'
              ? '#6366f1'
              : '#10b981'
          }`,
          borderRadius: '12px',
          padding: '12px',
          width: 220,
          boxShadow: '0 4px 20px -2px rgba(0,0,0,0.5)',
          fontSize: '12px',
          fontFamily: 'Plus Jakarta Sans, sans-serif',
        },
      }));

      const flowEdges = graphData.edges.map(e => ({
        id: e.id,
        source: e.source,
        target: e.target,
        animated: e.animated,
        label: e.label,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: e.style?.stroke || '#6366f1',
        },
        style: e.style,
      }));

      setNodes(flowNodes as any);
      setEdges(flowEdges as any);
    } catch (err) {
      console.error('Failed to load knowledge graph:', err);
    } finally {
      setLoading(false);
    }
  };

  const onNodeClick = useCallback((event: React.MouseEvent, node: any) => {
    setSelectedConcept(node.data);
  }, []);

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] bg-zinc-950 flex flex-col">
      {/* Legend & Stats Overlay */}
      <div className="absolute top-4 left-6 z-10 p-3 rounded-xl bg-zinc-950/90 border border-zinc-800 backdrop-blur-md space-y-2 shadow-xl">
        <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
          <Network className="w-4 h-4 text-emerald-400" />
          <span>Dependency Graph</span>
        </div>
        <div className="flex items-center gap-4 text-[11px] font-mono text-zinc-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Due
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span> Learning
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Mastered
          </span>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
        </div>
      ) : (
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          fitView
          className="bg-zinc-950"
        >
          <Background color="#27272a" gap={20} size={1} />
          <Controls className="bg-zinc-900 border-zinc-800 fill-zinc-200 text-zinc-200" />
        </ReactFlow>
      )}

      {/* Concept Detail Slide-out Sheet */}
      {selectedConcept && (
        <div className="absolute top-4 right-6 bottom-4 w-96 z-20 p-5 rounded-2xl bg-zinc-900/95 border border-zinc-800 shadow-2xl backdrop-blur-md flex flex-col justify-between overflow-y-auto animate-fadeIn">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <span className="text-[11px] font-mono text-zinc-500 uppercase">{selectedConcept.subject}</span>
              <button
                onClick={() => setSelectedConcept(null)}
                className="p-1 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <h3 className="text-base font-bold text-zinc-100">{selectedConcept.label}</h3>
              <div className="flex items-center gap-2 mt-2">
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                  selectedConcept.importance === 'high' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                }`}>
                  {selectedConcept.importance.toUpperCase()} IMPORTANCE
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                  {selectedConcept.difficulty.toUpperCase()}
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider">Explanation</span>
              <p className="text-xs text-zinc-300 leading-relaxed">{selectedConcept.explanation}</p>
            </div>

            <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-850 space-y-1">
              <span className="text-[11px] font-mono text-zinc-500 uppercase block">Active Questions</span>
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-400">Total: {selectedConcept.totalQuestions}</span>
                <span className="text-rose-400 font-bold">Due: {selectedConcept.dueQuestions}</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-800/80">
            {selectedConcept.dueQuestions > 0 ? (
              <button
                onClick={onNavigateToRecall}
                className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition-all"
              >
                <Brain className="w-4 h-4" />
                <span>Review This Concept Now</span>
              </button>
            ) : (
              <p className="text-[11px] text-zinc-500 text-center font-mono">
                Concept is currently up-to-date with FSRS schedule.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
