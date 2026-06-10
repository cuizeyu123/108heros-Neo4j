/**
 * 动态故事片段实体与关系抽取页面
 *
 * 功能交互：
 * 1. 粘贴《水浒传》故事片段 → 点击"智能分析"
 * 2. 后端 NLP 抽取实体 + 关系后，两栏展示：
 *    - 左侧：原文（实体高亮着色）
 *    - 右侧：动态知识图谱
 * 3. 点击实体/图谱节点可联动高亮
 */
import { useState, useCallback, useMemo } from 'react';
import { Sparkles, FileText, GitBranch, AlertCircle, MapPin, User, Package } from 'lucide-react';
import StoryGraph from './StoryGraph';
import { useStoryExtract } from '../hooks/useStoryExtract';
import type { StoryNode, ExtractResponse, HighlightSegment } from '../types';
import { getEntityColor, GRAPH_COLORS } from '../graphConfig';

/** 水浒示范文本 */
const DEMO_TEXT = `武松提了哨棒，大着步，自过景阳冈来。约行了四五里路，来到冈子下，见一大树，刮去了皮，一片白，上写两行字。武松也颇识几字，抬头看时，上面写道："近因景阳冈大虫伤人，但有过往客商，可于巳、午、未三个时辰，结伙成队过冈。勿自误。"武松读了印信榜文，方知端的有虎。欲待转身再回酒店里来，寻思道："我回去时，须吃他耻笑，不是好汉，难以转去。"存想了一回，说道："怕甚么鸟！且只顾上去看怎地！"武松正走，看看酒涌上来，便把毡笠儿背在脊梁上，将哨棒绾在肋下，一步步上那冈子来。回头看这日色时，渐渐地坠下去了。此时正是十月间天气，日短夜长，容易得晚。武松自言自说道："那得甚么大虫？人自怕了，不敢上山。"武松走了一程，酒力发作，焦热起来。一只手提着哨棒，一只手把胸膛前袒开，踉踉跄跄，直奔过乱树林来。`;

/** 将实体提及信息转为高亮文本段 */
function buildHighlightSegments(
  text: string,
  result: ExtractResponse,
): HighlightSegment[] {
  if (!result || !result.entity_mentions) {
    return [{ type: 'text', content: text }];
  }

  // 收集所有提及的 (start, end, name, type)
  const allMentions: Array<{ start: number; end: number; name: string; type: string }> = [];
  for (const [name, mentions] of Object.entries(result.entity_mentions)) {
    const entityNode = result.nodes.find((n) => n.name === name);
    const entityType = entityNode?.type || '人物';
    for (const m of mentions) {
      allMentions.push({ start: m.start, end: m.end, name, type: entityType });
    }
  }

  // 按 start 排序，start 相同时按 end 降序（长匹配优先）
  allMentions.sort((a, b) => a.start - b.start || b.end - a.end);

  // 构建不重叠的 segments
  const segments: HighlightSegment[] = [];
  let cursor = 0;

  for (const m of allMentions) {
    // 跳过已被覆盖的（重叠检测）
    if (m.start < cursor) continue;

    // 添加前面的普通文本
    if (m.start > cursor) {
      segments.push({ type: 'text', content: text.slice(cursor, m.start) });
    }

    // 添加实体高亮段
    segments.push({
      type: 'entity',
      content: text.slice(m.start, m.end),
      entityType: m.type as StoryNode['type'],
      entityName: m.name,
    });

    cursor = m.end;
  }

  // 尾部剩余文本
  if (cursor < text.length) {
    segments.push({ type: 'text', content: text.slice(cursor) });
  }

  return segments;
}

export default function StoryExtractor() {
  const [text, setText] = useState('');
  const [highlightEntityId, setHighlightEntityId] = useState<string | null>(null);
  const { result, loading, error, extract, clearResult } = useStoryExtract();

  const handleAnalyze = useCallback(() => {
    if (!text.trim()) return;
    clearResult();
    extract(text.trim(), 'local');
  }, [text, extract, clearResult]);

  const handleClear = useCallback(() => {
    setText('');
    clearResult();
    setHighlightEntityId(null);
  }, [clearResult]);

  const handleUseDemo = useCallback(() => {
    setText(DEMO_TEXT);
    clearResult();
    setHighlightEntityId(null);
  }, [clearResult]);

  const handleEntityClick = useCallback((entityName: string) => {
    if (!result) return;
    const node = result.nodes.find((n) => n.name === entityName);
    setHighlightEntityId(node ? node.id : null);
  }, [result]);

  const handleGraphNodeClick = useCallback((node: StoryNode) => {
    setHighlightEntityId(node.id);
  }, []);

  // 构建高亮文本段
  const highlightSegments = useMemo(
    () => (result ? buildHighlightSegments(text, result) : []),
    [text, result],
  );

  // 实体类型统计
  const entityStats = useMemo(() => {
    if (!result) return {};
    const stats: Record<string, number> = {};
    for (const n of result.nodes) {
      stats[n.type] = (stats[n.type] || 0) + 1;
    }
    return stats;
  }, [result]);

  const hasResult = result && !loading;

  return (
    <div className="h-full flex flex-col bg-[var(--color-bg-primary)]">
      {/* ─── 顶部控制栏 ─── */}
      <div className="relative flex-shrink-0 px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[var(--color-accent-gold)]/30 to-transparent" />

        <div className="flex items-center gap-3 flex-wrap">
          {/* 标题 */}
          <div className="flex items-center gap-2">
            <Sparkles size={15} className="text-[var(--color-accent-gold)]" />
            <span className="font-['Noto_Serif_TC'] text-sm font-semibold text-[var(--color-text-primary)] tracking-wider">
              故事抽取
            </span>
          </div>

          <div className="flex-1" />

          {/* 操作按钮 */}
          <button
            onClick={handleUseDemo}
            disabled={loading}
            className="px-3 py-1 text-xs rounded border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-accent-gold)] hover:border-[var(--color-accent-gold)]/50 transition-colors font-['Noto_Serif_TC'] disabled:opacity-40"
          >
            填入示例
          </button>

          {text && (
            <button
              onClick={handleClear}
              disabled={loading}
              className="px-3 py-1 text-xs rounded border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-accent-vermillion)] transition-colors font-['Noto_Serif_TC'] disabled:opacity-40"
            >
              清空
            </button>
          )}
        </div>
      </div>

      {/* ─── 输入区（分析前） ─── */}
      {!hasResult && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 min-h-0">
          <div className="w-full max-w-3xl flex flex-col gap-4">
            {/* 装饰标题 */}
            <div className="text-center mb-2">
              <h2 className="font-['Noto_Serif_TC'] text-xl font-bold text-[var(--color-accent-gold)] tracking-[0.15em]">
                动态文本故事抽取
              </h2>
              <p className="text-xs text-[var(--color-text-muted)] mt-1 tracking-wider">
                粘贴《水浒传》故事片段，智能识别人物、地点与剧情关系
              </p>
            </div>

            {/* 输入框 */}
            <div className="relative">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={"在此粘贴《水浒传》故事片段，例如\n\"武松打虎\"、\"智取生辰纲\"、\"鲁提辖拳打镇关西\"等经典桥段..."}
                rows={12}
                className="w-full bg-[var(--color-bg-parchment)] border border-[var(--color-border)] rounded-sm p-4 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] resize-none focus:outline-none focus:border-[var(--color-accent-gold)]/60 transition-colors font-['Noto_Serif_TC'] leading-relaxed"
                style={{ lineHeight: '1.8' }}
                disabled={loading}
              />
              {/* 字数统计 */}
              <div className="absolute bottom-3 right-3 text-[10px] text-[var(--color-text-muted)]">
                {text.length} 字
              </div>
            </div>

            {/* 分析按钮 */}
            <button
              onClick={handleAnalyze}
              disabled={loading || !text.trim()}
              className="relative self-center px-8 py-2.5 rounded-sm font-['Noto_Serif_TC'] text-sm font-bold tracking-[0.2em] transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed"
              style={{
                background: text.trim()
                  ? 'linear-gradient(135deg, var(--color-accent-gold), var(--color-accent-amber))'
                  : 'var(--color-bg-card)',
                color: text.trim() ? 'var(--color-bg-primary)' : 'var(--color-text-muted)',
                border: text.trim()
                  ? '1px solid var(--color-accent-gold)'
                  : '1px solid var(--color-border)',
                boxShadow: text.trim()
                  ? '0 4px 24px rgba(201, 169, 110, 0.25)'
                  : 'none',
              }}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-[var(--color-bg-primary)] border-t-transparent rounded-full animate-spin" />
                  正在分析...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Sparkles size={15} />
                  智能分析
                </span>
              )}
            </button>

            {/* 错误提示 */}
            {error && (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-sm bg-red-900/20 border border-red-800/40 text-red-300 text-xs">
                <AlertCircle size={14} />
                {error}
              </div>
            )}
          </div>

          {/* 模型说明 */}
          <div className="mt-8 max-w-lg text-center">
            <p className="text-[10px] text-[var(--color-text-muted)] leading-relaxed">
              当前使用<strong className="text-[var(--color-accent-gold)]">本地规则引擎</strong>进行抽取，
              基于水浒人物词典、地名正则和关系模板。如需更高精度，可在后端配置大模型 API（DeepSeek / 百度文心等）。
            </p>
          </div>
        </div>
      )}

      {/* ─── 分析结果区：两栏布局 ─── */}
      {hasResult && (
        <div className="flex-1 flex min-h-0">
          {/* 左侧：原文高亮 */}
          <div className="w-[45%] min-w-[300px] border-r border-[var(--color-border)] flex flex-col bg-[var(--color-bg-parchment)]">
            {/* 左侧顶栏 */}
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)] flex-shrink-0">
              <FileText size={14} className="text-[var(--color-accent-gold)]" />
              <span className="font-['Noto_Serif_TC'] text-xs font-semibold text-[var(--color-text-primary)] tracking-wider">
                原文标注
              </span>
              <div className="flex-1" />
              {/* 实体图例 */}
              <EntityLegend label="人物" color={getEntityColor('人物')} />
              <EntityLegend label="地点" color={getEntityColor('地点')} />
              <EntityLegend label="道具" color={getEntityColor('道具')} />
            </div>

            {/* 高亮文本内容 */}
            <div className="flex-1 overflow-y-auto p-4 font-['Noto_Serif_TC'] text-sm leading-[2] text-[var(--color-text-primary)]">
              {highlightSegments.map((seg, i) => {
                if (seg.type === 'text') {
                  return <span key={i}>{seg.content}</span>;
                }
                const color = getEntityColor(seg.entityType);
                const isActive = result.nodes.find(
                  (n) => n.name === seg.entityName && n.id === highlightEntityId,
                );
                return (
                  <span
                    key={i}
                    className="cursor-pointer rounded-sm px-0.5 transition-all duration-200"
                    style={{
                      backgroundColor: isActive
                        ? `${color}40`
                        : `${color}18`,
                      borderBottom: `2px solid ${isActive ? color : `${color}60`}`,
                      fontWeight: isActive ? 'bold' : 'normal',
                    }}
                    onClick={() => handleEntityClick(seg.entityName)}
                    title={`${seg.entityName} (${seg.entityType})`}
                  >
                    <span
                      className="text-[10px] align-super mr-0.5 opacity-70"
                      style={{ color }}
                    >
                      {seg.entityType === '人物' ? '人' : seg.entityType === '地点' ? '地' : '物'}
                    </span>
                    {seg.content}
                  </span>
                );
              })}
            </div>
          </div>

          {/* 右侧：动态知识图谱 */}
          <div className="flex-1 min-w-0 flex flex-col">
            {/* 右侧顶栏 */}
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)] flex-shrink-0">
              <GitBranch size={14} className="text-[var(--color-accent-jade)]" />
              <span className="font-['Noto_Serif_TC'] text-xs font-semibold text-[var(--color-text-primary)] tracking-wider">
                动态图谱
              </span>
              <div className="flex-1" />
              {/* 统计 */}
              <span className="text-[10px] text-[var(--color-text-muted)]">
                {entityStats['人物'] || 0} 人物 · {entityStats['地点'] || 0} 地点 · {result.edges.length} 关系
              </span>
              {/* 返回分析按钮 */}
              <button
                onClick={handleClear}
                className="ml-2 px-2.5 py-1 text-[10px] rounded border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-accent-gold)] transition-colors font-['Noto_Serif_TC']"
              >
                返回编辑
              </button>
            </div>

            <div className="flex-1 min-h-0">
              <StoryGraph
                data={result}
                loading={false}
                onNodeClick={handleGraphNodeClick}
                highlightNodeId={highlightEntityId}
              />
            </div>
          </div>
        </div>
      )}

      {/* ─── 关系列表（在底部或可切换） ─── */}
      {hasResult && result.edges.length > 0 && (
        <div className="flex-shrink-0 border-t border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-2 max-h-32 overflow-y-auto">
          <div className="flex items-center gap-5 flex-wrap">
            <span className="text-[10px] text-[var(--color-text-muted)] tracking-wider flex-shrink-0">
              关系一览
            </span>
            {result.edges.map((edge) => {
              const srcNode = result.nodes.find((n) => n.id === edge.source);
              const tgtNode = result.nodes.find((n) => n.id === edge.target);
              const relColor = getEntityColor(
                srcNode?.type === '人物' && tgtNode?.type === '人物' ? '人物' : '道具',
              );
              return (
                <span
                  key={edge.id}
                  className="text-xs font-['Noto_Serif_TC'] inline-flex items-center gap-1.5 px-2 py-1 rounded-sm cursor-pointer hover:bg-[var(--color-bg-card-hover)] transition-colors"
                  style={{ border: `1px solid var(--color-border)` }}
                >
                  <span className="text-[var(--color-text-primary)]">
                    {srcNode?.name || edge.source}
                  </span>
                  <span
                    className="text-[10px] px-1 rounded-sm"
                    style={{
                      color: relColor,
                      backgroundColor: `${relColor}18`,
                    }}
                  >
                    {edge.relation}
                  </span>
                  <span className="text-[var(--color-text-primary)]">
                    {tgtNode?.name || edge.target}
                  </span>
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/** 实体图例小标签 */
function EntityLegend({ label, color }: { label: string; color: string }) {
  return (
    <span className="flex items-center gap-1 text-[10px] text-[var(--color-text-muted)]">
      <span
        className="w-2 h-2 rounded-sm flex-shrink-0"
        style={{ backgroundColor: color, opacity: 0.8 }}
      />
      {label}
    </span>
  );
}
