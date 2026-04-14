"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export function ErrorContent() {
  const params = useSearchParams();
  const error = params.get("error");

  const errorMessages: Record<string, string> = {
    OAuthSignin: "Error starting the sign-in process.",
    OAuthCallback: "Error during the sign-in callback.",
    OAuthAccountNotLinked:
      "This email is already linked to a different sign-in method.",
    OAuthCreateAccount:
      "Could not create an account. Contact your administrator.",
    Callback: "Callback error. Please try again.",
    Default: "An unknown error occurred.",
  };

  const message = error
    ? errorMessages[error] || errorMessages.Default
    : errorMessages.Default;

  return (
    <div className="min-h-screen flex items-center justify-center bg-sand/20">
      <div className="bg-white rounded-panel shadow-md p-8 max-w-md w-full text-center">
        <div className="mb-6">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-serif font-bold text-ink mb-2">
            Sign In Error
          </h1>
          <p className="text-sm text-ink/60">{message}</p>
        </div>

        <div className="space-y-3">
          <Link
            href="/auth/signin"
            className="block w-full bg-moss text-white rounded-md px-4 py-3 text-sm font-medium hover:bg-moss/90 transition-colors text-center"
          >
            Try Again
          </Link>
          <Link
            href="/"
            className="block w-full bg-white border border-ink/20 rounded-md px-4 py-3 text-sm font-medium text-ink hover:bg-ink/5 transition-colors text-center"
          >
            Return Home
          </Link>
        </div>
      </div>
    </div>
  );
}
