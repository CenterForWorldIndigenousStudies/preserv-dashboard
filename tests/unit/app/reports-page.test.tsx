import { renderToStaticMarkup } from 'react-dom/server'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import ReportsPage from '@root/app/reports/page'
import { FAILED_PATH } from '@constants/paths'

vi.mock('@organisms/PageInfoModal', () => ({
  PageInfoModal: ({ children, title }: { children: ReactNode; title: string }) => (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  ),
}))

describe('ReportsPage', () => {
  it('keeps failures as a reporting concept without exposing a standalone failures workspace link', () => {
    const markup = renderToStaticMarkup(ReportsPage())

    expect(markup).toContain('Reports')
    expect(markup).toContain('failure signals')
    expect(markup).toContain('Failures remain part of the reporting scope')
    expect(markup).not.toContain(FAILED_PATH)
    expect(markup).not.toContain('Inspect documents that did not complete processing in the current failures view.')
  })
})
