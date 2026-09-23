import { describe, expect, it } from 'vitest'

import { LEGACY_IMPORT_MODE, LEGACY_IMPORT_STATUS_HISTORICAL } from '@constants/legacyImport'

describe('legacy import markers', () => {
  it('defines the legacy execution mode and import status', () => {
    expect(LEGACY_IMPORT_MODE).toBe('legacy_import')
    expect(LEGACY_IMPORT_STATUS_HISTORICAL).toBe('historical')
  })
})
