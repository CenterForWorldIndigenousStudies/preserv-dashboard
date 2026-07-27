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
} from '@constants/paths'
import { PAGE_LABELS } from '@constants/pageLabels'

export type DashboardNavigationGroupId = 'primary' | 'utility'

export type DashboardNavigationIconKey =
  | 'dashboard'
  | 'documents'
  | 'process'
  | 'batches'
  | 'exclusionReview'
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
  { href: DASHBOARD_PATH, iconKey: 'dashboard', label: PAGE_LABELS.dashboard },
  { href: DOCUMENTS_PATH, iconKey: 'documents', label: PAGE_LABELS.documents },
  { href: PROCESS_DOCUMENTS_PATH, iconKey: 'process', label: PAGE_LABELS.process },
  { href: BATCHES_PATH, iconKey: 'batches', label: PAGE_LABELS.batches },
  { href: EXCLUSION_REVIEW_PATH, iconKey: 'exclusionReview', label: PAGE_LABELS.exclusionReview },
  { href: REVIEW_QUEUE_PATH, iconKey: 'reviewQueue', label: PAGE_LABELS.reviewQueue },
  { href: READY_FOR_LIBRARY_PATH, iconKey: 'readyForLibrary', label: PAGE_LABELS.readyForLibrary },
  { href: COLLECTIONS_PATH, iconKey: 'collections', label: PAGE_LABELS.collections },
  { href: TAGS_PAGE_PATH, iconKey: 'tags', label: PAGE_LABELS.tags },
  { href: REPORTS_PAGE_PATH, iconKey: 'reports', label: PAGE_LABELS.reports },
] as const

export const UTILITY_DASHBOARD_NAVIGATION_ITEMS: readonly DashboardNavigationItem[] = [
  { href: DB_SCHEMA_PATH, iconKey: 'db', label: PAGE_LABELS.db },
  { href: COMPONENT_LIBRARY_PATH, iconKey: 'componentLibrary', label: PAGE_LABELS.componentLibrary },
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
