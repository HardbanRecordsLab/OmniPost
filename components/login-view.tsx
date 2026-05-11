"use client"

import { useEffect } from 'react'

export function LoginView() {
  useEffect(() => {
    const returnUrl = encodeURIComponent(window.location.href)
    const wpLoginUrl = process.env.NEXT_PUBLIC_WP_LOGIN_URL || 'https://hardbanrecordslab.online/login'
    window.location.href = `${wpLoginUrl}?redirect_to=${returnUrl}`
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
      <div className="text-center space-y-3">
        <div className="h-12 w-12 mx-auto rounded-full border-2 border-white animate-spin" />
        <p className="text-lg font-semibold">Redirecting to centralized login...</p>
        <p className="text-sm text-slate-300">Please wait while your session is synchronized via WordPress SSO.</p>
      </div>
    </div>
  )
}
