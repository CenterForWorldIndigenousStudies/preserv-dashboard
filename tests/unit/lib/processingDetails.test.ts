import { describe, expect, it } from 'vitest'

import { getProcessingDetailsPropertyDefinition } from '@lib/processingDetails'

describe('processingDetails', () => {
  it('returns the contract label and description for a batch property', () => {
    expect(getProcessingDetailsPropertyDefinition('legacyImport')).toEqual({
      label: 'Legacy Import',
      description: 'Historical data-combiner processing and registry metrics.',
      valueType: 'object',
    })
  })

  it('returns a shared stage definition for nested properties', () => {
    expect(getProcessingDetailsPropertyDefinition('startedAt')).toEqual({
      label: 'Started At',
      description: 'Unix timestamp in seconds when this stage began processing.',
      valueType: 'unixTimestamp',
    })
  })

  it('gets stage-entry labels from the pipeline-services contract', () => {
    expect(getProcessingDetailsPropertyDefinition('documentSplitterPass1')).toEqual({
      label: 'Document Splitter Pass 1',
      description: 'Status and metrics recorded for one pipeline service stage.',
      valueType: 'object',
    })
  })

  it('returns explicit definitions for legacy notebooks and detail fields', () => {
    const expectedDefinitions = {
      notebook1Registry: {
        label: 'Notebook 1: Master Registry',
        description:
          'Historical notebook that registered the batch and established its source-file inventory.',
        valueType: 'object',
      },
      notebook2Binary: {
        label: 'Notebook 2: Binary Processing',
        description: 'Historical notebook that processed binary files and resolved binary duplicates.',
        valueType: 'object',
      },
      notebook3Ocr: {
        label: 'Notebook 3: OCR Processing',
        description:
          'Historical notebook that performed OCR processing and recorded OCR quality statistics.',
        valueType: 'object',
      },
      notebook4Content: {
        label: 'Notebook 4: Content Processing',
        description: 'Historical notebook that performed content analysis and content deduplication.',
        valueType: 'object',
      },
      notebook5Structural: {
        label: 'Notebook 5: Structural Processing',
        description: 'Historical notebook that performed structural analysis and similarity resolution.',
        valueType: 'object',
      },
      notebook6Metadata: {
        label: 'Notebook 6: Metadata Processing',
        description: 'Historical notebook that extracted and persisted document metadata.',
        valueType: 'object',
      },
      notebook7Semantic: {
        label: 'Notebook 7: Semantic Processing',
        description: 'Historical notebook that performed semantic analysis and rights determination.',
        valueType: 'object',
      },
      notebook8Collections: {
        label: 'Notebook 8: Collection Processing',
        description:
          'Historical notebook that assigned collections and completed historical metadata validation.',
        valueType: 'object',
      },
      discrepancySummary: {
        label: 'Discrepancy Summary',
        description: 'Summary recorded for the historical discrepancy log.',
        valueType: 'string',
      },
      discrepancyCorrectionTimestamp: {
        label: 'Discrepancy Correction At',
        description: 'Unix timestamp in seconds when the historical discrepancy was corrected.',
        valueType: 'unixTimestamp',
      },
      discrepancyExplanation: {
        label: 'Discrepancy Explanation',
        description: 'Explanation recorded for the historical discrepancy.',
        valueType: 'string',
      },
      discrepancyMissingUniqueEntries: {
        label: 'Missing Unique Entries',
        description: 'Number of unique entries missing from the historical discrepancy.',
        valueType: 'integer',
      },
      discrepancySource: {
        label: 'Discrepancy Source',
        description: 'Source recorded for the historical discrepancy.',
        valueType: 'string',
      },
      discrepancyStatus: {
        label: 'Discrepancy Status',
        description: 'Status recorded for the historical discrepancy.',
        valueType: 'string',
      },
      discrepancyTotalBinaryRegistered: {
        label: 'Total Binary Registered',
        description: 'Total number of binary files recorded in the historical discrepancy.',
        valueType: 'integer',
      },
      discrepancyTotalContentHashes: {
        label: 'Total Content Hashes',
        description: 'Total number of content hashes recorded in the historical discrepancy.',
        valueType: 'integer',
      },
      fileAnalysisQualityAssessmentNote: {
        label: 'File Analysis Quality Note',
        description: 'Note recorded for the historical file-quality assessment.',
        valueType: 'string',
      },
      fileAnalysisQualityAssessmentSource: {
        label: 'File Analysis Quality Source',
        description: 'Source recorded for the historical file-quality assessment.',
        valueType: 'string',
      },
      fileAnalysisQualityAssessmentRecommendation: {
        label: 'File Analysis Quality Recommendation',
        description: 'Recommendation recorded for the historical file-quality assessment.',
        valueType: 'string',
      },
      fileAnalysisQualityAssessmentDistributionHigh: {
        label: 'High-Quality File Distribution',
        description: 'Number of historical files in the high-quality distribution.',
        valueType: 'integer',
      },
      fileAnalysisQualityAssessmentDistributionMedium: {
        label: 'Medium-Quality File Distribution',
        description: 'Number of historical files in the medium-quality distribution.',
        valueType: 'integer',
      },
      fileAnalysisQualityAssessmentDistributionLow: {
        label: 'Low-Quality File Distribution',
        description: 'Number of historical files in the low-quality distribution.',
        valueType: 'integer',
      },
      fileAnalysisDuplicateIdentificationMethod: {
        label: 'Duplicate Identification Method',
        description: 'Method recorded for historical duplicate identification.',
        valueType: 'string',
      },
      fileAnalysisDuplicateIdentificationExactDuplicatesFound: {
        label: 'Exact Duplicates Found',
        description: 'Number of exact duplicates found by historical file analysis.',
        valueType: 'integer',
      },
    } as const

    for (const [key, definition] of Object.entries(expectedDefinitions)) {
      expect(getProcessingDetailsPropertyDefinition(key)).toEqual(definition)
    }
  })

  it('does not use a generic legacy detail pattern for unknown keys', () => {
    expect(getProcessingDetailsPropertyDefinition('notebook9Future')).toBeNull()
    expect(getProcessingDetailsPropertyDefinition('discrepancyFuture')).toBeNull()
    expect(getProcessingDetailsPropertyDefinition('fileAnalysisFuture')).toBeNull()
  })

  it('returns null for an unregistered property', () => {
    expect(getProcessingDetailsPropertyDefinition('unknown_property')).toBeNull()
  })
})
