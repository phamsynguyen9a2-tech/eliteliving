/** Shares concurrent reads; TTL starts after success, and invalidation wins races. */
export function createAsyncCache<T>(ttlMs: number, now = Date.now) {
  let cached: { value: T; expiresAt: number } | undefined;
  let pending: Promise<T> | undefined;
  let generation = 0;

  return {
    read(load: () => Promise<T>): Promise<T> {
      if (cached && now() < cached.expiresAt) return Promise.resolve(cached.value);
      if (pending) return pending;
      const version = generation;
      const request = Promise.resolve().then(load).then((value) => {
        if (version === generation) cached = { value, expiresAt: now() + ttlMs };
        return value;
      }).finally(() => {
        if (pending === request) pending = undefined;
      });
      pending = request;
      return request;
    },
    invalidate() {
      generation += 1;
      cached = undefined;
      pending = undefined;
    },
  };
}
