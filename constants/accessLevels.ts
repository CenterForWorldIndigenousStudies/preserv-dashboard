// Keep these values aligned with src/preserv_pipeline/db/access_levels.py.
export const ACCESS_LEVEL_OPTIONS = ['public', 'restricted', 'internal', 'admin', 'confidential'] as const

export type AccessLevelOption = (typeof ACCESS_LEVEL_OPTIONS)[number]

export const ACCESS_LEVEL_LABELS: Record<AccessLevelOption, string> = {
  public: 'Open access',
  restricted: 'Restricted access',
  internal: 'Internal use only',
  admin: 'Administrative access',
  confidential: 'Confidential access',
}
