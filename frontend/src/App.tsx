import { useState, useCallback } from 'react';
import { Menu, X as XIcon } from 'lucide-react';
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
        // Extract name from hero data for detail panel
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
        // Find the node ID from data
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
    <div className="h-full flex flex-col">
      {/* Top Navigation Bar */}
      <header className="flex items-center justify-between px-4 py-2.5 bg-[var(--color-bg-secondary)] border-b border-[var(--color-border)] flex-shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="font-['Noto_Serif_TC'] text-lg font-bold text-[var(--color-accent-gold)] whitespace-nowrap">
            水浒传 · 一百单八将
          </h1>
          <span className="hidden sm:inline text-xs text-[var(--color-text-muted)]">
            知识图谱
          </span>
        </div>

        <div className="flex items-center gap-3 flex-1 max-w-md ml-6">
          <SearchBar
            onSearch={handleSearch}
            onSelectHero={handleSelectHero}
            searchResults={searchResults}
            searching={searching}
          />
        </div>

        {/* Legend - desktop */}
        <div className="hidden lg:flex items-center gap-4 text-xs text-[var(--color-text-muted)] ml-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full border-2 border-[var(--color-accent-gold)]" />
            天罡星
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full border-2 border-[#A8B8C8]" />
            地煞星
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-0.5 bg-[var(--color-accent-amber)]" style={{ width: 12 }} />
            社会关系
          </span>
        </div>

        {/* Mobile detail toggle */}
        <button
          className="lg:hidden p-1.5 rounded-lg text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors ml-2"
          onClick={() => setShowDetailMobile(!showDetailMobile)}
          aria-label="切换详情面板"
        >
          {showDetailMobile ? <XIcon size={18} /> : <Menu size={18} />}
        </button>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        {/* Graph Canvas */}
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

        {/* Detail Panel - Desktop always visible when hero selected */}
        <div
          className={`${
            hero || !showDetailMobile ? 'flex' : 'hidden'
          } lg:flex w-full lg:w-[380px] flex-shrink-0 ${
            showDetailMobile ? 'fixed inset-0 z-40 lg:relative' : 'hidden lg:flex'
          }`}
        >
          {/* Mobile overlay */}
          {showDetailMobile && (
            <div
              className="lg:hidden absolute inset-0 bg-black/50 z-0"
              onClick={handleCloseDetail}
            />
          )}
          <div className="relative z-10 w-full lg:w-[380px]">
            <HeroDetail
              hero={hero}
              loading={heroLoading}
              onClose={handleCloseDetail}
              onHeroClick={handleRelationClick}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
