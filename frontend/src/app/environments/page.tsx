"use client";

import { useState } from "react";
import { Plus, Trash2, LogOut } from "lucide-react";
import { useEnvironmentStore } from "@/stores/environments";
import { useGitHubAuth } from "@/src/hooks/use-github-auth";
import { Button } from "@/src/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/src/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/src/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import { Input } from "@/src/components/ui/input";

export default function EnvironmentsPage() {
  const { environments, addEnvironment, removeEnvironment } = useEnvironmentStore();
  const { isAuthenticated, user, repositories, login, logout } = useGitHubAuth();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedEnvId, setSelectedEnvId] = useState<string | null>(null);
  const [envName, setEnvName] = useState("");
  const [selectedRepo, setSelectedRepo] = useState("");

  const handleCreateEnvironment = () => {
    if (!envName || !selectedRepo) return;

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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold">Connect GitHub</h1>
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
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Environments</h1>
            <p className="text-muted-foreground">
              Manage your GitHub repository configurations
            </p>
          </div>
          <div className="flex items-center gap-4">
            {user && (
              <div className="flex items-center gap-2">
                {user.avatar_url && (
                  <img
                    src={user.avatar_url}
                    alt={user.login}
                    className="w-8 h-8 rounded-full"
                  />
                )}
                <span className="text-sm font-medium">{user.login}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={logout}
                  className="ml-2"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Create Environment Dialog */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="mb-8">
              <Plus className="w-4 h-4 mr-2" />
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
                <label className="text-sm font-medium">Environment Name</label>
                <Input
                  placeholder="e.g., Main Project"
                  value={envName}
                  onChange={(e) => setEnvName(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Repository</label>
                <Select value={selectedRepo} onValueChange={setSelectedRepo}>
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
                  variant="outline"
                  onClick={() => setIsCreateOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateEnvironment}
                  disabled={!envName || !selectedRepo}
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
            <div className="text-center py-12 border rounded-lg border-dashed">
              <p className="text-muted-foreground">
                No environments yet. Create one to get started!
              </p>
            </div>
          ) : (
            environments.map((env) => (
              <div
                key={env.id}
                className="border rounded-lg p-4 flex items-center justify-between bg-card hover:bg-card/80 transition"
              >
                <div>
                  <h3 className="font-semibold">{env.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {env.githubRepository}
                  </p>
                  {env.createdAt && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Created {new Date(env.createdAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <AlertDialog open={isDeleteOpen && selectedEnvId === env.id} onOpenChange={setIsDeleteOpen}>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      setSelectedEnvId(env.id);
                      setIsDeleteOpen(true);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Environment</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete "{env.name}"? This action
                        cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="flex justify-end gap-2">
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDeleteEnvironment(env.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
