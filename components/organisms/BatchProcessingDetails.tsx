'use client'

import type { ReactElement } from 'react'
import { Box, Stack, Typography } from '@mui/material'

import { AccordionPanel } from '@molecules/AccordionPanel'
import { Cost } from '@atoms/Cost'
import { DateAtom } from '@atoms/Date'
import { MetadataNameWithNotes } from '@atoms/MetadataNameWithNotes'
import { KeyValueRow } from '@molecules/KeyValueRow'
import { NestedValueRenderer } from '@molecules/NestedValueRenderer'
import { getProcessingDetailsPropertyDefinition } from '@lib/processingDetails'
import { formatProcessingTime } from '@lib/processingTime'
import type { BatchProperty } from 'types/batches'

interface BatchProcessingDetailsProps {
  properties: readonly BatchProperty[]
  showHeading?: boolean
}

function isStructuredValue(value: unknown): boolean {
  return typeof value === 'object' && value !== null
}

function renderProcessingValue(key: string, value: unknown): ReactElement | string | undefined {
  const valueType = getProcessingDetailsPropertyDefinition(key)?.valueType
  if (valueType === 'currencyUsd') {
    return <Cost value={value} />
  }
  if (valueType === 'unixTimestamp') {
    return typeof value === 'number' || typeof value === 'string' ? <DateAtom value={value} /> : undefined
  }
  if (valueType === 'durationSeconds') {
    return formatProcessingTime(value)
  }
  if (valueType === 'durationMilliseconds') {
    const milliseconds = Number(value)
    return Number.isFinite(milliseconds) ? formatProcessingTime(milliseconds / 1000) : undefined
  }
  return undefined
}

function renderProcessingLabel(key: string): ReactElement | string {
  const definition = getProcessingDetailsPropertyDefinition(key)
  return definition ? (
    <MetadataNameWithNotes name={key} displayName={definition.label} notes={definition.description} />
  ) : (
    key
  )
}

export function BatchProcessingDetails({ properties, showHeading = true }: BatchProcessingDetailsProps): ReactElement {
  return (
    <Box>
      {showHeading ? (
        <Typography variant={'overline'} sx={{ color: 'primary.main', fontWeight: 700, letterSpacing: '0.14em' }}>
          {'Processing Details'}
        </Typography>
      ) : null}
      {properties.length === 0 ? (
        <Typography variant={'body2'} color={'text.secondary'} sx={{ mt: showHeading ? 1.5 : 0 }}>
          {'No processing details are available.'}
        </Typography>
      ) : (
        <Stack spacing={1.5} sx={{ mt: showHeading ? 1.5 : 0 }}>
          {properties.map((property, index) => {
            if (!isStructuredValue(property.value)) {
              return (
                <KeyValueRow
                  key={`${property.key}-${index}`}
                  label={renderProcessingLabel(property.key)}
                  value={property.key === 'Total Cost' ? <Cost value={property.value} /> : property.value}
                />
              )
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
                    {renderProcessingLabel(property.key)}
                  </Typography>
                }
                summarySx={{ px: 1.5, '& .MuiAccordionSummary-content': { my: 1 } }}
                detailsSx={{ px: 1.5, pt: 0, pb: 1.5 }}
              >
                <NestedValueRenderer
                  value={property.value}
                  renderValue={renderProcessingValue}
                  renderLabel={renderProcessingLabel}
                />
              </AccordionPanel>
            )
          })}
        </Stack>
      )}
    </Box>
  )
}
