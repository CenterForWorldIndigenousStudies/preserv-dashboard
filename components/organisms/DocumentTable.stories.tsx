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
    created_at: "2024-11-04T14:22:11Z",
    updated_at: "2024-11-04T16:30:00Z",
    file_folder_url: "https://drive.cwis.org/preservation/cherokee/phonetics/",
    original_parent_folder: null,
    parent_id: null,
    duplicates: [],
    collection_tags: ["Cherokee Language", "Oral History"],
    state: "completed",
    ingested_at: "2024-11-04T16:30:00Z",
    is_primary: true,
    drive_file_id: "1a2b3c4d5e6f",
  },
  {
    id: "DOC-2024-0031",
    filename: "tribal-council-minutes-2023-Q1.pdf",
    filesize: 890000,
    filetype: "application/pdf",
    original_url: "https://archive.cwis.org/legal/council/minutes/2023-Q1.pdf",
    created_at: "2024-11-05T09:15:33Z",
    updated_at: "2024-11-05T10:00:00Z",
    file_folder_url: "https://drive.cwis.org/preservation/legal/",
    original_parent_folder: null,
    parent_id: null,
    duplicates: [],
    collection_tags: ["Legal Treaty"],
    state: "under_review",
    ingested_at: "2024-11-05T10:00:00Z",
    is_primary: true,
    drive_file_id: "7g8h9i0j1k2l",
  },
  {
    id: "DOC-2024-0037",
    filename: "cultural-ceremony-archive-archive.mp3",
    filesize: 142000000,
    filetype: "audio/mpeg",
    original_url: "https://archive.cwis.org/cultural/ceremonies/2023/video-archive.mp3",
    created_at: "2024-11-06T11:05:00Z",
    updated_at: null,
    file_folder_url: "https://drive.cwis.org/preservation/cultural/",
    original_parent_folder: null,
    parent_id: null,
    duplicates: [],
    collection_tags: ["Cultural Archive"],
    state: "failed",
    ingested_at: null,
    is_primary: false,
    drive_file_id: null,
  },
  {
    id: "DOC-2024-0042",
    filename: "indigenous-land-map-1920.jpg",
    filesize: 4500000,
    filetype: "image/jpeg",
    original_url: "https://archive.cwis.org/maps/land/1920.jpg",
    created_at: "2024-11-06T15:30:00Z",
    updated_at: "2024-11-06T15:30:00Z",
    file_folder_url: "https://drive.cwis.org/preservation/maps/",
    original_parent_folder: null,
    parent_id: null,
    duplicates: [],
    collection_tags: ["Maps"],
    state: "ingested",
    ingested_at: "2024-11-06T15:30:00Z",
    is_primary: true,
    drive_file_id: "3m4n5o6p7q8r",
  },
  {
    id: "DOC-2024-0049",
    filename: "traditional-medicine-notes.docx",
    filesize: 220000,
    filetype: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    original_url: "https://archive.cwis.org/health/traditional-medicine/notes.docx",
    created_at: "2024-11-07T08:45:22Z",
    updated_at: "2024-11-07T08:45:22Z",
    file_folder_url: "https://drive.cwis.org/preservation/health/",
    original_parent_folder: null,
    parent_id: null,
    duplicates: [],
    collection_tags: ["Health", "Traditional Medicine"],
    state: "normalized",
    ingested_at: "2024-11-07T09:10:00Z",
    is_primary: true,
    drive_file_id: "9s0t1u2v3w4x",
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