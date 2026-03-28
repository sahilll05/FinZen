"use client";

import { useEffect, useState } from 'react';
import { SoftCard } from '@/components/shared/SoftCard';
import { motion, AnimatePresence } from 'framer-motion';
import { graphAPI, portfolioAPI } from '@/lib/api';

export default function KnowledgeGraphPage() {
  const [nodes, setNodes] = useState<any[]>([]);
  const [edges, setEdges] = useState<any[]>([]);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [centerNodeId, setCenterNodeId] = useState<string>('AAPL');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    loadGraph();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centerNodeId]);

  const loadGraph = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await graphAPI.query(centerNodeId, 2);
      setNodes(res.data.nodes || []);
      setEdges(res.data.edges || []);
      
      const center = res.data.nodes.find((n: any) => n.id === centerNodeId);
      if (center) setSelectedNode(center);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load knowledge graph data.');
    } finally {
      setIsLoading(false);
    }
  };

  // Basic circular layout math
  const getLayout = (index: number, total: number, isCenter: boolean) => {
    if (isCenter) return { top: '50%', left: '50%' };
    const radius = 35; // % from center
    const angle = (index / (total - 1)) * 2 * Math.PI;
    return {
      top: `${50 + radius * Math.sin(angle)}%`,
      left: `${50 + radius * Math.cos(angle)}%`
    };
  };

  const getStyleForType = (type: string) => {
    switch(type) {
      case 'company': return 'border-accent-indigo text-accent-indigo bg-accent-indigo-light/10 shadow-[0_0_20px_rgba(67,56,202,0.15)]';
      case 'sector': return 'border-text-primary text-text-primary bg-surface shadow-[0_0_15px_rgba(0,0,0,0.05)]';
      case 'country': return 'border-accent-rose text-accent-rose bg-accent-rose-light/10 shadow-[0_0_20px_rgba(190,18,60,0.15)]';
      default: return 'border-border-strong text-text-secondary bg-surface shadow-md';
    }
  };

  const centerNode = nodes.find(n => n.id === centerNodeId);
  const otherNodes = nodes.filter(n => n.id !== centerNodeId).slice(0, 8); // Display max 8 surrounding nodes to keep UI clean

  const displayNodes = centerNode ? [centerNode, ...otherNodes] : otherNodes;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 w-full h-full flex flex-col min-h-[800px]">
      <div className="flex items-center justify-between pb-6 border-b border-border-light flex-shrink-0">
         <div>
           <h1 className="font-display text-4xl text-text-primary mb-2">Knowledge Graph</h1>
           <p className="font-sans text-sm text-text-secondary">Explore n-tier relationships connected back to the central entity.</p>
         </div>
         <div className="flex bg-surface p-1.5 pl-5 rounded-full border border-border-base shadow-sm items-center gap-5">
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-widest outline-none border-none">Center Node</span>
            <div className="flex gap-2 font-mono">
              <input 
                type="text" 
                value={centerNodeId}
                onChange={(e) => setCenterNodeId(e.target.value.toUpperCase())}
                placeholder="Ticker/Risk" 
                className="w-24 text-sm px-3 py-1.5 uppercase font-bold text-center border bg-root border-border-strong rounded-full focus:outline-accent-indigo text-text-primary outline-none" 
              />
              <button onClick={loadGraph} className="px-4 py-1.5 bg-accent-indigo hover:bg-accent-indigo-mid text-white rounded-full text-xs font-bold font-sans transition-colors">Search</button>
            </div>
         </div>
      </div>

      <div className="flex-1 min-h-[600px] border border-border-light rounded-[2rem] bg-surface relative overflow-hidden shadow-inner flex items-center justify-center">
         
         {/* Background connecting lines pattern */}
         <div className="absolute inset-0 z-0 opacity-70 pointer-events-none">
            <svg className="w-full h-full">
               {/* Fixed background lines for aesthetic */}
               <line x1="50%" y1="50%" x2="30%" y2="30%" stroke="var(--border-strong)" strokeWidth="2" strokeDasharray="6 6" className="opacity-60" />
               <line x1="50%" y1="50%" x2="70%" y2="25%" stroke="var(--border-strong)" strokeWidth="3" />
               <line x1="50%" y1="50%" x2="65%" y2="70%" stroke="var(--border-strong)" strokeWidth="3" />
               <line x1="50%" y1="50%" x2="25%" y2="65%" stroke="var(--border-strong)" strokeWidth="2" />
               <circle cx="50%" cy="50%" r="8%" fill="none" stroke="var(--accent-indigo)" strokeWidth="1" opacity="0.3" className="animate-ping" style={{ animationDuration: '3s' }}/>
            </svg>
         </div>
         
         {isLoading ? (
            <div className="z-10 animate-pulse text-text-secondary font-mono tracking-widest uppercase">Querying Matrix...</div>
         ) : error ? (
            <div className="z-10 text-accent-rose text-center bg-accent-rose-light px-8 py-4 rounded-xl border border-accent-rose/20 max-w-lg">
              <p className="font-bold mb-1">Graph Query Failed</p>
              <p className="text-sm">{error}</p>
            </div>
         ) : (
           <div className="absolute inset-0 z-10 w-full h-full pointer-events-none">
              <AnimatePresence>
                {displayNodes.map((node, i) => {
                  const isCenter = node.id === centerNodeId;
                  const layout = getLayout(i - 1, displayNodes.length, isCenter);
                  const styleStr = getStyleForType(node.type);
                  
                  return (
                    <motion.div 
                      key={node.id}
                      initial={{ scale: 0, opacity: 0 }} 
                      animate={{ scale: 1, opacity: 1 }} 
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ delay: i * 0.1, type: "spring", stiffness: 100 }}
                      onClick={() => setSelectedNode(node)}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 ${isCenter ? 'w-36 h-36 border-[4px] z-30' : 'w-28 h-28 border-[2px] z-20 hover:scale-110'} rounded-full flex flex-col items-center justify-center backdrop-blur-md cursor-pointer transition-colors pointer-events-auto ${styleStr}`}
                      style={layout}
                    >
                       <div className="text-center p-2">
                         <span className={`font-mono font-black block drop-shadow-sm ${isCenter ? 'text-2xl mb-1.5' : 'text-lg mb-1'}`}>{node.label || node.id}</span>
                         <span className={`text-[9px] uppercase font-bold tracking-widest bg-root px-1.5 py-0.5 rounded shadow-xs border border-border-light block mx-auto w-fit`}>{node.type}</span>
                       </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
           </div>
         )}

         {/* Overlay Panel for Inspector */}
         {selectedNode && (
         <div className="absolute top-8 left-8 w-96 max-h-[90%] overflow-y-auto bg-surface/95 backdrop-blur-xl border-2 border-border-strong rounded-[2rem] shadow-2xl p-8 z-40 font-sans custom-scrollbar">
            <div className="flex justify-between items-center mb-6 border-b border-border-light pb-4">
              <h3 className="font-display font-semibold text-2xl text-text-primary">Entity Inspector</h3>
              <button onClick={() => setSelectedNode(null)} className="text-text-secondary hover:text-text-primary">✕</button>
            </div>
            
            <div className="bg-root p-5 rounded-2xl border border-border-light shadow-inner mb-8">
               <div className="flex items-center justify-between mb-4">
                 <span className="font-mono font-black text-3xl text-accent-indigo drop-shadow-md tracking-tighter truncate max-w-[200px]" title={selectedNode.label || selectedNode.id}>{selectedNode.id}</span>
                 <span className="text-[9px] bg-accent-indigo border border-accent-indigo px-2 flex-shrink-0 py-1 rounded shadow-sm font-bold text-white tracking-widest uppercase">{selectedNode.type}</span>
               </div>
               <p className="text-sm font-sans text-text-secondary leading-relaxed tracking-wide">
                 {selectedNode.properties?.description || selectedNode.label || 'No detailed description found in graph schema.'}
               </p>
            </div>

            <div className="space-y-4 border-b border-border-light pb-8 text-sm">
                <h4 className="font-semibold text-text-primary uppercase tracking-widest text-[11px] mb-2">Properties</h4>
                {selectedNode.properties && Object.entries(selectedNode.properties).length > 0 ? (
                  Object.entries(selectedNode.properties).map(([k,v]) => (
                    <div key={k} className="flex justify-between">
                      <span className="text-text-secondary font-mono text-xs uppercase">{k}</span>
                      <span className="font-mono font-bold text-text-primary text-xs text-right max-w-[150px] truncate" title={String(v)}>{String(v)}</span>
                    </div>
                  ))
                ) : (
                  <span className="text-text-dim text-xs">No additional attributes.</span>
                )}
            </div>
            
            <div className="pt-6">
              <span className="text-xs font-bold text-text-secondary uppercase tracking-widest block mb-4 border-none outline-none">Connected Edges (Depth 1)</span>
              <div className="space-y-3 font-mono text-xs">
                {edges.filter(e => e.source === selectedNode.id || e.target === selectedNode.id).map((e, idx) => {
                   const isSource = e.source === selectedNode.id;
                   const otherId = isSource ? e.target : e.source;
                   return (
                      <div key={idx} onClick={() => setCenterNodeId(otherId)} className="flex items-center gap-2 overflow-hidden w-full bg-elevated px-3 py-2.5 rounded-lg border border-border-base cursor-pointer hover:border-accent-indigo hover:shadow-md transition-all shadow-xs group">
                        <span className="font-bold shrink-0 w-[45px] truncate" title={selectedNode.id}>{selectedNode.id}</span> 
                        <span className="flex-1 text-center text-[10px] text-text-dim truncate uppercase tracking-widest font-bold px-1 group-hover:text-accent-indigo transition-colors mx-1" title={e.relationship}>
                           {isSource ? '→ ' : '← '} {e.relationship} {isSource ? '→ ' : '← '}
                        </span> 
                        <span className="font-bold shrink-0 w-[45px] text-right truncate text-text-primary group-hover:text-accent-indigo transition-colors" title={otherId}>{otherId}</span>
                      </div>
                   )
                })}
                {edges.filter(e => e.source === selectedNode.id || e.target === selectedNode.id).length === 0 && (
                   <div className="text-text-dim px-2">No edges materialized.</div>
                )}
              </div>
            </div>
         </div>
         )}
      </div>
    </div>
  );
}
