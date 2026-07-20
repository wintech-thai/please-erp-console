import { NextResponse } from 'next/server'

export async function POST() {
  const res = NextResponse.json({ success: true })
  const cookieOpts = { path: '/', maxAge: 0, sameSite: 'lax' as const }
  res.cookies.set('accessToken', '', cookieOpts)
  res.cookies.set('refreshToken', '', cookieOpts)
  res.cookies.set('user_name', '', cookieOpts)
  res.cookies.set('orgId', '', cookieOpts)
  return res
}
