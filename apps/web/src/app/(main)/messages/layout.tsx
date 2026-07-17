"use client";

import { useMessageSocket } from "@/hooks/use-message-socket";

export default function MessagesLayout({ children }: { children: React.ReactNode }) {
  useMessageSocket();
  return <>{children}</>;
}
