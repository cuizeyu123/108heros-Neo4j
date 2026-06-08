"""
水浒传108将知识图谱 - Flask API 后端
提供图谱数据、英雄详情、图片服务
"""

import json
import os
import re
from pathlib import Path

from flask import Flask, jsonify, request, send_file
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# 路径配置
BASE_DIR = Path(__file__).resolve().parent
PROJECT_DATA_DIR = (BASE_DIR.parent / "data" / "peo108").resolve()
HEROES_DATA_PATH = PROJECT_DATA_DIR / "heroes_data.json"
WIKI_FULL_PATH = PROJECT_DATA_DIR / "wiki_heroes_full.json"
IMAGES_DIR = PROJECT_DATA_DIR / "images"

# 数据缓存
_heroes_cache = None
_graph_cache = None


def load_heroes():
    """加载合并后的英雄数据（缓存）"""
    global _heroes_cache
    if _heroes_cache is not None:
        return _heroes_cache

    heroes_basic = json.loads(HEROES_DATA_PATH.read_text(encoding="utf-8"))
    heroes_wiki = json.loads(WIKI_FULL_PATH.read_text(encoding="utf-8"))

    basic_by_name = {h["name"]: h for h in heroes_basic["heroes"]}

    heroes = []
    for w in heroes_wiki:
        name = w["姓名"]
        basic = basic_by_name.get(name, {})
        hero = {
            **w,
            "image_url": basic.get("image_url", ""),
            "local_image": f"{w['座次']:03d}_{name}.jpg",
        }
        heroes.append(hero)

    _heroes_cache = heroes
    return heroes


def load_graph_data():
    """构建图谱数据（nodes + edges），适配 AntV G6 格式"""
    global _graph_cache
    if _graph_cache is not None:
        return _graph_cache

    heroes = load_heroes()

    nodes = []
    edges = []
    node_ids = set()
    edge_ids = set()

    # Hero 节点
    for h in heroes:
        hero_id = f"hero_{h['座次']}"
        nodes.append({
            "id": hero_id,
            "type": "hero",
            "data": {
                "name": h["姓名"],
                "nickname": h["绰号"],
                "star": h["星宿"],
                "number": h["座次"],
                "tier": "天罡" if h["座次"] <= 36 else "地煞",
                "image": f"http://localhost:5000/api/images/{h['local_image']}",
                "position": h.get("梁山职位", ""),
            },
            "style": {
                "borderColor": "#D4A574" if h["座次"] <= 36 else "#A8B8C8",
            },
        })
        node_ids.add(hero_id)

    # Star 节点 (108 unique stars)
    for h in heroes:
        star_id = f"star_{h['星宿']}"
        if star_id not in node_ids:
            nodes.append({
                "id": star_id,
                "type": "star",
                "data": {"name": h["星宿"]},
            })
            node_ids.add(star_id)

        edge_key = f"{h['座次']}_belongs_to_star"
        if edge_key not in edge_ids:
            edges.append({
                "id": edge_key,
                "source": f"hero_{h['座次']}",
                "target": star_id,
                "type": "belongs_to",
                "data": {"label": "星宿"},
                "style": {"stroke": "#6366F1", "lineWidth": 1, "opacity": 0.6},
            })
            edge_ids.add(edge_key)

    # Tier 节点 (天罡36 / 地煞72)
    tier_ids = {"三十六天罡": "tier_tiangang", "七十二地煞": "tier_disha"}
    for tier_name, tier_id in tier_ids.items():
        nodes.append({
            "id": tier_id,
            "type": "tier",
            "data": {"name": tier_name},
        })

    for h in heroes:
        tier_name = "三十六天罡" if h["座次"] <= 36 else "七十二地煞"
        tier_id = tier_ids[tier_name]
        edge_key = f"{h['座次']}_belongs_to_tier"
        if edge_key not in edge_ids:
            edges.append({
                "id": edge_key,
                "source": f"hero_{h['座次']}",
                "target": tier_id,
                "type": "belongs_to_tier",
                "data": {"label": tier_name},
                "style": {"stroke": "#8B5CF6", "lineWidth": 1, "opacity": 0.5},
            })
            edge_ids.add(edge_key)

    # Position 节点 + HOLDS_POSITION 边
    for h in heroes:
        pos = h.get("梁山职位", "").strip()
        if pos and pos != "－":
            pos_id = f"pos_{pos}"
            if pos_id not in node_ids:
                nodes.append({
                    "id": pos_id,
                    "type": "position",
                    "data": {"name": pos},
                })
                node_ids.add(pos_id)

            edge_key = f"{h['座次']}_holds_{pos}"
            if edge_key not in edge_ids:
                edges.append({
                    "id": edge_key,
                    "source": f"hero_{h['座次']}",
                    "target": pos_id,
                    "type": "holds_position",
                    "data": {"label": "梁山职位"},
                    "style": {"stroke": "#10B981", "lineWidth": 1, "opacity": 0.5},
                })
                edge_ids.add(edge_key)

    # Social relations (从备考字段提取)
    for h in heroes:
        notes = h.get("备考", "")
        name = h["姓名"]
        if not notes:
            continue

        # "XXX之兄/弟/姐/妹/父/子/主/师/徒"
        for m in re.finditer(r"([一-龥]{2,4})之(兄|弟|姐|妹|父|子|主|师|徒)", notes):
            relative = m.group(1)
            rel_type = m.group(2)
            if relative != name:
                # 查找relative对应的hero number
                target = next(
                    (hh for hh in heroes if hh["姓名"] == relative), None
                )
                if target:
                    edge_key = f"{h['座次']}_social_{target['座次']}_{rel_type}"
                    if edge_key not in edge_ids:
                        edges.append({
                            "id": edge_key,
                            "source": f"hero_{h['座次']}",
                            "target": f"hero_{target['座次']}",
                            "type": "social_relation",
                            "data": {"label": rel_type},
                            "style": {"stroke": "#F59E0B", "lineWidth": 1.5, "opacity": 0.8},
                        })
                        edge_ids.add(edge_key)

        # "XXX称他/她为YYY"
        for m in re.finditer(r"([一-龥]{2,4})称[他她]为(\w+)", notes):
            person = m.group(1)
            role = m.group(2)
            if person != name:
                target = next(
                    (hh for hh in heroes if hh["姓名"] == person), None
                )
                if target:
                    edge_key = f"{target['座次']}_social_{h['座次']}_{role}"
                    if edge_key not in edge_ids:
                        edges.append({
                            "id": edge_key,
                            "source": f"hero_{target['座次']}",
                            "target": f"hero_{h['座次']}",
                            "type": "social_relation",
                            "data": {"label": role},
                            "style": {"stroke": "#F59E0B", "lineWidth": 1.5, "opacity": 0.8},
                        })
                        edge_ids.add(edge_key)

    _graph_cache = {"nodes": nodes, "edges": edges}
    return _graph_cache


# ─── API Routes ─────────────────────────────────────────────

@app.route("/api/heroes", methods=["GET"])
def get_heroes():
    """返回所有108将列表"""
    heroes = load_heroes()
    return jsonify(heroes)


@app.route("/api/heroes/<name>", methods=["GET"])
def get_hero(name):
    """返回单个英雄详情（中文姓名）"""
    heroes = load_heroes()
    hero = next((h for h in heroes if h["姓名"] == name), None)
    if hero is None:
        return jsonify({"error": "英雄不存在"}), 404

    # 附加社会关系
    hero_with_relations = dict(hero)
    hero_with_relations["relations"] = extract_relations(hero, heroes)
    return jsonify(hero_with_relations)


def extract_relations(hero, all_heroes):
    """从备考字段提取该英雄的社会关系"""
    notes = hero.get("备考", "")
    name = hero["姓名"]
    relations = []

    for m in re.finditer(r"([一-龥]{2,4})之(兄|弟|姐|妹|父|子|主|师|徒)", notes):
        relative = m.group(1)
        rel_type = m.group(2)
        if relative != name:
            target = next(
                (h for h in all_heroes if h["姓名"] == relative), None
            )
            if target:
                relations.append({
                    "target_name": relative,
                    "target_number": target["座次"],
                    "relation": rel_type,
                    "target_image": f"http://localhost:5000/api/images/{target['local_image']}",
                })

    return relations


@app.route("/api/graph", methods=["GET"])
def get_graph():
    """返回完整图谱数据（nodes + edges）"""
    return jsonify(load_graph_data())


@app.route("/api/search", methods=["GET"])
def search_heroes():
    """搜索英雄（按姓名、绰号、星宿）"""
    q = request.args.get("q", "").strip()
    if not q:
        return jsonify([])

    heroes = load_heroes()
    results = []
    for h in heroes:
        if (
            q in h["姓名"]
            or q in h["绰号"]
            or q in h["星宿"]
        ):
            results.append(h)

    return jsonify(results)


@app.route("/api/images/<filename>")
def serve_image(filename):
    """提供本地英雄画像"""
    # 安全检查：只允许jpg/png
    if not filename.lower().endswith((".jpg", ".jpeg", ".png")):
        return jsonify({"error": "不支持的图片格式"}), 400

    image_path = IMAGES_DIR / filename
    if not image_path.exists():
        # 尝试按编号查找
        return jsonify({"error": "图片不存在"}), 404

    return send_file(str(image_path), mimetype="image/jpeg")


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    print(f"数据目录: {PROJECT_DATA_DIR}")
    print(f"图片目录: {IMAGES_DIR}")
    print(f"图片数量: {len(list(IMAGES_DIR.glob('*.jpg')))}")
    app.run(host="0.0.0.0", port=5000, debug=True)
