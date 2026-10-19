'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface QueryState<T, M> {
  data: T | null;
  metadata: M | null;
  pending: boolean;
  error: string | null;
  key: string;
}

/** Public discovery reads only. Keeps previous results while replacing a request. */
export function useDiscoveryQuery<T, M = unknown>(url: string | null, delay = 250) {
  const [revision, setRevision] = useState(0);
  const started = useRef(false);
  const [state, setState] = useState<QueryState<T, M>>({ data: null, metadata: null, pending: false, error: null, key: '' });
  const key = `${url ?? ''}:${revision}`;

  useEffect(() => {
    if (!url) return;
    let active = true;
    let timedOut = false;
    const controller = new AbortController();
    let timeout: ReturnType<typeof setTimeout> | undefined;
    // Also coalesces the development Strict Mode mount/cleanup cycle before dispatch.
    const timer = setTimeout(async () => {
      started.current = true;
      setState((previous) => ({ ...previous, pending: true, error: null }));
      timeout = setTimeout(() => { timedOut = true; controller.abort(); }, 20000);
      try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error('Không thể tải dữ liệu lúc này. Vui lòng thử lại.');
        const result = await response.json();
        if (!result.success) throw new Error(result.message || 'Không thể tải dữ liệu lúc này.');
        if (active) setState({ data: result.data, metadata: result.metadata ?? null, pending: false, error: null, key });
      } catch (error) {
        if (active) setState((previous) => ({ ...previous, pending: false, key, error: timedOut
          ? 'Kết nối đang phản hồi chậm. Vui lòng thử tải lại.'
          : error instanceof Error ? error.message : 'Không thể kết nối. Vui lòng thử lại.' }));
      } finally {
        clearTimeout(timeout);
      }
    }, started.current ? delay : 0);
    return () => {
      active = false;
      clearTimeout(timer);
      clearTimeout(timeout);
      controller.abort();
    };
  }, [url, key, delay]);

  const refresh = useCallback(() => setRevision((current) => current + 1), []);
  return {
    data: state.data,
    metadata: state.metadata,
    loading: Boolean(url) && (state.pending || state.key !== key),
    error: state.key === key ? state.error : null,
    isCurrent: Boolean(url) && state.key === key && !state.pending && !state.error,
    refresh,
  };
}
