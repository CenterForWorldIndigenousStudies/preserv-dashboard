import cases from '@contracts/collection-membership-cases.json'
import { describe, expect, it } from 'vitest'
import {
  resolveCollectionMemberships,
} from '@lib/collectionMembership'

describe('collection membership conformance cases', () => {
  it.each(cases.cases)('$name', (testCase) => {
    const memberships = resolveCollectionMemberships({
      documentTagIds: new Set(testCase.document.tagIds),
      metadata: testCase.document.metadata,
      collections: testCase.collections,
    })

    expect(memberships.map((membership) => membership.collectionId)).toEqual(testCase.expected.collectionIds)
    expect(memberships.map((membership) => membership.evidence[0]?.source)).toEqual(testCase.expected.sources)
  })
})
