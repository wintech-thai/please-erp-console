import { useState, useEffect, useCallback } from 'react'

export function useUnsavedChanges(isDirty: boolean) {
  const [pendingFn, setPendingFn] = useState<(() => void) | null>(null)

  useEffect(() => {
    if (!isDirty) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  const guardNavigation = useCallback((fn: () => void) => {
    if (isDirty) setPendingFn(() => fn)
    else fn()
  }, [isDirty])

  const confirmLeave = useCallback(() => {
    pendingFn?.()
    setPendingFn(null)
  }, [pendingFn])

  const cancelLeave = useCallback(() => setPendingFn(null), [])

  return { showConfirm: !!pendingFn, guardNavigation, confirmLeave, cancelLeave }
}
