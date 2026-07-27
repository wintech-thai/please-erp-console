'use client'

import { createContext, useContext, ReactNode } from 'react'

const IsAdminContext = createContext<boolean>(true)

export function IsAdminProvider({ isAdmin, children }: { isAdmin: boolean; children: ReactNode }) {
  return <IsAdminContext.Provider value={isAdmin}>{children}</IsAdminContext.Provider>
}

export function useIsAdmin(): boolean {
  return useContext(IsAdminContext)
}
