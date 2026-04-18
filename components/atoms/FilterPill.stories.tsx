import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { FilterPill } from "@components/atoms/FilterPill";

const meta: Meta<typeof FilterPill> = {
  title: "Atoms/FilterPill",
  component: FilterPill,
  tags: ["autodocs"],
  argTypes: {
    label: { control: "text" },
    isActive: { control: "boolean" },
    href: { control: "text" },
    className: { control: false },
  },
  parameters: {
    backgrounds: { default: "sand" },
  },
};

export default meta;
type Story = StoryObj<typeof FilterPill>;

export const All: Story = {

  args: {
    label: "All",
    isActive: false,
    href: "/documents",
  },
};

export const Active: Story = {

  args: {
    label: "All",
    isActive: true,
    href: "/documents",
  },
};

export const Completed: Story = {

  args: {
    label: "Completed",
    isActive: true,
    href: "/documents?state=completed",
  },
};

export const Failed: Story = {

  args: {
    label: "Failed",
    isActive: false,
    href: "/documents?state=failed",
  },
};

export const UnderReview: Story = {

  args: {
    label: "Under Review",
    isActive: false,
    href: "/documents?state=under_review",
  },
};

export const AllFilters: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <FilterPill label="All" isActive={true} href="/documents" />
      <FilterPill label="Completed" isActive={false} href="/documents?state=completed" />
      <FilterPill label="Failed" isActive={false} href="/documents?state=failed" />
      <FilterPill label="Under Review" isActive={false} href="/documents?state=under_review" />
    </div>
  ),
};