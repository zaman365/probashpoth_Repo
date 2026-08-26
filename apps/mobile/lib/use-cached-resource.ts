import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from './api';
import { cacheResource, readCachedResource } from './offline';

export interface CachedResource<T> {
  data?: T;
  loading: boolean;
  stale: boolean;
  error?: string;
  refresh: () => Promise<void>;
}

export function useCachedResource<T>(cacheKey: string, path: string): CachedResource<T> {
  const [data, setData] = useState<T>();
  const [loading, setLoading] = useState(true);
  const [stale, setStale] = useState(false);
  const [error, setError] = useState<string>();

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const response = await apiRequest<T>(path);
      setData(response);
      setStale(false);
      await cacheResource(cacheKey, response);
    } catch (caught) {
      const cached = await readCachedResource<T>(cacheKey);
      if (cached !== undefined) {
        setData(cached);
        setStale(true);
      } else {
        setError(caught instanceof Error ? caught.message : 'request_failed');
      }
    } finally {
      setLoading(false);
    }
  }, [cacheKey, path]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, stale, error, refresh };
}
