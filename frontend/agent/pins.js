// ==================== PIN BUTTONS ====================

function registerPinBtn(key, btn) {
  if (!PIN_BTN_REGISTRY[key]) PIN_BTN_REGISTRY[key] = new Set();
  PIN_BTN_REGISTRY[key].add(btn);
}

function unregisterPinBtn(key, btn) {
  if (PIN_BTN_REGISTRY[key]) PIN_BTN_REGISTRY[key].delete(btn);
}

function syncPinBtnUI(key, isPinned, animate) {
  const btns = PIN_BTN_REGISTRY[key];
  if (!btns) return;
  btns.forEach(btn => applyPinBtnState(btn, isPinned, animate));
}

function applyPinBtnState(btn, isPinned, animate) {
  btn.innerHTML = isPinned
    ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3 7h5l-4 4 1.5 7L12 17l-5.5 3L8 13 4 9h5z"/></svg>`
    : `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3 7h5l-4 4 1.5 7L12 17l-5.5 3L8 13 4 9h5z"/></svg>`;
  btn.title = isPinned ? 'Unpin' : 'Pin';
  if (isPinned) {
    btn.classList.add('pinned');
    if (animate) {
      btn.classList.remove('pin-pop');
      void btn.offsetWidth;
      btn.classList.add('pin-pop');
      btn.addEventListener('animationend', () => btn.classList.remove('pin-pop'), { once: true });
    }
  } else {
    btn.classList.remove('pinned');
  }
  btn.style.opacity = '';
}

function makePinButton(key) {
  const pins = getPinnedSet();
  const isPinned = pins.has(key);

  const btn = document.createElement('button');
  btn.className = 'pr-pin-btn' + (isPinned ? ' pinned' : '');
  btn.title = isPinned ? 'Unpin' : 'Pin';
  btn.innerHTML = isPinned
    ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3 7h5l-4 4 1.5 7L12 17l-5.5 3L8 13 4 9h5z"/></svg>`
    : `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3 7h5l-4 4 1.5 7L12 17l-5.5 3L8 13 4 9h5z"/></svg>`;

  registerPinBtn(key, btn);

  const observer = new MutationObserver(() => {
    if (!document.contains(btn)) { unregisterPinBtn(key, btn); observer.disconnect(); }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  btn.addEventListener('click', (e) => { e.stopPropagation(); togglePin(key); });
  return btn;
}

// Unpin-only button used inside the Pinned view
function makeUnpinButton(key, onUnpin) {
  const btn = document.createElement('button');
  btn.className = 'pr-pin-btn pinned';
  btn.title = 'Unpin';
  btn.style.opacity = '1';
  btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3 7h5l-4 4 1.5 7L12 17l-5.5 3L8 13 4 9h5z"/></svg>`;
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const [dateKey, idxStr] = key.split('::');
    const idx = parseInt(idxStr);
    const pairKey = getPairKey(dateKey, idx);
    const pins = getPinnedSet();
    pins.delete(key);
    if (pairKey) pins.delete(pairKey);
    setPinnedSet(pins);
    syncPinBtnUI(key, false, false);
    if (pairKey) syncPinBtnUI(pairKey, false, false);
    if (onUnpin) onUnpin();
  });
  return btn;
}