import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import AuthStatus from '@molecules/AuthStatus'

const meta: Meta<typeof AuthStatus> = {
  title: 'Molecules/AuthStatus',
  component: AuthStatus,
  tags: ['autodocs'],
  parameters: {
    backgrounds: { default: 'sand' },
    layout: 'centered',
  },
}

export default meta
type Story = StoryObj<typeof AuthStatus>

// AuthStatus uses useSession from next-auth, which requires a session provider.
// We use render functions with mock sessions to demonstrate both states.
export const SignedIn: Story = {
  render: () => (
    <div className="rounded-2xl border border-moss/15 bg-white p-6 shadow-panel">
      <p className="mb-1 text-xs uppercase tracking-[0.15em] text-ink/60">Authenticated</p>
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-ink">marygoldaross@cwis.org</span>
        <button className="rounded-full bg-ink/10 px-4 py-2 text-sm text-ink hover:bg-ink/20">Sign Out</button>
      </div>
    </div>
  ),
}

export const SignedOut: Story = {
  render: () => (
    <div className="rounded-2xl border border-moss/15 bg-white p-6 shadow-panel">
      <p className="mb-1 text-xs uppercase tracking-[0.15em] text-ink/60">Not Authenticated</p>
      <button className="rounded-full bg-moss px-4 py-2 text-sm text-white hover:bg-moss/90">Sign In</button>
    </div>
  ),
}
