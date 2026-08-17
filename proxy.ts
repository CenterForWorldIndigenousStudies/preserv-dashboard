export { auth as proxy } from '@root/auth'

export const config = {
  matcher: [
    '/((?!auth/|api/auth|api/pipeline/ingester/callback|api/pipeline/document-splitter/callback|api/pipeline/page-rotator/callback|api/pipeline/ocr-processor/callback|api/pipeline/content-dedup/callback|api/pipeline/metadata-extractor/callback|api/pipeline/metadata-validator/callback|api/pipeline/rights-determinator/callback|api/pipeline/fedora-ingester/callback|_next/static|_next/image|favicon.ico|developers/|storybook/|api/tags/search).*)',
  ],
}
