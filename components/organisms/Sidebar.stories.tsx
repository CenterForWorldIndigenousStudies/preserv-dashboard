import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import Sidebar, { type SidebarVariant } from "@components/organisms/Sidebar";

const meta: Meta<typeof Sidebar> = {
  title: "Organisms/Sidebar",
  component: Sidebar,
  tags: ["autodocs"],
  argTypes: {
    variant: { control: "select", options: ["desktop", "mobile"] },
    isOpen: { control: "boolean" },
    onClose: { action: "closed" },
  },
  parameters: {
    backgrounds: { default: "sand" },
    layout: "fullscreen",
  },
};

export default meta;
type Story = StoryObj<typeof Sidebar>;

export const Desktop: Story = {
  args: {
    variant: "desktop" as SidebarVariant,
    isOpen: true,
    onClose: () => {},
  },
};

export const MobileOpen: Story = {
  args: {
    variant: "mobile" as SidebarVariant,
    isOpen: true,
    onClose: () => {},
  },
};

export const MobileClosed: Story = {
  args: {
    variant: "mobile" as SidebarVariant,
    isOpen: false,
    onClose: () => {},
  },
};