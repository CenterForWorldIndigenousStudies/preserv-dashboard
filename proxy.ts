export { auth as proxy } from '@root/auth'

export const config = {
  matcher: [
    '/((?!auth/|api/auth|api/pipeline/ingester/callback|api/pipeline/document-splitter/callback|_next/static|_next/image|favicon.ico|developers/|storybook/|api/tags/search).*)',
  ],
}
