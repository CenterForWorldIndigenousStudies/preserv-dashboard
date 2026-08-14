import { Box, List, ListItem, Paper, Stack, Typography } from '@mui/material'

import { NeedsReviewReasons } from '@molecules/NeedsReviewReasons'
import type { DocumentReadiness } from 'types/documents'
import type { NeedsReviewReasonGroup } from 'types/needsReview'

interface DocumentReadinessDiagnosticsProps {
  readiness?: DocumentReadiness | null
  activeReviewReasons?: NeedsReviewReasonGroup[]
}

export function DocumentReadinessDiagnostics({
  readiness,
  activeReviewReasons = [],
}: DocumentReadinessDiagnosticsProps): React.ReactElement {
  return (
    <Paper component={'section'} elevation={0} sx={{ bgcolor: 'background.paper', p: { xs: 2.5, md: 3 } }}>
      <Typography component={'h2'} variant={'h5'} color={'text.primary'}>
        {'Processing Diagnostics'}
      </Typography>
      <Typography variant={'body2'} color={'text.secondary'} sx={{ mt: 1 }}>
        {'Readiness is evaluated on the preservation candidate itself. These diagnostics explain what still prevents approval.'}
      </Typography>

      {readiness ? (
        <Stack spacing={2} sx={{ mt: 3 }}>
          <Box>
            <Typography variant={'caption'} sx={{ fontWeight: 600, textTransform: 'uppercase' }}>
              {'Readiness outcome'}
            </Typography>
            <Typography variant={'body1'} sx={{ mt: 0.5 }}>
              {readiness.approved ? 'Ready for human approval' : 'Needs review'}
            </Typography>
          </Box>
          <Box>
            <Typography variant={'caption'} sx={{ fontWeight: 600, textTransform: 'uppercase' }}>
              {'Preservation candidate'}
            </Typography>
            <Typography variant={'body1'} sx={{ mt: 0.5 }}>
              {readiness.isPreservationCandidate ? 'Yes' : 'No'}
            </Typography>
          </Box>
          {readiness.unmetRequirements.length > 0 ? (
            <Box>
              <Typography variant={'caption'} sx={{ fontWeight: 600, textTransform: 'uppercase' }}>
                {'Unmet requirements'}
              </Typography>
              <List dense disablePadding sx={{ listStyleType: 'disc', pl: 2.5, mt: 0.5 }}>
                {readiness.unmetRequirements.map((requirement) => (
                  <ListItem key={requirement} disablePadding sx={{ display: 'list-item', py: 0.25 }}>
                    <Typography variant={'body2'}>{requirement}</Typography>
                  </ListItem>
                ))}
              </List>
            </Box>
          ) : null}
        </Stack>
      ) : (
        <Typography variant={'body2'} color={'text.secondary'} sx={{ mt: 3 }}>
          {'Readiness diagnostics are not available for this document.'}
        </Typography>
      )}

      {activeReviewReasons.length > 0 ? (
        <Box sx={{ mt: 3 }}>
          <Typography variant={'caption'} sx={{ fontWeight: 600, textTransform: 'uppercase' }}>
            {'Active review reasons'}
          </Typography>
          <Box sx={{ mt: 1 }}>
            <NeedsReviewReasons value={activeReviewReasons} />
          </Box>
        </Box>
      ) : null}
    </Paper>
  )
}
