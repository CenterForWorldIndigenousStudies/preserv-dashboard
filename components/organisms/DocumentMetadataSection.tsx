import type { ReactElement } from 'react'
import { Divider, Stack, Typography } from '@mui/material'

import { AccordionPanel } from '@molecules/AccordionPanel'
import { DocumentMetadataRelationships } from '@molecules/DocumentMetadataRelationships'
import { MetadataTable } from '@molecules/MetadataTable'
import { MetadataValue } from '@molecules/MetadataValue'
import { ValuePillList } from '@molecules/ValuePillList'
import { DOCUMENT_ACCESS_LEVEL_FIELD } from '@constants/documentEditing'
import { getCollectionDetailPath } from '@constants/paths'
import {
  buildDisplayedMetadata,
  buildStageMetadata,
  ensureRequiredReadinessMetadata,
  recordedSourceMetadataKeys,
} from '@lib/documentDetailViewModel'
import { DetailPageSection } from '@organisms/DetailPageSection'
import type { DocumentDetail } from 'types/documents'
import type { MetadataField } from 'types/metadata'

export interface DocumentMetadataSectionProps {
  metadata: MetadataField[]
  collections?: Array<{ id: string; name: string }>
  accessLevels: DocumentDetail['access_levels']
  contributors: DocumentDetail['document_to_contributors']
  publishers: DocumentDetail['document_to_publishers']
  documentName?: string | null
  collectionReturnHref?: string
  collectionReturnLabel?: string
}

export function DocumentMetadataSection({
  metadata,
  collections = [],
  accessLevels,
  contributors,
  publishers,
  documentName,
  collectionReturnHref,
  collectionReturnLabel,
}: DocumentMetadataSectionProps): ReactElement {
  const metadataWithRequiredFields = ensureRequiredReadinessMetadata(metadata)
  const collectionsField: MetadataField = {
    name: 'collections',
    displayName: 'Collections',
    value: JSON.stringify(collections.map((collection) => collection.name)),
    value_type: 'json',
    notes: 'Collections are calculated from document tags and qualifying metadata values.',
  }
  const accessLevelField: MetadataField = {
    name: DOCUMENT_ACCESS_LEVEL_FIELD,
    displayName: 'Access Level',
    value: JSON.stringify({ value: accessLevels.join(', ') }),
    value_type: 'access_level',
    notes: 'Access level assigned to the document.',
  }
  const displayedMetadata = [
    collectionsField,
    accessLevelField,
    ...buildDisplayedMetadata(metadataWithRequiredFields).filter((field) => field.name !== DOCUMENT_ACCESS_LEVEL_FIELD),
  ]
  const stageMetadata = buildStageMetadata(metadataWithRequiredFields)
  const recordedSourceMetadata = metadataWithRequiredFields.filter((field) =>
    recordedSourceMetadataKeys.has(field.name),
  )

  return (
    <DetailPageSection title={'Metadata'}>
      <MetadataTable
        fields={displayedMetadata}
        renderValue={(field) =>
          field.name === 'collections' ? (
            <ValuePillList
              values={collections.map((collection) => collection.name)}
              emptyMessage={'—'}
              getHref={(_, index) => {
                const collection = collections[index]
                return collection
                  ? getCollectionDetailPath(collection.id, collectionReturnHref, collectionReturnLabel)
                  : undefined
              }}
            />
          ) : (
            <MetadataValue field={field} fileName={documentName} />
          )
        }
      />
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
                renderValue={(field) => <MetadataValue field={field} fileName={documentName} />}
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
            renderValue={(field) => <MetadataValue field={field} fileName={documentName} />}
          />
        </>
      ) : null}
    </DetailPageSection>
  )
}
