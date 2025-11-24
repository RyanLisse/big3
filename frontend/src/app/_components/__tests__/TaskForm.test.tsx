import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TaskForm from '../TaskForm';

// Mock the stores
vi.mock('@/stores/environments', () => ({
  useEnvironmentStore: vi.fn(() => ({
    environments: [
      {
        id: 'env-1',
        name: 'Main Repo',
        githubRepository: 'owner/main-repo',
        githubToken: 'token-123',
        createdAt: new Date(),
      },
    ],
  })),
}));

vi.mock('@/stores/tasks', () => ({
  useTaskStore: vi.fn(() => ({
    addTask: vi.fn((task) => ({ ...task, id: 'task-1' })),
  })),
}));

// Mock the GitHub auth hook
vi.mock('@/src/hooks/use-github-auth', () => ({
  useGitHubAuth: vi.fn(() => ({
    branches: [
      { name: 'main', isDefault: true },
      { name: 'develop', isDefault: false },
    ],
    fetchBranches: vi.fn(),
  })),
}));

// Mock the Inngest action
vi.mock('@/app/actions/inngest', () => ({
  createTaskAction: vi.fn(),
}));

describe('TaskForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Display', () => {
    it('should render the task form heading', () => {
      render(<TaskForm />);
      expect(screen.getByText(/ready to ship something new/i)).toBeInTheDocument();
    });

    it('should display the textarea for task description', () => {
      render(<TaskForm />);
      const textarea = screen.getByPlaceholderText(/describe a task/i);
      expect(textarea).toBeInTheDocument();
    });

    it('should show environment selector when environments exist', () => {
      render(<TaskForm />);
      expect(screen.getByRole('combobox', { name: /choose a repository/i })).toBeInTheDocument();
    });

    it('should show branch selector when environment is selected', () => {
      render(<TaskForm />);
      expect(screen.getByRole('combobox', { name: /branch/i })).toBeInTheDocument();
    });
  });

  describe('Input Handling', () => {
    it('should update textarea value when user types', async () => {
      const user = userEvent.setup();
      render(<TaskForm />);

      const textarea = screen.getByPlaceholderText(/describe a task/i) as HTMLTextAreaElement;
      await user.type(textarea, 'Create a new feature');

      expect(textarea.value).toBe('Create a new feature');
    });

    it('should auto-expand textarea as user types', async () => {
      const user = userEvent.setup();
      render(<TaskForm />);

      const textarea = screen.getByPlaceholderText(/describe a task/i) as HTMLTextAreaElement;
      const initialHeight = textarea.style.height;

      await user.type(textarea, 'A'.repeat(200));

      // Height should have increased
      expect(textarea.style.height).not.toBe(initialHeight);
    });

    it('should allow selecting an environment', async () => {
      const user = userEvent.setup();
      render(<TaskForm />);

      const envSelect = screen.getByRole('combobox', { name: /choose a repository/i });
      await user.click(envSelect);

      const option = screen.getByText('owner/main-repo');
      await user.click(option);

      expect(envSelect).toHaveValue('env-1');
    });

    it('should allow selecting a branch', async () => {
      const user = userEvent.setup();
      render(<TaskForm />);

      const branchSelect = screen.getByRole('combobox', { name: /branch/i });
      await user.click(branchSelect);

      const option = screen.getByText('develop');
      await user.click(option);

      expect(branchSelect).toHaveValue('develop');
    });
  });

  describe('Task Creation', () => {
    it('should show action buttons only when textarea has content', async () => {
      const user = userEvent.setup();
      render(<TaskForm />);

      // Initially, buttons should not be visible
      expect(screen.queryByRole('button', { name: /ask/i })).not.toBeInTheDocument();

      // Type in textarea
      const textarea = screen.getByPlaceholderText(/describe a task/i);
      await user.type(textarea, 'Create feature');

      // Buttons should now be visible
      expect(screen.getByRole('button', { name: /ask/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /code/i })).toBeInTheDocument();
    });

    it('should call createTaskAction with "code" mode when Code button is clicked', async () => {
      const user = userEvent.setup();
      const { createTaskAction } = await import('@/app/actions/inngest');

      render(<TaskForm />);

      const textarea = screen.getByPlaceholderText(/describe a task/i);
      await user.type(textarea, 'Create feature');

      const codeButton = screen.getByRole('button', { name: /^code$/i });
      await user.click(codeButton);

      await waitFor(() => {
        expect(createTaskAction).toHaveBeenCalledWith(
          expect.objectContaining({
            task: expect.objectContaining({
              title: 'Create feature',
              mode: 'code',
            }),
          })
        );
      });
    });

    it('should call createTaskAction with "ask" mode when Ask button is clicked', async () => {
      const user = userEvent.setup();
      const { createTaskAction } = await import('@/app/actions/inngest');

      render(<TaskForm />);

      const textarea = screen.getByPlaceholderText(/describe a task/i);
      await user.type(textarea, 'Create feature');

      const askButton = screen.getByRole('button', { name: /^ask$/i });
      await user.click(askButton);

      await waitFor(() => {
        expect(createTaskAction).toHaveBeenCalledWith(
          expect.objectContaining({
            task: expect.objectContaining({
              title: 'Create feature',
              mode: 'ask',
            }),
          })
        );
      });
    });

    it('should clear textarea after task creation', async () => {
      const user = userEvent.setup();
      render(<TaskForm />);

      const textarea = screen.getByPlaceholderText(/describe a task/i) as HTMLTextAreaElement;
      await user.type(textarea, 'Create feature');

      const codeButton = screen.getByRole('button', { name: /^code$/i });
      await user.click(codeButton);

      await waitFor(() => {
        expect(textarea.value).toBe('');
      });
    });

    it('should use selected environment and branch in task', async () => {
      const user = userEvent.setup();
      const { useTaskStore } = await import('@/stores/tasks');
      const mockAddTask = vi.fn((task) => ({ ...task, id: 'task-1' }));

      vi.mocked(useTaskStore).mockReturnValue({
        addTask: mockAddTask,
      } as any);

      render(<TaskForm />);

      // Select environment
      const envSelect = screen.getByRole('combobox', { name: /choose a repository/i });
      await user.click(envSelect);
      await user.click(screen.getByText('owner/main-repo'));

      // Select branch
      const branchSelect = screen.getByRole('combobox', { name: /branch/i });
      await user.click(branchSelect);
      await user.click(screen.getByText('develop'));

      // Type task
      const textarea = screen.getByPlaceholderText(/describe a task/i);
      await user.type(textarea, 'Create feature');

      // Submit
      const codeButton = screen.getByRole('button', { name: /^code$/i });
      await user.click(codeButton);

      await waitFor(() => {
        expect(mockAddTask).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Create feature',
            branch: 'develop',
            repository: 'owner/main-repo',
          })
        );
      });
    });
  });

  describe('No Environment State', () => {
    it('should show create environment link when no environments exist', () => {
      const { useEnvironmentStore } = require('@/stores/environments');
      vi.mocked(useEnvironmentStore).mockReturnValue({
        environments: [],
      });

      render(<TaskForm />);

      expect(screen.getByRole('link', { name: /create an environment/i })).toBeInTheDocument();
    });
  });
});
