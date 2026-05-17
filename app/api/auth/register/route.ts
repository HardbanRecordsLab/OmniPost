import { NextResponse } from 'next/server'

const localUser = {
  id: 'local-admin',
  email: 'local@hardbanrecordslab.online',
  username: 'local-admin',
  role: 'admin',
}

export async function POST() {
  return NextResponse.json({
    user: localUser,
    access_token: 'hrl-local-app-token',
    token_type: 'Bearer',
  })
}

export async function GET() {
  return NextResponse.json({ registration: 'local-app-access', user: localUser })
}