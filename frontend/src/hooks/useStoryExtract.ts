/**
 * 动态故事抽取 Hook
 * 调用 POST /api/extract 获取实体与关系
 */
import { useState, useCallback } from 'react';
import type { ExtractResponse } from '../types';

const API_BASE = '/api';

export function useStoryExtract() {
  const [result, setResult] = useState<ExtractResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const extract = useCallback(async (text: string, method: 'local' | 'llm' = 'local') => {
    if (!text.trim()) {
      setError('请输入文本内容');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setResult(null);

      const res = await fetch(`${API_BASE}/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, method }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || `请求失败 (${res.status})`);
      }

      const json: ExtractResponse = await res.json();
      setResult(json);
    } catch (err) {
      const message = err instanceof Error ? err.message : '抽取失败';
      setError(message);
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearResult = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return { result, loading, error, extract, clearResult };
}
