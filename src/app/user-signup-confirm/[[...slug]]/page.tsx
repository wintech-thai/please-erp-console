'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { client } from '@/lib/axios'
import { toast } from 'sonner'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import clsx from 'clsx'
import NavbarClean from '@/components/NavbarClean'
import { LanguageProvider, useLang } from '@/context/LanguageContext'

interface UserInfo {
  userName: string
  email: string
  orgUserId?: string
}

function ReqBullet({ isValid, text }: { isValid: boolean; text: string }) {
  return (
    <li className={clsx('flex items-start gap-2 text-xs transition-colors', isValid ? 'text-primary-600 font-medium' : 'text-gray-400')}>
      <span className="mt-0.5 text-[10px]">•</span>
      <span>{text}</span>
    </li>
  )
}

function SignupConfirmContent() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const { t } = useLang()

  const slug = params?.slug as string[]
  const orgId = slug?.[0] || ''
  const token = slug?.[1] || ''

  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    const dataParam = searchParams.get('data')
    if (!dataParam) { toast.error(t.signupConfirm.invalidLink); return }
    try {
      const decoded = decodeURIComponent(escape(atob(dataParam)))
      const parsed = JSON.parse(decoded)
      setUserInfo({ userName: parsed.UserName || parsed.username || '', email: parsed.Email || parsed.email || '', orgUserId: parsed.OrgUserId || parsed.orgUserId })
    } catch {
      try {
        const parsed = JSON.parse(atob(dataParam))
        setUserInfo({ userName: parsed.UserName || parsed.username || '', email: parsed.Email || parsed.email || '', orgUserId: parsed.OrgUserId || parsed.orgUserId })
      } catch {
        toast.error(t.signupConfirm.invalidLink)
      }
    }
  }, [searchParams])

  const reqs = {
    length: password.length >= 7 && password.length <= 15,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  }

  const validate = () => {
    const sc = t.signupConfirm
    const errs: Record<string, string> = {}
    if (!firstName.trim()) errs.firstName = sc.errFirstName
    if (!lastName.trim()) errs.lastName = sc.errLastName
    if (!password) errs.password = sc.errPassword
    else if (!reqs.length || !reqs.upper || !reqs.lower || !reqs.special) errs.password = sc.errPasswordReq
    if (!confirmPassword) errs.confirmPassword = sc.errConfirmRequired
    else if (password !== confirmPassword) errs.confirmPassword = sc.errConfirmMismatch
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate() || !userInfo) return
    setSubmitting(true)
    try {
      await client.post(
        `/api/Registration/org/${orgId}/action/ConfirmNewUserInvitation/${token}/${userInfo.userName}`,
        { Email: userInfo.email, UserName: userInfo.userName, Password: password, Name: firstName.trim(), LastName: lastName.trim(), OrgUserId: userInfo.orgUserId }
      )
      toast.success(t.signupConfirm.successMsg)
      router.push('/login')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || t.signupConfirm.errorMsg
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  if (!isMounted) return null

  const sc = t.signupConfirm

  return (
    <>
      <NavbarClean />
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="px-8 pt-8 pb-6 text-white" style={{ background: 'linear-gradient(135deg, rgb(var(--color-primary-800)) 0%, rgb(var(--color-primary-700)) 40%, rgb(var(--color-primary-500)) 100%)' }}>
              <h1 className="text-xl font-bold text-white mb-1">{sc.title}</h1>
              <p className="text-sm text-orange-200">{sc.subtitle}</p>
            </div>

            <form onSubmit={handleSubmit} className="px-8 py-6 space-y-5">
              <div className="space-y-4">
                <Field label={sc.username}>
                  <input type="text" value={userInfo?.userName ?? ''} readOnly className={clsx(inputCls, 'bg-gray-50 text-gray-500')} />
                </Field>
                <Field label={sc.email}>
                  <input type="text" value={userInfo?.email ?? ''} readOnly className={clsx(inputCls, 'bg-gray-50 text-gray-500')} />
                </Field>
              </div>

              <div className="border-t border-gray-100" />

              <div className="grid grid-cols-2 gap-4">
                <Field label={sc.firstName} required error={errors.firstName}>
                  <input type="text" value={firstName} onChange={e => { setFirstName(e.target.value); setErrors(p => ({ ...p, firstName: '' })) }} placeholder={sc.firstNamePlaceholder} disabled={submitting} className={clsx(inputCls, errors.firstName && 'border-red-400 focus:ring-red-400')} />
                  {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>}
                </Field>
                <Field label={sc.lastName} required error={errors.lastName}>
                  <input type="text" value={lastName} onChange={e => { setLastName(e.target.value); setErrors(p => ({ ...p, lastName: '' })) }} placeholder={sc.lastNamePlaceholder} disabled={submitting} className={clsx(inputCls, errors.lastName && 'border-red-400 focus:ring-red-400')} />
                  {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>}
                </Field>
              </div>

              <Field label={sc.password} required>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => { setPassword(e.target.value); setErrors(p => ({ ...p, password: '' })) }} placeholder="••••••••" disabled={submitting} maxLength={15} className={clsx(inputCls, 'pr-10', errors.password && 'border-red-400 focus:ring-red-400')} />
                  <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
              </Field>

              <Field label={sc.confirmPassword} required>
                <div className="relative">
                  <input type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={e => { setConfirmPassword(e.target.value); setErrors(p => ({ ...p, confirmPassword: '' })) }} placeholder="••••••••" disabled={submitting} maxLength={15} className={clsx(inputCls, 'pr-10', errors.confirmPassword && 'border-red-400 focus:ring-red-400')} />
                  <button type="button" onClick={() => setShowConfirmPassword(v => !v)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600">
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>}
              </Field>

              <div className="bg-primary-50 border border-primary-100 rounded-lg p-4">
                <p className="text-xs font-semibold text-primary-700 mb-2">{sc.reqTitle}</p>
                <ul className="space-y-1">
                  <ReqBullet isValid={reqs.length} text={sc.req1} />
                  <ReqBullet isValid={reqs.upper} text={sc.req2} />
                  <ReqBullet isValid={reqs.lower} text={sc.req3} />
                  <ReqBullet isValid={reqs.special} text={sc.req4} />
                </ul>
              </div>

              <button type="submit" disabled={submitting} className="w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-60 rounded-xl transition-colors shadow-sm">
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin" />{sc.processing}</> : sc.submit}
              </button>
              <p className="text-xs text-gray-400 text-center pt-1">{sc.footer}</p>
            </form>
          </div>
          <p className="text-center text-xs text-gray-400 mt-6">Secure &bull; Reliable &bull; Fast</p>
        </div>
      </div>
    </>
  )
}

export default function UserSignupConfirmPage() {
  return (
    <LanguageProvider>
      <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>}>
        <SignupConfirmContent />
      </Suspense>
    </LanguageProvider>
  )
}

function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  )
}

const inputCls = 'w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white transition-colors'
