import { redirect } from "next/navigation";
import { Suspense } from "react";

import { auth } from "@root/auth";

import { SignInContent } from "./SignInContent";

export const dynamic = "force-dynamic";

function SignInFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-sand/20">
      <div className="bg-white rounded-panel shadow-md p-8 text-center">
        <p className="text-ink/60">Loading...</p>
      </div>
    </div>
  );
}

export default async function SignInPage() {
  const session = await auth();

  if (session) {
    redirect("/");
  }

  return (
    <Suspense fallback={<SignInFallback />}>
      <SignInContent />
    </Suspense>
  );
}
