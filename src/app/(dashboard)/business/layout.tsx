import BusinessSidebar from '@/components/BusinessSidebar'

export default function BusinessLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 overflow-hidden">
      <BusinessSidebar />
      <div className="flex-1 overflow-y-auto p-3 sm:p-6 flex flex-col">
        {children}
      </div>
    </div>
  )
}
