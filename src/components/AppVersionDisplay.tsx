'use client'

export function AppVersionDisplay({ className = '' }: { className?: string }) {
  const version = process.env.NEXT_PUBLIC_APP_VERSION
  const year = new Date().getFullYear()
  return (
    <div className={`flex flex-col items-end justify-center text-right text-[11px] leading-tight text-white ${className}`}>
      {version && <span className="font-medium mb-0.5">version: {version}</span>}
      <span className="opacity-70">&copy; {year} All rights reserved.</span>
      <a
        href="https://dev-hubs.com"
        target="_blank"
        rel="noopener noreferrer"
        className="opacity-60 hover:opacity-100 transition-opacity mt-0.5"
      >
        Powered by Dev Hub
      </a>
    </div>
  )
}
