import type { PipelineExecutionActionResult, PipelineExecutionRequest } from 'types/pipelineExecution'

export function requestPipelineExecution(_request: PipelineExecutionRequest): Promise<PipelineExecutionActionResult> {
  return Promise.resolve({ ok: false, error: 'Pipeline execution is unavailable in Storybook.' })
}
