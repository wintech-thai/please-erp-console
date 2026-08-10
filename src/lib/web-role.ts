function detectWebRole(): string {
  // In local dev, NEXT_PUBLIC_WEB_ROLE is read from .env.local at dev-server start
  if (process.env.NEXT_PUBLIC_WEB_ROLE) return process.env.NEXT_PUBLIC_WEB_ROLE
  // In deployed Docker image, NEXT_PUBLIC_ is not baked in — detect from hostname at runtime
  if (typeof window !== 'undefined') {
    return window.location.hostname.includes('tenant') ? 'TENANT' : 'ADMIN'
  }
  return process.env.WEB_ROLE || 'ADMIN'
}

export const WEB_ROLE = detectWebRole()
export const isAdmin = WEB_ROLE === 'ADMIN'
export const apiBase = isAdmin ? 'admin-api' : 'api'
