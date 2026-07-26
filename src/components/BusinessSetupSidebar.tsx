'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import clsx from 'clsx'
import { useLang } from '@/context/LanguageContext'

export default function BusinessSetupSidebar() {
  const { t } = useLang()
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  const menuItems = [
    {
      href: '/business-setup/tenant',
      label: t.tenant.title,
      icon: (
        <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
    },
  ]

  return (
    <aside
      className={clsx(
        'relative flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out',
        'border-r border-white/10',
        collapsed ? 'w-14' : 'w-56'
      )}
      style={{ background: 'linear-gradient(180deg, rgb(var(--color-primary-800)) 0%, rgb(var(--color-primary-900)) 100%)' }}
    >
      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed((v) => !v)}
        className="absolute -right-3 top-5 z-10 w-6 h-6 rounded-full bg-primary-700 hover:bg-primary-600 flex items-center justify-center text-white shadow-lg transition-colors"
      >
        <svg
          className={clsx('w-3.5 h-3.5 transition-transform duration-300', collapsed ? 'rotate-180' : '')}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Section label */}
      {!collapsed && (
        <div className="px-4 pt-5 pb-3">
          <p className="text-xs font-semibold text-white/40 uppercase tracking-widest">Business Setup</p>
        </div>
      )}
      {collapsed && <div className="pt-5 pb-3" />}

      {/* Nav items */}
      <nav className="flex flex-col gap-1 px-2">
        {menuItems.map((item) => {
          const isActive = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                collapsed && 'justify-center px-2',
                isActive
                  ? 'bg-white/20 text-white'
                  : 'text-white/75 hover:bg-white/15 hover:text-white'
              )}
            >
              {item.icon}
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
