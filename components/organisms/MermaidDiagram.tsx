'use client'

import { useEffect, useId, useState, useCallback, type ReactElement } from 'react'
import mermaid from 'mermaid'
import Box from '@mui/material/Box'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha, type Theme } from '@mui/material/styles'
import { Button } from '@atoms/Button'
import { IconX } from '@atoms/icons/IconX'

let mermaidInitialized = false

interface MermaidDiagramProps {
  source: string
  className?: string
}

export function MermaidDiagram({ source, className = '' }: MermaidDiagramProps): ReactElement {
  const [svg, setSvg] = useState<string>('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const uid = useId().replace(/:/g, '-')

  const closeModal = useCallback(() => {
    setIsModalOpen(false)
  }, [])

  useEffect(() => {
    async function doRender() {
      setError(null)
      try {
        if (!mermaidInitialized) {
          mermaid.initialize({})
          mermaidInitialized = true
        }
        const id = `mermaid-${uid}`
        const result = await mermaid.render(id, source)
        setSvg(result.svg)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to render diagram')
        setSvg('')
      }
    }
    void doRender()
  }, [source, uid])

  return (
    <>
      {/* Inline diagram with Enlarge button */}
      <Box
        className={className || undefined}
        sx={(theme: Theme) => {
          const primaryColor = theme.palette.primary.main

          return {
            position: 'relative',
            my: 2,
            width: '100%',
            maxWidth: '100%',
            overflow: 'hidden',
            border: 1,
            borderColor: alpha(primaryColor, 0.2),
            borderRadius: 1.5,
            backgroundColor: 'background.paper',
          }
        }}
      >
        <Box sx={{ position: 'absolute', right: 1, top: 1, zIndex: 1 }}>
          <Button type="button" onClick={() => setIsModalOpen(true)} variant="secondary" size="sm">
            Enlarge
          </Button>
        </Box>
        {error ? (
          <Typography color="error.main" variant="body2" sx={{ p: 2 }}>
            Diagram error: {error}
          </Typography>
        ) : svg ? (
          <Box
            component="div"
            dangerouslySetInnerHTML={{ __html: svg }}
            sx={{
              width: '100%',
              '& svg': {
                display: 'block',
                maxWidth: '100%',
                height: 'auto',
              },
            }}
          />
        ) : (
          <Stack sx={{ width: '100%', alignItems: 'center', justifyContent: 'center', p: 4 }}>
            <Typography variant="body2" color="text.secondary">
              Rendering diagram...
            </Typography>
          </Stack>
        )}
      </Box>

      {/* Full-screen modal */}
      <Dialog
        open={isModalOpen}
        onClose={closeModal}
        fullScreen
        aria-labelledby="mermaid-diagram-dialog-title"
        sx={(theme: Theme) => ({
          '& .MuiDialog-paper': {
            backgroundColor: theme.palette.background.paper,
          },
        })}
      >
        <DialogTitle
          id="mermaid-diagram-dialog-title"
          sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1.5 }}
        >
          Diagram preview
          <IconButton onClick={closeModal} aria-label="Close diagram preview">
            <IconX size={20} />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ overflow: 'auto', p: 2 }}>
          {svg ? (
            <Box
              component="div"
              dangerouslySetInnerHTML={{ __html: svg }}
              sx={{
                minWidth: '200vw',
                minHeight: '200vh',
                '& svg': {
                  transform: 'scale(3)',
                  transformOrigin: 'top left',
                },
              }}
            />
          ) : (
            <Stack sx={{ alignItems: 'center', justifyContent: 'center', p: 8 }}>
              <Typography variant="body2" color="text.secondary">
                Rendering diagram...
              </Typography>
            </Stack>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
