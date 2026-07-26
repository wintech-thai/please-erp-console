'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { useLang } from '@/context/LanguageContext'
import { useTenant } from '@/context/TenantContext'
import { clearAuthData } from '@/lib/axios'
import { Lang } from '@/lib/translations'
import clsx from 'clsx'
import { toast } from 'sonner'
import { ChevronDown, Building2 } from 'lucide-react'
import ProfileModal from '@/components/ProfileModal'
import ChangePasswordModal from '@/components/ChangePasswordModal'
import { AppVersionDisplay } from '@/components/AppVersionDisplay'
import { useBrand } from '@/context/BrandContext'

const NAV_ITEMS = [
  { key: 'overview', href: '/overview', labelKey: 'overview' as const },
  { key: 'business', href: '/business', labelKey: 'business' as const },
  { key: 'reportAnalytic', href: '/report-analytic', labelKey: 'reportAnalytic' as const },
  { key: 'administrator', href: '/administrator', labelKey: 'administrator' as const },
  { key: 'supportCase', href: '/support-case', labelKey: 'supportCase' as const },
]

export default function NavbarTenant() {
  const pathname = usePathname()
  const router = useRouter()
  const { t, lang, setLang } = useLang()
  const { brandName, logoUrl } = useBrand()
  const { allowedOrgs, selectedOrg, setSelectedOrg, loading } = useTenant()

  const [loggingOut, setLoggingOut] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [tenantMenuOpen, setTenantMenuOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [modal, setModal] = useState<'profile' | 'changePassword' | null>(null)
  const [username, setUsername] = useState('User')

  const tenantRef = useRef<HTMLDivElement>(null)
  const userRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setUsername(localStorage.getItem('username') || 'User') }, [])

  useEffect(() => {
    if (!tenantMenuOpen) return
    const handler = (e: MouseEvent) => {
      if (!tenantRef.current?.contains(e.target as Node)) setTenantMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [tenantMenuOpen])

  useEffect(() => {
    if (!userMenuOpen) return
    const handler = (e: MouseEvent) => {
      if (!userRef.current?.contains(e.target as Node)) setUserMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [userMenuOpen])

  async function handleLogout() {
    setLoggingOut(true)
    clearAuthData()
    await fetch('/api/auth/logout', { method: 'POST' })
    toast.success(t.nav.logoutSuccess, { duration: 1500 })
    await new Promise((r) => setTimeout(r, 800))
    router.push('/login')
  }

  const displayName = brandName || 'PLEASE-ERP'
  const selectedLabel = selectedOrg
    ? (selectedOrg.orgCustomId || selectedOrg.orgId || selectedOrg.orgName || '—')
    : t.nav.selectTenant

  return (
    <header className="bg-gradient-to-r from-primary-700 to-primary-600 shadow-lg z-30 relative">
      <div className="flex items-center h-14 px-4 gap-3">

        {/* Brand */}
        <Link href="/overview" className="flex items-center gap-2 flex-shrink-0">
          <img
            src={logoUrl || '/img/please-erp.svg'}
            alt={displayName}
            className="w-8 h-8 object-contain"
          />
          <div className="hidden sm:block">
            <p className="text-white font-bold text-sm leading-tight">{displayName}</p>
            <p className="text-primary-200 text-[10px] leading-tight">ERP</p>
          </div>
        </Link>

        <div className="hidden md:block w-px h-6 bg-white/20 flex-shrink-0" />

        {/* Tenant selector */}
        <div ref={tenantRef} className="relative flex-shrink-0">
          <button
            onClick={() => setTenantMenuOpen(v => !v)}
            disabled={loading}
            className="flex items-center gap-2 bg-white/15 hover:bg-white/25 border border-white/20 rounded-lg px-3 py-1.5 text-white text-sm font-semibold transition-colors disabled:opacity-60 min-w-[120px] max-w-[200px]"
          >
            <Building2 className="w-3.5 h-3.5 opacity-80 flex-shrink-0" />
            <span className="truncate flex-1 text-left">{loading ? '...' : selectedLabel}</span>
            <ChevronDown className={clsx('w-3.5 h-3.5 opacity-70 flex-shrink-0 transition-transform', tenantMenuOpen && 'rotate-180')} />
          </button>

          {tenantMenuOpen && (
            <div className="absolute left-0 top-full mt-1.5 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50 max-h-72 overflow-y-auto">
              {allowedOrgs.length === 0 ? (
                <p className="px-4 py-3 text-sm text-gray-400 text-center">{t.nav.noTenantAvailable}</p>
              ) : (
                allowedOrgs.map(org => {
                  const orgKey = org.orgCustomId ?? org.orgId ?? ''
                  const selectedKey = selectedOrg ? (selectedOrg.orgCustomId ?? selectedOrg.orgId ?? '') : ''
                  const isSelected = orgKey === selectedKey
                  return (
                    <button
                      key={orgKey}
                      onClick={() => { setSelectedOrg(org); setTenantMenuOpen(false) }}
                      className={clsx(
                        'flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-left transition-colors',
                        isSelected ? 'text-primary-700 font-semibold bg-primary-50' : 'text-gray-700 hover:bg-gray-50'
                      )}
                    >
                      <Building2 className={clsx('w-3.5 h-3.5 flex-shrink-0', isSelected ? 'text-primary-600' : 'text-gray-400')} />
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{org.orgCustomId || org.orgId}</p>
                        {org.orgName && <p className="text-xs text-gray-400 truncate">{org.orgName}</p>}
                      </div>
                      {isSelected && (
                        <svg className="w-4 h-4 text-primary-600 ml-auto flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  )
                })
              )}
            </div>
          )}
        </div>

        <div className="hidden md:block w-px h-6 bg-white/20 flex-shrink-0" />

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-0.5 flex-nowrap flex-1 min-w-0 overflow-hidden">
          {NAV_ITEMS.map(item => (
            <Link
              key={item.key}
              href={item.href}
              className={clsx(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0',
                pathname.startsWith(item.href) ? 'bg-white/20 text-white' : 'text-white hover:bg-white/15'
              )}
            >
              {t.nav[item.labelKey]}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="ml-auto flex items-center gap-2 flex-shrink-0">
          <div className="hidden lg:flex items-center mr-1 pr-3 border-r border-white/10 h-8">
            <AppVersionDisplay />
          </div>

          {/* Language */}
          <div className="hidden sm:flex items-center gap-1 bg-white/10 rounded-lg p-0.5">
            {(['th', 'en'] as Lang[]).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={clsx('px-2.5 py-1 rounded-md text-xs font-medium transition-colors', lang === l ? 'bg-white/30 text-white' : 'text-white hover:text-white')}
              >
                {l === 'th' ? 'TH' : 'EN'}
              </button>
            ))}
          </div>

          {/* User menu */}
          <div ref={userRef} className="relative">
            <button
              onClick={() => setUserMenuOpen(v => !v)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-white hover:bg-white/15 transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-xs uppercase flex-shrink-0">
                {username.charAt(0)}
              </div>
              <span className="hidden sm:block text-sm font-medium truncate max-w-[200px]">{username}</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-60" />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-52 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50">
                <button
                  onClick={() => { setUserMenuOpen(false); setModal('profile') }}
                  className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  {t.nav.profile}
                </button>
                <button
                  onClick={() => { setUserMenuOpen(false); setModal('changePassword') }}
                  className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                  {t.nav.changePassword}
                </button>

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
                  <button
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    {t.nav.logout}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Hamburger */}
          <button
            onClick={() => setMobileMenuOpen(v => !v)}
            className="md:hidden p-1.5 text-white/70 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {mobileMenuOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />}
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
          {/* Tenant selector mobile */}
          <div className="px-3 py-2">
            <p className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-2">{t.nav.selectTenant}</p>
            <div className="flex flex-col gap-1">
              {allowedOrgs.map(org => {
                const orgKey = org.orgCustomId ?? org.orgId ?? ''
                const selectedKey = selectedOrg ? (selectedOrg.orgCustomId ?? selectedOrg.orgId ?? '') : ''
                const isSelected = orgKey === selectedKey
                return (
                  <button
                    key={orgKey}
                    onClick={() => { setSelectedOrg(org); setMobileMenuOpen(false) }}
                    className={clsx(
                      'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors w-full text-left',
                      isSelected ? 'bg-white/20 text-white font-semibold' : 'text-white/80 hover:bg-white/10'
                    )}
                  >
                    <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
                    {org.orgCustomId || org.orgId}
                    {org.orgName && <span className="text-xs text-white/60 ml-1">{org.orgName}</span>}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="border-t border-white/10 pt-1">
            {NAV_ITEMS.map(item => (
              <Link
                key={item.key}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={clsx(
                  'flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  pathname.startsWith(item.href) ? 'bg-white/20 text-white' : 'text-white hover:bg-white/15'
                )}
              >
                {t.nav[item.labelKey]}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  )
}
