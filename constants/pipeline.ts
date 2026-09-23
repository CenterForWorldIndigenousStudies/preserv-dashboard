// Pipeline configuration types and constants
// Extensible step definitions for the document processing pipeline

import {
  GENERATED_PIPELINE_SERVICE_KEYS,
  type GeneratedPipelineServiceKey,
  GENERATED_PIPELINE_SERVICES,
} from '@constants/generated/pipelineServices'

export type ServiceId = GeneratedPipelineServiceKey

export const DATA_INGESTER_SERVICE = GENERATED_PIPELINE_SERVICE_KEYS.DATA_INGESTER
export const DATA_COMBINER_SERVICE = GENERATED_PIPELINE_SERVICE_KEYS.DATA_COMBINER
export const DOCUMENT_SPLITTER_SERVICE = GENERATED_PIPELINE_SERVICE_KEYS.DOCUMENT_SPLITTER
export const PAGE_ROTATOR_SERVICE = GENERATED_PIPELINE_SERVICE_KEYS.PAGE_ROTATOR
export const OCR_PROCESSOR_SERVICE = GENERATED_PIPELINE_SERVICE_KEYS.OCR_PROCESSOR
export const CONTENT_DEDUP_SERVICE = GENERATED_PIPELINE_SERVICE_KEYS.CONTENT_DEDUP
export const METADATA_EXTRACTOR_SERVICE = GENERATED_PIPELINE_SERVICE_KEYS.METADATA_EXTRACTOR
export const FEDORA_INGESTER_SERVICE = GENERATED_PIPELINE_SERVICE_KEYS.FEDORA_INGESTER

export const NORMALIZE_PASS_1_KEY = 'normalize-pass-1' as const
export const NORMALIZE_PASS_2_KEY = 'normalize-pass-2' as const

export const CUSTOM_PIPELINE_PROFILE_ID = 'custom' as const

export const PIPELINE_CONFIG_MODES = {
  PRESET: 'preset',
  CUSTOM: 'custom',
} as const

export const METADATA_EXTRACTION_MODES = {
  DIRECT: 'direct',
  OPENAI_BATCH: 'openai_batch',
} as const

export const SUPPORTED_DOWNSTREAM_SERVICES = [
  DOCUMENT_SPLITTER_SERVICE,
  PAGE_ROTATOR_SERVICE,
  OCR_PROCESSOR_SERVICE,
  CONTENT_DEDUP_SERVICE,
  METADATA_EXTRACTOR_SERVICE,
] as const

export function getServiceIdForCallbackStage(stage: string): ServiceId | null {
  return stage in GENERATED_PIPELINE_SERVICES ? (stage as ServiceId) : null
}

export function getCallbackStageForService(service: ServiceId): string {
  return service
}

export interface PipelineServiceDefinition {
  id: ServiceId
  label: string
  description: string
  order: number
}

export interface NormalizePassSubOption {
  id: 'split' | 'rotate'
  service: ServiceId
}

// Normalize Pass 1 sub-options (Split and Rotate)
export const NORMALIZE_PASS_1_SUB_OPTIONS: NormalizePassSubOption[] = [
  {
    id: 'split',
    service: DOCUMENT_SPLITTER_SERVICE,
  },
  {
    id: 'rotate',
    service: PAGE_ROTATOR_SERVICE,
  },
]

// Normalize Pass 2 sub-options (Split and Rotate)
export const NORMALIZE_PASS_2_SUB_OPTIONS: NormalizePassSubOption[] = [
  {
    id: 'split',
    service: DOCUMENT_SPLITTER_SERVICE,
  },
  {
    id: 'rotate',
    service: PAGE_ROTATOR_SERVICE,
  },
]

// All pipeline steps in execution order
const PIPELINE_SERVICE_ORDER = [
  DATA_INGESTER_SERVICE,
  DOCUMENT_SPLITTER_SERVICE,
  PAGE_ROTATOR_SERVICE,
  OCR_PROCESSOR_SERVICE,
  CONTENT_DEDUP_SERVICE,
  METADATA_EXTRACTOR_SERVICE,
  FEDORA_INGESTER_SERVICE,
] as const

export const PIPELINE_SERVICE_DEFINITIONS: PipelineServiceDefinition[] = PIPELINE_SERVICE_ORDER.map(
  (service, order) => ({
    id: service,
    label: GENERATED_PIPELINE_SERVICES[service].display_name,
    description: GENERATED_PIPELINE_SERVICES[service].description,
    order,
  }),
)

// Lookup helpers
export function getPipelineServiceDefinition(service: ServiceId): PipelineServiceDefinition {
  const definition = PIPELINE_SERVICE_DEFINITIONS.find((item) => item.id === service)
  if (!definition) {
    throw new Error(`No pipeline service definition exists for ${service}`)
  }
  return definition
}

export function getPipelineServicesUpTo(service: ServiceId): PipelineServiceDefinition[] {
  const untilIndex = PIPELINE_SERVICE_DEFINITIONS.findIndex((item) => item.id === service)
  if (untilIndex === -1) return []
  return PIPELINE_SERVICE_DEFINITIONS.slice(0, untilIndex + 1)
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
  steps: Partial<Record<ProfileSelectionKey, boolean>>
}

type ProfileSelectionKey =
  | typeof DATA_INGESTER_SERVICE
  | typeof NORMALIZE_PASS_1_KEY
  | typeof NORMALIZE_PASS_2_KEY
  | typeof OCR_PROCESSOR_SERVICE
  | typeof CONTENT_DEDUP_SERVICE

export const PIPELINE_PROFILES: ProfileDefinition[] = [
  {
    id: 'custom',
    label: 'Custom',
    description: 'Build your own pipeline step by step',
    steps: {
      [DATA_INGESTER_SERVICE]: true,
      [NORMALIZE_PASS_1_KEY]: false,
      [NORMALIZE_PASS_2_KEY]: false,
      [OCR_PROCESSOR_SERVICE]: false,
      [CONTENT_DEDUP_SERVICE]: false,
    },
  },
  {
    id: 'ingest-only',
    label: 'Ingest Only',
    description: 'Ingest documents without normalization or downstream processing',
    steps: {
      [DATA_INGESTER_SERVICE]: true,
      [NORMALIZE_PASS_1_KEY]: false,
      [NORMALIZE_PASS_2_KEY]: false,
      [OCR_PROCESSOR_SERVICE]: false,
      [CONTENT_DEDUP_SERVICE]: false,
    },
  },
  {
    id: 'ingest-normalize',
    label: 'Ingest + Normalize',
    description: 'Ingest and normalize documents through two passes',
    steps: {
      [DATA_INGESTER_SERVICE]: true,
      [NORMALIZE_PASS_1_KEY]: true,
      [NORMALIZE_PASS_2_KEY]: true,
      [OCR_PROCESSOR_SERVICE]: false,
      [CONTENT_DEDUP_SERVICE]: false,
    },
  },
  {
    id: 'ingest-normalize-ocr',
    label: 'Ingest + Normalize + OCR',
    description: 'Full normalization pipeline with OCR',
    steps: {
      [DATA_INGESTER_SERVICE]: true,
      [NORMALIZE_PASS_1_KEY]: true,
      [NORMALIZE_PASS_2_KEY]: true,
      [OCR_PROCESSOR_SERVICE]: true,
      [CONTENT_DEDUP_SERVICE]: false,
    },
  },
  {
    id: 'ingest-normalize-ocr-dedup',
    label: 'Ingest + Normalize + OCR + Dedup',
    description: 'Complete pipeline from ingest through deduplication',
    steps: {
      [DATA_INGESTER_SERVICE]: true,
      [NORMALIZE_PASS_1_KEY]: true,
      [NORMALIZE_PASS_2_KEY]: true,
      [OCR_PROCESSOR_SERVICE]: true,
      [CONTENT_DEDUP_SERVICE]: true,
    },
  },
]

export function getProfileDefinition(id: ProfileId): ProfileDefinition | undefined {
  return PIPELINE_PROFILES.find((p) => p.id === id)
}
