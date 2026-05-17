"use client"

import { useEffect } from 'react'

export function LoginView() {
  useEffect(() => {
    localStorage.setItem('hrl_local_app_auth', 'hrl-local-app-token')
    window.location.replace('/')
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
      <p className="text-sm text-slate-300">Local app access enabled.</p>
    </div>
  )
}