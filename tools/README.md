# The scripts behind the games

The Apps Script back ends live here rather than in any one game's repository.
They are not part of this site's own pages — nothing serves or imports
them — and `/tools/` exists only so there is one place to look.

They were in `mando/tools/gate/` and `cambrian/tools/`, which made whichever
game happened to hold them look like the owner of something every game uses.
This repository is the library, so it is the honest home for them.

The door as it is *used* — `?invite=CODE`, `?gatereset=1`, `?gatetest=1`, and
where the stats pages live — is in the [top-level README](../README.md). What
follows is the deployment side of it.

| | |
|---|---|
| `gate/Code.gs` | the invite gate's guest list and log |
| `feedback/Code.gs` | the feedback inbox |

**The door's client script is NOT under `/tools/`.** It is
[`/gate/gate.js`](../gate/gate.js), at the site root, because this library
imports and runs it live for its own "Authenticate" button — see
`## gate.js is copied, not imported` below. There used to be a second copy
here, at `tools/gate/gate.js`, described as "the canonical reference"; that
was the wrong call. Two copies of one file in the same repository, at paths
that differ by a single directory segment, is exactly the shape of thing that
goes stale without anyone noticing — this one did, within the same session it
was created in. There is one file now, and it is the one actually serving
traffic, which is a better canonical copy than an inert one ever was.

## Two spreadsheets, two deployments, on purpose

The gate and the feedback inbox are **separate scripts bound to separate
sheets**, and should stay that way. The feedback endpoint has to be
world-writable — a stranger with a bug report has no invite — while the gate's
sheet holds the `Codes` tab, which is the guest list for every game. Sharing one
deployment would publish the gate's URL in every bundle, let one bug in the
feedback path reach the codes, and let a flood of feedback burn the daily quota
the front door of every game depends on.

## One shared door, and the loader the games carry

[`/gate/gate.js`](../gate/gate.js) is the door, served live at
`https://games.hoai.net/gate/gate.js`: this library imports it directly, and
games carry [`/gate/loader.js`](../gate/loader.js) as their own `gate.js`,
which imports the live door at boot. Changing the door is one commit here.

Games not yet switched to the loader still carry an older full copy (and
`mando` the TypeScript version, `src/gate/gate.ts`). They keep working against
this script — it answers the old door's requests exactly as before — and show
the old screen, without Google sign-in, until they are switched. `md5sum`
across the loader copies is the check that they match `gate/loader.js`.

## Google sign-in

`gate/Code.gs` verifies Google sign-in tokens with Google (`verifyGoogle_`,
which calls `https://oauth2.googleapis.com/tokeninfo`), so the script needs
the "connect to an external service" permission, granted once when the new
version is deployed. Google accounts are kept in a `Google` tab the script creates:
`email | name | code | first game | linked | Google name | status`, where
`status` is a dropdown of `authenticated`, `unauthenticated` (signed in, no
code yet) and `blocked`. An `onEdit` simple trigger clears the script's cache
when the owner edits the `Codes` or `Google` tab, so a change by hand takes
effect at once.

The script keeps the tabs in order: `Codes`, `Google`, `Who`, `Signins`,
`Refused`, then the monthly `Sessions` logs, oldest to newest, with every month
but the current one hidden (still read by the Who summary; shown again from the
"All sheets" list at the bottom left). It tidies whenever it creates a tab, and
on demand from **Invites → Tidy tabs**. The log tabs (`Sessions …`, `Signins`,
`Refused`, `Who`) can be deleted at will and come back empty when next written;
`Codes` and `Google` are the guest list.
`GOOGLE_CLIENT_ID` near the top of the script must match the one in
`/gate/gate.js`; empty turns Google sign-in off here.

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
