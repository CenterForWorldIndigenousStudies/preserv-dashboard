"use server";

import { getBatchSummary } from "@lib/queries";

export async function getBatchSummaryAction() {
  return getBatchSummary();
}
