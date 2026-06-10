# 水浒传 · 一百单八将知识图谱

一个基于知识图谱技术的《水浒传》108将可视化系统，采用宋代卷轴风格UI设计，支持交互式关系探索。

## 项目结构

```
.
├── backend/              # Flask API 后端
│   ├── app.py            # 主服务：REST API、图谱数据、图片服务
│   └── requirements.txt  # Python 依赖
├── frontend/             # React 前端
│   ├── src/
│   │   ├── components/   # UI 组件
│   │   ├── hooks/        # 数据获取 Hooks
│   │   ├── types/        # TypeScript 类型定义
│   │   └── App.tsx       # 主应用入口
│   └── package.json      # Node 依赖
├── data/peo108/          # 数据源
│   ├── heroes_data.json      # 基础英雄数据
│   ├── wiki_heroes_full.json # 详细百科数据
│   └── images/               # 108将画像 (108张)
└── build_knowledge_graph.py  # Neo4j 图谱构建脚本
```

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 19 + Vite + TypeScript + Tailwind CSS v4 + AntV G6 |
| 后端 | Flask + Flask-CORS |
| 图谱存储 | Neo4j |
| 可视化 | AntV G6 (力导向图) |

## 功能特性

- **交互式力导向图谱**：108将节点拖拽、画布缩放、关系高亮
- **英雄画像**：圆形头像节点，天罡(金)/地煞(绿)色区分
- **智能搜索**：支持按姓名、绰号、星宿实时搜索
- **详情面板**：点击节点查看完整人物信息及社会关系网
- **关系类型**：兄弟、师徒、主仆、亲族、同职等
- **层级归属**：天罡三十六 / 地煞七十二 / 梁山职位
- **宋代卷轴UI**：仿古籍配色、印章装饰、竖排文字元素
- **响应式布局**：桌面端双栏 + 移动端全屏详情

## 快速开始

### 1. 启动后端

```bash
cd backend
pip install -r requirements.txt
python app.py
```
后端运行于 `http://localhost:5000`

### 2. 启动前端

```bash
cd frontend
npm install
npm run dev
```
前端运行于 `http://localhost:5173`

### 3. (可选) 构建 Neo4j 知识图谱

```bash
# 确保 Neo4j 本地服务已启动
python build_knowledge_graph.py
```

## API 接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/heroes` | GET | 获取全部108将列表 |
| `/api/heroes/<name>` | GET | 获取单个人物详情（含社会关系） |
| `/api/graph` | GET | 获取完整图谱数据 (nodes + edges) |
| `/api/search?q=...` | GET | 按关键词搜索人物 |
| `/api/images/<filename>` | GET | 获取人物画像 |
| `/api/health` | GET | 服务健康检查 |

## 数据模型

### 节点类型
- `Hero` — 人物（108将）
- `Tier` — 层级（三十六天罡 / 七十二地煞）
- `Position` — 职位（梁山职位、招安后官职）
- `Star` — 星宿

### 关系类型
- `BELONGS_TO_TIER` — 属于天罡/地煞
- `HOLDS_POSITION` — 担任职位
- `SOCIAL_RELATION` — 社会关系（兄、弟、师、徒、主等）

## 数据来源

人物基础数据与备考字段整理自《水浒传》原著，社会关系通过文本正则从备考字段自动提取。
