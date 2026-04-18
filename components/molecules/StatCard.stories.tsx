import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { StatCard } from "@components/molecules/StatCard";

const meta: Meta<typeof StatCard> = {
  title: "Molecules/StatCard",
  component: StatCard,
  tags: ["autodocs"],
  argTypes: {
    title: {
      control: "text",
      description: "Label above the numeric value",
    },
    value: {
      control: "number",
      description: "Numeric value to display",
    },
    href: {
      control: "text",
      description: "Optional link URL (omit for static card)",
    },
  },
  args: {
    title: "Total Documents",
    value: 12847,
    href: undefined,
  },
  parameters: {
    backgrounds: {
      default: "sand",
    },
  },
};

export default meta;
type Story = StoryObj<typeof StatCard>;

export const Static: Story = {
  args: {
    title: "Total Documents",
    value: 12847,
  },
};

export const Linked: Story = {
  args: {
    title: "Pending Review",
    value: 342,
    href: "/reviews",
  },
};

export const CollectionSize: Story = {
  args: {
    title: "Collection Size",
    value: 8754693120,
    href: "/documents",
  },
};

export const AllCards: Story = {
  render: () => (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <StatCard title="Total Documents" value={12847} href="/documents" />
      <StatCard title="Pending Review" value={342} href="/reviews" />
      <StatCard title="Failed Pipeline" value={7} href="/failures" />
    </div>
  ),
};
