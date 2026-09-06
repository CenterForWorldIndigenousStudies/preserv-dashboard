import type { ReactElement } from 'react'

import { DateAtom } from '@atoms/Date'
import { DetailFieldGrid, type DetailField } from '@molecules/DetailFieldGrid'

interface BatchOverviewFieldsProps {
  createdAt: string | Date | null | undefined
  startedAt: string | Date | null | undefined
  requestedStages: readonly string[]
  lifecycleStatus?: string | null
  publicationStatus?: string | null
  additionalFields?: readonly DetailField[]
}

const FIELD_DESCRIPTIONS = {
  created: 'When the batch record was created.',
  started: 'When processing actually began.',
  requestedStage: 'The pipeline stage from which processing was requested.',
  lifecycle: 'The batch’s current lifecycle state.',
  publication: 'The batch’s publication state.',
} as const

export function BatchOverviewFields({
  createdAt,
  startedAt,
  requestedStages,
  lifecycleStatus,
  publicationStatus,
  additionalFields = [],
}: BatchOverviewFieldsProps): ReactElement {
  return (
    <DetailFieldGrid
      fields={[
        ...additionalFields,
        {
          key: 'created',
          label: 'Created',
          description: FIELD_DESCRIPTIONS.created,
          value: <DateAtom value={createdAt} />,
        },
        {
          key: 'started',
          label: 'Started',
          description: FIELD_DESCRIPTIONS.started,
          value: startedAt ? <DateAtom value={startedAt} /> : 'Not started',
        },
        {
          key: 'requestedStage',
          label: 'Requested Stage',
          description: FIELD_DESCRIPTIONS.requestedStage,
          value: requestedStages.length > 0 ? requestedStages.join(', ') : 'Ingest only',
        },
        {
          key: 'lifecycle',
          label: 'Lifecycle',
          description: FIELD_DESCRIPTIONS.lifecycle,
          value: lifecycleStatus ?? 'Unknown',
        },
        {
          key: 'publication',
          label: 'Publication',
          description: FIELD_DESCRIPTIONS.publication,
          value: publicationStatus ?? 'Unknown',
        },
      ]}
    />
  )
}
