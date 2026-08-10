import { describe, expect, it } from 'vitest'

import {
  DASHBOARD_NAVIGATION_SECTIONS,
  PRIMARY_DASHBOARD_NAVIGATION_ITEMS,
  UTILITY_DASHBOARD_NAVIGATION_ITEMS,
} from '@constants/navigation'
import {
  BATCHES_PATH,
  COLLECTIONS_PATH,
  COMPONENT_LIBRARY_PATH,
  DB_SCHEMA_PATH,
  DOCUMENTS_PATH,
  EXCLUSION_REVIEW_PATH,
  getBatchDetailPath,
  LIBRARY_PATH,
  PROCESS_DOCUMENTS_PATH,
  READY_FOR_LIBRARY_PATH,
  REPORTS_PAGE_PATH,
  REVIEW_QUEUE_PATH,
  TAGS_PAGE_PATH,
  TAGS_PATH,
} from '@constants/paths'
import { PAGE_LABELS } from '@constants/pageLabels'

describe('dashboard navigation constants', () => {
  it('defines the approved primary operational routes in order', () => {
    expect(PRIMARY_DASHBOARD_NAVIGATION_ITEMS).toEqual([
      { href: DOCUMENTS_PATH, iconKey: 'documents', label: PAGE_LABELS.documents },
      { href: PROCESS_DOCUMENTS_PATH, iconKey: 'process', label: PAGE_LABELS.process },
      { href: REVIEW_QUEUE_PATH, iconKey: 'reviewQueue', label: PAGE_LABELS.reviewQueue },
      { href: READY_FOR_LIBRARY_PATH, iconKey: 'readyForLibrary', label: PAGE_LABELS.readyForLibrary },
      { href: LIBRARY_PATH, iconKey: 'library', label: PAGE_LABELS.library },
      { href: BATCHES_PATH, iconKey: 'batches', label: PAGE_LABELS.batches },
      { href: COLLECTIONS_PATH, iconKey: 'collections', label: PAGE_LABELS.collections },
      { href: TAGS_PAGE_PATH, iconKey: 'tags', label: PAGE_LABELS.tags },
      { href: REPORTS_PAGE_PATH, iconKey: 'reports', label: PAGE_LABELS.reports },
      { href: EXCLUSION_REVIEW_PATH, iconKey: 'exclusionReview', label: PAGE_LABELS.exclusionReview },
    ])
  })

  it('defines the approved utility routes in order', () => {
    expect(UTILITY_DASHBOARD_NAVIGATION_ITEMS).toEqual([
      { href: DB_SCHEMA_PATH, iconKey: 'db', label: PAGE_LABELS.db },
      { href: COMPONENT_LIBRARY_PATH, iconKey: 'componentLibrary', label: PAGE_LABELS.componentLibrary },
    ])
  })

  it('groups navigation into primary and utility sections', () => {
    expect(DASHBOARD_NAVIGATION_SECTIONS).toEqual([
      {
        id: 'primary',
        items: PRIMARY_DASHBOARD_NAVIGATION_ITEMS,
        label: 'Primary',
      },
      {
        id: 'utility',
        items: UTILITY_DASHBOARD_NAVIGATION_ITEMS,
        label: 'Utility',
      },
    ])
  })

  it('uses page routes for shell destinations instead of API paths', () => {
    const shellHrefs = DASHBOARD_NAVIGATION_SECTIONS.flatMap((section) => section.items.map((item) => item.href))

    expect(shellHrefs).toContain(DOCUMENTS_PATH)
    expect(shellHrefs).toContain(TAGS_PAGE_PATH)
    expect(shellHrefs).toContain(REPORTS_PAGE_PATH)
    expect(shellHrefs).not.toContain(TAGS_PATH)
  })

  it('builds a URL-safe canonical batch detail path', () => {
    expect(getBatchDetailPath('batch/with spaces')).toBe('/batches/batch%2Fwith%20spaces')
  })

  it('preserves a validated return context in a batch detail path', () => {
    expect(getBatchDetailPath('batch-1', '/library?page=2', 'Library')).toBe(
      '/batches/batch-1?from=%2Flibrary%3Fpage%3D2&fromLabel=Library',
    )
  })
})
