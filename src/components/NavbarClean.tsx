'use client'

import { useLang } from '@/context/LanguageContext'
import { Lang } from '@/lib/translations'
import { useBrand } from '@/context/BrandContext'

export default function NavbarClean() {
  const { lang, setLang } = useLang()
  const { logoUrl, brandName } = useBrand()

  return (
    <>
      <nav
        className="fixed top-0 left-0 right-0 z-50 h-16 shadow-lg"
        style={{ background: 'linear-gradient(135deg, rgb(var(--color-primary-800)) 0%, rgb(var(--color-primary-700)) 40%, rgb(var(--color-primary-500)) 100%)' }}
      >
        <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img src={logoUrl} alt="logo" className="h-8 w-auto object-contain flex-shrink-0" />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" fill="none" className="w-8 h-8 flex-shrink-0">
                <circle cx="60" cy="60" r="56" fill="white" fillOpacity="0.15" />
                <rect x="34" y="26" width="40" height="52" rx="4" stroke="white" strokeWidth="2.5" fill="none" />
                <line x1="42" y1="40" x2="66" y2="40" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="42" y1="50" x2="66" y2="50" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="42" y1="60" x2="58" y2="60" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            )}
            <div>
              <p className="font-bold text-white text-sm tracking-wide leading-none">{brandName || 'PLEASE-ERP'}</p>
              <p className="text-orange-200 text-xs leading-none mt-0.5">ERP</p>
            </div>
          </div>

          <div className="flex items-center gap-1 bg-white/10 rounded-lg p-0.5">
            {(['th', 'en'] as Lang[]).map(l => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${lang === l ? 'bg-white/30 text-white' : 'text-orange-300 hover:text-white'}`}
              >
                {l === 'th' ? 'TH' : 'EN'}
              </button>
            ))}
          </div>
        </div>
      </nav>
      <div className="h-16 w-full shrink-0" />
    </>
  )
}
