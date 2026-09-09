# The scripts behind the games

The Apps Script back ends and the shared client door live here rather than in
any one game's repository. They are not part of this site — nothing serves or
imports them, and `/tools/` exists only so there is one place to look.

They were in `mando/tools/gate/` and `cambrian/tools/`, which made whichever
game happened to hold them look like the owner of something every game uses.
This repository is the library, so it is the honest home for them.

| | |
|---|---|
| `gate/Code.gs` | the invite gate's guest list and log |
| `gate/gate.js` | the door itself, as plain ES module JavaScript |
| `feedback/Code.gs` | the feedback inbox |

## Two spreadsheets, two deployments, on purpose

The gate and the feedback inbox are **separate scripts bound to separate
sheets**, and should stay that way. The feedback endpoint has to be
world-writable — a stranger with a bug report has no invite — while the gate's
sheet holds the `Codes` tab, which is the guest list for every game. Sharing one
deployment would publish the gate's URL in every bundle, let one bug in the
feedback path reach the codes, and let a flood of feedback burn the daily quota
the front door of every game depends on.

## `gate/gate.js` is copied, not imported

Six games carry a byte-identical copy of it, because they are no-build static
sites with nowhere to import from. `mando` carries the same door as TypeScript
(`src/gate/gate.ts`) because it is a Vite site.

**Change one and change all of them**, or the games start disagreeing about who
is let in. `md5sum` across the copies is the check; they were identical when
this was written.

## One difference from what is deployed today

`gate/Code.gs` here carries **one hunk that the deployed script does not**: the
`Who` tab is rebuilt with `setValues`, and a leading apostrophe is a Sheets
*formatting* flag rather than part of the value — so `getValues` hands back
`=EVIL` without it and `setValues` re-arms the formula that `safe_` defused when
it landed. The copy here re-defuses on the way out; the deployed one does not.

It is a narrow path — the Who tab is only rebuilt when the owner clicks the menu
item, and the formula only runs when the owner then looks at that tab — but it
is the one tab the owner opens most, and it costs a line to close.

**Re-paste this file and deploy a new version to pick it up.** Until then, this
copy is one commit ahead of production, which is the normal state for a
reference and worth knowing rather than assuming away.

## Setup

Per-script setup, the deployment settings, the "Who has access: Anyone" trap and
the porting notes are in [`mando/docs/AUTH.md`](https://github.com/hoai2k/mando/blob/main/docs/AUTH.md).
That document stayed where it is: it is written for whoever is wiring a game up,
and it is versioned alongside a game that uses it.
