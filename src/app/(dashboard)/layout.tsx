'use client'

import { LanguageProvider } from '@/context/LanguageContext'
import { TenantProvider } from '@/context/TenantContext'
import Navbar from '@/components/Navbar'
import NavbarTenant from '@/components/NavbarTenant'

const WEB_ROLE = process.env.NEXT_PUBLIC_WEB_ROLE?.toUpperCase()
const IS_TENANT_MODE = WEB_ROLE === 'TENANT'

function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      {IS_TENANT_MODE ? <NavbarTenant /> : <Navbar />}
      <main className="flex-1 flex flex-col overflow-hidden">{children}</main>
    </div>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      {IS_TENANT_MODE ? (
        <TenantProvider>
          <DashboardShell>{children}</DashboardShell>
        </TenantProvider>
      ) : (
        <DashboardShell>{children}</DashboardShell>
      )}
    </LanguageProvider>
  )
}
