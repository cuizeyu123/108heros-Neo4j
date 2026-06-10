import { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';

interface Props {
  onSearch: (keyword: string) => void;
  onSelectHero: (nodeId: string | null) => void;
  searchResults: SearchResult[];
  searching: boolean;
}

interface SearchResult {
  姓名: string;
  绰号: string;
  星宿: string;
  座次: number;
  local_image: string;
}

const API_BASE = '/api';

export default function SearchBar({ onSearch, onSelectHero, searchResults, searching }: Props) {
  const [query, setQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.trim().length >= 1) {
      debounceRef.current = setTimeout(() => {
        onSearch(value.trim());
        setShowResults(true);
      }, 250);
    } else {
      onSearch('');
      onSelectHero(null);
      setShowResults(false);
    }
  };

  const handleSelect = (hero: SearchResult) => {
    setQuery(hero.姓名);
    setShowResults(false);
    onSelectHero(`hero_${hero.座次}`);
  };

  const handleClear = () => {
    setQuery('');
    onSearch('');
    onSelectHero(null);
    setShowResults(false);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="flex items-center gap-2 px-3 py-2 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-sm focus-within:border-[var(--color-accent-gold)] transition-colors">
        <Search size={15} className="text-[var(--color-text-muted)] flex-shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder="寻访英雄..."
          className="flex-1 bg-transparent text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] outline-none border-none min-w-0 font-['Noto_Serif_TC']"
        />
        {query && (
          <button
            onClick={handleClear}
            className="p-0.5 rounded-sm text-[var(--color-text-muted)] hover:text-[var(--color-accent-vermillion)] transition-colors"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* ─── 下拉结果 ─── */}
      {showResults && query && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-sm shadow-2xl max-h-72 overflow-y-auto z-50">
          {searching && (
            <div className="p-4 text-center">
              <span className="text-xs text-[var(--color-text-muted)] font-['Noto_Serif_TC']">
                寻觅中...
              </span>
            </div>
          )}
          {!searching && searchResults.length === 0 && (
            <div className="p-4 text-center">
              <span className="text-xs text-[var(--color-text-muted)] font-['Noto_Serif_TC']">
                未寻得此人
              </span>
            </div>
          )}
          {!searching &&
            searchResults.map((hero) => (
              <button
                key={hero.座次}
                onClick={() => handleSelect(hero)}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[var(--color-bg-card-hover)] transition-colors text-left border-b border-[var(--color-border)]/50 last:border-b-0"
              >
                {/* 小头像 */}
                <div
                  className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0"
                  style={{
                    border: `2px solid ${hero.座次 <= 36 ? 'var(--color-accent-gold)' : 'var(--color-accent-jade)'}`,
                  }}
                >
                  <img
                    src={`${API_BASE}/images/${hero.local_image}`}
                    alt={hero.姓名}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23231D15" width="100" height="100"/></svg>';
                    }}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm text-[var(--color-text-primary)] font-medium font-['Noto_Serif_TC']">
                      {hero.姓名}
                    </span>
                    <span className="text-[10px] text-[var(--color-accent-gold)]">
                      {hero.绰号}
                    </span>
                  </div>
                  <span className="text-[10px] text-[var(--color-text-muted)]">
                    {hero.星宿}
                  </span>
                </div>

                {/* 座次小封印 */}
                <div
                  className="w-6 h-6 flex items-center justify-center flex-shrink-0 rotate-[-3deg]"
                  style={{
                    backgroundColor: hero.座次 <= 36 ? 'var(--color-accent-gold)' : 'var(--color-accent-jade)',
                    color: 'var(--color-bg-primary)',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    fontFamily: '"Noto Serif TC", serif',
                  }}
                >
                  {hero.座次}
                </div>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
