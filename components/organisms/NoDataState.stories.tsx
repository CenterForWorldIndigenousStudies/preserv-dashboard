import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NoDataState } from "@components/organisms/NoDataState";

const meta: Meta<typeof NoDataState> = {
  title: "Organisms/NoDataState",
  component: NoDataState,
  tags: ["autodocs"],
  argTypes: {
    title: {
      control: "text",
      description: "Optional title override (defaults to 'No Data')",
    },
    message: {
      control: "text",
      description: "Descriptive message shown below the title",
    },
  },
  args: {
    title: "No Data",
    message:
      "There are no documents in the queue at this time. Check back later or adjust your filters.",
  },
  parameters: {
    backgrounds: {
      default: "sand",
    },
  },
};

export default meta;
type Story = StoryObj<typeof NoDataState>;

export const Default: Story = {};

export const NoDocumentsFound: Story = {
  args: {
    title: "No Documents Found",
    message:
      "No documents matched your search criteria. Try adjusting your filters or search query.",
  },
};

export const NoFailures: Story = {
  args: {
    title: "Pipeline Healthy",
    message:
      "No pipeline failures detected. All documents are processing normally.",
  },
};

export const EmptyCollection: Story = {
  args: {
    title: "Collection Empty",
    message:
      "This collection has no documents yet. Upload documents to get started with preservation.",
  },
};
