import { GENERATED_PIPELINE_SERVICES, type GeneratedPipelineServiceKey } from '@constants/generated/pipelineServices'
import { INGESTER_STAGE, type ServiceId } from '@constants/pipeline'

export type PipelineServiceKey = GeneratedPipelineServiceKey

const CONTRACT_KEY_BY_DASHBOARD_SERVICE: Record<ServiceId, PipelineServiceKey> = {
  [INGESTER_STAGE]: 'data_ingester',
  'document-splitter': 'document_splitter',
  'page-rotator': 'page_rotator',
  'ocr-processor': 'ocr_processor',
  'content-dedup': 'content_dedup',
  'metadata-extraction': 'metadata_extractor',
  'fedora-ingester': 'fedora_ingester',
}

const passSuffixPattern = /^(.*)_(\d+)$/

function titleCaseFallback(value: string): string {
  return value
    .split('_')
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ')
}

export function getPipelineServiceDisplayName(serviceKey: string): string {
  const normalizedKey = serviceKey.trim()
  if (!normalizedKey) {
    return 'Unknown Service'
  }

  const match = normalizedKey.match(passSuffixPattern)
  const baseServiceKey = match?.[1] ?? normalizedKey
  const passNumber = match?.[2] ?? null
  const baseDisplayName =
    GENERATED_PIPELINE_SERVICES[baseServiceKey as PipelineServiceKey]?.display_name ?? titleCaseFallback(baseServiceKey)

  return passNumber === null ? baseDisplayName : `${baseDisplayName} Pass ${passNumber}`
}

export function getPipelineServiceDisplayNameForService(service: ServiceId): string {
  return getPipelineServiceDisplayName(CONTRACT_KEY_BY_DASHBOARD_SERVICE[service])
}

export const pipelineServiceDisplayNames = Object.freeze(
  Object.fromEntries(Object.entries(GENERATED_PIPELINE_SERVICES).map(([key, value]) => [key, value.display_name])),
)
