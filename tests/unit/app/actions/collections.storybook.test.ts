import { describe, expect, it } from 'vitest'

import * as collectionsActions from '@root/app/actions/collections.storybook'

describe('collections Storybook action stubs', () => {
  it('exports the collection actions used by the collections stories', () => {
    const actionExports = collectionsActions as Record<string, unknown>

    expect(actionExports.getCollectionsAction).toEqual(expect.any(Function))
    expect(actionExports.updateCollectionAction).toEqual(expect.any(Function))
    expect(actionExports.renameCollectionAction).toEqual(expect.any(Function))
  })
})
