import { describe, expect, it } from 'vitest'

import { PIPELINE_STAGE_STATUSES } from '@constants/pipelineStageStatuses'

describe('pipeline stage statuses', () => {
  it('defines the statuses emitted by pipeline services', () => {
    expect(PIPELINE_STAGE_STATUSES).toMatchObject({
      ACCEPTED: 'accepted',
      PENDING: 'pending',
      QUEUED: 'queued',
      RUNNING: 'running',
      COMPLETED: 'completed',
      FAILED: 'failed',
      REVIEW_NEEDED: 'review_needed',
      PUBLISHED: 'published',
      ERROR: 'error',
      IN_PROGRESS: 'in_progress',
      PROCESSING: 'processing',
    })
  })
})
