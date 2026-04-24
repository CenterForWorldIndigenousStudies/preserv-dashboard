import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { MermaidDiagram } from '@organisms/MermaidDiagram'

const meta: Meta<typeof MermaidDiagram> = {
  title: 'Organisms/MermaidDiagram',
  component: MermaidDiagram,
  tags: ['autodocs'],
  argTypes: {
    source: { control: 'text' },
    className: { control: false },
  },
  parameters: {
    backgrounds: { default: 'sand' },
  },
}

export default meta
type Story = StoryObj<typeof MermaidDiagram>

export const SimpleFlowchart: Story = {
  args: {
    source: `graph TD
      A[Document Ingested] --> B{Validation}
      B -->|Pass| C[State: ingested]
      B -->|Fail| D[State: failed]
      C --> E[Normalization]
      E --> F[State: normalized]
      F --> G[Review Queue]
      G --> H{Approved?}
      H -->|Yes| I[State: completed]
      H -->|No| J[State: under_review]`,
  },
}

export const SequenceDiagram: Story = {
  args: {
    source: `sequenceDiagram
      participant D as Document Source
      participant P as Pipeline
      participant DB as MySQL
      participant DR as Drive Backup

      D->>P: POST /api/documents
      P->>DB: INSERT document
      P->>DR: Upload to Drive
      DR-->>P: file_id
      P->>DB: UPDATE file_id
      DB-->>P: ok
      P-->>D: 201 Created`,
  },
}

export const EntityRelationship: Story = {
  args: {
    source: `erDiagram
      DOCUMENTS {
        string id PK
        string filename
        bigint filesize
        string state
        string original_url
        datetime created_at
        string drive_file_id
      }
      COLLECTIONS {
        string name PK
        string description
        int document_count
      }
      DOCUMENTS ||--o{ DOCUMENT_COLLECTIONS : tagged_in
      COLLECTIONS ||--o{ DOCUMENT_COLLECTIONS : contains`,
  },
}
