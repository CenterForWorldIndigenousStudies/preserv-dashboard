import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { expect, fn, within } from 'storybook/test'

import { NavSection } from '@molecules/NavSection'
import type { DashboardNavigationSection } from '@constants/navigation'

const primarySection: DashboardNavigationSection = {
  id: 'primary',
  label: 'Primary',
  items: [
    { href: '/dashboard', iconKey: 'dashboard', label: 'Dashboard' },
    { href: '/documents', iconKey: 'documents', label: 'Documents' },
    { href: '/process-documents', iconKey: 'process', label: 'Process' },
  ],
}

const utilitySection: DashboardNavigationSection = {
  id: 'utility',
  label: 'Utility',
  items: [
    { href: '/db', iconKey: 'db', label: 'DB' },
    { href: '/component-library', iconKey: 'componentLibrary', label: 'Component Library' },
  ],
}

const meta = {
  title: 'Molecules/NavSection',
  component: NavSection,
  tags: ['autodocs'],
  args: {
    activePathname: '/documents',
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
    activePathname: '/dashboard',
  },
}

export const UtilitySection: Story = {
  args: {
    activePathname: '/component-library',
    section: utilitySection,
  },
}
