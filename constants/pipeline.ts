// Pipeline configuration types and constants
// Extensible step definitions for the document processing pipeline

export type StepId =
  | 'ingester'
  | 'normalize-pass-1'
  | 'normalize-pass-2'
  | 'ocr-processor'
  | 'content-dedup'
  | 'metadata-extraction'
  | 'metadata-validation'
  | 'rights-determinator'
  | 'fedora-ingester'

export type ServiceId =
  | 'ingester'
  | 'document-splitter'
  | 'page-rotator'
  | 'ocr-processor'
  | 'content-dedup'
  | 'metadata-extraction'
  | 'metadata-validation'
  | 'rights-determinator'
  | 'fedora-ingester'

export const DOCUMENT_SPLITTER_STAGE = 'document-splitter' as const
export const PAGE_ROTATOR_STAGE = 'page-rotator' as const
export const OCR_PROCESSOR_STAGE = 'ocr-processor' as const
export const CONTENT_DEDUP_STAGE = 'content-dedup' as const
export const METADATA_EXTRACTOR_STAGE = 'metadata-extraction' as const
export const METADATA_VALIDATOR_STAGE = 'metadata-validation' as const
export const RIGHTS_DETERMINATOR_STAGE = 'rights-determinator' as const
export const FEDORA_INGESTER_STAGE = 'fedora-ingester' as const

export const SUPPORTED_DOWNSTREAM_STAGES = [
  DOCUMENT_SPLITTER_STAGE,
  PAGE_ROTATOR_STAGE,
  OCR_PROCESSOR_STAGE,
  CONTENT_DEDUP_STAGE,
  METADATA_EXTRACTOR_STAGE,
  METADATA_VALIDATOR_STAGE,
  RIGHTS_DETERMINATOR_STAGE,
] as const

export interface StepDefinition {
  id: StepId
  label: string
  description: string
  service: ServiceId
  order: number
  hasAdvancedOptions?: boolean
  advancedLabel?: string
  dependsOn?: StepId[]
}

export interface NormalizePassSubOption {
  id: 'split' | 'rotate'
  label: string
  description: string
}

// Normalize Pass 1 sub-options (Split and Rotate)
export const NORMALIZE_PASS_1_SUB_OPTIONS: NormalizePassSubOption[] = [
  {
    id: 'split',
    label: 'Split Pass 1',
    description: 'Split original documents into child documents',
  },
  {
    id: 'rotate',
    label: 'Rotate Pass 1',
    description: 'Rotate pages of split documents',
  },
]

// Normalize Pass 2 sub-options (Split and Rotate)
export const NORMALIZE_PASS_2_SUB_OPTIONS: NormalizePassSubOption[] = [
  {
    id: 'split',
    label: 'Split Pass 2',
    description: 'Split rotated documents from Pass 1',
  },
  {
    id: 'rotate',
    label: 'Rotate Pass 2',
    description: 'Rotate pages from Split Pass 2',
  },
]

// All pipeline steps in execution order
export const PIPELINE_STEPS: StepDefinition[] = [
  {
    id: 'ingester',
    label: 'Ingest',
    description: 'Ingest documents from Google Drive source folders',
    service: 'ingester',
    order: 0,
  },
  {
    id: 'normalize-pass-1',
    label: 'Normalize Pass 1',
    description: 'First pass: split and rotate original documents',
    service: 'document-splitter',
    order: 1,
    hasAdvancedOptions: true,
    advancedLabel: 'Advanced',
    dependsOn: ['ingester'],
  },
  {
    id: 'normalize-pass-2',
    label: 'Normalize Pass 2',
    description: 'Second pass: split and rotate artifacts from Pass 1',
    service: 'document-splitter',
    order: 2,
    hasAdvancedOptions: true,
    advancedLabel: 'Advanced',
    dependsOn: ['normalize-pass-1'],
  },
  {
    id: 'ocr-processor',
    label: 'OCR Processor',
    description: 'Run OCR on normalized documents',
    service: 'ocr-processor',
    order: 3,
    dependsOn: ['ingester', 'normalize-pass-1', 'normalize-pass-2'],
  },
  {
    id: 'content-dedup',
    label: 'Content Dedup',
    description: 'Detect and handle duplicate content',
    service: 'content-dedup',
    order: 4,
    dependsOn: ['ocr-processor'],
  },
  {
    id: 'metadata-extraction',
    label: 'Metadata Extraction',
    description: 'Extract metadata from documents (future)',
    service: 'metadata-extraction',
    order: 5,
    dependsOn: ['content-dedup'],
  },
  {
    id: 'metadata-validation',
    label: 'Metadata Validation',
    description: 'Validate extracted metadata (future)',
    service: 'metadata-validation',
    order: 6,
    dependsOn: ['metadata-extraction'],
  },
  {
    id: 'rights-determinator',
    label: 'Rights Determinator',
    description: 'Determine rights and permissions (future)',
    service: 'rights-determinator',
    order: 7,
    dependsOn: ['metadata-validation'],
  },
]

// Lookup helpers
export function getStepDefinition(id: StepId): StepDefinition | undefined {
  return PIPELINE_STEPS.find((step) => step.id === id)
}

export function getStepsUpTo(untilId: StepId): StepDefinition[] {
  const untilIndex = PIPELINE_STEPS.findIndex((s) => s.id === untilId)
  if (untilIndex === -1) return []
  return PIPELINE_STEPS.slice(0, untilIndex + 1)
}

// Preset profile definitions
export type ProfileId =
  | 'custom'
  | 'ingest-only'
  | 'ingest-normalize'
  | 'ingest-normalize-ocr'
  | 'ingest-normalize-ocr-dedup'

export interface ProfileDefinition {
  id: ProfileId
  label: string
  description: string
  steps: Partial<Record<StepId, boolean>>
}

export const PIPELINE_PROFILES: ProfileDefinition[] = [
  {
    id: 'custom',
    label: 'Custom',
    description: 'Build your own pipeline step by step',
    steps: {
      ingester: true,
      'normalize-pass-1': false,
      'normalize-pass-2': false,
      'ocr-processor': false,
      'content-dedup': false,
    },
  },
  {
    id: 'ingest-only',
    label: 'Ingest Only',
    description: 'Ingest documents without normalization or downstream processing',
    steps: {
      ingester: true,
      'normalize-pass-1': false,
      'normalize-pass-2': false,
      'ocr-processor': false,
      'content-dedup': false,
    },
  },
  {
    id: 'ingest-normalize',
    label: 'Ingest + Normalize',
    description: 'Ingest and normalize documents through two passes',
    steps: {
      ingester: true,
      'normalize-pass-1': true,
      'normalize-pass-2': true,
      'ocr-processor': false,
      'content-dedup': false,
    },
  },
  {
    id: 'ingest-normalize-ocr',
    label: 'Ingest + Normalize + OCR',
    description: 'Full normalization pipeline with OCR',
    steps: {
      ingester: true,
      'normalize-pass-1': true,
      'normalize-pass-2': true,
      'ocr-processor': true,
      'content-dedup': false,
    },
  },
  {
    id: 'ingest-normalize-ocr-dedup',
    label: 'Ingest + Normalize + OCR + Dedup',
    description: 'Complete pipeline from ingest through deduplication',
    steps: {
      ingester: true,
      'normalize-pass-1': true,
      'normalize-pass-2': true,
      'ocr-processor': true,
      'content-dedup': true,
    },
  },
]

export function getProfileDefinition(id: ProfileId): ProfileDefinition | undefined {
  return PIPELINE_PROFILES.find((p) => p.id === id)
}
