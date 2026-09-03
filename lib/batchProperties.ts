import type { BatchProperty } from 'types/batches'

export function toBatchProperties(details: object): BatchProperty[] {
  return Object.entries(details as Record<string, unknown>).map(([key, value]) => ({ key, value }))
}
