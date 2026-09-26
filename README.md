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
that were hidden. The code itself is never stored — only the id and name the
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

## Repositories using the gate

Every repository under this account, and whether it touches the gate:

| Repository | Uses the gate | How |
|---|---|---|
| [`hoai2k.github.io`](.) | **Yes — this is its home** | `gate/gate.js` (the canonical copy), `tools/gate/Code.gs`, `public-access.json` |
| [`mando`](https://github.com/hoai2k/mando) | **Yes, gated** | `src/gate/gate.ts` — the same door as TypeScript, since it is a Vite build |
| [`jjkbrawler`](https://github.com/hoai2k/jjkbrawler) | **Yes, gated** | `src/gate/gate.js` — byte-identical copy |
| [`battlebotarena`](https://github.com/hoai2k/battlebotarena) | **Yes, gated** | `src/gate/gate.js` — byte-identical copy |
| [`rounders`](https://github.com/hoai2k/rounders) | **Yes, gated** | `js/gate/gate.js` — byte-identical copy |
| [`jujutsubattlegrounds`](https://github.com/hoai2k/jujutsubattlegrounds) | **Yes, gated** | `src/gate/gate.js`, and a second copy at `fable5.1/src/gate/gate.js` for its second build |
| [`supergoatman`](https://github.com/hoai2k/supergoatman) | **Yes, gated** | `src/gate/gate.js` — byte-identical copy |
| [`tennis`](https://github.com/hoai2k/tennis) | **Yes, gated** | `src/gate/gate.js` — byte-identical copy |
| [`cambrian`](https://github.com/hoai2k/cambrian) | No — but reads the pass | `src/shared/feedback.ts` reads `gate.pass` from `localStorage`, unnamespaced, only to pre-fill a returning reporter's name on its feedback form. The game itself is not gated: nothing in it ever shows a door. |
| `francis`, `mechmayhem`, `mini`, `bloxverse`, `earth`, `mechbrawler`, `swingers`, `dinoblocks` | No | Checked directly (2026-09-26): no reference to the gate, the endpoint, or `gate.pass` in any of them. |

**Eight copies of `gate.js`, one hash.** `md5sum` across all eight
no-build/Vite copies (everything above except `mando`'s TypeScript version,
which is the same design in a different language) is the actual check —
they were identical the last time this table was true. If you add a game,
add its row here in the same commit that adds the gate to it; if you ever
find a row that has drifted from the file it describes, that is the bug to
fix, not the table.

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
