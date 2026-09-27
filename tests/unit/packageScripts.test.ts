import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

type DashboardPackageJson = {
  scripts?: Record<string, string>
}

const testFilePath = fileURLToPath(import.meta.url)
const testDir = path.dirname(testFilePath)
const packageJsonPath = path.resolve(testDir, '..', '..', 'package.json')
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as DashboardPackageJson

describe('dashboard package scripts', () => {
  it('generates Prisma before starting the webpack development server', () => {
    expect(packageJson.scripts?.['dev:next']).toBe('run-s db:prisma:generate dev:next:server')
    expect(packageJson.scripts?.['dev:next:server']).toBe('next dev --webpack')
  })

  it('syncs generated contracts before dashboard lint', () => {
    expect(packageJson.scripts?.['prelint:project']).toBe('npm run contracts:sync')
  })
})
