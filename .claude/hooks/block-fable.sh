#!/bin/sh
# PreToolUse hook: only a Fable model may start a Fable subagent or workflow.
# Opus, Sonnet and the rest are refused when they ask for Fable (CLAUDE.md, "Models").
# The calling model is read from the caller's transcript: the main session's, or
# the subagent's own when the call comes from inside a subagent.
exec python3 -I -c '
import glob, json, os, re, sys

data = json.load(sys.stdin)
tool_input = data.get("tool_input") or {}
wants_fable = "fable" in str(tool_input.get("model") or "").lower() or re.search(
    r"model\s*:\s*[\"\x27`][^\"\x27`]*fable", str(tool_input.get("script") or ""), re.I)
if not wants_fable:
    sys.exit(0)

def last_model(path, main_only):
    model = None
    try:
        with open(path) as f:
            for line in f:
                try:
                    entry = json.loads(line)
                except ValueError:
                    continue
                if entry.get("type") != "assistant" or (main_only and entry.get("isSidechain")):
                    continue
                model = (entry.get("message") or {}).get("model") or model
    except OSError:
        pass
    return model

transcript = data.get("transcript_path") or ""
agent_id = data.get("agent_id")
caller = None
if agent_id:
    base = os.path.splitext(transcript)[0]
    for path in glob.glob(os.path.join(base, "**", "agent-%s.jsonl" % agent_id), recursive=True):
        caller = last_model(path, False)
else:
    caller = last_model(transcript, True)

if caller and "fable" in caller.lower():
    sys.exit(0)
print("Blocked: only a Fable session may start Fable subagents (CLAUDE.md, \"Models\"). "
      "This caller is running %s. Leave the model unset or use opus or sonnet." % (caller or "an unknown model"),
      file=sys.stderr)
sys.exit(2)
'
