function detectWebRole(): string {
  if (typeof window !== 'undefined') {
    return window.location.hostname.includes('tenant') ? 'TENANT' : 'ADMIN'
  }
  return process.env.WEB_ROLE || process.env.NEXT_PUBLIC_WEB_ROLE || 'ADMIN'
}

export const WEB_ROLE = detectWebRole()
export const isAdmin = WEB_ROLE === 'ADMIN'
export const apiBase = isAdmin ? 'admin-api' : 'api'
