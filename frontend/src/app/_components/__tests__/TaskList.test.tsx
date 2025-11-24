import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TaskList from '../TaskList';

// Mock the task store
vi.mock('@/stores/tasks', () => ({
  useTaskStore: vi.fn(() => ({
    getActiveTasks: vi.fn(() => [
      {
        id: 'task-1',
        title: 'Implement feature',
        status: 'IN_PROGRESS',
        statusMessage: 'Running tests',
        hasChanges: true,
        branch: 'main',
        repository: 'owner/repo',
        createdAt: new Date(Date.now() - 5 * 60000).toISOString(), // 5 minutes ago
      },
      {
        id: 'task-2',
        title: 'Fix bug',
        status: 'DONE',
        statusMessage: '',
        hasChanges: false,
        branch: 'develop',
        repository: 'owner/repo',
        createdAt: new Date(Date.now() - 60 * 60000).toISOString(), // 1 hour ago
      },
    ]),
    getArchivedTasks: vi.fn(() => [
      {
        id: 'task-3',
        title: 'Old task',
        status: 'MERGED',
        statusMessage: '',
        hasChanges: false,
        branch: 'old-branch',
        repository: 'owner/repo',
        createdAt: new Date(Date.now() - 24 * 60 * 60000).toISOString(), // 1 day ago
      },
    ]),
    archiveTask: vi.fn(),
    removeTask: vi.fn(),
  })),
}));

describe('TaskList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Display', () => {
    it('should render the tasks tab and archive tab', () => {
      render(<TaskList />);
      expect(screen.getByRole('tab', { name: /tasks/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /archive/i })).toBeInTheDocument();
    });

    it('should display active tasks by default', async () => {
      render(<TaskList />);
      
      await waitFor(() => {
        expect(screen.getByText('Implement feature')).toBeInTheDocument();
        expect(screen.getByText('Fix bug')).toBeInTheDocument();
      });
    });

    it('should show indicator for tasks with changes', async () => {
      render(<TaskList />);
      
      await waitFor(() => {
        const indicators = document.querySelectorAll('.size-2.rounded-full.bg-blue-500');
        expect(indicators.length).toBeGreaterThan(0);
      });
    });

    it('should show streaming status for in-progress tasks', async () => {
      render(<TaskList />);
      
      await waitFor(() => {
        expect(screen.getByText(/running tests/i)).toBeInTheDocument();
      });
    });

    it('should show task metadata (repository, timestamp)', async () => {
      render(<TaskList />);
      
      await waitFor(() => {
        expect(screen.getByText('owner/repo')).toBeInTheDocument();
      });
    });
  });

  describe('Navigation', () => {
    it('should link to task detail page', async () => {
      render(<TaskList />);
      
      await waitFor(() => {
        const link = screen.getByRole('link', { name: /implement feature/i });
        expect(link).toHaveAttribute('href', '/task/task-1');
      });
    });
  });

  describe('Archive Tab', () => {
    it('should display archived tasks when archive tab is clicked', async () => {
      const user = userEvent.setup();
      render(<TaskList />);
      
      const archiveTab = screen.getByRole('tab', { name: /archive/i });
      await user.click(archiveTab);
      
      await waitFor(() => {
        expect(screen.getByText('Old task')).toBeInTheDocument();
      });
    });

    it('should show delete button for archived tasks', async () => {
      const user = userEvent.setup();
      render(<TaskList />);
      
      const archiveTab = screen.getByRole('tab', { name: /archive/i });
      await user.click(archiveTab);
      
      await waitFor(() => {
        const deleteButtons = screen.getAllByRole('button');
        expect(deleteButtons.length).toBeGreaterThan(0);
      });
    });

    it('should call removeTask when delete is clicked', async () => {
      const user = userEvent.setup();
      const { useTaskStore } = await import('@/stores/tasks');
      const mockRemoveTask = vi.fn();

      vi.mocked(useTaskStore).mockReturnValue({
        getActiveTasks: vi.fn(() => []),
        getArchivedTasks: vi.fn(() => [
          {
            id: 'task-3',
            title: 'Old task',
            status: 'MERGED',
            statusMessage: '',
            hasChanges: false,
            branch: 'old-branch',
            repository: 'owner/repo',
            createdAt: new Date().toISOString(),
          },
        ]),
        archiveTask: vi.fn(),
        removeTask: mockRemoveTask,
      } as any);

      render(<TaskList />);
      
      const archiveTab = screen.getByRole('tab', { name: /archive/i });
      await user.click(archiveTab);
      
      await waitFor(() => {
        const deleteButton = screen.getByRole('button');
        user.click(deleteButton);
      });

      await waitFor(() => {
        expect(mockRemoveTask).toHaveBeenCalledWith('task-3');
      });
    });
  });

  describe('Archive Functionality', () => {
    it('should show archive button for completed tasks', async () => {
      render(<TaskList />);
      
      await waitFor(() => {
        const archiveButtons = screen.getAllByRole('button');
        expect(archiveButtons.length).toBeGreaterThan(0);
      });
    });

    it('should call archiveTask when archive button is clicked', async () => {
      const user = userEvent.setup();
      const { useTaskStore } = await import('@/stores/tasks');
      const mockArchiveTask = vi.fn();

      vi.mocked(useTaskStore).mockReturnValue({
        getActiveTasks: vi.fn(() => [
          {
            id: 'task-2',
            title: 'Fix bug',
            status: 'DONE',
            statusMessage: '',
            hasChanges: false,
            branch: 'develop',
            repository: 'owner/repo',
            createdAt: new Date().toISOString(),
          },
        ]),
        getArchivedTasks: vi.fn(() => []),
        archiveTask: mockArchiveTask,
        removeTask: vi.fn(),
      } as any);

      render(<TaskList />);
      
      await waitFor(() => {
        const archiveButton = screen.getByRole('button');
        user.click(archiveButton);
      });

      await waitFor(() => {
        expect(mockArchiveTask).toHaveBeenCalledWith('task-2');
      });
    });
  });

  describe('Empty States', () => {
    it('should show message when no active tasks exist', async () => {
      const { useTaskStore } = await import('@/stores/tasks');
      vi.mocked(useTaskStore).mockReturnValue({
        getActiveTasks: vi.fn(() => []),
        getArchivedTasks: vi.fn(() => []),
        archiveTask: vi.fn(),
        removeTask: vi.fn(),
      } as any);

      render(<TaskList />);
      
      await waitFor(() => {
        expect(screen.getByText(/no active tasks yet/i)).toBeInTheDocument();
      });
    });

    it('should show message when no archived tasks exist', async () => {
      const user = userEvent.setup();
      const { useTaskStore } = await import('@/stores/tasks');
      vi.mocked(useTaskStore).mockReturnValue({
        getActiveTasks: vi.fn(() => []),
        getArchivedTasks: vi.fn(() => []),
        archiveTask: vi.fn(),
        removeTask: vi.fn(),
      } as any);

      render(<TaskList />);
      
      const archiveTab = screen.getByRole('tab', { name: /archive/i });
      await user.click(archiveTab);
      
      await waitFor(() => {
        expect(screen.getByText(/no archived tasks yet/i)).toBeInTheDocument();
      });
    });
  });

  describe('Hydration', () => {
    it('should show loading state initially', () => {
      const { useTaskStore } = await import('@/stores/tasks');
      vi.mocked(useTaskStore).mockReturnValue({
        getActiveTasks: vi.fn(() => []),
        getArchivedTasks: vi.fn(() => []),
        archiveTask: vi.fn(),
        removeTask: vi.fn(),
      } as any);

      render(<TaskList />);
      
      // Should show loading message initially
      expect(screen.getByText(/loading tasks/i)).toBeInTheDocument();
    });

    it('should display tasks after hydration', async () => {
      render(<TaskList />);
      
      await waitFor(() => {
        expect(screen.queryByText(/loading tasks/i)).not.toBeInTheDocument();
        expect(screen.getByText('Implement feature')).toBeInTheDocument();
      });
    });
  });
});
