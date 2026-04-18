import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

export function GET() {
  const filePath = join(
    process.cwd(),
    "public/developers/component-library/index.html"
  );
  const html = readFileSync(filePath, "utf-8");
  return new NextResponse(html, {
    headers: { "Content-Type": "text/html" },
  });
}
