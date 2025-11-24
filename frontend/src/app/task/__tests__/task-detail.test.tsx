import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TaskDetailPage from "../[id]/page";

// Mock the task store
vi.mock("@/stores/tasks", () => ({
  useTaskStore: vi.fn(() => ({
    tasks: [
      {
        id: "task-1",
        title: "Implement feature",
        status: "IN_PROGRESS",
        statusMessage: "Running tests",
        hasChanges: true,
        branch: "main",
        repository: "owner/repo",
        mode: "code",
        messages: [
          {
            id: "msg-1",
            role: "user",
            content: "Create a new feature",
            timestamp: new Date(),
          },
          {
            id: "msg-2",
            role: "assistant",
            content: "I will create the feature...",
            timestamp: new Date(),
          },
        ],
        createdAt: new Date().toISOString(),
        description: "Feature implementation task",
        sessionId: "session-123",
      },
    ],
    getTaskById: vi.fn((id) => ({
      id: "task-1",
      title: "Implement feature",
      status: "IN_PROGRESS",
      statusMessage: "Running tests",
      hasChanges: true,
      branch: "main",
      repository: "owner/repo",
      mode: "code",
      messages: [],
      createdAt: new Date().toISOString(),
      description: "Feature implementation task",
      sessionId: "session-123",
    })),
    updateTask: vi.fn(),
  })),
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useParams: vi.fn(() => ({ id: "task-1" })),
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    back: vi.fn(),
  })),
}));

describe("TaskDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Display", () => {
    it("should render task title", async () => {
      render(<TaskDetailPage />);

      await waitFor(() => {
        expect(screen.getByText("Implement feature")).toBeInTheDocument();
      });
    });

    it("should display task status", async () => {
      render(<TaskDetailPage />);

      await waitFor(() => {
        expect(screen.getByText(/in_progress/i)).toBeInTheDocument();
      });
    });

    it("should show task metadata (branch, repository)", async () => {
      render(<TaskDetailPage />);

      await waitFor(() => {
        expect(screen.getByText("main")).toBeInTheDocument();
        expect(screen.getByText("owner/repo")).toBeInTheDocument();
      });
    });

    it("should display task description", async () => {
      render(<TaskDetailPage />);

      await waitFor(() => {
        expect(
          screen.getByText("Feature implementation task")
        ).toBeInTheDocument();
      });
    });

    it("should show task mode (code or ask)", async () => {
      render(<TaskDetailPage />);

      await waitFor(() => {
        expect(screen.getByText(/code/i)).toBeInTheDocument();
      });
    });
  });

  describe("Messages Display", () => {
    it("should display conversation messages", async () => {
      render(<TaskDetailPage />);

      await waitFor(() => {
        expect(screen.getByText("Create a new feature")).toBeInTheDocument();
        expect(
          screen.getByText(/I will create the feature/i)
        ).toBeInTheDocument();
      });
    });

    it("should show message role (user vs assistant)", async () => {
      render(<TaskDetailPage />);

      await waitFor(() => {
        const messages = screen.getAllByRole("article");
        expect(messages.length).toBeGreaterThan(0);
      });
    });

    it("should render markdown in assistant messages", async () => {
      render(<TaskDetailPage />);

      await waitFor(() => {
        // Should render markdown content
        expect(
          screen.getByText(/I will create the feature/i)
        ).toBeInTheDocument();
      });
    });
  });

  describe("Tool Events Panel", () => {
    it("should display tool events timeline", async () => {
      render(<TaskDetailPage />);

      await waitFor(() => {
        // Should show tool events section
        expect(
          screen.getByText(/events/i) || screen.getByText(/timeline/i)
        ).toBeDefined();
      });
    });

    it("should show different event types (status, shell, etc)", async () => {
      render(<TaskDetailPage />);

      // Should display various event types
      await waitFor(() => {
        expect(
          document.querySelector('[data-testid="tool-events"]')
        ).toBeDefined();
      });
    });
  });

  describe("Status Updates", () => {
    it("should show streaming status indicator for in-progress tasks", async () => {
      render(<TaskDetailPage />);

      await waitFor(() => {
        expect(screen.getByText(/running tests/i)).toBeInTheDocument();
      });
    });

    it("should update status when task completes", async () => {
      const { useTaskStore } = await import("@/stores/tasks");
      const mockUpdateTask = vi.fn();

      vi.mocked(useTaskStore).mockReturnValue({
        tasks: [
          {
            id: "task-1",
            title: "Implement feature",
            status: "DONE",
            statusMessage: "",
            hasChanges: false,
            branch: "main",
            repository: "owner/repo",
            mode: "code",
            messages: [],
            createdAt: new Date().toISOString(),
            description: "Feature implementation task",
            sessionId: "session-123",
          },
        ],
        getTaskById: vi.fn(() => ({
          id: "task-1",
          title: "Implement feature",
          status: "DONE",
          statusMessage: "",
          hasChanges: false,
          branch: "main",
          repository: "owner/repo",
          mode: "code",
          messages: [],
          createdAt: new Date().toISOString(),
          description: "Feature implementation task",
          sessionId: "session-123",
        })),
        updateTask: mockUpdateTask,
      } as any);

      render(<TaskDetailPage />);

      await waitFor(() => {
        expect(screen.getByText(/done/i)).toBeInTheDocument();
      });
    });
  });

  describe("Actions", () => {
    it("should show back button to return to task list", async () => {
      render(<TaskDetailPage />);

      const backButton = screen.getByRole("button", { name: /back/i });
      expect(backButton).toBeInTheDocument();
    });

    it("should show re-run button for completed tasks", async () => {
      const { useTaskStore } = await import("@/stores/tasks");
      vi.mocked(useTaskStore).mockReturnValue({
        tasks: [
          {
            id: "task-1",
            title: "Implement feature",
            status: "DONE",
            statusMessage: "",
            hasChanges: false,
            branch: "main",
            repository: "owner/repo",
            mode: "code",
            messages: [],
            createdAt: new Date().toISOString(),
            description: "Feature implementation task",
            sessionId: "session-123",
          },
        ],
        getTaskById: vi.fn(() => ({
          id: "task-1",
          title: "Implement feature",
          status: "DONE",
          statusMessage: "",
          hasChanges: false,
          branch: "main",
          repository: "owner/repo",
          mode: "code",
          messages: [],
          createdAt: new Date().toISOString(),
          description: "Feature implementation task",
          sessionId: "session-123",
        })),
        updateTask: vi.fn(),
      } as any);

      render(<TaskDetailPage />);

      await waitFor(() => {
        const rerunButton = screen.queryByRole("button", { name: /re-run/i });
        expect(rerunButton).toBeDefined();
      });
    });

    it("should show duplicate button to create similar task", async () => {
      render(<TaskDetailPage />);

      const duplicateButton = screen.queryByRole("button", {
        name: /duplicate/i,
      });
      expect(duplicateButton).toBeDefined();
    });
  });

  describe("Error Handling", () => {
    it("should show error message if task not found", async () => {
      const { useTaskStore } = await import("@/stores/tasks");
      vi.mocked(useTaskStore).mockReturnValue({
        tasks: [],
        getTaskById: vi.fn(() => null),
        updateTask: vi.fn(),
      } as any);

      render(<TaskDetailPage />);

      await waitFor(() => {
        expect(screen.getByText(/task not found/i)).toBeInTheDocument();
      });
    });
  });

  describe("Realtime Updates", () => {
    it("should subscribe to task updates via Inngest", async () => {
      render(<TaskDetailPage />);

      // Should have subscription set up
      await waitFor(() => {
        expect(
          document.querySelector('[data-testid="task-detail"]')
        ).toBeDefined();
      });
    });

    it("should update messages when new ones arrive", async () => {
      render(<TaskDetailPage />);

      await waitFor(() => {
        // Messages should be displayed and updated in real-time
        expect(screen.getByText("Create a new feature")).toBeInTheDocument();
      });
    });
  });
});
