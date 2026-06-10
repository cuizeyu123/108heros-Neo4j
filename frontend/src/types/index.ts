/**
 * 水浒传知识图谱 — TypeScript 类型定义
 * 包含 108 将图谱类型和动态故事抽取类型
 */

// ═══════════════════════════════════════════════════════════
// 108将图谱类型（现有）
// ═══════════════════════════════════════════════════════════

export interface HeroNode {
  id: string;
  type: "hero";
  data: {
    name: string;
    nickname: string;
    star: string;
    number: number;
    tier: "天罡" | "地煞";
    image: string;
    position: string;
  };
  style: {
    borderColor: string;
  };
}

export interface StarNode {
  id: string;
  type: "star";
  data: { name: string };
}

export interface TierNode {
  id: string;
  type: "tier";
  data: { name: string };
}

export interface PositionNode {
  id: string;
  type: "position";
  data: { name: string };
}

export type GraphNode = HeroNode | StarNode | TierNode | PositionNode;

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: "belongs_to" | "belongs_to_tier" | "holds_position" | "social_relation";
  data: { label: string };
  style: { stroke: string; lineWidth: number; opacity: number };
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface HeroRelation {
  target_name: string;
  target_number: number;
  relation: string;
  target_image: string;
}

export interface HeroDetail {
  座次: number;
  星宿: string;
  绰号: string;
  姓名: string;
  出身: string;
  初登场: string;
  入山回数: string;
  梁山职位: string;
  招安后官职: string;
  后续发展: string;
  备考: string;
  image_url: string;
  local_image: string;
  relations: HeroRelation[];
}

// ═══════════════════════════════════════════════════════════
// 动态故事抽取类型（新增）
// ═══════════════════════════════════════════════════════════

/** 实体提及位置（用于原文高亮） */
export interface EntityMention {
  start: number;
  end: number;
}

/** 抽取出的实体节点 */
export interface StoryNode {
  id: string;
  name: string;
  type: "人物" | "地点" | "道具";
  mentions: EntityMention[];
}

/** 抽取出的关系边 */
export interface StoryEdge {
  id: string;
  source: string;
  target: string;
  relation: string;
  evidence: string;
}

/** POST /api/extract 响应体 */
export interface ExtractResponse {
  nodes: StoryNode[];
  edges: StoryEdge[];
  entity_mentions: Record<string, EntityMention[]>;
}

/** 抽取请求状态 */
export interface ExtractState {
  text: string;
  result: ExtractResponse | null;
  loading: boolean;
  error: string | null;
}

/** 高亮文本段类型（用于渲染高亮原文） */
export type HighlightSegment =
  | { type: "text"; content: string }
  | { type: "entity"; content: string; entityType: StoryNode["type"]; entityName: string };

// ═══════════════════════════════════════════════════════════
// 导航 Tab 类型
// ═══════════════════════════════════════════════════════════

export type NavTab = "heroes-graph" | "story-extract";
