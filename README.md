# hoai2k.github.io

Browser games by Hoai Nguyen. This repository is the **library**: the shelf at
[games.hoai.net](https://games.hoai.net/) that lists the games, the shared door
(`gate/gate.js`), the card thumbnails, and the Apps Script back ends in
[`tools/`](tools/README.md). Each game lives in its own repository and is
published as its own project site under the same domain.

`games.hoai.net` is the canonical host. `hoai2k.github.io/<game>/` answers 301
to it, query string and all, so old links keep working — but a pass is stored
per origin, so always share links on `games.hoai.net`.

## URL parameters

The door reads three parameters. They work in front of every gated game, on
this shelf, and on the gated stats pages and workbenches — the same
`gate/gate.js` is behind all of them.

| Parameter | What it does |
|---|---|
| `?invite=CODE` | Redeems an invite on arrival. Nothing to click, nothing to type. |
| `?gatereset=1` | Forgets this browser's pass and puts the door back. |
| `?gatetest=1` | Shows the real door on localhost, where it is otherwise off. |

### `?invite=CODE` — the invite link

This is how a friend is let in, and the only URL worth sending anyone:

```
https://games.hoai.net/?invite=ANYA-7F2C9K          the shelf
https://games.hoai.net/mando/?invite=ANYA-7F2C9K    straight into a game
```

The code is checked against the `Codes` tab of the gate spreadsheet, and on a
yes the browser stores a pass and the parameter is wiped from the address bar —
which is the least private place on a computer, and an invite pasted into a
group chat admits whoever reads it. Codes are compared with case and
punctuation thrown away, so `anya 7f2c9k` and `ANYA-7F2C9K` are the same code.

**One invite admits a friend to everything.** The pass is stored under one key
for the whole origin and never expires, so a code redeemed anywhere on
`games.hoai.net` opens every game, and on this shelf it also reveals the cards
that were hidden, plus an **Apps** section below the games (Music Practice,
Games Chat, Ear Trainer, MP3 Player and Image Annotator from the mini repo,
listed in `APPS` in `index.html`). That section needs a real pass: the
public-access switch below shows every game but never the apps. It only
decides who sees them listed; the apps themselves open for anyone with the
link. The code itself is never stored — only the id and name the
endpoint answers with — so the browser holds no reusable secret.

A refused code leaves the door standing with its complaint and the code in the
box to correct. On the shelf the door is dismissible, since there is a public
shelf behind it; in front of a game there is nothing behind it, so there is no
way past.

The Invite menu on the gate spreadsheet mints these links. It lists the games
only — every stats page and workbench is behind the same door, but nobody needs
an invite *link* to a workbench.

### `?gatereset=1` — forget this browser's pass

```
https://games.hoai.net/?gatereset=1
```

Forgets the pass and shows the door again. `gateReset()` in the browser console
does the same thing. This is for the owner testing an invite, and it is not a
way *in*: forgetting a pass can only cost you the door you were already
through. The parameter is stripped immediately so a reload does not fire it
again, and an `invite` alongside it is left alone — `?gatereset=1&invite=CODE`
forgets the old pass and then spends the new code, which is the whole point of
testing one.

### `?gatetest=1` — the door, locally

The door is off on localhost, a `file://` page and private LAN addresses, so
local runs and test tooling never meet it. `?gatetest=1` switches it on for
that page. Without it, an invite cannot be redeemed locally either — the door
that would spend it never opens.

## Google sign-in — a second way through the same door

Wherever the door appears, a "Sign in with Google" button sits under the code
box. It is **off until a Google OAuth client ID is set** — `GOOGLE_CLIENT_ID`
in [`gate/gate.js`](gate/gate.js) and the same value in
[`tools/gate/Code.gs`](tools/gate/Code.gs); while either is empty the door is
code-only, exactly as before.

| Visitor | Result |
|---|---|
| Enters a code | Admitted; the pass is stored in the browser, as always |
| Signs in with an account the sheet has never seen | Recorded in the sheet's `Google` tab as `unauthenticated`, with the game whose door it was at and the date; the door says "Signed in as …" and asks for the code |
| Signs in with Google, **then** enters a code | Admitted, and that row becomes `authenticated`, with the name and code filled in |
| Signs in with an `authenticated` account | Admitted with no code, on any device |
| Signs in with a `blocked` account | Turned away ("that access has been turned off"); a code still works on its own |

Google's one-tap prompt also appears, so a returning visitor signed into
Google is often let straight in. A pass holder who arrived by code can link an
account later from **Link Google account** under the library's
"Authenticated" badge. The `status` column is a dropdown the owner can
change by hand: set an `unauthenticated` row to `authenticated` to let that
account in without a code (it is admitted under the row's name, or its email
if the name is empty), or set any row to `blocked`. Edits take effect at
once. Revoking a code also turns off every Google account linked to it. The pass stored in the browser is the same however
someone got in, so nothing in the games changes.

## Codes that open only the public games

The Codes tab's **access** column limits a code. Blank (or `everything`) opens
everything, as before; **`public games`** opens only what the public-access
switch would open: the finished games, but not the mini Prototype archive, the
private sites, the invite-only swingers games or the library's Apps (every page
that opens the door with `ignorePublicAccess`, unless its own `accessFile`
says to follow the switch). The pass such a code leaves carries
`scope: 'public'`; at a locked page the door shows anyway, saying the code
opens the public games and this one needs a personal invite, and a full code
entered there replaces the pass. A Google account linked to a limited code
gets the same limit. While public access is on, a limited code changes
nothing a visitor can see; it matters once the switch is off.

## One door, loaded by every game

The door lives once, at [`gate/gate.js`](gate/gate.js), served at
`https://games.hoai.net/gate/gate.js`. A game carries
[`gate/loader.js`](gate/loader.js), copied byte for byte as its own
`gate.js`; the loader fetches the shared door at boot, so a change here reaches
every game on its next load (GitHub Pages caches it for up to ten minutes)
without redeploying any of them. A friend with a stored pass is let in without
waiting on that fetch, and if the shared door cannot be fetched at all, a
visitor with no pass gets a "try again" screen rather than the game.

A game that still carries an older full copy of the door keeps working and
shows the screen it shipped with, without Google sign-in, until its copy is
swapped for the loader. **Keep `gate/gate.js`'s exports backwards
compatible**: every loader calls `openGate(opts)` and `publicAccessOn()` on
whatever is live.

## Public access — one file, no code required

There is a fourth way through the door, and it has no URL parameter and no
spreadsheet menu: **[`public-access.json`](public-access.json)**, at the root
of this repository.

```json
{ "publicAccess": false }
```

Edit that one field on GitHub — the pencil icon on the file's page — and
commit to `main`. Set it to `true` and every game and this shelf treat every
visitor as though already admitted, with no code and no door, until it is set
back to `false`. Nothing else to touch: no Apps Script, no Sheet, no
redeploying a game.

It never writes a pass for anyone let in this way — the file is re-read on
every visit by anyone who does not already hold one, so flipping it back to
`false` shows the door again on the very next load, with nothing stored
anywhere to clear first. And it never touches a friend's *real* pass either
way: someone who already holds one short-circuits before this file is even
asked about. A GitHub Pages edge cache means a change can take up to ten
minutes to reach a *stale cached copy* of the file, which the door works
around with a cache-busting request — see `publicAccessOn` in `gate/gate.js`
for exactly how, and the fuller write-up in
[`mando/docs/AUTH.md`](https://github.com/hoai2k/mando/blob/main/docs/AUTH.md#turning-the-code-off-temporarily-public-access).

**Pages that stay locked anyway.** A game or page that calls
`openGate({ ..., ignorePublicAccess: true })` never reads this file, so the
switch does not open it: only a real pass does. It is for unfinished
prototypes and private test pages that should not go public with the
finished games. Today that is every game in `mini`'s Prototype archive
(`mini/onemonster/`, `mini/gliders/`) and the private sites in
`mini/sites/` (`langanfrostandwane/`, `stratfordtennisclub/`, through
`mini/sites/shared/private-site.js`).

Such a page can be let back under the switch without touching code: it
names its own override with `accessFile: 'public-access.json'`, a file in
its folder holding `{ "followPublicAccess": false }`. Set that to `true` and
the page follows this switch like the finished games. A missing or broken
file keeps the page locked, so a slip never opens a prototype.

## Repositories using the gate

Every repository under this account, and whether it touches the gate:

| Repository | Uses the gate | How |
|---|---|---|
| [`hoai2k.github.io`](.) | **Yes — this is its home** | `gate/gate.js` (the shared door, served live), `gate/loader.js` (what games carry), `tools/gate/Code.gs`, `public-access.json` |
| [`jjkbrawler`](https://github.com/hoai2k/jjkbrawler) | **Yes, loader** | `src/gate/gate.js` |
| [`battlebotarena`](https://github.com/hoai2k/battlebotarena) | **Yes, loader** | `src/gate/gate.js` |
| [`rounders`](https://github.com/hoai2k/rounders) | **Yes, loader** | `js/gate/gate.js` |
| [`jujutsubattlegrounds`](https://github.com/hoai2k/jujutsubattlegrounds) | **Yes, loader** | `src/gate/gate.js` and `fable5.1/src/gate/gate.js` |
| [`supergoatman`](https://github.com/hoai2k/supergoatman) | **Yes, loader** | `src/gate/gate.js` (Vite keeps the shared door's URL as an external import) |
| [`tennis`](https://github.com/hoai2k/tennis) | **Yes, loader** | `src/gate/gate.js` (Vite, as above) |
| [`mini`](https://github.com/hoai2k/mini) | **Yes, loader** | Six copies: `onemonster/`, `gliders/`, `bronzedrum/` and `icecreamcone/` under `game/src/gate/gate.js`, `bookzam/app/src/gate/gate.js`, and `sites/shared/gate.js` for the private sites. The Prototype archive games and the sites pass `ignorePublicAccess: true` with their own `public-access.json` as `accessFile`; the library shows the archive only to pass holders |
| [`mando`](https://github.com/hoai2k/mando) | **Yes, loader (TypeScript)** | `src/gate/gate.ts`, the loader's TypeScript twin: on when the build sets `VITE_GATE_ENDPOINT`, which it passes to the shared door with `alwaysOn`; covered by `tools/test-gate.mjs` against the live door |
| [`cambrian`](https://github.com/hoai2k/cambrian) | No — but reads the pass | `src/shared/feedback.ts` reads `gate.pass` from `localStorage`, unnamespaced, only to pre-fill a returning reporter's name on its feedback form. The game itself is not gated: nothing in it ever shows a door. |
| `francis`, `mechmayhem`, `bloxverse`, `earth`, `mechbrawler`, `swingers`, `dinoblocks` | No | Checked directly (2026-09-26): no reference to the gate, the endpoint, or `gate.pass` in any of them. |

**Every loader copy is byte-identical to `gate/loader.js`** (October 2026);
`md5sum` across them is the check. Several of these games deploy from a
`deploy` branch with deploys switched off, so their loader is on `main` but
reaches the live site only when that game is next deployed; until then the
live game shows the older door, which keeps working against the same guest
list. If you add a game, add its row here in the same commit that adds the
loader to it.

## Stats pages

Each game keeps its own visitor stats page at `/<game>/stats/`, counted by
[GoatCounter](https://www.goatcounter.com/). They are `noindex`, and they are
back offices rather than part of the games, so nothing links to them:

| Page | Door |
|---|---|
| [`/battlebotarena/stats/`](https://games.hoai.net/battlebotarena/stats/) | invite |
| [`/jjkbrawler/stats/`](https://games.hoai.net/jjkbrawler/stats/) | invite |
| [`/rounders/stats/`](https://games.hoai.net/rounders/stats/) | invite |
| [`/jujutsubattlegrounds/stats/`](https://games.hoai.net/jujutsubattlegrounds/stats/) | invite |
| [`/cambrian/stats/`](https://games.hoai.net/cambrian/stats/) | open |
| [`/mechmayhem/stats/`](https://games.hoai.net/mechmayhem/stats/) | open |

The gated ones report their own label at the door, so the `Who` tab's `games`
column reads `battlebotarena-stats` rather than `battlebotarena` — a visit to
the stats page is not a game being played.

Neither open page is counting anything yet, and both say so rather than
showing numbers: MECH MAYHEM's has no GoatCounter site configured, and the
trilogy's is pointed at `ancientseas.goatcounter.com`, which has not been
created. Making that site on GoatCounter is what switches the trilogy's page
on.

The other games have no stats page. Who is playing, as opposed to how many, is
the gate spreadsheet's `Who` tab — see [`tools/README.md`](tools/README.md).

### Workbenches

The same family of back-office pages, all behind the invite door:
`/mando/workbench/`, `/jjkbrawler/workbench/`, `/rounders/workbench/`,
`/jujutsubattlegrounds/workbench/`, `/cambrian/workbench/`,
`/mechmayhem/workbench/`, and `/cambrian/viewer/`.

## The door is a doorman, not a lock

These are static sites in public repositories. Everything ships to the browser,
and anyone willing to open devtools can set a pass by hand and walk in. What
the gate does is keep the games off the open web for passers-by and tell the
owner who is playing. Nothing behind it is a secret. The hidden cards on this
shelf are the same bargain: the `GATED` list ships in `index.html`, and hiding
them only means a stranger sees a shelf of games they can play rather than a
shelf of locks.
