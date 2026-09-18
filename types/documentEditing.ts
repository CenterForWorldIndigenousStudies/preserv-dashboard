export type DocumentEditValue = string | number | boolean | string[] | null

export interface DocumentEditTag {
  tagId?: string
  name: string
  notes: string | null
  deleteFromSystem?: boolean
}

export interface DocumentEditContributor {
  contributorId: string
  name?: string
  role: string
  type: string | null
  notes: string | null
}

export interface DocumentEditPublisher {
  publisherId: string
  name?: string
  notes: string | null
}

export interface DocumentEditSnapshot {
  accessLevel: string | null
  metadata: Record<string, DocumentEditValue>
  quality: {
    comment: string | null
    commentAdditional: string | null
  }
  tags: DocumentEditTag[]
  removedTagIds?: string[]
  deleteTagIds?: string[]
  contributors: DocumentEditContributor[]
  publishers: DocumentEditPublisher[]
}

export interface DocumentEditChange {
  fieldName: string
  previousValue: unknown
  newValue: unknown
  summary: string
}
