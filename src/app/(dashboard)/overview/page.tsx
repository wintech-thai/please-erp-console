'use client'

import { useState } from 'react'
import clsx from 'clsx'
import { LayoutDashboard } from 'lucide-react'
import { useLang } from '@/context/LanguageContext'
import InventoryOverviewSection from '@/components/overview/InventoryOverviewSection'
import SalesOverviewSection from '@/components/overview/SalesOverviewSection'

function todayLabel(locale: string) {
  return new Date().toLocaleDateString(locale, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

type OverviewTab = 'inventory' | 'sale'

// x013 ข้อ 10 / x014 ข้อ 7 : หน้าแรกของระบบ — แยกเป็น tab ต่อโมดูล (คลัง/ขาย) เพิ่มโมดูลใหม่
// ในอนาคตได้โดยสร้าง section component แยกแบบนี้แล้วเพิ่ม tab ใหม่ในนี้
export default function OverviewPage() {
  const { t, lang } = useLang()
  const ov = t.overview
  const [tab, setTab] = useState<OverviewTab>('inventory')
  return (
    <div className="flex-1 overflow-y-auto p-6 sm:p-8">
      <div
        className="relative overflow-hidden rounded-2xl px-6 py-7 sm:px-8 sm:py-8 mb-6 shadow-lg"
        style={{ background: 'linear-gradient(135deg, rgb(var(--color-primary-700)) 0%, rgb(var(--color-primary-900)) 100%)' }}
      >
        <div className="absolute -right-10 -top-10 w-56 h-56 rounded-full bg-white/5" />
        <div className="absolute right-16 bottom-0 w-32 h-32 rounded-full bg-white/5" />
        <div className="relative flex items-center gap-4">
          <div className="hidden sm:flex w-14 h-14 rounded-2xl bg-white/10 items-center justify-center flex-none ring-1 ring-white/20">
            <LayoutDashboard className="w-7 h-7 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-white">{t.overview.title}</h1>
            <p className="text-white/70 text-sm mt-1">{t.overview.subtitle} · {todayLabel(lang === 'th' ? 'th-TH' : 'en-US')}</p>
          </div>
        </div>
      </div>

      <div className="flex-none inline-flex items-center gap-1 p-1 mb-6 bg-gray-100 rounded-xl w-fit">
        <button
          type="button"
          onClick={() => setTab('inventory')}
          className={clsx(
            'px-4 py-2 text-sm font-semibold rounded-lg transition-colors',
            tab === 'inventory' ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          )}
        >
          {ov.tabInventory}
        </button>
        <button
          type="button"
          onClick={() => setTab('sale')}
          className={clsx(
            'px-4 py-2 text-sm font-semibold rounded-lg transition-colors',
            tab === 'sale' ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          )}
        >
          {ov.tabSale}
        </button>
      </div>

      {tab === 'inventory' ? <InventoryOverviewSection /> : <SalesOverviewSection />}
    </div>
  )
}
