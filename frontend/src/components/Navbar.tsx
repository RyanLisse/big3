"use client";

import { Moon, Sun, LogOut, Github } from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { Button } from "@/src/components/ui/button";
import { useGitHubAuth } from "@/src/hooks/use-github-auth";

export function Navbar() {
  const { theme, setTheme } = useTheme();
  const { isAuthenticated, user, login, logout, isLoading, error } = useGitHubAuth();

  return (
    <nav className="border-b bg-card sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-bold text-lg">
            <span className="text-primary">Big3</span>
            <span className="text-muted-foreground">Codex</span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-6">
            <Link
              href="/"
              className="text-sm font-medium hover:text-primary transition"
            >
              Tasks
            </Link>
            <Link
              href="/environments"
              className="text-sm font-medium hover:text-primary transition"
            >
              Environments
            </Link>
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-4">
            {/* GitHub Auth */}
            {isLoading ? (
              <div className="animate-spin">
                <Github className="w-4 h-4" />
              </div>
            ) : isAuthenticated && user ? (
              <div className="flex items-center gap-3">
                {user.avatar_url && (
                  <img
                    src={user.avatar_url}
                    alt={user.login}
                    className="w-8 h-8 rounded-full"
                  />
                )}
                <span className="text-sm font-medium hidden sm:inline">
                  {user.login}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={logout}
                  className="gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Logout</span>
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={login}
                className="gap-2"
              >
                <Github className="w-4 h-4" />
                <span className="hidden sm:inline">Connect GitHub</span>
              </Button>
            )}

            {/* Error Message */}
            {error && (
              <div className="text-xs text-destructive">
                {error}
              </div>
            )}

            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="w-9 h-9"
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
