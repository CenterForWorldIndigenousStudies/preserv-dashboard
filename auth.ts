import NextAuth, { type Session } from 'next-auth'
import Google from 'next-auth/providers/google'
import { AUTH_ERROR_PATH, SIGNIN_PATH } from '@constants/paths'

const AUTH_BYPASS_TOKEN_VALUE = 'dev-bypass'

export function isAuthBypassEnabled(): boolean {
  return process.env.AUTH_BYPASS_TOKEN?.trim() === AUTH_BYPASS_TOKEN_VALUE
}

function buildBypassSession(): Session {
  return {
    user: {
      name: 'Local Developer',
      email: 'dev-bypass@local.dev',
    },
    expires: '9999-12-31T23:59:59.999Z',
  }
}

const nextAuth = NextAuth({
  trustHost: true,
  providers: [Google],
  pages: {
    signIn: SIGNIN_PATH,
    error: AUTH_ERROR_PATH,
  },
  callbacks: {
    authorized({ auth }) {
      if (isAuthBypassEnabled()) {
        return true
      }

      const email = auth?.user?.email ?? ''
      return !!auth && (email.endsWith('@cwis.org') || email.endsWith('@gmail.com'))
    },
    session({ session }) {
      return {
        ...session,
        user: {
          ...session.user,
          email: session.user?.email ?? '',
        },
      }
    },
  },
})

export const { auth, handlers, signIn, signOut } = nextAuth

export async function getDashboardSession(): Promise<Session | null> {
  const session = await auth()
  if (session) {
    return session
  }

  if (isAuthBypassEnabled()) {
    return buildBypassSession()
  }

  return null
}
