import type { ReactElement } from 'react'
import { Box, List, ListItem, Paper, Stack, Typography } from '@mui/material'

import type { DriveFolderOption } from '@lib/googleDrive'

interface ProcessSelectedFoldersPanelProps {
  folders: DriveFolderOption[]
}

export function ProcessSelectedFoldersPanel({ folders }: ProcessSelectedFoldersPanelProps): ReactElement {
  return (
    <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 4, p: 3 }}>
      <Stack spacing={2}>
        <div>
          <Typography
            variant="caption"
            sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.16em' }}
          >
            Selected Folders
          </Typography>
          <Typography variant="h5" sx={{ mt: 1 }}>
            Review your sources
          </Typography>
        </div>

        {folders.length === 0 ? (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            No folders selected yet.
          </Typography>
        ) : (
          <List disablePadding sx={{ display: 'grid', gap: 1.5 }}>
            {folders.map((folder) => (
              <ListItem key={folder.id} disableGutters disablePadding sx={{ display: 'block' }}>
                <Paper elevation={0} sx={{ p: 2, borderRadius: 3, bgcolor: 'background.default' }}>
                  <Box>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {folder.name}
                    </Typography>
                    <Typography variant="caption" sx={{ wordBreak: 'break-all', color: 'text.secondary' }}>
                      {folder.id}
                    </Typography>
                  </Box>
                </Paper>
              </ListItem>
            ))}
          </List>
        )}
      </Stack>
    </Paper>
  )
}
