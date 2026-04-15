"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";

export default function AuthStatus() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <span className="text-xs text-ink/40 animate-pulse">Loading...</span>
    );
  }

  if (status === "unauthenticated") {
    return (
      <Link
        href="/auth/signin"
        className="rounded-full bg-moss px-4 py-2 text-sm text-white hover:bg-moss/90"
      >
        Sign In
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-ink/60">
        {session?.user?.email}
      </span>
      <button
        onClick={() => signOut({ redirectTo: "/auth/signin" })}
        className="rounded-full bg-ink/10 px-4 py-2 text-sm text-ink hover:bg-ink/20"
      >
        Sign Out
      </button>
    </div>
  );
}
