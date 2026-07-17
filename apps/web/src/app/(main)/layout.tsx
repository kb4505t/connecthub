"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { Navbar } from "@/components/layout/navbar";
import { useNotificationSocket } from "@/hooks/use-notification-socket";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isInitializing = useAuthStore((s) => s.isInitializing);

  useNotificationSocket();

  React.useEffect(() => {
    // AuthInitializer (root layout) has already resolved by the time this
    // mounts, so isInitializing is false here — but we still guard on it
    // defensively in case route timing ever changes.
    if (!isInitializing && !user) {
      router.replace("/login");
    }
  }, [isInitializing, user, router]);

  if (!user) return null; // avoids a flash of protected content before the redirect fires

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/10">
      <Navbar />
      <div className="container py-8">{children}</div>
    </div>
  );
}
