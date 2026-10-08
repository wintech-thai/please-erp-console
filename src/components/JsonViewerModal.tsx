'use client'

import { useState } from 'react'
import { X, Copy, Check, FileJson } from 'lucide-react'
import clsx from 'clsx'
import { useLang } from '@/context/LanguageContext'

const highlightJson = (json: unknown) =>
  JSON.stringify(json, null, 2).replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
    (match) => {
      let cls = 'text-amber-600'
      if (/^"/.test(match)) {
        if (/:$/.test(match)) cls = 'text-primary-700 font-semibold'
      } else if (/true|false/.test(match)) cls = 'text-primary-600 font-bold'
      else if (/null/.test(match)) cls = 'text-gray-400 italic'
      else if (!isNaN(Number(match))) cls = 'text-emerald-600'
      return `<span class="${cls}">${match}</span>`
    }
  )

interface Props {
  data: unknown
  title?: string
  onClose: () => void
}

export default function JsonViewerModal({ data, title, onClose }: Props) {
  const { t } = useLang()
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-primary-950/20 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden bg-white"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex-none flex items-center gap-3 px-5 py-4 bg-primary-600">
          <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center flex-none">
            <FileJson className="w-4 h-4 text-white" />
          </div>
          <h3 className="flex-1 text-sm font-bold text-white truncate">{title ?? t.common.rawJson}</h3>
          <button
            onClick={handleCopy}
            className={clsx(
              'flex items-center gap-1.5 text-[10px] font-bold uppercase px-3 py-1.5 rounded-md border transition-all',
              copied
                ? 'text-green-600 bg-white border-green-300'
                : 'text-gray-500 bg-white/90 border-gray-200 hover:text-primary-700 hover:border-primary-300 hover:bg-primary-50'
            )}
          >
            {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
            {copied ? t.common.copied : t.common.copy}
          </button>
          <button onClick={onClose} className="p-1.5 rounded-lg text-white/80 hover:bg-white/15 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-6 bg-gray-50">
          <pre
            className="text-xs font-mono leading-relaxed whitespace-pre-wrap break-all select-text text-gray-800"
            dangerouslySetInnerHTML={{ __html: highlightJson(data) }}
          />
        </div>
      </div>
    </div>
  )
}
