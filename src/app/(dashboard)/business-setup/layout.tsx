export default function BusinessSetupLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-6">
      {children}
    </div>
  )
}
