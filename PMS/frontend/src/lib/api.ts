import {
  clearAuth,
  getAccessToken,
  getRefreshToken,
  saveLogin,
  saveTokens,
} from "./auth";

/** DRF sayfalı liste cevabı. */
export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export type QueryParams = Record<
  string,
  string | number | boolean | null | undefined
>;

/** HTTP hatası. `data` backend'in gönderdiği gövdedir (400'de alan hataları burada). */
export class ApiError extends Error {
  status: number;
  data: unknown;
  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

/** { search: "ali", page: 2 } -> "?search=ali&page=2" (boş değerler atlanır). */
export function buildQuery(params?: QueryParams): string {
  if (!params) return "";
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      qs.set(key, String(value));
    }
  }
  const text = qs.toString();
  return text ? `?${text}` : "";
}

function messageFromData(data: unknown, status: number): string {
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (typeof obj.detail === "string") return obj.detail;
    const parts = Object.entries(obj).map(([key, value]) => {
      const text = Array.isArray(value) ? value.join(" ") : String(value);
      return key === "non_field_errors" ? text : `${key}: ${text}`;
    });
    if (parts.length) return parts.join(" | ");
  }
  return `İstek başarısız (${status})`;
}

/** 400 doğrulama hatasını { alan: "mesaj" } biçimine çevirir (formlarda alanın altında göstermek için). */
export function fieldErrors(error: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (
    error instanceof ApiError &&
    error.status === 400 &&
    error.data &&
    typeof error.data === "object"
  ) {
    for (const [key, value] of Object.entries(error.data)) {
      out[key] = Array.isArray(value) ? value.join(" ") : String(value);
    }
  }
  return out;
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Bilinmeyen hata";
}

function redirectToLogin() {
  if (window.location.pathname !== "/signin") {
    window.location.assign("/signin");
  }
}

// Aynı anda birden fazla 401 gelirse tek bir refresh isteği atılır.
let refreshing: Promise<boolean> | null = null;

function refreshAccessToken(): Promise<boolean> {
  const refresh = getRefreshToken();
  if (!refresh) return Promise.resolve(false);
  if (!refreshing) {
    refreshing = (async () => {
      try {
        const response = await fetch("/api/accounts/token/refresh/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh }),
        });
        if (!response.ok) return false;
        const data = await response.json();
        // ROTATE_REFRESH_TOKENS=True: yeni refresh gelir, eskisi blacklist'e düşer.
        saveTokens({ access: data.access, refresh: data.refresh ?? refresh });
        return true;
      } catch {
        return false;
      } finally {
        refreshing = null;
      }
    })();
  }
  return refreshing;
}

interface ApiOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  params?: QueryParams;
  /** false: Authorization başlığı eklenmez ve 401'de refresh denenmez (login için). */
  auth?: boolean;
}

export async function apiFetch<T = unknown>(
  path: string,
  { body, params, auth = true, headers, ...rest }: ApiOptions = {},
): Promise<T> {
  const url = "/api" + path + buildQuery(params);

  const isForm = body instanceof FormData;
  const send = () => {
    const token = auth ? getAccessToken() : null;
    return fetch(url, {
      ...rest,
      headers: {
        // FormData'da tarayıcı boundary'li Content-Type'ı kendisi koyar.
        ...(isForm ? {} : { "Content-Type": "application/json" }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body:
        body === undefined ? undefined : isForm ? body : JSON.stringify(body),
    });
  };

  let response = await send();

  if (response.status === 401 && auth) {
    if (await refreshAccessToken()) {
      response = await send();
    } else {
      clearAuth();
      redirectToLogin();
    }
  }

  // Silme başarılı olunca 204 döner ve gövde boştur.
  if (response.status === 204) return null as T;

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(
      messageFromData(data, response.status),
      response.status,
      data,
    );
  }
  return data as T;
}

export const api = {
  get: <T>(path: string, params?: QueryParams) =>
    apiFetch<T>(path, { method: "GET", params }),
  post: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: "POST", body: body ?? {} }),
  postForm: <T>(path: string, body: FormData) =>
    apiFetch<T>(path, { method: "POST", body }),
  patch: <T>(path: string, body: unknown) =>
    apiFetch<T>(path, { method: "PATCH", body }),
  put: <T>(path: string, body: unknown) =>
    apiFetch<T>(path, { method: "PUT", body }),
  delete: (path: string) => apiFetch<null>(path, { method: "DELETE" }),
};

/** Tüm sayfaları dolaşıp tek bir dizi döndürür (dropdown/lookup/takvim verisi için). */
export async function fetchAll<T>(
  path: string,
  params: QueryParams = {},
): Promise<T[]> {
  const items: T[] = [];
  for (let page = 1; ; page++) {
    const data = await api.get<Paginated<T>>(path, {
      ...params,
      page_size: 100,
      page,
    });
    items.push(...data.results);
    if (!data.next) break;
  }
  return items;
}

export async function signIn(
  username: string,
  password: string,
  remember: boolean,
) {
  const tokens = await apiFetch<{ access: string; refresh: string }>(
    "/accounts/login/",
    { method: "POST", body: { username, password }, auth: false },
  );
  saveLogin(tokens, username, remember);
}

export async function signOut() {
  const refresh = getRefreshToken();
  try {
    if (refresh) {
      await apiFetch("/accounts/token/logout/", {
        method: "POST",
        body: { refresh },
        auth: false,
      });
    }
  } catch {
    // Backend'e ulaşılamasa da yerel oturum kapatılır.
  } finally {
    clearAuth();
  }
}
