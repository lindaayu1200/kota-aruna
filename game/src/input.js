// KOTA ARUNA — input for the third-person open-world layer.
//
// Keyboard: WASD / arrows move, Shift runs, Space jumps on foot (and is the handbrake in a car),
// F enters or leaves the nearest vehicle, 1-4 pick a weapon, R reloads. Mouse: left fires,
// right aims (slight zoom), drag across the canvas (or double-click for pointer lock) to orbit the
// follow camera, wheel to zoom. Jump, enter, weapon switches and reload are edge flags: they are
// consumed once by whichever system owns them, so a press between two fixed steps is never lost
// and never counted twice.

const MOVE_CODES = new Set([
  'KeyW', 'ArrowUp', 'KeyS', 'ArrowDown', 'KeyA', 'ArrowLeft', 'KeyD', 'ArrowRight',
]);
const WEAPON_CODES = new Set(['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Numpad1', 'Numpad2', 'Numpad3', 'Numpad4']);
const HANDLED = new Set([
  ...MOVE_CODES, ...WEAPON_CODES, 'ShiftLeft', 'ShiftRight', 'Space', 'KeyF', 'KeyL', 'KeyR',
]);

export function createInput(target) {
  const held = new Set();
  const state = {
    forward: false,
    back: false,
    left: false,
    right: false,
    run: false,
    handbrake: false,
  };

  let jumpEdge = false;
  let enterEdge = false;
  let weaponSlot = 0;
  let reloadEdge = false;
  let fireHeld = false;
  let aimHeld = false;
  let lookX = 0;
  let lookY = 0;
  let zoom = 0;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  function refresh() {
    state.forward = held.has('KeyW') || held.has('ArrowUp');
    state.back = held.has('KeyS') || held.has('ArrowDown');
    state.left = held.has('KeyA') || held.has('ArrowLeft');
    state.right = held.has('KeyD') || held.has('ArrowRight');
    state.run = held.has('ShiftLeft') || held.has('ShiftRight');
    state.handbrake = held.has('Space');
  }

  function onKeyDown(event) {
    if (!HANDLED.has(event.code)) return;
    event.preventDefault();
    if (!held.has(event.code) && !event.repeat) {
      if (event.code === 'Space') jumpEdge = true;
      else if (event.code === 'KeyF') enterEdge = true;
      else if (event.code === 'KeyR') reloadEdge = true;
      else if (WEAPON_CODES.has(event.code)) weaponSlot = Number(event.code.slice(-1));
      else if (event.code === 'KeyL' && target.requestPointerLock) {
        if (document.pointerLockElement === target) document.exitPointerLock();
        else target.requestPointerLock();
      }
    }
    held.add(event.code);
    refresh();
  }

  function onKeyUp(event) {
    if (!HANDLED.has(event.code)) return;
    event.preventDefault();
    held.delete(event.code);
    refresh();
  }

  function onBlur() {
    held.clear();
    dragging = false;
    fireHeld = false;
    aimHeld = false;
    jumpEdge = false;
    enterEdge = false;
    weaponSlot = 0;
    reloadEdge = false;
    refresh();
  }

  function onPointerDown(event) {
    if (event.button === 0) {
      fireHeld = true;
      dragging = true;
    } else if (event.button === 2) {
      aimHeld = true;
    } else {
      return;
    }
    lastX = event.clientX;
    lastY = event.clientY;
    if (target.setPointerCapture) {
      try { target.setPointerCapture(event.pointerId); } catch { /* ignore */ }
    }
  }

  function onPointerUp(event) {
    if (event.button === 0) {
      dragging = false;
      fireHeld = false;
    } else if (event.button === 2) {
      aimHeld = false;
    }
  }

  function onPointerMove(event) {
    if (document.pointerLockElement === target) {
      lookX += event.movementX || 0;
      lookY += event.movementY || 0;
    } else if (dragging || aimHeld) {
      lookX += event.clientX - lastX;
      lookY += event.clientY - lastY;
      lastX = event.clientX;
      lastY = event.clientY;
    }
  }

  function onContextMenu(event) {
    event.preventDefault();
  }

  function onDoubleClick() {
    if (target.requestPointerLock && document.pointerLockElement !== target) target.requestPointerLock();
  }

  function onWheel(event) {
    event.preventDefault();
    zoom += Math.sign(event.deltaY) * 2.5;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  target.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointermove', onPointerMove);
  target.addEventListener('dblclick', onDoubleClick);
  target.addEventListener('contextmenu', onContextMenu);
  target.addEventListener('wheel', onWheel, { passive: false });

  state.consumeJump = () => {
    const value = jumpEdge;
    jumpEdge = false;
    return value;
  };
  state.consumeEnter = () => {
    const value = enterEdge;
    enterEdge = false;
    return value;
  };
  // The returned object is reused: callers read it immediately and never keep it.
  const lookDelta = { x: 0, y: 0 };
  state.consumeLook = () => {
    lookDelta.x = lookX;
    lookDelta.y = lookY;
    lookX = 0;
    lookY = 0;
    return lookDelta;
  };
  state.consumeZoom = () => {
    const value = zoom;
    zoom = 0;
    return value;
  };
  state.consumeWeapon = () => {
    const value = weaponSlot;
    weaponSlot = 0;
    return value;
  };
  state.consumeReload = () => {
    const value = reloadEdge;
    reloadEdge = false;
    return value;
  };
  Object.defineProperties(state, {
    fire: { get: () => fireHeld, enumerable: true },
    aim: { get: () => aimHeld, enumerable: true },
  });
  state.dispose = () => {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('blur', onBlur);
    target.removeEventListener('pointerdown', onPointerDown);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointermove', onPointerMove);
    target.removeEventListener('dblclick', onDoubleClick);
    target.removeEventListener('contextmenu', onContextMenu);
    target.removeEventListener('wheel', onWheel);
  };

  return state;
}
