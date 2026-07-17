"use client";

import * as React from "react";
import { ShieldBan } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FormAlert } from "@/components/ui/form-alert";
import { useBanUser } from "@/hooks/use-admin";
import { ApiError } from "@/lib/api-client";

export function BanUserDialog({ userId, username }: { userId: string; username: string }) {
  const [open, setOpen] = React.useState(false);
  const [reason, setReason] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const banMutation = useBanUser();

  const handleBan = async () => {
    setError(null);
    if (!reason.trim()) {
      setError("A reason is required so the action is auditable.");
      return;
    }
    try {
      await banMutation.mutateAsync({ userId, reason: reason.trim() });
      setOpen(false);
      setReason("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't ban this user.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10">
          <ShieldBan className="h-4 w-4" /> Ban
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ban @{username}?</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This immediately signs them out everywhere and blocks login until an admin unbans the account.
          </p>
          <div>
            <Label htmlFor="ban-reason">Reason</Label>
            <Textarea
              id="ban-reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Repeated harassment reported by multiple users"
              className="mt-1.5"
            />
          </div>
          <FormAlert message={error} />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleBan}
              isLoading={banMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:opacity-90"
            >
              Ban user
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
