import { createHash } from 'node:crypto'

import { normalizeBatchNameForUniqueness } from '@lib/batchSearch'

export function buildBatchNameHash(value: string): string {
  return createHash('sha256').update(normalizeBatchNameForUniqueness(value)).digest('hex')
}
