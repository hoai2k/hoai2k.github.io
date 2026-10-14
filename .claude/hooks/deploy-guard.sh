#!/bin/sh
# PreToolUse hook: while CLAUDE.md says "Deploy state: **DISABLED**", refuse
# anything that would update `main` on GitHub: a git push to main, or merging
# a pull request / writing files to main through the GitHub tools.
# The switch is read from CLAUDE.md at the moment of the push, so flipping the
# line to **ENABLED** (when the owner explicitly asks for a push to main) is
# all it takes to let the push through. One exception while DISABLED: a push
# whose new commits all say [skip ci] and touch only CLAUDE.md and .claude/ --
# that is how deploys are turned off (and this guard updated); it runs no workflow.
exec python3 -I -c '
import json, os, re, shlex, subprocess, sys

data = json.load(sys.stdin)
tool = data.get("tool_name", "")
ti = data.get("tool_input") or {}
cwd = data.get("cwd") or os.getcwd()

def git(d, *a):
    r = subprocess.run(["git", "-C", d, *a], capture_output=True, text=True)
    return r.stdout.strip() if r.returncode == 0 else None

def disabled(d):
    top = git(d, "rev-parse", "--show-toplevel")
    if not top:
        return False, None
    try:
        text = open(os.path.join(top, "CLAUDE.md"), encoding="utf-8").read()
    except OSError:
        return False, top
    m = re.search(r"Deploy state:\s*\*\*(ENABLED|DISABLED)\*\*", text)
    return bool(m and m.group(1) == "DISABLED"), top

def refuse(why):
    print("Blocked: deploys are DISABLED for this repo (see \"Deploy state\" at the top of CLAUDE.md). "
          + why + " Push your working branch instead and tell the owner the change is NOT on main and NOT deployed. "
          "If the owner has explicitly asked for a push to main, first change the line to "
          "\"Deploy state: **ENABLED**\" in CLAUDE.md (following that section), then push.", file=sys.stderr)
    sys.exit(2)

if tool.startswith("mcp__github__"):
    d = os.environ.get("CLAUDE_PROJECT_DIR") or cwd
    off, top = disabled(d)
    if not off:
        sys.exit(0)
    url = git(top, "remote", "get-url", "origin") or ""
    name = re.sub(r"\.git$", "", url.rstrip("/").split("/")[-1])
    if ti.get("repo") and ti.get("repo") != name:
        sys.exit(0)
    if tool.endswith("merge_pull_request"):
        refuse("Merging a pull request updates main.")
    if ti.get("branch") in ("main", "refs/heads/main"):
        refuse("Writing files to main updates main.")
    sys.exit(0)

cmd = ti.get("command") or ""
try:
    words = shlex.split(cmd.replace(";", " ; ").replace("&&", " && ").replace("||", " || ").replace("|", " | "))
except ValueError:
    words = cmd.split()

where = cwd
i = 0
while i < len(words):
    w = words[i]
    if w == "cd" and i + 1 < len(words):
        nxt = words[i + 1]
        where = nxt if os.path.isabs(nxt) else os.path.join(where, nxt)
        i += 2
        continue
    if w == "git":
        j, d = i + 1, where
        while j < len(words) and words[j].startswith("-"):
            if words[j] == "-C" and j + 1 < len(words):
                d = words[j + 1] if os.path.isabs(words[j + 1]) else os.path.join(where, words[j + 1]); j += 2
            elif words[j] == "-c" and j + 1 < len(words):
                j += 2
            else:
                j += 1
        if j < len(words) and words[j] == "push":
            args = []
            k = j + 1
            while k < len(words) and words[k] not in (";", "&&", "||", "|"):
                args.append(words[k]); k += 1
            pos = [a for a in args if not a.startswith("-")]
            off, top = disabled(d)
            if off:
                refs = pos[1:]
                if refs:
                    targets = []
                    for r in refs:
                        r = r.lstrip("+")
                        src, _, dst = r.partition(":")
                        targets.append((src or None, dst or src))
                else:
                    cur = git(d, "branch", "--show-current")
                    targets = [("HEAD", cur)]
                for src, dst in targets:
                    if dst in ("main", "refs/heads/main") or (dst == "HEAD" and git(d, "branch", "--show-current") == "main"):
                        rng = "origin/main.." + (src or "HEAD")
                        msgs = git(top, "log", "--format=%B%x00", rng)
                        files = git(top, "diff", "--name-only", rng)
                        ok = (msgs is not None and files is not None and msgs.strip("\x00\n ") != ""
                              and all("[skip ci]" in m for m in msgs.split("\x00") if m.strip())
                              and all(f == "CLAUDE.md" or f.startswith(".claude/") for f in files.split()))
                        if not ok:
                            refuse("This would push to main.")
        i = j + 1
        continue
    i += 1
sys.exit(0)
'
