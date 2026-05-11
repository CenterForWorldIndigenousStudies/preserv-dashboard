import type { ReactElement } from 'react'
import {
  Checkbox,
  FormControlLabel,
  Paper,
  Stack,
  Typography,
} from '@mui/material'

import { DOCUMENT_SPLITTER_STAGE } from '@constants/pipeline'

interface PipelineStageSelectorPanelProps {
  selectedStages: string[]
  onSelectedStagesChange: (stages: string[]) => void
}

const availableStages = [
  {
    id: DOCUMENT_SPLITTER_STAGE,
    label: 'Document Splitter',
    description:
      'Automatically continue into document splitting after ingest completes successfully.',
  },
] as const

export function PipelineStageSelectorPanel({
  selectedStages,
  onSelectedStagesChange,
}: PipelineStageSelectorPanelProps): ReactElement {
  function toggleStage(stageId: string): void {
    if (selectedStages.includes(stageId)) {
      onSelectedStagesChange(selectedStages.filter((stage) => stage !== stageId))
      return
    }

    onSelectedStagesChange([...selectedStages, stageId])
  }

  return (
    <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 4, p: 3 }}>
      <Stack spacing={2}>
        <div>
          <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.16em' }}>
            Additional Pipeline Stages
          </Typography>
          <Typography variant="h5" sx={{ mt: 1 }}>
            Continue after ingest
          </Typography>
          <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
            Ingest always runs first. Select downstream stages to continue automatically after a successful ingest.
          </Typography>
        </div>

        <Stack spacing={1.5}>
          {availableStages.map((stage) => (
            <Paper
              key={stage.id}
              elevation={0}
              sx={{ p: 2, borderRadius: 3, bgcolor: 'background.default' }}
            >
              <FormControlLabel
                control={
                  <Checkbox
                    checked={selectedStages.includes(stage.id)}
                    onChange={() => toggleStage(stage.id)}
                    size="small"
                  />
                }
                label={
                  <Stack spacing={0.5}>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {stage.label}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      {stage.description}
                    </Typography>
                  </Stack>
                }
                sx={{ alignItems: 'flex-start', m: 0, width: '100%' }}
              />
            </Paper>
          ))}
        </Stack>
      </Stack>
    </Paper>
  )
}
