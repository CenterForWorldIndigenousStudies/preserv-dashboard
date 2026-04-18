import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { InlineSpinner } from "@components/atoms/InlineSpinner";

const meta: Meta<typeof InlineSpinner> = {
  title: "Atoms/InlineSpinner",
  component: InlineSpinner,
  tags: ["autodocs"],
  argTypes: {
    message: { control: "text" },
    className: { control: false },
  },
  parameters: {
    backgrounds: { default: "sand" },
  },
};

export default meta;
type Story = StoryObj<typeof InlineSpinner>;

export const Default: Story = {
  name: "Without Message",
  args: {},
};

export const WithMessage: Story = {
  name: "With Message",
  args: {
    message: "Loading available collections...",
  },
};

export const Saving: Story = {
  name: "Saving",
  args: {
    message: "Saving collection tags...",
  },
};

export const Fetching: Story = {
  name: "Fetching",
  args: {
    message: "Fetching document metadata...",
  },
};