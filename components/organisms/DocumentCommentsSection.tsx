import type { ReactElement } from 'react'

import { MetadataTable } from '@molecules/MetadataTable'
import { MetadataValue } from '@molecules/MetadataValue'
import { buildCommentFields } from '@lib/documentDetailViewModel'
import { DetailPageSection } from '@organisms/DetailPageSection'
import type { DocumentDetail } from 'types/documents'
import type { MetadataField } from 'types/metadata'

export interface DocumentCommentsSectionProps {
  metadata: MetadataField[]
  quality: DocumentDetail['quality']
}

export function DocumentCommentsSection({ metadata, quality }: DocumentCommentsSectionProps): ReactElement {
  return (
    <DetailPageSection title={'Comments'}>
      <MetadataTable
        fields={buildCommentFields(metadata, quality)}
        renderValue={(field) => <MetadataValue field={field} />}
      />
    </DetailPageSection>
  )
}
