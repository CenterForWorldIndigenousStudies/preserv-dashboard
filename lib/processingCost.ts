const CURRENT_COST_FIELDS = new Set(['ai_cost_usd', 'estimated_cost_usd'])

interface CurrentCostSummary {
  total: number
  hasCost: boolean
}

function sumCurrentCostFields(value: unknown): CurrentCostSummary {
  if (Array.isArray(value)) {
    return value.reduce<CurrentCostSummary>((summary, item) => addCostSummaries(summary, sumCurrentCostFields(item)), {
      total: 0,
      hasCost: false,
    })
  }

  if (!value || typeof value !== 'object') {
    return { total: 0, hasCost: false }
  }

  return Object.entries(value).reduce<CurrentCostSummary>(
    (summary, [key, nestedValue]) => {
      if (CURRENT_COST_FIELDS.has(key)) {
        const cost = Number(nestedValue)
        return Number.isFinite(cost) && cost >= 0 ? { total: summary.total + cost, hasCost: true } : summary
      }

      return addCostSummaries(summary, sumCurrentCostFields(nestedValue))
    },
    { total: 0, hasCost: false },
  )
}

function addCostSummaries(left: CurrentCostSummary, right: CurrentCostSummary): CurrentCostSummary {
  return {
    total: left.total + right.total,
    hasCost: left.hasCost || right.hasCost,
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

export function calculateTotalProcessingCost(
  currentProcessingDetails: unknown,
  legacyDocumentCosts: readonly { cost: unknown }[],
): string {
  const currentCost = sumCurrentCostFields(parseCurrentProcessingDetails(currentProcessingDetails))
  if (currentCost.hasCost) {
    return formatCost(currentCost.total)
  }

  const legacyTotal = legacyDocumentCosts.reduce((total, row) => {
    const cost = Number(row.cost ?? 0)
    return Number.isFinite(cost) ? total + cost : total
  }, 0)
  return formatCost(legacyTotal)
}
