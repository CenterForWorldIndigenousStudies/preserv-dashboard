import { useState, type ReactElement } from 'react'
import { Alert, Box, Checkbox, FormControlLabel, List, ListItem, Paper, Stack, Typography } from '@mui/material'

import { Button } from '@atoms/Button'
import { AccordionPanel } from '@molecules/AccordionPanel'
import type { DriveFolderOption } from '@lib/googleDrive'

interface GoogleDriveFolderTreeProps {
  title?: string
  description?: string
  rootFolders: DriveFolderOption[]
  childFoldersByParent: Record<string, DriveFolderOption[]>
  expandedFolderIds: Record<string, boolean>
  selectedFolderIds: Record<string, DriveFolderOption>
  error: string | null
  expanded?: boolean
  onExpandedChange?: (expanded: boolean) => void
  onToggleFolderSelection: (folder: DriveFolderOption) => void
  onToggleFolderExpansion: (folderId: string) => void
}

const DEFAULT_DESCRIPTION = 'Select one or more folders from the shared Google Drive workspace.'
export const DEFAULT_TITLE = 'Browse Google Drive folders'

export function GoogleDriveFolderTree({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  rootFolders,
  childFoldersByParent,
  expandedFolderIds,
  selectedFolderIds,
  error,
  expanded,
  onExpandedChange,
  onToggleFolderSelection,
  onToggleFolderExpansion,
}: GoogleDriveFolderTreeProps): ReactElement {
  const [internalExpanded, setInternalExpanded] = useState(true)
  const isExpanded = expanded ?? internalExpanded

  function handleExpandedChange(nextExpanded: boolean): void {
    if (expanded === undefined) {
      setInternalExpanded(nextExpanded)
    }
    onExpandedChange?.(nextExpanded)
  }

  return (
    <AccordionPanel
      expanded={isExpanded}
      onChange={(_, nextExpanded) => handleExpandedChange(nextExpanded)}
      summary={
        <Stack spacing={0.25} sx={{ minWidth: 0 }}>
          <Typography
            variant={'caption'}
            sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.16em' }}
          >
            {'Google Drive'}
          </Typography>
          <Typography component={'span'} variant={'h5'} sx={{ mt: 0.5 }}>
            {title}
          </Typography>
          <Typography component={'span'} variant={'body2'} sx={{ color: 'text.secondary' }}>
            {description}
          </Typography>
        </Stack>
      }
    >
      <Stack spacing={2.5}>
        {error ? <Alert severity={'error'}>{error}</Alert> : null}

        <Stack spacing={1.5}>
          {rootFolders.map((folder) => {
            const children = childFoldersByParent[folder.id] ?? []
            const isExpanded = !!expandedFolderIds[folder.id]
            const isSelected = !!selectedFolderIds[folder.id]

            return (
              <Paper key={folder.id} elevation={0} sx={{ p: 2, borderRadius: 3, bgcolor: 'background.default' }}>
                <Stack spacing={1.5}>
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: { xs: 'column', sm: 'row' },
                      gap: 1.5,
                      alignItems: { xs: 'flex-start', sm: 'center' },
                    }}
                  >
                    <Button
                      type={'button'}
                      variant={'secondary'}
                      size={'sm'}
                      onClick={() => onToggleFolderExpansion(folder.id)}
                    >
                      {isExpanded ? 'Hide' : 'Browse'}
                    </Button>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={isSelected}
                          onChange={() => onToggleFolderSelection(folder)}
                          size={'small'}
                        />
                      }
                      label={folder.name}
                      sx={{ m: 0, '& .MuiFormControlLabel-label': { fontWeight: 600 } }}
                    />
                  </Box>

                  <Typography variant={'caption'} sx={{ color: 'text.secondary', wordBreak: 'break-all' }}>
                    {folder.id}
                  </Typography>

                  {isExpanded && children.length > 0 ? (
                    <List dense disablePadding sx={{ pl: 2, borderLeft: '1px solid', borderColor: 'divider' }}>
                      {children.map((child) => (
                        <ListItem key={child.id} disableGutters sx={{ py: 0.75 }}>
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={!!selectedFolderIds[child.id]}
                                onChange={() => onToggleFolderSelection(child)}
                                size={'small'}
                              />
                            }
                            label={
                              <Box>
                                <Typography variant={'body2'} sx={{ fontWeight: 600 }}>
                                  {child.name}
                                </Typography>
                                <Typography
                                  variant={'caption'}
                                  sx={{ wordBreak: 'break-all', color: 'text.secondary' }}
                                >
                                  {child.id}
                                </Typography>
                              </Box>
                            }
                            sx={{ alignItems: 'flex-start', m: 0, width: '100%' }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  ) : null}
                </Stack>
              </Paper>
            )
          })}
        </Stack>
      </Stack>
    </AccordionPanel>
  )
}
