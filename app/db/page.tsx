import fs from 'fs'
import path from 'path'
import type { ReactElement } from 'react'
import { Box, Paper, Stack, Typography } from '@mui/material'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { PageHeader } from '@organisms/PageHeader'
import { MermaidDiagram } from '@organisms/MermaidDiagram'

export const dynamic = 'force-dynamic'
const db_schema_markdown = 'PRESERVATION_DB.md'

export default function DbPage(): ReactElement {
  let filePath = path.join(process.cwd(), `../../documentation/db/${db_schema_markdown}`)
  // Check if the file exists before reading it
  if (!fs.existsSync(filePath)) {
    filePath = path.join(process.cwd(), db_schema_markdown)
  }
  const source = fs.readFileSync(filePath, 'utf-8')

  const components: Components = {
    pre({ children }: { children?: React.ReactNode }) {
      return (
        <Box
          component="pre"
          sx={{
            bgcolor: 'background.default',
            borderRadius: 2,
            color: 'text.primary',
            m: 0,
            overflowX: 'auto',
            p: 2,
            '& code': {
              backgroundColor: 'transparent',
              display: 'block',
              p: 0,
            },
          }}
        >
          {children}
        </Box>
      )
    },
    code(args: { className?: string; children?: React.ReactNode }) {
      const className = args.className
      const children = args.children
      const match = /language-(\w+)/.exec(className ?? '')
      const language = match?.[1]

      if (language === 'mermaid') {
        const diagramSource = String(children as unknown).replace(/\n$/, '')
        return <MermaidDiagram source={diagramSource} />
      }

      if (language) {
        return (
          <Box
            component="code"
            sx={{
              bgcolor: 'rgba(233, 105, 84, 0.1)',
              borderRadius: 1,
              color: 'text.primary',
              display: 'block',
              fontFamily: 'monospace',
              fontSize: '0.75rem',
              fontWeight: 500,
              px: 0.75,
              py: 0.25,
            }}
          >
            {children}
          </Box>
        )
      }

      return (
        <Box
          component="code"
          sx={{
            bgcolor: 'background.default',
            borderRadius: 1,
            color: 'text.primary',
            fontFamily: 'monospace',
            fontSize: '0.75rem',
            fontWeight: 500,
            px: 0.75,
            py: 0.25,
          }}
        >
          {children}
        </Box>
      )
    },
    h1({ children }: { children?: React.ReactNode }) {
      return (
        <Typography component="h2" variant="h4" sx={{ color: 'text.primary', mb: 2, mt: 0 }}>
          {children}
        </Typography>
      )
    },
  }

  return (
    <Stack spacing={4} sx={{ width: '100%' }}>
      <PageHeader
        eyebrow="Database Schema"
        title="CWIS Preservation Database"
        description="Entity-relationship diagram and design notes for the preservation MySQL database."
      />

      <Paper
        component="section"
        elevation={0}
        sx={{
          bgcolor: 'rgba(255, 255, 255, 0.8)',
          border: '1px solid',
          borderColor: 'rgba(53, 88, 52, 0.15)',
          boxShadow: 2,
          px: { xs: 2, md: 3 },
          py: 2,
        }}
      >
        <Typography variant="body2" color="text.secondary">
          Edit the schema diagram in{' '}
          <Box
            component="code"
            sx={{
              bgcolor: 'background.default',
              borderRadius: 1,
              color: 'text.primary',
              fontFamily: 'monospace',
              fontSize: '0.75rem',
              fontWeight: 500,
              px: 0.75,
              py: 0.25,
            }}
          >
            documentation/db/PRESERVATION_DB.md
          </Box>
          . Changes appear here after deployment.
        </Typography>
      </Paper>

      <Paper
        component="article"
        elevation={0}
        sx={{
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'rgba(53, 88, 52, 0.15)',
          boxShadow: 2,
          p: { xs: 3, md: 4 },
          '& h2, & h3, & h4, & h5, & h6': { color: 'text.primary' },
          '& p': { color: 'text.primary', lineHeight: 1.6 },
          '& a': { color: 'primary.main' },
          '& strong': { color: 'text.primary' },
          '& ul': { listStyleType: 'disc', pl: 3 },
          '& ol': { listStyleType: 'decimal', pl: 3 },
          '& li': { color: 'text.primary', mb: 0.75 },
        }}
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
          {source}
        </ReactMarkdown>
      </Paper>
    </Stack>
  )
}
