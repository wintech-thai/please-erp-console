'use client'

import { LayoutDashboard } from 'lucide-react'
import { useLang } from '@/context/LanguageContext'
import InventoryOverviewSection from '@/components/overview/InventoryOverviewSection'

function todayLabel(locale: string) {
  return new Date().toLocaleDateString(locale, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

// x013 ข้อ 10 : หน้าแรกของระบบ — ตอนนี้มีแค่โมดูลคลัง พอมีโมดูลอื่น (ซื้อ/ขาย) ในอนาคต
// ให้เพิ่ม section component ของโมดูลนั้นต่อท้ายในนี้ได้เลย
export default function OverviewPage() {
  const { t, lang } = useLang()
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

      <InventoryOverviewSection />
    </div>
  )
}
