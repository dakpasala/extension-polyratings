// ==================== HISTORY VIEW ====================

function renderHistoryView(messagesArea) {
  const popup = messagesArea.closest('.pr-agent-popup');
  const existingHeader = popup.querySelector('.pr-history-sticky-header');
  if (existingHeader) existingHeader.remove();
  const existingPill = popup.querySelector('.pr-back-to-top-pill');
  if (existingPill) existingPill.remove();

  const inputArea = popup?.querySelector('.pr-agent-input');
  const history = getChatHistory();
  const dates = Object.keys(history);

  // ── Build sticky header ──
  const stickyHeader = document.createElement('div');
  stickyHeader.className = 'pr-history-sticky-header';
  stickyHeader.style.cssText = 'background:#fff;padding:10px 16px 0;border-bottom:1px solid #f0f0f0;flex-shrink:0;';

  const topBar = document.createElement('div');
  topBar.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;';

  const backBtn = document.createElement('div');
  backBtn.style.cssText = 'display:inline-flex;align-items:center;gap:5px;color:#999;font-size:13px;font-weight:500;cursor:pointer;transition:color 0.15s;';
  backBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg> Back`;
  backBtn.addEventListener('mouseenter', () => backBtn.style.color = '#333');
  backBtn.addEventListener('mouseleave', () => backBtn.style.color = '#999');
  backBtn.addEventListener('click', () => navigateBackToChat(popup, messagesArea));

  let selectMode = false;
  const selectedMessages = new Set();

  const selectBtn = document.createElement('div');
  selectBtn.style.cssText = 'font-size:12px;font-weight:500;color:#999;cursor:pointer;padding:4px 8px;border-radius:6px;transition:all 0.15s;';
  selectBtn.textContent = 'Select';
  selectBtn.addEventListener('mouseenter', () => { selectBtn.style.color = '#333'; selectBtn.style.background = '#f0f0f0'; });
  selectBtn.addEventListener('mouseleave', () => { selectBtn.style.color = selectMode ? BRAND.green : '#999'; selectBtn.style.background = selectMode ? BRAND.greenLight : 'transparent'; });

  topBar.appendChild(backBtn);
  topBar.appendChild(selectBtn);
  stickyHeader.appendChild(topBar);

  // Search bar
  const { searchWrap, searchInput } = buildSearchBar('Search messages…');
  stickyHeader.appendChild(searchWrap);

  fadeTransition(messagesArea, popup, 150, 200, () => {
    messagesArea.innerHTML = '';
    if (inputArea) inputArea.style.display = 'none';
    messagesArea.style.paddingTop = '8px';
    messagesArea.style.transform = 'translateY(0)';
    popup.insertBefore(stickyHeader, messagesArea);

    const contentArea = document.createElement('div');
    contentArea.className = 'history-content-area';
    messagesArea.appendChild(contentArea);

    // ── Action bar ──
    const { actionBar, actionPill, actionCount, cancelSelBtn, pinSelBtn, deleteSelBtn } = buildActionBar(true);
    messagesArea.appendChild(actionBar);

    const backToTop = makeBackToTopPill(popup, messagesArea);

    function updateActionBar() {
      const count = selectedMessages.size;
      if (count > 0) {
        if (actionBar.style.display !== 'flex') {
          actionBar.style.display = 'flex';
          actionPill.style.opacity = '0'; actionPill.style.transform = 'translateY(8px) scale(0.95)';
          requestAnimationFrame(() => {
            actionPill.style.transition = 'opacity 0.22s ease, transform 0.22s cubic-bezier(0.34,1.2,0.64,1)';
            actionPill.style.opacity = '1'; actionPill.style.transform = 'translateY(0) scale(1)';
          });
        }
        actionCount.textContent = `${count} selected`;
        pinSelBtn.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3 7h5l-4 4 1.5 7L12 17l-5.5 3L8 13 4 9h5z"/></svg> Pin (${count})`;
        deleteSelBtn.textContent = `Delete (${count})`;
        hidePill(backToTop);
      } else {
        actionPill.style.transition = 'opacity 0.15s ease, transform 0.15s ease';
        actionPill.style.opacity = '0'; actionPill.style.transform = 'translateY(6px) scale(0.95)';
        setTimeout(() => { actionBar.style.display = 'none'; }, 150);
      }
    }

    function exitSelectMode() {
      selectMode = false; selectedMessages.clear();
      selectBtn.textContent = 'Select'; selectBtn.style.color = '#999'; selectBtn.style.background = 'transparent';
      actionPill.style.transition = 'opacity 0.15s ease, transform 0.15s ease';
      actionPill.style.opacity = '0'; actionPill.style.transform = 'translateY(6px) scale(0.95)';
      setTimeout(() => { actionBar.style.display = 'none'; }, 200);
      contentArea.querySelectorAll('[data-select-row]').forEach(row => {
        const isBot = row.getAttribute('data-select-role') !== 'user';
        const circle = row.querySelector('.select-circle');
        if (circle) { circle.style.transition = 'opacity 0.28s ease, transform 0.28s ease'; circle.style.opacity = '0'; circle.style.transform = 'translateY(6px) scale(0.4)'; }
        if (isBot) { row.style.transition = 'transform 0.32s cubic-bezier(0.4,0,0.2,1)'; row.style.transform = 'translateX(0)'; }
        row.style.background = 'transparent';
      });
      setTimeout(() => contentArea.querySelectorAll('.select-circle').forEach(c => c.remove()), 300);
    }

    function enterSelectMode() {
      selectMode = true;
      selectBtn.textContent = 'Done'; selectBtn.style.color = BRAND.green; selectBtn.style.background = BRAND.greenLight;
      contentArea.querySelectorAll('[data-select-row]').forEach(row => {
        const isBot = row.getAttribute('data-select-role') !== 'user';
        row.style.position = 'relative';
        if (isBot) { row.style.transition = 'transform 0.32s cubic-bezier(0.4,0,0.2,1)'; row.style.transform = 'translateX(28px)'; }
        setTimeout(() => addSelectCircle(row, selectedMessages, updateActionBar), 80);
      });
    }

    selectBtn.addEventListener('click', () => { if (selectMode) exitSelectMode(); else enterSelectMode(); });
    cancelSelBtn.addEventListener('click', () => exitSelectMode());

    pinSelBtn.addEventListener('click', () => {
      if (selectedMessages.size === 0) return;
      const pins = getPinnedSet();
      const alreadyPinned = [...selectedMessages].filter(k => pins.has(k)).length;
      const shouldPin = alreadyPinned < selectedMessages.size / 2;
      selectedMessages.forEach(key => {
        const [dk, idxStr] = key.split('::');
        const pairKey = getPairKey(dk, parseInt(idxStr));
        if (shouldPin) { pins.add(key); if (pairKey) pins.add(pairKey); }
        else { pins.delete(key); if (pairKey) pins.delete(pairKey); }
        syncPinBtnUI(key, pins.has(key), true);
        if (pairKey) syncPinBtnUI(pairKey, pins.has(pairKey), true);
      });
      setPinnedSet(pins);
      exitSelectMode();
    });

    deleteSelBtn.addEventListener('click', () => {
      if (selectedMessages.size === 0) return;
      const hist = getChatHistory(), toDelete = {};
      selectedMessages.forEach(key => { const [dk,idx] = key.split('::'); if (!toDelete[dk]) toDelete[dk] = []; toDelete[dk].push(parseInt(idx)); });
      Object.entries(toDelete).forEach(([dk, indices]) => { if (!hist[dk]) return; indices.sort((a,b)=>b-a).forEach(i=>hist[dk].splice(i,1)); if (hist[dk].length===0) delete hist[dk]; });
      localStorage.setItem(CHAT_HISTORY.STORAGE_KEY, JSON.stringify(hist));
      const pins = getPinnedSet();
      selectedMessages.forEach(key => pins.delete(key));
      setPinnedSet(pins);
      exitSelectMode();
      fadeContent(contentArea, () => { contentArea.innerHTML = ''; renderFullHistory(contentArea, getChatHistory(), Object.keys(getChatHistory())); });
    });

    renderFullHistory(contentArea, history, dates);

    let searchTimeout = null;
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      if (selectMode) exitSelectMode();
      searchTimeout = setTimeout(() => {
        const term = searchInput.value.trim();
        fadeContent(contentArea, () => {
          contentArea.innerHTML = '';
          if (!term) renderFullHistory(contentArea, history, dates);
          else renderSearchResults(contentArea, term, messagesArea);
        });
      }, 200);
    });

    attachScrollBehaviour(messagesArea, searchWrap, backToTop, () => actionBar.style.display === 'flex');

    requestAnimationFrame(() => setTimeout(() => stickyHeader.classList.add('visible'), 40));
    setTimeout(() => searchInput.focus(), 260);
  });
}

// ── Shared select circle builder ──
function addSelectCircle(row, selectedMessages, updateActionBar) {
  if (row.querySelector('.select-circle')) return;
  const key = row.getAttribute('data-select-key');
  const isBot = row.getAttribute('data-select-role') !== 'user';
  const circle = document.createElement('div');
  circle.className = 'select-circle';
  circle.style.cssText = `position:absolute;left:${isBot ? '-26px' : '4px'};top:0;transform:translateY(6px) scale(0.5);opacity:0;width:18px;height:18px;border-radius:50%;border:1.5px solid #ddd;cursor:pointer;display:flex;align-items:center;justify-content:center;background:white;transition:opacity 0.2s ease,transform 0.2s cubic-bezier(0.34,1.3,0.64,1),background 0.15s,border-color 0.15s;`;
  row.appendChild(circle);
  requestAnimationFrame(() => { circle.style.opacity = '1'; circle.style.transform = 'translateY(6px) scale(1)'; });
  circle.addEventListener('click', (e) => {
    e.stopPropagation();
    if (selectedMessages.has(key)) {
      selectedMessages.delete(key);
      circle.style.transform = 'translateY(6px) scale(0.8)';
      setTimeout(() => { circle.style.transform = 'translateY(6px) scale(1)'; }, 120);
      circle.style.background = 'white'; circle.style.borderColor = '#ddd'; circle.innerHTML = '';
      row.style.background = 'transparent';
    } else {
      selectedMessages.add(key);
      circle.style.transform = 'translateY(6px) scale(1.25)';
      setTimeout(() => { circle.style.transform = 'translateY(6px) scale(1)'; }, 120);
      circle.style.background = BRAND.green; circle.style.borderColor = BRAND.green;
      circle.innerHTML = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>';
      row.style.transition = 'background 0.15s ease, transform 0.32s cubic-bezier(0.4,0,0.2,1)';
      row.style.background = BRAND.greenLight;
    }
    updateActionBar();
  });
}

// ── Shared action bar builder ──
function buildActionBar(includePin) {
  const actionBar = document.createElement('div');
  actionBar.style.cssText = 'position:sticky;bottom:12px;left:50%;display:none;justify-content:center;margin-top:8px;';
  const actionPill = document.createElement('div');
  actionPill.style.cssText = 'display:flex;align-items:center;gap:2px;background:#fff;border:1px solid #e8e8e8;border-radius:20px;padding:4px;box-shadow:0 4px 16px rgba(0,0,0,0.1),0 1px 4px rgba(0,0,0,0.06);';
  const actionCount = document.createElement('span');
  actionCount.style.cssText = 'font-size:12px;font-weight:500;color:#666;padding:0 10px;';
  const divider = document.createElement('div');
  divider.style.cssText = 'width:1px;height:18px;background:#eee;margin:0 2px;flex-shrink:0;';
  const cancelSelBtn = document.createElement('button');
  cancelSelBtn.style.cssText = 'background:none;color:#999;border:none;padding:6px 12px;border-radius:16px;font-size:12px;font-weight:500;cursor:pointer;transition:background 0.15s,color 0.15s;white-space:nowrap;';
  cancelSelBtn.textContent = 'Cancel';
  cancelSelBtn.addEventListener('mouseenter', () => { cancelSelBtn.style.background = '#f5f5f5'; cancelSelBtn.style.color = '#333'; });
  cancelSelBtn.addEventListener('mouseleave', () => { cancelSelBtn.style.background = 'none'; cancelSelBtn.style.color = '#999'; });

  actionPill.appendChild(actionCount);
  actionPill.appendChild(divider);
  actionPill.appendChild(cancelSelBtn);

  let pinSelBtn = null;
  if (includePin) {
    pinSelBtn = document.createElement('button');
    pinSelBtn.style.cssText = `background:none;color:${BRAND.green};border:none;padding:6px 12px;border-radius:16px;font-size:12px;font-weight:500;cursor:pointer;transition:background 0.15s;display:flex;align-items:center;gap:5px;white-space:nowrap;`;
    pinSelBtn.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3 7h5l-4 4 1.5 7L12 17l-5.5 3L8 13 4 9h5z"/></svg> Pin`;
    pinSelBtn.addEventListener('mouseenter', () => { pinSelBtn.style.background = BRAND.greenLight; });
    pinSelBtn.addEventListener('mouseleave', () => { pinSelBtn.style.background = 'none'; });
    actionPill.appendChild(pinSelBtn);
  }

  const deleteSelBtn = document.createElement('button');
  deleteSelBtn.style.cssText = 'background:none;color:#e53e3e;border:none;padding:6px 12px;border-radius:16px;font-size:12px;font-weight:500;cursor:pointer;transition:background 0.15s;white-space:nowrap;';
  deleteSelBtn.textContent = 'Delete';
  deleteSelBtn.addEventListener('mouseenter', () => { deleteSelBtn.style.background = 'rgba(229,62,62,0.08)'; });
  deleteSelBtn.addEventListener('mouseleave', () => { deleteSelBtn.style.background = 'none'; });
  actionPill.appendChild(deleteSelBtn);
  actionBar.appendChild(actionPill);

  return { actionBar, actionPill, actionCount, cancelSelBtn, pinSelBtn, deleteSelBtn };
}

// ── Search bar builder ──
function buildSearchBar(placeholder) {
  const searchWrap = document.createElement('div');
  searchWrap.style.cssText = 'position:relative;margin-bottom:10px;transform-origin:top center;overflow:hidden;max-height:50px;transform:translateY(0) scaleY(1);';
  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.placeholder = placeholder;
  searchInput.style.cssText = 'width:100%;padding:9px 12px 9px 32px;border:1px solid #e8e8e8;border-radius:10px;font-size:13px;outline:none;background:#fafafa;transition:all 0.15s;box-sizing:border-box;';
  searchInput.addEventListener('focus', () => { searchInput.style.borderColor = BRAND.green; searchInput.style.background = '#fff'; });
  searchInput.addEventListener('blur', () => { if (!searchInput.value) { searchInput.style.borderColor = '#e8e8e8'; searchInput.style.background = '#fafafa'; }});
  const searchIcon = document.createElement('div');
  searchIcon.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#bbb" stroke-width="2.5" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`;
  searchIcon.style.cssText = 'position:absolute;left:10px;top:50%;transform:translateY(-50%);pointer-events:none;';
  searchWrap.appendChild(searchIcon);
  searchWrap.appendChild(searchInput);
  return { searchWrap, searchInput };
}

// ==================== RENDER FULL HISTORY ====================

function renderFullHistory(container, history, dates) {
  if (dates.length === 0) {
    container.innerHTML = `<div style="text-align:center;color:#bbb;font-size:13px;padding:40px 20px;">No messages yet</div>`;
    return;
  }
  const pins = getPinnedSet();
  [...dates].reverse().forEach(dateKey => {
    const dateHeader = document.createElement('div');
    dateHeader.style.cssText = 'font-size:11px;font-weight:600;color:#bbb;text-transform:uppercase;letter-spacing:0.05em;padding:6px 0 4px;margin-top:6px;border-bottom:1px solid #f0f0f0;margin-bottom:8px;';
    dateHeader.textContent = dateKey;
    container.appendChild(dateHeader);

    history[dateKey].forEach((msg, idx) => {
      const key = `${dateKey}::${idx}`;
      const isUser = msg.role === 'user';

      if (!isUser && msg.comparisonData) {
        const cardWrap = document.createElement('div');
        cardWrap.id = `hist-${dateKey.replace(/\s/g,'_')}-${idx}`;
        cardWrap.setAttribute('data-select-row', 'true');
        cardWrap.setAttribute('data-select-key', key);
        cardWrap.setAttribute('data-select-role', msg.role);
        cardWrap.style.cssText = 'position:relative;margin-bottom:6px;transition:background 0.3s,padding-left 0.2s;';
        addComparisonCard(cardWrap, msg.comparisonData, true, key);
        const innerWrapper = cardWrap.firstChild;
        if (innerWrapper) {
          const metaRow = innerWrapper.lastChild;
          if (metaRow) { const timeEl = metaRow.firstChild; if (timeEl) timeEl.textContent = msg.time; }
        }
        container.appendChild(cardWrap);
        return;
      }

      const row = document.createElement('div');
      row.id = `hist-${dateKey.replace(/\s/g,'_')}-${idx}`;
      row.setAttribute('data-select-row', 'true');
      row.setAttribute('data-select-key', key);
      row.setAttribute('data-select-role', msg.role);
      row.style.cssText = `display:flex;flex-direction:column;align-items:${isUser?'flex-end':'flex-start'};margin-bottom:6px;transition:background 0.3s,padding-left 0.2s;padding:2px 4px;border-radius:8px;position:relative;`;

      const bubble = document.createElement('div');
      bubble.style.cssText = isUser
        ? `background:${BRAND.green};color:#fff;padding:8px 14px;border-radius:14px 14px 4px 14px;max-width:80%;font-size:13px;word-wrap:break-word;line-height:1.5;`
        : `background:#f5f5f5;color:#333;padding:8px 14px;border-radius:14px 14px 14px 4px;max-width:80%;font-size:13px;word-wrap:break-word;line-height:1.5;`;
      if (isUser) bubble.textContent = msg.text;
      else bubble.innerHTML = formatBotMessage(convertLinksToHTML(msg.text));

      const metaRow = document.createElement('div');
      metaRow.style.cssText = 'display:flex;align-items:center;gap:4px;margin-top:2px;padding:0 4px;';
      const time = document.createElement('div');
      time.style.cssText = 'font-size:10px;color:#ccc;';
      time.textContent = msg.time;
      const pinBtn = makePinButton(key);
      if (!pins.has(key)) pinBtn.style.opacity = '0.35';

      if (isUser) { metaRow.appendChild(pinBtn); metaRow.appendChild(time); }
      else { metaRow.appendChild(time); metaRow.appendChild(pinBtn); }

      row.appendChild(bubble);
      row.appendChild(metaRow);
      container.appendChild(row);
    });
  });
}

// ==================== RENDER SEARCH RESULTS ====================

function renderSearchResults(container, term, messagesArea) {
  const results = searchHistory(term);
  if (results.length === 0) {
    container.innerHTML = `<div style="text-align:center;color:#bbb;font-size:13px;padding:40px 20px;">No results for "${term.replace(/</g,'&lt;')}"</div>`;
    return;
  }
  const countEl = document.createElement('div');
  countEl.style.cssText = 'font-size:11px;color:#bbb;margin-bottom:8px;';
  countEl.textContent = `${results.length} result${results.length===1?'':'s'}`;
  container.appendChild(countEl);

  const grouped = {};
  results.forEach(r => { if (!grouped[r.dateKey]) grouped[r.dateKey] = []; grouped[r.dateKey].push(r); });

  Object.keys(grouped).forEach(dateKey => {
    const dl = document.createElement('div');
    dl.style.cssText = 'font-size:11px;font-weight:600;color:#bbb;text-transform:uppercase;letter-spacing:0.05em;padding:4px 0;margin-top:4px;';
    dl.textContent = dateKey;
    container.appendChild(dl);

    grouped[dateKey].forEach(result => {
      const { msg, msgIndex } = result;
      const isUser = msg.role === 'user';
      const key = `${dateKey}::${msgIndex}`;
      const card = document.createElement('div');
      card.style.cssText = 'background:#fafafa;border-radius:8px;padding:8px 12px;margin-bottom:4px;cursor:pointer;border:1px solid #f0f0f0;transition:all 0.15s;';

      const topRow = document.createElement('div');
      topRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;';
      const roleLabel = document.createElement('span');
      roleLabel.style.cssText = `font-size:10px;font-weight:700;color:${isUser?BRAND.green:'#888'};text-transform:uppercase;letter-spacing:0.03em;`;
      roleLabel.textContent = isUser ? 'You' : 'Agent';
      const rightMeta = document.createElement('div');
      rightMeta.style.cssText = 'display:flex;align-items:center;gap:6px;';
      const timeLabel = document.createElement('span');
      timeLabel.style.cssText = 'font-size:10px;color:#ccc;';
      timeLabel.textContent = msg.time;
      const pinBtn = makePinButton(key);
      if (!getPinnedSet().has(key)) pinBtn.style.opacity = '0.35';
      rightMeta.appendChild(timeLabel);
      rightMeta.appendChild(pinBtn);
      topRow.appendChild(roleLabel);
      topRow.appendChild(rightMeta);

      const snippetEl = document.createElement('div');
      snippetEl.style.cssText = 'font-size:12px;color:#555;line-height:1.4;margin-top:3px;';
      snippetEl.innerHTML = highlightTerm(getSnippet(normalizeText(msg.text), term, 90), term);

      card.appendChild(topRow);
      card.appendChild(snippetEl);
      card.addEventListener('mouseenter', () => { card.style.borderColor = BRAND.green; card.style.background = BRAND.greenLight; });
      card.addEventListener('mouseleave', () => { card.style.borderColor = '#f0f0f0'; card.style.background = '#fafafa'; });
      card.addEventListener('click', () => {
        fadeContent(container, () => {
          container.innerHTML = '';
          renderFullHistory(container, getChatHistory(), Object.keys(getChatHistory()));
          const targetId = `hist-${dateKey.replace(/\s/g,'_')}-${msgIndex}`;
          setTimeout(() => {
            const target = container.querySelector(`#${CSS.escape(targetId)}`);
            if (target) { target.scrollIntoView({behavior:'smooth',block:'center'}); target.style.background = BRAND.greenLight; setTimeout(()=>{target.style.background='transparent';},1500); }
          }, 80);
          const si = messagesArea.querySelector('input[type="text"]');
          if (si) si.value = '';
        });
      });
      container.appendChild(card);
    });
  });
}