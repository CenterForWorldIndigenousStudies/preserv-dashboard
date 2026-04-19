import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { DocumentTable } from "@components/organisms/DocumentTable";
import type { Document } from "@lib/types";

const meta: Meta<typeof DocumentTable> = {
  title: "Organisms/DocumentTable",
  component: DocumentTable,
  tags: ["autodocs"],
  argTypes: {
    documents: { control: false },
  },
  parameters: {
    backgrounds: { default: "sand" },
  },
};

export default meta;
type Story = StoryObj<typeof DocumentTable>;

const mockDocuments: Document[] = [
  {
    id: "DOC-2024-0018",
    filename: "cherokee-phonetics-session042.pdf",
    filesize: 2456000,
    filetype: "application/pdf",
    original_url: "https://archive.cwis.org/cherokee/phonetics/session042.pdf",
    source_id: "SRC-001",
    hash_binary: "abc123",
    hash_content: "def456",
    created_at: "2024-11-04T14:22:11Z",
    updated_at: "2024-11-04T16:30:00Z",
  },
  {
    id: "DOC-2024-0031",
    filename: "tribal-council-minutes-2023-Q1.pdf",
    filesize: 890000,
    filetype: "application/pdf",
    original_url: "https://archive.cwis.org/legal/council/minutes/2023-Q1.pdf",
    source_id: "SRC-002",
    hash_binary: "ghi789",
    hash_content: "jkl012",
    created_at: "2024-11-05T09:15:33Z",
    updated_at: "2024-11-05T10:00:00Z",
  },
  {
    id: "DOC-2024-0037",
    filename: "cultural-ceremony-archive-archive.mp3",
    filesize: 142000000,
    filetype: "audio/mpeg",
    original_url: "https://archive.cwis.org/cultural/ceremonies/2023/video-archive.mp3",
    source_id: "SRC-003",
    hash_binary: "mno345",
    hash_content: "pqr678",
    created_at: "2024-11-06T11:05:00Z",
    updated_at: null,
  },
  {
    id: "DOC-2024-0042",
    filename: "indigenous-land-map-1920.jpg",
    filesize: 4500000,
    filetype: "image/jpeg",
    original_url: "https://archive.cwis.org/maps/land/1920.jpg",
    source_id: "SRC-004",
    hash_binary: "stu901",
    hash_content: "vwx234",
    created_at: "2024-11-06T15:30:00Z",
    updated_at: "2024-11-06T15:30:00Z",
  },
  {
    id: "DOC-2024-0049",
    filename: "traditional-medicine-notes.docx",
    filesize: 220000,
    filetype: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    original_url: "https://archive.cwis.org/health/traditional-medicine/notes.docx",
    source_id: "SRC-005",
    hash_binary: "yza567",
    hash_content: "bcd890",
    created_at: "2024-11-07T08:45:22Z",
    updated_at: "2024-11-07T08:45:22Z",
  },
];

export const Default: Story = {

  args: {
    documents: mockDocuments,
  },
};

export const SingleRow: Story = {

  args: {
    documents: [mockDocuments[0]],
  },
};

export const Empty: Story = {

  args: {
    documents: [],
  },
};