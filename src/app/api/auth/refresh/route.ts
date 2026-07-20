import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || ''
const WEB_ROLE = process.env.NEXT_PUBLIC_WEB_ROLE || 'ADMIN'

export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get('refreshToken')?.value
    if (!refreshToken) return NextResponse.json({ message: 'No refresh token' }, { status: 401 })

    const refreshPath = WEB_ROLE === 'ADMIN'
      ? `${BACKEND_URL}/admin-api/AuthAdmin/org/global/action/RefreshToken`
      : `${BACKEND_URL}/api/OrgUser/org/global/action/RefreshToken`

    const response = await fetch(refreshPath, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ RefreshToken: refreshToken }),
    })

    const data = await response.json()

    if (!response.ok) {
      const res = NextResponse.json({ message: 'Refresh failed' }, { status: 401 })
      res.cookies.delete('accessToken')
      res.cookies.delete('refreshToken')
      return res
    }

    const newAccessToken: string = data.token?.access_token || ''
    const newRefreshToken: string = data.token?.refresh_token || refreshToken

    const res = NextResponse.json({ success: true, accessToken: newAccessToken, refreshToken: newRefreshToken })
    const cookieOpts = { httpOnly: false, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/' }
    res.cookies.set('accessToken', newAccessToken, { ...cookieOpts, maxAge: 60 * 60 * 24 })
    res.cookies.set('refreshToken', newRefreshToken, { ...cookieOpts, maxAge: 60 * 60 * 24 * 7 })
    return res
  } catch {
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
