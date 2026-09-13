import type { ReactElement } from 'react'
import { Stack, Typography } from '@mui/material'

import { DateAtom } from '@atoms/Date'
import { DetailFieldGrid } from '@molecules/DetailFieldGrid'
import { DetailPageSection } from '@organisms/DetailPageSection'
import { DocumentVersionsButton } from '@organisms/DocumentVersionsButton'
import type { DocumentDetail } from 'types/documents'

export interface DocumentVersionsSectionProps {
  versionFamily: DocumentDetail['version_family']
  versions: DocumentDetail['versions']
  returnHref: string
  documentName: string
  isDuplicate?: boolean
}

export function DocumentVersionsSection({
  versionFamily,
  versions,
  returnHref,
  documentName,
  isDuplicate = false,
}: DocumentVersionsSectionProps): ReactElement {
  return (
    <DetailPageSection
      title={'Versions'}
      description={'Open the related document versions and duplicates for this record.'}
      actions={
        versionFamily ? (
          <DocumentVersionsButton
            versionFamily={versionFamily}
            returnHref={returnHref}
            returnDocumentName={documentName}
          />
        ) : null
      }
    >
      {versions.length > 0 ? (
        <Stack spacing={3}>
          {versions.map((version) => (
            <DetailFieldGrid
              key={version.id}
              fields={[
                { key: 'version-group', label: 'Version Group', value: version.version_group_id },
                { key: 'changes-summary', label: 'Changes Summary', value: version.changes_summary ?? '-' },
                { key: 'notes', label: 'Notes', value: version.notes ?? '-' },
                {
                  key: 'similarity',
                  label: 'Similarity',
                  value: version.similarity_score !== null ? version.similarity_score : '-',
                },
                {
                  key: 'analyzed-at',
                  label: 'Analyzed At',
                  value: version.analyzed_at !== null ? <DateAtom value={version.analyzed_at} /> : '-',
                },
              ]}
            />
          ))}
        </Stack>
      ) : null}
      {versionFamily && versions.length === 0 ? (
        <Typography variant={'body2'} color={'text.secondary'}>
          {'No version membership records are stored for this document.'}
        </Typography>
      ) : null}
      {!versionFamily && isDuplicate ? (
        <Typography variant={'body2'} color={'text.secondary'}>
          {
            'This document is tagged as a duplicate, but the current registry data did not include a version group or duplicate family for it. The overview can flag it as duplicate, but the related duplicate set is not available to display here yet.'
          }
        </Typography>
      ) : null}
      {!versionFamily && !isDuplicate ? (
        <Typography variant={'body2'} color={'text.secondary'}>
          {'No related versions available.'}
        </Typography>
      ) : null}
    </DetailPageSection>
  )
}
