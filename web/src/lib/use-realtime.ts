'use client';

import { useEffect, useRef } from 'react';

export type RealtimeChange = {
  type: 'room' | 'appointment' | 'contract' | 'bill' | 'notification' | 'review' | 'roommate' | 'roommate_post';
  roomId: number | null;
  at: number;
};

/**
 * Nghe kênh đồng bộ thời gian thực (/api/events, Server-Sent Events) và gọi onChange khi có biến động
 * thuộc các loại cần theo dõi. Nhiều sự kiện liên tiếp được gộp (debounce) thành một lần tải lại.
 */
export function useRealtime(
  types: RealtimeChange['type'][],
  onChange: (changes: RealtimeChange[]) => void,
  opts: { debounceMs?: number; enabled?: boolean } = {}
) {
  const handlerRef = useRef(onChange);
  useEffect(() => {
    handlerRef.current = onChange;
  });
  const typesKey = types.join(',');

  useEffect(() => {
    if (opts.enabled === false || typeof window === 'undefined' || typeof EventSource === 'undefined') return;
    const portal = /^\/(chu-tro|admin|portal)(\/|$)/.test(window.location.pathname);
    const source = new EventSource(`/api/events?scope=${portal ? 'portal' : 'tenant'}`);
    const wanted = new Set(typesKey.split(','));
    let pending: RealtimeChange[] = [];
    let timer: ReturnType<typeof setTimeout> | null = null;
    const onMessage = (event: MessageEvent) => {
      try {
        const change = JSON.parse(event.data) as RealtimeChange;
        if (!wanted.has(change.type)) return;
        pending.push(change);
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          const batch = pending;
          pending = [];
          handlerRef.current(batch);
        }, opts.debounceMs ?? 600);
      } catch {
        // bỏ qua gói tin lỗi
      }
    };
    source.addEventListener('change', onMessage as EventListener);
    return () => {
      if (timer) clearTimeout(timer);
      source.removeEventListener('change', onMessage as EventListener);
      source.close();
    };
  }, [typesKey, opts.debounceMs, opts.enabled]);
}
