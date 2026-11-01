'use client'

import { useState } from 'react'
import { Image as ImageIcon } from 'lucide-react'

// x013 ข้อ 7 : คลิกดูรูป item ได้จากรายการ item ใน stock-in/out/transfer
export default function ItemImageButton({ previewUrl, alt }: { previewUrl?: string | null; alt?: string }) {
  const [open, setOpen] = useState(false)
  if (!previewUrl) return null
  return (
    <>
      <button
        type="button"
        onClick={e => { e.stopPropagation(); setOpen(true) }}
        title={alt}
        className="p-1 rounded text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
      >
        <ImageIcon className="w-3.5 h-3.5" />
      </button>
      {open && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={e => { e.stopPropagation(); setOpen(false) }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt={alt || ''} className="max-w-[90vw] max-h-[90vh] rounded-xl shadow-2xl object-contain" onClick={e => e.stopPropagation()} />
        </div>
      )}
    </>
  )
}
