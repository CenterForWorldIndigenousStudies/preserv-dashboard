import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Badge } from "@components/atoms/Badge";

const meta: Meta<typeof Badge> = {
  title: "Atoms/Badge",
  component: Badge,
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["clay", "sky", "moss", "sand"],
      description: "Color variant of the badge",
    },
    children: {
      control: "text",
      description: "Badge label text",
    },
    className: {
      control: false,
    },
  },
  args: {
    variant: "sky",
    children: "In Review",
  },
  parameters: {
    backgrounds: {
      default: "sand",
    },
  },
};

export default meta;
type Story = StoryObj<typeof Badge>;

export const Clay: Story = {
  args: {
    variant: "clay",
    children: "Needs Review",
  },
};

export const Sky: Story = {
  args: {
    variant: "sky",
    children: "In Review",
  },
};

export const Moss: Story = {
  args: {
    variant: "moss",
    children: "Approved",
  },
};

export const Sand: Story = {
  args: {
    variant: "sand",
    children: "Archived",
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <Badge variant="clay">Needs Review</Badge>
      <Badge variant="sky">In Review</Badge>
      <Badge variant="moss">Approved</Badge>
      <Badge variant="sand">Archived</Badge>
    </div>
  ),
};
