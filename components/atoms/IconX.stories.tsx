import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { IconX } from "@components/atoms/IconX";

const meta: Meta<typeof IconX> = {
  title: "Atoms/IconX",
  component: IconX,
  tags: ["autodocs"],
  argTypes: {
    size: {
      control: "select",
      options: [12, 16, 20, 24],
      description: "Icon size in pixels",
    },
    className: { control: false },
  },
  parameters: {
    backgrounds: { default: "sand" },
  },
};

export default meta;
type Story = StoryObj<typeof IconX>;

export const Size12: Story = {
  name: "Size 12",
  args: {
    size: 12,
  },
};

export const Size16: Story = {
  name: "Size 16",
  args: {
    size: 16,
  },
};

export const Size20: Story = {
  name: "Size 20",
  args: {
    size: 20,
  },
};

export const Size24: Story = {
  name: "Size 24",
  args: {
    size: 24,
  },
};

export const AllSizes: Story = {
  render: () => (
    <div className="flex items-center gap-6">
      <IconX size={12} />
      <IconX size={16} />
      <IconX size={20} />
      <IconX size={24} />
    </div>
  ),
};