import { renderToStaticMarkup } from 'react-dom/server'
import type { ReactElement } from 'react'
import { describe, expect, it } from 'vitest'

import { SessionProvider, useSession } from '@lib/nextAuthReact.storybook'

function SessionStatus(): ReactElement {
  const { status } = useSession()
  return <span>{status}</span>
}

describe('Storybook next-auth/react boundary', () => {
  it('provides a browser-safe unauthenticated session boundary', () => {
    const markup = renderToStaticMarkup(
      <SessionProvider session={null}>
        <SessionStatus />
      </SessionProvider>,
    )

    expect(markup).toContain('unauthenticated')
  })
})
