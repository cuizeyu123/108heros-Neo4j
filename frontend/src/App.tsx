import { useState } from 'react';
import { Users, Sparkles, Scroll } from 'lucide-react';
import HeroesGraphPage from './components/HeroesGraphPage';
import StoryExtractor from './components/StoryExtractor';
import type { NavTab } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('heroes-graph');

  return (
    <div className="h-full flex">
      {/* ═══════════════════════════════════════════════════
          左侧导航栏 — 宋代卷轴装裱风格
          ═══════════════════════════════════════════════════ */}
      <aside className="w-48 lg:w-56 flex-shrink-0 h-full flex flex-col bg-[var(--color-bg-secondary)] border-r border-[var(--color-border)] relative">
        {/* 右侧装饰线 */}
        <div className="absolute top-0 bottom-0 right-0 w-[1px] bg-gradient-to-b from-transparent via-[var(--color-accent-gold)]/20 to-transparent" />

        {/* Logo 区域 */}
        <div className="relative px-4 pt-5 pb-3">
          {/* 顶部装饰线 */}
          <div className="absolute top-0 left-3 right-3 h-[1px] bg-gradient-to-r from-transparent via-[var(--color-accent-gold)]/40 to-transparent" />

          {/* 朱砂印章 */}
          <div className="flex justify-center mb-3">
            <div
              className="flex items-center justify-center w-14 h-14 border-2 border-[var(--color-accent-vermillion)] rotate-[-3deg]"
              style={{
                boxShadow: 'inset 0 0 0 1px rgba(196,61,61,0.3), 0 0 12px rgba(196,61,61,0.15)',
              }}
            >
              <span className="font-['Noto_Serif_TC'] text-xs font-black text-[var(--color-accent-vermillion)] leading-tight text-center">
                水浒
              </span>
            </div>
          </div>

          {/* 标题 */}
          <h1 className="text-center scroll-title text-sm lg:text-base font-bold tracking-[0.2em] whitespace-nowrap">
            一百单八将
          </h1>
          <p className="text-center text-[10px] text-[var(--color-text-muted)] tracking-[0.3em] mt-1">
            知识图谱
          </p>

          {/* 底部分隔 */}
          <div className="mt-3 mx-auto w-12 h-[1px] bg-gradient-to-r from-transparent via-[var(--color-accent-gold)]/40 to-transparent" />
        </div>

        {/* ─── 导航标签 ─── */}
        <nav className="flex-1 px-3 py-2 space-y-1">
          <NavButton
            active={activeTab === 'heroes-graph'}
            onClick={() => setActiveTab('heroes-graph')}
            icon={<Users size={15} />}
            label="一百单八将"
            subtitle="全局人物图谱"
          />
          <NavButton
            active={activeTab === 'story-extract'}
            onClick={() => setActiveTab('story-extract')}
            icon={<Sparkles size={15} />}
            label="文本故事抽取"
            subtitle="动态片段分析"
          />
        </nav>

        {/* 底部装饰 */}
        <div className="px-3 py-4">
          <div className="mx-auto w-10 h-[1px] bg-gradient-to-r from-transparent via-[var(--color-accent-gold)]/30 to-transparent mb-2" />

          <div className="flex items-center justify-center gap-1.5 text-[9px] text-[var(--color-text-muted)] tracking-wider">
            <Scroll size={10} />
            <span className="font-['Noto_Serif_TC']">梁山泊</span>
          </div>
        </div>
      </aside>

      {/* ═══════════════════════════════════════════════════
          主内容区
          ═══════════════════════════════════════════════════ */}
      <main className="flex-1 min-w-0 h-full">
        {activeTab === 'heroes-graph' && <HeroesGraphPage />}
        {activeTab === 'story-extract' && <StoryExtractor />}
      </main>
    </div>
  );
}

/** 导航按钮 — 宋代卷轴风格 */
function NavButton({
  active,
  onClick,
  icon,
  label,
  subtitle,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  subtitle: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-sm text-left transition-all duration-200 group ${
        active
          ? 'bg-[var(--color-bg-parchment)] border border-[var(--color-accent-gold)]/40'
          : 'border border-transparent hover:bg-[var(--color-bg-card-hover)]'
      }`}
      style={
        active
          ? { boxShadow: '0 0 16px rgba(201, 169, 110, 0.1), inset 0 1px 0 rgba(201, 169, 110, 0.08)' }
          : undefined
      }
    >
      <span
        className={`flex-shrink-0 mt-0.5 transition-colors ${
          active ? 'text-[var(--color-accent-gold)]' : 'text-[var(--color-text-muted)] group-hover:text-[var(--color-accent-gold)]'
        }`}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <div
          className={`text-xs font-semibold tracking-wider transition-colors font-['Noto_Serif_TC'] ${
            active ? 'text-[var(--color-accent-gold)]' : 'text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-primary)]'
          }`}
        >
          {label}
        </div>
        <div className="text-[9px] text-[var(--color-text-muted)] mt-0.5 tracking-wider">
          {subtitle}
        </div>
      </div>

      {/* 激活指示器 */}
      {active && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-8 bg-[var(--color-accent-gold)] rounded-r" />
      )}
    </button>
  );
}
