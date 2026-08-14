import { describe, expect, it } from 'vitest'

import {
  REQUIRED_READINESS_FIELDS,
  evaluateCandidateReadiness,
  projectCandidateMetadata,
} from '@lib/readiness'

const completeMetadata = (): Record<string, unknown> => ({
  dc_title: 'A document',
  dc_date: '2025',
  dc_type: 'Report',
  dc_language_iso: 'eng',
  dc_description_abstract: 'An abstract.',
  dc_rights: 'Public domain',
  dc_subject_unesco: 'Indigenous peoples',
})

describe('candidate readiness', () => {
  it('approves a complete candidate and projects the UNESCO subject', () => {
    const metadata = projectCandidateMetadata({
      metadata: completeMetadata(),
      validatedFields: Object.fromEntries(REQUIRED_READINESS_FIELDS.map((field) => [field, true])),
    })

    const result = evaluateCandidateReadiness({
      metadata,
      validatedFields: Object.fromEntries(REQUIRED_READINESS_FIELDS.map((field) => [field, true])),
      accessLevels: ['public'],
    })

    expect(metadata.dc_subject).toBe('Indigenous peoples')
    expect(result).toEqual({ approved: true, unmetRequirements: [], reasonGroups: [] })
  })

  it('returns a field-specific reason for missing metadata', () => {
    const metadata = completeMetadata()
    delete metadata.dc_description_abstract

    const result = evaluateCandidateReadiness({
      metadata: projectCandidateMetadata({ metadata, validatedFields: {} }),
      validatedFields: {},
      accessLevels: ['public'],
    })

    expect(result.unmetRequirements).toEqual(['dc_description_abstract'])
    expect(result.reasonGroups).toEqual([
      {
        serviceKey: 'readiness',
        reasons: ['Missing required metadata: dc_description_abstract.'],
      },
    ])
  })

  it('treats failed validation and missing access as unmet', () => {
    const result = evaluateCandidateReadiness({
      metadata: projectCandidateMetadata({
        metadata: completeMetadata(),
        validatedFields: { dc_subject_unesco: true },
      }),
      validatedFields: { dc_title: false, dc_subject_unesco: true },
      accessLevels: [],
    })

    expect(result.unmetRequirements).toEqual(['dc_title', 'access_level'])
    expect(result.reasonGroups[0]?.reasons).toEqual([
      'Required metadata failed validation: dc_title.',
      'At least one access level is required.',
    ])
  })

  it('does not satisfy dc_subject without a UNESCO subject', () => {
    const metadata = completeMetadata()
    delete metadata.dc_subject_unesco

    const result = evaluateCandidateReadiness({
      metadata: projectCandidateMetadata({ metadata, validatedFields: {} }),
      validatedFields: {},
      accessLevels: ['public'],
    })

    expect(result.unmetRequirements).toEqual(['dc_subject'])
  })

  it('projects the UNESCO subject idempotently without removing the source field', () => {
    const metadata = projectCandidateMetadata({
      metadata: { ...completeMetadata(), dc_subject: 'Existing subject' },
      validatedFields: { dc_subject_unesco: true },
    })

    expect(projectCandidateMetadata({ metadata, validatedFields: { dc_subject_unesco: true } })).toEqual(
      metadata,
    )
    expect(metadata).toMatchObject({
      dc_subject_unesco: 'Indigenous peoples',
      dc_subject: 'Indigenous peoples',
    })
  })
})
