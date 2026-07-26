'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useLang } from '@/context/LanguageContext'
import { clearAuthData } from '@/lib/axios'
import { Lang } from '@/lib/translations'
import clsx from 'clsx'
import { toast } from 'sonner'
import ProfileModal from '@/components/ProfileModal'
import ChangePasswordModal from '@/components/ChangePasswordModal'
import { AppVersionDisplay } from '@/components/AppVersionDisplay'
import { useBrand } from '@/context/BrandContext'

const COMING_SOON_ITEMS = [
  { key: 'reportAndAnalytic', href: '/report-analytic', label: { th: 'รายงาน & วิเคราะห์', en: 'Report & Analytic' } },
]

const TENANT_ITEM = { key: 'tenant', href: '/business-setup/tenant', label: { th: 'Tenant', en: 'Tenant' } }

const SETTING_ITEM = { key: 'setting', href: '/setting', label: { th: 'Support & ตั้งค่า', en: 'Support & Setting' } }

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { t, lang, setLang } = useLang()
  const { brandName, logoUrl } = useBrand()
  const [loggingOut, setLoggingOut] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [modal, setModal] = useState<'profile' | 'changePassword' | null>(null)
  const [username, setUsername] = useState('User')

  useEffect(() => { setUsername(localStorage.getItem('username') || 'User') }, [])

  async function handleLogout() {
    setLoggingOut(true)
    clearAuthData()
    await fetch('/api/auth/logout', { method: 'POST' })
    toast.success(t.nav.logoutSuccess, { duration: 1500 })
    await new Promise((r) => setTimeout(r, 800))
    router.push('/login')
  }

  const displayName = brandName || 'PLEASE-ERP'

  return (
    <header className="bg-gradient-to-r from-primary-700 to-primary-600 shadow-lg z-30 relative">
      <div className="flex items-center h-14 px-4 gap-4">
        {/* Brand */}
        <Link href="/overview" className="flex items-center gap-2.5 flex-shrink-0">
          <img
            src={logoUrl || '/img/please-erp.svg'}
            alt={displayName}
            className="w-9 h-9 object-contain"
          />
          <div className="hidden sm:block">
            <p className="text-white font-bold text-sm leading-tight">{displayName}</p>
            <p className="text-primary-200 text-xs leading-tight">ERP</p>
          </div>
        </Link>

        <div className="hidden md:block w-px h-6 bg-white/20 flex-shrink-0" />

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-0.5 flex-nowrap">
          <Link href="/overview" className={clsx('flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors', pathname === '/overview' || pathname.startsWith('/overview/') ? 'bg-white/20 text-white' : 'text-white hover:bg-white/15')}>
            {t.nav.overview}
          </Link>
          <Link href={TENANT_ITEM.href} className={clsx('flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors', pathname.startsWith('/business-setup') ? 'bg-white/20 text-white' : 'text-white hover:bg-white/15')}>
            {lang === 'th' ? TENANT_ITEM.label.th : TENANT_ITEM.label.en}
          </Link>
          {COMING_SOON_ITEMS.map((item) => (
            <Link key={item.key} href={item.href} className={clsx('flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors', pathname.startsWith(item.href) ? 'bg-white/20 text-white' : 'text-white hover:bg-white/15')}>
              {lang === 'th' ? item.label.th : item.label.en}
              <span className="text-[10px] bg-white/15 text-white/70 px-1.5 py-0.5 rounded-full leading-tight">{t.nav.comingSoon}</span>
            </Link>
          ))}
          <Link href="/administrator/users" className={clsx('flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors', pathname.startsWith('/administrator') ? 'bg-white/20 text-white' : 'text-white hover:bg-white/15')}>
            {t.nav.administrator}
          </Link>
          <Link href={SETTING_ITEM.href} className={clsx('flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors', pathname.startsWith(SETTING_ITEM.href) ? 'bg-white/20 text-white' : 'text-white hover:bg-white/15')}>
            {lang === 'th' ? SETTING_ITEM.label.th : SETTING_ITEM.label.en}
            <span className="text-[10px] bg-white/15 text-white/70 px-1.5 py-0.5 rounded-full leading-tight">{t.nav.comingSoon}</span>
          </Link>
        </nav>

        {/* Right side */}
        <div className="ml-auto flex items-center gap-2 flex-shrink-0">
          <div className="hidden lg:flex items-center mr-1 pr-3 border-r border-white/10 h-8">
            <AppVersionDisplay />
          </div>

          {/* Language switcher */}
          <div className="hidden sm:flex items-center gap-1 bg-white/10 rounded-lg p-0.5">
            {(['th', 'en'] as Lang[]).map((l) => (
              <button key={l} onClick={() => setLang(l)} className={clsx('px-2.5 py-1 rounded-md text-xs font-medium transition-colors', lang === l ? 'bg-white/30 text-white' : 'text-white hover:text-white')}>
                {l === 'th' ? 'TH' : 'EN'}
              </button>
            ))}
          </div>

          {/* User menu */}
          <div className="relative">
            <button onClick={() => setUserMenuOpen((v) => !v)} className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-white hover:bg-white/15 transition-colors min-w-0 max-w-[180px]">
              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-xs uppercase flex-shrink-0">{username.charAt(0)}</div>
              <span className="hidden sm:block text-sm font-medium truncate">{username}</span>
              <svg className="w-3.5 h-3.5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
            </button>

            {userMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-1.5 w-52 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50">
                  <button onClick={() => { setUserMenuOpen(false); setModal('profile') }} className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    {t.nav.profile}
                  </button>
                  <button onClick={() => { setUserMenuOpen(false); setModal('changePassword') }} className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                    {t.nav.changePassword}
                  </button>

                  {/* Language — mobile */}
                  <div className="sm:hidden border-t border-gray-100 mt-1 pt-1">
                    <div className="flex items-center gap-1 px-4 py-2">
                      {(['th', 'en'] as Lang[]).map((l) => (
                        <button key={l} onClick={() => { setLang(l); setUserMenuOpen(false) }} className={clsx('flex-1 py-1 rounded-md text-xs font-medium transition-colors', lang === l ? 'bg-primary-100 text-primary-800' : 'text-gray-500 hover:text-gray-700')}>
                          {l === 'th' ? 'TH' : 'EN'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-gray-100 mt-1 pt-1">
                    <button onClick={handleLogout} disabled={loggingOut} className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                      {t.nav.logout}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Hamburger */}
          <button onClick={() => setMobileMenuOpen((v) => !v)} className="md:hidden p-1.5 text-white/70 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {mobileMenuOpen ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /> : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
        </div>
      </div>

      {/* Modals */}
      {modal === 'profile' && <ProfileModal onClose={() => setModal(null)} />}
      {modal === 'changePassword' && <ChangePasswordModal onClose={() => setModal(null)} />}

      {/* Mobile nav */}
      {mobileMenuOpen && (
        <nav className="md:hidden border-t border-white/10 px-3 pb-3 pt-2 flex flex-col gap-1">
          <Link href="/overview" onClick={() => setMobileMenuOpen(false)} className={clsx('flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors', pathname === '/overview' ? 'bg-white/20 text-white' : 'text-white hover:bg-white/15')}>
            {t.nav.overview}
          </Link>
          <Link href={TENANT_ITEM.href} onClick={() => setMobileMenuOpen(false)} className={clsx('flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors', pathname.startsWith('/business-setup') ? 'bg-white/20 text-white' : 'text-white hover:bg-white/15')}>
            {lang === 'th' ? TENANT_ITEM.label.th : TENANT_ITEM.label.en}
          </Link>
          {COMING_SOON_ITEMS.map((item) => (
            <Link key={item.key} href={item.href} onClick={() => setMobileMenuOpen(false)} className={clsx('flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors', pathname.startsWith(item.href) ? 'bg-white/20 text-white' : 'text-white hover:bg-white/15')}>
              <span>{lang === 'th' ? item.label.th : item.label.en}</span>
              <span className="text-xs bg-white/15 text-white/70 px-1.5 py-0.5 rounded-full">{t.nav.comingSoon}</span>
            </Link>
          ))}
          <Link href="/administrator/users" onClick={() => setMobileMenuOpen(false)} className={clsx('flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors', pathname.startsWith('/administrator') ? 'bg-white/20 text-white' : 'text-white hover:bg-white/15')}>
            {t.nav.administrator}
          </Link>
          <Link href={SETTING_ITEM.href} onClick={() => setMobileMenuOpen(false)} className={clsx('flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors', pathname.startsWith(SETTING_ITEM.href) ? 'bg-white/20 text-white' : 'text-white hover:bg-white/15')}>
            <span>{lang === 'th' ? SETTING_ITEM.label.th : SETTING_ITEM.label.en}</span>
            <span className="text-xs bg-white/15 text-white/70 px-1.5 py-0.5 rounded-full">{t.nav.comingSoon}</span>
          </Link>
        </nav>
      )}
    </header>
  )
}

function ErpLogoIcon({ className = '' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" fill="none" className={className}>
      <rect x="15" y="30" width="90" height="60" rx="8" fill="rgba(255,255,255,0.2)" />
      <rect x="25" y="42" width="30" height="8" rx="2" fill="white" fillOpacity="0.9" />
      <rect x="25" y="56" width="20" height="8" rx="2" fill="white" fillOpacity="0.6" />
      <rect x="25" y="70" width="25" height="8" rx="2" fill="white" fillOpacity="0.6" />
      <rect x="65" y="42" width="28" height="36" rx="4" fill="white" fillOpacity="0.15" />
      <rect x="70" y="50" width="18" height="4" rx="1" fill="white" fillOpacity="0.7" />
      <rect x="70" y="58" width="14" height="4" rx="1" fill="white" fillOpacity="0.5" />
      <rect x="70" y="66" width="16" height="4" rx="1" fill="white" fillOpacity="0.5" />
    </svg>
  )
}
