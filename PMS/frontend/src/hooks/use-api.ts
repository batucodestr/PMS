import { api, buildQuery, fetchAll, type Paginated, type QueryParams } from "@/lib/api";
import { useCallback, useEffect, useState } from "react";

type Result<D> = { key: string; data?: D; error?: string };

function useRequest<D>(key: string, load: () => Promise<D>) {
  const [tick, setTick] = useState(0);
  const [result, setResult] = useState<Result<D> | null>(null);
  const requestKey = `${key}#${tick}`;

  useEffect(() => {
    let cancelled = false;
    load()
      .then((data) => !cancelled && setResult({ key: requestKey, data }))
      .catch(
        (e: unknown) =>
          !cancelled &&
          setResult({
            key: requestKey,
            error: e instanceof Error ? e.message : "Bilinmeyen hata",
          }),
      );
    return () => {
      cancelled = true;
    };
    // load, key'den türetildiği için yalnızca requestKey değişince yeniden çalışır.
  }, [requestKey]);

  const current = result?.key === requestKey;
  return {
    data: result?.data ?? null, // yeni istek sürerken eski veri ekranda kalır
    loading: !current,
    error: current ? (result?.error ?? null) : null,
    reload: useCallback(() => setTick((t) => t + 1), []),
  };
}

/** Sayfalı liste: GET /api{path}?{params}. Parametre değişince otomatik tekrar çeker. */
export function useApiList<T>(path: string, params: QueryParams = {}) {
  const url = path + buildQuery(params);
  return useRequest<Paginated<T>>(url, () => api.get<Paginated<T>>(url));
}

/** Tüm sayfaları çeker (dropdown / lookup / takvim için). */
export function useApiAll<T>(path: string, params: QueryParams = {}) {
  const key = "all:" + path + buildQuery(params);
  return useRequest<T[]>(key, () => fetchAll<T>(path, params));
}

/** Değer, `delay` ms boyunca değişmezse güncellenir (arama kutusu için). */
export function useDebounce<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}
