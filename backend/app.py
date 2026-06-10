"""
水浒传108将知识图谱 - Flask API 后端
提供图谱数据、英雄详情、图片服务、动态文本实体抽取
"""

import json
import os
import re
from pathlib import Path

from flask import Flask, jsonify, request, send_file
from flask_cors import CORS

from nlp_extractor import extract_entities_and_relations

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


def _extract_social_relations(notes, my_name, name_to_hero):
    """
    从备考文本中提取该英雄的社会关系。
    返回 [(source_name, target_name, rel_type), ...] 列表。
    """
    results = []
    hero_names_sorted = sorted(name_to_hero.keys(), key=len, reverse=True)

    for target_name in hero_names_sorted:
        if target_name == my_name:
            continue
        idx = notes.find(target_name)
        if idx == -1:
            continue

        after = notes[idx + len(target_name):]

        # "...[target]之(兄|弟|姐|妹|父|子|主|师|徒)"
        m = re.match(r'^之(兄|弟|姐|妹|父|子|主|师|徒)', after)
        if m:
            results.append((my_name, target_name, m.group(1)))
            continue

        # "...[target]的(妹夫|妻舅|姐夫|妹婿|姑表)"
        m = re.match(r'^的(妹夫|妻舅|姐夫|妹婿|姑表)', after)
        if m:
            results.append((my_name, target_name, "亲族"))
            continue

        # "...[target]称他/她为YYY" → target称hero为YYY
        m = re.match(r'^称[他她]为(.+?)(?:[，,]|$)', after)
        if m:
            results.append((target_name, my_name, m.group(1)))
            continue

    # "与XXX为XX兄弟"
    for m in re.finditer(r'与([一-龥]{2,3})为', notes):
        tgt_name = m.group(1)
        if tgt_name in name_to_hero and tgt_name != my_name:
            results.append((my_name, tgt_name, "兄弟"))

    return results


def load_graph_data():
    """构建图谱数据（nodes + edges），适配 AntV G6 格式"""
    global _graph_cache
    if _graph_cache is not None:
        return _graph_cache

    heroes = load_heroes()
    name_to_hero = {h["姓名"]: h for h in heroes}

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
                "borderColor": "#C9A96E" if h["座次"] <= 36 else "#6B8E6B",
            },
        })
        node_ids.add(hero_id)

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
                "style": {"stroke": "#5C5548", "lineWidth": 1, "opacity": 0.35},
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
                    "style": {"stroke": "#5C5548", "lineWidth": 1, "opacity": 0.35},
                })
                edge_ids.add(edge_key)

    # Social relations
    for h in heroes:
        notes = h.get("备考", "")
        if not notes:
            continue
        for src_name, tgt_name, rel_type in _extract_social_relations(notes, h["姓名"], name_to_hero):
            src = name_to_hero[src_name]
            tgt = name_to_hero[tgt_name]
            edge_key = f"{src['座次']}_social_{tgt['座次']}_{rel_type}"
            if edge_key not in edge_ids:
                edges.append({
                    "id": edge_key,
                    "source": f"hero_{src['座次']}",
                    "target": f"hero_{tgt['座次']}",
                    "type": "social_relation",
                    "data": {"label": rel_type},
                    "style": {"stroke": "#C8843D", "lineWidth": 1.5, "opacity": 0.8},
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

    hero_with_relations = dict(hero)
    hero_with_relations["relations"] = extract_relations(hero, heroes)
    return jsonify(hero_with_relations)


def extract_relations(hero, all_heroes):
    """从备考字段提取该英雄的社会关系（双向查找）"""
    name_to_hero = {h["姓名"]: h for h in all_heroes}
    relations = []
    seen = set()

    def add_rel(target_name, rel_type):
        key = (target_name, rel_type)
        if key in seen:
            return
        seen.add(key)
        target = name_to_hero.get(target_name)
        if target:
            relations.append({
                "target_name": target_name,
                "target_number": target["座次"],
                "relation": rel_type,
                "target_image": f"http://localhost:5000/api/images/{target['local_image']}",
            })

    # 1) 从该英雄自己的备考中提取
    own_notes = hero.get("备考", "")
    if own_notes:
        for src_name, tgt_name, rel_type in _extract_social_relations(own_notes, hero["姓名"], name_to_hero):
            if src_name == hero["姓名"]:
                add_rel(tgt_name, rel_type)
            elif tgt_name == hero["姓名"]:
                add_rel(src_name, rel_type)

    # 2) 从其他英雄的备考中查找提及该英雄的关系
    for other in all_heroes:
        other_notes = other.get("备考", "")
        if not other_notes or other["姓名"] == hero["姓名"]:
            continue
        if hero["姓名"] not in other_notes:
            continue
        for src_name, tgt_name, rel_type in _extract_social_relations(other_notes, other["姓名"], name_to_hero):
            if src_name == hero["姓名"]:
                add_rel(tgt_name, rel_type)
            elif tgt_name == hero["姓名"]:
                add_rel(src_name, rel_type)

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
    if not filename.lower().endswith((".jpg", ".jpeg", ".png")):
        return jsonify({"error": "不支持的图片格式"}), 400

    image_path = IMAGES_DIR / filename
    if not image_path.exists():
        return jsonify({"error": "图片不存在"}), 404

    return send_file(str(image_path), mimetype="image/jpeg")


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


@app.route("/api/extract", methods=["POST"])
def extract_entities():
    """
    动态故事片段实体与关系抽取接口。

    请求体 JSON:
        {
            "text": "武松在景阳冈上打死了老虎...",
            "method": "local"  // 可选: "local" | "llm"
        }

    返回格式:
        {
            "nodes": [
                {"id": "entity_xxx", "name": "武松", "type": "人物", "mentions": [{"start": 0, "end": 2}]},
                ...
            ],
            "edges": [
                {"id": "rel_xxx", "source": "entity_xxx", "target": "entity_yyy", "relation": "对决", "evidence": "..."},
                ...
            ],
            "entity_mentions": {
                "武松": [{"start": 0, "end": 2}],
                ...
            }
        }
    """
    data = request.get_json(silent=True)
    if not data or "text" not in data:
        return jsonify({"error": "缺少 text 字段"}), 400

    text = data["text"].strip()
    if not text:
        return jsonify({"error": "text 不能为空"}), 400
    if len(text) > 10000:
        return jsonify({"error": "文本过长，单次最多支持 10000 字"}), 400

    method = data.get("method", "local")
    llm_config = data.get("llm_config", None)

    try:
        result = extract_entities_and_relations(text, method=method, llm_config=llm_config)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": f"抽取失败: {str(e)}"}), 500


if __name__ == "__main__":
    print(f"数据目录: {PROJECT_DATA_DIR}")
    print(f"图片目录: {IMAGES_DIR}")
    print(f"图片数量: {len(list(IMAGES_DIR.glob('*.jpg')))}")
    app.run(host="0.0.0.0", port=5000, debug=True)
