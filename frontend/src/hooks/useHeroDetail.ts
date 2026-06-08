import { useState, useCallback } from 'react';
import type { HeroDetail } from '../types';

const API_BASE = '/api';

export function useHeroDetail() {
  const [hero, setHero] = useState<HeroDetail | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchHero = useCallback(async (name: string) => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/heroes/${encodeURIComponent(name)}`);
      if (!res.ok) throw new Error('英雄不存在');
      const json: HeroDetail = await res.json();
      setHero(json);
    } catch {
      setHero(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearHero = useCallback(() => setHero(null), []);

  return { hero, loading, fetchHero, clearHero };
}
