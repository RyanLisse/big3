"use client";

import { LogOut, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGitHubAuth } from "@/src/hooks/use-github-auth";
import { useEnvironmentStore } from "@/stores/environments";

export default function EnvironmentsPage() {
  const { environments, addEnvironment, removeEnvironment } =
    useEnvironmentStore();
  const { isAuthenticated, user, repositories, login, logout } =
    useGitHubAuth();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedEnvId, setSelectedEnvId] = useState<string | null>(null);
  const [envName, setEnvName] = useState("");
  const [selectedRepo, setSelectedRepo] = useState("");

  const handleCreateEnvironment = () => {
    if (!(envName && selectedRepo)) return;

    addEnvironment({
      id: `env-${Date.now()}`,
      name: envName,
      githubRepository: selectedRepo,
      githubToken: "", // Token is stored in cookies
      createdAt: new Date(),
    });

    setEnvName("");
    setSelectedRepo("");
    setIsCreateOpen(false);
  };

  const handleDeleteEnvironment = (envId: string) => {
    removeEnvironment(envId);
    setIsDeleteOpen(false);
    setSelectedEnvId(null);
  };

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="space-y-4 text-center">
          <h1 className="font-bold text-4xl">Connect GitHub</h1>
          <p className="text-muted-foreground">
            You need to authenticate with GitHub to create environments.
          </p>
          <Button onClick={login} size="lg">
            Connect GitHub
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="mb-2 font-bold text-4xl">Environments</h1>
            <p className="text-muted-foreground">
              Manage your GitHub repository configurations
            </p>
          </div>
          <div className="flex items-center gap-4">
            {user && (
              <div className="flex items-center gap-2">
                {user.avatar_url && (
                  <img
                    alt={user.login}
                    className="h-8 w-8 rounded-full"
                    src={user.avatar_url}
                  />
                )}
                <span className="font-medium text-sm">{user.login}</span>
                <Button
                  className="ml-2"
                  onClick={logout}
                  size="sm"
                  variant="outline"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Create Environment Dialog */}
        <Dialog onOpenChange={setIsCreateOpen} open={isCreateOpen}>
          <DialogTrigger asChild>
            <Button className="mb-8">
              <Plus className="mr-2 h-4 w-4" />
              Create Environment
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Environment</DialogTitle>
              <DialogDescription>
                Set up a new GitHub repository environment for your tasks.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="font-medium text-sm">Environment Name</label>
                <Input
                  className="mt-1"
                  onChange={(e) => setEnvName(e.target.value)}
                  placeholder="e.g., Main Project"
                  value={envName}
                />
              </div>
              <div>
                <label className="font-medium text-sm">Repository</label>
                <Select onValueChange={setSelectedRepo} value={selectedRepo}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select a repository" />
                  </SelectTrigger>
                  <SelectContent>
                    {repositories.map((repo) => (
                      <SelectItem key={repo.full_name} value={repo.full_name}>
                        {repo.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  onClick={() => setIsCreateOpen(false)}
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button
                  disabled={!(envName && selectedRepo)}
                  onClick={handleCreateEnvironment}
                >
                  Save Environment
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Environments List */}
        <div className="space-y-4">
          {environments.length === 0 ? (
            <div className="rounded-lg border border-dashed py-12 text-center">
              <p className="text-muted-foreground">
                No environments yet. Create one to get started!
              </p>
            </div>
          ) : (
            environments.map((env) => (
              <div
                className="flex items-center justify-between rounded-lg border bg-card p-4 transition hover:bg-card/80"
                key={env.id}
              >
                <div>
                  <h3 className="font-semibold">{env.name}</h3>
                  <p className="text-muted-foreground text-sm">
                    {env.githubRepository}
                  </p>
                  {env.createdAt && (
                    <p className="mt-1 text-muted-foreground text-xs">
                      Created {new Date(env.createdAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <AlertDialog
                  onOpenChange={setIsDeleteOpen}
                  open={isDeleteOpen && selectedEnvId === env.id}
                >
                  <Button
                    onClick={() => {
                      setSelectedEnvId(env.id);
                      setIsDeleteOpen(true);
                    }}
                    size="icon"
                    variant="outline"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Environment</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete "{env.name}"? This
                        action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="flex justify-end gap-2">
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={() => handleDeleteEnvironment(env.id)}
                      >
                        Delete
                      </AlertDialogAction>
                    </div>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
