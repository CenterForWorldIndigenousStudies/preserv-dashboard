import { NextResponse } from "next/server";

import { getFailures } from "@/lib/queries";

export async function GET(): Promise<NextResponse> {
  try {
    const failures = await getFailures();
    return NextResponse.json(failures);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load failures.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
