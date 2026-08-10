'use client'

import { useId, useState, type KeyboardEvent, type ReactElement, type ReactNode } from 'react'
import { Box, Stack, Typography } from '@mui/material'

import { READY_FOR_LIBRARY_PATH } from '@constants/paths'
import { Badge } from '@atoms/Badges/Badge'
import { ActionCard } from '@molecules/ActionCard'

type ReviewQueueTabId = 'needsReview' | 'readyForLibrary'

interface ReviewQueueTabbedWorkspaceProps {
  needsReviewCount: number
  readyForLibraryCount: number
  needsReviewPanel: ReactNode
}

const REVIEW_QUEUE_TAB_ORDER: ReviewQueueTabId[] = ['needsReview', 'readyForLibrary']

function getTabLabel(tabId: ReviewQueueTabId): string {
  return tabId === 'needsReview' ? 'Needs Review' : 'Ready for Library'
}

export function ReviewQueueTabbedWorkspace({
  needsReviewCount,
  readyForLibraryCount,
  needsReviewPanel,
}: ReviewQueueTabbedWorkspaceProps): ReactElement {
  const [activeTab, setActiveTab] = useState<ReviewQueueTabId>('needsReview')
  const tabsetId = useId()

  const tabIds = {
    needsReview: `${tabsetId}-tab-needs-review`,
    readyForLibrary: `${tabsetId}-tab-ready-for-library`,
  } as const

  const panelIds = {
    needsReview: `${tabsetId}-panel-needs-review`,
    readyForLibrary: `${tabsetId}-panel-ready-for-library`,
  } as const

  function moveFocus(currentTab: ReviewQueueTabId, direction: -1 | 1): void {
    const currentIndex = REVIEW_QUEUE_TAB_ORDER.indexOf(currentTab)
    const nextIndex = (currentIndex + direction + REVIEW_QUEUE_TAB_ORDER.length) % REVIEW_QUEUE_TAB_ORDER.length
    const nextTab = REVIEW_QUEUE_TAB_ORDER[nextIndex]

    if (!nextTab) {
      return
    }

    setActiveTab(nextTab)
    document.getElementById(tabIds[nextTab])?.focus()
  }

  function handleTabKeyDown(tabId: ReviewQueueTabId, event: KeyboardEvent<HTMLButtonElement>): void {
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      moveFocus(tabId, 1)
      return
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      moveFocus(tabId, -1)
    }
  }

  return (
    <Stack
      component={'section'}
      spacing={3}
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: '1.5rem',
        bgcolor: 'background.paper',
        p: 3,
      }}
    >
      <Box>
        <Typography component={'h2'} variant={'h5'} sx={{ color: 'text.primary' }}>
          {'Review decisions and next step'}
        </Typography>
        <Typography variant={'body2'} sx={{ mt: 1, color: 'text.secondary' }}>
          {
            'Review Queue is where human judgment happens. Approve and reject decisions happen here, and approved work continues to Ready for Library as the next operational  checkpoint.'
          }
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 2 }}>
          <Badge variant={'danger'} sx={{ alignSelf: 'flex-start' }}>
            {`${needsReviewCount} need review`}
          </Badge>
          <Badge variant={'success'} sx={{ alignSelf: 'flex-start' }}>
            {`${readyForLibraryCount} ready for library`}
          </Badge>
        </Stack>
      </Box>

      <Box
        role={'tablist'}
        aria-label={'Review Queue sections'}
        sx={{
          display: 'flex',
          gap: 1,
          borderBottom: '1px solid',
          borderColor: 'divider',
          overflowX: 'auto',
          pb: 1,
        }}
      >
        {REVIEW_QUEUE_TAB_ORDER.map((tabId) => {
          const isActive = activeTab === tabId
          const count = tabId === 'needsReview' ? needsReviewCount : readyForLibraryCount

          return (
            <Box
              key={tabId}
              component={'button'}
              id={tabIds[tabId]}
              role={'tab'}
              type={'button'}
              aria-selected={isActive}
              aria-controls={panelIds[tabId]}
              onClick={() => setActiveTab(tabId)}
              onKeyDown={(event: KeyboardEvent<HTMLButtonElement>) => handleTabKeyDown(tabId, event)}
              sx={{
                border: 'none',
                borderRadius: '999px',
                bgcolor: isActive ? 'text.primary' : 'transparent',
                color: isActive ? 'common.white' : 'text.primary',
                cursor: 'pointer',
                font: 'inherit',
                px: 2,
                py: 1,
                whiteSpace: 'nowrap',
              }}
            >
              {`${getTabLabel(tabId)} (${count})`}
            </Box>
          )
        })}
      </Box>

      <Box
        id={panelIds.needsReview}
        role={'tabpanel'}
        aria-labelledby={tabIds.needsReview}
        hidden={activeTab !== 'needsReview'}
      >
        {needsReviewPanel}
      </Box>

      <Box
        id={panelIds.readyForLibrary}
        role={'tabpanel'}
        aria-labelledby={tabIds.readyForLibrary}
        hidden={activeTab !== 'readyForLibrary'}
      >
        <Stack spacing={2.5}>
          <Box>
            <Typography component={'h3'} variant={'h5'} sx={{ color: 'text.primary' }}>
              {'Ready for Library preview'}
            </Typography>
            <Typography variant={'body2'} sx={{ mt: 1, color: 'text.secondary' }}>
              {
                'Approved documents leave the review queue and move into Ready for Library as the next operational checkpoint before handoff.'
              }
            </Typography>
          </Box>

          <Badge variant={'success'} sx={{ alignSelf: 'flex-start' }}>
            {`${readyForLibraryCount} documents currently ready for library review`}
          </Badge>

          <Typography variant={'body2'} sx={{ color: 'text.secondary' }}>
            {
              'Use the standalone Ready for Library workspace to inspect the ingest-ready backlog, review edge cases, and continue pre-handoff readiness work.'
            }
          </Typography>

          <ActionCard
            href={READY_FOR_LIBRARY_PATH}
            eyebrow={'Next Operational Checkpoint'}
            title={'Ready for Library'}
            description={'Open the standalone readiness workspace for approved documents before handoff.'}
            label={'Open Ready for Library'}
          />
        </Stack>
      </Box>
    </Stack>
  )
}
