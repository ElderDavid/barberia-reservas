const BASE = "https://sitio.invalid";

/**
 * The page to open after signing in. Only paths on this same site are kept: browsers read
 * `/\evil.com` or a tab-padded `//` as another host, so the check resolves the URL first.
 */
export function safeReturnPath(value: string | null | undefined): string {
  if (!value?.startsWith("/")) return "/cuenta";
  const url = new URL(value, BASE);
  return url.origin === BASE ? `${url.pathname}${url.search}${url.hash}` : "/cuenta";
}
