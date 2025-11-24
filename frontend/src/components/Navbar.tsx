"use client";

import { Github, LogOut, Moon, Sun } from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { useGitHubAuth } from "@/src/hooks/use-github-auth";

export function Navbar() {
  const { theme, setTheme } = useTheme();
  const { isAuthenticated, user, login, logout, isLoading, error } =
    useGitHubAuth();

  return (
    <nav className="sticky top-0 z-50 border-b bg-card">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link className="flex items-center gap-2 font-bold text-lg" href="/">
            <span className="text-primary">Big3</span>
            <span className="text-muted-foreground">Codex</span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden items-center gap-6 md:flex">
            <Link
              className="font-medium text-sm transition hover:text-primary"
              href="/"
            >
              Tasks
            </Link>
            <Link
              className="font-medium text-sm transition hover:text-primary"
              href="/environments"
            >
              Environments
            </Link>
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-4">
            {/* GitHub Auth */}
            {isLoading ? (
              <div className="animate-spin">
                <Github className="h-4 w-4" />
              </div>
            ) : isAuthenticated && user ? (
              <div className="flex items-center gap-3">
                {user.avatar_url && (
                  <img
                    alt={user.login}
                    className="h-8 w-8 rounded-full"
                    src={user.avatar_url}
                  />
                )}
                <span className="hidden font-medium text-sm sm:inline">
                  {user.login}
                </span>
                <Button
                  className="gap-2"
                  onClick={logout}
                  size="sm"
                  variant="ghost"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Logout</span>
                </Button>
              </div>
            ) : (
              <Button
                className="gap-2"
                onClick={login}
                size="sm"
                variant="outline"
              >
                <Github className="h-4 w-4" />
                <span className="hidden sm:inline">Connect GitHub</span>
              </Button>
            )}

            {/* Error Message */}
            {error && <div className="text-destructive text-xs">{error}</div>}

            {/* Theme Toggle */}
            <Button
              className="h-9 w-9"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              size="icon"
              variant="ghost"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
