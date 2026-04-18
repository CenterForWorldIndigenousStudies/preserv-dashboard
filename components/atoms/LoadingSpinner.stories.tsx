import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { LoadingSpinner } from "@components/atoms/LoadingSpinner";

const meta: Meta<typeof LoadingSpinner> = {
  title: "Atoms/LoadingSpinner",
  component: LoadingSpinner,
  tags: ["autodocs"],
  argTypes: {
    size: {
      control: "select",
      options: [12, 16, 20, 24, 32],
      description: "Pixel size of the spinner",
    },
    className: { control: false },
  },
  parameters: {
    backgrounds: { default: "sand" },
  },
};

export default meta;
type Story = StoryObj<typeof LoadingSpinner>;

export const Default: Story = {
  args: {
    size: 16,
  },
};

export const Small: Story = {
  name: "Size 12",
  args: {
    size: 12,
  },
};

export const Medium: Story = {
  name: "Size 20",
  args: {
    size: 20,
  },
};

export const Large: Story = {
  name: "Size 32",
  args: {
    size: 32,
  },
};

export const CustomColor: Story = {
  name: "Custom Color",
  args: {
    size: 20,
    className: "text-moss",
  },
};