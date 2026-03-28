export function getAccessToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('access_token');
  }
  return null;
}

export function isAuthenticated(): boolean {
  return !!getAccessToken();
}
