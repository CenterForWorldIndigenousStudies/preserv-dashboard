import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { expect, fn, within } from 'storybook/test'

import { NavSection } from '@molecules/NavSection'
import type { DashboardNavigationSection } from '@constants/navigation'
import {
  COMPONENT_LIBRARY_PATH,
  DASHBOARD_PATH,
  DB_SCHEMA_PATH,
  DOCUMENTS_PATH,
  PROCESS_DOCUMENTS_PATH,
} from '@constants/paths'

const primarySection: DashboardNavigationSection = {
  id: 'primary',
  label: 'Primary',
  items: [
    { href: DASHBOARD_PATH, iconKey: 'dashboard', label: 'Dashboard' },
    { href: DOCUMENTS_PATH, iconKey: 'documents', label: 'Documents' },
    { href: PROCESS_DOCUMENTS_PATH, iconKey: 'process', label: 'Process' },
  ],
}

const utilitySection: DashboardNavigationSection = {
  id: 'utility',
  label: 'Utility',
  items: [
    { href: DB_SCHEMA_PATH, iconKey: 'db', label: 'DB' },
    { href: COMPONENT_LIBRARY_PATH, iconKey: 'componentLibrary', label: 'Component Library' },
  ],
}

const meta = {
  title: 'Molecules/NavSection',
  component: NavSection,
  tags: ['autodocs'],
  args: {
    activePathname: DOCUMENTS_PATH,
    onNavigate: fn(),
    section: primarySection,
  },
  parameters: {
    backgrounds: { default: 'sand' },
  },
} satisfies Meta<typeof NavSection>

export default meta
type Story = StoryObj<typeof meta>

export const DocumentsActive: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByRole('link', { name: 'Documents' })).toHaveAttribute('aria-current', 'page')
  },
}

export const DashboardActive: Story = {
  args: {
    activePathname: DASHBOARD_PATH,
  },
}

export const UtilitySection: Story = {
  args: {
    activePathname: COMPONENT_LIBRARY_PATH,
    section: utilitySection,
  },
}
