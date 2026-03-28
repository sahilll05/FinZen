"use client";

import { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { graphAPI } from '@/lib/api';

// Dynamically import the 3D graph (No SSR because it uses window)
const ForceGraph3D = dynamic(() => import('react-force-graph-3d'), { ssr: false });

export default function KnowledgeGraphPage() {
  const [nodes, setNodes] = useState<any[]>([]);
  const [links, setLinks] = useState<any[]>([]);
  const [centerNodeId, setCenterNodeId] = useState<string>('AAPL');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  
  const [hoverNode, setHoverNode] = useState<any>(null);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  
  const [highlightNodes, setHighlightNodes] = useState(new Set());
  const [highlightLinks, setHighlightLinks] = useState(new Set());

  const fgRef = useRef<any>();

  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(entries => {
      for (let entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height
        });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    loadGraph();
  }, [centerNodeId]);

  useEffect(() => {
    if (fgRef.current && nodes.length > 0) {
      fgRef.current.d3Force('charge').strength(-300); // Stronger repel to separate nicely
      fgRef.current.d3Force('link').distance(150);
    }
  }, [nodes]);

  const loadGraph = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await graphAPI.query(centerNodeId, 2);
      
      const newNodes = res.data.nodes || [];
      const newLinks = res.data.links || [];

      // Link source/target objects directly for React-Force-Graph processing
      newLinks.forEach((link: any) => {
        link.source = link.source;
        link.target = link.target;
      });

      // Pin the center node precisely at the 3D origin (0, 0, 0)
      // This guarantees the graph builds outward from the absolute center and never drifts
      const root = newNodes.find((n: any) => n.id === centerNodeId);
      if (root) {
        root.fx = 0;
        root.fy = 0;
        root.fz = 0;
      }

      setNodes(newNodes);
      setLinks(newLinks);

      // Reset highlights when data changes
      setHighlightNodes(new Set());
      setHighlightLinks(new Set());
      setHoverNode(null);
      setSelectedNode(root || null);

    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load knowledge graph data.');
    } finally {
      setIsLoading(false);
    }
  };

  const updateHighlight = (node: any) => {
    if (node) {
      const hNodes = new Set<string>();
      const hLinks = new Set<any>();
      
      hNodes.add(node.id);
      
      links.forEach(link => {
        const sId = typeof link.source === 'object' ? link.source.id : link.source;
        const tId = typeof link.target === 'object' ? link.target.id : link.target;
        
        if (sId === node.id || tId === node.id) {
          hLinks.add(link);
          hNodes.add(sId === node.id ? tId : sId);
        }
      });

      setHighlightNodes(hNodes);
      setHighlightLinks(hLinks);
    } else {
      setHighlightNodes(new Set());
      setHighlightLinks(new Set());
    }
  };

  const handleNodeHover = (node: any) => {
    setHoverNode(node);
    if (node) {
        updateHighlight(node);
    } else if (selectedNode) {
        updateHighlight(selectedNode);
    } else {
        updateHighlight(null);
    }
  };

  const handleNodeClick = (node: any) => {
    if (selectedNode?.id === node.id) {
        setCenterNodeId(node.id);
    } else {
        setSelectedNode(node);
        updateHighlight(node);
    }
  };

  const getStyleForType = (node: any) => {
    const isHighlighted = highlightNodes.size === 0 || highlightNodes.has(node.id);
    
    // Dim out non-connected nodes strongly
    if (!isHighlighted) return 'rgba(30, 41, 59, 0.4)'; // Dark Slate with transparency
    
    const colors: Record<string, string> = {
      'country': '#F43F5E', // Rose 500
      'company': '#3B82F6', // Blue 500
      'stock': '#3B82F6',   // Blue 500
      'sector': '#10B981',  // Emerald 500
    };
    
    return colors[node.type] || '#A855F7'; // Default Purple 500
  };
  
  // The active node to display in the side panel
  const activeDisplayedNode = hoverNode || selectedNode;

  return (
    <div className="w-full h-[calc(100vh-100px)] flex flex-row rounded-3xl overflow-hidden border border-border-strong shadow-2xl bg-[#020617]">
      
      {/* LEFT SIDEBAR: Info Panel & Search */}
      <div className="w-[380px] h-full bg-[#0B0E14] border-r border-[#1E293B] flex flex-col z-10 custom-scrollbar flex-shrink-0">
        
        {/* Header Area */}
        <div className="p-8 pb-6 border-b border-[#1E293B]">
           <div className="flex items-center gap-3 mb-2">
             <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
             </div>
             <h1 className="font-display text-2xl text-white tracking-tight">AI Knowledge</h1>
           </div>
           
           <p className="font-sans text-xs text-slate-400 mb-6 leading-relaxed">
             Multi-dimensional interactive logic propagation identifying hidden macro-level exposure vectors.
           </p>

           {/* Search Input */}
           <div className="flex bg-[#0F172A] rounded-xl border border-[#334155] p-1.5 focus-within:border-indigo-500 transition-colors shadow-inner">
              <input 
                type="text" 
                value={centerNodeId}
                onChange={(e) => setCenterNodeId(e.target.value.toUpperCase())}
                placeholder="Target entity..." 
                className="w-full bg-transparent px-3 py-2 text-sm text-white focus:outline-none uppercase font-mono tracking-wider" 
                onKeyDown={(e) => e.key === 'Enter' && loadGraph()}
              />
              <button 
                onClick={loadGraph} 
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold font-sans transition-colors"
                disabled={isLoading}
              >
                {isLoading ? 'Querying...' : 'Trace'}
              </button>
           </div>
        </div>

        {/* Dynamic Detail Panel */}
        <div className="flex-1 overflow-y-auto p-8 relative">
          
          {error ? (
              <div className="text-rose-400 bg-rose-500/10 p-4 rounded-xl border border-rose-500/20">
                 <p className="font-bold text-sm mb-1 uppercase tracking-widest">Query Failed</p>
                 <p className="text-xs">{error}</p>
              </div>
          ) : activeDisplayedNode ? (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
               {/* Concept Badge */}
               <div className="flex gap-2 items-center mb-4">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getStyleForType(activeDisplayedNode) }}></span>
                  <span className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-bold">
                    {activeDisplayedNode.type}
                  </span>
               </div>
               
               {/* Title */}
               <h2 className="font-display text-4xl text-white mb-6 leading-none tracking-tight break-words">
                 {activeDisplayedNode.label || activeDisplayedNode.id}
               </h2>
               
               {/* Description */}
               <p className="text-sm text-slate-300 leading-relaxed mb-8">
                 {activeDisplayedNode.properties?.description 
                    || `The entity ${activeDisplayedNode.id} serves as a structural nexus in the graph, linking dependent metrics across regional and sectoral borders.`}
               </p>
               
               {/* Metadata List */}
               {activeDisplayedNode.properties && Object.keys(activeDisplayedNode.properties).length > 0 && (
                  <div className="bg-[#0F172A]/50 border border-[#1E293B] rounded-2xl p-5 mb-8">
                     <h3 className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-4">Metadata Analysis</h3>
                     <div className="space-y-3">
                        {Object.entries(activeDisplayedNode.properties).map(([k,v]) => (
                          <div key={k} className="flex justify-between items-center text-xs">
                             <span className="text-slate-400 font-mono">{k}</span>
                             <span className="text-white text-right font-mono max-w-[150px] truncate">{String(v)}</span>
                          </div>
                        ))}
                     </div>
                  </div>
               )}
               
               {/* Connected Nodes Map */}
               <div>
                  <h3 className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-4 flex items-center gap-2">
                     <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                     </svg>
                     Connected Dependencies
                  </h3>
                  
                  <div className="flex flex-wrap gap-2">
                     {links
                       .map(e => {
                          const sId = typeof e.source === 'object' ? e.source.id : e.source;
                          const tId = typeof e.target === 'object' ? e.target.id : e.target;
                          return { e, sId, tId };
                       })
                       .filter(({ sId, tId }) => sId === activeDisplayedNode.id || tId === activeDisplayedNode.id)
                       .slice(0, 10) // Limit display
                       .map(({ e, sId, tId }, idx) => {
                          const isSource = sId === activeDisplayedNode.id;
                          const otherNodeObj = isSource ? e.target : e.source;
                          const otherNodeId = isSource ? tId : sId;
                          
                          return (
                            <button 
                               key={idx} 
                               onClick={() => setCenterNodeId(otherNodeId)}
                               className="flex items-center gap-2 px-3 py-1.5 bg-[#0F172A] hover:bg-[#1E293B] border border-[#1E293B] hover:border-slate-500 rounded-full transition-all text-left group"
                            >
                               <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getStyleForType(typeof otherNodeObj === 'object' ? otherNodeObj : { id: otherNodeId, type: 'unknown' }) }}></span>
                               <span className="text-xs font-mono text-slate-300 group-hover:text-white truncate max-w-[120px]">
                                 {otherNodeId}
                               </span>
                            </button>
                          );
                       })}
                       {links.filter(e => {
                          const sId = typeof e.source === 'object' ? e.source.id : e.source;
                          const tId = typeof e.target === 'object' ? e.target.id : e.target;
                          return sId === activeDisplayedNode.id || tId === activeDisplayedNode.id;
                       }).length === 0 && (
                          <span className="text-xs text-slate-500 italic">No direct edges discovered.</span>
                       )}
                  </div>
               </div>

            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
               <svg className="w-12 h-12 text-slate-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
               </svg>
               <p className="text-sm text-slate-400">Interact with the graph or plot a target entity to reveal hidden intelligence.</p>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT PANE: 3D Force Graph */}
      <div ref={containerRef} className="flex-1 h-full relative overflow-hidden backdrop-blur-3xl bg-transparent">
        
        {/* Subtle grid background to enhance 3D depth perception */}
        <div className="absolute inset-0 pointer-events-none opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

        {isLoading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#020617]/50 backdrop-blur-sm">
                <div className="w-12 h-12 rounded-full border-[3px] border-indigo-500/30 border-t-indigo-500 animate-spin mb-4"></div>
                <div className="text-indigo-400 font-mono tracking-widest text-xs uppercase animate-pulse">Running Physics Engine...</div>
            </div>
        )}

        {/* 3D Force Graph Container */}
        <div className="absolute inset-0 z-0">
          {dimensions.width > 0 && (
            <ForceGraph3D
              ref={fgRef}
              width={dimensions.width}
              height={dimensions.height}
              graphData={{ nodes, links }}
              nodeId="id"
              nodeRelSize={7}
              nodeResolution={32}
              nodeOpacity={0.95}
              nodeColor={getStyleForType} 
              nodeLabel={(node: any) => `<div style="padding: 6px 10px; border-radius: 6px; background: rgba(15, 23, 42, 0.9); color: white; border: 1px solid #334155; pointer-events: none; font-family: monospace;">
                                          <strong>${node.label || node.id}</strong><br/>
                                          <small style="opacity: 0.7">${node.type.toUpperCase()}</small>
                                        </div>`}
              
              // Influence Flow Animation Links
              linkWidth={(link: any) => highlightLinks.has(link) ? 2.5 : 0.8}
              linkColor={(link: any) => highlightLinks.has(link) ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255,255,255,0.05)'}
              linkDirectionalParticles={4}
              linkDirectionalParticleWidth={(link: any) => highlightLinks.has(link) ? 3 : 0}
              linkDirectionalParticleSpeed={(link: any) => link.weight * 0.005}
              
              onNodeHover={handleNodeHover}
              onNodeClick={handleNodeClick}

              // Elastic stretch physics requirement
              onNodeDragEnd={(node: any) => {
                node.fx = node.x;
                node.fy = node.y;
                node.fz = node.z;
              }}
              
              enableNodeDrag={true}
              backgroundColor="#020617" // Solid dark color matching theme
            />
          )}
        </div>

      </div>
    </div>
  );
}
