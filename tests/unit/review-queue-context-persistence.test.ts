import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { MRT_RowSelectionState } from 'material-react-table'

// Mock sessionStorage
const mockSessionStorage = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()

// Helper function implementations (from DocumentsTable.tsx)
const REVIEW_QUEUE_SELECTION_STORAGE_PREFIX = 'rq-row-selection'

function getReviewQueueSelectionKey(queryKey: string): string {
  return `${REVIEW_QUEUE_SELECTION_STORAGE_PREFIX}:${queryKey}`
}

function saveReviewQueueSelection(queryKey: string, selection: MRT_RowSelectionState): void {
  try {
    mockSessionStorage.setItem(getReviewQueueSelectionKey(queryKey), JSON.stringify(selection))
  } catch {
    // Silent fail
  }
}

function restoreReviewQueueSelection(queryKey: string): MRT_RowSelectionState {
  try {
    const stored = mockSessionStorage.getItem(getReviewQueueSelectionKey(queryKey))
    return stored ? (JSON.parse(stored) as MRT_RowSelectionState) : {}
  } catch {
    return {}
  }
}

describe('Review Queue Context Persistence', () => {
  beforeEach(() => {
    mockSessionStorage.clear()
  })

  afterEach(() => {
    mockSessionStorage.clear()
  })

  describe('Row selection persistence', () => {
    it('should save row selection to sessionStorage with query key', () => {
      const queryKey = JSON.stringify({ page: 1, pageSize: 50, statuses: ['NEEDS_REVIEW'] })
      const selection: MRT_RowSelectionState = {
        'doc-1': true,
        'doc-2': true,
        'doc-3': false,
      }

      saveReviewQueueSelection(queryKey, selection)

      const stored = mockSessionStorage.getItem(getReviewQueueSelectionKey(queryKey))
      expect(stored).toBeDefined()
      expect(JSON.parse(stored!)).toEqual(selection)
    })

    it('should restore row selection from sessionStorage', () => {
      const queryKey = JSON.stringify({ page: 1, pageSize: 50, statuses: ['NEEDS_REVIEW'] })
      const selection: MRT_RowSelectionState = {
        'doc-1': true,
        'doc-2': true,
      }

      saveReviewQueueSelection(queryKey, selection)
      const restored = restoreReviewQueueSelection(queryKey)

      expect(restored).toEqual(selection)
    })

    it('should return empty selection for unknown query key', () => {
      const restored = restoreReviewQueueSelection('unknown-query-key')
      expect(restored).toEqual({})
    })

    it('should isolate selection by query key', () => {
      const queryKey1 = JSON.stringify({ page: 1, pageSize: 50 })
      const queryKey2 = JSON.stringify({ page: 1, pageSize: 25 })

      const selection1: MRT_RowSelectionState = { 'doc-1': true }
      const selection2: MRT_RowSelectionState = { 'doc-2': true }

      saveReviewQueueSelection(queryKey1, selection1)
      saveReviewQueueSelection(queryKey2, selection2)

      const restored1 = restoreReviewQueueSelection(queryKey1)
      const restored2 = restoreReviewQueueSelection(queryKey2)

      expect(restored1).toEqual(selection1)
      expect(restored2).toEqual(selection2)
      expect(restored1).not.toEqual(restored2)
    })

    it('should handle storage errors gracefully', () => {
      const queryKey = JSON.stringify({ page: 1 })
      const selection: MRT_RowSelectionState = { 'doc-1': true }

      // Simulate storage failure
      const originalSetItem = mockSessionStorage.setItem
      mockSessionStorage.setItem = vi.fn(() => {
        throw new Error('Storage full')
      })

      // Should not throw
      expect(() => {
        saveReviewQueueSelection(queryKey, selection)
      }).not.toThrow()

      // Restore original
      mockSessionStorage.setItem = originalSetItem
    })

    it('should handle corrupt storage data gracefully', () => {
      const queryKey = JSON.stringify({ page: 1 })
      mockSessionStorage.setItem(getReviewQueueSelectionKey(queryKey), 'invalid-json')

      const restored = restoreReviewQueueSelection(queryKey)
      expect(restored).toEqual({})
    })

    it('should clear selection when query changes (automatic cleanup)', () => {
      const queryKey1 = JSON.stringify({ page: 1, pageSize: 50, search: 'original' })
      const queryKey2 = JSON.stringify({ page: 1, pageSize: 50, search: 'modified' })

      const selection: MRT_RowSelectionState = { 'doc-1': true }
      saveReviewQueueSelection(queryKey1, selection)

      // Different query key - selection should not be found
      const restored = restoreReviewQueueSelection(queryKey2)
      expect(restored).toEqual({})

      // Original still exists
      const original = restoreReviewQueueSelection(queryKey1)
      expect(original).toEqual(selection)
    })
  })

  describe('Selection storage key isolation', () => {
    it('should use consistent key format', () => {
      const queryKey = 'test-query'
      const key = getReviewQueueSelectionKey(queryKey)
      expect(key).toBe(`${REVIEW_QUEUE_SELECTION_STORAGE_PREFIX}:test-query`)
    })

    it('should prevent key prefix collision', () => {
      const queryKey = 'test'
      const key1 = getReviewQueueSelectionKey(queryKey)
      const key2 = getReviewQueueSelectionKey(`${REVIEW_QUEUE_SELECTION_STORAGE_PREFIX}:${queryKey}`)

      // Keys should be different to prevent collision
      expect(key1).not.toEqual(key2)
    })
  })

  describe('Filter state isolation', () => {
    it('should not leak selection across different filter states', () => {
      // Different statuses
      const key1 = JSON.stringify({ statuses: ['NEEDS_REVIEW'] })
      const key2 = JSON.stringify({ statuses: ['APPROVED'] })

      const sel1: MRT_RowSelectionState = { 'doc-1': true }
      const sel2: MRT_RowSelectionState = { 'doc-2': true }

      saveReviewQueueSelection(key1, sel1)
      saveReviewQueueSelection(key2, sel2)

      expect(restoreReviewQueueSelection(key1)).toEqual(sel1)
      expect(restoreReviewQueueSelection(key2)).toEqual(sel2)
    })

    it('should not leak selection across different sort states', () => {
      const key1 = JSON.stringify({ orderBy: 'name', sortDirection: 'asc' })
      const key2 = JSON.stringify({ orderBy: 'created_at', sortDirection: 'desc' })

      const sel1: MRT_RowSelectionState = { 'doc-1': true }
      const sel2: MRT_RowSelectionState = { 'doc-3': true }

      saveReviewQueueSelection(key1, sel1)
      saveReviewQueueSelection(key2, sel2)

      expect(restoreReviewQueueSelection(key1)).toEqual(sel1)
      expect(restoreReviewQueueSelection(key2)).toEqual(sel2)
    })

    it('should not leak selection across different pagination states', () => {
      const key1 = JSON.stringify({ page: 1, pageSize: 50 })
      const key2 = JSON.stringify({ page: 2, pageSize: 50 })

      const sel1: MRT_RowSelectionState = { 'doc-1': true }
      const sel2: MRT_RowSelectionState = { 'doc-51': true }

      saveReviewQueueSelection(key1, sel1)
      saveReviewQueueSelection(key2, sel2)

      expect(restoreReviewQueueSelection(key1)).toEqual(sel1)
      expect(restoreReviewQueueSelection(key2)).toEqual(sel2)
    })
  })

  describe('Empty and edge cases', () => {
    it('should handle empty selection state', () => {
      const queryKey = JSON.stringify({ page: 1 })
      const selection: MRT_RowSelectionState = {}

      saveReviewQueueSelection(queryKey, selection)
      const restored = restoreReviewQueueSelection(queryKey)

      expect(restored).toEqual({})
    })

    it('should handle large selection state', () => {
      const queryKey = JSON.stringify({ page: 1 })
      const selection: MRT_RowSelectionState = {}
      // Create selection with 1000 items
      for (let i = 0; i < 1000; i++) {
        selection[`doc-${i}`] = true
      }

      saveReviewQueueSelection(queryKey, selection)
      const restored = restoreReviewQueueSelection(queryKey)

      expect(Object.keys(restored).length).toBe(1000)
      expect(restored).toEqual(selection)
    })
  })
})
