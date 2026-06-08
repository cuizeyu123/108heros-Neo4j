import { useState, useEffect, useRef } from 'react';
import { Search, X, Filter } from 'lucide-react';

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
    <div ref={containerRef} className="relative">
      <div className="flex items-center gap-2 px-3 py-2 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-lg focus-within:border-[var(--color-accent-gold)] transition-colors">
        <Search size={16} className="text-[var(--color-text-muted)] flex-shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder="搜索英雄姓名、绰号..."
          className="flex-1 bg-transparent text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] outline-none border-none min-w-0"
        />
        {query && (
          <button
            onClick={handleClear}
            className="p-0.5 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            <X size={14} />
          </button>
        )}
        <Filter size={14} className="text-[var(--color-text-muted)] flex-shrink-0" />
      </div>

      {/* Dropdown Results */}
      {showResults && query && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg shadow-xl max-h-64 overflow-y-auto z-50">
          {searching && (
            <div className="p-3 text-center text-sm text-[var(--color-text-muted)]">
              搜索中...
            </div>
          )}
          {!searching && searchResults.length === 0 && (
            <div className="p-3 text-center text-sm text-[var(--color-text-muted)]">
              未找到匹配的英雄
            </div>
          )}
          {!searching &&
            searchResults.map((hero) => (
              <button
                key={hero.座次}
                onClick={() => handleSelect(hero)}
                className="w-full flex items-center gap-3 px-3 py-2 hover:bg-[var(--color-bg-card-hover)] transition-colors text-left"
              >
                <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                  <img
                    src={`${API_BASE}/images/${hero.local_image}`}
                    alt={hero.姓名}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <span className="text-sm text-[var(--color-text-primary)] font-medium">
                    {hero.姓名}
                  </span>
                  <span className="text-xs text-[var(--color-accent-gold)] ml-1.5">
                    {hero.绰号}
                  </span>
                </div>
                <span className="text-[10px] text-[var(--color-text-muted)] ml-auto flex-shrink-0">
                  #{hero.座次}
                </span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
