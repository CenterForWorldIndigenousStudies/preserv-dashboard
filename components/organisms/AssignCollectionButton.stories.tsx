import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AssignCollectionButton } from "@components/organisms/AssignCollectionButton";

const meta: Meta<typeof AssignCollectionButton> = {
  title: "Organisms/AssignCollectionButton",
  component: AssignCollectionButton,
  tags: ["autodocs"],
  argTypes: {
    documentId: { control: "text" },
    currentTags: { control: false },
  },
  parameters: {
    backgrounds: { default: "sand" },
    layout: "centered",
  },
};

export default meta;
type Story = StoryObj<typeof AssignCollectionButton>;

export const Default: Story = {

  args: {
    documentId: "DOC-2024-0042",
    currentTags: [],
  },
};

export const WithTags: Story = {

  args: {
    documentId: "DOC-2024-0018",
    currentTags: ["Cherokee Language", "Oral History"],
  },
};

export const MultipleTags: Story = {

  args: {
    documentId: "DOC-2024-0031",
    currentTags: ["Cultural Archive", "Legal Treaty", "Oral History"],
  },
};