import { describe, expect, it } from 'vitest'
import { document_quality_validation_status } from '@lib/prisma/generated/client'
import { VALIDATION_STATUS_OPTIONS } from '@constants/validationStatuses'

describe('validation status contract', () => {
  it('matches the generated Prisma enum', () => {
    expect([...VALIDATION_STATUS_OPTIONS]).toEqual(Object.values(document_quality_validation_status))
  })
})
