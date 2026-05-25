import {
  CONTENT_DEDUP_STAGE,
  DOCUMENT_SPLITTER_STAGE,
  OCR_PROCESSOR_STAGE,
  PAGE_ROTATOR_STAGE,
  PIPELINE_PROFILES,
  SUPPORTED_DOWNSTREAM_STAGES,
  type ProfileId,
  type ServiceId,
  type StepId,
} from '@constants/pipeline'

export interface NormalizePassSubSelection {
  split: boolean
  rotate: boolean
}

export interface NormalizePassState {
  enabled: boolean
  advancedOpen: boolean
  subSelection: NormalizePassSubSelection
}

export interface PipelineSelectionDraft {
  profileId: ProfileId
  mode: 'preset' | 'custom'
  steps: {
    ingester: true
    normalizePass1: NormalizePassState
    normalizePass2: NormalizePassState
    ocrProcessor: boolean
    contentDedup: boolean
    metadataExtraction: boolean
    metadataValidation: boolean
    rightsDeterminator: boolean
    fedoraIngester: boolean
  }
}

export type PipelineServiceId = ServiceId

export interface PipelineExecutionStep {
  id: string
  stepId: StepId
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
  executionPlan: PipelineExecutionStep[]
}

function isServiceId(value: unknown): value is ServiceId {
  return (
    value === 'ingester' ||
    value === 'document-splitter' ||
    value === 'page-rotator' ||
    value === 'ocr-processor' ||
    value === 'content-dedup' ||
    value === 'metadata-extraction' ||
    value === 'metadata-validation' ||
    value === 'rights-determinator' ||
    value === 'fedora-ingester'
  )
}

function isStepId(value: unknown): value is StepId {
  return (
    value === 'ingester' ||
    value === 'normalize-pass-1' ||
    value === 'normalize-pass-2' ||
    value === 'ocr-processor' ||
    value === 'content-dedup' ||
    value === 'metadata-extraction' ||
    value === 'metadata-validation' ||
    value === 'rights-determinator' ||
    value === 'fedora-ingester'
  )
}

function parseDependsOn(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined
  }

  const dependsOn = value.map((item) => (typeof item === 'string' ? item.trim() : '')).filter((item) => item.length > 0)

  return dependsOn.length > 0 ? dependsOn : undefined
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
      !isStepId(record.stepId) ||
      !isServiceId(record.service) ||
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
        pass,
        subSelection,
        dependsOn,
      },
    ]
  })
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

  const pass1Enabled = profile.steps['normalize-pass-1'] ?? false
  const pass2Enabled = profile.steps['normalize-pass-2'] ?? false

  return {
    profileId,
    mode: profileId === 'custom' ? 'custom' : 'preset',
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
      ocrProcessor: profile.steps['ocr-processor'] ?? false,
      contentDedup: profile.steps['content-dedup'] ?? false,
      metadataExtraction: false,
      metadataValidation: false,
      rightsDeterminator: false,
      fedoraIngester: false,
    },
  }
}

export function draftToPipelineConfig(draft: PipelineSelectionDraft): PipelineConfig {
  const plan: PipelineExecutionStep[] = [
    {
      id: 'step-ingester',
      stepId: 'ingester',
      service: 'ingester',
      label: 'Ingest',
      order: 0,
      enabled: true,
    },
  ]

  if (draft.steps.normalizePass1.enabled) {
    const sub = draft.steps.normalizePass1.subSelection
    plan.push({
      id: 'step-normalize-pass-1-split',
      stepId: 'normalize-pass-1',
      service: DOCUMENT_SPLITTER_STAGE,
      label: 'Split Pass 1',
      order: 1,
      enabled: sub.split,
      pass: 1,
      dependsOn: ['step-ingester'],
    })
    plan.push({
      id: 'step-normalize-pass-1-rotate',
      stepId: 'normalize-pass-1',
      service: PAGE_ROTATOR_STAGE,
      label: 'Rotate Pass 1',
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
      stepId: 'normalize-pass-2',
      service: DOCUMENT_SPLITTER_STAGE,
      label: 'Split Pass 2',
      order: 3,
      enabled: sub.split,
      pass: 2,
      dependsOn: ['step-normalize-pass-1-rotate'],
    })
    plan.push({
      id: 'step-normalize-pass-2-rotate',
      stepId: 'normalize-pass-2',
      service: PAGE_ROTATOR_STAGE,
      label: 'Rotate Pass 2',
      order: 4,
      enabled: sub.rotate,
      pass: 2,
      dependsOn: sub.split ? ['step-normalize-pass-2-split'] : ['step-normalize-pass-1-rotate'],
    })
  }

  if (draft.steps.ocrProcessor) {
    plan.push({
      id: 'step-ocr-processor',
      stepId: 'ocr-processor',
      service: OCR_PROCESSOR_STAGE,
      label: 'OCR Processor',
      order: 5,
      enabled: true,
      dependsOn: draft.steps.normalizePass2.enabled
        ? ['step-normalize-pass-2-rotate']
        : draft.steps.normalizePass1.enabled
          ? ['step-normalize-pass-1-rotate']
          : ['step-ingester'],
    })
  }

  if (draft.steps.contentDedup) {
    plan.push({
      id: 'step-content-dedup',
      stepId: 'content-dedup',
      service: CONTENT_DEDUP_STAGE,
      label: 'Content Dedup',
      order: 6,
      enabled: true,
      dependsOn: draft.steps.ocrProcessor ? ['step-ocr-processor'] : undefined,
    })
  }

  if (draft.steps.metadataExtraction) {
    plan.push({
      id: 'step-metadata-extraction',
      stepId: 'metadata-extraction',
      service: 'metadata-extraction',
      label: 'Metadata Extraction',
      order: 7,
      enabled: true,
    })
  }

  if (draft.steps.metadataValidation) {
    plan.push({
      id: 'step-metadata-validation',
      stepId: 'metadata-validation',
      service: 'metadata-validation',
      label: 'Metadata Validation',
      order: 8,
      enabled: true,
    })
  }

  if (draft.steps.rightsDeterminator) {
    plan.push({
      id: 'step-rights-determinator',
      stepId: 'rights-determinator',
      service: 'rights-determinator',
      label: 'Rights Determinator',
      order: 9,
      enabled: true,
    })
  }

  if (draft.steps.fedoraIngester) {
    plan.push({
      id: 'step-fedora-ingester',
      stepId: 'fedora-ingester',
      service: 'fedora-ingester',
      label: 'Fedora Ingester',
      order: 10,
      enabled: true,
    })
  }

  return {
    profileId: draft.profileId,
    mode: draft.mode,
    executionPlan: plan,
  }
}

export function createDefaultDraft(): PipelineSelectionDraft {
  return expandPresetToDraft('custom')
}

export function pipelineConfigToRequestedStages(config: PipelineConfig): string[] {
  const requestedStages = config.executionPlan
    .filter((step) => step.enabled && step.service !== 'ingester')
    .map((step) => step.service)
    .filter((service): service is (typeof SUPPORTED_DOWNSTREAM_STAGES)[number] =>
      SUPPORTED_DOWNSTREAM_STAGES.includes(service as (typeof SUPPORTED_DOWNSTREAM_STAGES)[number]),
    )

  return Array.from(new Set(requestedStages))
}

export function legacyRequestedStagesToPipelineConfig(requestedStages: string[]): PipelineConfig {
  const normalized = new Set(
    requestedStages
      .map((stage) => stage.trim())
      .filter((stage): stage is (typeof SUPPORTED_DOWNSTREAM_STAGES)[number] =>
        SUPPORTED_DOWNSTREAM_STAGES.includes(stage as (typeof SUPPORTED_DOWNSTREAM_STAGES)[number]),
      ),
  )

  const draft = createDefaultDraft()
  draft.mode = 'custom'

  const includeSplitter = normalized.has(DOCUMENT_SPLITTER_STAGE)
  const includeRotator = normalized.has(PAGE_ROTATOR_STAGE)

  draft.steps.normalizePass1 = {
    enabled: includeSplitter || includeRotator,
    advancedOpen: false,
    subSelection: {
      split: includeSplitter,
      rotate: includeRotator,
    },
  }

  draft.steps.normalizePass2 = {
    enabled: includeSplitter && includeRotator,
    advancedOpen: false,
    subSelection: {
      split: includeSplitter && includeRotator,
      rotate: includeSplitter && includeRotator,
    },
  }

  draft.steps.ocrProcessor = normalized.has(OCR_PROCESSOR_STAGE)
  draft.steps.contentDedup = normalized.has(CONTENT_DEDUP_STAGE)

  return draftToPipelineConfig(applyDependencyRule(draft))
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
  if (draft.steps.metadataValidation) steps.push('Metadata Validation')
  if (draft.steps.rightsDeterminator) steps.push('Rights Determinator')
  if (draft.steps.fedoraIngester) steps.push('Fedora Ingester')
  return steps
}
