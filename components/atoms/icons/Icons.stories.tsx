import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { IconX } from "@atoms/icons/IconX";

const meta = {
  title: "Atoms/Icons",
  tags: ['autodocs'],
  args: {
    size: 20,
  },
  argTypes: {
    size: {
      control: "select",
      options: [12, 16, 20, 24, 32],
      description: "Icon size in pixels",
    },
    className: { control: false },
  },
  parameters: {
    backgrounds: { default: "sand" },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const X: Story = {
  name: "X Icon",
  args: {
    size: 20,
  },
  render: (args) => <IconX {...args} />,
};