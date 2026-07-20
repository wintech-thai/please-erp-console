export const WEB_ROLE = process.env.NEXT_PUBLIC_WEB_ROLE || 'ADMIN'
export const isAdmin = WEB_ROLE === 'ADMIN'
export const apiBase = isAdmin ? 'admin-api' : 'api'
