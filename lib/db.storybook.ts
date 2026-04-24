/**
 * Storybook stub for @lib/db.
 *
 * Prisma (and @prisma/adapter-mariadb) are Node.js-only packages that cannot run
 * in a browser ESM context. This stub satisfies the import chain at build time
 * without bundling any Prisma code into the Storybook client bundle.
 *
 * This file is only loaded during Storybook builds (via vite alias in main.ts).
 * The real db.ts is used in production Next.js server contexts.
 */
export const db = {
  findMany(): Promise<object[]> {
    return Promise.resolve([])
  },
  count(): Promise<number> {
    return Promise.resolve(0)
  },
  findUnique(): Promise<object | null> {
    return Promise.resolve(null)
  },
  findFirst(): Promise<object | null> {
    return Promise.resolve(null)
  },
  groupBy(): Promise<object[]> {
    return Promise.resolve([])
  },
  create(): Promise<object> {
    return Promise.resolve({})
  },
  update(): Promise<object> {
    return Promise.resolve({})
  },
  delete(): Promise<object> {
    return Promise.resolve({})
  },
  deleteMany(): Promise<object> {
    return Promise.resolve({})
  },
  updateMany(): Promise<object> {
    return Promise.resolve({})
  },
  upsert(): Promise<object> {
    return Promise.resolve({})
  },
  $transaction<T>(_fn: () => Promise<T>): Promise<T> {
    return _fn()
  },
  $disconnect(): Promise<void> {
    return Promise.resolve()
  },
}