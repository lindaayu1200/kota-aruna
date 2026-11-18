// KOTA ARUNA — dialog with procedurally drawn portraits.
//
// Every face in the story is drawn from shapes on a small canvas: a differently sized silhouette,
// a distinct palette and a few accessories (cap, headphones, glasses, beard, tie). No image files,
// no borrowed characters. The dialog box lives at the bottom of the screen, supports a queue of
// lines, a typewriter reveal and E/click advance, and can offer a keyboard/mouse choice.

const STYLE = `
  position:fixed;left:50%;bottom:26px;transform:translateX(-50%);
  width:min(920px,calc(100% - 44px));min-height:152px;
  display:none;align-items:stretch;gap:18px;padding:16px 20px 16px 16px;box-sizing:border-box;
  background:linear-gradient(180deg,rgba(38,25,58,.96),rgba(17,12,29,.97));
  border:1px solid rgba(255,190,124,.62);border-radius:12px;
  box-shadow:0 18px 60px rgba(8,4,18,.72),0 0 0 1px rgba(255,110,90,.12) inset,0 0 34px rgba(255,150,90,.12);
  color:#ffe6c6;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;
  pointer-events:auto;user-select:none;cursor:pointer;z-index:8;
`;

/** Character definitions. `shoulder`/`head` change the silhouette; the rest is palette + extras. */
export const PORTRAITS = {
  ARA: {
    name: 'ARA', role: 'KURIR → KAPTEN KRU', skin: '#e9b79b', shade: '#c98f74',
    hair: '#241a24', top: '#ff6a3d', trim: '#ffc857', bg: '#4a2340', glow: '#ff9b6a',
    shoulder: 0.66, head: 1.0, hairStyle: 'cap', extra: 'sash',
  },
  DIMAS: {
    name: 'DIMAS', role: 'MEKANIK KRU', skin: '#c98f66', shade: '#a76c4c',
    hair: '#2a2320', top: '#3f7d99', trim: '#d9e9ea', bg: '#203a4d', glow: '#6fd0e8',
    shoulder: 0.86, head: 1.06, hairStyle: 'short', extra: 'beard',
  },
  SINTA: {
    name: 'SINTA', role: 'HAKER & PENGINTAI', skin: '#e6b995', shade: '#bd8b6c',
    hair: '#2c1d33', top: '#7b4fa8', trim: '#ff5fa2', bg: '#3a2258', glow: '#c07bff',
    shoulder: 0.6, head: 0.94, hairStyle: 'bob', extra: 'headphones',
  },
  BIMO: {
    name: 'BIMO', role: 'OTOT KRU', skin: '#a86b4a', shade: '#804c36',
    hair: '#1d1a1c', top: '#b5463a', trim: '#ffc857', bg: '#4d2626', glow: '#ff8a6a',
    shoulder: 1.0, head: 1.02, hairStyle: 'buzz', extra: 'stubble',
  },
  GERHAN: {
    name: 'PAK GERHAN', role: 'RAJA PELABUHAN', skin: '#c58f6a', shade: '#9d684a',
    hair: '#3a3436', top: '#2b3350', trim: '#e6c477', bg: '#25243c', glow: '#e6c477',
    shoulder: 0.94, head: 1.04, hairStyle: 'slick', extra: 'suit',
  },
  IDRUS: {
    name: 'PAK IDRUS', role: 'MENTOR KRU', skin: '#b57f5b', shade: '#8c5e42',
    hair: '#b9b2a6', top: '#2f6b6b', trim: '#d7d0bc', bg: '#1f454a', glow: '#7fd6cd',
    shoulder: 0.74, head: 1.0, hairStyle: 'cap', extra: 'beard',
  },
};
// Alternate keys so mission scripts can use either spelling.
PORTRAITS.PAK_GERHAN = PORTRAITS.GERHAN;
PORTRAITS.PAK_IDRUS = PORTRAITS.IDRUS;

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

/** Paint one portrait into an HTML canvas, sized from canvas.width. */
export function drawPortrait(canvas, id) {
  if (!canvas || typeof canvas.getContext !== 'function') return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const p = PORTRAITS[id] || PORTRAITS.ARA;
  const S = canvas.width;
  const k = S / 128;
  ctx.save();
  ctx.scale(k, k);
  ctx.clearRect(0, 0, 128, 128);

  // Background panel and a soft halo behind the head.
  const bg = ctx.createLinearGradient(0, 0, 128, 128);
  bg.addColorStop(0, p.bg);
  bg.addColorStop(1, '#120d1f');
  ctx.fillStyle = bg;
  roundRect(ctx, 0, 0, 128, 128, 8);
  ctx.fill();
  const halo = ctx.createRadialGradient(64, 52, 4, 64, 52, 62);
  halo.addColorStop(0, `${p.glow}66`);
  halo.addColorStop(1, `${p.glow}00`);
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, 128, 128);

  // Shoulders: width is the main silhouette difference between the crew.
  const shoulderW = 58 * p.shoulder;
  ctx.fillStyle = p.top;
  ctx.beginPath();
  ctx.moveTo(64 - 13, 96);
  ctx.quadraticCurveTo(64 - shoulderW * 0.62, 96, 64 - shoulderW, 128);
  ctx.lineTo(64 + shoulderW, 128);
  ctx.quadraticCurveTo(64 + shoulderW * 0.62, 96, 64 + 13, 96);
  ctx.closePath();
  ctx.fill();
  // Collar / neck.
  ctx.fillStyle = p.shade;
  roundRect(ctx, 55, 84, 18, 18, 5);
  ctx.fill();

  // Head and ears.
  const headW = 25 * p.head;
  const headH = 30 * p.head;
  ctx.fillStyle = p.skin;
  ctx.beginPath();
  ctx.ellipse(64, 55, headW, headH, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(64 - headW, 57, 4.5, 7, 0, 0, Math.PI * 2);
  ctx.ellipse(64 + headW, 57, 4.5, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  // Hair styles.
  ctx.fillStyle = p.hair;
  if (p.hairStyle === 'cap') {
    ctx.beginPath();
    ctx.ellipse(64, 45, headW + 1.5, headH * 0.72, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = p.trim;
    roundRect(ctx, 64 - headW - 5, 42, headW * 2 + 10, 5, 2.5);
    ctx.fill();
    ctx.fillStyle = p.hair;
    roundRect(ctx, 64 - headW, 28, headW * 2, 15, 6);
    ctx.fill();
  } else if (p.hairStyle === 'bob') {
    ctx.beginPath();
    ctx.ellipse(64, 48, headW + 5, headH * 0.92, 0, Math.PI, 0);
    ctx.fill();
    roundRect(ctx, 64 - headW - 4, 44, 8, 36, 4);
    ctx.fill();
    roundRect(ctx, 64 + headW - 4, 44, 8, 36, 4);
    ctx.fill();
  } else if (p.hairStyle === 'buzz') {
    ctx.beginPath();
    ctx.ellipse(64, 47, headW + 0.5, headH * 0.66, 0, Math.PI, 0);
    ctx.fill();
  } else if (p.hairStyle === 'slick') {
    ctx.beginPath();
    ctx.ellipse(64, 46, headW + 1, headH * 0.6, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#6c6264';
    ctx.beginPath();
    ctx.ellipse(57, 37, 9, 3, -0.35, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.ellipse(64, 46, headW + 2, headH * 0.7, 0, Math.PI, 0);
    ctx.fill();
  }

  // Face: brows, eyes, nose, mouth.
  ctx.strokeStyle = 'rgba(35,22,30,.85)';
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  for (const side of [-1, 1]) {
    const ex = 64 + side * 9;
    ctx.beginPath();
    ctx.moveTo(ex - 4, 50 + side * 0);
    ctx.lineTo(ex + 4, 49);
    ctx.stroke();
    ctx.fillStyle = '#fff3e2';
    ctx.beginPath();
    ctx.ellipse(ex, 57, 4.2, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2a1c24';
    ctx.beginPath();
    ctx.ellipse(ex, 57, 2, 2.4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = p.shade;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(64, 57);
  ctx.lineTo(62, 67);
  ctx.lineTo(66, 68);
  ctx.stroke();

  // Accessories, drawn last so they sit over the face/clothes.
  if (p.extra === 'beard') {
    ctx.fillStyle = p.hair;
    ctx.beginPath();
    ctx.ellipse(64, 76, headW * 0.72, 10, 0, 0, Math.PI);
    ctx.fill();
    roundRect(ctx, 53, 62, 22, 5, 2);
    ctx.fill();
  } else if (p.extra === 'stubble') {
    ctx.fillStyle = 'rgba(30,22,24,.42)';
    ctx.beginPath();
    ctx.ellipse(64, 75, headW * 0.68, 8, 0, 0, Math.PI);
    ctx.fill();
  } else if (p.extra === 'headphones') {
    ctx.strokeStyle = p.trim;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(64, 55, headW + 7, Math.PI * 1.08, Math.PI * 1.92);
    ctx.stroke();
    ctx.fillStyle = p.trim;
    roundRect(ctx, 64 - headW - 9, 53, 8, 15, 3);
    ctx.fill();
    roundRect(ctx, 64 + headW + 1, 53, 8, 15, 3);
    ctx.fill();
  } else if (p.extra === 'suit') {
    ctx.fillStyle = '#1b2034';
    ctx.beginPath();
    ctx.moveTo(64, 96);
    ctx.lineTo(52, 101);
    ctx.lineTo(64, 119);
    ctx.lineTo(76, 101);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = p.trim;
    ctx.beginPath();
    ctx.moveTo(64, 100);
    ctx.lineTo(68, 105);
    ctx.lineTo(64, 118);
    ctx.lineTo(60, 105);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#3a3032';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(54, 71);
    ctx.lineTo(74, 71);
    ctx.stroke();
  } else if (p.extra === 'sash') {
    ctx.fillStyle = p.trim;
    ctx.beginPath();
    ctx.moveTo(44, 108);
    ctx.lineTo(84, 98);
    ctx.lineTo(86, 104);
    ctx.lineTo(46, 114);
    ctx.closePath();
    ctx.fill();
  }

  // Mouth last: a small line, a smirk for the tycoon.
  ctx.strokeStyle = p.shade;
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (p.extra === 'suit') {
    ctx.moveTo(58, 74);
    ctx.quadraticCurveTo(64, 78, 71, 72);
  } else {
    ctx.moveTo(59, 74);
    ctx.quadraticCurveTo(64, 77, 69, 74);
  }
  ctx.stroke();
  ctx.restore();
}

/** A dialog line may be an object, a [speaker, text] pair, or a bare string by Ara. */
function normalizeLine(input) {
  if (typeof input === 'string') return { type: 'line', speaker: 'ARA', text: input };
  if (Array.isArray(input)) return { type: 'line', speaker: input[0] || 'ARA', text: String(input[1] ?? '') };
  const line = input || {};
  if (line.type === 'choice' || Array.isArray(line.choices)) {
    return {
      type: 'choice', speaker: line.speaker || 'ARA', text: String(line.text ?? ''),
      choices: (line.choices || []).map((c) => ({
        label: String(c.label ?? c.text ?? 'Pilih'),
        value: c.value ?? c.label,
        reward: c.reward,
        lines: c.lines || [],
        action: typeof c.action === 'function' ? c.action : null,
      })),
    };
  }
  return { type: 'line', speaker: line.speaker || 'ARA', text: String(line.text ?? '') };
}

/**
 * @param {{container?:HTMLElement, onEvent?:(type:string,data:object)=>void}} options
 */
export function createDialog(options = {}) {
  const listeners = new Set();
  const emit = (type, data) => {
    for (const fn of listeners) {
      try { fn(type, data || {}); } catch { /* ignore listener failures */ }
    }
    if (typeof options.onEvent === 'function') options.onEvent(type, data || {});
  };

  // Headless guard: keeps the API safe to import in a non-browser tool.
  if (typeof document === 'undefined') {
    const stub = {
      say() {}, queue() {}, play(lines, done) { if (typeof done === 'function') done(); },
      choose() {}, advance() {}, skip() {}, clear() {}, update() {},
      isActive: () => false, getLine: () => null, on(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    };
    return stub;
  }

  const container = options.container || document.getElementById('hud') || document.body;
  const root = document.createElement('div');
  root.className = 'kota-dialog';
  root.style.cssText = STYLE;
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-live', 'polite');

  const portrait = document.createElement('canvas');
  portrait.width = 128;
  portrait.height = 128;
  portrait.style.cssText = 'width:118px;height:118px;flex:0 0 118px;border-radius:8px;'
    + 'border:1px solid rgba(255,205,150,.4);box-shadow:0 0 22px rgba(255,140,90,.18)';

  const body = document.createElement('div');
  body.style.cssText = 'flex:1;min-width:0;display:flex;flex-direction:column;justify-content:center';
  const head = document.createElement('div');
  head.style.cssText = 'display:flex;align-items:baseline;gap:12px;margin-bottom:7px';
  const nameEl = document.createElement('span');
  nameEl.style.cssText = 'font:800 16px/1.2 system-ui,sans-serif;letter-spacing:.16em;color:#ffcf8b;'
    + 'text-shadow:0 2px 10px rgba(255,120,60,.45)';
  const roleEl = document.createElement('span');
  roleEl.style.cssText = 'font:10px/1.2 ui-monospace,monospace;letter-spacing:.1em;color:#b9a6d8;opacity:.85';
  head.append(nameEl, roleEl);
  const textEl = document.createElement('div');
  textEl.style.cssText = 'font:15px/1.55 system-ui,sans-serif;min-height:48px;color:#ffeed8;'
    + 'text-shadow:0 1px 4px rgba(0,0,0,.6)';
  const choicesEl = document.createElement('div');
  choicesEl.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;margin-top:8px';
  const hintEl = document.createElement('div');
  hintEl.style.cssText = 'font:10px/1 ui-monospace,monospace;letter-spacing:.12em;color:#ffc857;'
    + 'opacity:.8;text-align:right;margin-top:6px';
  body.append(head, textEl, choicesEl, hintEl);
  root.append(portrait, body);
  container.appendChild(root);

  let items = [];
  let index = -1;
  let current = null;
  let fullText = '';
  let visibleChars = 0;
  let typingDone = false;
  let doneCallback = null;

  function renderTyping() {
    textEl.textContent = fullText.slice(0, Math.floor(visibleChars));
  }

  function renderChoices() {
    choicesEl.replaceChildren();
    if (!current || current.type !== 'choice' || !typingDone) return;
    current.choices.forEach((choice, i) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = `${i + 1}. ${choice.label}`;
      button.style.cssText = 'pointer-events:auto;cursor:pointer;padding:8px 14px;border-radius:7px;'
        + 'border:1px solid rgba(255,205,140,.55);background:rgba(70,42,86,.85);color:#ffe6c6;'
        + 'font:12px/1.3 system-ui,sans-serif;letter-spacing:.04em';
      button.addEventListener('pointerenter', () => {
        button.style.background = 'rgba(150,70,86,.9)';
      });
      button.addEventListener('pointerleave', () => {
        button.style.background = 'rgba(70,42,86,.85)';
      });
      button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        choose(i);
      });
      choicesEl.appendChild(button);
    });
    hintEl.textContent = 'PILIH 1-2  /  KLIK';
  }

  function showItem() {
    current = items[index] || null;
    if (!current) {
      finish();
      return;
    }
    const def = PORTRAITS[current.speaker] || PORTRAITS.ARA;
    drawPortrait(portrait, PORTRAITS[current.speaker] ? current.speaker : 'ARA');
    nameEl.textContent = def.name || String(current.speaker);
    roleEl.textContent = def.role || '';
    fullText = current.text;
    visibleChars = 0;
    typingDone = fullText.length === 0;
    textEl.textContent = '';
    choicesEl.replaceChildren();
    hintEl.textContent = 'E / KLIK ▸';
    root.style.display = 'flex';
    if (typingDone) renderChoices();
    emit('line', { speaker: nameEl.textContent, text: fullText, index });
  }

  function finish() {
    const callback = doneCallback;
    root.style.display = 'none';
    items = [];
    index = -1;
    current = null;
    fullText = '';
    visibleChars = 0;
    doneCallback = null;
    emit('end', {});
    if (typeof callback === 'function') callback();
  }

  function next() {
    index += 1;
    if (index < items.length) showItem();
    else finish();
  }

  function choose(i) {
    if (!current || current.type !== 'choice' || !typingDone) return;
    const choice = current.choices[i];
    if (!choice) return;
    emit('choice', { speaker: nameEl.textContent, value: choice.value, label: choice.label });
    // Close before the action: the action may open a fresh dialog (an ending, a new job, ...).
    finish();
    if (typeof choice.action === 'function') {
      try { choice.action(choice); } catch (error) { console.error('[dialog] choice action failed', error); }
    }
  }

  function begin(lines, done) {
    root.style.display = 'none';
    items = (Array.isArray(lines) ? lines : [lines]).map(normalizeLine);
    index = -1;
    current = null;
    doneCallback = typeof done === 'function' ? done : null;
    if (items.length) {
      emit('start', { count: items.length });
      next();
    } else if (doneCallback) {
      const cb = doneCallback;
      doneCallback = null;
      cb();
    }
  }

  function onKey(event) {
    if (!current) return;
    if (event.code === 'KeyE' || event.code === 'Enter' || event.code === 'NumpadEnter') {
      event.preventDefault();
      advance();
      return;
    }
    if (event.code === 'Escape') {
      event.preventDefault();
      skip();
      return;
    }
    if (current.type === 'choice' && typingDone) {
      const match = /^(?:Digit|Numpad)([1-9])$/.exec(event.code);
      if (match) {
        event.preventDefault();
        choose(Number(match[1]) - 1);
      }
    }
  }

  root.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.target && typeof event.target.closest === 'function' && event.target.closest('button')) return;
    advance();
  });
  window.addEventListener('keydown', onKey);

  return {
    /** Add one line to the queue; starts playing immediately if idle. */
    say(speaker, text) {
      const line = normalizeLine([speaker, text]);
      if (!current) {
        begin([line], null);
      } else {
        items.splice(index + 1, 0, line);
      }
    },
    /** Add several lines to the queue without interrupting a running conversation. */
    queue(lines) {
      const normalized = (Array.isArray(lines) ? lines : [lines]).map(normalizeLine);
      if (!current) begin(normalized, null);
      else items.push(...normalized);
    },
    /** Replace the queue and call `done` once the last line is dismissed. */
    play(lines, done) { begin(lines, done); },
    /** Queue a multiple-choice prompt; each choice may carry an action. */
    choose(speaker, text, choices, done) {
      begin([{ type: 'choice', speaker, text, choices }], done);
    },
    advance() {
      if (!current) return;
      if (!typingDone) {
        visibleChars = fullText.length;
        typingDone = true;
        renderTyping();
        renderChoices();
        return;
      }
      if (current.type === 'choice') return;
      next();
    },
    /** Finish the current conversation early (still runs its done callback). */
    skip() {
      if (!current) return;
      finish();
    },
    clear() {
      root.style.display = 'none';
      items = [];
      index = -1;
      current = null;
      fullText = '';
      doneCallback = null;
    },
    update(dt) {
      if (!current || typingDone) return;
      visibleChars += Math.max(0, dt) * 58;
      if (visibleChars >= fullText.length) {
        visibleChars = fullText.length;
        typingDone = true;
        renderChoices();
      }
      renderTyping();
    },
    isActive: () => !!current,
    getLine: () => current && { speaker: current.speaker, text: current.text, type: current.type },
    on(fn) {
      if (typeof fn === 'function') listeners.add(fn);
      return () => listeners.delete(fn);
    },
    root,
    portrait,
    dispose() {
      window.removeEventListener('keydown', onKey);
      if (root.parentNode) root.parentNode.removeChild(root);
    },
  };
}
