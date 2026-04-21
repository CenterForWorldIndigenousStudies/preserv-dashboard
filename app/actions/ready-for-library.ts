"use server";

import { getReadyForLibraryDocuments } from "@lib/queries";

export async function getReadyForLibraryAction() {
  return getReadyForLibraryDocuments();
}
