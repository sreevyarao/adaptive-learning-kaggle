"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import dynamic from 'next/dynamic';

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), {
  ssr: false
});

export default function KnowledgeGraphPage() {
  const [kg, setKg] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [windowSize, setWindowSize] = useState({ width: 800, height: 600 });
  const [hoveredNode, setHoveredNode] = useState<any>(null);
  const [viewMode, setViewMode] = useState<"graph" | "grid">("graph");
  const router = useRouter();

  useEffect(() => {
    fetchKG();
    if (typeof window !== 'undefined') {
      setWindowSize({ width: window.innerWidth - 300, height: window.innerHeight - 200 });
      const handleResize = () => setWindowSize({ width: window.innerWidth - 300, height: window.innerHeight - 200 });
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  const fetchKG = async () => {
    const user = localStorage.getItem("mockUser");
    if (!user) {
      router.push("/");
      return;
    }
    try {
      const res = await fetch("http://localhost:8000/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: user })
      });
      const data = await res.json();
      if (data.user) {
        if (data.user.knowledge_graph) {
          setKg(data.user.knowledge_graph);
        } else if (data.user.roadmap_markdown) {
          // Initialize Knowledge Graph if missing
          const initRes = await fetch("http://localhost:8000/api/kg/init", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: user, roadmap_markdown: data.user.roadmap_markdown })
          });
          const initData = await initRes.json();
          if (initData.status === "success") {
            setKg(initData.knowledge_graph);
          }
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const getMasteryColor = (score: number) => {
    if (score >= 80) return "bg-emerald-500";
    if (score >= 50) return "bg-blue-500";
    if (score >= 20) return "bg-orange-500";
    return "bg-red-500";
  };
  
  const getMasteryHex = (score: number) => {
    if (score >= 80) return "#10b981";
    if (score >= 50) return "#3b82f6";
    if (score >= 20) return "#f97316";
    return "#ef4444";
  };

  const fgRef = useRef<any>(null);

  const graphData = useMemo(() => {
    if (!kg || !kg.nodes) return { nodes: [], links: [] };
    
    // De-duplicate nodes based on topic to prevent physics crashes
    const uniqueNodesMap = new Map();
    if (kg && Array.isArray(kg.nodes)) {
      kg.nodes.forEach((n: any) => {
        if (n && n.topic && typeof n.topic === 'string' && !uniqueNodesMap.has(n.topic)) {
          uniqueNodesMap.set(n.topic, n);
        }
      });
    }
    const uniqueNodesList = Array.from(uniqueNodesMap.values());
    
    const coreNode = { id: "core", name: "Core Learning Roadmap", val: 20, color: "#8b5cf6" }; 
    
    const nodes = [
      coreNode,
      ...uniqueNodesList.map((n: any) => {
        const mastery = n.mastery_score || 0;
        return {
          id: n.topic,
          name: n.topic,
          desc: n.description,
          mastery: mastery,
          last_reviewed: n.last_reviewed,
          parent_topic: n.parent_topic,
          val: Math.max(8, mastery / 5),
          color: getMasteryHex(mastery)
        };
      })
    ];
    
    const links = uniqueNodesList.map((n: any) => {
      // Prevent self-linking and ensure parent exists
      let sourceId = "core";
      if (n.parent_topic && n.parent_topic !== n.topic && uniqueNodesMap.has(n.parent_topic)) {
        sourceId = n.parent_topic;
      }
      
      const mastery = n.mastery_score || 0;
      return {
        source: sourceId,
        target: n.topic,
        width: Math.max(1, mastery / 20)
      };
    });

    return { nodes, links };
  }, [kg]);

  const [isExpanding, setIsExpanding] = useState(false);

  useEffect(() => {
    if (fgRef.current && viewMode === "graph" && typeof fgRef.current.d3Force === "function") {
      // Increase distance and repulsion for a cleaner hierarchical layout
      try {
        const chargeForce = fgRef.current.d3Force('charge');
        if (chargeForce) chargeForce.strength(-400);
        
        const linkForce = fgRef.current.d3Force('link');
        if (linkForce) linkForce.distance(80);
      } catch (e) {
        console.warn("D3 force initialization skipped", e);
      }
    }
  }, [graphData, viewMode]);

  const handleNodeClick = async (node: any) => {
    if (node.id === "core" || isExpanding) return;
    
    const user = localStorage.getItem("mockUser");
    if (!user) return;
    
    setIsExpanding(true);
    try {
      const res = await fetch("http://localhost:8000/api/kg/expand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: user, topic: node.id })
      });
      const data = await res.json();
      if (data.status === "success") {
        setKg(data.knowledge_graph);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsExpanding(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center p-8 bg-gray-900">
        <div className="animate-pulse text-2xl font-bold text-gray-300">Loading Knowledge Graph...</div>
      </div>
    );
  }

  if (!kg || !kg.nodes || kg.nodes.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center p-8 bg-gray-900">
        <div className="bg-gray-800/50 p-12 rounded-3xl text-center shadow-2xl border border-gray-700">
          <div className="text-6xl mb-6">🕸️</div>
          <h2 className="text-3xl font-bold text-white mb-4">No Knowledge Graph Found</h2>
          <p className="text-gray-400 mb-8 max-w-md mx-auto">
            Your knowledge graph will automatically generate once you start a roadmap.
          </p>
          <button onClick={() => router.push("/")} className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold text-white transition-all">
            Return to Workspace
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col p-4 md:p-8 animate-in fade-in duration-700 text-gray-100">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center bg-gray-900/60 backdrop-blur-2xl p-6 rounded-3xl shadow-2xl border border-gray-800/60 relative overflow-hidden gap-6 mb-8 shrink-0">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px]"></div>
        <div className="relative z-10 flex-1">
          <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-400 to-blue-400 tracking-tight flex items-center gap-3 mb-4">
            <span>🕸️</span> Knowledge Graph
          </h1>
          
          <div className="flex bg-gray-800/80 p-1 rounded-xl w-max border border-gray-700 shadow-inner">
            <button 
              onClick={() => setViewMode("graph")}
              className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${viewMode === "graph" ? "bg-gray-700 text-white shadow" : "text-gray-400 hover:text-gray-200"}`}
            >
              Visual Web
            </button>
            <button 
              onClick={() => setViewMode("grid")}
              className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${viewMode === "grid" ? "bg-gray-700 text-white shadow" : "text-gray-400 hover:text-gray-200"}`}
            >
              Grid View
            </button>
          </div>
        </div>
        
        <button onClick={() => router.push("/")} className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-bold transition-all relative z-10 border border-gray-700 text-sm whitespace-nowrap">
          Back to Workspace
        </button>
      </header>

      {viewMode === "graph" ? (
        <div className="flex-1 flex gap-6 relative animate-in fade-in zoom-in-95 duration-500">
          <div className="flex-1 bg-gray-800/20 backdrop-blur-md rounded-3xl border border-gray-700/50 overflow-hidden relative shadow-inner">
            {isExpanding && (
              <div className="absolute inset-0 z-50 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center">
                <div className="bg-gray-800/80 p-4 rounded-xl border border-gray-700 shadow-xl flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-emerald-400 font-bold">Breaking down topic...</span>
                </div>
              </div>
            )}
            <ForceGraph2D
              ref={fgRef}
              width={windowSize.width}
              height={windowSize.height}
              graphData={graphData}
              nodeLabel="name"
              nodeRelSize={1}
              linkColor={() => "rgba(156, 163, 175, 0.2)"}
              linkWidth="width"
              onNodeHover={(node) => setHoveredNode(node)}
              onNodeClick={handleNodeClick}
              cooldownTicks={100}
              nodeCanvasObject={(node: any, ctx, globalScale) => {
                // Safeguard against NaN/undefined coordinates on first tick
                if (typeof node.x !== 'number' || typeof node.y !== 'number') return;
                
                const label = node.name;
                const fontSize = Math.max(3, 14 / globalScale);
                const r = node.val || 5;
                
                // Draw node circle
                ctx.beginPath();
                ctx.arc(node.x, node.y, r, 0, 2 * Math.PI, false);
                ctx.fillStyle = node.color || "#ccc";
                ctx.fill();
                
                // Draw text label permanently
                ctx.font = `${fontSize}px Sans-Serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'top';
                ctx.fillStyle = '#e5e7eb'; // text-gray-200
                ctx.fillText(label, node.x, node.y + r + (4/globalScale));
              }}
            />
            
            {hoveredNode && hoveredNode.id !== "core" && (
              <div className="absolute bottom-6 right-6 bg-gray-900/90 backdrop-blur-xl p-6 rounded-2xl border border-gray-700 shadow-2xl max-w-sm pointer-events-none animate-in fade-in zoom-in-95 duration-200 z-50">
                <h3 className="text-xl font-bold text-white mb-2">{hoveredNode.name}</h3>
                <p className="text-sm text-gray-400 mb-4">{hoveredNode.desc}</p>
                
                <div className="flex justify-between items-end mb-2">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Mastery</span>
                  <span className="font-bold text-gray-200">{Math.round(hoveredNode.mastery)}%</span>
                </div>
                <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${getMasteryColor(hoveredNode.mastery)} transition-all duration-500`}
                    style={{ width: `${Math.max(5, hoveredNode.mastery)}%` }}
                  ></div>
                </div>
                <div className="mt-4 text-xs text-gray-500 flex justify-between">
                  <span>Last Reviewed:</span>
                  <span>{hoveredNode.last_reviewed ? new Date(hoveredNode.last_reviewed).toLocaleDateString() : 'Never'}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-8 duration-500">
          {kg.nodes.map((node: any, idx: number) => (
            <div key={idx} className="bg-gray-800/40 backdrop-blur-md border border-gray-700/50 rounded-2xl p-6 hover:bg-gray-800/60 transition-all hover:-translate-y-1 hover:shadow-xl relative overflow-hidden group">
              <h3 className="text-xl font-bold text-gray-100 mb-2 relative z-10">{node.topic}</h3>
              <p className="text-sm text-gray-400 mb-6 relative z-10 line-clamp-3" title={node.description}>{node.description}</p>
              
              <div className="relative z-10">
                <div className="flex justify-between items-end mb-2">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Mastery</span>
                  <span className="font-bold text-gray-200">{Math.round(node.mastery_score)}%</span>
                </div>
                <div className="w-full h-3 bg-gray-900 rounded-full overflow-hidden shadow-inner">
                  <div 
                    className={`h-full ${getMasteryColor(node.mastery_score)} transition-all duration-1000 ease-out`}
                    style={{ width: `${Math.max(5, node.mastery_score)}%` }}
                  ></div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-700/50 flex justify-between items-center relative z-10 text-xs text-gray-500">
                <span>Last Reviewed:</span>
                <span>{node.last_reviewed ? new Date(node.last_reviewed).toLocaleDateString() : 'Never'}</span>
              </div>
              
              <div className={`absolute -right-10 -bottom-10 w-32 h-32 blur-[50px] opacity-20 group-hover:opacity-40 transition-opacity ${getMasteryColor(node.mastery_score)}`}></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
