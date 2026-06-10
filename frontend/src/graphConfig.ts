/**
 * 共享图谱渲染配置
 * 供 KnowledgeGraph（108将）和 StoryGraph（动态抽取）公共复用
 */
import type { GraphOptions } from '@antv/g6';

// ─── 色彩常量 ───
export const GRAPH_COLORS = {
  gold: '#C9A96E',
  goldLight: '#DBC594',
  vermillion: '#C43D3D',
  jade: '#6B8E6B',
  amber: '#C8843D',
  ink: '#5C5548',
  parchmentBg: '#1A1410',
  cream: '#EBE5D9',
  water: '#5B8CB8',
  forest: '#4A7C59',
  earth: '#8B7355',
} as const;

/** 实体类型 → 节点颜色 */
export function getEntityColor(entityType: string): string {
  switch (entityType) {
    case '人物': case 'hero': case 'person':
      return GRAPH_COLORS.gold;
    case '地点': case 'place':
      return GRAPH_COLORS.water;
    case '道具': case 'item':
      return GRAPH_COLORS.amber;
    case 'tier':
      return GRAPH_COLORS.jade;
    case 'position':
      return GRAPH_COLORS.ink;
    default:
      return GRAPH_COLORS.ink;
  }
}

/** 关系类型 → 边颜色 */
export function getRelationColor(relType: string): string {
  switch (relType) {
    case '兄': case '弟': case '姐': case '妹': case '父': case '子': case '母': case '女':
    case '妻': case '夫': case '亲族': case '婚配': case '结义':
      return GRAPH_COLORS.gold;
    case '主': case '仆': case '主从':
      return GRAPH_COLORS.amber;
    case '师': case '徒': case '师从': case '师徒':
      return GRAPH_COLORS.jade;
    case '对决': case '杀死': case '攻打':
      return GRAPH_COLORS.vermillion;
    case '解救': case '投奔': case '相遇':
      return GRAPH_COLORS.water;
    case '商议': case '押送': case '赠送':
      return GRAPH_COLORS.forest;
    default:
      return GRAPH_COLORS.amber;
  }
}

/** 人物层级 → 边框色 */
export function getTierColor(tier: string): string {
  return tier === '天罡' ? GRAPH_COLORS.gold : GRAPH_COLORS.jade;
}

// ─── 力导向图布局参数（公共） ───
export const FORCE_LAYOUT = {
  type: 'd3-force' as const,
  preventOverlap: true,
  nodeSize: 64,
  linkDistance: 240,
  nodeStrength: -800,
  collisionStrength: 2.5,
  alpha: 0.9,
  alphaDecay: 0.008,
  alphaMin: 0.001,
  animate: true,
};

/** 强制导向图缩小版（用于故事抽取，节点较少） */
export const FORCE_LAYOUT_COMPACT = {
  type: 'd3-force' as const,
  preventOverlap: true,
  nodeSize: 48,
  linkDistance: 180,
  nodeStrength: -600,
  collisionStrength: 3,
  alpha: 0.9,
  alphaDecay: 0.008,
  alphaMin: 0.001,
  animate: true,
};

// ─── 公共行为 ───
export const COMMON_BEHAVIORS: GraphOptions['behaviors'] = [
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
];

// ─── 公共节点状态样式 ───
export const COMMON_NODE_STATE = {
  active: {
    stroke: GRAPH_COLORS.goldLight,
    lineWidth: 3,
    shadowBlur: 16,
    shadowColor: 'rgba(201, 169, 110, 0.6)',
  },
  selected: {
    stroke: GRAPH_COLORS.vermillion,
    lineWidth: 4,
    shadowBlur: 24,
    shadowColor: 'rgba(196, 61, 61, 0.7)',
  },
};

// ─── 公共边状态样式 ───
export const COMMON_EDGE_STATE = {
  active: {
    stroke: GRAPH_COLORS.goldLight,
    lineWidth: 2.5,
    opacity: 1,
    shadowBlur: 8,
    shadowColor: 'rgba(201, 169, 110, 0.4)',
  },
};

// ─── 力导向动画恢复工具函数 ───
export function resumeSimulation(graph: any, alpha: number) {
  try {
    const layout = graph.getLayout?.() as Record<string, unknown> | null;
    if (!layout) return;
    const sim = layout.simulation as Record<string, number | (() => void)> | null;
    if (sim) {
      if (typeof sim.restart === 'function') (sim as Record<string, () => void>).restart();
      (sim as Record<string, number>).alpha = alpha;
    }
  } catch { /* ignore */ }
}
