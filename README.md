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

## Public access — the owner's own switch

There is a fourth way through the door, and it has no URL parameter: **Make
everything public, for now…** in the Invites menu on the gate spreadsheet.
While it is on, every game and this shelf treat every visitor as though
already admitted — no code, no door — without writing a pass for any of them.
It is temporary and re-asked on every visit by anyone who does not already
hold one, so turning it back off shows the door again on the very next load.
It never touches a friend's real pass either way. Setup and the exact
mechanics are in [`mando/docs/AUTH.md`](https://github.com/hoai2k/mando/blob/main/docs/AUTH.md#turning-the-code-off-temporarily-public-access).

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
