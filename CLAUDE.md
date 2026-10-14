# Working in this repository

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
