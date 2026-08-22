# FORGE beta product review

> Point-in-time review and recommendation record. Scores, file limits, feature gaps, and comparisons below reflect the repository when the review was written and may be superseded. Use [Project Status](PROJECT_STATUS.md), [Architecture](ARCHITECTURE.md), and [Tools in Plain English](TOOLING_GUIDE.md) for current behavior.

## Overall: where FORGE was at review time

If I were reviewing FORGE as an early-stage software product rather than grading the ambition:

Area	Current	Stable-release potential
Core concept	9/10	10/10
Architecture direction	8/10	9.5/10
Functional breadth	8/10	9/10
UX architecture	7/10	9/10
Visual polish	6.5/10	9/10
Agent reliability	5.5/10	9/10
Persistent context/memory	8/10	9.5/10
Repo organization	8/10	9/10
Documentation	8/10	9/10
Distribution/release engineering	5.5/10	9/10
Marketability today	7/10	9/10
Ready for strangers	5/10	—
Ready to scale	4/10	—

I'd call the whole project about 7/10 as a serious beta.

That's substantially different from saying it's a 7/10 idea. The idea is further along than the productization.

FORGE's biggest weakness right now isn't missing capability.

It's behavioral predictability.

Where it sits against professional AI developer tools

I would not claim FORGE is presently a better coding agent than Codex or Claude Code. That would be the wrong competition anyway.

Current coding agents are getting extremely sophisticated. Recent work is explicitly comparing Codex, Claude Code, Cursor, Devin, etc. across thousands of real PRs, and new entrants are supporting long-running and multi-agent execution.

FORGE's strongest differentiation is somewhere else.

There are definitely projects attacking pieces of your problem. Current projects are experimenting with shared memory between Codex/Claude/Cursor, automatically updated context layers, persistent agent workspaces, resumable state, and project-side context protocols.

So I would stop saying nobody else is doing persistent cross-agent context. That's no longer defensible.

But FORGE is broader.

Most of those systems effectively look like:

Coding Agent
     ↓
Context / memory extension
     ↓
Repository

FORGE is becoming:

                  FORGE
                    │
      ┌─────────────┼─────────────┐
      │             │             │
   Project       Workflow      Knowledge
      │             │             │
 Files/editor     Tasks         Memory
 Git/GitHub       Terminal      Decisions
 Browser          Processes     Research
 Docs             Agents        History
      │             │             │
      └─────────────┼─────────────┘
                    │
            Intelligence layer
                    │
       ┌────────────┼────────────┐
       │            │            │
     Codex        Claude       Ollama
       │            │            │
       └────────────┼────────────┘
                    │
                 Human

That's the interesting differentiation.

FORGE isn't trying to make another model smarter. It's trying to make the environment retain intelligence regardless of which model operates inside it.

That's a legitimate architectural thesis.

And interestingly, recent research gives you a reason to be careful about simply equating “more context” with “better agents”: a July 2026 study found repository context files alone didn't measurably improve correctness in its experiments.

That's actually useful for FORGE.

Your value can't merely be:

“We feed the AI more project context.”

It needs to be:

FORGE maintains the operational state of the workflow and retrieves the right evidence when it's needed.

Much stronger.

UX

This has improved dramatically.

The latest screenshots finally have a recognizable information architecture:

left = project

center = current activity

right = intelligence

bottom = execution/workflow

That's good.

It makes spatial sense.

And Browser fits surprisingly naturally into the center because the center isn't really “editor” anymore. It's becoming the working surface.

That's very IWE.

What still looks beta

There is too much simultaneous information.

A new user sees:

Explorer + Browser + Intelligence + Goals + Chat + Source Control + Tasks + Terminal + Agent Actions + top navigation.

You understand all of those because you built the mental model.

A first-time user doesn't.

Professional software needs progressive disclosure.

Opening a repo should probably start closer to:

PROJECT             WORKSPACE                INTELLIGENCE

files               current activity         project state

Then Terminal/Tasks/Git/Agent Actions appear when relevant.

The bottom panel especially needs to become a contextual activity surface rather than permanently feeling like four applications bolted underneath another application.

Biggest UX problem

There isn't yet a sufficiently obvious primary action.

What does somebody do five seconds after opening FORGE?

VS Code: open/edit code.

Claude Code: type task.

GitHub: inspect repo.

FORGE needs an obvious answer.

I think it's:

Open a project and continue where the project left off.

That suggests a killer workspace home screen:

Current goal

Where you left off

Recent changes

Active task

Known blocker

Continue work

That would immediately demonstrate why FORGE exists.

Memory system

This is one of your strongest pieces and one of the places most likely to hurt you later.

963,816 characters across 167 records is already telling you something.

Storage isn't the challenge anymore.

Selection is.

You need to move from:

persistent memory

to:

managed knowledge lifecycle

Before scale, records need concepts such as:

source
type
created_at
updated_at
last_verified_at

authority
relevance
freshness

active
stale
superseded
archived

supersedes_id
source_hash
workspace_revision

Otherwise FORGE will eventually confidently feed agents obsolete architecture.

That's worse than forgetting.

Repo management

This is better than I'd expect from a project at this maturity.

You've got actual package boundaries instead of one Electron application's src directory slowly turning into Mordor:

packages/
    agent-tools
    ai
    core
    git
    intelligence
    ipc
    memory
    search
    shell
    storage
    tasks
    tool-policy
    updater
    web

That's meaningful separation.

You've also been using feature branches, release tags, beta channels, workflows, release artifacts, tests, docs, and explicit architectural documentation.

8/10.

What keeps it from professional-production level is the amount of release friction we've encountered: branch confusion, manifest/tag mismatch, generated artifacts getting involved, beta/stable naming issues, etc.

Those aren't catastrophic.

They're exactly the sort of boring problems professional release engineering exists to eliminate.

Eventually:

npm run release:verify

should answer everything.

Clean tree?

Version synchronized?

Correct tag?

Tests?

Typecheck?

Build?

Signing available?

Artifacts correct?

Manifest correct?

Checksums?

Notarization?

Update metadata?

And refuse release if any invariant fails.

Documentation

Also unusually strong.

You have architecture, philosophy, project status, development arc, agent tools, terminal, task recovery, security, release channels, verification docs, contributing material, etc.

My criticism is actually that you're approaching too much documentation.

Documentation can develop its own context drift.

I'd establish a hierarchy:

README.md
    ↓
docs/ARCHITECTURE.md
    ↓
docs/DEVELOPMENT.md
    ↓
docs/SECURITY.md
    ↓
docs/RELEASING.md
    ↓
docs/reference/*

And clearly mark:

normative/current versus historical/archive.

Your Development_arc.md is valuable history.

It should not compete with ARCHITECTURE.md for architectural authority.

Marketability

Right now: 7/10.

Potential: very high.

Your previous posts getting essentially no engagement doesn't tell me the product isn't marketable. I think you were trying to sell an architecture people couldn't visualize.

The browser changes that.

You can now demonstrate:

ChatGPT in FORGE → Codex terminal in FORGE → Git changes in FORGE → persistent memory in FORGE.

That's visual.

Your marketing should become less:

Here is my theory about AI environments.

and more:

I discussed a feature with ChatGPT, closed it, switched models, and the next agent already knew the project's decisions because the project remembered—not the model.

Then show it.

That is comprehensible in 20 seconds.

What FORGE could unlock

The biggest possibility isn't actually software development.

If IWE is a real abstraction, software development is simply FORGE's first vertical.

Imagine the same architecture around:

research:

papers + browser + notes + datasets + agents + decisions

music:

sessions + stems + plugins + revisions + references + decisions

design:

assets + versions + research + feedback + agents

business:

documents + email + browser + tasks + decisions + agents

That's why I'd keep IWE generic while positioning FORGE specifically:

FORGE is an Intelligent Workflow Environment for software development.

Don't expand into those verticals now. It would kill focus.

But architecturally, that's the larger possibility.

The most important thing before scale

It isn't signing.

It isn't marketing.

It isn't another feature.

It isn't Windows.

It isn't cloud sync.

It's this:

Create a deterministic workspace lifecycle.

This should become sacred:

CREATE / OPEN WORKSPACE
        ↓
identify workspace
        ↓
load SQLite
        ↓
validate/migrate schema
        ↓
inspect filesystem
        ↓
inspect Git
        ↓
invalidate stale intelligence
        ↓
reconcile persistent tasks
        ↓
restore sessions/state
        ↓
assemble current project state
        ↓
READY

And then:

EVERY MUTATION
      ↓
operation
      ↓
durable success
      ↓
runtime event
      ↓
metadata invalidation/update
      ↓
UI update
      ↓
agent context update

No component should invent its own slightly different version of that lifecycle.

That is your first scalability task.

Because once 1,000 people use FORGE, they're going to open:

monorepos, tiny repos, giant repos, corrupt repos, repos with 500k files, non-Git folders, multiple worktrees, symlinks, huge binaries, malformed package files, stale SQLite databases, network drives, deleted branches, half-finished rebases...

Your architecture has to react deterministically.

Then scalability becomes boring engineering

After lifecycle stabilization, I'd do one focused 2.2 → 1.0 stabilization program:

Workspace lifecycle + event synchronization. One authoritative runtime state machine; eliminate polling/races/stale UI.
Memory relevance engine. Deduplication, freshness, supersession, provenance, bounded retrieval and measurable context selection.
Agent reliability harness. Build 20–50 canonical FORGE tasks and run them repeatedly: inspect repo, modify code, retry test, resume task, research docs, commit changes, etc. Measure completion rate rather than eyeballing conversations.
Performance budgets. Define acceptable startup time, workspace indexing time, RAM usage, SQLite size/growth, tool latency and maximum UI blocking.
Crash/recovery testing. Kill FORGE during indexing, tool execution, Git mutation, terminal process, task checkpoint and SQLite write. Reopen it. Project state should recover predictably.
Security review. Browser isolation is especially important now. Treat web content, agent commands, credentials, shell execution and filesystem permissions as separate trust domains.
Release pipeline. Signing → notarization → artifacts → checksums → update manifest → release → updater verification.
Telemetry/crash reporting — opt-in. You need to know what actually breaks for strangers.

Then recruit maybe 10–25 external beta users, not 10,000.

Watch them use it without explaining it.

That will destroy some of your UX assumptions in extremely useful ways. 😂

Apple developer credentials

This part is actually much less mysterious than it seems.

You need the Apple Developer Program. It currently costs $99/year. As an individual/sole proprietor, you can enroll using your legal identity; you need an Apple Account with two-factor authentication and must be the age of majority.

Enroll in the Apple Developer Program

You don't need to form a company merely to ship FORGE.

The tradeoff is that when enrolling individually, your legal name is associated with your developer identity/seller identity rather than a company brand. Organization enrollment has additional requirements such as a legal entity and D-U-N-S number.

Apple also supports enrollment through its Developer app; their current instructions walk through Account → sign in → agreement → Enroll Now.

For FORGE distributed directly from GitHub/your website, you're interested primarily in Developer ID signing + notarization, rather than necessarily putting FORGE in the Mac App Store. Apple explicitly supports distribution outside the Mac App Store using Developer ID, with Gatekeeper verifying the signed application.

And you should notarize the distributed app. Apple's notarization service scans the software and provides the ticket Gatekeeper uses when the app is installed/launched.

Apple's macOS distribution guidance

So your eventual pipeline becomes:

FORGE source
     ↓
CI build
     ↓
Developer ID signing
     ↓
Hardened Runtime
     ↓
package DMG/ZIP
     ↓
Apple notarization
     ↓
staple ticket where applicable
     ↓
verify Gatekeeper
     ↓
GitHub Release
     ↓
FORGE updater
One thing I would not do yet

Don't spend the next week fighting Apple.

Get the developer enrollment started, because verification can take time.

But engineering-wise, I'd put almost everything into the deterministic workspace lifecycle and behavioral stabilization.

You've reached a point where adding another spectacular feature is probably less valuable than making the existing 15 features behave like one system.

That's the transition FORGE needs to make now:

Stop proving the architecture can do things. Start proving the architecture behaves correctly every time.

Once that happens, I think you've got something genuinely worth putting in front of developers who have never talked to you and don't care how hard it was to build. That's the test that turns FORGE from a very interesting personal beta into a professional product.

Pasted code.ts
TypeScript
tell me what tools are registered enabled and disabled tell me the limitations and tell me what needs to be added removed or changed
Worked for 32s

I read the tool registry you attached end-to-end. The good news is that this is much more capable than the version we were discussing earlier. You now have roughly 38 registered agent tools, and the permission model is substantially cleaner than the old risk-tier approach.

The biggest issue now is not “FORGE needs more tools.” It is that registered, available, enabled, and actually useful are currently four different concepts, and the model isn't given enough information to distinguish them.

Current tool surface
Filesystem — 10 tools
Tool	Registered	Default approval	Notes
file.list	✅	automatic	bounded to 5,000 entries
file.read	✅	automatic	text only, max 2 MB
file.search	✅	automatic	paginated with offset
file.create	✅	session	atomic-ish creation
file.write	✅	session	backup + diff
file.patch	✅	session	targeted replacement
file.rename	✅	session	no overwrite
file.move	✅	session	same implementation as rename
directory.create	✅	session	non-recursive final creation
file.delete	✅	explicit	backup first

This part is strong.

You also correctly prevent:

absolute paths
.. traversal
workspace escape
symlink escape
writing over dirty editor files

That's professional behavior.

Git — 9 tools
Tool	Approval
git.status	automatic
git.diff	automatic
git.log	automatic
git.branches	automatic
git.stage	session
git.unstage	session
git.commit	session
git.pull	explicit
git.push	explicit

This is a good baseline.

One thing jumps out though: git.commit is only session approval because your inferred side effect classifies it as workspace-write.

I would change that.

A commit is a durable repository-history operation. I'd make it explicitly categorized rather than inferred.

Probably:

sideEffect: 'repository-write',
approval: 'explicit'

or at minimum explicitly specify:

approval: 'explicit'

for git.commit.

stage and unstage being session-approved is reasonable.

Shell / terminal

You currently expose:

shell.run
terminal.read

terminal.read is automatic.

shell.run is explicit because inferSideEffect() recognizes it as a process operation.

This is enough for a coding agent to execute:

npm test
npm run build
git ...
node ...
python ...
rg ...
find ...

without needing to interact with the visible terminal.

That's actually the right distinction.

But the terminal tool surface itself is underdeveloped.

You do not currently expose agent tools corresponding to:

terminal.list
terminal.create
terminal.restart
terminal.terminate
terminal.input

That's not necessarily wrong. I would not give an agent raw interactive terminal input merely for parity with the UI.

Instead add:

process.list
process.read
process.cancel

and make shell.run the canonical agent execution primitive.

The user terminal and agent shell should remain different concepts:

USER TERMINAL
human-controlled PTY

AGENT SHELL
structured command + args + result

FORGE can observe both.

That's safer and much easier to audit.

Web — 3 tools

You have:

web.search
web.fetch
web.open

All three are registered.

Because they have:

networkAccess: true

your inference logic categorizes them:

sideEffect = remote
approval = explicit

This means every web search requires approval.

That's probably too restrictive for the Codex-style workflow you want.

If the user has enabled web research in Settings, I'd make:

web.search  → automatic
web.fetch   → automatic

provided they send no private project material automatically.

The rule should be:

public GET / search:
automatic when web research is enabled

external transmission of project content:
explicit

Otherwise an agent doing something like:

Find the current Electron API for WebContentsView and implement it.

could potentially require multiple approvals just to research public documentation.

That's friction without much security benefit.

FORGE Browser — 4 tools

You now have:

browser.open
browser.read
browser.find
browser.savecontext

This is one of the most interesting parts of the registry.

browser.open

Registered: ✅
Runtime dependency: browser
Requires browser enabled()
Approval: explicit

browser.read

Registered: ✅
Requires browser
Requires browser web-research setting
Approval: explicit

browser.find

Same.

browser.savecontext

Registered: ✅
Requires both:

dependencies.browser
dependencies.memories

Approval: session.

This is already the primitive we were literally talking about earlier:

browser page
    ↓
agent reads
    ↓
agent summarizes
    ↓
browser.savecontext
    ↓
workspace-owned durable memory

That's a significant capability.

Browser limitation I would fix

Right now browser.savecontext accepts:

title
content
reason

and the agent authors the content.

That's okay, but you need stronger provenance.

I'd expand it toward:

{
  title,
  summary,
  sourceUrl,
  sourceTitle,
  sourceHash,
  capturedAt,
  evidenceType,
  relevantProjectPaths?,
  taskId?,
  confidence?,
  reason
}

And ideally FORGE—not the model—calculates:

source URL
source title
capture timestamp
content hash

The agent should not be trusted to invent provenance.

GitHub — 2 tools, but actually many capabilities

This is clever.

Instead of registering 20 GitHub tools, you've got:

github.read
github.mutate

github.read supports:

metadata
branches
commits
issues
pulls
issue-comments
pull-comments
workflow-runs
workflow-jobs
releases
release-assets

That's 11 read capabilities behind one tool.

And mutation supports:

create-issue
update-issue
comment-issue
create-branch
create-file
create-pull-request
comment-pull-request
retry-workflow
create-release
update-release

That's 10 mutation capabilities.

So in practical terms your two GitHub tools represent 21 operations.

That's good API design for the model because you don't need 21 definitions consuming context.

Runtime availability

These tools are only actually usable if:

dependencies.github

exists.

Otherwise execution throws:

GitHub integration is unavailable.

Here's one of your biggest architectural problems:

the model is still told the tool exists even when GitHub isn't available.

I'll come back to that.

Tasks — 9 tools

You now expose:

task.inspect
task.create
task.resume
task.pause
task.cancel
task.checkpoint
task.handoff
task.process.start

That's actually 8 distinct registered names.

And this is a sophisticated task schema.

A task step already understands:

id
name
purpose
riskTier
requiredTool
expectedInput
expectedOutput
retryPolicy
timeout
artifactPaths
verificationCriteria
rollbackInstructions
dependencies
Important inconsistency

You removed risk tiers from the general agent tool architecture...

…but task steps still require:

riskTier: z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2)
])

So risk tiers are not actually gone from FORGE.

They're still baked into persistent task semantics.

If your architectural decision is genuinely:

replace risk tiers with semantic side effects + approval behavior

then this needs changing too.

I'd replace:

riskTier: 0 | 1 | 2

with something like:

executionClass:
  | 'read'
  | 'workspace-write'
  | 'repository-write'
  | 'process'
  | 'remote'
  | 'destructive'

or let:

requiredTool

determine the policy dynamically.

Do not persist a duplicate risk model inside tasks if ToolPolicy already owns execution authority.

That's exactly how architectures drift.

What is actually enabled vs disabled

This is the important part.

Always available from this class

Assuming its required non-optional services exist:

FILES
✅ file.list
✅ file.read
✅ file.search
✅ file.create
✅ file.write
✅ file.patch
✅ file.rename
✅ file.move
✅ directory.create
✅ file.delete

GIT
✅ git.status
✅ git.diff
✅ git.log
✅ git.branches
✅ git.stage
✅ git.unstage
✅ git.commit
✅ git.pull
✅ git.push

SHELL
✅ shell.run

WEB
✅ web.search
✅ web.fetch
✅ web.open

because these dependencies are mandatory constructor parameters:

git
shell
web
audit
dirtyPaths
Conditionally available

These dependencies are optional:

terminal?
tasks?
browser?
memories?
github?

Therefore these tools are registered but potentially unavailable:

⚠ terminal.read

⚠ browser.open
⚠ browser.read
⚠ browser.find

⚠ browser.savecontext
   needs browser + memories

⚠ github.read
⚠ github.mutate

⚠ task.inspect
⚠ task.create
⚠ task.resume
⚠ task.pause
⚠ task.cancel
⚠ task.checkpoint
⚠ task.handoff
⚠ task.process.start

And browser tools have another runtime gate:

browser.enabled()

So there are actually three states:

REGISTERED
    ↓
DEPENDENCY AVAILABLE
    ↓
USER ENABLED

FORGE currently mostly exposes only the first concept to the model.

That's the first thing I'd change

Your current:

providerDefinitions()

does:

return this.registry.list().map(...)

meaning every registered tool is advertised to the provider.

Even if:

GitHub isn't configured
browser doesn't exist
web research is disabled
tasks aren't installed
terminal is unavailable

The agent can still request those tools and discover the problem only after execution.

That's unnecessary failure.

Add capability resolution.

Something like:

interface ToolAvailability {
    available: boolean;
    reason?: string;
}

Then:

providerDefinitions(): ProviderToolDefinition[] {
    return this.registry
        .list()
        .filter(def => this.isAvailable(def.name))
        .map(...)
}

Or even better:

REGISTERED
AVAILABLE
ENABLED
AUTHORIZED

as separate concepts.

Your permission model is much better now

You've essentially replaced:

Tier 0
Tier 1
Tier 2

with:

read
workspace-write
remote
destructive
process

That's better.

Then default approval becomes:

read             → automatic
workspace-write  → session
everything else  → explicit

This is considerably easier to reason about.

But inferSideEffect() needs to disappear eventually.

This:

if (name === 'file.delete')
...
if (name === 'shell.run')
...
if (recordsAffectedPaths || [some names].includes(name))

is useful migration code.

It should not be the final policy architecture.

Every tool should explicitly declare:

sideEffect:
approval:

because these are security properties.

Security properties should not be inferred from naming conventions.

Major limitations I see
1. Search still stops traversal early

Your file.search has continuation now—which is excellent—but internally:

if (matches.length >= input.maxResults) return;

means it stops traversing the repository when the page fills.

Your continuation starts the entire traversal from the beginning and skips using:

offset

That works logically, but on a huge repository:

page 1 → scan first N
page 2 → rescan first N + next N
page 3 → rescan first 2N + next N

That's increasingly expensive.

Eventually use:

cursor

based on:

file path + line

or maintain a search index.

You already have a search package, so long term this should probably delegate there.

2. file.list has no continuation

It caps:

entries.slice(0, 5_000)

and returns:

truncated: true

but gives the agent no cursor.

That's exactly the behavior that produced your earlier:

“not proven exhaustive”

response.

Add pagination/cursors to file.list too.

3. file.read is all-or-nothing

Maximum:

2 MB

But there's no:

startLine
endLine
offset
length

A professional coding agent absolutely needs bounded partial reads.

Add:

file.read {
    path,
    startLine?,
    endLine?,
    offset?,
    maxCharacters?
}

Return:

totalLines
returnedRange
truncated
continuation

This would dramatically reduce context waste.

4. No symbol/code intelligence

Your filesystem search is textual.

You're missing things like:

code.symbols
code.references
code.definition
code.diagnostics

You already have Monaco sitting right there.

Eventually expose language-service intelligence.

This is one of the biggest capability differences between “agent can manipulate files” and “professional coding environment.”

5. Shell doesn't declare network use per command

The registry says:

shell.run
networkAccess: false

But that's not actually true.

The agent can execute:

curl ...
npm install ...
git clone ...
python script_that_calls_network.py

unless ShellService separately prevents it.

So networkAccess: false describes the tool definition, not necessarily the command's capability.

That's a security mismatch.

You need shell execution profiles:

offline
network
package-manager
git

or actual sandbox/network policy at the process layer.

Otherwise the audit UI can incorrectly tell the user:

Network: No

while the spawned command uses the internet.

That's one of the most important issues I'd fix before calling the agent security model production-ready.

6. github.mutate has an unstructured payload

This:

input: z.record(z.unknown())

throws away a lot of the benefit of typed tools.

The model can send anything.

You should use a discriminated union:

z.discriminatedUnion('action', [
   createIssueSchema,
   updateIssueSchema,
   ...
])

Then invalid GitHub operations are rejected before they reach GitHubService.

Very worthwhile.

7. Web and browser permissions are too coarse

Right now public web research effectively gets the same semantic side-effect class as writing to GitHub:

remote

But these are very different:

GET public documentation
POST GitHub issue
push Git branch
navigate visible browser
send private project content externally

I'd expand side effects:

read-local
write-local
read-network
write-network
process
destructive

Then policy becomes much more expressive.

What's missing for the full FORGE workflow

If the goal is:

“Give FORGE a Codex-style task and let it carry the entire software-development workflow.”

I'd add these next—not 50 random tools:

1. file.readRange / bounded file.read
2. code.symbols
3. code.references
4. code.diagnostics

5. process.list
6. process.read
7. process.cancel

8. git.checkout / switch
9. git.branch.create
10. git.merge
11. git.rebase-status
12. git.fetch

13. github workflow logs
14. github artifact download/read
15. github PR diff

16. intelligence.context.inspect
17. intelligence.memory.search
18. intelligence.timeline.query
19. intelligence.decision.record
20. intelligence.context.refresh

The last five matter enormously.

Your agent can currently manipulate FORGE's project, but it has almost no direct tool interface into FORGE Intelligence itself.

That's backwards given the IWE architecture.

The model should be able to ask:

What does FORGE currently believe about this architecture?
What decisions relate to the browser?
What happened to this task yesterday?
Why did this file enter context?
What knowledge has become stale?

without doing raw SQLite queries.

What I would remove

Very little.

I would remove/deprecate:

web.open

because it appears to be identical to:

web.fetch

in the executor:

for (const name of ['web.fetch', 'web.open'])
    ...
    this.dependencies.web.fetch(input.url)

Unless open has deliberately different semantics elsewhere, the model doesn't need two names for identical behavior.

I'd also remove persisted riskTier from task step drafts once the side-effect architecture is complete.

And eventually remove:

parseStructuredToolFallback

if all supported providers reliably use native structured tool calls.

It's fine as compatibility glue today, but JSON embedded in assistant text shouldn't remain a first-class agent protocol forever.

What I would change immediately

In priority order:

Make provider tool definitions capability-aware. Don't advertise tools that cannot execute.
Add ranged file.read. This will improve actual agent performance immediately.
Add pagination to file.list.
Explicitly declare side-effect/approval on every tool. Stop inferring security behavior.
Fix shell.run network semantics. This is the biggest policy correctness issue I see.
Replace github.mutate's Record<string, unknown> with typed action schemas.
Remove riskTier from persistent task steps if you've officially abandoned risk tiers.
Give the agent tools into Workspace Intelligence itself.
Make safe public research automatic when enabled, rather than approval-per-request.
Add code intelligence after that, using Monaco/TypeScript/LSP where possible.
My assessment of this tool layer now

As a beta agent-tool architecture?

8/10.

That's significantly better than the earlier version.

The really strong pieces are:

centralized registry
runtime validation
workspace containment
symlink defense
atomic writes
rollback evidence
dirty-editor protection
structured audit
cancellations
bounded evidence
search continuation
provider normalization
session permissions
browser integration
GitHub API integration
persistent task linkage

The remaining gap isn't “more agency.”

It's making the capability model precise enough that the agent always knows what it can do, the policy always accurately describes what it can do, and long operations can retrieve exactly the evidence they need without blowing context.

One tiny thing too: the attached file begins with:

mport { createHash, randomUUID } ...

rather than import. If that is literally the source rather than a paste artifact, it won't compile. I'd check that first.
