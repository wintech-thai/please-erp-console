'use client'

export function AppVersionDisplay({ className = '' }: { className?: string }) {
  const version = process.env.NEXT_PUBLIC_APP_VERSION
  const year = new Date().getFullYear()
  return (
    <div className={`flex flex-col items-end justify-center text-right text-[11px] leading-tight text-white ${className}`}>
      {version && <span className="font-medium mb-0.5">version: {version}</span>}
      <span className="opacity-70">&copy; {year} All rights reserved.</span>
    </div>
  )
}
