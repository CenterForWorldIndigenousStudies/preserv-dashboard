'use client'

import type { ReactElement, ReactNode } from 'react'
import { Box, Divider, Stack, Typography } from '@mui/material'

import { DocumentRelationshipEditor } from '@molecules/DocumentRelationshipEditor'
import { useDocumentEditContext } from '@lib/hooks/useDocumentEditContext'
import { DOCUMENTS_PATH } from '@constants/paths'
import { ValuePillList } from '@molecules/ValuePillList'
import type { DocumentToContributor, DocumentToPublisher } from 'types/documents'

interface DocumentMetadataRelationshipGroup {
  title: string
  values: string[]
  getTooltip: (value: string, index: number) => ReactNode
  getHref: (value: string, index: number) => string | undefined
}

interface DocumentMetadataRelationshipsProps {
  contributors: DocumentToContributor[]
  publishers: DocumentToPublisher[]
}

function buildDocumentsFilterHref(parameter: 'contributor' | 'publisher', value: string): string {
  const searchParams = new URLSearchParams({ [parameter]: value })
  return `${DOCUMENTS_PATH}?${searchParams.toString()}`
}

function buildMetadataRelationshipGroups(
  contributors: DocumentToContributor[],
  publishers: DocumentToPublisher[],
): DocumentMetadataRelationshipGroup[] {
  const contributorValues = contributors.map((contributor) =>
    [contributor.contributor_name ?? contributor.contributor_id, contributor.role, contributor.type]
      .filter((value): value is string => Boolean(value))
      .join(' · '),
  )
  const publisherValues = publishers.map((publisher) => publisher.publisher_name ?? publisher.publisher_id)

  return [
    {
      title: 'Contributors',
      values: contributorValues,
      getTooltip: (_value: string, index: number) => contributors[index]?.notes ?? null,
      getHref: (_value: string, index: number) => {
        const name = contributors[index]?.contributor_name?.trim()
        return name ? buildDocumentsFilterHref('contributor', name) : undefined
      },
    },
    {
      title: 'Publishers',
      values: publisherValues,
      getTooltip: (_value: string, index: number) => publishers[index]?.notes ?? null,
      getHref: (_value: string, index: number) => {
        const name = publishers[index]?.publisher_name?.trim()
        return name ? buildDocumentsFilterHref('publisher', name) : undefined
      },
    },
  ].filter((group) => group.values.length > 0)
}

export function DocumentMetadataRelationships({
  contributors,
  publishers,
}: DocumentMetadataRelationshipsProps): ReactElement | null {
  const editContext = useDocumentEditContext()

  if (editContext?.isEditing) {
    return (
      <>
        <Divider sx={{ my: 4 }} />
        <Typography component={'h3'} variant={'h6'} color={'text.primary'}>
          {'Contributors and Publishers'}
        </Typography>
        <Stack spacing={3} sx={{ mt: 3 }}>
          <DocumentRelationshipEditor
            contributors={editContext.draft.contributors}
            publishers={editContext.draft.publishers}
            onContributorsChange={editContext.updateContributors}
            onPublishersChange={editContext.updatePublishers}
          />
        </Stack>
      </>
    )
  }

  const relationshipGroups = buildMetadataRelationshipGroups(contributors, publishers)
  if (relationshipGroups.length === 0) return null

  return (
    <>
      <Divider sx={{ my: 4 }} />
      <Typography component={'h3'} variant={'h6'} color={'text.primary'}>
        {'Contributors and Publishers'}
      </Typography>
      <Stack spacing={3} sx={{ mt: 3 }}>
        {relationshipGroups.map((group) => (
          <Box key={group.title}>
            <Typography component={'h4'} variant={'subtitle1'} color={'text.primary'}>
              {group.title}
            </Typography>
            <ValuePillList values={group.values} getTooltip={group.getTooltip} getHref={group.getHref} />
          </Box>
        ))}
      </Stack>
    </>
  )
}
