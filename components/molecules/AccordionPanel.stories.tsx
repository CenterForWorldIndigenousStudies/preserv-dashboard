import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { AccordionPanel } from './AccordionPanel'

const meta = {
  title: 'Molecules/AccordionPanel',
  component: AccordionPanel,
  tags: ['autodocs'],
  args: {
    summary: 'Accordion summary',
    children: <Typography variant={'body2'}>{'Accordion details.'}</Typography>,
  },
  parameters: {
    backgrounds: { default: 'sand' },
  },
  decorators: [
    (Story) => (
      <Box sx={{ maxWidth: 720, p: 3 }}>
        <Story />
      </Box>
    ),
  ],
} satisfies Meta<typeof AccordionPanel>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <AccordionPanel
      defaultExpanded
      summary={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant={'h6'}>Ingest Batch 2026-04-01</Typography>
          <Typography variant={'caption'} color={'text.secondary'}>
            {'5 properties'}
          </Typography>
        </Box>
      }
    >
      <Typography variant={'body2'} color={'text.secondary'}>
        {'Shared accordion framing for collections, batch details, and other expandable dashboard sections.'}
      </Typography>
    </AccordionPanel>
  ),
}

export const Collapsed: Story = {
  render: () => (
    <AccordionPanel summary={<Typography variant={'h6'}>Collapsed panel</Typography>}>
      <Typography variant={'body2'}>{'This content is hidden until the panel is expanded.'}</Typography>
    </AccordionPanel>
  ),
}
