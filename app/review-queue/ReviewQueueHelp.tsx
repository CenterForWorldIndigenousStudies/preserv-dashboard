import type { ReactElement } from 'react'
import { Box, Stack, Typography } from '@mui/material'

const HELP_SECTIONS = [
  {
    title: 'Find documents',
    items: [
      {
        label: 'Search',
        description: 'Find documents by name, legacy ID, or batch. The table updates as you type.',
      },
      {
        label: 'Advanced Search',
        description:
          'Narrow the queue with filters such as contributor, publisher, batch, tag, validation status, document type, dates, and access level. Apply Filters updates the table; Reset clears the filters.',
      },
      {
        label: 'Results',
        description: 'Shows how many documents match the current search and filters.',
      },
      {
        label: 'Sorting, rows per page, and pagination',
        description:
          'Use a sortable column heading to change the order, choose how many rows to show, and use Previous and Next to move through pages.',
      },
    ],
  },
  {
    title: 'Understand a row',
    items: [
      {
        label: 'Selection checkbox',
        description: 'Select one or more documents before using the Actions menu.',
      },
      {
        label: 'Document',
        description:
          'Shows the name and identifiers. Select the name to open Document Details, where you can inspect or edit the document.',
      },
      {
        label: 'Validation Status',
        description:
          'Shows the current validation result. Select a status with review reasons to see what needs attention and, when available, open pipeline diagnostics.',
      },
      {
        label: 'Review Details',
        description:
          'Shows the validation date, validator name, and a Comments control when review comments are available.',
      },
      {
        label: 'Checklist',
        description:
          'Tracks metadata, rights, classification, duplicates, and completeness review. Its count shows completed items; changes are saved for other reviewers.',
      },
      {
        label: 'Highlighted rows',
        description: 'A highlighted row indicates that the document is already in an open reprocessing draft.',
      },
    ],
  },
  {
    title: 'Take action',
    items: [
      {
        label: 'Actions',
        description: 'Acts on the selected documents. The button is unavailable until a document is selected.',
      },
      {
        label: 'Approve',
        description:
          'Checks each selected document against readiness requirements and moves eligible documents to Ready for Library. Completing the checklist alone does not make a document eligible.',
      },
      {
        label: 'Reject',
        description:
          'Records a rejection decision for the selected documents and removes them from the active review queue.',
      },
      {
        label: 'Reprocess',
        description:
          'Adds the selected documents to a new or existing reprocessing draft. You can review and start that batch later from Process.',
      },
      {
        label: 'Remove from draft',
        description:
          'Appears when a selected document is in an open reprocessing draft. It removes the draft association without deleting the document.',
      },
      {
        label: 'Batch cart',
        description: 'Shows open draft batches and lets you open them in Process to continue setup.',
      },
    ],
  },
] as const

export function ReviewQueueHelp(): ReactElement {
  return (
    <Stack component={'article'} spacing={3}>
      <Typography variant={'body2'} color={'text.secondary'}>
        {'Use this page to investigate documents that need human review and decide what happens next.'}
      </Typography>
      {HELP_SECTIONS.map((section) => (
        <Stack component={'section'} key={section.title} spacing={1}>
          <Typography component={'h2'} variant={'subtitle1'} sx={{ fontWeight: 600 }}>
            {section.title}
          </Typography>
          <Box component={'dl'} sx={{ m: 0, display: 'grid', gap: 1.5 }}>
            {section.items.map((item) => (
              <Box component={'div'} key={item.label}>
                <Typography component={'dt'} variant={'subtitle2'}>
                  {item.label}
                </Typography>
                <Typography component={'dd'} variant={'body2'} color={'text.secondary'} sx={{ m: 0, lineHeight: 1.6 }}>
                  {item.description}
                </Typography>
              </Box>
            ))}
          </Box>
        </Stack>
      ))}
    </Stack>
  )
}
