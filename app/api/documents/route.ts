import { NextRequest, NextResponse } from "next/server";

import { getDocuments } from "@lib/queries";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = Number(searchParams.get("page") ?? "1");
    const state = searchParams.get("state") ?? undefined;

    const documents = await getDocuments({
      page,
      state,
    });

    return NextResponse.json(documents);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load documents.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
