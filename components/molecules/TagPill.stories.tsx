import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { TagPill } from "@components/molecules/TagPill";

const meta: Meta<typeof TagPill> = {
  title: "Molecules/TagPill",
  component: TagPill,
  tags: ["autodocs"],
  argTypes: {
    tag: { control: "text" },
    onRemove: { action: "removed" },
    className: { control: false },
  },
  parameters: {
    backgrounds: { default: "sand" },
  },
};

export default meta;
type Story = StoryObj<typeof TagPill>;

export const Default: Story = {
  args: {
    tag: "Cherokee Language",
    onRemove: () => {},
  },
};

export const CulturalArchive: Story = {
  name: "Cultural Archive",
  args: {
    tag: "Cultural Archive",
    onRemove: () => {},
  },
};

export const OralHistory: Story = {
  name: "Oral History",
  args: {
    tag: "Oral History",
    onRemove: () => {},
  },
};

export const LegalTreaty: Story = {
  name: "Legal Treaty",
  args: {
    tag: "Legal Treaty",
    onRemove: () => {},
  },
};

export const MultipleTags: Story = {
  name: "Multiple Tags",
  render: () => (
    <div className="flex flex-wrap gap-2">
      <TagPill tag="Cherokee Language" onRemove={() => {}} />
      <TagPill tag="Cultural Archive" onRemove={() => {}} />
      <TagPill tag="Oral History" onRemove={() => {}} />
    </div>
  ),
};