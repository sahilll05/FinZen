"use client";

import React from 'react';
import {
  ReactFlow,
  Handle,
  Position,
  Background,
  BackgroundVariant,
  BaseEdge,
  getBezierPath,
  EdgeProps,
  Controls,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// ── Custom Pulse Edge ────────────────────────────────────────────────────────
const PulseEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  label,
}: EdgeProps) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      {/* Glow blur track */}
      <BaseEdge
        path={edgePath}
        style={{ strokeWidth: 4, stroke: 'rgba(99,102,241,0.25)', filter: 'blur(4px)' }}
      />
      {/* Main track */}
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{ ...style, strokeWidth: 1.5, stroke: 'rgba(99,102,241,0.5)' }}
      />

      {/* Animated pulse dot 1 */}
      <circle r="2.5" fill="rgba(99,102,241,0.9)" filter="drop-shadow(0 0 4px rgba(99,102,241,0.8))">
        <animateMotion dur="2.2s" repeatCount="indefinite" path={edgePath} begin="0s" />
      </circle>
      {/* Animated pulse dot 2 (offset) */}
      <circle r="1.5" fill="rgba(99,102,241,0.4)">
        <animateMotion dur="2.2s" repeatCount="indefinite" path={edgePath} begin="0.8s" />
      </circle>

      {/* Edge label */}
      {label && (
        <foreignObject
          x={labelX - 40}
          y={labelY - 10}
          width={80}
          height={20}
          style={{ pointerEvents: 'none', overflow: 'visible' }}
        >
          <div
            style={{
              background: 'rgba(11, 14, 20, 0.85)',
              border: '1px solid rgba(99,102,241,0.2)',
              borderRadius: '4px',
              padding: '1px 5px',
              fontSize: '8px',
              fontFamily: 'monospace',
              fontWeight: 700,
              color: 'rgba(148,163,184,0.8)',
              textAlign: 'center',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              backdropFilter: 'blur(4px)',
              whiteSpace: 'nowrap',
            }}
          >
            {String(label).slice(0, 14)}
          </div>
        </foreignObject>
      )}
    </>
  );
};

const edgeTypes = {
  pulse: PulseEdge,
};

// ── Custom Causal Node ───────────────────────────────────────────────────────
const CausalNode = ({ data, selected }: { data: any; selected: boolean }) => (
  <div
    className={`
      flex items-center gap-2.5 px-4 py-2 rounded-full border backdrop-blur-xl
      transition-all duration-300 cursor-pointer select-none
      hover:scale-105 active:scale-95
      ${selected
        ? 'bg-indigo-600/80 border-indigo-400 text-white shadow-[0_0_24px_rgba(99,102,241,0.5)]'
        : data.isRoot
          ? 'bg-indigo-500/15 border-indigo-500/50 text-white shadow-[0_0_16px_rgba(99,102,241,0.25)] ring-1 ring-indigo-500/30'
          : 'bg-[#0F172A]/80 border-[#334155]/50 text-slate-300 hover:border-indigo-500/40 hover:text-white hover:bg-[#1E293B]/80'
      }
    `}
  >
    <Handle type="target"  position={Position.Left}  style={{ width: 6, height: 6, background: 'rgba(99,102,241,0.8)', border: 'none', left: -3, opacity: selected ? 1 : 0.3  }} />

    <div className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] ${selected || data.isRoot ? 'bg-white/20 text-white' : 'bg-indigo-500/15 text-indigo-400'}`}>
      {data.isRoot ? '⚡' : '◈'}
    </div>

    <span className="text-[9px] font-black uppercase tracking-tight whitespace-nowrap max-w-[140px] truncate">
      {data.label}
    </span>

    <Handle type="source" position={Position.Right} style={{ width: 6, height: 6, background: 'rgba(99,102,241,0.8)', border: 'none', right: -3, opacity: selected ? 1 : 0.3 }} />
  </div>
);

const nodeTypes = {
  causal: CausalNode,
};

export interface FlowData {
  nodes: any[];
  edges: any[];
  onNodeClick?: (event: React.MouseEvent, node: any) => void;
}

export default function CausalFlow({ nodes, edges, onNodeClick }: FlowData) {
  return (
    <div className="w-full h-full overflow-hidden relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.5 }}
        draggable={true}
        zoomOnScroll={true}
        panOnDrag={true}
        nodesConnectable={false}
        elementsSelectable={true}
        onNodeClick={onNodeClick}
        colorMode="dark"
        minZoom={0.2}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          gap={36}
          size={1}
          color="rgba(99, 102, 241, 0.08)"
          variant={BackgroundVariant.Dots}
        />
        <Controls
          style={{
            background: 'rgba(11, 14, 20, 0.8)',
            border: '1px solid rgba(30, 41, 59, 0.8)',
            borderRadius: '12px',
          }}
        />
      </ReactFlow>

      {/* Hint tooltip — only when no nodes */}
      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center opacity-30">
            <div className="w-12 h-12 rounded-full border border-indigo-500/30 flex items-center justify-center mb-3 mx-auto animate-pulse">
              <span className="text-indigo-400 text-lg">◈</span>
            </div>
            <p className="text-xs font-mono text-slate-500 uppercase tracking-widest">No causal data</p>
          </div>
        </div>
      )}

      {/* Interactive hint */}
      {nodes.length > 0 && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-[#0B0E14]/80 backdrop-blur-md rounded-full border border-[#1E293B]/50 text-[9px] font-black text-slate-500 tracking-widest uppercase pointer-events-none">
          Drag · Zoom · Click nodes to trace
        </div>
      )}
    </div>
  );
}
