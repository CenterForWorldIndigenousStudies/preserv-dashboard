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
  DASHBOARD_PATH,
  DB_SCHEMA_PATH,
  DOCUMENTS_PATH,
  EXCLUSION_REVIEW_PATH,
  PROCESS_DOCUMENTS_PATH,
  READY_FOR_LIBRARY_PATH,
  REPORTS_PAGE_PATH,
  REVIEW_QUEUE_PATH,
  TAGS_PAGE_PATH,
  TAGS_PATH,
} from '@constants/paths'

describe('dashboard navigation constants', () => {
  it('defines the approved primary operational routes in order', () => {
    expect(PRIMARY_DASHBOARD_NAVIGATION_ITEMS).toEqual([
      { href: DASHBOARD_PATH, iconKey: 'dashboard', label: 'Dashboard' },
      { href: DOCUMENTS_PATH, iconKey: 'documents', label: 'Documents' },
      { href: PROCESS_DOCUMENTS_PATH, iconKey: 'process', label: 'Process' },
      { href: BATCHES_PATH, iconKey: 'batches', label: 'Batches' },
      { href: EXCLUSION_REVIEW_PATH, iconKey: 'exclusionReview', label: 'Exclusion Review' },
      { href: REVIEW_QUEUE_PATH, iconKey: 'reviewQueue', label: 'Review Queue' },
      { href: READY_FOR_LIBRARY_PATH, iconKey: 'readyForLibrary', label: 'Ready for Library' },
      { href: COLLECTIONS_PATH, iconKey: 'collections', label: 'Collections' },
      { href: TAGS_PAGE_PATH, iconKey: 'tags', label: 'Tags' },
      { href: REPORTS_PAGE_PATH, iconKey: 'reports', label: 'Reports' },
    ])
  })

  it('defines the approved utility routes in order', () => {
    expect(UTILITY_DASHBOARD_NAVIGATION_ITEMS).toEqual([
      { href: DB_SCHEMA_PATH, iconKey: 'db', label: 'DB' },
      { href: COMPONENT_LIBRARY_PATH, iconKey: 'componentLibrary', label: 'Component Library' },
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
})
