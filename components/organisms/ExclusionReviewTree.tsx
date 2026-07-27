import type { ReactElement } from 'react'
import { Box, Button, Stack, Typography } from '@mui/material'

import { ExclusionReviewTreeRow } from '@organisms/ExclusionReviewTreeRow'
import type {
  ExclusionReviewDecision,
  ExclusionReviewTreeNode,
} from 'types/exclusionReview'

export interface ExclusionReviewBranchState {
  childIds: string[]
  hasMore: boolean
  loaded: boolean
  loading: boolean
  nextPageToken: string | null
}

export interface ExclusionReviewTreeProps {
  branches: Record<string, ExclusionReviewBranchState>
  expandedIds: string[]
  isEditor: boolean
  nodes: Record<string, ExclusionReviewTreeNode>
  onDecisionChange: (
    driveId: string,
    decision: ExclusionReviewDecision,
  ) => void
  onLoadMore: (driveId: string) => void
  onSyncBranch: (driveId: string) => void
  onToggle: (driveId: string) => void
  rootId: string
  searchVisibleIds: Set<string> | null
}

export function ExclusionReviewTree({
  branches,
  expandedIds,
  isEditor,
  nodes,
  onDecisionChange,
  onLoadMore,
  onSyncBranch,
  onToggle,
  rootId,
  searchVisibleIds,
}: ExclusionReviewTreeProps): ReactElement {
  const expandedSet = new Set(expandedIds)

  const isNodeVisible = (driveId: string): boolean => {
    if (!searchVisibleIds || driveId === rootId) {
      return true
    }

    if (searchVisibleIds.has(driveId)) {
      return true
    }

    const branch = branches[driveId]
    return branch?.childIds.some((childDriveId) => isNodeVisible(childDriveId)) ?? false
  }

  const renderBranch = (driveId: string, depth: number): ReactElement | null => {
    const node = nodes[driveId]
    if (!node || !isNodeVisible(driveId)) {
      return null
    }

    const branch = branches[driveId]
    const isExpanded = expandedSet.has(driveId)
    const children = isExpanded
      ? (branch?.childIds ?? [])
          .map((childDriveId) => renderBranch(childDriveId, depth + 1))
          .filter((child): child is ReactElement => child !== null)
      : []

    return (
      <Stack key={driveId} spacing={0.5}>
        <ExclusionReviewTreeRow
          depth={depth}
          isEditor={isEditor}
          isExpanded={isExpanded}
          isLoading={branch?.loading ?? false}
          node={node}
          onDecisionChange={onDecisionChange}
          onSyncBranch={onSyncBranch}
          onToggle={node.itemType === 'folder' ? onToggle : undefined}
        />
        {isExpanded && children.length > 0 ? children : null}
        {isExpanded && branch?.hasMore ? (
          <Box sx={{ pl: `${(depth + 1) * 16 + 32}px` }}>
            <Button onClick={() => onLoadMore(driveId)} size="small" variant="text">
              Load more
            </Button>
          </Box>
        ) : null}
      </Stack>
    )
  }

  const treeMarkup = renderBranch(rootId, 0)

  return treeMarkup ? (
    treeMarkup
  ) : (
    <Typography color="text.secondary">No items available.</Typography>
  )
}
