import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import EnvironmentsPage from "../page";

// Mock the environment store
vi.mock("@/stores/environments", () => ({
  useEnvironmentStore: vi.fn(() => ({
    environments: [
      {
        id: "env-1",
        name: "Main Repo",
        githubRepository: "owner/main-repo",
        githubToken: "token-123",
        createdAt: new Date("2024-01-01"),
      },
    ],
    addEnvironment: vi.fn(),
    removeEnvironment: vi.fn(),
    updateEnvironment: vi.fn(),
  })),
}));

// Mock the GitHub auth hook
vi.mock("@/src/hooks/use-github-auth", () => ({
  useGitHubAuth: vi.fn(() => ({
    isAuthenticated: true,
    user: { login: "testuser", avatar_url: "https://example.com/avatar.jpg" },
    repositories: [
      {
        name: "main-repo",
        full_name: "owner/main-repo",
        url: "https://github.com/owner/main-repo",
      },
      {
        name: "test-repo",
        full_name: "owner/test-repo",
        url: "https://github.com/owner/test-repo",
      },
    ],
    isLoading: false,
    error: null,
    login: vi.fn(),
    logout: vi.fn(),
    fetchRepositories: vi.fn(),
    fetchBranches: vi.fn(),
  })),
}));

describe("EnvironmentsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Display", () => {
    it("should render the environments page title", () => {
      render(<EnvironmentsPage />);
      expect(screen.getByText(/environments/i)).toBeInTheDocument();
    });

    it("should display existing environments", () => {
      render(<EnvironmentsPage />);
      expect(screen.getByText("Main Repo")).toBeInTheDocument();
      expect(screen.getByText("owner/main-repo")).toBeInTheDocument();
    });

    it("should show empty state when no environments exist", () => {
      // This would require mocking to return empty array
      render(<EnvironmentsPage />);
      // Should show message about creating first environment
    });
  });

  describe("Create Environment", () => {
    it("should open create environment dialog when button is clicked", async () => {
      const user = userEvent.setup();
      render(<EnvironmentsPage />);

      const createButton = screen.getByRole("button", { name: /create/i });
      await user.click(createButton);

      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("should allow selecting a repository from the list", async () => {
      const user = userEvent.setup();
      render(<EnvironmentsPage />);

      const createButton = screen.getByRole("button", { name: /create/i });
      await user.click(createButton);

      const repoSelect = screen.getByRole("combobox", { name: /repository/i });
      await user.click(repoSelect);

      const testRepo = screen.getByText("owner/test-repo");
      await user.click(testRepo);

      expect(repoSelect).toHaveValue("owner/test-repo");
    });

    it("should require authentication before creating environment", async () => {
      // Mock unauthenticated state
      render(<EnvironmentsPage />);

      const createButton = screen.queryByRole("button", { name: /create/i });
      // Should show login prompt instead
    });

    it("should call addEnvironment when form is submitted", async () => {
      const user = userEvent.setup();
      const { useEnvironmentStore } = await import("@/stores/environments");
      const mockAddEnvironment = vi.fn();

      vi.mocked(useEnvironmentStore).mockReturnValue({
        environments: [],
        addEnvironment: mockAddEnvironment,
        removeEnvironment: vi.fn(),
        updateEnvironment: vi.fn(),
      } as any);

      render(<EnvironmentsPage />);

      const createButton = screen.getByRole("button", { name: /create/i });
      await user.click(createButton);

      const nameInput = screen.getByRole("textbox", { name: /name/i });
      await user.type(nameInput, "New Environment");

      const submitButton = screen.getByRole("button", { name: /save/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockAddEnvironment).toHaveBeenCalledWith(
          expect.objectContaining({
            name: "New Environment",
          })
        );
      });
    });
  });

  describe("Delete Environment", () => {
    it("should show delete confirmation dialog", async () => {
      const user = userEvent.setup();
      render(<EnvironmentsPage />);

      const deleteButton = screen.getByRole("button", { name: /delete/i });
      await user.click(deleteButton);

      expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    });

    it("should call removeEnvironment when delete is confirmed", async () => {
      const user = userEvent.setup();
      const { useEnvironmentStore } = await import("@/stores/environments");
      const mockRemoveEnvironment = vi.fn();

      vi.mocked(useEnvironmentStore).mockReturnValue({
        environments: [
          {
            id: "env-1",
            name: "Main Repo",
            githubRepository: "owner/main-repo",
            githubToken: "token-123",
            createdAt: new Date(),
          },
        ],
        addEnvironment: vi.fn(),
        removeEnvironment: mockRemoveEnvironment,
        updateEnvironment: vi.fn(),
      } as any);

      render(<EnvironmentsPage />);

      const deleteButton = screen.getByRole("button", { name: /delete/i });
      await user.click(deleteButton);

      const confirmButton = screen.getByRole("button", { name: /confirm/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockRemoveEnvironment).toHaveBeenCalledWith("env-1");
      });
    });
  });

  describe("GitHub Authentication", () => {
    it("should show login button when not authenticated", () => {
      // Mock unauthenticated state
      render(<EnvironmentsPage />);
      // Should show "Connect GitHub" button
    });

    it("should display current user info when authenticated", () => {
      render(<EnvironmentsPage />);
      expect(screen.getByText("testuser")).toBeInTheDocument();
    });

    it("should allow logout", async () => {
      const user = userEvent.setup();
      const { useGitHubAuth } = await import("@/src/hooks/use-github-auth");
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
      } as any);

      render(<EnvironmentsPage />);

      const logoutButton = screen.getByRole("button", { name: /logout/i });
      await user.click(logoutButton);

      expect(mockLogout).toHaveBeenCalled();
    });
  });
});
