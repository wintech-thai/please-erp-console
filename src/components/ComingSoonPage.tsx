'use client'

import { useLang } from '@/context/LanguageContext'

interface Props {
  titleEn: string
  titleTh: string
}

export default function ComingSoonPage({ titleEn, titleTh }: Props) {
  const { lang } = useLang()
  const title = lang === 'th' ? titleTh : titleEn

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8">
      <div className="text-center max-w-sm">
        <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{title}</h1>
        <p className="text-gray-400 text-sm">{lang === 'th' ? 'เร็วๆ นี้' : 'Coming Soon'}</p>
      </div>
    </div>
  )
}
