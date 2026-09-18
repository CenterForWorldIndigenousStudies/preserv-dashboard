/** Generated from contracts/access-levels.json; do not edit manually. */
export const GENERATED_ACCESS_LEVELS = {
  PUBLIC: { value: 'public', description: 'Open access' },
  RESTRICTED: { value: 'restricted', description: 'Restricted access' },
  INTERNAL: { value: 'internal', description: 'Internal use only' },
  ADMIN: { value: 'admin', description: 'Administrative access' },
  CONFIDENTIAL: { value: 'confidential', description: 'Confidential access' },
} as const

export const GENERATED_ACCESS_LEVEL_OPTIONS = [
  GENERATED_ACCESS_LEVELS.PUBLIC.value,
  GENERATED_ACCESS_LEVELS.RESTRICTED.value,
  GENERATED_ACCESS_LEVELS.INTERNAL.value,
  GENERATED_ACCESS_LEVELS.ADMIN.value,
  GENERATED_ACCESS_LEVELS.CONFIDENTIAL.value,
] as const

export type GeneratedAccessLevelOption = (typeof GENERATED_ACCESS_LEVEL_OPTIONS)[number]

export const GENERATED_ACCESS_LEVEL_LABELS: Record<GeneratedAccessLevelOption, string> = {
  'public': GENERATED_ACCESS_LEVELS.PUBLIC.description,
  'restricted': GENERATED_ACCESS_LEVELS.RESTRICTED.description,
  'internal': GENERATED_ACCESS_LEVELS.INTERNAL.description,
  'admin': GENERATED_ACCESS_LEVELS.ADMIN.description,
  'confidential': GENERATED_ACCESS_LEVELS.CONFIDENTIAL.description,
}
