import type { ReactElement, ReactNode } from 'react'
import { Box, Typography } from '@mui/material'

import { FileSize } from '@atoms/FileSize'
import { DateAtom } from '@atoms/Date'
import { DetailFieldGrid } from '@molecules/DetailFieldGrid'
import { MetadataValue } from '@molecules/MetadataValue'
import { DetailPageSection } from '@organisms/DetailPageSection'
import { parseMetadataValue } from '@lib/metadata'
import type { DocumentDetail } from 'types/documents'
import type { MetadataField } from 'types/metadata'

const documentPropertyFieldLabels: Array<{ key: string; label: string }> = [
  { key: 'name', label: 'Name' },
  { key: 'id', label: 'Document ID' },
  { key: 'filesize', label: 'File Size' },
  { key: 'hashBinary', label: 'File Hash' },
  { key: 'hashContent', label: 'Content Hash' },
  { key: 'contentHashAlgorithm', label: 'Content Hash Algorithm' },
  { key: 'mimeType', label: 'MIME Type' },
  { key: 'fileExtension', label: 'File Extension' },
  { key: 'created_at', label: 'Created At' },
  { key: 'updated_at', label: 'Updated At' },
  { key: 'characterCount', label: 'Character Count' },
]

const legacyDocumentPropertyFieldLabels: Array<{ key: string; label: string }> = [
  { key: 'idLegacy', label: 'Legacy ID' },
  { key: 'legacyFileSizeOrigin', label: 'Legacy Origin File Size' },
  { key: 'legacyFormatOrigin', label: 'Legacy Origin File Format' },
]

const legacyDocumentPropertyMetadataNames: Record<string, string> = {
  legacyFileSizeOrigin: 'legacy_file_size_origin',
  legacyFormatOrigin: 'legacy_format_origin',
}

export interface DocumentPropertiesSectionProps {
  document: DocumentDetail['document']
  metadata: MetadataField[]
}

function renderPropertyMetadataValue(field: MetadataField | undefined): ReactNode {
  if (!field) return '—'

  if (field.name === 'legacy_file_size_origin') {
    const parsed = parseMetadataValue(field.value, field.value_type)
    const rawValue = Number(parsed.plainText)
    return Number.isFinite(rawValue) ? <FileSize value={rawValue} /> : parsed.display
  }

  return <MetadataValue field={field} />
}

export function DocumentPropertiesSection({ document, metadata }: DocumentPropertiesSectionProps): ReactElement {
  const metadataByName = new Map(metadata.map((field) => [field.name, field]))
  const documentPropertyValues: Record<string, ReactNode> = {
    id: document.id,
    name: document.name ?? '—',
    filesize: <FileSize value={document.filesize} />,
    hashBinary: document.hash_binary ?? '—',
    hashContent: document.hash_content ?? '—',
    contentHashAlgorithm: renderPropertyMetadataValue(metadataByName.get('content_hash_algorithm')),
    mimeType: renderPropertyMetadataValue(metadataByName.get('mime_type')),
    fileExtension: renderPropertyMetadataValue(metadataByName.get('file_extension')),
    created_at: <DateAtom value={document.created_at} />,
    updated_at: <DateAtom value={document.updated_at} />,
    characterCount: renderPropertyMetadataValue(metadataByName.get('character_count')),
  }
  const legacyDocumentPropertyValues: Record<string, ReactNode> = {
    idLegacy: document.id_legacy,
    legacyFileSizeOrigin: renderPropertyMetadataValue(metadataByName.get('legacy_file_size_origin')),
    legacyFormatOrigin: renderPropertyMetadataValue(metadataByName.get('legacy_format_origin')),
  }
  const legacyFields = legacyDocumentPropertyFieldLabels.filter(
    (field) =>
      field.key === 'idLegacy' || Boolean(metadataByName.get(legacyDocumentPropertyMetadataNames[field.key])?.value),
  )

  return (
    <DetailPageSection title={'Document Properties'}>
      <DetailFieldGrid
        fields={documentPropertyFieldLabels.map((field) => ({
          key: field.key,
          label: field.label,
          value: documentPropertyValues[field.key] ?? '—',
        }))}
      />
      {document.id_legacy ? (
        <Box sx={{ mt: 3 }}>
          <Typography component={'h3'} variant={'h6'} color={'text.primary'}>
            {'Legacy'}
          </Typography>
          <DetailFieldGrid
            fields={legacyFields.map((field) => ({
              key: field.key,
              label: field.label,
              value: legacyDocumentPropertyValues[field.key] ?? '—',
            }))}
          />
        </Box>
      ) : null}
    </DetailPageSection>
  )
}
