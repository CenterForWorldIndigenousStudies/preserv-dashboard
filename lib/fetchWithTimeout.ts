export interface FetchWithTimeoutOptions {
  timeoutMessage: string
  timeoutMs: number
}

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === 'AbortError') ||
    (typeof error === 'object' &&
      error !== null &&
      'name' in error &&
      (error as { name?: unknown }).name === 'AbortError')
  )
}

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  options: FetchWithTimeoutOptions,
): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => {
    controller.abort()
  }, options.timeoutMs)

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    })
  } catch (error) {
    if (controller.signal.aborted && isAbortError(error)) {
      throw new Error(options.timeoutMessage, {
        cause: error,
      })
    }

    throw error
  } finally {
    clearTimeout(timeout)
  }
}
