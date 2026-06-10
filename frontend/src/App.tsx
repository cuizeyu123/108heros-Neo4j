import { useState, useCallback } from 'react';
import { Compass, Users, Swords } from 'lucide-react';
import KnowledgeGraph from './components/KnowledgeGraph';
import HeroDetail from './components/HeroDetail';
import SearchBar from './components/SearchBar';
import { useGraphData } from './hooks/useGraphData';
import { useHeroDetail } from './hooks/useHeroDetail';
import type { HeroNode } from './types';

interface SearchResult {
  姓名: string;
  绰号: string;
  星宿: string;
  座次: number;
  local_image: string;
}

export default function App() {
  const { data, loading: graphLoading } = useGraphData();
  const { hero, loading: heroLoading, fetchHero, clearHero } = useHeroDetail();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showDetailMobile, setShowDetailMobile] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  const handleNodeClick = useCallback(
    (node: HeroNode) => {
      setSelectedNodeId(node.id);
      fetchHero(node.data.name);
      setShowDetailMobile(true);
    },
    [fetchHero]
  );

  const handleSearch = useCallback(async (keyword: string) => {
    if (!keyword) {
      setSearchResults([]);
      return;
    }
    try {
      setSearching(true);
      const res = await fetch(`/api/search?q=${encodeURIComponent(keyword)}`);
      if (res.ok) {
        const data: SearchResult[] = await res.json();
        setSearchResults(data);
      }
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleSelectHero = useCallback(
    (nodeId: string | null) => {
      setSelectedNodeId(nodeId);
      if (nodeId) {
        const heroNode = data?.nodes.find((n) => n.id === nodeId && n.type === 'hero') as
          | HeroNode
          | undefined;
        if (heroNode) {
          fetchHero(heroNode.data.name);
          setShowDetailMobile(true);
        }
      } else {
        clearHero();
      }
    },
    [data, fetchHero, clearHero]
  );

  const handleCloseDetail = useCallback(() => {
    clearHero();
    setSelectedNodeId(null);
    setShowDetailMobile(false);
  }, [clearHero]);

  const handleRelationClick = useCallback(
    (name: string) => {
      setSelectedNodeId(null);
      fetchHero(name).then(() => {
        const heroNode = data?.nodes.find(
          (n) => n.type === 'hero' && n.data.name === name
        ) as HeroNode | undefined;
        if (heroNode) {
          setSelectedNodeId(heroNode.id);
        }
      });
    },
    [data, fetchHero]
  );

  return (
    <div className="h-full flex flex-col relative">
      {/* ─── 顶栏：卷轴装裱 ─── */}
      <header className="relative flex items-center justify-between px-5 py-3 bg-[var(--color-bg-secondary)] scroll-border-top flex-shrink-0 z-20">
        {/* 左侧装饰线 */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[var(--color-accent-gold)]/30 to-transparent" />

        {/* 标题区域 */}
        <div className="flex items-center gap-4">
          {/* 朱砂印章 */}
          <div className="hidden sm:flex items-center justify-center w-10 h-10 border-2 border-[var(--color-accent-vermillion)] rotate-[-3deg] flex-shrink-0"
            style={{ boxShadow: 'inset 0 0 0 1px rgba(196,61,61,0.3), 0 0 8px rgba(196,61,61,0.15)' }}
          >
            <span className="font-['Noto_Serif_TC'] text-[10px] font-black text-[var(--color-accent-vermillion)] leading-tight text-center">
              水浒
            </span>
          </div>

          <div className="flex flex-col">
            <h1 className="scroll-title text-lg sm:text-xl font-bold whitespace-nowrap tracking-[0.15em]">
              水浒传 · 一百单八将
            </h1>
            <span className="text-[10px] text-[var(--color-text-muted)] tracking-[0.3em] pl-0.5">
              梁山泊势力全图
            </span>
          </div>
        </div>

        {/* 中间搜索 */}
        <div className="flex items-center gap-3 flex-1 max-w-md mx-6">
          <SearchBar
            onSearch={handleSearch}
            onSelectHero={handleSelectHero}
            searchResults={searchResults}
            searching={searching}
          />
        </div>

        {/* 右侧图例 — 桌面端 */}
        <div className="hidden lg:flex items-center gap-5 text-xs">
          <LegendItem color="var(--color-accent-gold)" label="天罡三十六" />
          <LegendItem color="var(--color-accent-jade)" label="地煞七十二" />
          <LegendItem color="var(--color-accent-amber)" label="社会关系" />
          <LegendItem color="var(--color-accent-vermillion)" label="当前选中" />

          {/* 分隔 */}
          <div className="w-[1px] h-5 bg-[var(--color-border)]" />

          {/* 统计 */}
          <div className="flex items-center gap-1.5 text-[var(--color-text-muted)]">
            <Users size={13} />
            <span className="font-['Noto_Serif_TC']">108将</span>
          </div>
        </div>

        {/* 移动端详情切换 */}
        <button
          className="lg:hidden p-2 rounded-lg text-[var(--color-text-secondary)] hover:text-[var(--color-accent-gold)] hover:bg-[var(--color-bg-card-hover)] transition-colors ml-2 border border-[var(--color-border)]"
          onClick={() => setShowDetailMobile(!showDetailMobile)}
          aria-label="切换详情面板"
        >
          {showDetailMobile ? <Swords size={16} /> : <Compass size={16} />}
        </button>
      </header>

      {/* ─── 主内容区 ─── */}
      <div className="flex-1 flex min-h-0 relative">
        {/* 图层面板 */}
        <div
          className={`flex-1 min-w-0 ${
            showDetailMobile ? 'hidden lg:block' : 'block'
          }`}
        >
          <KnowledgeGraph
            data={data}
            loading={graphLoading}
            onNodeClick={handleNodeClick}
            highlightNodeId={selectedNodeId}
          />
        </div>

        {/* 详情面板 */}
        <div
          className={`${
            hero || !showDetailMobile ? 'flex' : 'hidden'
          } lg:flex w-full lg:w-[400px] flex-shrink-0 ${
            showDetailMobile ? 'fixed inset-0 z-40 lg:relative' : 'hidden lg:flex'
          }`}
        >
          {showDetailMobile && (
            <div
              className="lg:hidden absolute inset-0 bg-black/60 z-0"
              onClick={handleCloseDetail}
            />
          )}
          <div className="relative z-10 w-full lg:w-[400px]">
            <HeroDetail
              hero={hero}
              loading={heroLoading}
              onClose={handleCloseDetail}
              onHeroClick={handleRelationClick}
            />
          </div>
        </div>
      </div>

      {/* ─── 底栏提示 ─── */}
      <footer className="hidden lg:flex items-center justify-center gap-6 py-1.5 bg-[var(--color-bg-secondary)] border-t border-[var(--color-border)] flex-shrink-0">
        <span className="text-[10px] text-[var(--color-text-muted)] tracking-wider">
          拖拽移动 · 滚轮缩放 · 点击英雄查看详情 · 拖拽节点调整布局
        </span>
      </footer>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-[var(--color-text-muted)]">
      <span
        className="w-2.5 h-2.5 rounded-sm"
        style={{
          backgroundColor: color,
          boxShadow: `0 0 6px ${color}40`,
          border: `1px solid ${color}80`,
        }}
      />
      <span className="font-['Noto_Serif_TC'] text-[11px]">{label}</span>
    </span>
  );
}
