/** Generated from contracts/pipeline-services.json; do not edit manually. */
export const GENERATED_PIPELINE_SERVICES = {
  content_dedup: {
    display_name: 'Content Dedup',
    description: 'Detects and records duplicate content across documents.',
  },
  data_combiner: {
    display_name: 'Data Combiner',
    description: 'Normalizes legacy preservation data into the shared database.',
  },
  data_ingester: {
    display_name: 'Data Ingester',
    description: 'Ingests source files from Google Drive and creates preservation records.',
  },
  document_splitter: {
    display_name: 'Document Splitter',
    description: 'Splits documents into logical child documents.',
  },
  fedora_ingester: {
    display_name: 'Fedora Ingester',
    description: 'Publishes approved documents to the Fedora repository.',
  },
  metadata_extractor: {
    display_name: 'Metadata Extractor',
    description: 'Extracts structured metadata and relationships from document content.',
  },
  ocr_processor: {
    display_name: 'OCR Processor',
    description: 'Extracts text and quality signals from document images.',
  },
  page_rotator: {
    display_name: 'Page Rotator',
    description: 'Detects and corrects page orientation.',
  },
} as const

export type GeneratedPipelineServiceContract =
  (typeof GENERATED_PIPELINE_SERVICES)[keyof typeof GENERATED_PIPELINE_SERVICES]

export type GeneratedPipelineServiceKey = keyof typeof GENERATED_PIPELINE_SERVICES

export const GENERATED_PIPELINE_SERVICE_KEYS = {
  CONTENT_DEDUP: 'content_dedup',
  DATA_COMBINER: 'data_combiner',
  DATA_INGESTER: 'data_ingester',
  DOCUMENT_SPLITTER: 'document_splitter',
  FEDORA_INGESTER: 'fedora_ingester',
  METADATA_EXTRACTOR: 'metadata_extractor',
  OCR_PROCESSOR: 'ocr_processor',
  PAGE_ROTATOR: 'page_rotator',
} as const
