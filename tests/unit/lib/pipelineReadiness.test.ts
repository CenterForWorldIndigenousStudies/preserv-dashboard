import { describe, expect, it, vi } from 'vitest'

vi.mock('@lib/db', () => ({ db: {} }))

import { evaluateDocumentReadiness } from '@lib/pipelineReadiness'
import type { PrismaClient } from '@lib/prisma/generated/client'

function buildClient({ missingTitle = false, accessLevels = ['public'] } = {}): PrismaClient {
  const metadata: Record<string, unknown> = {
    preservation_candidate: true,
    dc_title: missingTitle ? '' : 'Preservation report',
    dc_date: '2026',
    dc_type: 'Text',
    dc_language_iso: 'en',
    dc_description_abstract: 'An archival report.',
    dc_rights: 'Copyright retained by the author.',
    dc_subject_unesco: ['Cultural heritage'],
  }
  return {
    document_to_metadata: {
      findMany: () => Promise.resolve(Object.entries(metadata).map(([name, value]) => ({
        metadata: { name }, value: JSON.stringify({ value }),
      }))),
    },
    document_access: {
      findMany: () => Promise.resolve(accessLevels.map((level_name) => ({ access_levels: { level_name } }))),
    },
    document_to_batches: {
      findMany: () => Promise.resolve([{
        document_id: 'document-1',
        processing_details: JSON.stringify({ metadata_validator: { low_confidence_fields: ['dc_title'] } }),
      }]),
    },
  } as unknown as PrismaClient
}

describe('pipeline readiness after validator retirement', () => {
  it('evaluates current metadata without retired confidence diagnostics', async () => {
    const result = await evaluateDocumentReadiness('document-1', buildClient())
    expect(result.isPreservationCandidate).toBe(true)
    expect(result.evaluation.approved).toBe(true)
    expect(result.evaluation.unmetRequirements).toEqual([])
  })

  it('still requires an access assignment', async () => {
    const result = await evaluateDocumentReadiness('document-1', buildClient({ accessLevels: [] }))
    expect(result.evaluation.approved).toBe(false)
    expect(result.evaluation.unmetRequirements).toContain('access_level')
  })

  it('still requires a title', async () => {
    const result = await evaluateDocumentReadiness('document-1', buildClient({ missingTitle: true }))
    expect(result.evaluation.approved).toBe(false)
    expect(result.evaluation.unmetRequirements).toContain('dc_title')
  })
})
