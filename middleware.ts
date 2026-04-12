import { auth } from "@/auth";

export const runtime = "nodejs";

export default auth;

export const config = {
  matcher: ["/((?!auth/|api/auth|_next/static|_next/image|favicon.ico).*)"],
};
