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
