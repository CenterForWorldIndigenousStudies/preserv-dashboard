/**
 * Storybook stub for @lib/prisma/generated/client.
 *
 * Prisma's generated client is Node.js-only and uses require() internally,
 * which Rolldown cannot process in a browser ESM context.
 *
 * lib/queries/queries.ts only uses Prisma.sql and Prisma.TransactionClient at runtime
 * (no actual database calls - storybook stubs db.ts separately).
 * This stub provides just enough Prisma namespace for type-checking to pass.
 *
 * This file is only loaded during Storybook builds (via vite alias in main.ts).
 */

// Minimal Prisma namespace stub for browser/storybook use.
export const Prisma = {
  sql: (_strings: TemplateStringsArray, ..._values: unknown[]) =>
    // Return a dummy query object - never actually executed in storybook
    Object.assign([], { _type: 'Prisma.sql' }),
  empty: Object.assign([], { _type: 'Prisma.empty' }),
  join: (arr: unknown[], _sep?: string) => arr,
  raw: (val: unknown) => val,
}

export type PrismaClient = object
