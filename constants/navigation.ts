import {
  BATCHES_PATH,
  COLLECTIONS_PATH,
  COMPONENT_LIBRARY_PATH,
  DASHBOARD_PATH,
  DB_SCHEMA_PATH,
  DOCUMENTS_PATH,
  PROCESS_DOCUMENTS_PATH,
  READY_FOR_LIBRARY_PATH,
  REPORTS_PAGE_PATH,
  REVIEW_QUEUE_PATH,
  TAGS_PAGE_PATH,
} from '@constants/paths'

export type DashboardNavigationGroupId = 'primary' | 'utility'

export type DashboardNavigationIconKey =
  | 'dashboard'
  | 'documents'
  | 'process'
  | 'batches'
  | 'reviewQueue'
  | 'readyForLibrary'
  | 'collections'
  | 'tags'
  | 'reports'
  | 'db'
  | 'componentLibrary'

export interface DashboardNavigationItem {
  href: string
  iconKey: DashboardNavigationIconKey
  label: string
}

export interface DashboardNavigationSection {
  id: DashboardNavigationGroupId
  items: readonly DashboardNavigationItem[]
  label: string
}

export const PRIMARY_DASHBOARD_NAVIGATION_ITEMS: readonly DashboardNavigationItem[] = [
  { href: DASHBOARD_PATH, iconKey: 'dashboard', label: 'Dashboard' },
  { href: DOCUMENTS_PATH, iconKey: 'documents', label: 'Documents' },
  { href: PROCESS_DOCUMENTS_PATH, iconKey: 'process', label: 'Process' },
  { href: BATCHES_PATH, iconKey: 'batches', label: 'Batches' },
  { href: REVIEW_QUEUE_PATH, iconKey: 'reviewQueue', label: 'Review Queue' },
  { href: READY_FOR_LIBRARY_PATH, iconKey: 'readyForLibrary', label: 'Ready for Library' },
  { href: COLLECTIONS_PATH, iconKey: 'collections', label: 'Collections' },
  { href: TAGS_PAGE_PATH, iconKey: 'tags', label: 'Tags' },
  { href: REPORTS_PAGE_PATH, iconKey: 'reports', label: 'Reports' },
] as const

export const UTILITY_DASHBOARD_NAVIGATION_ITEMS: readonly DashboardNavigationItem[] = [
  { href: DB_SCHEMA_PATH, iconKey: 'db', label: 'DB' },
  { href: COMPONENT_LIBRARY_PATH, iconKey: 'componentLibrary', label: 'Component Library' },
] as const

export const DASHBOARD_NAVIGATION_SECTIONS: readonly DashboardNavigationSection[] = [
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
] as const
