// app/api/auth/register/route.ts
// Redirect old local auth calls to WP SSO

import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json(
    {
      error: 'Local registration is disabled. Use centralized WordPress SSO.',
      redirect: process.env.NEXT_PUBLIC_WP_LOGIN_URL || 'https://hardbanrecordslab.online/login',
    },
    { status: 410 }
  )
}

export async function GET() {
  const wpLoginUrl = process.env.NEXT_PUBLIC_WP_LOGIN_URL || 'https://hardbanrecordslab.online/login'
  return NextResponse.redirect(wpLoginUrl)
}
