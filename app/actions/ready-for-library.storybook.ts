import type { ReadyForLibraryItem } from 'types/documents'

/**
 * Browser-safe Storybook stub for the server-backed ready-for-library action.
 * Stories provide initial table data directly, so the Prisma-backed query
 * chain must not be included in the Storybook client bundle.
 */
export function getReadyForLibraryAction(): Promise<{ items: ReadyForLibraryItem[] }> {
  return Promise.resolve({ items: [] })
}

export function getReadyForLibrarySelectionAction(
  documentIds: readonly string[],
): Promise<Array<{ id: string; name: string }>> {
  return Promise.resolve(documentIds.map((id) => ({ id, name: id })))
}

export function publishReadyForLibraryAction(_input: {
  documentIds: readonly string[]
  name: string
  operationId: string
}): Promise<{ ok: false; error: string }> {
  return Promise.resolve({ ok: false, error: 'Publishing is unavailable in Storybook.' })
}
