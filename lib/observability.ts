type LogLevel = 'debug' | 'info' | 'warn' | 'error'

type LogFields = Record<string, unknown>

function normalizeFields(fields: LogFields): LogFields {
  return Object.fromEntries(
    Object.entries(fields).filter(([, value]) => value !== undefined),
  )
}

export function logEvent(level: LogLevel, event: string, fields: LogFields = {}): void {
  const payload = normalizeFields({
    timestamp: new Date().toISOString(),
    level: level.toUpperCase(),
    service: 'preserv-dashboard',
    event,
    ...fields,
  })

  const message = JSON.stringify(payload)
  if (level === 'debug') {
    console.debug(message)
    return
  }
  if (level === 'warn') {
    console.warn(message)
    return
  }
  if (level === 'error') {
    console.error(message)
    return
  }
  console.info(message)
}
