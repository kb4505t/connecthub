"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/reports", label: "Reports" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const pathname = usePathname();

  React.useEffect(() => {
    if (user && !user.isAdmin) {
      router.replace("/feed");
    }
  }, [user, router]);

  if (!user) return null;

  if (!user.isAdmin) {
    return (
      <div className="glass-card p-10 text-center max-w-md mx-auto">
        <ShieldAlert className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
        <p className="font-medium">Admins only</p>
        <p className="text-sm text-muted-foreground mt-1">You don&apos;t have access to this area.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <ShieldAlert className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admin dashboard</h1>
          <p className="text-sm text-muted-foreground">Manage users, moderate reports, and track platform health.</p>
        </div>
      </div>

      <div className="inline-flex items-center gap-1 rounded-xl bg-secondary p-1 mb-6">
        {TABS.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              pathname === tab.href ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {children}
    </div>
  );
}
