---
description: Unattended build. Runs the feature pipeline over docs/tickets, one branch per ticket, merged in one by one
argument-hint: [first ticket, e.g. T01] [last ticket, default T20]
---
Autonomous build. Arguments: $ARGUMENTS (first and last ticket IDs; defaults T01 to T20). Never ask me anything. Never push. Never touch `main`.

## Setup
1. Require a clean working tree, with one exception: if `docs/progress.md` marks a ticket `in-progress` and you are on its branch, commit the leftovers as `WIP: <ID>` and resume that ticket (a previous run was cut off, for example by a usage limit). Otherwise, if the tree is dirty, STOP and tell me.
2. Create or switch to the integration branch `autobuild` (from the current branch if new). All ticket branches start from it and merge back into it.
3. Read `docs/progress.md` if it exists and resume from it. Otherwise create it with one row per ticket in range: `ID | status | branch | notes`. Statuses: `todo`, `in-progress`, `done`, `blocked`, `skipped`.
4. If the arguments say `retry`, process only `blocked` tickets (and any `skipped` ones that become unblocked), each with a fresh 2 fix rounds.

## Per ticket
Take tickets in ID order. Skip any ticket whose `Depends on` list contains a ticket that is `blocked` or `skipped`, and mark it `skipped` with the reason.

1. Mark the ticket `in-progress` in `docs/progress.md` with its branch name and commit that on `autobuild`. Then branch: `git switch autobuild`, then `git switch -c ticket/<ID>-<slug>` (slug from the ticket filename). If the branch exists, switch to it.
2. Clarify: run requirements-clarifier on the ticket file. Do NOT ask me. For every blocking open question, pick the most reasonable default, following `CLAUDE.md`, `docs/plan.md` and `design_handoff_statpakd/`. Record each one under "Assumptions" in `docs/plans/00-requirements.md`.
3. Plan: run planner. Do NOT wait for approval. Treat the ticket's acceptance criteria as the contract.
4. Build: for each task in order, run coder and test-writer in parallel. Commit after each task on the ticket branch.
5. Verify: run `ruff check .` and `pytest` if Python changed, and in `web/` run `npm run lint`, `npm run typecheck`, `npm test`. Then run qa-tester. On any failure or a FAIL report, send the failures to coder as a fix task, commit, and re-verify. Maximum 2 fix rounds.
6. Outcome:
   - Pass: `git switch autobuild`, `git merge --no-ff ticket/<ID>-<slug>`. Re-run the web tests on `autobuild` after the merge. If they fail, undo the merge with `git revert -m 1 HEAD` (no hard resets), mark the ticket `blocked`, and note why. Otherwise mark `done`.
   - Still failing after 2 rounds: do NOT merge and do NOT stop the run. Leave the branch as is, switch back to `autobuild`, mark `blocked` with a short failure summary.
7. Update `docs/progress.md` (status, branch, assumptions made, known gaps) and commit it on `autobuild`.

## Progress updates
Keep this chat current without me asking. Print one short line in the chat at each of these points: ticket started (`T05 started: <title>`), plan done, each fix round (`T05 verify round 1: 2 failures`), and ticket outcome (`T05 done, merged <short sha>` or `T05 blocked: <reason>`). After each outcome also print a running tally (`done 4 / blocked 1 / skipped 0 / todo 15`). Keep each line to one sentence.

## Rules
- Never delete or weaken a test to make it pass.
- Stay inside the ticket's scope. Note out-of-scope ideas in `docs/progress.md` instead of building them.
- Do not run T21 or later unless I named them in the arguments. They need my decisions.
- If the same failure repeats across tickets, or something looks systemically broken (build will not start, dependencies will not install), STOP the whole run instead of burning through tickets.

## Finish
Print a short report: a table of ticket statuses, branches, merged commits on `autobuild`, every assumption made, and every blocked ticket with its reason. Do not push and do not merge `autobuild` into `main`. I will review that.
