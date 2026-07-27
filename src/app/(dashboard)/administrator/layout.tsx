import AdminSidebar from '@/components/AdminSidebar'
import ComingSoonPage from '@/components/ComingSoonPage'

const IS_TENANT_MODE = process.env.WEB_ROLE?.toUpperCase() === 'TENANT'

export default function AdministratorLayout({ children }: { children: React.ReactNode }) {
  if (IS_TENANT_MODE) {
    return (
      <div className="flex flex-1 overflow-hidden">
        <ComingSoonPage titleEn="Administrator" titleTh="ผู้ดูแลระบบ" />
      </div>
    )
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      <AdminSidebar />
      <div className="flex-1 overflow-y-auto p-3 sm:p-6">
        {children}
      </div>
    </div>
  )
}
