import { GENERATED_PROCESSING_DETAILS_CONTRACT } from '@constants/generated/processingDetails'
import { GENERATED_PIPELINE_SERVICES } from '@constants/generated/pipelineServices'

export interface ProcessingDetailsPropertyDefinition {
  label: string
  description: string
  valueType: string
}

type ProcessingDetailsSection = {
  properties: Record<string, ProcessingDetailsPropertyDefinition>
  patterns?: Record<string, ProcessingDetailsPropertyDefinition>
}

const contract = GENERATED_PROCESSING_DETAILS_CONTRACT as unknown as {
  batch: ProcessingDetailsSection
  document: ProcessingDetailsSection
  pipeline: ProcessingDetailsSection
  stage: ProcessingDetailsSection
  callback: ProcessingDetailsSection
  collection: ProcessingDetailsSection
  legacyImport: ProcessingDetailsSection
  notebook: ProcessingDetailsSection
  stageEntry: ProcessingDetailsPropertyDefinition
}

const PROPERTY_SECTIONS: ProcessingDetailsSection[] = [
  contract.batch,
  contract.document,
  contract.pipeline,
  contract.stage,
  contract.callback,
  contract.collection,
  contract.legacyImport,
  contract.notebook,
]

function camelCaseServiceKey(serviceKey: string): string {
  return serviceKey.replace(/_([a-z0-9])/g, (_, character: string) => character.toUpperCase())
}

function getStageEntryDefinition(key: string): ProcessingDetailsPropertyDefinition | null {
  const passMatch = key.match(/^(.*)Pass(\d+)$/)
  const baseKey = passMatch?.[1] ?? key
  const service = Object.keys(GENERATED_PIPELINE_SERVICES).find(
    (serviceKey) => camelCaseServiceKey(serviceKey) === baseKey,
  )
  if (!service) {
    return null
  }

  const serviceLabel = GENERATED_PIPELINE_SERVICES[service as keyof typeof GENERATED_PIPELINE_SERVICES].display_name
  return {
    ...contract.stageEntry,
    label: passMatch ? `${serviceLabel} Pass ${passMatch[2]}` : serviceLabel,
  }
}

function findPatternDefinition(section: ProcessingDetailsSection, key: string): ProcessingDetailsPropertyDefinition | null {
  const match = Object.entries(section.patterns ?? {})
    .filter(([prefix]) => key.startsWith(prefix))
    .sort(([left], [right]) => right.length - left.length)[0]

  return match?.[1] ?? null
}

export function getProcessingDetailsPropertyDefinition(key: string): ProcessingDetailsPropertyDefinition | null {
  for (const section of PROPERTY_SECTIONS) {
    const definition = section.properties[key] ?? findPatternDefinition(section, key)
    if (definition) {
      return definition
    }
  }

  return getStageEntryDefinition(key)
}
