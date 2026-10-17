# Working in this repository

## Deploy state: **ENABLED**

This switch overrides every other instruction in this file about pushing,
merging or fast-forwarding `main`, opening or merging pull requests into it,
and deploying.

- **DISABLED** means `main` is frozen to save GitHub Actions minutes:
  - Commit your work and push **only your working branch** (name it
    `claude/<topic>`; pushes to a working branch run no workflows). Never push,
    merge or fast-forward `main`, and don't merge pull requests into it.
  - Run tests and builds locally as usual (they cost no Actions minutes).
  - End every change with this warning to the owner:
    > ⚠️ Deploys are disabled for this repo: the change is on branch
    > `<branch>`, NOT on `main`, and NOT deployed.
- **ENABLED** means follow the normal push and deploy rules in this file.
- **Turning deploys on** happens only when the owner explicitly asks for a push
  to `main` (or to enable deploys). Then:
  1. Change the heading above to `**ENABLED**` (this is what lets the push
     guard below allow the push).
  2. Merge the pending work: `git fetch origin && git branch -r --no-merged
     origin/main` lists it. Merge oldest first, resolve conflicts, and run the
     tests.
  3. Push `main` once; that push deploys. If the owner disabled the deploy
     workflow in the Actions tab, remind them to re-enable it.
- **Turning deploys off**, when the owner asks: change the heading to
  `**DISABLED**`, commit only that change with `[skip ci]` in the message (so
  the push runs no workflow), and push `main`.
- `.claude/hooks/deploy-guard.sh` enforces this for Claude sessions: while the
  heading says DISABLED it refuses a `git push` to `main` and pull-request
  merges into it, except a `[skip ci]` push that changes only this file and
  `.claude/` (config, no workflow runs). It
  reads the heading at the moment of the push, so flipping it to ENABLED is all
  it takes to let the push through.

## Commit to `main` when a task is done

This is a GitHub Pages site: `main` is what is published, so a change that
only lives on a side branch has not shipped. When a task is finished and
verified, commit it and land it on `main` — work on a branch if that suits
the task, but merge it into `main` and push `main` before reporting done.
Do not leave finished work parked on a feature branch waiting for a pull
request, and do not open one unless it is asked for.

## Tests and deploys

Pushes to `main` build and deploy only; they run no tests. Tests are your job
before you commit:

- There are no automated tests; check the change in a browser (local server)
  before committing.
- Say in the commit message what you ran and that it passed.

Every deploy is paid for in GitHub Actions minutes while the repository is
private, so batch a task's work into one push to `main` at the end rather than
pushing after every small step. Pushes to a working branch run nothing.

## Models

- Only a session already running on Fable may start Fable subagents, workers or helper agents. Opus,
  Sonnet and every other model never pass model "fable"; they leave the model unset so it inherits, or
  pick Opus or Sonnet.
- Don't switch a session to Fable on your own. If a task seems to need Fable, ask me first and say why.
- This is enforced in `.claude/settings.json`: sessions in this repository default to Opus, and a
  PreToolUse hook (`.claude/hooks/block-fable.sh`) reads the calling model from the transcript and
  refuses a subagent or workflow call that asks for Fable unless the caller is itself Fable. When I ask
  for Fable, switch the main session with `/model`; don't edit the hook to get round it.
