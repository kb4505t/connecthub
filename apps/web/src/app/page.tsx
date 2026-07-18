"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/auth-store";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.replace("/feed");
    }
  }, [user, router]);

  if (user) {
    // Redirecting to /feed — render nothing so the placeholder never flashes.
    return null;
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/20 p-6">
      <div className="glass-card max-w-md w-full p-8 text-center animate-fade-in">
        <h1 className="text-3xl font-bold tracking-tight mb-2">ConnectHub</h1>
        <p className="text-muted-foreground mb-6">A modern, premium social media platform.</p>
        <div className="flex gap-3">
          <Button asChild className="flex-1">
            <Link href="/login">Log in</Link>
          </Button>
          <Button asChild variant="outline" className="flex-1">
            <Link href="/register">Sign up</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
