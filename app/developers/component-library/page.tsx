'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function ComponentLibraryPage() {
  const { status } = useSession()
  const router = useRouter()
  const [src, setSrc] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/auth/signin?callbackUrl=/developers/component-library')
      return
    }
    if (status !== 'authenticated') return

    // Storybook is served through an authenticated app route. That route can
    // proxy a separately deployed static Storybook or fall back to local assets.
    setSrc('/developers/storybook/index.html')
  }, [status, router])

  if (status === 'loading') {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-ink/60">Loading component library...</p>
      </div>
    )
  }

  if (!src) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-ink/60">Loading component library...</p>
      </div>
    )
  }

  return (
    <div className="-m-6 -mt-4 h-[calc(100vh-8rem)]">
      <iframe
        src={src}
        title="Storybook Component Library"
        className="h-full w-full border-0"
        // Allow sandbox while keeping necessary permissions
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      />
    </div>
  )
}
