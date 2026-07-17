"use client";

import { Suspense, useEffect, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useVerifyEmail } from "@/hooks/use-auth";
import { ApiError } from "@/lib/api-client";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const verifyEmailMutation = useVerifyEmail();
  const hasSubmitted = useRef(false);

  useEffect(() => {
    if (token && !hasSubmitted.current) {
      hasSubmitted.current = true;
      verifyEmailMutation.mutate(token);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (!token) {
    return (
      <div className="text-center">
        <h2 className="text-lg font-semibold mb-2">Missing verification link</h2>
        <p className="text-sm text-muted-foreground">This link is missing its token. Please use the link from your email.</p>
      </div>
    );
  }

  if (verifyEmailMutation.isPending || verifyEmailMutation.isIdle) {
    return (
      <div className="text-center">
        <div className="h-6 w-6 mx-auto mb-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="text-sm text-muted-foreground">Verifying your email…</p>
      </div>
    );
  }

  if (verifyEmailMutation.isSuccess) {
    return (
      <div className="text-center">
        <h2 className="text-lg font-semibold mb-2">Email verified 🎉</h2>
        <p className="text-sm text-muted-foreground mb-6">Your address is confirmed. You&apos;re all set.</p>
        <Link href="/" className="text-sm text-primary hover:underline">
          Go to ConnectHub
        </Link>
      </div>
    );
  }

  const message =
    verifyEmailMutation.error instanceof ApiError ? verifyEmailMutation.error.message : "Something went wrong.";

  return (
    <div className="text-center">
      <h2 className="text-lg font-semibold mb-2">Verification failed</h2>
      <p className="text-sm text-muted-foreground mb-6">{message}</p>
      <Link href="/login" className="text-sm text-primary hover:underline">
        Back to login
      </Link>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailContent />
    </Suspense>
  );
}
