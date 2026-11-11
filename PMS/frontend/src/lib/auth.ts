// JWT token saklama. "Beni hatırla" işaretliyse localStorage (tarayıcı kapansa da kalır),
// değilse sessionStorage (sekme/tarayıcı kapanınca oturum biter).
const ACCESS_KEY = "pms_access";
const REFRESH_KEY = "pms_refresh";
const USER_KEY = "pms_user";

function activeStorage(): Storage | null {
  try {
    return (
      [localStorage, sessionStorage].find((s) => s.getItem(REFRESH_KEY)) ?? null
    );
  } catch {
    return null;
  }
}

export function getAccessToken(): string | null {
  return activeStorage()?.getItem(ACCESS_KEY) ?? null;
}

export function getRefreshToken(): string | null {
  return activeStorage()?.getItem(REFRESH_KEY) ?? null;
}

export function getUsername(): string {
  return activeStorage()?.getItem(USER_KEY) ?? "";
}

/** Oturum, refresh token varsa devam eder (access token süresi dolmuş olsa bile yenilenir). */
export function isAuthenticated(): boolean {
  return getRefreshToken() !== null;
}

export function saveLogin(
  tokens: { access: string; refresh: string },
  username: string,
  remember: boolean,
) {
  clearAuth();
  const storage = remember ? localStorage : sessionStorage;
  storage.setItem(ACCESS_KEY, tokens.access);
  storage.setItem(REFRESH_KEY, tokens.refresh);
  storage.setItem(USER_KEY, username);
}

/** Refresh sonrası yeni token'ları, oturumun tutulduğu depoya yazar. */
export function saveTokens(tokens: { access: string; refresh: string }) {
  const storage = activeStorage() ?? sessionStorage;
  storage.setItem(ACCESS_KEY, tokens.access);
  storage.setItem(REFRESH_KEY, tokens.refresh);
}

export function clearAuth() {
  for (const storage of [localStorage, sessionStorage]) {
    storage.removeItem(ACCESS_KEY);
    storage.removeItem(REFRESH_KEY);
    storage.removeItem(USER_KEY);
  }
}
