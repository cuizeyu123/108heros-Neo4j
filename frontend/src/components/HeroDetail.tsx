import { X, Star, MapPin, BookOpen, Swords, Scroll, UserRound, ChevronRight } from 'lucide-react';
import type { HeroDetail as HeroDetailType } from '../types';

interface Props {
  hero: HeroDetailType | null;
  loading: boolean;
  onClose: () => void;
  onHeroClick: (name: string) => void;
}

function getRelationStyle(relation: string): { color: string; bg: string; border: string; label: string } {
  const familyRels = ['兄', '弟', '姐', '妹', '父', '子'];
  const masterRels = ['主', '仆'];
  const teacherRels = ['师', '徒'];

  if (familyRels.includes(relation)) {
    return { color: 'var(--color-accent-gold)', bg: 'rgba(201,169,110,0.08)', border: 'var(--color-accent-gold)', label: '亲族' };
  }
  if (masterRels.includes(relation)) {
    return { color: 'var(--color-accent-amber)', bg: 'rgba(200,132,61,0.08)', border: 'var(--color-accent-amber)', label: '主从' };
  }
  if (teacherRels.includes(relation)) {
    return { color: 'var(--color-accent-jade)', bg: 'rgba(107,142,107,0.08)', border: 'var(--color-accent-jade)', label: '师徒' };
  }
  return { color: 'var(--color-accent-amber)', bg: 'rgba(200,132,61,0.06)', border: 'var(--color-accent-amber)', label: '交游' };
}

export default function HeroDetail({ hero, loading, onClose, onHeroClick }: Props) {
  if (!hero && !loading) return null;

  return (
    <div className="h-full flex flex-col bg-[var(--color-bg-secondary)] border-l border-[var(--color-border)]">
      {/* ─── 卷轴头部 ─── */}
      <div className="relative flex items-center justify-between p-4 border-b border-[var(--color-border)] bg-[var(--color-bg-parchment)]">
        {/* 顶部装饰线 */}
        <div className="absolute top-0 left-3 right-3 h-[1px] bg-gradient-to-r from-transparent via-[var(--color-accent-gold)]/50 to-transparent" />

        <div className="flex items-center gap-2.5">
          <BookOpen size={15} className="text-[var(--color-accent-gold)]" />
          <h2 className="font-['Noto_Serif_TC'] text-base font-semibold text-[var(--color-text-primary)] tracking-wider">
            英雄谱
          </h2>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded hover:bg-[var(--color-bg-card-hover)] transition-colors text-[var(--color-text-muted)] hover:text-[var(--color-accent-vermillion)]"
          aria-label="关闭详情"
        >
          <X size={16} />
        </button>
      </div>

      {/* ─── 加载态 ─── */}
      {loading && (
        <div className="flex-1 flex items-center justify-center bg-[var(--color-bg-parchment)]">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-[var(--color-accent-gold)] border-t-transparent rounded-full animate-spin opacity-60" />
            <span className="font-['Noto_Serif_TC'] text-xs text-[var(--color-text-muted)]">查阅卷宗...</span>
          </div>
        </div>
      )}

      {/* ─── 内容 ─── */}
      {hero && !loading && (
        <div className="flex-1 overflow-y-auto bg-[var(--color-bg-parchment)]">
          {/* 英雄画像 + 印章座次 */}
          <div className="relative pt-6 pb-2 flex flex-col items-center">
            {/* 画像外框 — 天罡描金，地煞描玉 */}
            <div className="relative">
              <div
                className="w-36 h-36 rounded-full overflow-hidden"
                style={{
                  border: `3px solid ${hero.座次 <= 36 ? 'var(--color-accent-gold)' : 'var(--color-accent-jade)'}`,
                  boxShadow: hero.座次 <= 36
                    ? '0 0 24px rgba(201,169,110,0.3), 0 0 0 6px rgba(201,169,110,0.06)'
                    : '0 0 16px rgba(107,142,107,0.2), 0 0 0 6px rgba(107,142,107,0.04)',
                }}
              >
                <img
                  src={`/api/images/${hero.local_image}`}
                  alt={hero.姓名}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23231D15" width="100" height="100"/><text x="50" y="55" text-anchor="middle" fill="%23706858" font-size="12">无画像</text></svg>';
                  }}
                />
              </div>

              {/* 座次封印 — 朱砂印章效果 */}
              <div
                className="absolute -bottom-2 -right-2 w-11 h-11 flex items-center justify-center rotate-[-6deg]"
                style={{
                  backgroundColor: 'var(--color-accent-vermillion)',
                  border: '1px solid rgba(196,61,61,0.6)',
                  boxShadow: '0 2px 8px rgba(196,61,61,0.4), inset 0 0 0 1px rgba(255,255,255,0.1)',
                }}
              >
                <span className="font-['Noto_Serif_TC'] text-white text-xs font-black leading-tight text-center">
                  {hero.座次}
                </span>
              </div>
            </div>

            {/* 星宿绶带 */}
            <div className="mt-3 px-3 py-0.5 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-sm">
              <span className="text-[10px] text-[var(--color-text-muted)] tracking-[0.2em]">
                {hero.星宿}
              </span>
            </div>
          </div>

          {/* 姓名与绰号 */}
          <div className="text-center px-4 pb-4">
            <h3 className="font-['Noto_Serif_TC'] text-2xl font-bold text-[var(--color-text-primary)] tracking-wider">
              {hero.姓名}
            </h3>
            <p className="text-[var(--color-accent-gold)] text-sm mt-1 font-['Noto_Serif_TC']">
              {hero.绰号}
            </p>
            <div className="mt-2 mx-auto w-12 h-[1px] bg-gradient-to-r from-transparent via-[var(--color-accent-gold)]/60 to-transparent" />
          </div>

          {/* ─── 生平信息 ─── */}
          <div className="px-4 pb-4 space-y-1.5">
            <InfoLine icon={<Star size={13} />} label="星宿" value={hero.星宿} />
            <InfoLine icon={<MapPin size={13} />} label="出身" value={hero.出身} />
            <InfoLine icon={<BookOpen size={13} />} label="初登场" value={hero.初登场} />
            <InfoLine icon={<Scroll size={13} />} label="入山回数" value={hero.入山回数} />
            <InfoLine icon={<Swords size={13} />} label="梁山职位" value={hero.梁山职位} />
            {hero.招安后官职 && hero.招安后官职 !== '－' && (
              <InfoLine icon={<UserRound size={13} />} label="招安后" value={hero.招安后官职} />
            )}
          </div>

          {/* 后续发展 */}
          <div className="mx-4 mb-4 p-3 rounded border border-[var(--color-border)] bg-[var(--color-bg-card)]">
            <div className="flex items-center gap-2 mb-1.5">
              <Swords size={12} className="text-[var(--color-accent-vermillion)]" />
              <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">归宿</span>
            </div>
            <p className="text-sm text-[var(--color-text-primary)] leading-relaxed font-['Noto_Serif_TC']">
              {hero.后续发展 || '－'}
            </p>
          </div>

          {/* 备考 */}
          {hero.备考 && (
            <div className="mx-4 mb-4 p-3 rounded border border-[var(--color-border)] bg-[var(--color-bg-card)]">
              <div className="flex items-center gap-2 mb-1.5">
                <BookOpen size={12} className="text-[var(--color-accent-gold)]" />
                <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">考据</span>
              </div>
              <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                {hero.备考}
              </p>
            </div>
          )}

          {/* ─── 恩仇录：社会关系 ─── */}
          {hero.relations && hero.relations.length > 0 && (
            <div className="border-t border-[var(--color-border-gold)] mx-4 pt-4 pb-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-4 h-[1px] bg-[var(--color-accent-gold)]/50" />
                <h4 className="font-['Noto_Serif_TC'] text-sm font-semibold text-[var(--color-accent-gold)] tracking-wider">
                  恩仇录
                </h4>
                <div className="flex-1 h-[1px] bg-[var(--color-accent-gold)]/20" />
              </div>

              <div className="space-y-2">
                {hero.relations.map((rel, idx) => {
                  const style = getRelationStyle(rel.relation);
                  return (
                    <button
                      key={idx}
                      onClick={() => onHeroClick(rel.target_name)}
                      className="w-full flex items-center gap-3 p-2.5 rounded border transition-all group text-left"
                      style={{
                        backgroundColor: style.bg,
                        borderColor: 'var(--color-border)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = style.border;
                        e.currentTarget.style.backgroundColor = style.bg.replace('0.08', '0.14');
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--color-border)';
                        e.currentTarget.style.backgroundColor = style.bg;
                      }}
                    >
                      {/* 关联人物头像 */}
                      <div
                        className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0"
                        style={{ border: `2px solid ${style.border}` }}
                      >
                        <img
                          src={rel.target_image}
                          alt={rel.target_name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23231D15" width="100" height="100"/></svg>';
                          }}
                        />
                      </div>

                      {/* 关系信息 */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm text-[var(--color-text-primary)] font-medium group-hover:text-[var(--color-text-primary)] transition-colors">
                            {rel.target_name}
                          </span>
                          <span className="text-[10px] text-[var(--color-text-muted)]">
                            #{rel.target_number}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span
                            className="text-[10px] px-1.5 py-[1px] rounded-sm font-medium"
                            style={{
                              color: style.color,
                              backgroundColor: style.bg,
                              border: `1px solid ${style.border}40`,
                            }}
                          >
                            {style.label}
                          </span>
                          <span className="text-[11px]" style={{ color: style.color }}>
                            {rel.relation}
                          </span>
                        </div>
                      </div>

                      <ChevronRight size={14} className="text-[var(--color-text-muted)] group-hover:text-[var(--color-accent-gold)] transition-colors flex-shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 无关系 */}
          {(!hero.relations || hero.relations.length === 0) && (
            <div className="border-t border-[var(--color-border)] mx-4 pt-4 pb-6 text-center">
              <p className="text-xs text-[var(--color-text-muted)] font-['Noto_Serif_TC']">
                暂无关联人物记载
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── 信息行 ─── */
function InfoLine({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 px-2.5 py-2 rounded hover:bg-[var(--color-bg-card)] transition-colors group">
      <span className="text-[var(--color-text-muted)] flex-shrink-0 group-hover:text-[var(--color-accent-gold)] transition-colors">
        {icon}
      </span>
      <span className="text-[10px] text-[var(--color-text-muted)] w-14 flex-shrink-0 tracking-wider">
        {label}
      </span>
      <span className="text-sm text-[var(--color-text-primary)] truncate font-['Noto_Serif_TC']">
        {value || '－'}
      </span>
    </div>
  );
}
