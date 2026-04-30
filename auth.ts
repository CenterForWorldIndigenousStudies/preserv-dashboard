import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'

export const { auth, handlers, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [Google],
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  callbacks: {
    authorized({ auth }) {
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
