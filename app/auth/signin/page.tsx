import { Suspense } from "react";

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

export default function SignInPage() {
  return (
    <Suspense fallback={<SignInFallback />}>
      <SignInContent />
    </Suspense>
  );
}
