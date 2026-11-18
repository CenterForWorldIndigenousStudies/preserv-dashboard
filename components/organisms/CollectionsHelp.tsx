import type { ReactElement } from 'react'
import { Box, Stack, Typography } from '@mui/material'

import { COLLECTION_LIBRARY_ID_LABEL } from '@constants/collections'

const HELP_SECTIONS = [
  {
    title: 'Find a collection',
    items: [
      {
        label: 'Search and Advanced Search',
        description: 'Search names and IDs, or use Advanced Search to narrow the list by document criteria.',
      },
      {
        label: 'Name and Document Count',
        description:
          'Select a collection name to view its documents. Document Count shows its current membership, including documents that qualify only through metadata.',
      },
      {
        label: 'Select a row',
        description:
          'Select one collection with its checkbox before opening Actions. On the collection details page, Actions applies to the collection already open.',
      },
    ],
  },
  {
    title: 'Create a collection',
    items: [
      {
        label: 'Add Collection',
        description: 'Open the form with Add Collection above the table. A collection needs a unique name.',
      },
      {
        label: 'Canonical qualifier',
        description:
          'Choose an existing tag or create one for the collection name. This required tag is added when you explicitly add a document to the collection.',
      },
      {
        label: 'Additional qualifiers',
        description:
          'Add existing or new tags as alternate ways for documents to qualify. A document belongs when any qualifier matches one of its tags or an entire value in cultural coverage, subject, UNESCO subject, long-tail keyword, or SEO keyword metadata. Matching ignores case and extra spacing.',
      },
      {
        label: 'Notes',
        description:
          'Collection notes describe the collection. Tag notes are available when you create a new canonical tag.',
      },
      {
        label: COLLECTION_LIBRARY_ID_LABEL,
        description: `You can set the ${COLLECTION_LIBRARY_ID_LABEL} now or later. Every collection a document belongs to needs one before that document can reach Ready for Library.`,
      },
    ],
  },
  {
    title: 'Change a collection',
    items: [
      {
        label: 'Edit',
        description: `Use Actions > Edit to change additional qualifiers, notes, or the ${COLLECTION_LIBRARY_ID_LABEL}. Removing a qualifier does not delete its tag from documents, but documents that qualified only through it may leave the collection. Use Rename to change the name.`,
      },
      {
        label: 'Rename',
        description:
          'Choose a new or existing tag for the new name. The old tag is not renamed or deleted. Keep currently associated documents is checked by default and adds the new canonical tag to those documents. If unchecked, documents stay only if their tags or metadata match a qualifier for the renamed collection.',
      },
      {
        label: 'Add Documents',
        description:
          'Find documents in Available Documents with search or Advanced Search, select them, then confirm. This adds the collection’s canonical tag to each selected document.',
      },
      {
        label: 'Remove Documents',
        description:
          'Choose documents in Documents in Collection, then confirm. This removes only the canonical tag. A document still belongs if another qualifier tag or matching metadata remains; edit that metadata in Document Details to remove metadata-only membership. This action is disabled when the collection has no documents.',
      },
    ],
  },
  {
    title: 'Delete a collection',
    items: [
      {
        label: 'Delete',
        description:
          'Use Actions > Delete to remove the collection definition. By default, its tags and their links to documents remain.',
      },
      {
        label: 'Also delete tag(s) and remove from all documents',
        description:
          'Select this option to delete eligible collection tags and remove their document links. Tags used by another collection are retained and shown in a warning. Document metadata is never changed by this option.',
      },
    ],
  },
] as const

export function CollectionsHelp(): ReactElement {
  return (
    <Stack component={'article'} spacing={3}>
      <Typography variant={'body2'} color={'text.secondary'}>
        {
          'Collections are calculated from document tags and metadata. A document can belong to more than one collection.'
        }
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
