/** Generated from contracts/pipeline-execution-modes.json; do not edit manually. */
export const GENERATED_PIPELINE_EXECUTION_MODES = {
  NORMAL: 'normal',
  RETRY: 'retry',
  RERUN: 'rerun',
  REPROCESS: 'reprocess',
} as const

export type GeneratedPipelineExecutionMode =
  (typeof GENERATED_PIPELINE_EXECUTION_MODES)[keyof typeof GENERATED_PIPELINE_EXECUTION_MODES]
