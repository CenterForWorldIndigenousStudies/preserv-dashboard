import { Box, List, ListItem, Paper, Stack, Typography } from '@mui/material'
import { normalizeNeedsReviewValue, type NeedsReviewReasonGroup } from '@lib/needsReview'

export interface NeedsReviewReasonsProps {
  value: unknown
  emptyMessage?: string
}

function ReasonGroup({ serviceLabel, reasons }: NeedsReviewReasonGroup): React.ReactElement {
  return (
    <Stack spacing={1}>
      <Typography
        variant="caption"
        sx={{
          color: '#355834',
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}
      >
        {serviceLabel}
      </Typography>
      <List dense disablePadding sx={{ listStyleType: 'disc', pl: 2.5 }}>
        {reasons.map((reason) => (
          <ListItem
            key={`${serviceLabel}-${reason}`}
            sx={{
              display: 'list-item',
              py: 0.25,
              px: 0,
              color: '#231f20',
            }}
          >
            <Typography variant="body2" sx={{ color: 'inherit' }}>
              {reason}
            </Typography>
          </ListItem>
        ))}
      </List>
    </Stack>
  )
}

export function NeedsReviewReasons({
  value,
  emptyMessage = 'No needs review reasons recorded.',
}: NeedsReviewReasonsProps): React.ReactElement {
  const groups = normalizeNeedsReviewValue(value)

  if (groups.length === 0) {
    return (
      <Paper
        variant="outlined"
        sx={{
          borderColor: 'rgba(53,88,52,0.18)',
          borderRadius: 2,
          backgroundColor: '#faf8f7',
          px: 2,
          py: 1.5,
        }}
      >
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {emptyMessage}
        </Typography>
      </Paper>
    )
  }

  return (
    <Paper
      variant="outlined"
      sx={{
        borderColor: 'rgba(53,88,52,0.18)',
        borderRadius: 2,
        backgroundColor: '#faf8f7',
        px: 2,
        py: 1.5,
      }}
    >
      <Stack spacing={1.5}>
        {groups.map((group, index) => (
          <Box
            key={`${group.serviceKey}-${index}`}
            sx={{
              pt: index === 0 ? 0 : 1.5,
              borderTop: index === 0 ? 'none' : '1px solid rgba(53,88,52,0.12)',
            }}
          >
            <ReasonGroup {...group} />
          </Box>
        ))}
      </Stack>
    </Paper>
  )
}
