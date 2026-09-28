import { describe, expect, it, vi } from 'vitest'

vi.mock('@root/components/organisms/LibraryTable', () => ({
  LibraryTable: () => null,
}))

import meta from '@root/components/organisms/LibraryTable.stories'

describe('LibraryTable Storybook metadata', () => {
  it('provides the Next app-router context required by the table', () => {
    expect(meta.parameters).toMatchObject({
      nextjs: {
        appDirectory: true,
        navigation: {
          pathname: '/library',
        },
      },
    })
  })
})
