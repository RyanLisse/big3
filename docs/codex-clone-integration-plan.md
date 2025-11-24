# Codex-Clone → Big3 Integration Plan

## 1. Objectives

- Bring all useful features from `codex-clone` into the main `frontend` app.
- Unify UX around a Codex-style task dashboard + Big3 multi-agent chat.
- Own all orchestration in our stack (frontend + Encore backend + Inngest/VibeKit), not in an isolated clone.
- Remove `codex-clone` once feature parity (and more) is achieved.

---

## 2. Current State Summary

### 2.1 codex-clone

**Stack**
- Next.js 15 (App Router), React 19, Tailwind v4, shadcn/ui
- AI: `@ai-sdk/openai`, `ai`
- Orchestration: `@vibe-kit/sdk`, `inngest`, `@inngest/realtime`
- State: `zustand` (`stores/tasks.ts`, `stores/environments.ts`)
- Integrations: GitHub OAuth, E2B sandbox

**Key Features**
- Task-based Codex “agent”
  - Tasks bound to GitHub repo/branch, with modes: `code` / `ask`.
  - VibeKit + E2B runs multi-step agent workflows, emits structured events.
  - Inngest + Realtime channel (`taskChannel`) for status + updates.
- Realtime updates
  - `useInngestSubscription` + `taskChannel` → `Container` → `useTaskStore`.
  - Event types: status, local shell calls, shell outputs, assistant messages.
- GitHub integration
  - OAuth login, token exchange.
  - Repo listing and PR creation via `lib/github.ts`.
- Environment management
  - `environments` store & CRUD UI for GitHub context.
- UI/UX
  - Three-panel layout (sidebar, main chat, tool events panel).
  - Markdown rendering + syntax highlighting + streaming indicator.

### 2.2 frontend (current Big3 app)

**Already integrated / mirrored:**
- `frontend/lib/inngest.ts` – copied from codex-clone (VibeKit + E2B + `taskChannel`).
- `frontend/app/actions/inngest.ts` – server actions for creating tasks & PRs.
- `frontend/stores/tasks.ts` and `frontend/stores/environments.ts` – zustand stores.
- Routes: `frontend/app/environments/*`, `frontend/app/task/[id]/*` mirroring codex-clone structure.
- Codex-style UI: `src/components/CodexInterface.tsx` used by `src/app/page.tsx`.
- Shared UI: navbar, markdown, streaming indicator, `components/ui/*`, `src/components/ui/*`.
- Voice input: `VoiceControls` integrated into CodexInterface.

**Backend:**
- Encore-based `agent` service with:
  - `AgentService` (spawn/resume/cancel/list agents).
  - Session & artifact repos (Effect-based persistence).
  - Streaming via `StreamManager`.
- Rich internal testing layers (mock orchestrator, repos, streams) defined in `test/agent/test-layers.ts`.

---

## 3. Frontend Integration Plan

### Phase 1 – Single Source of Truth for Shared Infra

1. **Confirm app root**
   - Treat `frontend/src/app` as the canonical App Router root.
   - Keep `frontend/app/*` only for shared infra (Inngest actions, tasks/environments until re-homed).

2. **Normalize shared infrastructure**
   - Use these as the *only* copies:
     - `frontend/lib/inngest.ts` (Inngest + VibeKit + E2B + `taskChannel`).
     - `frontend/stores/tasks.ts`, `frontend/stores/environments.ts`.
     - `frontend/app/actions/inngest.ts`.
   - Ensure the `Task` shape and `taskChannel` event types match all UI expectations.

3. **Inngest dev flow**
   - Standardize on a single Inngest dev server for the monorepo.
   - Document in `frontend/README.md` how to run Inngest alongside `pnpm dev`.

### Phase 2 – Port Task & Environment UX into src/app

4. **Move task & environment pages into `src/app`**
   - Port from `codex-clone/app` into `frontend/src/app`:
     - `client-page.tsx` → `src/app/tasks/page.tsx` (or `src/app/codex/tasks/page.tsx`).
     - `task/[id]/*` → `src/app/task/[id]/*`.
     - `environments/*` → `src/app/environments/*`.
   - Update imports to use `@/stores/*`, `@/components/*` paths.

5. **Integrate with CodexInterface**
   - Decide routing strategy:
     - **Option A (recommended):**
       - `/` → `CodexInterface` (chat-first, Big3 + Codex hybrid).
       - `/tasks` → Task dashboard (task-first view).
     - **Option B:**
       - `/` → Task dashboard (Codex-like “home”).
       - `/chat` → Big3/Codex hybrid chat.
   - Add navigation hooks:
     - Buttons/links in CodexInterface to open `/tasks` and `/environments`.
     - From a task detail, add “Open in Codex Chat” that pre-loads session context into `CodexInterface`.

6. **Verify task lifecycle**
   - Creating a task:
     - Task form uses `useTaskStore.addTask`.
     - Server action `createTaskAction` sends `clonedex/create.task` event via Inngest.
     - Inngest `createTask` runs VibeKit/E2B pipeline and publishes status + update events.
     - Realtime subscription updates the zustand store and UI.
   - Task detail view reflects:
     - Status (`IN_PROGRESS` / `DONE` / `MERGED`).
     - Per-task messages (assistant, shell commands, etc.).
     - PR state when available.

### Phase 3 – Realtime Subscription Wiring

7. **Port `Container` into `src/app`**
   - Copy `codex-clone/app/container.tsx` → `frontend/src/app/InngestContainer.tsx` (or similar).
   - Adapt imports:
     - `useInngestSubscription` from `@inngest/realtime/hooks`.
     - `fetchRealtimeSubscriptionToken` from `@/app/actions/inngest`.
     - `useTaskStore` from `@/stores/tasks`.

8. **Wrap layout with container**
   - In `frontend/src/app/layout.tsx`:
     - Keep the layout primarily server-side.
     - Wrap `children` inside a client-side `InngestContainer` within `ThemeProvider`.

9. **Validate event mapping**
   - Ensure `latestData` from Realtime matches TypeScript types of `taskChannel`.
   - Confirm all known event types (status, local shell, shell output, assistant messages) update `Task` appropriately.

### Phase 4 – GitHub OAuth & Repository Flows

10. **Port GitHub helper and auth hook**
    - Move `codex-clone/lib/github.ts` → `frontend/lib/github.ts`.
      - Update production callback URL to match Big3’s domain.
    - Move `codex-clone/hooks/use-github-auth.ts` → `frontend/src/hooks/use-github-auth.ts`.
      - Adapt any path imports to `src/app/api/auth/*` and new `githubAuth` location.

11. **Port auth API routes**
    - Copy `codex-clone/app/api/auth/*` → `frontend/src/app/api/auth/*`:
      - GitHub login and callback handlers.
    - Ensure routes:
      - Issue `github_access_token` cookie (used by Inngest actions).
      - Use `githubAuth` helper for token exchange, user info, repo listing, PR creation.
      - Are compatible with Next 16 route handler types.

12. **Expose GitHub in the UI**
    - Add GitHub actions to Navbar and/or a dedicated settings page:
      - “Connect GitHub” / “Change repository”.
    - In Task form & Environment pages:
      - Use `useGitHubAuth` to trigger login and show current repo.
      - Let user pick repo/branch for each environment or task.

### Phase 5 – E2B + VibeKit & "More Features"

13. **Confirm environment variables**
    - `.env(.local)` in repo root / `frontend` include:
      - `OPENAI_API_KEY`
      - `E2B_API_KEY`
      - GitHub client ID/secret & any required Inngest config.
    - Align with `lib/inngest.ts` + `lib/github.ts` expectations.

14. **Task modes & sandbox behaviour**
    - Ensure Task model in `frontend/stores/tasks.ts` has `mode: "code" | "ask"`.
    - Expose mode selector in task creation UI and use it in `createTaskAction` event data.

15. **"More Features" on the frontend side**
    - Extend **Tool Events** panel:
      - Display both VibeKit/E2B events and Big3 backend streaming events.
      - Tag each event with source (`vibekit`, `big3-backend`, `local_shell`, etc.).
    - Integrate **AgentTimeline** into task detail pages:
      - Use Big3 streaming events to populate timeline entries.
    - Add convenience actions:
      - “Re-run task with modified prompt”.
      - “Duplicate task to new branch / repo”.

### Phase 6 – Cleanup & Removal of `codex-clone`

16. **Feature parity checklist**
    - From `codex-clone/README.md`, verify the following now live in `frontend`:
      - AI-powered code generation with task/dashboard view.
      - Realtime task updates via Inngest.
      - GitHub integration (OAuth, repo selection, PR creation).
      - E2B sandboxed execution (if desired in this project).
      - Environment management UI.
      - Markdown + syntax highlighting + streaming indicator.

17. **Dependency cleanup**
    - Remove any dependencies that were only used inside `codex-clone` once the main app fully owns the functionality.

18. **Delete `codex-clone`**
    - Remove `/big3/codex-clone` directory.
    - Run:
      - `pnpm lint`
      - `pnpm test`
      - `cd frontend && npm run build`

19. **Update docs**
    - Extend `frontend/README.md` with:
      - Codex-style feature overview.
      - Env var requirements.
      - Dev commands for Inngest, backend, and frontend.

---

## 4. Backend Opportunities (Encore Agent Service)

`codex-clone` mostly uses Inngest + VibeKit directly from the frontend, but our Encore backend already has a rich `AgentService` with session, artifact, and streaming management.

We can upgrade the backend to act as a **first-class Codex orchestration layer** instead of keeping all orchestration in the frontend.

### 4.1 Goals for Backend Enhancements

- Provide a stable API surface for "codegen tasks" that frontends (Next UI, CLI, etc.) can call.
- Reuse existing `AgentService`, repositories, and streaming infrastructure.
- Optionally decouple from direct VibeKit/E2B usage in the frontend by letting backend own those integrations.

### 4.2 Proposed Backend Additions

1. **Codex-style Task API on top of AgentService**
   - Add an Encore `agent`-service facade for Codex-style operations:
     - `POST /codex-tasks` – create/spawn a codex-style agent session.
       - Input: repo metadata (owner, repo, branch), mode (`code` | `ask`), initial prompt, environment id, optional labels.
       - Implementation: use `AgentService.spawnAgent` with appropriate labels and toolset.
     - `GET /codex-tasks/:id` – return combined view:
       - Session status from `AgentSessionRepo`.
       - Relevant workspace artifacts from `WorkspaceArtifactRepo`.
       - Stream metadata (if any) from `StreamManager`.
     - `GET /codex-tasks` – list recent codex sessions filtered by repo/labels.

2. **Streaming bridge to frontend Tool Events**
   - Map internal Big3 streaming events to a structure compatible with the existing Tool Events panel.
   - Options:
     - **A)** Continue to use `@inngest/realtime`:
       - Have backend emit events onto the same `taskChannel` used by VibeKit pipeline, using a new event type or payload shape.
     - **B)** Expose a dedicated streaming endpoint from Encore (e.g. SSE / WebSocket) and adapt the frontend Tool Events to subscribe to it.
   - Initial implementation can be minimal: only send high-level stage changes and artifact creation events.

3. **GitHub and PR orchestration server-side**
   - Instead of having the frontend call GitHub APIs directly (via `lib/github.ts`), add Encore endpoints that:
     - Accept a GitHub access token (or session id referencing a secure token store) and repo info.
     - Perform PR creation and basic repo metadata fetching.
   - This makes it easier to:
     - Add audit logging.
     - Reuse logic across tools/agents.

4. **Optional: Unified Task Persistence**
   - Today, codex-clone tasks are backed by `zustand` in the browser plus Inngest events.
   - In a second step, we can:
     - Store task metadata server-side (using existing persistence repos or a new `CodexTask` table), and
     - Use the frontend store only as a cache.
   - This would align Codex tasks with the broader AgentSession/WorkspaceArtifact persistence story.

### 4.3 Frontend Adjustments to Use Backend APIs

Once backend endpoints exist:

- Update TaskForm & TaskList to call Encore APIs for:
  - Creating tasks (spawn codex agent via backend).
  - Fetching task status and details.
- Optionally, use backend-provided task lists instead of purely local zustand state.
- Keep the Inngest/VibeKit pipeline as an implementation detail behind the backend, or gradually migrate away from it if the backend supersedes it.

### 4.4 Implementation Order (Backend)

1. **Design API contracts** for the new Encore endpoints (Codex task create/get/list, optional PR helper endpoints).
2. **Implement handlers** in `backend/agent` that:
   - Use `AgentService` + existing repos to manage session lifecycle.
   - Shape responses for the frontend Codex UI.
3. **Add streaming bridge** from Big3 events to either Inngest Realtime or a dedicated stream endpoint.
4. **Add integration tests** using the existing `TestAgentLayers` and persistence test suites.
5. **Wire frontend** to use these APIs and gradually reduce direct dependency on VibeKit/E2B from the browser.

---

## 5. Status

- **Plan**: drafted and written to `docs/codex-clone-integration-plan.md`.
- **Next recommended step**: start Phase 3 (InngestContainer + layout wiring) and Phase 4 (GitHub auth) on the frontend, then design concrete Encore API contracts for backend Codex-task endpoints before implementing them.
