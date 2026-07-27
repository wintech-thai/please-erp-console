export const WEB_ROLE = process.env.WEB_ROLE || 'ADMIN'
export const isAdmin = WEB_ROLE === 'ADMIN'
export const apiBase = isAdmin ? 'admin-api' : 'api'
