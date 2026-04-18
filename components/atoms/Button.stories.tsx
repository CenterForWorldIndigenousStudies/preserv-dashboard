import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ButtonPrimary, ButtonSecondary, ButtonGhost } from "@components/atoms/Button";

const meta: Meta<typeof ButtonPrimary> = {
  title: "Atoms/Button",
  component: ButtonPrimary,
  tags: ["autodocs"],
  argTypes: {
    variant: { control: false },
  },
  parameters: {
    controls: { exclude: ["variant"] },
    backgrounds: { default: "sand" },
  },
};

export default meta;
type Story = StoryObj<typeof ButtonPrimary>;

export const Primary: Story = {
  name: "ButtonPrimary",
  render: () => (
    <div className="flex flex-wrap gap-4">
      <ButtonPrimary>Approve Document</ButtonPrimary>
      <ButtonPrimary disabled>Processing</ButtonPrimary>
    </div>
  ),
};

export const Secondary: Story = {
  name: "ButtonSecondary",
  render: () => (
    <div className="flex flex-wrap gap-4">
      <ButtonSecondary>View Schema</ButtonSecondary>
      <ButtonSecondary disabled>Unavailable</ButtonSecondary>
    </div>
  ),
};

export const Ghost: Story = {
  name: "ButtonGhost",
  render: () => (
    <div className="flex flex-wrap gap-4">
      <ButtonGhost>Cancel</ButtonGhost>
      <ButtonGhost disabled>Dismissed</ButtonGhost>
    </div>
  ),
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-4">
      <ButtonPrimary>Approve</ButtonPrimary>
      <ButtonSecondary>View Details</ButtonSecondary>
      <ButtonGhost>Cancel</ButtonGhost>
    </div>
  ),
};