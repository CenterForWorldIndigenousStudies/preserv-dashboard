import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { StateBadge } from "@components/atoms/StateBadge";

const meta: Meta<typeof StateBadge> = {
  title: "Atoms/StateBadge",
  component: StateBadge,
  tags: ["autodocs"],
  argTypes: {
    state: {
      control: "select",
      options: ["completed", "failed", "under_review", "ingested", "normalized", "pending"],
      description: "Document pipeline state string",
    },
    className: { control: false },
  },
  parameters: {
    backgrounds: { default: "sand" },
  },
};

export default meta;
type Story = StoryObj<typeof StateBadge>;

export const Completed: Story = {
  args: {
    state: "completed",
  },
};

export const Failed: Story = {
  args: {
    state: "failed",
  },
};

export const UnderReview: Story = {
  name: "Under Review",
  args: {
    state: "under_review",
  },
};

export const Ingested: Story = {
  args: {
    state: "ingested",
  },
};

export const Normalized: Story = {
  args: {
    state: "normalized",
  },
};

export const Default: Story = {
  name: "Unknown State",
  args: {
    state: "pending",
  },
};

export const AllStates: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <StateBadge state="completed" />
      <StateBadge state="failed" />
      <StateBadge state="under_review" />
      <StateBadge state="ingested" />
      <StateBadge state="normalized" />
      <StateBadge state="unknown_state" />
    </div>
  ),
};