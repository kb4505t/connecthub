"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { MessageSquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FormAlert } from "@/components/ui/form-alert";
import { useStartDirectConversation, useCreateGroupConversation } from "@/hooks/use-messages";
import { ApiError } from "@/lib/api-client";

export function NewConversationDialog() {
  const [open, setOpen] = React.useState(false);
  const [username, setUsername] = React.useState("");
  const [groupName, setGroupName] = React.useState("");
  const [groupUsernames, setGroupUsernames] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const router = useRouter();

  const startDirect = useStartDirectConversation();
  const createGroup = useCreateGroupConversation();

  const reset = () => {
    setUsername("");
    setGroupName("");
    setGroupUsernames("");
    setError(null);
  };

  const handleStartDirect = async () => {
    setError(null);
    try {
      const res = await startDirect.mutateAsync(username.trim());
      setOpen(false);
      reset();
      router.push(`/messages/${res.data.conversation.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't start that conversation.");
    }
  };

  const handleCreateGroup = async () => {
    setError(null);
    const usernames = groupUsernames
      .split(",")
      .map((u) => u.trim())
      .filter(Boolean);
    try {
      const res = await createGroup.mutateAsync({ name: groupName.trim(), usernames });
      setOpen(false);
      reset();
      router.push(`/messages/${res.data.conversation.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't create that group.");
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" aria-label="New conversation">
          <MessageSquarePlus className="h-4 w-4" /> New message
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New conversation</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="direct">
          <TabsList>
            <TabsTrigger value="direct">Direct message</TabsTrigger>
            <TabsTrigger value="group">Group chat</TabsTrigger>
          </TabsList>

          <TabsContent value="direct" className="space-y-4 pt-4">
            <div className="space-y-1.5">
              <Label htmlFor="dm-username">Username</Label>
              <Input
                id="dm-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. jane_doe"
              />
            </div>
            <FormAlert message={error} />
            <Button className="w-full" onClick={handleStartDirect} isLoading={startDirect.isPending} disabled={!username.trim()}>
              Start conversation
            </Button>
          </TabsContent>

          <TabsContent value="group" className="space-y-4 pt-4">
            <div className="space-y-1.5">
              <Label htmlFor="group-name">Group name</Label>
              <Input id="group-name" value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Weekend trip" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="group-usernames">Members</Label>
              <Input
                id="group-usernames"
                value={groupUsernames}
                onChange={(e) => setGroupUsernames(e.target.value)}
                placeholder="username1, username2, ..."
              />
              <p className="text-xs text-muted-foreground">Comma-separated usernames — at least 2 other members.</p>
            </div>
            <FormAlert message={error} />
            <Button
              className="w-full"
              onClick={handleCreateGroup}
              isLoading={createGroup.isPending}
              disabled={!groupName.trim() || !groupUsernames.trim()}
            >
              Create group
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
