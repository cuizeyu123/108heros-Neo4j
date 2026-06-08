import { useEffect, useRef, useCallback } from 'react';
import { Graph } from '@antv/g6';
import type { GraphData, HeroNode } from '../types';

interface Props {
  data: GraphData | null;
  loading: boolean;
  onNodeClick: (node: HeroNode) => void;
  highlightNodeId?: string | null;
}

export default function KnowledgeGraph({ data, loading, onNodeClick, highlightNodeId }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<Graph | null>(null);

  const initGraph = useCallback(() => {
    if (!containerRef.current) return;

    const graph = new Graph({
      container: containerRef.current,
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
      autoFit: 'view',
      animation: true,
      layout: {
        type: 'd3-force',
        preventOverlap: true,
        nodeSize: 48,
        linkDistance: 120,
        animate: true,
      },
      behaviors: [
        'zoom-canvas',
        'drag-canvas',
        'drag-element',
        {
          type: 'hover-activate',
          degree: 1,
          enable: true,
          state: 'active',
        },
      ],
      node: {
        type: (d: Record<string, unknown>) => {
          const nodeType = d.type as string;
          if (nodeType === 'hero') return 'image';
          return 'circle';
        },
        style: {
          size: (d: Record<string, unknown>) => {
            const nodeType = d.type as string;
            if (nodeType === 'hero') return 48;
            if (nodeType === 'star' || nodeType === 'tier') return 28;
            return 20;
          },
          src: (d: Record<string, unknown>) => {
            const nodeType = d.type as string;
            if (nodeType === 'hero') return (d.data as HeroNode['data'])?.image || '';
            return '';
          },
          fill: (d: Record<string, unknown>) => {
            const nodeType = d.type as string;
            if (nodeType === 'star') return '#6366F1';
            if (nodeType === 'tier') return '#8B5CF6';
            if (nodeType === 'position') return '#10B981';
            return '#334155';
          },
          stroke: (d: Record<string, unknown>) => {
            const nodeType = d.type as string;
            if (nodeType === 'hero') return (d.style as Record<string, unknown>)?.borderColor as string || '#D4A574';
            return 'transparent';
          },
          lineWidth: 2,
          radius: (d: Record<string, unknown>) => {
            const nodeType = d.type as string;
            if (nodeType === 'hero') return 24;
            return 14;
          },
          labelText: (d: Record<string, unknown>) => {
            const nodeType = d.type as string;
            const data = d.data as Record<string, unknown> | undefined;
            if (nodeType === 'hero') return (data?.name as string) || '';
            return (data?.name as string) || '';
          },
          labelPlacement: 'bottom',
          labelFontSize: 11,
          labelFill: '#94A3B8',
          labelOffsetY: 6,
          labelMaxWidth: 80,
        },
        state: {
          active: {
            stroke: '#F59E0B',
            lineWidth: 3,
            shadowBlur: 12,
            shadowColor: '#F59E0B',
          },
          selected: {
            stroke: '#F59E0B',
            lineWidth: 3,
            shadowBlur: 20,
            shadowColor: '#F59E0B',
          },
        },
      },
      edge: {
        type: 'line',
        style: {
          stroke: (d: Record<string, unknown>) =>
            (d.style as Record<string, unknown>)?.stroke as string || '#475569',
          lineWidth: (d: Record<string, unknown>) =>
            ((d.style as Record<string, unknown>)?.lineWidth as number) || 1,
          opacity: (d: Record<string, unknown>) =>
            ((d.style as Record<string, unknown>)?.opacity as number) || 0.5,
          endArrow: true,
        },
        state: {
          active: {
            stroke: '#F59E0B',
            lineWidth: 2,
            opacity: 1,
          },
        },
      },
    });

    graph.render();

    graph.on('node:click', (evt: Record<string, unknown>) => {
      const nodeData = (evt as { target?: { id?: string } }).target;
      const nodeId = nodeData?.id;
      if (!nodeId || !data) return;

      const clickedNode = data.nodes.find(
        (n) => n.id === nodeId && n.type === 'hero'
      ) as HeroNode | undefined;
      if (clickedNode) {
        onNodeClick(clickedNode);
      }
    });

    graphRef.current = graph;

    return graph;
  }, [onNodeClick, data]);

  // Initialize graph
  useEffect(() => {
    const graph = initGraph();
    return () => {
      graph?.destroy();
    };
  }, [initGraph]);

  // Update data
  useEffect(() => {
    if (!graphRef.current || !data) return;
    graphRef.current.setData(data);
    graphRef.current.render();
  }, [data]);

  // Highlight node
  useEffect(() => {
    if (!graphRef.current) return;

    // Clear all selected states
    graphRef.current.getNodeData().forEach((node: Record<string, unknown>) => {
      graphRef.current?.setElementState(node.id as string, 'selected', false);
    });

    if (highlightNodeId) {
      graphRef.current.setElementState(highlightNodeId, 'selected', true);
      graphRef.current.focusElement(highlightNodeId, { animation: true });
    }
  }, [highlightNodeId]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current || !graphRef.current) return;
      const { clientWidth, clientHeight } = containerRef.current;
      graphRef.current.setSize(clientWidth, clientHeight);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-[var(--color-bg-primary)]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-[var(--color-accent-gold)] border-t-transparent rounded-full animate-spin" />
          <span className="text-[var(--color-text-secondary)] text-sm">加载图谱数据中...</span>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-[var(--color-bg-primary)]"
      style={{ cursor: 'grab' }}
    />
  );
}
