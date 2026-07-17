"use client";

import Link from "next/link";
import { useAuthStore } from "@/store/auth-store";
import { useLogout } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  const user = useAuthStore((s) => s.user);
  const logoutMutation = useLogout();

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/20 p-6">
      <div className="glass-card max-w-md w-full p-8 text-center animate-fade-in">
        <h1 className="text-3xl font-bold tracking-tight mb-2">ConnectHub</h1>

        {user ? (
          <>
            <p className="text-muted-foreground mb-1">
              Welcome back, <span className="font-medium text-foreground">{user.fullName ?? user.username}</span>
            </p>
            {!user.isEmailVerified && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mb-4">
                Your email isn&apos;t verified yet — check your inbox.
              </p>
            )}
            <div className="text-sm text-muted-foreground mb-6">Phase 5 complete — posts are fully wired up.</div>
            <div className="flex gap-3">
              <Button asChild className="flex-1">
                <Link href="/feed">Go to feed</Link>
              </Button>
              <Button asChild variant="outline" className="flex-1">
                <Link href={`/profile/${user.username}`}>View profile</Link>
              </Button>
            </div>
            <Button
              variant="ghost"
              className="w-full mt-2"
              onClick={() => logoutMutation.mutate()}
              isLoading={logoutMutation.isPending}
            >
              Log out
            </Button>
          </>
        ) : (
          <>
            <p className="text-muted-foreground mb-6">A modern, premium social media platform.</p>
            <div className="flex gap-3">
              <Button asChild className="flex-1">
                <Link href="/login">Log in</Link>
              </Button>
              <Button asChild variant="outline" className="flex-1">
                <Link href="/register">Sign up</Link>
              </Button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
