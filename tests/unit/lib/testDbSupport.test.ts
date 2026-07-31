import { afterEach, describe, expect, it } from 'vitest'

import {
  isSandboxDbAccessError,
  shouldSkipDashboardIntegrationSuite,
} from '../../../tests/integration/support/test-db'

const DASHBOARD_INTEGRATION_SKIP_REASON = 'DASHBOARD_INTEGRATION_SKIP_REASON'

afterEach(() => {
  delete process.env[DASHBOARD_INTEGRATION_SKIP_REASON]
})

describe('dashboard integration DB support', () => {
  it('treats EPERM localhost DB access errors as sandbox blocks', () => {
    const error = Object.assign(new Error('connect EPERM 127.0.0.1:3306'), {
      code: 'EPERM',
    })

    expect(isSandboxDbAccessError(error)).toBe(true)
  })

  it('does not treat connection refused as a sandbox block', () => {
    const error = Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:3306'), {
      code: 'ECONNREFUSED',
    })

    expect(isSandboxDbAccessError(error)).toBe(false)
  })

  it('skips dashboard integration suites only when a skip reason is set', () => {
    expect(shouldSkipDashboardIntegrationSuite()).toBe(false)

    process.env[DASHBOARD_INTEGRATION_SKIP_REASON] =
      'Managed environment blocked localhost MariaDB access.'

    expect(shouldSkipDashboardIntegrationSuite()).toBe(true)
  })
})
