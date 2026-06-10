import { useEffect, useRef, useCallback } from 'react';
import { Graph } from '@antv/g6';
import type { GraphData, HeroNode } from '../types';

interface Props {
  data: GraphData | null;
  loading: boolean;
  onNodeClick: (node: HeroNode) => void;
  highlightNodeId?: string | null;
}

const GOLD = '#C9A96E';
const GOLD_LIGHT = '#DBC594';
const VERMILLION = '#C43D3D';
const JADE = '#6B8E6B';
const AMBER = '#C8843D';
const INK = '#5C5548';
const PARCHMENT_BG = '#1A1410';
const CREAM = '#EBE5D9';

function getRelationColor(relType: string): string {
  switch (relType) {
    case '兄': case '弟': case '姐': case '妹': case '父': case '子':
      return GOLD;
    case '主': case '仆':
      return AMBER;
    case '师': case '徒':
      return JADE;
    default:
      return AMBER;
  }
}

function getTierColor(tier: string): string {
  return tier === '天罡' ? GOLD : JADE;
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
      background: 'transparent',
      layout: {
        type: 'd3-force',
        preventOverlap: true,
        nodeSize: 64,
        linkDistance: 240,
        nodeStrength: -800,
        collisionStrength: 2.5,
        alpha: 0.9,
        alphaDecay: 0.008,
        alphaMin: 0.001,
        animate: true,
      },
      behaviors: [
        'zoom-canvas',
        'drag-canvas',
        {
          type: 'drag-element',
          enable: true,
          animation: true,
        },
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
            if (nodeType === 'hero') return 64;
            if (nodeType === 'tier') return 32;
            return 22;
          },
          src: (d: Record<string, unknown>) => {
            const nodeType = d.type as string;
            if (nodeType === 'hero') return (d.data as HeroNode['data'])?.image || '';
            return '';
          },
          fill: (d: Record<string, unknown>) => {
            const nodeType = d.type as string;
            if (nodeType === 'tier') return JADE;
            if (nodeType === 'position') return INK;
            return PARCHMENT_BG;
          },
          stroke: (d: Record<string, unknown>) => {
            const nodeType = d.type as string;
            if (nodeType === 'hero') {
              const heroData = d.data as HeroNode['data'] | undefined;
              return getTierColor(heroData?.tier || '地煞');
            }
            if (nodeType === 'tier') return JADE;
            if (nodeType === 'position') return INK;
            return INK;
          },
          lineWidth: (d: Record<string, unknown>) => {
            const nodeType = d.type as string;
            if (nodeType === 'hero') return 3;
            return 1.5;
          },
          radius: (d: Record<string, unknown>) => {
            const nodeType = d.type as string;
            if (nodeType === 'hero') return 32;
            return 16;
          },
          /* 外圈装饰环 */
          outerRing: (d: Record<string, unknown>) => {
            const nodeType = d.type as string;
            if (nodeType === 'hero') return true;
            return false;
          },
          outerRingStroke: (d: Record<string, unknown>) => {
            const heroData = d.data as HeroNode['data'] | undefined;
            return getTierColor(heroData?.tier || '地煞');
          },
          outerRingLineWidth: 1,
          outerRingDistance: 4,
          /* 标签 — 印章式竖排 */
          labelText: (d: Record<string, unknown>) => {
            const nodeData = d.data as Record<string, unknown> | undefined;
            return (nodeData?.name as string) || '';
          },
          labelPlacement: 'bottom',
          labelFontFamily: '"Noto Serif TC", serif',
          labelFontSize: 14,
          labelFontWeight: 'bold',
          labelFill: CREAM,
          labelOffsetY: 4,
          labelMaxWidth: 100,
          labelBackground: true,
          labelBackgroundFill: 'rgba(26, 20, 16, 0.9)',
          labelBackgroundRadius: 3,
          labelBackgroundPadding: [2, 8, 2, 8],
          labelBackgroundStroke: (d: Record<string, unknown>) => {
            const nodeType = d.type as string;
            if (nodeType === 'hero') {
              const heroData = d.data as HeroNode['data'] | undefined;
              return getTierColor(heroData?.tier || '地煞');
            }
            return 'transparent';
          },
          labelBackgroundLineWidth: (d: Record<string, unknown>) => {
            const nodeType = d.type as string;
            return nodeType === 'hero' ? 1 : 0;
          },
          labelBackgroundOpacity: 0.85,
          /* 座次角标 */
          badgeText: (d: Record<string, unknown>) => {
            const nodeType = d.type as string;
            if (nodeType !== 'hero') return '';
            const heroData = d.data as HeroNode['data'] | undefined;
            return heroData?.number ? String(heroData.number) : '';
          },
          badgeFill: VERMILLION,
          badgeFontSize: 10,
          badgeFontWeight: 'bold',
          badgeFontFamily: '"Noto Serif TC", serif',
        },
        state: {
          active: {
            stroke: GOLD_LIGHT,
            lineWidth: 3,
            shadowBlur: 16,
            shadowColor: 'rgba(201, 169, 110, 0.6)',
          },
          selected: {
            stroke: VERMILLION,
            lineWidth: 4,
            shadowBlur: 24,
            shadowColor: 'rgba(196, 61, 61, 0.7)',
          },
        },
      },
      edge: {
        type: 'line',
        style: {
          stroke: (d: Record<string, unknown>) => {
            const edgeData = d.data as Record<string, unknown> | undefined;
            const label = edgeData?.label as string;
            if (label) return getRelationColor(label);
            return INK;
          },
          lineWidth: (d: Record<string, unknown>) => {
            const edgeType = d.type as string;
            if (edgeType === 'social_relation') return 2;
            return 1;
          },
          opacity: (d: Record<string, unknown>) => {
            const edgeType = d.type as string;
            if (edgeType === 'social_relation') return 0.8;
            return 0.35;
          },
          endArrow: true,
          lineDash: (d: Record<string, unknown>) => {
            const edgeType = d.type as string;
            if (edgeType === 'social_relation') return undefined;
            return [4, 4];
          },
        },
        state: {
          active: {
            stroke: GOLD_LIGHT,
            lineWidth: 2.5,
            opacity: 1,
            shadowBlur: 8,
            shadowColor: 'rgba(201, 169, 110, 0.4)',
          },
        },
      },
    });

    graph.render();

    /* 拖拽时保持力导向动画 */
    const resumeSimulation = (alpha: number) => {
      try {
        const layout = graph.getLayout?.() as Record<string, unknown> | null;
        if (!layout) return;
        const sim = layout.simulation as Record<string, number | (() => void)> | null;
        if (sim) {
          if (typeof sim.restart === 'function') (sim as Record<string, () => void>).restart();
          (sim as Record<string, number>).alpha = alpha;
        }
      } catch { /* ignore */ }
    };

    graph.on('node:dragstart', () => resumeSimulation(0.3));
    graph.on('node:drag', () => resumeSimulation(0.1));
    graph.on('node:dragend', () => resumeSimulation(0.08));

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

  useEffect(() => {
    const graph = initGraph();
    return () => { graph?.destroy(); };
  }, [initGraph]);

  useEffect(() => {
    if (!graphRef.current || !data) return;
    graphRef.current.setData(data);
    graphRef.current.render();
  }, [data]);

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
          {/* 墨锭加载动画 */}
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

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative"
      style={{ cursor: 'grab' }}
    >
      {/* 地图标题水印 */}
      <div
        className="absolute top-6 left-1/2 -translate-x-1/2 pointer-events-none select-none z-10"
        style={{ opacity: 0.12 }}
      >
        <span
          className="font-['Noto_Serif_TC'] text-4xl font-bold tracking-[0.3em] text-[var(--color-accent-gold)]"
          style={{ writingMode: 'horizontal-tb' }}
        >
          梁山泊好汉全图
        </span>
      </div>

      {/* 左下角罗盘装饰 */}
      <div
        className="absolute bottom-6 left-6 pointer-events-none select-none z-10"
        style={{ opacity: 0.15 }}
      >
        <div className="w-20 h-20 rounded-full border border-[var(--color-accent-gold)] flex items-center justify-center">
          <div className="w-16 h-16 rounded-full border border-[var(--color-accent-gold)] flex items-center justify-center">
            <div className="text-center">
              <div className="font-['Noto_Serif_TC'] text-xs text-[var(--color-accent-gold)] tracking-[0.2em]">水</div>
              <div className="font-['Noto_Serif_TC'] text-xs text-[var(--color-accent-gold)] tracking-[0.2em]">浒</div>
            </div>
          </div>
        </div>
        {/* 十字方位 */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-3 text-[8px] text-[var(--color-accent-gold)]">北</div>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-3 text-[8px] text-[var(--color-accent-gold)]">南</div>
        <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 text-[8px] text-[var(--color-accent-gold)]">西</div>
        <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 text-[8px] text-[var(--color-accent-gold)]">东</div>
      </div>
    </div>
  );
}
