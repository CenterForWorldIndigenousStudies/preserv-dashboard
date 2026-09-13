import type { ReactElement } from 'react'
import { Divider, Stack, Typography } from '@mui/material'

import { AccordionPanel } from '@molecules/AccordionPanel'
import { DocumentMetadataRelationships } from '@molecules/DocumentMetadataRelationships'
import { MetadataTable } from '@molecules/MetadataTable'
import { MetadataValue } from '@molecules/MetadataValue'
import { buildDisplayedMetadata, buildStageMetadata, recordedSourceMetadataKeys } from '@lib/documentDetailViewModel'
import { DetailPageSection } from '@organisms/DetailPageSection'
import type { DocumentDetail } from 'types/documents'
import type { MetadataField } from 'types/metadata'

export interface DocumentMetadataSectionProps {
  metadata: MetadataField[]
  contributors: DocumentDetail['document_to_contributors']
  publishers: DocumentDetail['document_to_publishers']
}

export function DocumentMetadataSection({
  metadata,
  contributors,
  publishers,
}: DocumentMetadataSectionProps): ReactElement {
  const displayedMetadata = buildDisplayedMetadata(metadata)
  const stageMetadata = buildStageMetadata(metadata)
  const recordedSourceMetadata = metadata.filter((field) => recordedSourceMetadataKeys.has(field.name))

  return (
    <DetailPageSection title={'Metadata'}>
      <MetadataTable fields={displayedMetadata} renderValue={(field) => <MetadataValue field={field} />} />
      <DocumentMetadataRelationships contributors={contributors} publishers={publishers} />
      {stageMetadata.length > 0 ? (
        <Stack spacing={2} sx={{ mt: 3 }}>
          {stageMetadata.map((group) => (
            <AccordionPanel
              key={group.title}
              defaultExpanded={false}
              summary={
                <Typography component={'h3'} variant={'h6'} color={'text.primary'}>
                  {group.title}
                </Typography>
              }
            >
              <MetadataTable
                fields={group.fields}
                editable={false}
                renderValue={(field) => <MetadataValue field={field} />}
              />
            </AccordionPanel>
          ))}
        </Stack>
      ) : null}
      {recordedSourceMetadata.length > 0 ? (
        <>
          <Divider sx={{ my: 4 }} />
          <Typography component={'h3'} variant={'h6'} color={'text.primary'}>
            {'Recorded source metadata'}
          </Typography>
          <MetadataTable
            fields={recordedSourceMetadata}
            minWidth={520}
            editable={false}
            renderValue={(field) => <MetadataValue field={field} />}
          />
        </>
      ) : null}
    </DetailPageSection>
  )
}
