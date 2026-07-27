'use client'

import { LanguageProvider } from '@/context/LanguageContext'
import { TenantProvider } from '@/context/TenantContext'
import { IsAdminProvider } from '@/context/IsAdminContext'
import Navbar from '@/components/Navbar'
import NavbarTenant from '@/components/NavbarTenant'

function DashboardShell({ isTenantMode, children }: { isTenantMode: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      {isTenantMode ? <NavbarTenant /> : <Navbar />}
      <main className="flex-1 flex flex-col overflow-hidden">{children}</main>
    </div>
  )
}

export default function DashboardLayoutClient({
  isTenantMode,
  children,
}: {
  isTenantMode: boolean
  children: React.ReactNode
}) {
  return (
    <IsAdminProvider isAdmin={!isTenantMode}>
      <LanguageProvider>
        {isTenantMode ? (
          <TenantProvider>
            <DashboardShell isTenantMode={isTenantMode}>{children}</DashboardShell>
          </TenantProvider>
        ) : (
          <DashboardShell isTenantMode={isTenantMode}>{children}</DashboardShell>
        )}
      </LanguageProvider>
    </IsAdminProvider>
  )
}
