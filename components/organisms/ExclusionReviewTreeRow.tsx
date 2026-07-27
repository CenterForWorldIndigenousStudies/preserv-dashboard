import type { ReactElement } from 'react'
import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  FileText,
  Folder,
  RefreshCw,
} from 'lucide-react'
import {
  Box,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'

import type {
  ExclusionReviewDecision,
  ExclusionReviewTreeNode,
} from 'types/exclusionReview'

export interface ExclusionReviewTreeRowProps {
  depth: number
  isEditor: boolean
  isExpanded?: boolean
  isLoading?: boolean
  node: ExclusionReviewTreeNode
  onDecisionChange: (
    driveId: string,
    decision: ExclusionReviewDecision,
  ) => void
  onSyncBranch: (driveId: string) => void
  onToggle?: (driveId: string) => void
}

function getBackgroundColor(node: ExclusionReviewTreeNode): string {
  if (node.aggregateFolderStatus === 'allExcluded') {
    return 'rgba(187, 67, 67, 0.10)'
  }

  if (node.aggregateFolderStatus === 'allIncluded') {
    return 'rgba(83, 140, 81, 0.12)'
  }

  if (node.aggregateFolderStatus === 'mixedReviewed') {
    return 'rgba(72, 122, 199, 0.12)'
  }

  if (node.effectiveDecision === 'exclude') {
    return 'rgba(187, 67, 67, 0.10)'
  }

  if (node.effectiveDecision === 'include') {
    return 'rgba(83, 140, 81, 0.12)'
  }

  return 'transparent'
}

function isDecisionActive(
  node: ExclusionReviewTreeNode,
  decision: ExclusionReviewDecision,
): boolean {
  if (!decision) {
    return false
  }

  if (node.isInheritedLocked) {
    return node.effectiveDecision === decision
  }

  return node.explicitDecision === decision
}

function getDecisionButtonStyles(
  node: ExclusionReviewTreeNode,
  decision: ExclusionReviewDecision,
  disabled: boolean,
) {
  const active = isDecisionActive(node, decision)

  if (!active) {
    return {
      bgcolor: disabled ? 'rgba(0, 0, 0, 0.04)' : 'transparent',
      color: 'text.secondary',
    }
  }

  return decision === 'include'
    ? {
        bgcolor: disabled ? 'rgba(83, 140, 81, 0.10)' : 'rgba(83, 140, 81, 0.16)',
        color: 'rgb(37, 90, 35)',
      }
    : {
        bgcolor: disabled ? 'rgba(187, 67, 67, 0.10)' : 'rgba(187, 67, 67, 0.16)',
        color: 'rgb(126, 42, 42)',
      }
}

export function ExclusionReviewTreeRow({
  depth,
  isEditor,
  isExpanded = false,
  isLoading = false,
  node,
  onDecisionChange,
  onSyncBranch,
  onToggle,
}: ExclusionReviewTreeRowProps): ReactElement {
  const showToggle = node.itemType === 'folder'
  const decisionButtonsDisabled = !isEditor || node.isInheritedLocked
  const includeStyles = getDecisionButtonStyles(
    node,
    'include',
    decisionButtonsDisabled,
  )
  const excludeStyles = getDecisionButtonStyles(
    node,
    'exclude',
    decisionButtonsDisabled,
  )

  return (
    <Box
      sx={{
        bgcolor: getBackgroundColor(node),
        borderRadius: 2,
        display: 'grid',
        gap: 1,
        gridTemplateColumns: 'auto auto minmax(0, 1fr)',
        alignItems: 'center',
        minWidth: 0,
        px: 1.5,
        py: 0.75,
      }}
    >
      <Box sx={{ pl: `${depth * 16}px`, display: 'flex', alignItems: 'center' }}>
        {showToggle ? (
          <IconButton
            aria-label={isExpanded ? 'Collapse folder' : 'Expand folder'}
            onClick={() => onToggle?.(node.driveId)}
            size="small"
          >
            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </IconButton>
        ) : (
          <Box sx={{ width: 32 }} />
        )}
      </Box>

      <Box sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center' }}>
        {node.itemType === 'folder' ? <Folder size={18} /> : <FileText size={18} />}
      </Box>

      <Stack
        direction="row"
        spacing={0.75}
        sx={{ alignItems: 'center', justifySelf: 'start', minWidth: 0 }}
      >
        <Tooltip title={node.name}>
          <Typography
            noWrap
            sx={{
              flex: '0 1 auto',
              fontWeight: 500,
              minWidth: 0,
            }}
          >
            {node.name}
            {isLoading ? ' (loading...)' : ''}
          </Typography>
        </Tooltip>

        <Stack
          aria-label="Inline actions"
          direction="row"
          spacing={0.5}
          sx={{ alignItems: 'center', flexShrink: 0 }}
        >
          <IconButton
            aria-disabled={decisionButtonsDisabled}
            aria-label="Include"
            disabled={decisionButtonsDisabled}
            onClick={() =>
              onDecisionChange(
                node.driveId,
                node.explicitDecision === 'include' ? null : 'include',
              )
            }
            size="small"
            sx={{
              ...includeStyles,
              border: '1px solid rgba(0, 0, 0, 0.12)',
              borderRadius: 1.5,
              height: 28,
              width: 28,
            }}
          >
            <Typography fontWeight={700} variant="caption">
              i
            </Typography>
          </IconButton>
          <IconButton
            aria-disabled={decisionButtonsDisabled}
            aria-label="Exclude"
            disabled={decisionButtonsDisabled}
            onClick={() =>
              onDecisionChange(
                node.driveId,
                node.explicitDecision === 'exclude' ? null : 'exclude',
              )
            }
            size="small"
            sx={{
              ...excludeStyles,
              border: '1px solid rgba(0, 0, 0, 0.12)',
              borderRadius: 1.5,
              height: 28,
              width: 28,
            }}
          >
            <Typography fontWeight={700} variant="caption">
              e
            </Typography>
          </IconButton>
          {node.itemType === 'folder' ? (
            <IconButton
              aria-label="Sync branch"
              onClick={() => onSyncBranch(node.driveId)}
              size="small"
              sx={{
                border: '1px solid rgba(0, 0, 0, 0.12)',
                borderRadius: 1.5,
                height: 28,
                width: 28,
              }}
            >
              <RefreshCw size={14} />
            </IconButton>
          ) : null}
          <IconButton
            aria-label="Open in Drive"
            component="a"
            href={node.driveUrl}
            rel="noreferrer"
            size="small"
            target="_blank"
            sx={{
              border: '1px solid rgba(0, 0, 0, 0.12)',
              borderRadius: 1.5,
              height: 28,
              width: 28,
            }}
          >
            <ExternalLink size={14} />
          </IconButton>
        </Stack>
      </Stack>
    </Box>
  )
}
