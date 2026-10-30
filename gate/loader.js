/**
 * THE DOOR'S LOADER — what each game carries as its own `gate.js`.
 *
 * The door itself lives once, at https://games.hoai.net/gate/gate.js (the
 * library repository's `gate/gate.js`), and this file fetches it at boot, so
 * a change to the door reaches every game without redeploying any of them.
 * Copy this file byte for byte into a game as `gate.js`; the game keeps
 * calling `openGate(opts)` exactly as before.
 *
 * What it does on its own, without the shared door:
 *
 *  - Off locally. On localhost, a file:// page or a LAN address, `openGate`
 *    resolves at once, as the door always has. `?gatetest=1` shows the real
 *    door, fetched from games.hoai.net.
 *  - A friend who already holds a pass is let straight in, without waiting on
 *    the network; the shared door is still fetched in the background to log
 *    the session. At a page that ignores the public-access switch, only a
 *    full pass with a linked Google account is let straight in; anything
 *    else is handed to the shared door, which asks for what is missing.
 *  - If the shared door cannot be fetched and there is no pass, a plain
 *    "try again" screen stands in front of the game. That fails closed, like
 *    the door does when it cannot reach the guest list.
 *
 * `readPass` and `clearPass` read the same localStorage key as the door, so
 * they stay synchronous here.
 */

const SHARED_DOOR = 'https://games.hoai.net/gate/gate.js';
const PASS_STORE = 'gate.pass';

function isLocal() {
  const h = location.hostname;
  return h === '' || h === 'localhost' || h === '127.0.0.1' || h === '::1' || h === '0.0.0.0'
    || h.endsWith('.local') || /^192\.168\./.test(h) || /^10\./.test(h);
}

function hasParam(name) {
  try { return new URL(location.href).searchParams.has(name); } catch { return false; }
}

function gateEnabled() {
  return hasParam('gatetest') || !isLocal();
}

let door = null;
function sharedDoor() {
  if (!door) door = import(/* @vite-ignore */ SHARED_DOOR).catch((e) => { door = null; throw e; });
  return door;
}

export function readPass() {
  try {
    const raw = localStorage.getItem(PASS_STORE);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (!p || typeof p.id !== 'string' || p.id === '') return null;
    const pass = { id: p.id, name: typeof p.name === 'string' ? p.name : p.id, since: p.since || Date.now() };
    if (p.scope === 'public') pass.scope = 'public';
    if (typeof p.google === 'string' && p.google !== '') pass.google = p.google;
    return pass;
  } catch {
    return null;
  }
}

export function clearPass() {
  try { localStorage.removeItem(PASS_STORE); } catch { /* private mode */ }
}

export async function publicAccessOn() {
  if (!gateEnabled()) return false;
  try { return await (await sharedDoor()).publicAccessOn(); } catch { return false; }
}

/**
 * Resolves when the player may pass. Never rejects. Same options as the
 * shared door's `openGate`.
 */
export function openGate(opts) {
  try { window.gateReset = () => { clearPass(); location.reload(); }; } catch { /* sealed window */ }
  if (!gateEnabled()) return Promise.resolve();

  const pass = readPass();
  // A page that stays locked while public access is on lets in only a full
  // pass with a Google account straight away; the shared door handles the rest.
  const locked = !!(opts && opts.ignorePublicAccess);
  if (pass && !hasParam('gatereset') && (!locked || (!pass.scope && pass.google))) {
    // Already in. The shared door logs the session and tidies the address bar.
    sharedDoor().then((m) => m.openGate(opts)).catch(() => {});
    return Promise.resolve();
  }

  return sharedDoor().then((m) => m.openGate(opts), () => unreachable(opts));
}

/** The shared door could not be fetched and there is no pass to fall back on. */
function unreachable(opts) {
  return new Promise((resolve) => {
    const veil = document.createElement('div');
    // The door's own class: pages that hide everything but the door while
    // locked (the mini private sites) must still show this.
    veil.className = 'gate-veil';
    veil.style.cssText = 'position:fixed;inset:0;z-index:2147483000;display:flex;flex-direction:column;'
      + 'align-items:center;justify-content:center;gap:16px;padding:24px;text-align:center;'
      + 'background:#07090c;color:#e6ebf2;font:14px/1.5 system-ui,sans-serif';
    const msg = document.createElement('p');
    msg.textContent = "Couldn't load the sign-in screen. Check your connection and try again.";
    const retry = document.createElement('button');
    retry.textContent = 'Try again';
    retry.onclick = () => location.reload();
    veil.append(msg, retry);
    if (opts && opts.dismissible) {
      const back = document.createElement('button');
      back.textContent = 'Back';
      back.onclick = () => { veil.remove(); resolve(); };
      veil.append(back);
    }
    document.body.appendChild(veil);
  });
}
