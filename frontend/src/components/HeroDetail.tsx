import { X, Users, Star, MapPin, BookOpen, Swords, Scroll } from 'lucide-react';
import type { HeroDetail as HeroDetailType } from '../types';

interface Props {
  hero: HeroDetailType | null;
  loading: boolean;
  onClose: () => void;
  onHeroClick: (name: string) => void;
}

export default function HeroDetail({ hero, loading, onClose, onHeroClick }: Props) {
  if (!hero && !loading) return null;

  return (
    <div className="h-full flex flex-col bg-[var(--color-bg-secondary)] border-l border-[var(--color-border)]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
        <h2 className="font-['Noto_Serif_TC'] text-lg font-semibold text-[var(--color-text-primary)]">
          英雄详情
        </h2>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-[var(--color-bg-card-hover)] transition-colors text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
          aria-label="关闭详情"
        >
          <X size={18} />
        </button>
      </div>

      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[var(--color-accent-gold)] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {hero && !loading && (
        <div className="flex-1 overflow-y-auto">
          {/* Hero Image */}
          <div className="relative p-6 pb-3 flex justify-center">
            <div className="relative">
              <div
                className={`w-40 h-40 rounded-full overflow-hidden border-4 ${
                  hero.座次 <= 36
                    ? 'border-[var(--color-accent-gold)] shadow-[0_0_20px_rgba(212,165,116,0.3)]'
                    : 'border-[#A8B8C8] shadow-[0_0_15px_rgba(168,184,200,0.2)]'
                }`}
              >
                <img
                  src={`/api/images/${hero.local_image}`}
                  alt={hero.姓名}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23334155" width="100" height="100"/><text x="50" y="55" text-anchor="middle" fill="%2394A3B8" font-size="14">无图片</text></svg>';
                  }}
                />
              </div>
              <div
                className={`absolute -bottom-1 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-xs font-medium ${
                  hero.座次 <= 36
                    ? 'bg-[var(--color-accent-gold)] text-black'
                    : 'bg-[#A8B8C8] text-black'
                }`}
              >
                第{hero.座次}位
              </div>
            </div>
          </div>

          {/* Name & Title */}
          <div className="text-center px-4 pb-4">
            <h3 className="font-['Noto_Serif_TC'] text-2xl font-bold text-[var(--color-text-primary)]">
              {hero.姓名}
            </h3>
            <p className="text-[var(--color-accent-gold)] text-sm mt-1">
              {hero.星宿} · {hero.绰号}
            </p>
          </div>

          {/* Info Cards */}
          <div className="px-4 pb-6 space-y-3">
            {/* Star Info */}
            <InfoRow icon={<Star size={15} />} label="星宿" value={hero.星宿} />
            <InfoRow icon={<MapPin size={15} />} label="出身" value={hero.出身} />
            <InfoRow icon={<BookOpen size={15} />} label="初登场" value={hero.初登场} />
            <InfoRow icon={<Scroll size={15} />} label="入山回数" value={hero.入山回数} />
            <InfoRow icon={<Swords size={15} />} label="梁山职位" value={hero.梁山职位} />
            {hero.招安后官职 && hero.招安后官职 !== '－' && (
              <InfoRow icon={<Users size={15} />} label="招安后官职" value={hero.招安后官职} />
            )}
            <InfoRow
              icon={<Swords size={15} />}
              label="后续发展"
              value={hero.后续发展}
              accent
            />
            {hero.备考 && (
              <div className="mt-3 p-3 rounded-lg bg-[var(--color-bg-primary)] border border-[var(--color-border)]">
                <p className="text-xs text-[var(--color-text-muted)] mb-1">备考</p>
                <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                  {hero.备考}
                </p>
              </div>
            )}
          </div>

          {/* Relations */}
          {hero.relations && hero.relations.length > 0 && (
            <div className="border-t border-[var(--color-border)] px-4 py-4">
              <h4 className="text-sm font-medium text-[var(--color-text-primary)] mb-3 flex items-center gap-2">
                <Users size={14} />
                社会关系
              </h4>
              <div className="flex flex-wrap gap-2">
                {hero.relations.map((rel, idx) => (
                  <button
                    key={idx}
                    onClick={() => onHeroClick(rel.target_name)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--color-bg-primary)] border border-[var(--color-border)] hover:border-[var(--color-accent-gold)] transition-colors group"
                  >
                    <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0">
                      <img
                        src={rel.target_image}
                        alt={rel.target_name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="text-left">
                      <span className="text-xs text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-primary)] transition-colors">
                        {rel.target_name}
                      </span>
                      <span className="text-[10px] text-[var(--color-accent-gold)] ml-1.5">
                        {rel.relation}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-[var(--color-bg-card-hover)] transition-colors">
      <span className="text-[var(--color-text-muted)] mt-0.5 flex-shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">
          {label}
        </p>
        <p
          className={`text-sm leading-relaxed ${
            accent ? 'text-[var(--color-accent-amber)] font-medium' : 'text-[var(--color-text-primary)]'
          }`}
        >
          {value || '－'}
        </p>
      </div>
    </div>
  );
}
