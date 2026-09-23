import {
  CONTENT_DEDUP_SERVICE,
  DATA_INGESTER_SERVICE,
  DOCUMENT_SPLITTER_SERVICE,
  METADATA_EXTRACTOR_SERVICE,
  NORMALIZE_PASS_1_KEY,
  NORMALIZE_PASS_2_KEY,
  OCR_PROCESSOR_SERVICE,
  PAGE_ROTATOR_SERVICE,
  PIPELINE_PROFILES,
  SUPPORTED_DOWNSTREAM_SERVICES,
  type ProfileId,
  type ServiceId,
} from '@constants/pipeline'
import { GENERATED_PIPELINE_SERVICES } from '@constants/generated/pipelineServices'

function getServiceLabel(service: ServiceId, pass?: 1 | 2): string {
  const label = GENERATED_PIPELINE_SERVICES[service].display_name
  return pass === undefined ? label : `${label} Pass ${pass}`
}

export interface NormalizePassSubSelection {
  split: boolean
  rotate: boolean
}

export interface NormalizePassState {
  enabled: boolean
  advancedOpen: boolean
  subSelection: NormalizePassSubSelection
}

export interface MetadataExtractionConfig {
  mode: 'direct' | 'openai_batch'
}

export interface PipelineSelectionDraft {
  profileId: ProfileId
  mode: 'preset' | 'custom'
  sourceFolderIds?: string[]
  sourceDocumentIds?: string[]
  metadataExtraction: MetadataExtractionConfig
  steps: {
    ingester: true
    normalizePass1: NormalizePassState
    normalizePass2: NormalizePassState
    ocrProcessor: boolean
    contentDedup: boolean
    metadataExtraction: boolean
  }
}

export type PipelineServiceId = ServiceId

export interface PipelineExecutionStep {
  id: string
  stepId: ServiceId
  service: PipelineServiceId
  label: string
  order: number
  enabled: boolean
  pass?: 1 | 2
  subSelection?: NormalizePassSubSelection
  dependsOn?: string[]
}

export interface PipelineConfig {
  profileId: ProfileId
  mode: 'preset' | 'custom'
  sourceFolderIds?: string[]
  sourceDocumentIds?: string[]
  metadataExtraction: MetadataExtractionConfig
  executionPlan: PipelineExecutionStep[]
}

function isServiceId(value: unknown): value is ServiceId {
  return typeof value === 'string' && value in GENERATED_PIPELINE_SERVICES
}

function parseDependsOn(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined
  }

  const dependsOn = value.map((item) => (typeof item === 'string' ? item.trim() : '')).filter((item) => item.length > 0)

  return dependsOn.length > 0 ? dependsOn : undefined
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return Array.from(
    new Set(
      value
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  )
}

function parseNormalizePassSubSelection(value: unknown): NormalizePassSubSelection | undefined {
  if (typeof value !== 'object' || value === null) {
    return undefined
  }

  const record = value as Record<string, unknown>
  return {
    split: record.split === true,
    rotate: record.rotate === true,
  }
}

function parseExecutionPlan(value: unknown): PipelineExecutionStep[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.flatMap((item, index) => {
    if (typeof item !== 'object' || item === null) {
      return []
    }

    const record = item as Record<string, unknown>
    if (
      typeof record.id !== 'string' ||
      !isServiceId(record.stepId) ||
      !isServiceId(record.service) ||
      record.stepId !== record.service ||
      typeof record.label !== 'string' ||
      typeof record.order !== 'number' ||
      !Number.isFinite(record.order)
    ) {
      return []
    }

    const pass = record.pass === 1 || record.pass === 2 ? record.pass : undefined
    const dependsOn = parseDependsOn(record.dependsOn)
    const subSelection = parseNormalizePassSubSelection(record.subSelection)

    return [
      {
        id: record.id.trim() || `execution-step-${index}`,
        stepId: record.stepId,
        service: record.service,
        label: record.label.trim() || record.id.trim() || `Step ${index + 1}`,
        order: record.order,
        enabled: record.enabled !== false,
        ...(pass === undefined ? {} : { pass }),
        ...(subSelection === undefined ? {} : { subSelection }),
        ...(dependsOn === undefined ? {} : { dependsOn }),
      },
    ]
  })
}

function parseMetadataExtractionConfig(value: unknown): MetadataExtractionConfig {
  if (typeof value !== 'object' || value === null) {
    return { mode: 'direct' }
  }

  const record = value as Record<string, unknown>
  return {
    mode: record.mode === 'openai_batch' ? 'openai_batch' : 'direct',
  }
}

export function parsePipelineConfig(value: unknown): PipelineConfig | null {
  if (typeof value !== 'object' || value === null) {
    return null
  }

  const record = value as Record<string, unknown>
  if (typeof record.profileId !== 'string') {
    return null
  }

  const executionPlan = parseExecutionPlan(record.executionPlan)
  if (executionPlan.length === 0) {
    return null
  }

  return {
    profileId: record.profileId as ProfileId,
    mode: record.mode === 'custom' ? 'custom' : 'preset',
    sourceFolderIds: normalizeStringArray(record.sourceFolderIds),
    sourceDocumentIds: normalizeStringArray(record.sourceDocumentIds),
    metadataExtraction: parseMetadataExtractionConfig(record.metadataExtraction),
    executionPlan: executionPlan.sort((left, right) => left.order - right.order),
  }
}

export function applyDependencyRule(draft: PipelineSelectionDraft): PipelineSelectionDraft {
  const p1 = draft.steps.normalizePass1
  const p2 = draft.steps.normalizePass2

  if (p2.enabled || p2.subSelection.split || p2.subSelection.rotate) {
    return {
      ...draft,
      steps: {
        ...draft.steps,
        normalizePass1: {
          ...p1,
          enabled: true,
        },
      },
    }
  }

  return draft
}

export function getPass1HelperText(draft: PipelineSelectionDraft): string | null {
  const p2 = draft.steps.normalizePass2
  if (!p2.enabled && !p2.subSelection.split && !p2.subSelection.rotate) {
    return null
  }

  return 'Required by Normalize Pass 2'
}

export function expandPresetToDraft(profileId: ProfileId): PipelineSelectionDraft {
  const profile = PIPELINE_PROFILES.find((item) => item.id === profileId)
  if (!profile) {
    return createDefaultDraft()
  }

  const pass1Enabled = profile.steps[NORMALIZE_PASS_1_KEY] ?? false
  const pass2Enabled = profile.steps[NORMALIZE_PASS_2_KEY] ?? false

  return {
    profileId,
    mode: profileId === 'custom' ? 'custom' : 'preset',
    sourceFolderIds: [],
    sourceDocumentIds: [],
    metadataExtraction: {
      mode: 'direct',
    },
    steps: {
      ingester: true,
      normalizePass1: {
        enabled: pass1Enabled,
        advancedOpen: false,
        subSelection: {
          split: pass1Enabled,
          rotate: pass1Enabled,
        },
      },
      normalizePass2: {
        enabled: pass2Enabled,
        advancedOpen: false,
        subSelection: {
          split: pass2Enabled,
          rotate: pass2Enabled,
        },
      },
      ocrProcessor: profile.steps[OCR_PROCESSOR_SERVICE] ?? false,
      contentDedup: profile.steps[CONTENT_DEDUP_SERVICE] ?? false,
      metadataExtraction: false,
    },
  }
}

function getNormalizationUpstreamDependencyId(draft: PipelineSelectionDraft): string[] {
  if (draft.steps.normalizePass2.enabled) {
    return ['step-normalize-pass-2-rotate']
  }

  if (draft.steps.normalizePass1.enabled) {
    return ['step-normalize-pass-1-rotate']
  }

  return ['step-ingester']
}

function getDownstreamDependencyId(draft: PipelineSelectionDraft): string[] {
  if (draft.steps.contentDedup) {
    return ['step-content-dedup']
  }

  if (draft.steps.ocrProcessor) {
    return ['step-ocr-processor']
  }

  return getNormalizationUpstreamDependencyId(draft)
}

function pushNormalizePassSteps(plan: PipelineExecutionStep[], draft: PipelineSelectionDraft): void {
  if (draft.steps.normalizePass1.enabled) {
    const sub = draft.steps.normalizePass1.subSelection
    plan.push({
      id: 'step-normalize-pass-1-split',
      stepId: DOCUMENT_SPLITTER_SERVICE,
      service: DOCUMENT_SPLITTER_SERVICE,
      label: getServiceLabel(DOCUMENT_SPLITTER_SERVICE, 1),
      order: 1,
      enabled: sub.split,
      pass: 1,
      dependsOn: ['step-ingester'],
    })
    plan.push({
      id: 'step-normalize-pass-1-rotate',
      stepId: PAGE_ROTATOR_SERVICE,
      service: PAGE_ROTATOR_SERVICE,
      label: getServiceLabel(PAGE_ROTATOR_SERVICE, 1),
      order: 2,
      enabled: sub.rotate,
      pass: 1,
      dependsOn: sub.split ? ['step-normalize-pass-1-split'] : ['step-ingester'],
    })
  }

  if (draft.steps.normalizePass2.enabled) {
    const sub = draft.steps.normalizePass2.subSelection
    plan.push({
      id: 'step-normalize-pass-2-split',
      stepId: DOCUMENT_SPLITTER_SERVICE,
      service: DOCUMENT_SPLITTER_SERVICE,
      label: getServiceLabel(DOCUMENT_SPLITTER_SERVICE, 2),
      order: 3,
      enabled: sub.split,
      pass: 2,
      dependsOn: ['step-normalize-pass-1-rotate'],
    })
    plan.push({
      id: 'step-normalize-pass-2-rotate',
      stepId: PAGE_ROTATOR_SERVICE,
      service: PAGE_ROTATOR_SERVICE,
      label: getServiceLabel(PAGE_ROTATOR_SERVICE, 2),
      order: 4,
      enabled: sub.rotate,
      pass: 2,
      dependsOn: sub.split ? ['step-normalize-pass-2-split'] : ['step-normalize-pass-1-rotate'],
    })
  }
}

export function draftToPipelineConfig(draft: PipelineSelectionDraft): PipelineConfig {
  const plan: PipelineExecutionStep[] = [
    {
      id: 'step-ingester',
      stepId: DATA_INGESTER_SERVICE,
      service: DATA_INGESTER_SERVICE,
      label: GENERATED_PIPELINE_SERVICES[DATA_INGESTER_SERVICE].display_name,
      order: 0,
      enabled: true,
    },
  ]

  pushNormalizePassSteps(plan, draft)

  if (draft.steps.ocrProcessor) {
    plan.push({
      id: 'step-ocr-processor',
      stepId: OCR_PROCESSOR_SERVICE,
      service: OCR_PROCESSOR_SERVICE,
      label: GENERATED_PIPELINE_SERVICES[OCR_PROCESSOR_SERVICE].display_name,
      order: 5,
      enabled: true,
      dependsOn: getNormalizationUpstreamDependencyId(draft),
    })
  }

  if (draft.steps.contentDedup) {
    plan.push({
      id: 'step-content-dedup',
      stepId: CONTENT_DEDUP_SERVICE,
      service: CONTENT_DEDUP_SERVICE,
      label: GENERATED_PIPELINE_SERVICES[CONTENT_DEDUP_SERVICE].display_name,
      order: 6,
      enabled: true,
      dependsOn: draft.steps.ocrProcessor ? ['step-ocr-processor'] : undefined,
    })
  }

  if (draft.steps.metadataExtraction) {
    plan.push({
      id: 'step-metadata-extraction',
      stepId: METADATA_EXTRACTOR_SERVICE,
      service: METADATA_EXTRACTOR_SERVICE,
      label: GENERATED_PIPELINE_SERVICES[METADATA_EXTRACTOR_SERVICE].display_name,
      order: 7,
      enabled: true,
      dependsOn: getDownstreamDependencyId(draft),
    })
  }

  return {
    profileId: draft.profileId,
    mode: draft.mode,
    sourceFolderIds: normalizeStringArray(draft.sourceFolderIds),
    sourceDocumentIds: normalizeStringArray(draft.sourceDocumentIds),
    metadataExtraction: {
      mode: draft.metadataExtraction.mode,
    },
    executionPlan: plan,
  }
}

export function pipelineConfigToDraft(config: PipelineConfig): PipelineSelectionDraft {
  const passOneSteps = config.executionPlan.filter((step) => step.pass === 1 && step.enabled)
  const passTwoSteps = config.executionPlan.filter((step) => step.pass === 2 && step.enabled)
  const hasService = (service: PipelineServiceId): boolean =>
    config.executionPlan.some((step) => step.service === service && step.enabled)
  const profileId = PIPELINE_PROFILES.some((profile) => profile.id === config.profileId) ? config.profileId : 'custom'

  return {
    profileId,
    mode: config.mode,
    sourceFolderIds: [...(config.sourceFolderIds ?? [])],
    sourceDocumentIds: [...(config.sourceDocumentIds ?? [])],
    metadataExtraction: { ...config.metadataExtraction },
    steps: {
      ingester: true,
      normalizePass1: {
        enabled: passOneSteps.length > 0,
        advancedOpen: false,
        subSelection: {
          split: passOneSteps.some((step) => step.service === DOCUMENT_SPLITTER_SERVICE),
          rotate: passOneSteps.some((step) => step.service === PAGE_ROTATOR_SERVICE),
        },
      },
      normalizePass2: {
        enabled: passTwoSteps.length > 0,
        advancedOpen: false,
        subSelection: {
          split: passTwoSteps.some((step) => step.service === DOCUMENT_SPLITTER_SERVICE),
          rotate: passTwoSteps.some((step) => step.service === PAGE_ROTATOR_SERVICE),
        },
      },
      ocrProcessor: hasService(OCR_PROCESSOR_SERVICE),
      contentDedup: hasService(CONTENT_DEDUP_SERVICE),
      metadataExtraction: hasService(METADATA_EXTRACTOR_SERVICE),
    },
  }
}

export function createDefaultDraft(): PipelineSelectionDraft {
  return expandPresetToDraft('custom')
}

export function pipelineConfigToRequestedStages(config: PipelineConfig): PipelineServiceId[] {
  const requestedStages = config.executionPlan
    .filter((step) => step.enabled && step.service !== DATA_INGESTER_SERVICE)
    .map((step) => step.service)
    .filter((service): service is (typeof SUPPORTED_DOWNSTREAM_SERVICES)[number] =>
      SUPPORTED_DOWNSTREAM_SERVICES.includes(service as (typeof SUPPORTED_DOWNSTREAM_SERVICES)[number]),
    )

  return Array.from(new Set(requestedStages))
}

export function getEnabledSteps(draft: PipelineSelectionDraft): string[] {
  const steps: string[] = ['Ingest']
  if (draft.steps.normalizePass1.enabled) {
    const sub = draft.steps.normalizePass1.subSelection
    if (sub.split) steps.push('Split Pass 1')
    if (sub.rotate) steps.push('Rotate Pass 1')
  }
  if (draft.steps.normalizePass2.enabled) {
    const sub = draft.steps.normalizePass2.subSelection
    if (sub.split) steps.push('Split Pass 2')
    if (sub.rotate) steps.push('Rotate Pass 2')
  }
  if (draft.steps.ocrProcessor) steps.push('OCR Processor')
  if (draft.steps.contentDedup) steps.push('Content Dedup')
  if (draft.steps.metadataExtraction) steps.push('Metadata Extraction')
  return steps
}
