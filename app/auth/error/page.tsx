import { Suspense } from 'react'

import { ErrorContent } from './ErrorContent'

export const dynamic = 'force-dynamic'

function ErrorFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-sand/20">
      <div className="bg-white rounded-panel shadow-md p-8 text-center">
        <p className="text-ink/60">Loading...</p>
      </div>
    </div>
  )
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={<ErrorFallback />}>
      <ErrorContent />
    </Suspense>
  )
}
