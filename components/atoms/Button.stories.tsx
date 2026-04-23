import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Button, sizeMap, variantMap } from "@atoms/Button";

const meta = {
  title: "Atoms/Button",
  component: Button,
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: Object.keys(variantMap),
      description: "Visual style of the button",
    },
    size: {
      control: "select",
      options: Object.keys(sizeMap),
      description: "Size of the button",
    },
    fullWidth: {
      control: "boolean",
      description: "Stretch button to fill container width",
    },
    loading: {
      control: "boolean",
      description: "Show loading spinner and disable button",
    },
    disabled: {
      control: "boolean",
      description: "Disable the button",
    },
    children: {
      control: "text",
      description: "Button label text",
    },
  },
  parameters: {
    backgrounds: { default: "sand" },
  },
} satisfies Meta<typeof Button>

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    variant: "primary",
    children: "Approve Document",
  },
};

export const Secondary: Story = {
  args: {
    variant: "secondary",
    children: "View Schema",
  },
};

export const Ghost: Story = {
  args: {
    variant: "ghost",
    children: "Cancel",
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-4">
      <Button variant="primary">Approve</Button>
      <Button variant="secondary">View Details</Button>
      <Button variant="ghost">Cancel</Button>
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-4">
      <Button variant="primary" size="sm">Small</Button>
      <Button variant="primary" size="md">Medium</Button>
      <Button variant="primary" size="lg">Large</Button>
    </div>
  ),
};

export const Loading: Story = {
  args: {
    variant: "primary",
    children: "Save Changes",
    loading: true,
  },
};

export const FullWidth: Story = {
  args: {
    variant: "primary",
    children: "Submit",
    fullWidth: true,
  },
};

export const Disabled: Story = {
  args: {
    variant: "secondary",
    children: "Unavailable",
    disabled: true,
  },
};

export const Interactive: Story = {
  args: {
    variant: "primary",
    size: "md",
    fullWidth: false,
    loading: false,
    disabled: false,
    children: "Click Me",
  },
};