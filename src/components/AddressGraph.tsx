'use client';

import { useRef, useCallback, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { GraphNode, GraphEdge, AddressGraph as AddressGraphType } from '@/lib/stellar_graph';

// Dynamically import ForceGraph2D to avoid SSR issues
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), {
    ssr: false,
    loading: () => (
        <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
        </div>
    ),
});

interface AddressGraphProps {
    data: AddressGraphType;
    onNodeClick?: (node: GraphNode) => void;
}

export default function AddressGraph({ data, onNodeClick }: AddressGraphProps) {
    const graphRef = useRef<any>(null);
    const [mounted, setMounted] = useState(false);
    const [highlightNodes, setHighlightNodes] = useState(new Set());
    const [highlightLinks, setHighlightLinks] = useState(new Set());
    const [hoverNode, setHoverNode] = useState<GraphNode | null>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Format amount
    const formatAmount = (amount: number) => {
        if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M`;
        if (amount >= 1000) return `${(amount / 1000).toFixed(1)}K`;
        return Math.round(amount).toString();
    };

    // Node color based on type
    const getNodeColor = (node: GraphNode) => {
        if (node.type === 'source') return '#F59E0B'; // Gold
        if (node.type === 'destination') return '#22C55E'; // Green
        return '#3B82F6'; // Blue
    };

    // Link color 
    const getLinkColor = (link: GraphEdge) => {
        if (highlightLinks.has(link)) return '#22C55E'; // Highlight green
        return 'rgba(34, 197, 94, 0.4)'; // Explicit visible green (40% opacity)
    };

    const handleNodeHover = useCallback((node: any) => {
        setHoverNode(node);
        if (node) {
            const neighbors = new Set();
            const connectedLinks = new Set();
            data.links.forEach(link => {
                const sourceId = typeof link.source === 'object' ? (link.source as any).id : link.source;
                const targetId = typeof link.target === 'object' ? (link.target as any).id : link.target;
                if (sourceId === node.id || targetId === node.id) {
                    connectedLinks.add(link);
                    neighbors.add(sourceId === node.id ? targetId : sourceId);
                }
            });
            setHighlightNodes(neighbors);
            setHighlightLinks(connectedLinks);
        } else {
            setHighlightNodes(new Set());
            setHighlightLinks(new Set());
        }
    }, [data.links]);

    // Forces - ADJUSTED FOR CLOSER PACKING
    useEffect(() => {
        if (graphRef.current && mounted) {
            // Much weaker repulsion (-300) so nodes cluster closer
            graphRef.current.d3Force('charge').strength(-300);
            // Shorter link distance (50) to pull connected nodes in
            graphRef.current.d3Force('link').distance(50);
            // Strong centering force
            graphRef.current.d3Force('center').strength(0.8);
        }
    }, [data, mounted]);

    if (!mounted) {
        return (
            <div className="relative w-full h-full bg-[#0a0a0a] rounded-xl overflow-hidden border border-[var(--border-subtle)] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="relative w-full h-full bg-[#0a0a0a] rounded-xl overflow-hidden border border-[var(--border-subtle)]">
            <ForceGraph2D
                ref={graphRef}
                graphData={data}
                backgroundColor="#0a0a0a"
                // NODES: Custom Pill Renderer
                nodeCanvasObject={(node: any, ctx, globalScale) => {
                    const label = node.id.slice(0, 4) + '...' + node.id.slice(-4);
                    const fontSize = 12 / globalScale;
                    const r = Math.pow(node.val || 5, 0.7);

                    // Draw Node Circle
                    ctx.beginPath();
                    ctx.arc(node.x, node.y, r, 0, 2 * Math.PI, false);
                    ctx.fillStyle = getNodeColor(node);
                    ctx.fill();

                    if (highlightNodes.has(node.id) || node.type === 'source') {
                        ctx.strokeStyle = node.type === 'source' ? '#F59E0B' : '#22C55E';
                        ctx.lineWidth = 2 / globalScale;
                        ctx.stroke();
                    }

                    // Draw Label Pill
                    ctx.font = `600 ${fontSize}px "Inter", sans-serif`;
                    const textWidth = ctx.measureText(label).width;
                    const bckgDimensions = [textWidth + fontSize, fontSize * 1.5];

                    const pillX = node.x - bckgDimensions[0] / 2;
                    const pillY = node.y + r + (4 / globalScale);
                    const cornerRadius = 3 / globalScale;

                    ctx.beginPath();
                    if (ctx.roundRect) ctx.roundRect(pillX, pillY, bckgDimensions[0], bckgDimensions[1], cornerRadius);
                    else ctx.rect(pillX, pillY, bckgDimensions[0], bckgDimensions[1]);

                    ctx.fillStyle = 'rgba(10, 10, 10, 0.85)';
                    ctx.fill();
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
                    ctx.lineWidth = 0.5 / globalScale;
                    ctx.stroke();

                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillStyle = '#E2E8F0';
                    ctx.fillText(label, node.x, pillY + bckgDimensions[1] / 2);

                    node.__bckgDimensions = bckgDimensions;
                }}
                nodePointerAreaPaint={(node: any, color, ctx) => {
                    ctx.fillStyle = color;
                    const bckgDimensions = node.__bckgDimensions;
                    const r = Math.pow(node.val || 5, 0.7);
                    ctx.beginPath();
                    ctx.arc(node.x, node.y, r, 0, 2 * Math.PI, false);
                    ctx.fill();
                    if (bckgDimensions) {
                        ctx.fillRect(node.x - bckgDimensions[0] / 2, node.y + r + 4, bckgDimensions[0], bckgDimensions[1]);
                    }
                }}
                // LINKS: Custom Line + Arrow + Badge
                linkCanvasObject={(link: any, ctx, globalScale) => {
                    const start = link.source;
                    const end = link.target;
                    if (typeof start !== 'object' || typeof end !== 'object') return;

                    // Draw Line
                    ctx.beginPath();
                    ctx.moveTo(start.x, start.y);
                    ctx.lineTo(end.x, end.y);
                    ctx.strokeStyle = getLinkColor(link);
                    // Thickness based on amount
                    const width = Math.min(6, Math.max(1.5, Math.log10(link.amount || 1)));
                    ctx.lineWidth = width / globalScale;
                    ctx.stroke();

                    // Draw Arrow
                    const angle = Math.atan2(end.y - start.y, end.x - start.x);
                    const targetR = Math.pow((end as any).val || 5, 0.7);
                    const arrowLen = 8 / globalScale;
                    const arrowEnd = {
                        x: end.x - Math.cos(angle) * (targetR + 2),
                        y: end.y - Math.sin(angle) * (targetR + 2)
                    };
                    ctx.beginPath();
                    ctx.moveTo(arrowEnd.x, arrowEnd.y);
                    ctx.lineTo(arrowEnd.x - arrowLen * Math.cos(angle - Math.PI / 6), arrowEnd.y - arrowLen * Math.sin(angle - Math.PI / 6));
                    ctx.lineTo(arrowEnd.x - arrowLen * Math.cos(angle + Math.PI / 6), arrowEnd.y - arrowLen * Math.sin(angle + Math.PI / 6));
                    ctx.closePath();
                    ctx.fillStyle = getLinkColor(link);
                    ctx.fill();

                    // Draw Amount Badge if Significant (> 10 XLM)
                    if (link.amount > 10) {
                        const text = `${formatAmount(link.amount)} XLM`;
                        const fontSize = 10 / globalScale;
                        ctx.font = `600 ${fontSize}px "Inter", sans-serif`;
                        const textWidth = ctx.measureText(text).width;
                        const badgeW = textWidth + fontSize;
                        const badgeH = fontSize * 1.4;

                        const textPos = {
                            x: start.x + (end.x - start.x) * 0.5,
                            y: start.y + (end.y - start.y) * 0.5
                        };

                        ctx.save();
                        ctx.translate(textPos.x, textPos.y);
                        ctx.beginPath();
                        if (ctx.roundRect) ctx.roundRect(-badgeW / 2, -badgeH / 2, badgeW, badgeH, 4 / globalScale);
                        else ctx.rect(-badgeW / 2, -badgeH / 2, badgeW, badgeH);

                        ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
                        ctx.fill();
                        ctx.strokeStyle = '#22C55E';
                        ctx.lineWidth = 0.5 / globalScale;
                        ctx.stroke();

                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillStyle = '#4ADE80';
                        ctx.fillText(text, 0, 0);
                        ctx.restore();
                    }
                }}
                // PARTICLES (Flow Animation)
                linkDirectionalParticles={2}
                linkDirectionalParticleWidth={3}
                linkDirectionalParticleColor={() => '#4ADE80'}
                linkDirectionalParticleSpeed={0.005} // Slow steady flow

                onNodeClick={(node: any) => window.location.href = `/account/${node.id}`}
                onNodeHover={handleNodeHover}
                enableNodeDrag={true}

                // Pre-calculate layout before render
                // But we force a specific view in onEngineStop
                warmupTicks={100}
                cooldownTicks={0}
                onEngineStop={() => {
                    if (graphRef.current) {
                        // FOCUS ON SOURCE NODE LOGIC
                        const sourceNode = data.nodes.find((n: any) => n.type === 'source');
                        if (sourceNode && typeof sourceNode.x === 'number') {
                            // Zoom in on the source node specifically
                            graphRef.current.centerAt(sourceNode.x, sourceNode.y, 1000);
                            graphRef.current.zoom(3.5, 2000);
                        } else {
                            // Fallback
                            graphRef.current.zoomToFit(400, 50);
                        }
                    }
                }}
                d3AlphaDecay={0.05}
            />

            {/* Hover tooltip for Nodes */}
            {hoverNode && (
                <div className="absolute top-4 left-4 bg-[#0a0a0a]/90 border border-white/20 rounded-xl p-4 max-w-xs z-10 backdrop-blur-md">
                    <div className="text-white font-mono text-xs mb-2 pb-2 border-b border-white/10 break-all">
                        {hoverNode.id}
                    </div>
                    <div className="flex gap-4 text-xs">
                        <div>
                            <div className="text-white/50 uppercase text-[10px] tracking-wider mb-1">TXs</div>
                            <div className="text-white font-bold text-lg">{hoverNode.transactionCount}</div>
                        </div>
                        <div>
                            <div className="text-white/50 uppercase text-[10px] tracking-wider mb-1">Type</div>
                            <div className="text-white font-bold text-lg capitalize">{hoverNode.type}</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
