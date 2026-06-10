"""
水浒传 - NLP 实体与关系抽取模块

支持两种模式：
1. 本地规则抽取（默认）：基于 jieba 分词 + 词典匹配 + 正则模式
2. LLM API 抽取（可扩展）：通过适配器模式接入大模型 API

使用方式:
    from nlp_extractor import extract_entities_and_relations
    result = extract_entities_and_relations(text, method="local")
"""

import json
import re
import hashlib
from pathlib import Path

# ─── jieba 可选依赖 ───
try:
    import jieba
    import jieba.posseg as pseg
    _JIEBA_AVAILABLE = True
except ImportError:
    _JIEBA_AVAILABLE = False


# ═══════════════════════════════════════════════════════════════
# 知识库 — 水浒传人物/地点词典
# ═══════════════════════════════════════════════════════════════

# 加载 108 将姓名列表
def _load_hero_names() -> list[str]:
    """从 heroes_data.json 加载 108 将姓名"""
    data_path = Path(__file__).resolve().parent.parent / "data" / "peo108" / "heroes_data.json"
    try:
        data = json.loads(data_path.read_text(encoding="utf-8"))
        return [h["name"] for h in data.get("heroes", [])]
    except Exception:
        return []


# 水浒传常见地点关键词
_SHUIHU_PLACES = [
    "梁山泊", "梁山", "景阳冈", "阳谷县", "清河县", "东京", "开封府",
    "大名府", "江州", "沧州", "孟州", "青州", "登州", "华州",
    "祝家庄", "扈家庄", "李家庄", "曾头市", "快活林", "十字坡",
    "野猪林", "白虎堂", "石碣村", "黄泥岗", "二龙山", "清风山",
    "桃花山", "少华山", "芒砀山", "翠屏山", "五台山", "瓦罐寺",
    "大相国寺", "浔阳楼", "狮子楼", "鸳鸯楼", "聚义厅", "忠义堂",
    "蓼儿洼", "楚州", "润州", "杭州", "苏州", "歙州", "方岩山",
]

# 水浒传常见道具/物品
_SHUIHU_ITEMS = [
    "禅杖", "朴刀", "腰刀", "哨棒", "板斧", "朴刀", "长枪",
    "银两", "文书", "度牒", "戒刀", "金牌", "令箭", "板籍",
    "生辰纲", "御酒", "蒙汗药", "通犀带", "紫金冠", "锁子甲",
]

# 关系触发词 → 关系类型映射
_RELATION_PATTERNS = [
    (r'(.{1,4})[之为](兄|弟|姐|妹|父|子|母|女|妻|夫)', "{src}为{rel_type}"),
    (r'(.{1,4})的(妹夫|妻舅|姐夫|妹婿|姑表|舅舅|叔叔|伯伯)', "亲族"),
    (r'(.{1,4})称[他她]为(.{1,6})(?:[，,。.]|$)', "{tgt}称{src}为{rel_type}"),
    (r'与(.{1,4})[结拜结为]?为?(兄弟|师徒|师兄弟)', "{src}与{tgt}为{rel_type}"),
    (r'(.{1,4})[拜投]?(.?)师[于从自]?(.{1,4})', "师从"),
    (r'(.{1,4})[于在](.{1,6})(杀了|打死了|斩了|刺死)(.{1,4})', "杀死"),
    (r'(.{1,4})[于在](.{1,6})(救了|救下|解救)(.{1,4})', "解救"),
    (r'(.{1,4})[率领带引]领?(.{1,6})(攻打|进攻|讨伐|征讨)(.{1,4})', "攻打"),
    (r'(.{1,4})(.{1,2})?(娶|嫁)(了)?(.{1,4})', "婚配"),
]

# 剧情关系触发词（动词连接）
_PLOT_RELATIONS = [
    (["杀", "斩", "刺死", "砍死", "打死"], "对决"),
    (["救", "解救", "搭救", "救下"], "解救"),
    (["拜", "投奔", "投靠", "归顺", "归降"], "投奔"),
    (["结拜", "结义", "结为兄弟"], "结义"),
    (["攻打", "攻取", "攻占", "智取"], "攻打"),
    (["商议", "密谋", "计议", "定计"], "商议"),
    (["押送", "押解", "护送"], "押送"),
    (["赠送", "赠予", "赠给", "送予"], "赠送"),
    (["相遇", "撞见", "遇见", "偶遇"], "相遇"),
    (["捉", "擒", "擒获", "活捉", "拿下"], "擒获"),
]


def _build_entity_dict(hero_names: list[str]) -> dict[str, str]:
    """构建实体词典: 实体名 → entity_type"""
    ent_dict: dict[str, str] = {}

    # 人物（按姓名长度降序，确保优先匹配长名）
    for name in sorted(hero_names, key=len, reverse=True):
        ent_dict[name] = "人物"

    # 常见称呼
    common_titles = [
        "宋江", "武松", "林冲", "鲁智深", "李逵", "吴用", "卢俊义",
        "关胜", "花荣", "柴进", "杨志", "晁盖", "高俅", "蔡京",
        "西门庆", "潘金莲", "王婆", "武大郎", "张青", "孙二娘",
        "施恩", "蒋门神", "史文恭", "王伦", "方腊", "田虎",
    ]
    for name in common_titles:
        if name not in ent_dict:
            ent_dict[name] = "人物"

    # 常见生物/动物（水浒故事中常作为剧情对象）
    common_creatures = ["老虎", "大虫"]
    for name in common_creatures:
        if name not in ent_dict:
            ent_dict[name] = "道具"

    # 地点
    for place in sorted(_SHUIHU_PLACES, key=len, reverse=True):
        ent_dict[place] = "地点"

    # 道具
    for item in sorted(_SHUIHU_ITEMS, key=len, reverse=True):
        ent_dict[item] = "道具"

    return ent_dict


# ═══════════════════════════════════════════════════════════════
# 实体抽取
# ═══════════════════════════════════════════════════════════════

def _extract_entities_by_dict(text: str, entity_dict: dict[str, str]) -> list[dict]:
    """
    基于词典匹配抽取实体。
    返回实体提及列表: [{name, type, start, end}, ...]
    """
    mentions = []
    seen_spans: set[tuple[int, int]] = set()

    # 按实体名长度降序匹配，避免短名覆盖长名
    for entity_name, entity_type in sorted(entity_dict.items(), key=lambda x: len(x[0]), reverse=True):
        start = 0
        while True:
            idx = text.find(entity_name, start)
            if idx == -1:
                break
            span = (idx, idx + len(entity_name))
            # 避免重叠：检查是否与已有 span 冲突
            if not any(s < span[1] and span[0] < e for s, e in seen_spans):
                mentions.append({
                    "name": entity_name,
                    "type": entity_type,
                    "start": idx,
                    "end": idx + len(entity_name),
                })
                seen_spans.add(span)
            start = idx + 1

    # 按 start 排序
    mentions.sort(key=lambda m: m["start"])
    return mentions


def _extract_additional_entities(text: str, existing_mentions: list[dict]) -> list[dict]:
    """
    使用正则补充词典未覆盖的实体（如地名后缀、职位等）。
    """
    seen_spans = {(m["start"], m["end"]) for m in existing_mentions}
    additional = []

    # 地名后缀模式: XX山, XX庄, XX府, XX县, XX州, XX寨
    place_patterns = [
        (r'[一-鿿]{1,3}(山|岗|岭|峰|洞|泊|湖|河|江|海)', "地点"),
        (r'[一-鿿]{1,3}(庄|村|镇|县|州|府|城|寨)', "地点"),
        (r'[一-鿿]{1,3}(楼|寺|庙|堂|院|阁|亭)', "地点"),
    ]

    for pattern, etype in place_patterns:
        for m in re.finditer(pattern, text):
            span = (m.start(), m.end())
            if not any(s < span[1] and span[0] < e for s, e in seen_spans):
                additional.append({
                    "name": m.group(0),
                    "type": etype,
                    "start": m.start(),
                    "end": m.end(),
                })
                seen_spans.add(span)

    return sorted(additional, key=lambda m: m["start"])


# ═══════════════════════════════════════════════════════════════
# 关系抽取
# ═══════════════════════════════════════════════════════════════

def _extract_relations_rule_based(
    text: str,
    entity_mentions: list[dict],
    entity_dict: dict[str, str],
) -> list[dict]:
    """
    基于规则模板抽取实体间的关系。
    返回: [{source, target, relation, evidence}, ...]
    """
    relations = []
    mention_names = {m["name"] for m in entity_mentions}
    seen_rels: set[tuple[str, str, str]] = set()

    # 1) "...[target]之(兄|弟|姐|妹|父|子|主|师|徒)"
    # e.g. "宋江之弟宋清" means Song Qing is younger brother of Song Jiang
    for m in entity_mentions:
        if m["type"] != "人物":
            continue
        target_name = m["name"]
        after = text[m["end"]:]
        rel_match = re.match(r'^之(兄|弟|姐|妹|父|子|主|师|徒)', after)
        if not rel_match:
            continue

        rel_type = rel_match.group(1)
        # Look FORWARD (after "之X") for the nearest person entity as source
        search_start = m["end"] + len(rel_match.group(0))
        for src_m in sorted(entity_mentions, key=lambda x: x["start"]):
            if (
                src_m["type"] == "人物"
                and src_m["start"] >= search_start
                and src_m["name"] != target_name
            ):
                key = (src_m["name"], target_name, rel_type)
                if key not in seen_rels:
                    relations.append({
                        "source": src_m["name"],
                        "target": target_name,
                        "relation": rel_type,
                        "evidence": text[max(0, m["start"] - 5):src_m["end"] + 5],
                    })
                    seen_rels.add(key)
                break

    # 2) "与XXX为XX兄弟"
    for m in entity_mentions:
        if m["type"] != "人物":
            continue
        # 查找该实体前面最近的句子
        sent_start = max(0, m["start"] - 50)
        context = text[sent_start:m["end"] + 20]

        # 在该人物出现的上下文中查找 "与X为Y" 模式
        for rel_match in re.finditer(r'与([一-鿿]{2,4})[之为](兄弟|师徒|父子)', context):
            tgt = rel_match.group(1)
            rel_label = rel_match.group(2)
            if tgt in mention_names and tgt != m["name"]:
                key = (m["name"], tgt, rel_label)
                if key not in seen_rels:
                    relations.append({
                        "source": m["name"],
                        "target": tgt,
                        "relation": rel_label,
                        "evidence": rel_match.group(0),
                    })
                    seen_rels.add(key)

    # 3) 剧情动词关系：按子句分割（逗号、句号等），查找 "A动词B" 模式
    clauses = re.split(r'[。！？；\n，,]', text)
    for clause in clauses:
        if len(clause) < 5:
            continue
        # 该子句中的所有实体
        clause_entities = [m for m in entity_mentions if m["name"] in clause]

        for verbs, rel_name in _PLOT_RELATIONS:
            for verb in verbs:
                v_idx = clause.find(verb)
                if v_idx == -1:
                    continue

                # 动词在原文中的绝对位置
                v_global = text.find(clause) + v_idx
                # 找动词前后最近的实体（避免跨子句的远距离配对）
                before = [e for e in clause_entities if e["start"] < v_global]
                after = [e for e in clause_entities if e["start"] >= v_global + len(verb)]

                # 优先选择人物作为动作发起方，其次选最近的实体
                person_before = [e for e in before if e["type"] == "人物"]
                src_e = (person_before or before)[-1] if before else None
                tgt_e = min(after, key=lambda e: e["start"]) if after else None

                if src_e and tgt_e and src_e["name"] != tgt_e["name"]:
                    key = (src_e["name"], tgt_e["name"], rel_name)
                    if key not in seen_rels:
                        relations.append({
                            "source": src_e["name"],
                            "target": tgt_e["name"],
                            "relation": rel_name,
                            "evidence": clause.strip(),
                        })
                        seen_rels.add(key)

    return relations


# ═══════════════════════════════════════════════════════════════
# 主入口
# ═══════════════════════════════════════════════════════════════

def extract_entities_and_relations(
    text: str,
    method: str = "local",
    llm_config: dict | None = None,
) -> dict:
    """
    从水浒传故事文本中抽取实体和关系。

    Args:
        text: 输入文本
        method: "local" 使用本地规则抽取 / "llm" 使用大模型 API
        llm_config: LLM 配置（method="llm" 时需要）
            {api_url, api_key, model}

    Returns:
        {
            "nodes": [...],
            "edges": [...],
            "entity_mentions": {...}  # 实体在原文中的位置信息，供前端高亮
        }
    """
    if method == "llm" and llm_config:
        return _extract_by_llm(text, llm_config)
    return _extract_local(text)


def _extract_local(text: str) -> dict:
    """本地规则抽取"""
    # 确保 jieba 已加载（仅用于分词辅助）
    if _JIEBA_AVAILABLE:
        # 将实体词典加入 jieba
        hero_names = _load_hero_names()
        for name in hero_names:
            jieba.add_word(name)

    # 构建实体词典
    hero_names = _load_hero_names()
    entity_dict = _build_entity_dict(hero_names)

    # 1. 词典匹配抽取实体
    mentions = _extract_entities_by_dict(text, entity_dict)

    # 2. 正则补充实体
    additional = _extract_additional_entities(text, mentions)
    all_mentions = mentions + additional
    all_mentions.sort(key=lambda m: m["start"])

    # 3. 规则抽取关系
    relations = _extract_relations_rule_based(text, all_mentions, entity_dict)

    # 4. 去重构建 nodes
    seen_entities: dict[str, dict] = {}
    for m in all_mentions:
        key = m["name"]
        if key not in seen_entities:
            seen_entities[key] = {
                "id": f"entity_{hashlib.md5(key.encode()).hexdigest()[:8]}",
                "name": m["name"],
                "type": m["type"],
                "mentions": [],
            }
        seen_entities[key]["mentions"].append({
            "start": m["start"],
            "end": m["end"],
        })

    # 5. 构建 edges（去重）
    edge_ids: set[str] = set()
    edges = []
    for rel in relations:
        src_name = rel["source"]
        tgt_name = rel["target"]
        if src_name not in seen_entities or tgt_name not in seen_entities:
            continue

        src_id = seen_entities[src_name]["id"]
        tgt_id = seen_entities[tgt_name]["id"]
        edge_key = f"{src_id}_{tgt_id}_{rel['relation']}"
        if edge_key not in edge_ids:
            edges.append({
                "id": f"rel_{hashlib.md5(edge_key.encode()).hexdigest()[:8]}",
                "source": src_id,
                "target": tgt_id,
                "relation": rel["relation"],
                "evidence": rel.get("evidence", ""),
            })
            edge_ids.add(edge_key)

    return {
        "nodes": list(seen_entities.values()),
        "edges": edges,
        "entity_mentions": {
            name: info["mentions"]
            for name, info in seen_entities.items()
        },
    }


def _extract_by_llm(text: str, config: dict) -> dict:
    """
    通过大模型 API 抽取实体和关系（适配器模式）。
    默认实现为 OpenAI 兼容接口，可替换为 DeepSeek/百度文心等。

    期望 LLM 返回的 JSON 格式:
    {
      "entities": [{"name": "武松", "type": "人物"}, ...],
      "relations": [{"source": "武松", "target": "老虎", "relation": "打死"}, ...]
    }
    """
    import urllib.request

    api_url = config.get("api_url", "https://api.deepseek.com/v1/chat/completions")
    api_key = config.get("api_key", "")
    model = config.get("model", "deepseek-chat")

    system_prompt = """你是一个《水浒传》文本分析专家。请从以下文本中抽取实体和关系。

要求：
1. 抽取所有人物、地点、道具/物品实体
2. 抽取实体之间的剧情关系（如：兄弟、师徒、对决、解救、投奔、攻打、商议、结义等）
3. 只返回 JSON，不要任何其他文字

返回格式：
{
  "entities": [{"name": "实体名", "type": "人物|地点|道具"}, ...],
  "relations": [{"source": "源实体名", "target": "目标实体名", "relation": "关系描述"}, ...]
}"""

    payload = json.dumps({
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": text},
        ],
        "temperature": 0.1,
        "max_tokens": 4096,
    }).encode("utf-8")

    req = urllib.request.Request(api_url, data=payload, headers={
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}",
    })

    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            result = json.loads(resp.read().decode("utf-8"))
            content = result["choices"][0]["message"]["content"]

            # 尝试从回复中提取 JSON
            json_match = re.search(r'\{[\s\S]*\}', content)
            if json_match:
                llm_result = json.loads(json_match.group(0))
            else:
                llm_result = json.loads(content)

            entities = llm_result.get("entities", [])
            relations = llm_result.get("relations", [])

            # 转换为标准格式
            nodes = []
            entity_mentions = {}
            for ent in entities:
                name = ent["name"]
                eid = f"entity_{hashlib.md5(name.encode()).hexdigest()[:8]}"
                nodes.append({
                    "id": eid,
                    "name": name,
                    "type": ent.get("type", "人物"),
                    "mentions": [],
                })
                # 在原文中查找提及位置
                mentions = []
                start = 0
                while True:
                    idx = text.find(name, start)
                    if idx == -1:
                        break
                    mentions.append({"start": idx, "end": idx + len(name)})
                    start = idx + 1
                entity_mentions[name] = mentions

            edges = []
            for rel in relations:
                src_name = rel["source"]
                tgt_name = rel["target"]
                src_node = next((n for n in nodes if n["name"] == src_name), None)
                tgt_node = next((n for n in nodes if n["name"] == tgt_name), None)
                if src_node and tgt_node:
                    edges.append({
                        "id": f"rel_{hashlib.md5(f'{src_node['id']}_{tgt_node['id']}_{rel['relation']}'.encode()).hexdigest()[:8]}",
                        "source": src_node["id"],
                        "target": tgt_node["id"],
                        "relation": rel["relation"],
                        "evidence": "",
                    })

            return {
                "nodes": nodes,
                "edges": edges,
                "entity_mentions": entity_mentions,
            }

    except Exception as e:
        # LLM 调用失败时回退到本地抽取
        print(f"[NLP] LLM 抽取失败，回退到本地规则: {e}")
        return _extract_local(text)
