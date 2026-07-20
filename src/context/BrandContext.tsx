'use client'

import React, { createContext, useContext, useEffect, useLayoutEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { applyTheme, DEFAULT_THEME } from '@/lib/brand-themes'
import { resolveStorageUrl } from '@/lib/storage'
import type { ThemeName } from '@/lib/brand-themes'

export interface BrandConfigData {
  brandName?: string
  documentId?: string
  logoPath?: string
  logoMimeType?: string
  logoImageUrl?: string
  themeName?: string
}

export interface AdminConfig {
  configId?: string
  orgId?: string
  configType?: string
  status?: string
  createdDate?: string
  brandConfig?: BrandConfigData
}

interface BrandContextValue {
  config: AdminConfig | null
  loading: boolean
  logoUrl: string
  brandName: string
  refresh: () => void
}

const BrandContext = createContext<BrandContextValue>({ config: null, loading: true, logoUrl: '', brandName: '', refresh: () => {} })

export function useBrand() { return useContext(BrandContext) }

export function isConfigActive(config: AdminConfig | null): boolean {
  const s = config?.status?.toLowerCase() ?? ''
  return s === 'active' || s.startsWith('enable')
}

let cachedFaviconDataUrl: string | null = null

function setFaviconHref(dataUrl: string) {
  const links = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]'))
  if (links.length > 0) links.forEach((l) => { l.href = dataUrl })
  else {
    const link = document.createElement('link')
    link.rel = 'icon'; link.type = 'image/png'; link.href = dataUrl
    document.head.appendChild(link)
  }
}

function resetFavicon() {
  cachedFaviconDataUrl = null
  const href = `/img/please-erp.svg?_t=${Date.now()}`
  const links = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]'))
  if (links.length > 0) links.forEach((l) => { l.type = 'image/svg+xml'; l.href = href })
  else {
    const link = document.createElement('link'); link.rel = 'icon'; link.type = 'image/svg+xml'; link.href = href
    document.head.appendChild(link)
  }
}

function applyBrandToDOM(config: AdminConfig | null) {
  if (!config || !isConfigActive(config) || !config.brandConfig) {
    applyTheme(DEFAULT_THEME); document.title = 'PLEASE-ERP'; resetFavicon(); return
  }
  const { brandName, themeName } = config.brandConfig
  if (themeName) applyTheme(themeName as ThemeName)
  if (brandName) document.title = brandName
}

function applyFaviconDataUrl() {
  if (cachedFaviconDataUrl) { setFaviconHref(cachedFaviconDataUrl); return }
  fetch(`/api/brand-logo?_t=${Date.now()}`).then((r) => r.ok ? r.blob() : null).then((blob) => {
    if (!blob) return
    const reader = new FileReader()
    reader.onload = (e) => { const d = e.target?.result as string; if (!d) return; cachedFaviconDataUrl = d; setFaviconHref(d) }
    reader.readAsDataURL(blob)
  }).catch(() => {})
}

function BrandApplier({ config, loading, brandName }: { config: AdminConfig | null; loading: boolean; brandName: string }) {
  const pathname = usePathname()
  useLayoutEffect(() => {
    if (brandName) document.title = brandName
    if (config === null) return
    applyBrandToDOM(config)
    const active = isConfigActive(config) && !!config?.brandConfig?.logoImageUrl
    if (active) applyFaviconDataUrl(); else resetFavicon()
  }, [pathname, config, loading, brandName])
  return null
}

const CACHE_KEY = 'erpBrandDisplayCache'

export function BrandProvider({ children, initialConfig = null }: { children: React.ReactNode; initialConfig?: AdminConfig | null }) {
  const initActive = isConfigActive(initialConfig)
  const initName = initActive && initialConfig?.brandConfig?.brandName ? initialConfig.brandConfig.brandName : ''
  const rawInitLogoUrl = initActive && initialConfig?.brandConfig?.logoImageUrl ? initialConfig.brandConfig.logoImageUrl : ''

  const [config, setConfig] = useState<AdminConfig | null>(initialConfig)
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [cachedName, setCachedName] = useState(initName)
  const [cachedLogo, setCachedLogo] = useState('')

  useLayoutEffect(() => {
    setMounted(true)
    if (initialConfig !== null) {
      if (initActive && initialConfig.brandConfig) {
        const l = rawInitLogoUrl ? resolveStorageUrl(rawInitLogoUrl) : ''
        setCachedLogo(l)
        try { localStorage.setItem(CACHE_KEY, JSON.stringify({ n: initName, l })) } catch {}
      } else { try { localStorage.removeItem(CACHE_KEY) } catch {} }
    } else {
      try {
        const raw = localStorage.getItem(CACHE_KEY)
        if (raw) { const { n = '', l = '' } = JSON.parse(raw); if (n) { setCachedName(n); document.title = n } if (l) setCachedLogo(l) }
      } catch {}
    }
  }, [])

  async function load() {
    cachedFaviconDataUrl = null; setLoading(true)
    try {
      const res = await fetch('/api/proxy/admin-api/AdminConfiguration/org/global/action/GetBrandConfig', { cache: 'no-store' })
      const raw = res.ok ? await res.json() : null
      const data = raw ? ((raw?.configuration ?? raw?.data ?? raw) as AdminConfig) : null
      setConfig(data)
      if (data) {
        applyBrandToDOM(data)
        const active = isConfigActive(data) && !!data.brandConfig
        if (active) {
          const n = data.brandConfig!.brandName || ''; const l = data.brandConfig!.logoImageUrl ? resolveStorageUrl(data.brandConfig!.logoImageUrl) : ''
          setCachedName(n); setCachedLogo(l); try { localStorage.setItem(CACHE_KEY, JSON.stringify({ n, l })) } catch {}
        } else { setCachedName(''); setCachedLogo(''); try { localStorage.removeItem(CACHE_KEY) } catch {} }
      }
    } catch {}
    setLoading(false)
  }

  useEffect(() => { if (!initialConfig) load() }, [])

  const active = isConfigActive(config)
  const resolvedLogoUrl = mounted && active && config?.brandConfig?.logoImageUrl ? resolveStorageUrl(config.brandConfig.logoImageUrl) : ''
  const resolvedBrandName = active && config?.brandConfig?.brandName ? config.brandConfig.brandName : ''
  const logoUrl = (!mounted || loading || config === null) ? cachedLogo : resolvedLogoUrl
  const brandName = (loading || config === null) ? cachedName : resolvedBrandName

  return (
    <BrandContext.Provider value={{ config, loading, logoUrl, brandName, refresh: load }}>
      <BrandApplier config={config} loading={loading} brandName={brandName} />
      {children}
    </BrandContext.Provider>
  )
}
