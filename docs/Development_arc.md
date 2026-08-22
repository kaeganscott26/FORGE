# The FORGE development arc

> Historical narrative. This file explains how FORGE evolved; it is not the current behavior, release, or implementation-gap authority. Use [Project Status](PROJECT_STATUS.md) for current evidence.

9. Intelligence is now explicitly separate from native chat

The project runtime is being refactored so workspace intelligence is usable before, during, and after any particular model request. The context engine, durable SQLite state, tasks, memory, Git observations, and audit records remain project-owned. Native chat is one agent client of those services, and its continuation loop uses observed workspace progress rather than a five-call or three-round ceiling. Runtime events now propagate durable changes to the renderer, and the workspace includes an in-app public-web browser surface for user-directed research.

1. The original workspace idea
FORGE started from a much simpler premise: put the things you were already bouncing between—project files, Markdown knowledge, Git, an editor, and AI context—inside one project-owned environment.
The crucial conceptual move was very early: the project folder is the durable thing, not the conversation.
That eventually became the architectural rule now explicitly written into the repo:
“The project folder is the source of truth.”
And:
“The model is a replaceable worker; conversation continuity is not an execution primitive.”
That distinction is basically the seed from which everything else grew.

2. Renderer + memory became an actual desktop workspace
The early implementation quickly moved beyond a prototype renderer. Memory management, IPC handlers, reindexing, editor rendering, and desktop packaging came online.
Then @forge/core established a proper runtime-independent architecture around:
filesystem
Markdown
workspaces
projects
keyword search
future semantic-search contracts
The important thing about that stage is that FORGE stopped being merely a UI concept and acquired a reusable application layer. The core architecture explicitly separated Electron/UI from the workspace contracts.

3. FORGE 1.0 became a real packaged application
On August 6 the repository crossed a major threshold:
macOS packaging
desktop release workflow
FORGE 1.0.0
release publication
updater work
build diagnostics
At that point FORGE was no longer “some React panels around project files.” It had a distributable Electron runtime.
The current package confirms that architecture: Electron + React 19 + Monaco + xterm + Zustand + node-pty, organized as an npm workspace across apps/* and packages/*.

4. Conversations became workspace-owned instead of model-owned
The next big leap was architectural, not cosmetic.
FORGE added:
project-owned conversation threads
persistent active conversation
durable memory
automatic context assembly
context provenance
indexed project knowledge
That changed chat from “the AI remembers this conversation” into:
the workspace remembers, and a conversation is simply one view into that state.
The architecture now correctly separates conversations, memory, tasks, layout, Git state, and metadata. Clearing a chat does not erase the workspace's intelligence.
This was probably the first point where FORGE became meaningfully different from “AI embedded in an IDE.”

5. The terminal made external agents part of the workspace
FORGE then acquired a real PTY runtime:
persistent terminal sessions
input/output
resizing
cancellation/restart
session IDs
bounded terminal reading for AI
workspace-root execution
The renderer's TerminalPanel.tsx is already using xterm and receives streamed main-process events through the preload bridge.
That was a much bigger architectural step than it may have looked like at first.
Because once Codex, Ollama, Claude CLI, shell processes, builds, test runners, etc. can live inside the same workspace runtime, FORGE doesn't need to be the agent doing all the work.
It can observe the work.
That distinction leads directly into where the architecture is heading now.

6. Tool policy introduced controlled agency
The next stage added an actual agent-tool runtime:
filesystem tools
Git tools
shell operations
policy tiers
approval requirements
workspace confinement
audit records
rollback backups
bounded outputs
cancellation
The registry in packages/agent-tools/src/index.ts is already much more disciplined than a typical “give the model shell access” implementation. For example, filesystem paths are workspace-relative, traversal is rejected, symlink escape is checked, and mutations are separated by risk tier.
This transformed FORGE from a context-aware workspace into a context-aware execution environment.

7. Persistent tasks changed execution from turns into project state
Then came another category-changing piece: persistent tasks.
Tasks are not chat TODOs. They have:
steps
dependencies
retries
checkpoints
process IDs
Git/workflow/release references
verification evidence
audit references
handoffs
restart reconciliation
The Tasks UI already exposes those as durable project objects rather than ephemeral assistant messages.
That gets much closer to your actual thesis:
the workspace should know what is happening to itself across time.

8. Alpha → Beta became mostly runtime hardening
The commits from August 6–7 show a very obvious maturation phase:
updater downgrade protection
release discovery
filesystem watcher repairs
terminal PTY repairs
workspace recovery
task engine persistence
editor/local-agent workflow repairs
terminal selection UX
Monaco undo fix
baseline reset
beta packaging
beta acceptance
repo documentation polish
So the project has already crossed from “build features” into:
make all those features behave as one coherent system.
That is exactly where I would classify it today.
Where FORGE is right now
Current package version is 2.3.0-beta.1. The published beta is `v2.3.0-beta.1` / **FORGE v2.3 Beta**; historical beta 2.2 evidence remains a prior release record, not the current product identity.
And beta is the correct word.
Not because the application is skeletal—it isn't.
FORGE already contains most of the major architectural organs:
Workspace → files / editor / Markdown
Project state → SQLite metadata / goals / conversations / layout
Long-term intelligence → memory / indexing / retrieval / context assembly / provenance
Development runtime → Git / terminal / filesystem watching
Execution control → tool registry / validation / risk policy / approval / audit
Temporal continuity → persistent tasks / checkpoints / handoffs / process state
Distribution → Electron packaging / updater / release channels
That's an unusually complete beta.
The remaining problem is coordination quality.
FORGE currently feels somewhat like several sophisticated systems connected to each other rather than one runtime whose behavior naturally propagates through every surface.

The biggest architectural gap
This is the fork you identified earlier today.
Right now apps/desktop/src/main/index.ts still creates:
OpenAIProvider
ContextBuilderImpl
MemoryRetriever
Agent
ToolRouter
TaskRuntime
and then implements the complete multi-round runAgentTurn() tool loop directly inside Electron's main IPC composition.
That means FORGE still partially thinks:
workspace → internal AI agent → workspace
when the stronger architecture is:
workspace → FORGE intelligence/runtime context → arbitrary agent/model/human → observations/actions → workspace
That's subtle, but enormous.
To fully live up to the idea
FORGE needs to become three things.
The workspace authority
It knows:
what files exist
what changed
why something changed
what decisions were made
what tasks exist
what processes are running
what Git says
what previous agents observed
what evidence is relevant now
The context compiler
Given an intent, it produces a bounded context object something like:
WorkspaceContextPacket

identity
intent
architecture
relevant files
recent changes
Git state
task state
decisions
durable memory
terminal evidence
prior observations
constraints
provenance
That packet should exist without requiring a model completion.
The execution observer
Codex, Ollama, another hosted model, a human developer, or FORGE's optional native chat can consume that packet.
FORGE then records what actually happened.
That is where the phrase:
“the AI is the result of the software”
actually becomes architecture rather than philosophy.
What I would tackle first in the source
1. Start with apps/desktop/src/main/index.ts
This is the most important architectural file right now.
Look specifically for runAgentTurn().
Right now it owns too many concepts:
load conversation
→ assemble history
→ call provider
→ interpret tool calls
→ execute tools
→ enforce continuation bounds
→ connect task checkpoints
→ synthesize result
→ persist conversation
→ transform evidence for renderer
Don't remove native chat.
Instead extract it.
I would eventually want something conceptually like:
main/
  index.ts
  ipc/
  workspace-runtime.ts
  intelligence/
    context-service.ts
    context-export.ts
  agents/
    native-agent-adapter.ts
    agent-runner.ts
Then:
ContextAssemblyService
    ↓
WorkspaceContextPacket
    ↓
 ┌─────────────┬────────────┬─────────────┐
 Native chat   Codex/CLI     Ollama/etc.
 └─────────────┴────────────┴─────────────┘
The model becomes a consumer.
FORGE remains the authority.
I created Issue #19 specifically for that.
2. Then apps/desktop/src/renderer/src/App.tsx
This is the behavioral-polish hotspot.
Right now App.tsx owns essentially everything:
workspace
file tree
active file
editor content
saved content
Git status
dashboard
diff
updater
layout
bottom view
selected file
expansion state
clipboard
context menu
async refresh
layout persistence
dirty state
create/delete/rename/copy
Git actions
You can see that density immediately at the beginning of the component.
It works, but that's exactly how a beta gets weird timing bugs.
Break its responsibilities into stateful workspace services/hooks.
Something resembling:
renderer/
  workspace/
    useWorkspaceSession.ts
    useWorkspaceFiles.ts
    useWorkspaceLayout.ts
    useWorkspaceGit.ts
    useEditorSession.ts
The critical addition isn't merely organization.
It's a workspace-generation ID / abort mechanism.
An async request started under workspace A must never be allowed to mutate React state after workspace B becomes active.
That's Issue #20.
3. Fix the preload/build authority immediately
This one surprised me.
Your actual TypeScript preload does the right thing:
IPC channel allowlist
typed invoke
terminal event subscription
But today's newest commit added this generated preload:
import { contextBridge, ipcRenderer } from "electron";
const forge = { invoke: (channel, request) => ipcRenderer.invoke(channel, request) };
contextBridge.exposeInMainWorld("forge", forge);
That generated artifact has neither the source allowlist nor terminal event API.
That needs resolution before stable.
apps/desktop/src/** should be source authority.
apps/desktop/out/** should be generated build output, not an alternate implementation of your architecture.
That's Issue #18, and I'd call it the first literal release blocker.
Behavior polish after the architecture cleanup
The next major improvement is to stop making renderer components rediscover runtime state.
There are currently three synchronization strategies.
Terminal uses proper events.
ToolPanel does this:
refresh every 2 seconds.
ChatPanel listens to a custom browser event:
forge:conversation-updated
TaskPanel manually dispatches that event.
Those should converge on one typed runtime event bus:
main durable mutation
       ↓
ForgeRuntimeEvent
       ↓
typed preload subscription
       ↓
renderer invalidates appropriate state
Events like:
workspace.changed
files.changed
git.changed
conversation.changed
task.changed
tool.request.changed
audit.appended
terminal.changed
memory.changed
with a workspaceId.
Then FORGE starts to feel alive instead of periodically checking whether something happened.
That's Issue #21.
UI rendering polish
The UI is further along than the code architecture would suggest, but the rendering layer is still beta-shaped.
global.css is essentially the whole visual system right now: raw hex values, sizes, panel styles, controls, context panels, tree states, chat, terminal, etc.
You don't need a redesign.
You need to formalize the visual language you already created.
Move toward:
--forge-bg-base
--forge-bg-panel
--forge-bg-raised

--forge-border-subtle
--forge-border-active

--forge-text-primary
--forge-text-secondary
--forge-text-muted

--forge-accent
--forge-danger
--forge-warning
--forge-success

--forge-space-1
...
--forge-control-height
--forge-radius
Then make:
panel header
toolbar
selected item
error
status badge
button
input
empty state
loading state
focus ring
mean the same thing everywhere.
That is Issue #23.
The resizing bug belongs deeper than CSS
Your fitLayout() currently contains hardcoded constraints such as:
180
260
520
620
440
420
160
140
while the CSS grid has its own corresponding minimums.
That's two geometry systems trying to agree.
I'd extract:
calculateWorkspaceLayout(
  requestedLayout,
  containerRect,
  constraints
)
into a pure module and test it.
Then both resize dragging and persisted-layout restoration use the exact same rules.
And use the workspace container dimensions, not:
window.innerWidth - hardcoded stuff
Ideally ResizeObserver tells FORGE what space actually exists.
That's Issue #22.
Then unify runtime feedback
A stable development environment can't have each panel inventing its own interpretation of:
loading
working
failed
retrying
cancelling
completed
Right now the components mostly own individual loading, busy, and error booleans.
I'd introduce a shared scoped operation state:
interface RuntimeOperation {
  id: string;
  workspaceId: string;
  scope: string;
  state:
    | 'pending'
    | 'success'
    | 'error'
    | 'cancelling';
  message?: string;
}
This helps eliminate:
double submits
stale errors
late completions
false cancellation
“did that Git push actually happen?”
weird workspace-switch behavior
That's Issue #24.
The stable release definition
Then you stop fixing whatever bug appears next and create an actual release contract.
Today FORGE already has:
typechecking
Vitest
linting
Electron build
packaging
build manifests
But stable needs whole-app acceptance.
The gate should eventually be:
npm run verify:stable
and that should prove:
typecheck
lint
unit tests
integration tests
workspace lifecycle tests
clean Electron build
preload parity
packaged smoke tests
persistent-state restart tests
terminal event tests
tool-policy tests
critical user-flow e2e
layout geometry tests
release manifest verification
Then a human visual acceptance matrix for:
welcome
open workspace
editor
Markdown
Git
terminal
intelligence context
memory
tasks
tool approval
audit
settings
small window
normal window
maximized window
display scaling
That's Issue #25.
The GitHub backlog I created
I created these directly in kaeganscott26/FORGE:
#18 — release-blocker: restore a single source of truth for Electron main/preload runtime
Resolves the source/generated IPC mismatch.
#19 — architecture: separate workspace intelligence assembly from native agent execution
The major architectural split we discussed: FORGE owns context/runtime; native AI becomes an optional consumer.
#20 — behavior: make workspace lifecycle and renderer state transitions deterministic
Fixes App.tsx orchestration, workspace races, file identity, dirty state, and layout crossing boundaries.
#21 — behavior: replace polling and window events with typed runtime event synchronization
Moves FORGE toward one reactive workspace-runtime event architecture.
#22 — ui: harden resizable workspace layout across real window sizes
Directly attacks the current resizing/layout roughness.
#23 — ui: turn the renderer stylesheet into a coherent interaction and visual system
The real UI rendering polish pass.
#24 — behavior: unify operation status, cancellation, errors, and recovery across workspace surfaces
Makes interactions feel deterministic instead of beta-ish.
#25 — stable-release: add end-to-end behavioral, packaged-runtime, and visual acceptance gates
Defines what “stable” actually means.
Each contains Problem → Start Here → Debug/Reproduce → Required Source Changes → Expected Runtime Behavior → Acceptance Criteria.
So yes: FORGE now has the next stage of its own development arc sitting inside its Git state as machine-readable project context, rather than only living in this conversation.
The order I would execute them
#18  Runtime source authority
 ↓
#19  Separate intelligence from agent execution
 ↓
#20  Deterministic workspace lifecycle
 ↓
#21  Runtime event synchronization
 ↓
#24  Unified operation behavior
 ↓
#22  Layout/render geometry
 ↓
#23  Visual interaction-system polish
 ↓
#25  Stable acceptance gate
 ↓
2.1.0 stable
And there's a nice architectural symmetry there.
Earlier FORGE needed more capability.
Now it mostly needs less ambiguity.
Once this pass is done, the application shouldn't merely have memory, tasks, terminal observation, context, Git, editor, tools, and AI. Those pieces should behave as manifestations of one persistent workspace runtime.
That's the point where I think FORGE genuinely stops feeling like a very ambitious beta IDE and starts feeling like the new category you've been describing.
