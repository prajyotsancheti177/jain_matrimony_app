// A small data cache: screens share results by key, can update them optimistically,
// and refetch after mutations with invalidate().

import { useCallback, useEffect, useReducer, useRef } from 'react';

type Entry = { data?: unknown; error?: Error; loading: boolean; gen: number; stale: boolean };
const cache = new Map<string, Entry>();
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());

function get(key: string): Entry {
  let e = cache.get(key);
  if (!e) cache.set(key, (e = { loading: false, gen: 0, stale: true }));
  return e;
}

const inflight = new Map<string, Promise<void>>();
async function load(key: string, fn: () => Promise<unknown>) {
  if (inflight.has(key)) return inflight.get(key);
  const run = (async () => {
    const e = get(key);
    cache.set(key, { ...e, loading: true, stale: false });
    emit();
    try {
      const data = await fn();
      cache.set(key, { ...get(key), data, error: undefined, loading: false });
    } catch (err) {
      cache.set(key, { ...get(key), error: err as Error, loading: false });
    }
    emit();
  })().finally(() => inflight.delete(key));
  inflight.set(key, run);
  return run;
}

export function useQuery<T>(key: string | null, fn: () => Promise<T>) {
  const [, force] = useReducer((x: number) => x + 1, 0);
  const fnRef = useRef(fn);
  useEffect(() => {
    fnRef.current = fn;
  });
  useEffect(() => {
    subs.add(force);
    return () => void subs.delete(force);
  }, []);
  const e = key ? get(key) : null;
  useEffect(() => {
    if (key && e?.stale) load(key, () => fnRef.current());
  }, [key, e?.gen, e?.stale]);
  const reload = useCallback(() => (key ? load(key, () => fnRef.current()) : Promise.resolve()), [key]);
  return {
    data: e?.data as T | undefined,
    error: e?.error,
    loading: !!e && (e.loading || (e.stale && e.data === undefined)),
    reload,
  };
}

/** Optimistically change cached data. */
export function setQueryData<T>(key: string, update: (prev: T | undefined) => T) {
  const e = get(key);
  cache.set(key, { ...e, data: update(e.data as T | undefined) });
  emit();
}

/** Mark every key that starts with one of the prefixes as stale; mounted screens refetch. */
export function invalidate(...prefixes: string[]) {
  for (const [k, e] of cache) {
    if (prefixes.some((p) => k.startsWith(p))) cache.set(k, { ...e, stale: true, gen: e.gen + 1 });
  }
  emit();
}

export function clearQueries() {
  cache.clear();
  emit();
}
