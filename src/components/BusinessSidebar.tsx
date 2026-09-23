'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useState, Suspense } from 'react'
import clsx from 'clsx'
import { useLang } from '@/context/LanguageContext'

const GENERAL_INFO_ITEMS = [
  {
    href: '/business/company-profile',
    labelKey: 'companyProfile' as const,
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  },
  {
    href: '/business/document-number',
    labelKey: 'documentNumber' as const,
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
]

const INVENTORY_ITEMS = [
  {
    href: '/business/inventory/locations',
    labelKey: 'inventoryLocation' as const,
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 7l9-4 9 4-9 4-9-4zm0 0v10l9 4m0-14v14m9-14v10l-9 4" />
      </svg>
    ),
  },
  {
    href: '/business/inventory/items',
    labelKey: 'inventoryItem' as const,
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
  },
  {
    href: '/business/inventory/stock-in',
    labelKey: 'stockIn' as const,
    dividerBefore: true,
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v12m0 0l-4-4m4 4l4-4M4 20h16" />
      </svg>
    ),
  },
  {
    href: '/business/inventory/stock-out',
    labelKey: 'stockOut' as const,
    comingSoon: true,
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 20V8m0 0l-4 4m4-4l4 4M4 4h16" />
      </svg>
    ),
  },
  {
    href: '/business/inventory/stock-transfer',
    labelKey: 'stockTransfer' as const,
    comingSoon: true,
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h13m0 0l-4-4m4 4l-4 4M20 17H7m0 0l4 4m-4-4l4-4" />
      </svg>
    ),
  },
]

const MASTER_DATA_REFS = [
  { refType: 'LocationType', labelKey: 'locationType' as const },
  { refType: 'ItemType',     labelKey: 'itemType'     as const },
  { refType: 'ItemUnit',     labelKey: 'itemUnit'     as const },
  { refType: 'Project',      labelKey: 'project'      as const },
]

const DB_ICON = (
  <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582 4 8-4s8 1.79 8 4" />
  </svg>
)

// Inner component needs useSearchParams → must be under Suspense
function MasterDataSubNav({ collapsed }: { collapsed: boolean }) {
  const { t } = useLang()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const typeFromPath = MASTER_DATA_REFS.find(({ refType }) => pathname.includes(`/master-data/${refType}`))?.refType
  const typeParam = typeFromPath ?? searchParams.get('type') ?? 'LocationType'
  const [expanded, setExpanded] = useState(true)

  return (
    <div className="flex flex-col gap-0.5 px-2">
      {/* Inventory group header — clickable */}
      <button
        onClick={() => setExpanded(v => !v)}
        className={clsx(
          'flex items-center gap-3 px-3 py-2.5 rounded-lg w-full text-sm font-medium transition-colors',
          collapsed ? 'justify-center px-2' : '',
          'text-white/75 hover:bg-white/15 hover:text-white'
        )}
      >
        <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582 4 8-4s8 1.79 8 4" />
        </svg>
        {!collapsed && (
          <>
            <span className="flex-1 text-left">{t.masterData.inventory}</span>
            <svg
              className={clsx('w-3.5 h-3.5 flex-shrink-0 transition-transform duration-200', expanded ? 'rotate-0' : '-rotate-90')}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </>
        )}
      </button>

      {/* Sub-items */}
      {expanded && (
        <div className={clsx(!collapsed && 'ml-3 pl-2 border-l border-white/10')}>
          {MASTER_DATA_REFS.map(({ refType, labelKey }) => {
            const isActive = typeParam === refType
            return (
              <Link
                key={refType}
                href={`/business/master-data?type=${refType}`}
                title={collapsed ? t.masterData[labelKey] : undefined}
                className={clsx(
                  'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  collapsed && 'justify-center px-2',
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'text-white/70 hover:bg-white/15 hover:text-white'
                )}
              >
                {collapsed && DB_ICON}
                {!collapsed && <span className="truncate">{t.masterData[labelKey]}</span>}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function BusinessSidebar() {
  const { t } = useLang()
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  const isMasterData = pathname.startsWith('/business/master-data')
  const isInventory = pathname.startsWith('/business/inventory')
  const sectionLabel = isInventory ? t.nav.inventory : isMasterData ? t.nav.masterData : t.nav.generalInfo
  const items = isInventory ? INVENTORY_ITEMS : isMasterData ? [] : GENERAL_INFO_ITEMS

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

      {!collapsed && (
        <div className="px-4 pt-5 pb-3">
          <p className="text-xs font-semibold text-white/40 uppercase tracking-widest">{sectionLabel}</p>
        </div>
      )}
      {collapsed && <div className="pt-5 pb-3" />}

      <nav className="flex flex-col gap-1 px-2">
        {items.map((item) => {
          const isActive = pathname.startsWith(item.href)
          const dividerBefore = 'dividerBefore' in item && item.dividerBefore
          const comingSoon = 'comingSoon' in item && item.comingSoon
          return (
            <div key={item.href}>
              {dividerBefore && !collapsed && <div className="my-1.5 border-t border-white/10" />}
              <Link
                href={item.href}
                title={collapsed ? t.nav[item.labelKey] : undefined}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  collapsed && 'justify-center px-2',
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'text-white/75 hover:bg-white/15 hover:text-white'
                )}
              >
                {item.icon}
                {!collapsed && (
                  comingSoon ? (
                    <span className="flex flex-col flex-1 min-w-0 leading-tight">
                      <span className="truncate">{t.nav[item.labelKey]}</span>
                      <span className="text-[9px] font-semibold uppercase tracking-wide text-white/45">
                        {t.nav.comingSoon}
                      </span>
                    </span>
                  ) : (
                    <span className="truncate flex-1 min-w-0">{t.nav[item.labelKey]}</span>
                  )
                )}
              </Link>
            </div>
          )
        })}
      </nav>

      {isMasterData && (
        <Suspense fallback={null}>
          <MasterDataSubNav collapsed={collapsed} />
        </Suspense>
      )}
    </aside>
  )
}
