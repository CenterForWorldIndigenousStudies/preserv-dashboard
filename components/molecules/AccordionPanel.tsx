'use client'

import type { ReactElement, ReactNode } from 'react'
import Accordion, { type AccordionProps } from '@mui/material/Accordion'
import AccordionDetails from '@mui/material/AccordionDetails'
import AccordionSummary from '@mui/material/AccordionSummary'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { alpha, type SxProps, type Theme } from '@mui/material/styles'

interface AccordionPanelProps extends Omit<AccordionProps, 'children'> {
  children: ReactNode
  summary: ReactNode
  summarySx?: SxProps<Theme>
  detailsSx?: SxProps<Theme>
}

const accordionPanelSx = (theme: Theme) => ({
  border: 1,
  borderColor: alpha(theme.palette.moss?.main ?? theme.palette.primary.main, 0.15),
  borderRadius: 2,
  boxShadow: 3,
  overflow: 'hidden',
  '&::before': { display: 'none' },
})

const accordionSummarySx = {
  backgroundColor: 'background.paper',
  px: 3,
  py: 1,
  '& .MuiAccordionSummary-content': {
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 2,
    marginY: 1,
  },
}

const accordionDetailsSx = (theme: Theme) => ({
  backgroundColor: alpha(theme.palette.sand?.main ?? theme.palette.secondary.main, 0.25),
  px: 3,
  py: 2,
})

function mergeSx(baseSx: SxProps<Theme>, customSx: SxProps<Theme> | undefined): SxProps<Theme> {
  if (!customSx) {
    return baseSx
  }

  return [baseSx, customSx] as SxProps<Theme>
}

export function AccordionPanel({
  children,
  summary,
  summarySx,
  detailsSx,
  sx,
  ...accordionProps
}: AccordionPanelProps): ReactElement {
  return (
    <Accordion
      {...accordionProps}
      disableGutters
      slots={{ heading: 'h2', ...accordionProps.slots }}
      sx={mergeSx(accordionPanelSx, sx)}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon sx={{ color: 'text.secondary' }} />}
        sx={mergeSx(accordionSummarySx, summarySx)}
      >
        {summary}
      </AccordionSummary>
      <AccordionDetails sx={mergeSx(accordionDetailsSx, detailsSx)}>{children}</AccordionDetails>
    </Accordion>
  )
}
