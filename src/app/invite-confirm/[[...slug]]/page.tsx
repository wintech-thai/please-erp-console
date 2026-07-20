'use client'

import { useState, FormEvent, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { LanguageProvider, useLang } from '@/context/LanguageContext'
import { userApi } from '@/lib/api/user.api'

function InviteConfirmContent() {
  const { t } = useLang()
  const params = useParams()
  const router = useRouter()
  const s = t.signup

  // URL: /invite-confirm/{orgId}/{token}/{username}
  const slugs = (params?.slug as string[] | undefined) ?? []
  const orgId = slugs[0] ?? ''
  const token = slugs[1] ?? ''
  const username = slugs[2] ?? ''

  const [mode, setMode] = useState<'existing' | 'new'>('existing')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [loading, setLoading] = useState(false)
  const mismatch = confirmPassword !== '' && confirmPassword !== password

  useEffect(() => {
    // If username is supplied it's a "new user" invite
    if (username) setMode('new')
    else setMode('existing')
  }, [username])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (mode === 'new' && password !== confirmPassword) return
    setLoading(true)
    try {
      await userApi.confirmInvite(orgId, token, {
        username,
        email,
        password,
        firstName: mode === 'new' ? firstName : '',
        lastName: mode === 'new' ? lastName : '',
      })
      toast.success(s.success)
      await new Promise((r) => setTimeout(r, 1500))
      router.push('/login')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || s.error
      toast.error(msg)
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-1">{s.inviteTitle}</h2>
        <p className="text-gray-500 text-sm mb-8">{s.inviteSubtitle}</p>

        {/* Toggle: existing vs new user */}
        <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
          <button type="button" onClick={() => setMode('existing')} className={['flex-1 py-1.5 rounded-md text-sm font-medium transition-colors', mode === 'existing' ? 'bg-white shadow text-primary-700' : 'text-gray-500 hover:text-gray-700'].join(' ')}>{s.existingUser}</button>
          <button type="button" onClick={() => setMode('new')} className={['flex-1 py-1.5 rounded-md text-sm font-medium transition-colors', mode === 'new' ? 'bg-white shadow text-primary-700' : 'text-gray-500 hover:text-gray-700'].join(' ')}>{s.newUser}</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'new' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{s.firstName}</label>
                <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} required className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{s.lastName}</label>
                <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} required className="input-field" />
              </div>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{s.password}</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="input-field" />
          </div>
          {mode === 'new' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{s.confirmPassword}</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className={['input-field', mismatch ? 'border-red-500' : ''].join(' ')} />
              {mismatch && <p className="text-red-500 text-xs mt-1">{s.mismatch}</p>}
            </div>
          )}
          <button type="submit" disabled={loading || (mode === 'new' && mismatch)} className="btn-primary w-full mt-2">{loading ? s.submitting : s.submit}</button>
        </form>
        <div className="text-center mt-6"><Link href="/login" className="text-sm text-primary-700 hover:underline">{s.backToLogin}</Link></div>
      </div>
    </div>
  )
}

export default function InviteConfirmPage() {
  return <LanguageProvider><InviteConfirmContent /></LanguageProvider>
}
