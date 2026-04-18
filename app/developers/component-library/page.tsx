"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function ComponentLibraryPage() {
  const { status } = useSession();
  const router = useRouter();
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/auth/signin?callbackUrl=/developers/component-library");
      return;
    }
    if (status !== "authenticated") return;

    // Point iframe directly to the static Storybook index
    // The page route /developers/component-library/ takes precedence over public/ static files,
    // so Storybook is served from a separate path with no page route
    setSrc("/developers/storybook/index.html");
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-ink/60">Loading component library...</p>
      </div>
    );
  }

  if (!src) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-ink/60">Loading component library...</p>
      </div>
    );
  }

  return (
    <div className="-m-6 -mt-4 h-[calc(100vh-8rem)]">
      <iframe
        src={src}
        title="Storybook Component Library"
        className="h-full w-full border-0"
        // Allow sandbox while keeping necessary permissions
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      />
    </div>
  );
}
