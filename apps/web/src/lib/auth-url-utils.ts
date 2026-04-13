function readQueryParamFromUrl(name: string) {
  const searchParams = new URLSearchParams(window.location.search);
  const value = searchParams.get(name);
  return value?.trim() ? value : null;
}

export function readInviteTokenFromUrl() {
  return readQueryParamFromUrl("invite");
}

export function readAuthErrorFromUrl() {
  return readQueryParamFromUrl("authError");
}

function clearQueryParamFromUrl(name: string) {
  const nextUrl = new URL(window.location.href);
  nextUrl.searchParams.delete(name);
  const nextPath = `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`;
  window.history.replaceState(null, "", nextPath);
}

export function clearInviteTokenFromUrl() {
  clearQueryParamFromUrl("invite");
}

export function clearAuthErrorFromUrl() {
  clearQueryParamFromUrl("authError");
}
