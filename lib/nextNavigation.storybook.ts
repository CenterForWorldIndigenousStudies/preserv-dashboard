export interface StorybookRouter {
  back: () => void
  forward: () => void
  prefetch: (href?: string) => Promise<void>
  push: (href?: string) => void
  refresh: () => void
  replace: (href?: string) => void
}

const router: StorybookRouter = {
  back: () => undefined,
  forward: () => undefined,
  prefetch: (_href?: string) => Promise.resolve(),
  push: (_href?: string) => undefined,
  refresh: () => undefined,
  replace: (_href?: string) => undefined,
}

export function useRouter(): StorybookRouter {
  return router
}

export function usePathname(): string {
  return '/'
}

export function useSearchParams(): URLSearchParams {
  return new URLSearchParams()
}

export function redirect(): never {
  throw new Error('redirect is unavailable in Storybook')
}

export function notFound(): never {
  throw new Error('notFound is unavailable in Storybook')
}
