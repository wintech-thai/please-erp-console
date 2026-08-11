function detectWebRole(): string {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname
    // Production/staging: explicit hostname matching wins
    if (hostname.includes('tenant')) return 'TENANT'
    if (hostname.includes('admin')) return 'ADMIN'
    // Local dev (localhost): respect env var baked at build time
    return (process.env.NEXT_PUBLIC_WEB_ROLE as string) || 'ADMIN'
  }
  return process.env.NEXT_PUBLIC_WEB_ROLE || process.env.WEB_ROLE || 'ADMIN'
}

export const WEB_ROLE = detectWebRole()
export const isAdmin = WEB_ROLE === 'ADMIN'
export const apiBase = isAdmin ? 'admin-api' : 'api'
