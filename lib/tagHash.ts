import { createHash } from 'node:crypto'

import { normalizeTagKey } from '@lib/tagUtils'

export function buildNameHash(value: string): string {
  return createHash('sha256').update(normalizeTagKey(value)).digest('hex')
}
