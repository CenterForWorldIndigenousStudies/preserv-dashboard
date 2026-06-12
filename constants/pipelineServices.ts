import pipelineServicesContract from '@contracts/pipeline-services.json'

interface PipelineServiceContractEntry {
  display_name: string
}

type PipelineServicesContract = Record<string, PipelineServiceContractEntry>

const pipelineServices = pipelineServicesContract as PipelineServicesContract

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
  const baseDisplayName = pipelineServices[baseServiceKey]?.display_name ?? titleCaseFallback(baseServiceKey)

  return passNumber === null ? baseDisplayName : `${baseDisplayName} Pass ${passNumber}`
}

export const pipelineServiceDisplayNames = Object.freeze(
  Object.fromEntries(Object.entries(pipelineServices).map(([key, value]) => [key, value.display_name])),
)
