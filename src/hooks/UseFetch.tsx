/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from 'react';

function useFetch<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<number | null>(null);

  // core fetch, accepts { silent } to suppress the loading spinner
  const fetchData = useCallback(
    async (opts: { silent?: boolean } = {}) => {
      if (!opts.silent) {
        setLoading(true);
        setError(null);
      }
      try {
        const accessToken = sessionStorage.getItem('accessToken');
        const headers: HeadersInit = { 'Content-Type': 'application/json' };
        if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

        const response = await fetch(url, { headers });
        setStatus(response.status);

        if (!response.ok) {
          const errJson = await response.json().catch(() => ({}));
          throw new Error((errJson as any).detail || 'Network response was not ok');
        }

        const jsonData = await response.json();
        setData(jsonData);
      } catch (err: any) {
        if (!opts.silent) setError(err.message || 'An error occurred');
      } finally {
        if (!opts.silent) setLoading(false);
      }
    },
    [url]
  );

  // initial + whenever URL changes
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    status,
    // public API
    refetch: () => fetchData(),                // full‑screen loader
    silentRefetch: () => fetchData({ silent: true }), // no loader
  };
}

export default useFetch;
