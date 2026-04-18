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
      description: "Pixel size of the spinner (default: 32)",
    },
    message: { control: "text" },
    className: { control: false },
  },
  parameters: {
    backgrounds: { default: "sand" },
  },
};

export default meta;
type Story = StoryObj<typeof LoadingSpinner>;

export const Default: Story = {

  args: {},
};

export const Small: Story = {
  args: {
    size: 12,
  },
};

export const Medium: Story = {
  args: {
    size: 20,
  },
};

export const Large: Story = {
  args: {
    size: 32,
  },
};

export const CustomColor: Story = {
  args: {
    size: 20,
    className: "text-moss",
  },
};

// Inline / message variants

export const WithMessage: Story = {
  args: {
    message: "Loading available collections...",
  },
};

export const Saving: Story = {
  args: {
    message: "Saving collection tags...",
  },
};

export const Fetching: Story = {
  args: {
    message: "Fetching document metadata...",
  },
};
