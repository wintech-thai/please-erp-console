function detectWebRole(): string {
  // Browser: always detect from hostname — single Docker image serves both admin and tenant domains
  if (typeof window !== 'undefined') {
    return window.location.hostname.includes('tenant') ? 'TENANT' : 'ADMIN'
  }
  // Server-side (SSR): use env var
  return process.env.NEXT_PUBLIC_WEB_ROLE || process.env.WEB_ROLE || 'ADMIN'
}

export const WEB_ROLE = detectWebRole()
export const isAdmin = WEB_ROLE === 'ADMIN'
export const apiBase = isAdmin ? 'admin-api' : 'api'
