const CURRENT_COST_FIELDS = new Set(['aiCostUsd', 'estimatedCostUsd'])

interface CurrentCostSummary {
  total: number
  hasCost: boolean
  incomplete: boolean
}

function sumCurrentCostFields(value: unknown): CurrentCostSummary {
  if (Array.isArray(value)) {
    return value.reduce<CurrentCostSummary>((summary, item) => addCostSummaries(summary, sumCurrentCostFields(item)), {
      total: 0,
      hasCost: false,
      incomplete: false,
    })
  }

  if (!value || typeof value !== 'object') {
    return { total: 0, hasCost: false, incomplete: false }
  }

  const accounting = (value as { costAccounting?: unknown }).costAccounting
  if (accounting && typeof accounting === 'object') {
    return sumCurrentCostFields(accounting)
  }

  return Object.entries(value).reduce<CurrentCostSummary>(
    (summary, [key, nestedValue]) => {
      if (['config', 'value', 'intermediatePayload', 'persistedMetadata', 'rightsExtractionResponse'].includes(key)) {
        return summary
      }
      if (['missingUsageCalls', 'unpricedCalls'].includes(key) && Number(nestedValue) > 0) {
        return { ...summary, hasCost: true, incomplete: true }
      }
      if (CURRENT_COST_FIELDS.has(key)) {
        if (nestedValue === null || nestedValue === undefined || typeof nestedValue === 'boolean') return summary
        const cost = Number(nestedValue)
        return Number.isFinite(cost) && cost >= 0 ? { ...summary, total: summary.total + cost, hasCost: true } : summary
      }

      return addCostSummaries(summary, sumCurrentCostFields(nestedValue))
    },
    { total: 0, hasCost: false, incomplete: false },
  )
}

function addCostSummaries(left: CurrentCostSummary, right: CurrentCostSummary): CurrentCostSummary {
  return {
    total: left.total + right.total,
    hasCost: left.hasCost || right.hasCost,
    incomplete: left.incomplete || right.incomplete,
  }
}

function formatUsd(value: number): string {
  const [whole, fraction = ''] = value.toFixed(6).split('.')
  const trimmedFraction = fraction.replace(/0+$/, '')
  return `$${whole}.${(trimmedFraction || '').padEnd(2, '0')}`
}

/**
 * Format a raw or already formatted cost for display in the dashboard.
 *
 * Keep this separate from total-cost calculation so every cost display uses
 * the same precision and missing-value behavior.
 */
export function formatCost(value: unknown): string {
  if (value === null || value === undefined) {
    return '—'
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? formatUsd(value) : '—'
  }

  if (typeof value !== 'string' || !value.trim()) {
    return '—'
  }

  const displayValue = value.trim()
  const numericValue = Number(displayValue.replace(/[$,]/g, ''))
  return Number.isFinite(numericValue) ? formatUsd(numericValue) : displayValue
}

function parseCurrentProcessingDetails(value: unknown): unknown {
  if (typeof value !== 'string' || !value.trim()) {
    return value
  }

  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

function getNormalizedLegacyImportCost(value: unknown): number | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }

  const legacyImport = (value as { legacyImport?: unknown }).legacyImport
  if (!legacyImport || typeof legacyImport !== 'object' || Array.isArray(legacyImport)) {
    return null
  }

  const cost = Number((legacyImport as { costUsd?: unknown }).costUsd)
  return Number.isFinite(cost) && cost >= 0 ? cost : null
}

export function calculateTotalProcessingCost(
  currentProcessingDetails: unknown,
  legacyDocumentCosts: readonly { cost: unknown }[],
): string {
  const parsedDetails = parseCurrentProcessingDetails(currentProcessingDetails)
  const currentCost = sumCurrentCostFields(parsedDetails)
  if (currentCost.hasCost) {
    return `${formatCost(currentCost.total)}${currentCost.incomplete ? ' (incomplete)' : ''}`
  }

  const normalizedLegacyImportCost = getNormalizedLegacyImportCost(parsedDetails)
  if (normalizedLegacyImportCost !== null) {
    return formatCost(normalizedLegacyImportCost)
  }

  const legacyTotal = legacyDocumentCosts.reduce((total, row) => {
    const cost = Number(row.cost ?? 0)
    return Number.isFinite(cost) ? total + cost : total
  }, 0)
  return formatCost(legacyTotal)
}

interface DocumentCostRow {
  cost: unknown
  processing_details?: unknown
}

function stageCosts(details: unknown): Map<string, CurrentCostSummary> {
  const parsed = parseCurrentProcessingDetails(details)
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return new Map()
  return new Map(
    Object.entries(parsed)
      .filter(([key]) => !['pipeline', 'legacyImport'].includes(key))
      .map(([key, value]): [string, CurrentCostSummary] => [key, sumCurrentCostFields(value)])
      .filter(([, cost]) => cost.hasCost),
  )
}

function rollbackCost(details: unknown): CurrentCostSummary | null {
  const parsed = parseCurrentProcessingDetails(details)
  const rollback = parsed && typeof parsed === 'object' ? (parsed as { rollback?: unknown }).rollback : null
  if (!rollback || typeof rollback !== 'object') return null
  const snapshot = rollback as { documentCostTotal?: unknown; documentCostIncomplete?: unknown }
  if (snapshot.documentCostTotal === undefined || snapshot.documentCostTotal === null) return null
  const total = Number(snapshot.documentCostTotal)
  return Number.isFinite(total) && total >= 0
    ? { total, hasCost: true, incomplete: snapshot.documentCostIncomplete === true }
    : null
}

/** Reconcile batch summaries with document charges for the same stage once. */
export function calculateBatchProcessingCost(details: unknown, documents: readonly DocumentCostRow[]): string {
  const stages = stageCosts(details)
  const documentStages = new Map<string, CurrentCostSummary>()
  for (const document of documents) {
    for (const [key, cost] of stageCosts(document.processing_details)) {
      const previous = documentStages.get(key) ?? { total: 0, hasCost: false, incomplete: false }
      documentStages.set(key, addCostSummaries(previous, cost))
    }
  }
  for (const [key, cost] of documentStages) {
    const batchCost = stages.get(key)
    stages.set(key, {
      total: Math.max(batchCost?.total ?? 0, cost.total),
      hasCost: true,
      incomplete: cost.incomplete || (batchCost?.incomplete ?? false),
    })
  }
  const captured = rollbackCost(details)
  if (captured) {
    const current = [...stages.values()].reduce(addCostSummaries, { total: 0, hasCost: false, incomplete: false })
    return `${formatCost(Math.max(current.total, captured.total))}${current.incomplete || captured.incomplete ? ' (incomplete)' : ''}`
  }
  if (!stages.size) return calculateTotalProcessingCost(details, documents)
  const total = [...stages.values()].reduce(addCostSummaries, { total: 0, hasCost: false, incomplete: false })
  return `${formatCost(total.total)}${total.incomplete ? ' (incomplete)' : ''}`
}
