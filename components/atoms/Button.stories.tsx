import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Box } from '@mui/material'
import { Button, sizeMap, variantMap } from '@atoms/Button'

const meta = {
  title: 'Atoms/Button',
  component: Button,
  tags: ['autodocs'],
  args: {
    variant: 'primary',
    size: 'md',
    fullWidth: false,
    loading: false,
    disabled: false,
    children: 'Button Text',
  },
  argTypes: {
    variant: {
      control: 'select',
      options: Object.keys(variantMap),
      description: 'Visual style of the button',
    },
    size: {
      control: 'select',
      options: Object.keys(sizeMap),
      description: 'Size of the button',
    },
    fullWidth: {
      control: 'boolean',
      description: 'Stretch button to fill container width',
    },
    loading: {
      control: 'boolean',
      description: 'Show loading spinner and disable button',
    },
    disabled: {
      control: 'boolean',
      description: 'Disable the button',
    },
    children: {
      control: 'text',
      description: 'Button label text',
    },
    className: {
      control: 'text',
      description: 'Additional CSS classes for custom styling',
    },
  },
  parameters: {
    backgrounds: { default: 'sand' },
  },
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  name: 'Default Button',
  args: {
    children: '',
  },
  render: (args) => {
    const variant = args.variant ? variantMap[args.variant] : 'Default'
    const buttonText = args.children ? args.children : variant
    return (
      <Box sx={{ width: '80vw', textAlign: 'center' }}>
        <Button {...args}>{buttonText}</Button>
      </Box>
    )
  },
}

export const Sizes: Story = {
  name: 'Button Sizes',
  args: {
    children: '',
  },
  render: (args) => {
    const buttonSize = args.size ? sizeMap[args.size] : 'Default'
    const buttonText = args.children ? args.children : `Button Size: ${buttonSize}`
    return (
      <Box sx={{ width: '80vw', textAlign: 'center' }}>
        <Button {...args}>{buttonText}</Button>
      </Box>
    )
  },
}

export const Loading: Story = {
  name: 'Loading Button',
  args: {
    children: `Loading...`,
    loading: true,
  },
  render: (args) => {
    return (
      <Box sx={{ width: '80vw', textAlign: 'center' }}>
        <Button {...args} />
      </Box>
    )
  },
}

export const FullWidth: Story = {
  name: 'Full Width Button',
  args: {
    fullWidth: true,
  },
  render: (args) => {
    const buttonText = args.fullWidth ? 'Full Width Button' : 'Normal Button'
    return (
      <Box sx={{ width: '80vw', textAlign: 'center' }}>
        <Button {...args}>{buttonText}</Button>
      </Box>
    )
  },
}

export const Disabled: Story = {
  name: 'Disabled Button',
  args: {
    children: '',
    disabled: true,
  },
  render: (args) => {
    const buttonText = args.children ? args.children : args.disabled ? 'Disabled' : 'Button Text'
    return (
      <Box sx={{ width: '80vw', textAlign: 'center' }}>
        <Button {...args}>{buttonText}</Button>
      </Box>
    )
  },
}
