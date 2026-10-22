import { describe, expect, it } from 'vitest'

import { calculateBatchProcessingCost, calculateTotalProcessingCost } from '@lib/processingCost'

describe('processing cost accounting', () => {
  it('retains captured rollback costs after document links are purged', () => {
    expect(
      calculateBatchProcessingCost(
        {
          documentSplitterPass1: { aiCostUsd: 0.01 },
          rollback: { documentCostTotal: 0.03, documentCostIncomplete: true },
        },
        [],
      ),
    ).toBe('$0.03 (incomplete)')
  })
  it('adds document metadata and verifier charges to batch splitter costs once', () => {
    const details = { documentSplitterPass1: { aiCostUsd: 0.01 } }
    const links = [
      {
        cost: 0.02,
        processing_details: JSON.stringify({
          documentSplitterPass1: { aiCostUsd: 0.01 },
          metadataExtractor: { aiUsage: { estimatedCostUsd: 0.02 } },
          metadataVerifier: { aiUsage: { estimatedCostUsd: 0.000042 } },
        }),
      },
    ]
    expect(calculateBatchProcessingCost(details, links)).toBe('$0.030042')
  })

  it('does not let a zero-cost batch stage hide charged document stages', () => {
    expect(
      calculateBatchProcessingCost({ documentSplitterPass1: { aiCostUsd: 0 } }, [
        { cost: 0.02, processing_details: { metadataExtractor: { aiUsage: { estimatedCostUsd: 0.02 } } } },
      ]),
    ).toBe('$0.02')
  })

  it('uses cumulative accounting once and marks unknown charges incomplete', () => {
    expect(
      calculateTotalProcessingCost(
        {
          metadataExtractor: {
            aiUsage: { estimatedCostUsd: 0.01 },
            costAccounting: { estimatedCostUsd: 0.03, missingUsageCalls: 1 },
          },
        },
        [],
      ),
    ).toBe('$0.03 (incomplete)')
  })
})
