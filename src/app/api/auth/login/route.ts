import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || ''
const WEB_ROLE = process.env.WEB_ROLE || 'ADMIN'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Admin → /admin-api/AuthAdmin, Tenant → /api/Auth
    const loginPath = WEB_ROLE === 'ADMIN'
      ? `${BACKEND_URL}/admin-api/AuthAdmin/org/global/action/Login`
      : `${BACKEND_URL}/api/Auth/org/temp/action/Login`

    const response = await fetch(loginPath, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ UserName: body.username, Password: body.password }),
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json({ message: data?.message || data?.error || 'Login failed' }, { status: response.status })
    }

    const accessToken: string = data.token?.access_token || ''
    const refreshToken: string = data.token?.refresh_token || ''
    const username: string = data.userName || body.username || ''
    const orgId = 'global'

    const res = NextResponse.json({ success: true, accessToken, refreshToken, username, orgId })

    const cookieOpts = {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
    }
    res.cookies.set('accessToken', accessToken, { ...cookieOpts, maxAge: 60 * 60 * 24 })
    res.cookies.set('refreshToken', refreshToken, { ...cookieOpts, maxAge: 60 * 60 * 24 * 7 })
    res.cookies.set('user_name', username, { ...cookieOpts, maxAge: 60 * 60 * 24 * 7 })
    res.cookies.set('orgId', orgId, { ...cookieOpts, maxAge: 60 * 60 * 24 * 7 })

    return res
  } catch {
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
