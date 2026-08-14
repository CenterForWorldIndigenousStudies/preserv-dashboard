/** Generated from contracts/pipeline-services.json; do not edit manually. */
export const GENERATED_PIPELINE_SERVICES = {
  content_dedup: {
    display_name: 'Content Dedup',
  },
  data_combiner: {
    display_name: 'Data Combiner',
  },
  data_ingester: {
    display_name: 'Data Ingester',
  },
  document_splitter: {
    display_name: 'Document Splitter',
  },
  fedora_ingester: {
    display_name: 'Fedora Ingester',
  },
  metadata_extractor: {
    display_name: 'Metadata Extractor',
  },
  metadata_validator: {
    display_name: 'Metadata Validator',
  },
  ocr_processor: {
    display_name: 'OCR Processor',
  },
  page_rotator: {
    display_name: 'Page Rotator',
  },
  rights_determinator: {
    display_name: 'Rights Determinator',
  },
} as const

export type GeneratedPipelineServiceContract =
  (typeof GENERATED_PIPELINE_SERVICES)[keyof typeof GENERATED_PIPELINE_SERVICES]

export type GeneratedPipelineServiceKey = keyof typeof GENERATED_PIPELINE_SERVICES
