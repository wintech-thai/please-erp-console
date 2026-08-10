import AdminSidebar from '@/components/AdminSidebar'

export default function AdministratorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 overflow-hidden">
      <AdminSidebar />
      <div className="flex-1 overflow-y-auto p-3 sm:p-6">
        {children}
      </div>
    </div>
  )
}
