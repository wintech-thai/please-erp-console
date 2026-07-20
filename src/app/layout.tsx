import type { Metadata, Viewport } from 'next'
import { Toaster } from 'sonner'
import { BrandProvider, type AdminConfig } from '@/context/BrandContext'
import './globals.css'

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || ''
const APP_TYPE = 'PLEASE-ERP'

async function fetchInitialBrandConfig(): Promise<AdminConfig | null> {
  try {
    const res = await fetch(
      `${BACKEND_URL}/admin-api/AdminConfiguration/org/global/action/GetBrandConfig`,
      { method: 'GET', headers: { 'Content-Type': 'application/json', 'Onix-Application-Type': APP_TYPE }, cache: 'no-store' }
    )
    if (!res.ok) return null
    const raw = await res.json()
    return (raw?.configuration ?? raw?.data ?? raw) as AdminConfig
  } catch { return null }
}

export async function generateMetadata(): Promise<Metadata> {
  const config = await fetchInitialBrandConfig()
  const s = config?.status?.toLowerCase() ?? ''
  const active = s === 'active' || s.startsWith('enable')
  const title = active && config?.brandConfig?.brandName ? config.brandConfig.brandName : 'PLEASE-ERP'
  return {
    title,
    description: 'Please ERP - Enterprise Resource Planning',
    icons: { icon: '/img/please-erp.svg', shortcut: '/img/please-erp.svg' },
  }
}

export const viewport: Viewport = { width: 'device-width', initialScale: 1 }

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const initialConfig = await fetchInitialBrandConfig()
  return (
    <html lang="th" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            var root = document.documentElement;
            var tn = localStorage.getItem('brandThemeName');
            if (tn) root.setAttribute('data-theme', tn);
            var v = localStorage.getItem('brandThemeVars');
            if (v) { var vars = JSON.parse(v); Object.keys(vars).forEach(function(k){ root.style.setProperty(k, vars[k]); }); }
          } catch(e) {}
        `}} />
      </head>
      <body>
        <BrandProvider initialConfig={initialConfig}>
          {children}
        </BrandProvider>
        <Toaster
          position="top-right"
          richColors
          closeButton
          toastOptions={{ style: { fontFamily: "'Prompt', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" } }}
        />
      </body>
    </html>
  )
}
