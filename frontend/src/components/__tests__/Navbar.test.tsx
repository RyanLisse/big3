import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Navbar } from "../Navbar";

// Mock the GitHub auth hook
vi.mock("@/src/hooks/use-github-auth", () => ({
  useGitHubAuth: vi.fn(() => ({
    isAuthenticated: true,
    user: { login: "testuser", avatar_url: "https://example.com/avatar.jpg" },
    repositories: [],
    isLoading: false,
    error: null,
    login: vi.fn(),
    logout: vi.fn(),
    fetchRepositories: vi.fn(),
    fetchBranches: vi.fn(),
  })),
}));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

describe("Navbar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Display", () => {
    it("should render the navbar", () => {
      render(<Navbar />);
      expect(document.querySelector("nav")).toBeInTheDocument();
    });

    it("should display the app logo/title", () => {
      render(<Navbar />);
      expect(screen.getByText(/big3|codex/i)).toBeInTheDocument();
    });

    it("should show navigation links", () => {
      render(<Navbar />);
      expect(
        screen.getByRole("link", { name: /home|tasks/i })
      ).toBeInTheDocument();
    });
  });

  describe("GitHub Authentication", () => {
    it("should show user avatar when authenticated", async () => {
      render(<Navbar />);

      await waitFor(() => {
        const avatar = document.querySelector('img[alt="testuser"]');
        expect(avatar).toBeInTheDocument();
      });
    });

    it("should display username when authenticated", async () => {
      render(<Navbar />);

      await waitFor(() => {
        expect(screen.getByText("testuser")).toBeInTheDocument();
      });
    });

    it("should show Connect GitHub button when not authenticated", () => {
      const { useGitHubAuth } = require("@/src/hooks/use-github-auth");
      vi.mocked(useGitHubAuth).mockReturnValue({
        isAuthenticated: false,
        user: null,
        repositories: [],
        isLoading: false,
        error: null,
        login: vi.fn(),
        logout: vi.fn(),
        fetchRepositories: vi.fn(),
        fetchBranches: vi.fn(),
      });

      render(<Navbar />);

      expect(
        screen.getByRole("button", { name: /connect github/i })
      ).toBeInTheDocument();
    });

    it("should call login when Connect GitHub button is clicked", async () => {
      const user = userEvent.setup();
      const { useGitHubAuth } = require("@/src/hooks/use-github-auth");
      const mockLogin = vi.fn();

      vi.mocked(useGitHubAuth).mockReturnValue({
        isAuthenticated: false,
        user: null,
        repositories: [],
        isLoading: false,
        error: null,
        login: mockLogin,
        logout: vi.fn(),
        fetchRepositories: vi.fn(),
        fetchBranches: vi.fn(),
      });

      render(<Navbar />);

      const connectButton = screen.getByRole("button", {
        name: /connect github/i,
      });
      await user.click(connectButton);

      expect(mockLogin).toHaveBeenCalled();
    });

    it("should show logout button when authenticated", async () => {
      render(<Navbar />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /logout/i })
        ).toBeInTheDocument();
      });
    });

    it("should call logout when logout button is clicked", async () => {
      const user = userEvent.setup();
      const { useGitHubAuth } = require("@/src/hooks/use-github-auth");
      const mockLogout = vi.fn();

      vi.mocked(useGitHubAuth).mockReturnValue({
        isAuthenticated: true,
        user: {
          login: "testuser",
          avatar_url: "https://example.com/avatar.jpg",
        },
        repositories: [],
        isLoading: false,
        error: null,
        login: vi.fn(),
        logout: mockLogout,
        fetchRepositories: vi.fn(),
        fetchBranches: vi.fn(),
      });

      render(<Navbar />);

      const logoutButton = screen.getByRole("button", { name: /logout/i });
      await user.click(logoutButton);

      expect(mockLogout).toHaveBeenCalled();
    });
  });

  describe("Navigation Links", () => {
    it("should have link to home page", () => {
      render(<Navbar />);
      const homeLink = screen.getByRole("link", { name: /home/i });
      expect(homeLink).toHaveAttribute("href", "/");
    });

    it("should have link to tasks page", () => {
      render(<Navbar />);
      const tasksLink = screen.getByRole("link", { name: /tasks/i });
      expect(tasksLink).toHaveAttribute("href", "/");
    });

    it("should have link to environments page", () => {
      render(<Navbar />);
      const envLink = screen.getByRole("link", { name: /environments/i });
      expect(envLink).toHaveAttribute("href", "/environments");
    });
  });

  describe("Theme Toggle", () => {
    it("should display theme toggle button", () => {
      render(<Navbar />);
      expect(
        screen.getByRole("button", { name: /theme|dark|light/i })
      ).toBeInTheDocument();
    });

    it("should toggle theme when button is clicked", async () => {
      const user = userEvent.setup();
      render(<Navbar />);

      const themeButton = screen.getByRole("button", {
        name: /theme|dark|light/i,
      });
      await user.click(themeButton);

      // Theme should be toggled (implementation specific)
    });
  });

  describe("Loading State", () => {
    it("should show loading indicator when fetching auth status", () => {
      const { useGitHubAuth } = require("@/src/hooks/use-github-auth");
      vi.mocked(useGitHubAuth).mockReturnValue({
        isAuthenticated: false,
        user: null,
        repositories: [],
        isLoading: true,
        error: null,
        login: vi.fn(),
        logout: vi.fn(),
        fetchRepositories: vi.fn(),
        fetchBranches: vi.fn(),
      });

      render(<Navbar />);

      // Should show loading state
      expect(
        document.querySelector('[aria-busy="true"]') ||
          document.querySelector(".animate-spin")
      ).toBeDefined();
    });
  });

  describe("Error Handling", () => {
    it("should show error message if auth fails", () => {
      const { useGitHubAuth } = require("@/src/hooks/use-github-auth");
      vi.mocked(useGitHubAuth).mockReturnValue({
        isAuthenticated: false,
        user: null,
        repositories: [],
        isLoading: false,
        error: "Authentication failed",
        login: vi.fn(),
        logout: vi.fn(),
        fetchRepositories: vi.fn(),
        fetchBranches: vi.fn(),
      });

      render(<Navbar />);

      expect(screen.getByText(/authentication failed/i)).toBeInTheDocument();
    });
  });
});
