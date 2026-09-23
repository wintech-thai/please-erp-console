'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { ChevronDown, Search, Check } from 'lucide-react'
import clsx from 'clsx'

export interface SearchableOption {
  code: string
  label: string
  sublabel?: string
}

interface Props {
  options: SearchableOption[]
  value: string
  onChange: (code: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

// Generic search-as-you-type dropdown — the app's standing UX requirement for any list
// large enough that scanning a plain <select> isn't practical.
export default function SearchableSelect({ options, value, onChange, placeholder, disabled, className }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selected = options.find(o => o.code === value)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  useEffect(() => {
    if (open) { setQuery(''); requestAnimationFrame(() => inputRef.current?.focus()) }
  }, [open])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter(o =>
      o.code.toLowerCase().includes(q) || o.label.toLowerCase().includes(q) || o.sublabel?.toLowerCase().includes(q)
    )
  }, [options, query])

  return (
    <div ref={ref} className={clsx('relative', className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(v => !v)}
        className={clsx(
          'w-full flex items-center justify-between gap-2 px-4 py-2.5 text-sm border border-gray-200 rounded-lg bg-white text-left transition-colors',
          disabled ? 'opacity-60 cursor-not-allowed bg-gray-50' : 'hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500'
        )}
      >
        <span className={clsx('truncate', !selected && 'text-gray-400')}>
          {selected ? (selected.label || selected.code) : (placeholder || '—')}
        </span>
        <ChevronDown className={clsx('w-4 h-4 text-gray-400 flex-none transition-transform', open && 'rotate-180')} />
      </button>

      {open && !disabled && (
        <div className="absolute left-0 top-full mt-1.5 w-full min-w-64 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100">
            <Search className="w-4 h-4 text-gray-400 flex-none" />
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search..."
              className="flex-1 text-sm outline-none text-gray-700 placeholder-gray-400"
            />
          </div>
          <div className="max-h-64 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-400 text-center">No results</div>
            ) : filtered.map(o => (
              <button
                key={o.code}
                type="button"
                onClick={() => { onChange(o.code); setOpen(false) }}
                className={clsx(
                  'w-full flex items-center gap-2 px-4 py-2 text-sm text-left transition-colors',
                  o.code === value ? 'bg-primary-50 text-primary-700 font-semibold' : 'text-gray-700 hover:bg-gray-50'
                )}
              >
                <span className="flex-1 min-w-0 truncate">
                  {o.label || o.code}
                  {o.sublabel && <span className="text-gray-400 font-normal"> · {o.sublabel}</span>}
                </span>
                {o.code === value && <Check className="w-3.5 h-3.5 flex-none" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
