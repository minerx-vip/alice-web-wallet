export type AppLang = 'en' | 'zh-CN';

export const SUPPORTED_LANGS: AppLang[] = ['en', 'zh-CN'];
export const DEFAULT_LANG: AppLang = 'en';

const STORAGE_KEY = 'alice-lang';

export function normalizeLang(input: string | null | undefined): AppLang {
  if (!input) return DEFAULT_LANG;
  const lower = input.toLowerCase();
  if (lower === 'zh' || lower.startsWith('zh-')) return 'zh-CN';
  return 'en';
}

export function detectBrowserLang(): AppLang {
  if (typeof navigator === 'undefined') return DEFAULT_LANG;
  return normalizeLang(navigator.language);
}

export function getStoredLang(): AppLang | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return normalizeLang(raw);
  } catch {
    return null;
  }
}

export function setStoredLang(lang: AppLang): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // ignore
  }
}

export function getLangFromPathname(pathname: string): AppLang {
  const parts = pathname.split('/').filter(Boolean);
  const seg1 = parts[0];
  const seg2 = parts[1];
  if (seg1 === 'en' || seg1 === 'zh-CN') return seg1;
  if (seg1 === 'alice-web-wallet' && (seg2 === 'en' || seg2 === 'zh-CN')) return seg2;
  return DEFAULT_LANG;
}

export function getActiveLang(pathname: string): AppLang {
  const fromPath = getLangFromPathname(pathname);
  if (fromPath !== DEFAULT_LANG) return fromPath;
  return getStoredLang() ?? detectBrowserLang();
}

export function stripLangPrefix(pathname: string): string {
  const parts = pathname.split('/').filter(Boolean);
  if (parts[0] === 'en' || parts[0] === 'zh-CN') {
    return '/' + parts.slice(1).join('/');
  }
  if (parts[0] === 'alice-web-wallet' && (parts[1] === 'en' || parts[1] === 'zh-CN')) {
    return '/' + parts.slice(2).join('/');
  }
  return pathname || '/';
}

export function withLang(path: string, lang: AppLang): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  if (clean === '/') return `/${lang}`;
  return `/${lang}${clean}`;
}

export function switchLangPath(pathname: string, nextLang: AppLang): string {
  const rest = stripLangPrefix(pathname);
  return withLang(rest, nextLang);
}
