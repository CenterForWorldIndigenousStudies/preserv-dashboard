export type ExclusionReviewDecision = 'include' | 'exclude' | null
export type ExclusionReviewItemType = 'folder' | 'file'
export type ExclusionReviewSubtreeIndexStatus =
  | 'pending'
  | 'syncing'
  | 'complete'
  | 'error'
export type ExclusionReviewAggregateFolderStatus =
  | 'allIncluded'
  | 'allExcluded'
  | 'mixedReviewed'
  | null

export interface DriveIndexItem {
  driveId: string
  parentDriveId: string | null
  itemType: ExclusionReviewItemType
  name: string
  mimeType: string | null
  driveUrl: string
  path: string[]
  depth: number
}

export interface ExclusionReviewTreeNode extends DriveIndexItem {
  explicitDecision: ExclusionReviewDecision
  effectiveDecision: ExclusionReviewDecision
  effectiveAncestorDriveId: string | null
  effectiveAncestorDecision: ExclusionReviewDecision
  subtreeIndexStatus: ExclusionReviewSubtreeIndexStatus
  aggregateFolderStatus: ExclusionReviewAggregateFolderStatus
  isInheritedLocked: boolean
  hasChildren: boolean
}

export interface ExclusionReviewBranchPage {
  parentDriveId: string
  items: ExclusionReviewTreeNode[]
  nextPageToken: string | null
  hasMore: boolean
  branchSyncStatus: ExclusionReviewSubtreeIndexStatus
}

export interface ExclusionReviewTreePayload {
  root: ExclusionReviewTreeNode
  rootChildren: ExclusionReviewBranchPage
}

export interface ApplyDecisionInput {
  driveId: string
  decision: ExclusionReviewDecision
  reviewerEmail: string
}

export interface ExclusionReviewMutationResult {
  updatedAt: string
  updatedNodes: ExclusionReviewTreeNode[]
}

export interface ExclusionReviewSearchResult {
  query: string
  matches: ExclusionReviewTreeNode[]
  ancestorDriveIdsToExpand: string[]
  pathNodes: ExclusionReviewTreeNode[]
}

export interface ExclusionReviewBranchSyncResult {
  driveId: string
  syncedCount: number
  updatedNodes: ExclusionReviewTreeNode[]
  subtreeIndexStatus: ExclusionReviewSubtreeIndexStatus
}
