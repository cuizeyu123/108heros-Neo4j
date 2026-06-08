"""
水浒传108将知识图谱构建脚本
数据来源: data/peo108/heroes_data.json + data/peo108/wiki_heroes_full.json
Neo4j: neo4j://localhost:7687, database=lesson2
"""

import json
from neo4j import GraphDatabase

URI = "neo4j://localhost:7687"
USERNAME = "neo4j"
PASSWORD = "czy123456"
DATABASE = "lesson2"


def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def build_graph(driver):
    heroes_basic = load_json("data/peo108/heroes_data.json")
    heroes_wiki = load_json("data/peo108/wiki_heroes_full.json")

    # 构建 name -> basic_info 的索引, 用于合并两个数据源
    basic_by_name = {}
    for h in heroes_basic["heroes"]:
        basic_by_name[h["name"]] = h

    # 合并数据: wiki为主, 补充image_url
    heroes = []
    for w in heroes_wiki:
        name = w["姓名"]
        basic = basic_by_name.get(name, {})
        hero = {
            **w,
            "image_url": basic.get("image_url", ""),
        }
        heroes.append(hero)

    with driver.session(database=DATABASE) as session:
        # 清空旧数据
        session.run("MATCH (n) DETACH DELETE n")

        # 创建索引
        session.run("CREATE INDEX hero_name IF NOT EXISTS FOR (h:Hero) ON (h.name)")
        session.run("CREATE INDEX star_name IF NOT EXISTS FOR (s:Star) ON (s.name)")
        session.run("CREATE INDEX position_name IF NOT EXISTS FOR (p:Position) ON (p.name)")

        # 批量创建节点和关系
        for h in heroes:
            # 合并 Hero 节点 (包含 image_url)
            session.run(
                """
                MERGE (hero:Hero {name: $name})
                SET hero.number = $number,
                    hero.star = $star,
                    hero.nickname = $nickname,
                    hero.origin = $origin,
                    hero.first_appearance = $first_appearance,
                    hero.join_chapter = $join_chapter,
                    hero.longshan_position = $liangshan_position,
                    hero.post_amnesty_position = $post_amnesty_position,
                    hero.fate = $fate,
                    hero.notes = $notes,
                    hero.image_url = $image_url
                """,
                name=h["姓名"],
                number=h["座次"],
                star=h["星宿"],
                nickname=h["绰号"],
                origin=h.get("出身", ""),
                first_appearance=h.get("初登场", ""),
                join_chapter=h.get("入山回数", ""),
                liangshan_position=h.get("梁山职位", ""),
                post_amnesty_position=h.get("招安后官职", ""),
                fate=h.get("后续发展", ""),
                notes=h.get("备考", ""),
                image_url=h.get("image_url", ""),
            )

            # 合并 Star 节点 + BELONGS_TO 关系
            session.run(
                """
                MERGE (s:Star {name: $star_name})
                WITH s
                MATCH (hero:Hero {name: $hero_name})
                MERGE (hero)-[:BELONGS_TO]->(s)
                """,
                star_name=h["星宿"],
                hero_name=h["姓名"],
            )

            # 梁山职位 -> Position 节点 + HOLDS_POSITION 关系
            pos = h.get("梁山职位", "").strip()
            if pos and pos != "－":
                session.run(
                    """
                    MERGE (p:Position {name: $pos_name, type: '梁山职位'})
                    WITH p
                    MATCH (hero:Hero {name: $hero_name})
                    MERGE (hero)-[:HOLDS_POSITION]->(p)
                    """,
                    pos_name=pos,
                    hero_name=h["姓名"],
                )

            # 招安后官职
            post_pos = h.get("招安后官职", "").strip()
            if post_pos and post_pos != "－":
                session.run(
                    """
                    MERGE (p:Position {name: $pos_name, type: '招安后官职'})
                    WITH p
                    MATCH (hero:Hero {name: $hero_name})
                    MERGE (hero)-[:APPOINTED_AS]->(p)
                    """,
                    pos_name=post_pos,
                    hero_name=h["姓名"],
                )

            # 参考文献(备考)中的人物关系: 提取 "XXX之兄/弟/主人" 等
            notes = h.get("备考", "")
            if notes:
                # 关联同星宿的英雄
                pass

        # 创建英雄之间的社会关系 (基于备考字段)
        create_social_relations(session, heroes)

        # 创建星宿之间的层级关系: 天罡36 / 地煞72
        session.run(
            """
            MATCH (hero:Hero)
            WITH hero
            WHERE hero.number <= 36
            MERGE (tier:Tier {name: '三十六天罡'})
            WITH tier, hero
            MATCH (hero)
            WHERE hero.number <= 36
            MERGE (hero)-[:BELONGS_TO_TIER]->(tier)
            """
        )
        session.run(
            """
            MATCH (hero:Hero)
            WITH hero
            WHERE hero.number > 36
            MERGE (tier:Tier {name: '七十二地煞'})
            WITH tier, hero
            MATCH (hero)
            WHERE hero.number > 36
            MERGE (hero)-[:BELONGS_TO_TIER]->(tier)
            """
        )

    print(f"知识图谱构建完成! 共导入 {len(heroes)} 位好汉。")
    print(f"包含节点: Hero({len(heroes)}个), Star(星宿), Position(职位), Tier(天罡/地煞)")
    print(f"包含关系: BELONGS_TO, HOLDS_POSITION, APPOINTED_AS, BELONGS_TO_TIER, SOCIAL_RELATION")


def create_social_relations(session, heroes):
    """从备考字段中提取社会关系"""
    import re

    relations = []

    for h in heroes:
        notes = h.get("备考", "")
        name = h["姓名"]
        if not notes:
            continue

        # "XXX之兄" -> XXX是兄, 当前英雄是弟
        for m in re.finditer(r"([一-龥]{2,4})之(兄|弟|姐|妹|父|子|主|师|徒)", notes):
            relative = m.group(1)
            rel_type = m.group(2)
            if relative != name:
                relations.append((name, relative, rel_type))

        # "XXX称他为主人" / "XXX的XX"
        for m in re.finditer(r"([一-龥]{2,4})称[他她]为(\w+)", notes):
            person = m.group(1)
            role = m.group(2)
            if person != name:
                relations.append((person, name, role))

    for r in relations:
        session.run(
            """
            MATCH (a:Hero {name: $name1})
            MATCH (b:Hero {name: $name2})
            MERGE (a)-[:SOCIAL_RELATION {type: $rel_type}]->(b)
            """,
            name1=r[0],
            name2=r[1],
            rel_type=r[2],
        )

    print(f"提取到 {len(relations)} 条社会关系")


def run_queries(driver):
    """运行示例查询验证图谱"""
    with driver.session(database=DATABASE) as session:
        print("\n=== 查询示例 ===")

        # 1. 统计
        result = session.run("MATCH (h:Hero) RETURN count(h) AS total")
        print(f"好汉总数: {result.single()['total']}")

        # 2. 天罡星前5位
        result = session.run(
            """
            MATCH (h:Hero)
            WHERE h.number <= 36
            RETURN h.name, h.nickname, h.number
            ORDER BY h.number LIMIT 5
            """
        )
        print("\n天罡星前5位:")
        for r in result:
            print(f"  {r['h.number']}. {r['h.name']} - {r['h.nickname']}")

        # 3. 有图片的好汉数
        result = session.run(
            """
            MATCH (h:Hero)
            WHERE h.image_url <> ''
            RETURN count(h) AS with_image
            """
        )
        print(f"\n有画像URL的好汉: {result.single()['with_image']}")

        # 4. 职位统计
        result = session.run(
            """
            MATCH (p:Position {type: '梁山职位'})
            RETURN p.name, count{(p)<-[:HOLDS_POSITION]-()} AS hero_count
            ORDER BY hero_count DESC LIMIT 10
            """
        )
        print("\n梁山职位分布 (前10):")
        for r in result:
            print(f"  {r['p.name']}: {r['hero_count']}人")


if __name__ == "__main__":
    driver = GraphDatabase.driver(URI, auth=(USERNAME, PASSWORD))
    try:
        driver.verify_connectivity()
        print("Neo4j 连接成功!")
        build_graph(driver)
        run_queries(driver)
    finally:
        driver.close()
