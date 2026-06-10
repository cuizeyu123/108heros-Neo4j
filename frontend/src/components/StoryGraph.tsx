/**
 * 动态故事知识图谱组件
 * 复用共享图谱配置，专用于展示 NLP 抽取出的实体与关系
 */
import { useEffect, useRef, useCallback } from 'react';
import { Graph } from '@antv/g6';
import type { ExtractResponse, StoryNode } from '../types';
import {
  GRAPH_COLORS,
  getEntityColor,
  getRelationColor,
  FORCE_LAYOUT_COMPACT,
  COMMON_BEHAVIORS,
  COMMON_NODE_STATE,
  COMMON_EDGE_STATE,
  resumeSimulation,
} from '../graphConfig';

interface Props {
  data: ExtractResponse | null;
  loading: boolean;
  onNodeClick?: (node: StoryNode) => void;
  highlightNodeId?: string | null;
}

/** 将 ExtractResponse 转为 G6 可用的数据格式 */
function convertToGraphData(extractData: ExtractResponse) {
  return {
    nodes: extractData.nodes.map((n) => ({
      id: n.id,
      type: n.type,
      data: { name: n.name, entityType: n.type },
      style: {},
    })),
    edges: extractData.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      type: 'story_relation' as const,
      data: { label: e.relation, evidence: e.evidence },
      style: {},
    })),
  };
}

export default function StoryGraph({ data, loading, onNodeClick, highlightNodeId }: Props) {
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
      background: 'transparent',
      layout: FORCE_LAYOUT_COMPACT,
      behaviors: COMMON_BEHAVIORS,
      node: {
        type: (d: Record<string, unknown>) => {
          const nodeType = (d.type as string) || '人物';
          if (nodeType === '人物' || nodeType === 'person') return 'circle';
          if (nodeType === '地点' || nodeType === 'place') return 'diamond';
          if (nodeType === '道具' || nodeType === 'item') return 'rect';
          return 'circle';
        },
        style: {
          size: (d: Record<string, unknown>) => {
            const nodeType = (d.type as string) || '人物';
            if (nodeType === '人物') return 48;
            return 32;
          },
          fill: (d: Record<string, unknown>) => {
            const nodeType = (d.type as string) || '人物';
            return getEntityColor(nodeType);
          },
          stroke: (d: Record<string, unknown>) => {
            const nodeType = (d.type as string) || '人物';
            return getEntityColor(nodeType);
          },
          lineWidth: 2,
          radius: (d: Record<string, unknown>) => {
            const nodeType = (d.type as string) || '人物';
            if (nodeType === '人物') return 24;
            return 8;
          },
          /* 标签 */
          labelText: (d: Record<string, unknown>) => {
            const nodeData = d.data as Record<string, unknown> | undefined;
            return (nodeData?.name as string) || '';
          },
          labelPlacement: 'bottom',
          labelFontFamily: '"Noto Serif TC", serif',
          labelFontSize: 13,
          labelFontWeight: 'bold',
          labelFill: GRAPH_COLORS.cream,
          labelOffsetY: 6,
          labelMaxWidth: 80,
          labelBackground: true,
          labelBackgroundFill: 'rgba(26, 20, 16, 0.9)',
          labelBackgroundRadius: 3,
          labelBackgroundPadding: [2, 6, 2, 6],
          labelBackgroundStroke: (d: Record<string, unknown>) => {
            const nodeType = (d.type as string) || '人物';
            return getEntityColor(nodeType);
          },
          labelBackgroundLineWidth: 1,
          labelBackgroundOpacity: 0.85,
        },
        state: COMMON_NODE_STATE,
      },
      edge: {
        type: 'line',
        style: {
          stroke: (d: Record<string, unknown>) => {
            const edgeData = d.data as Record<string, unknown> | undefined;
            const label = edgeData?.label as string;
            if (label) return getRelationColor(label);
            return GRAPH_COLORS.ink;
          },
          lineWidth: 2,
          opacity: 0.8,
          endArrow: true,
          /* 边标签 */
          labelText: (d: Record<string, unknown>) => {
            const edgeData = d.data as Record<string, unknown> | undefined;
            return (edgeData?.label as string) || '';
          },
          labelFontFamily: '"Noto Serif TC", serif',
          labelFontSize: 11,
          labelFill: GRAPH_COLORS.goldLight,
          labelBackground: true,
          labelBackgroundFill: 'rgba(26, 20, 16, 0.85)',
          labelBackgroundRadius: 2,
          labelBackgroundPadding: [1, 4, 1, 4],
        },
        state: COMMON_EDGE_STATE,
      },
    });

    graph.render();

    /* 拖拽时保持力导向动画 */
    graph.on('node:dragstart', () => resumeSimulation(graph, 0.3));
    graph.on('node:drag', () => resumeSimulation(graph, 0.1));
    graph.on('node:dragend', () => resumeSimulation(graph, 0.08));

    /* 节点点击事件 */
    if (onNodeClick) {
      graph.on('node:click', (evt: Record<string, unknown>) => {
        const nodeData = (evt as { target?: { id?: string; type?: string } }).target;
        const nodeId = nodeData?.id;
        const nodeType = nodeData?.type;
        if (!nodeId || !data) return;

        const clickedNode = data.nodes.find((n) => n.id === nodeId);
        if (clickedNode) {
          onNodeClick(clickedNode);
        }
      });
    }

    graphRef.current = graph;
    return graph;
  }, [onNodeClick, data]);

  useEffect(() => {
    const graph = initGraph();
    return () => { graph?.destroy(); };
  }, [initGraph]);

  /* 数据变更时更新 */
  useEffect(() => {
    if (!graphRef.current || !data) return;
    const g6Data = convertToGraphData(data);
    graphRef.current.setData(g6Data);
    graphRef.current.render();
  }, [data]);

  /* 高亮节点 */
  useEffect(() => {
    if (!graphRef.current) return;
    graphRef.current.getNodeData().forEach((node: Record<string, unknown>) => {
      graphRef.current?.setElementState(node.id as string, 'selected', false);
    });
    if (highlightNodeId) {
      graphRef.current.setElementState(highlightNodeId, 'selected', true);
      graphRef.current.focusElement(highlightNodeId, { animation: true });
    }
  }, [highlightNodeId]);

  /* resize 响应 */
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
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 border-2 border-[var(--color-accent-gold)] border-t-transparent rounded-full animate-spin opacity-40" />
            <div className="absolute inset-2 border border-[var(--color-accent-vermillion)] border-b-transparent rounded-full animate-spin opacity-60" style={{ animationDirection: 'reverse', animationDuration: '2s' }} />
          </div>
          <span className="font-['Noto_Serif_TC'] text-sm text-[var(--color-text-muted)] tracking-wider">
            研墨调色，绘制图谱...
          </span>
        </div>
      </div>
    );
  }

  if (!data || data.nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-[var(--color-bg-primary)]">
        <div className="flex flex-col items-center gap-3 opacity-50">
          <div className="w-16 h-16 rounded-full border border-[var(--color-border)] flex items-center justify-center">
            <span className="font-['Noto_Serif_TC'] text-2xl text-[var(--color-text-muted)]">图</span>
          </div>
          <span className="font-['Noto_Serif_TC'] text-xs text-[var(--color-text-muted)] tracking-wider">
            暂无图谱数据
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative"
      style={{ cursor: 'grab' }}
    >
      {/* 地图标题水印 */}
      <div
        className="absolute top-6 left-1/2 -translate-x-1/2 pointer-events-none select-none z-10"
        style={{ opacity: 0.1 }}
      >
        <span
          className="font-['Noto_Serif_TC'] text-3xl font-bold tracking-[0.3em] text-[var(--color-accent-gold)]"
        >
          故事脉络图
        </span>
      </div>
    </div>
  );
}
