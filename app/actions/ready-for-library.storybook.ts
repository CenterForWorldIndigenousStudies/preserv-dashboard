import type { ReadyForLibraryItem } from 'types/documents'

/**
 * Browser-safe Storybook stub for the server-backed ready-for-library action.
 * Stories provide initial table data directly, so the Prisma-backed query
 * chain must not be included in the Storybook client bundle.
 */
export function getReadyForLibraryAction(): Promise<{ items: ReadyForLibraryItem[] }> {
  return Promise.resolve({ items: [] })
}
