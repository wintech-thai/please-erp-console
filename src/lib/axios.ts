import axios, { AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios'
import { toast } from 'sonner'

export const client = axios.create({
  baseURL: '/api/proxy',
  headers: { 'Content-Type': 'application/json' },
})

let isRefreshing = false
let activeRefreshPromise: Promise<string | null> | null = null
let failedQueue: Array<{ resolve: (token: string) => void; reject: (error: unknown) => void }> = []

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token!)))
  failedQueue = []
}

async function refreshTokenOnce(): Promise<string | null> {
  if (activeRefreshPromise) return activeRefreshPromise
  isRefreshing = true
  activeRefreshPromise = (async () => {
    try {
      const res = await fetch('/api/auth/refresh', { method: 'POST' })
      if (!res.ok) throw new Error('Refresh failed')
      const data = await res.json()
      const newToken: string = data.accessToken
      if (!newToken) throw new Error('No access token')
      localStorage.setItem('accessToken', newToken)
      if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken)
      setAuthCookies(newToken, data.refreshToken)
      processQueue(null, newToken)
      return newToken
    } catch (err) {
      processQueue(err, null)
      return null
    } finally {
      isRefreshing = false
      activeRefreshPromise = null
    }
  })()
  return activeRefreshPromise
}

function getTokenExpiry(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return typeof payload.exp === 'number' ? payload.exp : null
  } catch {
    return null
  }
}

const encodeBase64 = (str: string): string => {
  try { return typeof window !== 'undefined' ? window.btoa(str) : Buffer.from(str).toString('base64') }
  catch { return str }
}

export const setAuthCookies = (accessToken: string, refreshToken?: string) => {
  if (typeof document === 'undefined') return
  document.cookie = `accessToken=${accessToken}; path=/; max-age=86400; SameSite=Lax`
  if (refreshToken) document.cookie = `refreshToken=${refreshToken}; path=/; max-age=604800; SameSite=Lax`
}

export const clearAuthData = () => {
  if (typeof window === 'undefined') return
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
  localStorage.removeItem('username')
  localStorage.removeItem('userId')
  localStorage.removeItem('orgId')
  document.cookie = 'accessToken=; path=/; max-age=0; SameSite=Lax'
  document.cookie = 'refreshToken=; path=/; max-age=0; SameSite=Lax'
  document.cookie = 'user_name=; path=/; max-age=0; SameSite=Lax'
  document.cookie = 'orgId=; path=/; max-age=0; SameSite=Lax'
}

client.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    if (typeof window === 'undefined') return config
    if (config.url?.toLowerCase().includes('login')) return config
    if (isRefreshing && activeRefreshPromise) {
      const fresh = await activeRefreshPromise.catch(() => null)
      const t = fresh ?? localStorage.getItem('accessToken')
      if (t && config.headers && !config.headers.Authorization) config.headers.Authorization = `Bearer ${encodeBase64(t)}`
      return config
    }
    const token = localStorage.getItem('accessToken')
    if (!token) return config
    const exp = getTokenExpiry(token)
    if (exp !== null && exp - Math.floor(Date.now() / 1000) < 10) {
      const fresh = await refreshTokenOnce().catch(() => null)
      if (config.headers) config.headers.Authorization = `Bearer ${encodeBase64(fresh ?? token)}`
      return config
    }
    if (config.headers && !config.headers.Authorization) config.headers.Authorization = `Bearer ${encodeBase64(token)}`
    return config
  },
  (error) => Promise.reject(error)
)

client.interceptors.response.use(
  (response: AxiosResponse) => {
    const data = response.data
    if (!data) return response
    const { status, description, message } = data
    if (status === undefined || status === null) return response
    const statusUpper = typeof status === 'string' ? status.toUpperCase().replace(/\s+/g, '_') : ''
    const isScreamingCase = typeof status === 'string' && /^[A-Z][A-Z0-9_]*$/.test(status)
    const ENVELOPE = new Set(['OK','SUCCESS','ERROR','FAILED','UNAUTHORIZED','FORBIDDEN','NOT_FOUND','VALIDATION_ERROR','BAD_REQUEST','INTERNAL_SERVER_ERROR'])
    const isEnvelope = isScreamingCase || ENVELOPE.has(statusUpper) || statusUpper.startsWith('ERROR_') || statusUpper.startsWith('FAILED_')
    if (!isEnvelope) return response
    if (statusUpper === 'OK' || statusUpper === 'SUCCESS') return response
    const msg = description || message || `Operation failed: ${statusUpper}`
    return Promise.reject(new AxiosError(msg, statusUpper, response.config, response.request, response))
  },
  async (error: AxiosError) => {
    const orig = error.config as InternalAxiosRequestConfig & { _retry?: boolean; _retryCount?: number }
    const errResp = error.response
    const errData = errResp?.data as Record<string, unknown> | string | undefined
    const status = errResp?.status
    const url = orig?.url?.toLowerCase() || ''

    if (status === 429) {
      orig._retryCount = (orig._retryCount || 0) + 1
      if (orig._retryCount <= 3) return new Promise((res) => setTimeout(() => res(client(orig)), orig._retryCount! * 1000))
      toast.error('Too many requests. Please wait.')
      return Promise.reject(error)
    }
    if (url.includes('login')) return Promise.reject(error)
    if (status === 403) return Promise.reject(new AxiosError(`Access denied (403) — ${orig?.url}`, 'FORBIDDEN', orig, error.request, errResp))

    const rawStr = typeof errData === 'string' ? errData : typeof (errData as Record<string, unknown>)?.raw === 'string' ? (errData as Record<string, unknown>).raw as string : ''
    const isExpired = status === 401 || error.code === 'ERROR_TOKEN_EXPIRED' || rawStr.includes('expired')

    if (!isExpired || !orig || orig._retry) {
      const msg = typeof errData === 'object' && errData !== null
        ? ((errData as Record<string, unknown>).description as string | undefined) || ((errData as Record<string, unknown>).message as string | undefined)
        : typeof errData === 'string' ? errData : undefined
      if (msg) return Promise.reject(new AxiosError(msg, String(status ?? ''), orig, error.request, errResp))
      return Promise.reject(error)
    }

    if (isRefreshing && activeRefreshPromise) {
      return new Promise<string>((res, rej) => { failedQueue.push({ resolve: res, reject: rej }) })
        .then((token) => { if (orig.headers) orig.headers.Authorization = `Bearer ${encodeBase64(token)}`; return client(orig) })
    }

    orig._retry = true
    const newToken = await refreshTokenOnce()
    if (!newToken) { clearAuthData(); if (typeof window !== 'undefined') window.location.href = '/login'; return Promise.reject(new Error('Session expired')) }
    if (orig.headers) orig.headers.Authorization = `Bearer ${encodeBase64(newToken)}`
    return client(orig)
  }
)
