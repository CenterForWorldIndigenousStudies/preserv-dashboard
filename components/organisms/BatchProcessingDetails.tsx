'use client'

import type { ReactElement } from 'react'
import { Box, Stack, Typography } from '@mui/material'

import { AccordionPanel } from '@molecules/AccordionPanel'
import { KeyValueRow } from '@molecules/KeyValueRow'
import { NestedValueRenderer } from '@molecules/NestedValueRenderer'
import type { BatchProperty } from 'types/batches'

interface BatchProcessingDetailsProps {
  properties: readonly BatchProperty[]
}

function isStructuredValue(value: unknown): boolean {
  return typeof value === 'object' && value !== null
}

export function BatchProcessingDetails({ properties }: BatchProcessingDetailsProps): ReactElement {
  return (
    <Box>
      <Typography variant={'overline'} sx={{ color: 'primary.main', fontWeight: 700, letterSpacing: '0.14em' }}>
        {'Processing Details'}
      </Typography>
      {properties.length === 0 ? (
        <Typography variant={'body2'} color={'text.secondary'} sx={{ mt: 1.5 }}>
          {'No processing details are available.'}
        </Typography>
      ) : (
        <Stack spacing={1.5} sx={{ mt: 1.5 }}>
          {properties.map((property, index) => {
            if (!isStructuredValue(property.value)) {
              return <KeyValueRow key={`${property.key}-${index}`} label={property.key} value={property.value} />
            }

            return (
              <AccordionPanel
                key={`${property.key}-${index}`}
                summary={
                  <Typography
                    sx={{
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      color: 'primary.main',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                    }}
                  >
                    {property.key}
                  </Typography>
                }
                summarySx={{ px: 1.5, '& .MuiAccordionSummary-content': { my: 1 } }}
                detailsSx={{ px: 1.5, pt: 0, pb: 1.5 }}
              >
                <NestedValueRenderer value={property.value} />
              </AccordionPanel>
            )
          })}
        </Stack>
      )}
    </Box>
  )
}
