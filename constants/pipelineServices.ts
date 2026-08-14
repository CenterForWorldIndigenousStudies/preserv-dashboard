import { GENERATED_PIPELINE_SERVICES, type GeneratedPipelineServiceKey } from '@constants/generated/pipelineServices'

export const PIPELINE_SERVICES = GENERATED_PIPELINE_SERVICES

export type PipelineServiceKey = GeneratedPipelineServiceKey

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
    PIPELINE_SERVICES[baseServiceKey as PipelineServiceKey]?.display_name ?? titleCaseFallback(baseServiceKey)

  return passNumber === null ? baseDisplayName : `${baseDisplayName} Pass ${passNumber}`
}

export const pipelineServiceDisplayNames = Object.freeze(
  Object.fromEntries(Object.entries(PIPELINE_SERVICES).map(([key, value]) => [key, value.display_name])),
)
