/**
 * THE SHARED DOOR — served live at https://games.hoai.net/gate/gate.js.
 *
 * The library imports it directly, and every game that carries
 * `gate/loader.js` (as its own `gate.js`) imports it from that URL at boot, so
 * a change here reaches all of them on their next load (GitHub Pages caches it
 * for up to ten minutes). Games that still carry an older full copy of this
 * file keep the screen they shipped with until they switch to the loader.
 *
 * KEEP THE EXPORTS BACKWARDS COMPATIBLE. Every loader in every game calls
 * `openGate(opts)` and `publicAccessOn()` on whatever this file is today, so
 * renaming either, or changing what an existing option means, breaks games
 * that were not redeployed. Add options; never repurpose them.
 *
 * GOOGLE SIGN-IN sits beside the code, and is off while GOOGLE_CLIENT_ID is
 * empty. Signing in with Google before entering a code links that Google
 * account to the code in the spreadsheet's `Google` tab; from then on,
 * signing in with that account is enough, on any device. Signing in with an
 * account that is not linked yet asks for the code. `linkGoogle()` links an
 * account for someone who already holds a pass. The pass stored in the browser
 * is the same either way, so every game behaves the same however a friend got
 * in.
 *
 * ---
 *
 * The door: a one-time invite code in front of the game.
 *
 * Self-contained on purpose — no imports, no build step, no dependencies. Drop
 * this file in, call `openGate()` before the game boots, and that is the whole
 * integration. It is the same door as `src/gate/gate.ts` in the `mando` repo,
 * written as plain ES module JavaScript for the no-build sites.
 *
 * IT IS A DOORMAN, NOT A LOCK. These are static sites in public repositories:
 * everything here ships to the browser, and anyone willing to open devtools can
 * set the pass by hand and walk in. What it does is keep the games off the open
 * web for passers-by, and tell the owner who is playing. Nothing behind it is a
 * secret and no check here should be mistaken for one.
 *
 * "FRIENDS SEE THIS ONCE" is the constraint everything bends to:
 *
 *  - An invite link (`?invite=CODE`) redeems itself on arrival — nothing to
 *    click, nothing to type — and is then wiped from the address bar, which is
 *    the least private place on a computer: screenshots, bookmarks,
 *    autocomplete, and links pasted into group chats by somebody meaning to
 *    share the game rather than their own invite.
 *  - The pass is stored with NO EXPIRY, under a key that is NOT this game's.
 *    Every game on this origin shares it — GitHub Pages project sites differ
 *    only by path and localStorage is keyed by origin — so one invite admits a
 *    friend to all of them, and a friend who already plays one game walks
 *    straight into a new one without ever seeing this.
 *  - The code itself is never stored. The endpoint answers with an id and a
 *    name, and those are what is kept, so the browser holds no reusable secret.
 *
 * TO SEE THE DOOR AGAIN once you hold a pass — which the owner needs whenever
 * testing an invite, and nobody else ever needs — add `?gatereset=1` to the
 * URL, or call `gateReset()` in the console. Both forget this browser's pass
 * and put the door back. Neither is a way *in*: forgetting a pass can only ever
 * cost you the door you were through, so there is nothing to protect here.
 *
 * IT IS OFF WHEN RUN LOCALLY. On localhost, a file:// page, or a private LAN
 * address, `openGate` resolves immediately and this file may as well not exist
 * — so `npm start`, the test tooling and any local automation never meet it.
 * Append `?gatetest=1` to see the real door on a local server.
 *
 * THE OWNER HAS A SECOND, INDEPENDENT WAY IN: public access, controlled by
 * ONE EDITABLE CONSTANT ON GITHUB — `publicAccess` in `/public-access.json`,
 * at the root of this repository. Flip it, commit to `main`, done: no Apps
 * Script, no Sheet, nothing to redeploy. While it is `true`, `openGate` treats
 * every visitor without a pass as though already admitted — no code, no door
 * — WITHOUT writing a pass for any of them. That is the whole shape of it: a
 * temporary state re-read on every visit by anyone who does not already hold
 * one, never a stored one, so setting it back to `false` shows the door again
 * on the very next load, with nothing to clear first. A friend who already
 * holds a real pass never reaches the check at all, and the switch never
 * touches theirs — see `publicAccessOn` and the top of `openGate`. A page
 * opened with `ignorePublicAccess: true` (an unfinished prototype, a private
 * test site) never asks the switch: it stays code-locked even while the
 * switch is on. Such a page can also name its own `accessFile`, a
 * `public-access.json` in its folder holding `{ "followPublicAccess": false }`;
 * flipping that to `true` makes the page follow the switch like any other
 * game, with no code change — the way a prototype graduates.
 */

/** Where the guest list lives. Not a secret: it ships in this file either way. */
const DEFAULT_ENDPOINT = 'https://script.google.com/macros/s/AKfycbx5Jp9z8XG0nnk60z5zccDoIy8MdkFDr0Cn61p84fcqKyKzhZ_700c_zCJVqjwsNfvlsQ/exec';

/**
 * The guest list this page talks to: DEFAULT_ENDPOINT unless the host passed
 * `opts.endpoint` (mando, which is built with its own, and its test suite).
 */
let endpoint = DEFAULT_ENDPOINT;

/** Set by `opts.alwaysOn`: the host, not the hostname, decides the door is on. */
let forcedOn = false;

/**
 * The Google OAuth client ID (a Web application client in Google Cloud, with
 * https://games.hoai.net as an authorised JavaScript origin). Not a secret: a
 * client ID is public by design. Empty turns Google sign-in off everywhere and
 * the door is code-only, exactly as before. The Apps Script's GOOGLE_CLIENT_ID
 * must hold the same value, or it will refuse every Google sign-in.
 */
const GOOGLE_CLIENT_ID = '1069894258313-2r9kdv5i6682cro0pkaoliu7bdkv1lek.apps.googleusercontent.com';

/** Google's sign-in library (Google Identity Services). */
const GIS_URL = 'https://accounts.google.com/gsi/client';

/**
 * Deliberately not namespaced to any one game — see the header. Changing this
 * string in one game and not the others would quietly split the guest list into
 * per-game sign-ins, which is exactly what it exists to prevent.
 */
const PASS_STORE = 'gate.pass';

const INVITE_PARAM = 'invite';
/** Forget this browser's pass and show the door again. For testing invites. */
const RESET_PARAM = 'gatereset';

/**
 * The identity a session ping carries while public access is on. Distinct
 * from any real friend's name so it can never collide with one in the Who
 * tab, and never written to PASS_STORE — the switch never leaves anything
 * behind for the browser to hold onto.
 *
 * The server treats it like any other client-supplied name — `handleSession_`
 * validates nothing, as documented at its own definition — so this is a
 * client-side convention, not a contract the endpoint has to know about. Keep
 * it the same as the identical literal in `mando/src/gate/gate.ts` anyway, so
 * a public-access session pinged by either kind of game reads as the same one
 * row rather than two.
 */
const PUBLIC_ID = '(public access)';

/**
 * Where the owner's editable constant lives: root-relative, so it resolves to
 * the one copy under whichever hostname is asking — `games.hoai.net` and its
 * pre-redirect twin `hoai2k.github.io` are the same GitHub Pages deployment,
 * same file, same answer.
 */
const PUBLIC_ACCESS_URL = '/public-access.json';

/** Hosts where the door stands open: local development and local automation. */
function isLocal() {
  const h = location.hostname;
  return h === '' || h === 'localhost' || h === '127.0.0.1' || h === '::1' || h === '0.0.0.0'
    || h.endsWith('.local') || /^192\.168\./.test(h) || /^10\./.test(h);
}

/** On for a real deployment; off locally unless deliberately being tested. */
function gateEnabled() {
  if (forcedOn) return true;
  try {
    if (new URL(location.href).searchParams.has('gatetest')) return true;
  } catch { /* an exotic URL is not worth failing a boot over */ }
  return !isLocal();
}

// ---------- the stored pass ----------

export function readPass() {
  try {
    const raw = localStorage.getItem(PASS_STORE);
    if (!raw) return null;
    const p = JSON.parse(raw);
    // A blob that predates a field, or one typed in by hand, should read as
    // "no pass" rather than crash the boot before the game exists.
    if (!p || typeof p.id !== 'string' || p.id === '') return null;
    const pass = { id: p.id, name: typeof p.name === 'string' ? p.name : p.id, since: p.since || Date.now() };
    // The Google account this pass is linked to, when this browser knows it.
    if (typeof p.google === 'string' && p.google !== '') pass.google = p.google;
    return pass;
  } catch {
    return null;   // private mode, or storage disabled entirely
  }
}

function writePass(p) {
  try { localStorage.setItem(PASS_STORE, JSON.stringify(p)); } catch { /* private mode */ }
}

export function clearPass() {
  try { localStorage.removeItem(PASS_STORE); } catch { /* private mode */ }
}

// ---------- the endpoint ----------

/**
 * Posted as text/plain on purpose. A JSON content-type makes the browser send a
 * CORS preflight, and an Apps Script web app cannot answer one — the body is
 * still JSON, the header just keeps the request "simple" so it goes straight
 * through.
 */
async function post(body) {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(body),
  });
  return await res.json();
}

/**
 * What the browser can say about itself, sent only with an invite attempt so
 * the owner can see the shape of anything odd at the door.
 *
 * ALL OF IT IS SELF-REPORTED AND TRIVIALLY FORGED. Apps Script hands its
 * doPost the body and nothing else — no client IP, no headers — so there is no
 * server-side truth to compare against and no real location to be had. The
 * timezone is the useful field in practice: a coarse "roughly where", not
 * something a casual guesser thinks to change.
 */
function clientInfo() {
  const safe = (f, fallback) => { try { return f(); } catch { return fallback; } };
  return {
    tz: safe(() => Intl.DateTimeFormat().resolvedOptions().timeZone, ''),
    lang: safe(() => navigator.language, ''),
    screen: safe(() => `${screen.width}x${screen.height}`, ''),
    ua: safe(() => navigator.userAgent, '').slice(0, 300),
    ref: safe(() => document.referrer, '').slice(0, 300),
  };
}

/**
 * Ask whether the owner has switched the code off for everyone, temporarily,
 * by reading `/public-access.json` — see `PUBLIC_ACCESS_URL` and the header.
 * THIS FILE IS THE OWNER'S EDITABLE CONSTANT: edit it directly on GitHub,
 * commit to `main`, and every game and this library pick it up on their next
 * visit from anyone without a pass. Nothing else to touch.
 *
 * Same-origin, so unlike every other request this file makes there is no CORS
 * to think about at all. The query string is a cache-buster: GitHub Pages
 * serves this site with `Cache-Control: max-age=600` (measured), and that
 * caching lives at the CDN edge, upstream of anything a browser's own
 * `cache` option can reach — a unique query on every request is what actually
 * forces a fresh copy rather than up to ten minutes of a stale one.
 * `cache: 'no-store'` additionally skips the browser's own cache, belt and
 * braces.
 *
 * Anything short of a clean `true` — a 404, a network hiccup, invalid JSON
 * from a slipped hand-edit, the deployment being unreachable — reads as "no".
 * That is the safe default: the code stays required unless the file plainly
 * says otherwise, never because a network hiccup did.
 *
 * Exported so a page that never opens the door — the arcade library, which
 * only shows it as a sign-in box — can still ask this on its own, to decide
 * whether to render the locked cards at all.
 */
export async function publicAccessOn() {
  if (!gateEnabled()) return false;
  try {
    const res = await fetch(`${PUBLIC_ACCESS_URL}?t=${Date.now()}`, { cache: 'no-store' });
    const body = await res.json();
    return body?.publicAccess === true;
  } catch {
    return false;
  }
}

/**
 * Whether this page should ask the owner's switch at all. Every page does,
 * unless it was opened with `ignorePublicAccess` — then only if its own
 * `accessFile` plainly says `{ "followPublicAccess": true }`. Fetched the same
 * cache-busting way as the switch; every failure reads as "no", so the page
 * stays locked.
 */
async function followsPublicAccess(opts) {
  if (!opts.ignorePublicAccess) return true;
  if (!opts.accessFile) return false;
  try {
    const url = new URL(opts.accessFile, location.href);
    url.searchParams.set('t', String(Date.now()));
    const res = await fetch(url.href, { cache: 'no-store' });
    const body = await res.json();
    return body?.followPublicAccess === true;
  } catch {
    return false;
  }
}

/** Fire-and-forget. Carries an id, never a code, so it cannot be replayed in. */
function pingSession(pass, game) {
  const body = JSON.stringify({ kind: 'session', game, id: pass.id, name: pass.name });
  try {
    const blob = new Blob([body], { type: 'text/plain;charset=utf-8' });
    if (navigator.sendBeacon(endpoint, blob)) return;
  } catch { /* fall through to fetch */ }
  fetch(endpoint, {
    method: 'POST', keepalive: true,
    headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body,
  }).catch(() => { /* the log is never worth failing a boot over */ });
}

// ---------- Google sign-in ----------

/** Whether the door offers Google sign-in at all. */
export function googleEnabled() {
  return GOOGLE_CLIENT_ID !== '';
}

let gisLoading = null;

/** Load Google's sign-in library once. Rejects if it cannot be had. */
function loadGis() {
  if (!googleEnabled()) return Promise.reject(new Error('google sign-in is off'));
  const ready = () => window.google && window.google.accounts && window.google.accounts.id;
  if (ready()) return Promise.resolve(ready());
  if (!gisLoading) {
    gisLoading = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = GIS_URL;
      script.async = true;
      script.onload = () => (ready() ? resolve(ready()) : reject(new Error('gis missing')));
      script.onerror = () => { gisLoading = null; reject(new Error('gis failed')); };
      document.head.appendChild(script);
    });
  }
  return gisLoading;
}

/**
 * Draw Google's button into `box` and hand each sign-in's credential (a
 * signed ID token) to `onCredential`. With `oneTap`, also ask Google's
 * prompt, which signs a returning visitor straight in where the browser
 * allows it. If the library cannot load — blocked, offline — the box is
 * hidden and the code still works, which is the whole fallback.
 */
function mountGoogle(box, onCredential, { oneTap = false } = {}) {
  return loadGis().then((gis) => {
    gis.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (r) => { if (r && r.credential) onCredential(r.credential); },
      auto_select: true,
      cancel_on_tap_outside: false,
      use_fedcm_for_prompt: true,
      itp_support: true,
      context: 'signin',
    });
    box.replaceChildren();
    box.hidden = false;
    gis.renderButton(box, { type: 'standard', theme: 'filled_black', size: 'large', text: 'signin_with', shape: 'pill' });
    if (oneTap) gis.prompt();
    return gis;
  }).catch(() => { box.hidden = true; return null; });
}

/** Close Google's one-tap prompt if it is up. */
function cancelGoogle() {
  try { window.google?.accounts?.id?.cancel(); } catch { /* nothing to close */ }
}

/**
 * The email inside a Google credential, for showing "signed in as" only.
 * Read without checking the signature — the Apps Script verifies the token
 * with Google before trusting anything in it.
 */
function emailOf(credential) {
  try {
    const part = credential.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const body = JSON.parse(decodeURIComponent(escape(atob(part))));
    return typeof body.email === 'string' ? body.email : '';
  } catch { return ''; }
}

/**
 * Link the Google account a visitor signs in with to the pass this browser
 * already holds, so they can get in on any device by signing in. For a page
 * whose visitors are already through the door — the library's
 * "Authenticated" badge. Resolves `{ ok, email }`; never rejects.
 *
 * @param {{game?: string}} [opts]
 */
export function linkGoogle(opts = {}) {
  const pass = readPass();
  if (!pass || !googleEnabled()) return Promise.resolve({ ok: false });
  const game = opts.game || 'library';

  return new Promise((resolve) => {
    const door = buildDoor({
      title: 'Link Google account',
      blurb: 'Sign in with Google to tie it to your access. After that you can get in on any device just by signing in, with no code.',
    });
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      cancelGoogle();
      door.close();
      resolve(result);
    };

    const cancel = document.createElement('button');
    cancel.textContent = 'Cancel';
    cancel.className = 'gate-back';
    cancel.onclick = () => finish({ ok: false });
    door.slot.append(cancel);

    mountGoogle(door.google, async (credential) => {
      door.note.className = 'gate-note';
      door.note.textContent = 'Linking ' + (emailOf(credential) || 'your account') + '…';
      try {
        const r = await post({ kind: 'link', game, id: pass.id, name: pass.name, credential });
        if (r && r.ok && typeof r.linked === 'string') {
          writePass({ ...pass, google: r.linked });
          door.google.hidden = true;
          door.note.textContent = 'Linked to ' + r.linked + '. Signing in with it now gets you in anywhere.';
          cancel.textContent = 'Done';
          setTimeout(() => finish({ ok: true, email: r.linked }), 2500);
          return;
        }
        door.note.className = 'gate-note gate-bad';
        door.note.textContent = googleRefusal(r && r.reason, 'link');
      } catch {
        door.note.className = 'gate-note gate-bad';
        door.note.textContent = 'Could not reach the guest list just now. Try again in a moment.';
      }
    }).then((gis) => {
      if (!gis) {
        door.note.className = 'gate-note gate-bad';
        door.note.textContent = "Google sign-in couldn't load here. Check that it isn't blocked, then try again.";
      }
    });
  });
}

/** What to say when the guest list turns a Google sign-in away. */
function googleRefusal(reason, during) {
  if (reason === 'revoked') return 'That access has been turned off. Ask for a new invite.';
  if (reason === 'google-off' || reason === 'unknown-kind') return "Google sign-in isn't switched on yet. Use your invite code.";
  if (reason === 'bad-token') return "Google couldn't confirm that sign-in. Try again.";
  if (during === 'link' && reason === 'unknown') return "This browser's access isn't on the guest list any more, so it can't be linked.";
  return 'That sign-in was not accepted. Try again, or use your invite code.';
}

// ---------- the invite in the address bar ----------

function codeFromUrl() {
  try {
    const v = new URL(location.href).searchParams.get(INVITE_PARAM);
    return v && v.trim() !== '' ? v.trim() : null;
  } catch { return null; }
}

/**
 * Take the gate's own parameters back out of the address bar once they are
 * spent.
 *
 * An invite link is a small secret and the address bar is the least private
 * place on a computer: screenshotted, read over shoulders, bookmarked,
 * autocompleted, and pasted into group chats by people meaning to share the
 * game rather than their own invite. Wiping it costs nothing — the pass is
 * stored by the time this runs — and leaves a clean URL to share.
 *
 * `gatereset` is stripped for a duller reason: left in place it would fire
 * again on the next reload, and testing an invite would mean being thrown back
 * to the door every time.
 */
function stripGateParams(...names) {
  try {
    const url = new URL(location.href);
    if (!names.some((n) => url.searchParams.has(n))) return;
    for (const n of names) url.searchParams.delete(n);
    history.replaceState(null, '', url.pathname + (url.search || '') + url.hash);
  } catch { /* nothing worth failing a boot over */ }
}

// ---------- the screen ----------

const CSS = `
.gate-veil {
  position: fixed; inset: 0; z-index: 2147483000;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px;
  background: radial-gradient(ellipse at 50% 35%, #1d222b 0%, #07090c 70%);
  font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; color: #e6ebf2;
  text-align: center; padding: 24px;
}
.gate-veil h1 {
  font-size: clamp(22px, 4.2vw, 40px); font-weight: 600; letter-spacing: 0.14em;
  text-transform: uppercase; color: #7fd1ff; margin: 0 0 2px;
}
.gate-veil p { max-width: 30rem; line-height: 1.55; font-size: 14px; color: #9fb0c4; margin: 0; }
.gate-veil .gate-slot { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; justify-content: center; }
.gate-veil input {
  background: rgba(8,10,14,0.8); border: 1px solid #33506b; border-radius: 4px;
  color: #eef4ff; font: inherit; font-size: 15px; letter-spacing: 0.12em;
  text-transform: uppercase; padding: 9px 14px; width: 15rem; text-align: center;
}
.gate-veil input:focus { outline: none; border-color: #7fd1ff; }
.gate-veil button {
  background: linear-gradient(180deg, #2f6b96, #1d4363); border: 1px solid #33506b;
  color: #eef4ff; font: inherit; font-size: 14px; padding: 9px 18px; border-radius: 4px; cursor: pointer;
}
.gate-veil button:hover { background: linear-gradient(180deg, #7fd1ff, #2f6b96); }
.gate-veil button:disabled { opacity: 0.5; cursor: default; }
.gate-veil .gate-back { background: transparent; border-color: transparent; opacity: 0.65; }
.gate-veil .gate-back:hover { background: transparent; opacity: 1; text-decoration: underline; }
.gate-veil .gate-google { display: flex; flex-direction: column; align-items: center; gap: 6px; min-height: 44px; }
.gate-veil .gate-google[hidden] { display: none; }
.gate-veil .gate-or { font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase; color: #71808f; }
.gate-veil .gate-who { font-size: 13px; color: #c9d6e4; }
.gate-veil .gate-who button { padding: 2px 6px; font-size: 12px; margin-left: 6px; }
.gate-veil .gate-note { font-size: 12px; color: #71808f; max-width: 26rem; min-height: 1.2em; }
.gate-veil .gate-bad { color: #ff9a7a; }
`;

function buildDoor(opts) {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  const veil = document.createElement('div');
  veil.className = 'gate-veil';
  // textContent for the host-supplied strings: they are configuration, and
  // configuration should not be able to inject markup into the page.
  veil.innerHTML = '<h1></h1><p class="gate-blurb"></p><div class="gate-slot"></div><div class="gate-google" hidden></div><p class="gate-note"></p>';
  veil.querySelector('h1').textContent = opts.title;
  veil.querySelector('.gate-blurb').textContent = opts.blurb;
  document.body.appendChild(veil);

  return {
    veil,
    slot: veil.querySelector('.gate-slot'),
    google: veil.querySelector('.gate-google'),
    note: veil.querySelector('.gate-note'),
    close() { veil.remove(); style.remove(); },
  };
}

// ---------- the gate ----------

/**
 * Resolves when the player may pass. Never rejects: a door that throws on the
 * boot path is a white screen, so every failure ends at a retry.
 *
 * `opts.dismissible` offers a way out of the door. A game has nothing behind
 * its door, so there is nowhere to go back to and no button to draw. A page
 * that uses the door as a *redeem box* — the arcade library, which is public
 * and merely hides the locked cards — does have something behind it, and
 * stranding a visitor on a veil they cannot dismiss would be a bug rather than
 * a policy. When set, `openGate` resolves on "Back" WITHOUT a pass, so a caller
 * that cares must check `readPass()` rather than assume resolution means
 * admission.
 *
 * `opts.ignorePublicAccess` keeps the door shut even while public access is
 * on. The switch exists to open the finished games to everyone for a while,
 * not unfinished prototypes or private test sites, so for those the check is
 * skipped and only a real pass gets through. Because the switch is never
 * asked, this cannot fail open whatever happens to the switch file.
 *
 * `opts.accessFile` (with `ignorePublicAccess`) names the page's own override,
 * resolved against the page: `{ "followPublicAccess": true }` there and the
 * page follows the switch like the finished games. Anything short of a clean
 * `true` — the file missing, a 404, bad JSON — keeps it locked, so a slip
 * never opens a prototype. See `followsPublicAccess`.
 *
 * `opts.endpoint` points this page at a different guest list, and
 * `opts.alwaysOn` keeps the door up even on localhost. Both exist for a host
 * that decides for itself whether it is gated — mando, which is gated exactly
 * when its build was given an endpoint, and whose test suite runs the real
 * door on a local server.
 *
 * @param {{title: string, blurb: string, game: string, dismissible?: boolean, ignorePublicAccess?: boolean, accessFile?: string, endpoint?: string, alwaysOn?: boolean, warm?: (signal: AbortSignal) => void}} opts
 */
export function openGate(opts) {
  if (typeof opts.endpoint === 'string' && opts.endpoint !== '') endpoint = opts.endpoint;
  if (opts.alwaysOn) forcedOn = true;
  // A console escape hatch for the owner, always available: forget this
  // browser's pass and come back to the door. Handy when testing an invite,
  // and harmless — forgetting a pass cannot let anybody in.
  try { window.gateReset = () => { clearPass(); location.reload(); }; } catch { /* sealed window */ }

  if (!gateEnabled()) return Promise.resolve();

  // `?gatereset=1` before anything reads the pass, so this turn sees no pass
  // and puts the door up.
  try {
    if (new URL(location.href).searchParams.has(RESET_PARAM)) {
      clearPass();
      // Strip it now rather than on the way through the door: the reset has
      // already happened, and left in the bar it would fire again on every
      // reload — so testing an invite would mean being thrown back to the door
      // each time. An `invite` alongside it is left alone; it has not been
      // spent yet.
      stripGateParams(RESET_PARAM);
    }
  } catch { /* an exotic URL is not worth failing a boot over */ }

  const pass = readPass();
  if (pass) {
    pingSession(pass, opts.game);
    stripGateParams(INVITE_PARAM, RESET_PARAM);
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    // Starts the instant there is no pass, before the public-access check
    // below has even answered: either way the game is coming — behind a door
    // about to show, or straight through with nothing to wait on — so there
    // is no reason to make that one round trip hold up the other.
    const warming = new AbortController();
    try { if (opts.warm) opts.warm(warming.signal); } catch (e) { console.warn('[gate] warm hook threw', e); }

    // Some pages never ask the switch unless their own file says to: see
    // `opts.ignorePublicAccess` and `opts.accessFile`.
    followsPublicAccess(opts)
      .then((follows) => (follows ? publicAccessOn() : false))
      .then((isPublic) => {
        if (isPublic) {
          // The owner's own switch, not an invite: nothing is written to
          // PASS_STORE, so a real friend's pass is untouched either way this
          // goes, and this is asked again on every visit by anyone who does
          // not hold one — turning the switch back off shows the door on the
          // very next load, with no stored state to clear first.
          pingSession({ id: PUBLIC_ID, name: PUBLIC_ID }, opts.game);
          stripGateParams(INVITE_PARAM, RESET_PARAM);
          resolve();
          return;
        }
        openDoor();
      });

    function openDoor() {
      const door = buildDoor(opts);
      let settled = false;
      // The Google sign-in waiting for a code to link to, if any.
      const google = { credential: null };

      const admit = (p) => {
        if (settled) return;
        settled = true;
        cancelGoogle();
        writePass(p);
        pingSession(p, opts.game);
        stripGateParams(INVITE_PARAM, RESET_PARAM);
        door.close();
        resolve();
      };

      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = 'invite code';
      input.autocomplete = 'off';
      input.spellcheck = false;
      input.setAttribute('aria-label', 'invite code');
      const go = document.createElement('button');
      go.textContent = 'Enter';
      door.slot.append(input, go);

      const submit = () => {
        const code = input.value.trim();
        if (code === '') { input.focus(); return; }
        redeem(code, { door, opts, admit, warming, input, go, google });
      };
      go.onclick = submit;
      input.onkeydown = (e) => { if (e.key === 'Enter') submit(); };

      if (opts.dismissible) {
        const back = document.createElement('button');
        back.textContent = 'Back';
        back.className = 'gate-back';
        back.onclick = () => {
          if (settled) return;
          settled = true;
          warming.abort();
          cancelGoogle();
          door.close();
          resolve();          // resolved WITHOUT a pass — see GateOptions.dismissible
        };
        door.slot.append(back);
      }

      const fromLink = codeFromUrl();
      if (fromLink) {
        // An invite link spends itself. The form stays underneath so a bad code
        // lands somewhere the visitor can correct it.
        input.value = fromLink;
        redeem(fromLink, { door, opts, admit, warming, input, go, google });
      } else {
        input.focus();
      }

      if (googleEnabled()) offerGoogle();

      /**
       * Google's button under the code box, and its one-tap prompt. A linked
       * account is let straight in; an unlinked one is held here until a code
       * is entered, and the code then links it.
       */
      function offerGoogle() {
        const or = document.createElement('span');
        or.className = 'gate-or';
        or.textContent = 'or';
        const button = document.createElement('div');
        // In the page (still hidden) before Google draws into it.
        door.google.replaceChildren(or, button);
        mountGoogle(button, signedIn, { oneTap: !fromLink }).then((gis) => {
          if (gis) door.google.hidden = false;
        });
      }

      async function signedIn(credential) {
        if (settled) return;
        const email = emailOf(credential);
        door.note.className = 'gate-note';
        door.note.textContent = 'Checking ' + (email || 'your Google account') + '…';
        try {
          const r = await post({ kind: 'google', game: opts.game, credential, client: clientInfo() });
          if (r && r.ok && typeof r.id === 'string' && r.id !== '') {
            admit({ id: r.id, name: r.name || r.id, since: Date.now(), google: r.email || email });
            return;
          }
          if (r && r.reason === 'unlinked') {
            // Hold the sign-in; the code links it.
            google.credential = credential;
            showSignedIn(email);
            door.note.className = 'gate-note';
            door.note.textContent = 'Enter your invite code once to link this Google account. After that, signing in is enough.';
            input.focus();
            return;
          }
          door.note.className = 'gate-note gate-bad';
          door.note.textContent = googleRefusal(r && r.reason, 'door');
        } catch {
          door.note.className = 'gate-note gate-bad';
          door.note.textContent = 'Could not reach the guest list just now. Try again in a moment.';
        }
      }

      /** Swap the button for "Signed in as …", with a way to change account. */
      function showSignedIn(email) {
        const who = document.createElement('span');
        who.className = 'gate-who';
        who.textContent = 'Signed in as ' + (email || 'your Google account');
        const change = document.createElement('button');
        change.className = 'gate-back';
        change.textContent = 'Not you?';
        change.onclick = () => {
          google.credential = null;
          door.note.textContent = '';
          try { window.google?.accounts?.id?.disableAutoSelect(); } catch { /* fine */ }
          offerGoogle();
        };
        who.append(change);
        door.google.replaceChildren(who);
        door.google.hidden = false;
      }
    }
  });
}

async function redeem(code, ctx) {
  const { door, opts, admit, warming, input, go, google } = ctx;
  const busy = (on) => { input.disabled = on; go.disabled = on; };
  busy(true);
  door.note.className = 'gate-note';
  door.note.textContent = 'Checking your invite…';
  try {
    const body = { kind: 'invite', game: opts.game, code, client: clientInfo() };
    // A Google sign-in held from earlier rides along, and the guest list links
    // it to this code. A guest list that predates Google ignores it.
    if (google && google.credential) body.credential = google.credential;
    const r = await post(body);
    if (r && r.ok && typeof r.id === 'string' && r.id !== '') {
      const pass = { id: r.id, name: r.name || r.id, since: Date.now() };
      if (typeof r.linked === 'string' && r.linked !== '') pass.google = r.linked;
      admit(pass);
      return;
    }
    // A definite no. Stop pulling down a game this visitor will not play.
    warming.abort();
    busy(false);
    door.note.className = 'gate-note gate-bad';
    door.note.textContent = (r && r.reason) === 'revoked'
      ? 'That invite has been turned off. Ask for a new one.'
      : "That invite code isn't recognised. Check it, or ask for a new one.";
    input.focus();
    input.select();
  } catch {
    // No answer at all. This does NOT open the door: the endpoint is the guest
    // list, and admitting everyone whenever a request fails would make the list
    // optional for anyone able to drop one. Friends already in hold a pass and
    // never reach this.
    busy(false);
    door.note.className = 'gate-note gate-bad';
    door.note.textContent = 'Could not reach the guest list just now. Try again in a moment.';
    input.focus();
  }
}
