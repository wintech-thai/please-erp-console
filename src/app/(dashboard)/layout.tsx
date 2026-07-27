import DashboardLayoutClient from './_layout-client'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const isTenantMode = process.env.WEB_ROLE?.toUpperCase() === 'TENANT'
  return (
    <DashboardLayoutClient isTenantMode={isTenantMode}>
      {children}
    </DashboardLayoutClient>
  )
}
