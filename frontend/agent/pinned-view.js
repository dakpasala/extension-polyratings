// ==================== PINNED VIEW ====================

function renderPinnedView(messagesArea) {
  const popup = messagesArea.closest('.pr-agent-popup');
  const existingHeader = popup.querySelector('.pr-history-sticky-header');
  if (existingHeader) existingHeader.remove();
  const existingPill = popup.querySelector('.pr-back-to-top-pill');
  if (existingPill) existingPill.remove();

  const inputArea = popup?.querySelector('.pr-agent-input');

  // ── Sticky header ──
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

  const pinnedRight = document.createElement('div');
  pinnedRight.style.cssText = 'display:flex;align-items:center;gap:8px;';

  const titleEl = document.createElement('div');
  titleEl.style.cssText = `font-size:12px;font-weight:600;color:${BRAND.green};display:flex;align-items:center;gap:5px;`;
  titleEl.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3 7h5l-4 4 1.5 7L12 17l-5.5 3L8 13 4 9h5z"/></svg> Pinned`;
  pinnedRight.appendChild(titleEl);

  topBar.appendChild(backBtn);
  topBar.appendChild(pinnedRight);
  stickyHeader.appendChild(topBar);

  const { searchWrap, searchInput } = buildSearchBar('Search pinned…');
  stickyHeader.appendChild(searchWrap);

  fadeTransition(messagesArea, popup, 150, 200, () => {
    messagesArea.innerHTML = '';
    if (inputArea) inputArea.style.display = 'none';
    messagesArea.style.paddingTop = '8px';
    messagesArea.style.transform = 'translateY(0)';
    popup.insertBefore(stickyHeader, messagesArea);

    const contentArea = document.createElement('div');
    messagesArea.appendChild(contentArea);

    // ── Select mode ──
    let selectMode = false;
    const selectedMessages = new Set();

    const { actionBar, actionPill, actionCount, cancelSelBtn } = buildActionBar(false);
    const unpinSelBtn = document.createElement('button');
    unpinSelBtn.style.cssText = `background:none;color:${BRAND.green};border:none;padding:6px 12px;border-radius:16px;font-size:12px;font-weight:500;cursor:pointer;transition:background 0.15s;white-space:nowrap;`;
    unpinSelBtn.textContent = 'Unpin';
    unpinSelBtn.addEventListener('mouseenter', () => { unpinSelBtn.style.background = BRAND.greenLight; });
    unpinSelBtn.addEventListener('mouseleave', () => { unpinSelBtn.style.background = 'none'; });
    actionPill.appendChild(unpinSelBtn);
    messagesArea.appendChild(actionBar);

    const selectBtn = document.createElement('div');
    selectBtn.style.cssText = 'font-size:12px;font-weight:500;color:#999;cursor:pointer;padding:4px 8px;border-radius:6px;transition:all 0.15s;';
    selectBtn.textContent = 'Select';
    selectBtn.addEventListener('mouseenter', () => { selectBtn.style.color = '#333'; selectBtn.style.background = '#f0f0f0'; });
    selectBtn.addEventListener('mouseleave', () => { selectBtn.style.color = selectMode ? BRAND.green : '#999'; selectBtn.style.background = selectMode ? BRAND.greenLight : 'transparent'; });
    pinnedRight.appendChild(selectBtn);

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
        unpinSelBtn.textContent = `Unpin (${count})`;
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
      setTimeout(() => { actionBar.style.display = 'none'; }, 150);
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

    unpinSelBtn.addEventListener('click', () => {
      if (selectedMessages.size === 0) return;
      const pins = getPinnedSet();
      selectedMessages.forEach(key => {
        const [dk, idxStr] = key.split('::');
        const pairKey = getPairKey(dk, parseInt(idxStr));
        pins.delete(key);
        if (pairKey) pins.delete(pairKey);
        syncPinBtnUI(key, false, false);
        if (pairKey) syncPinBtnUI(pairKey, false, false);
      });
      setPinnedSet(pins);
      exitSelectMode();
      setTimeout(() => renderPinnedContent(), 320);
    });

    function renderPinnedContent() {
      fadeContent(contentArea, () => {
        contentArea.innerHTML = '';
        const pins = getPinnedSet();
        if (pins.size === 0) { contentArea.innerHTML = buildEmptyPinnedHTML(); return; }

        const history = getChatHistory();
        const byDate = buildByDate(pins, history);
        const sortedDates = Object.keys(byDate).sort((a, b) => new Date(b) - new Date(a));
        if (sortedDates.length === 0) { contentArea.innerHTML = `<div style="text-align:center;color:#bbb;font-size:13px;padding:40px 20px;">No results found</div>`; return; }

        renderPinnedByDate(contentArea, byDate, sortedDates, renderPinnedContent);
      });
    }

    // Initial render (no fadeContent since we're already fading in the view)
    (() => {
      const pins = getPinnedSet();
      if (pins.size === 0) { contentArea.innerHTML = buildEmptyPinnedHTML(); return; }
      const history = getChatHistory();
      const byDate = buildByDate(pins, history);
      const sortedDates = Object.keys(byDate).sort((a, b) => new Date(b) - new Date(a));
      renderPinnedByDate(contentArea, byDate, sortedDates, renderPinnedContent);
    })();

    // Search
    let searchTimeout = null;
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        const term = searchInput.value.trim();
        if (!term) { renderPinnedContent(); return; }
        const results = searchPinned(term);
        contentArea.style.transition = 'opacity 0.12s ease-out';
        contentArea.style.opacity = '0';
        setTimeout(() => {
          contentArea.innerHTML = '';
          if (results.length === 0) {
            contentArea.innerHTML = `<div style="text-align:center;color:#bbb;font-size:13px;padding:40px 20px;">No pinned results for "${term.replace(/</g,'&lt;')}"</div>`;
          } else {
            const byDate = {};
            results.forEach(r => {
              if (!byDate[r.dateKey]) byDate[r.dateKey] = [];
              if (!byDate[r.dateKey].find(e => e.key === r.key)) byDate[r.dateKey].push(r);
            });
            Object.keys(byDate).sort((a,b)=>new Date(b)-new Date(a)).forEach(dateKey => {
              const dh = document.createElement('div');
              dh.style.cssText = 'font-size:11px;font-weight:600;color:#bbb;text-transform:uppercase;letter-spacing:0.05em;padding:6px 0 4px;margin-top:6px;border-bottom:1px solid #f0f0f0;margin-bottom:8px;';
              dh.textContent = dateKey;
              contentArea.appendChild(dh);
              byDate[dateKey].sort((a,b)=>a.idx-b.idx).forEach(({ key, idx, msg }) => {
                const isUser = msg.role === 'user';
                const card = document.createElement('div');
                card.style.cssText = 'background:#fafafa;border-radius:8px;padding:8px 12px;margin-bottom:4px;border:1px solid #f0f0f0;';
                const topRow2 = document.createElement('div');
                topRow2.style.cssText = 'display:flex;align-items:center;justify-content:space-between;';
                const roleLabel = document.createElement('span');
                roleLabel.style.cssText = `font-size:10px;font-weight:700;color:${isUser?BRAND.green:'#888'};text-transform:uppercase;letter-spacing:0.03em;`;
                roleLabel.textContent = isUser ? 'You' : 'Agent';
                const timeLabel = document.createElement('span');
                timeLabel.style.cssText = 'font-size:10px;color:#ccc;';
                timeLabel.textContent = msg.time;
                topRow2.appendChild(roleLabel);
                topRow2.appendChild(timeLabel);
                const snippetEl = document.createElement('div');
                snippetEl.style.cssText = 'font-size:12px;color:#555;line-height:1.4;margin-top:3px;';
                snippetEl.innerHTML = highlightTerm(getSnippet(normalizeText(msg.text), term, 90), term);
                card.appendChild(topRow2);
                card.appendChild(snippetEl);
                contentArea.appendChild(card);
              });
            });
          }
          contentArea.style.transition = 'opacity 0.15s ease-in';
          contentArea.style.opacity = '1';
        }, 120);
      }, 200);
    });

    attachScrollBehaviour(messagesArea, searchWrap, backToTop, null);
    requestAnimationFrame(() => setTimeout(() => stickyHeader.classList.add('visible'), 40));
    setTimeout(() => searchInput.focus(), 260);
  });
}

function buildEmptyPinnedHTML() {
  return `
    <div style="text-align:center;padding:50px 20px;">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ddd" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom:10px;"><path d="M12 2l3 7h5l-4 4 1.5 7L12 17l-5.5 3L8 13 4 9h5z"/></svg>
      <div style="color:#bbb;font-size:13px;margin-top:4px;">No pinned messages yet</div>
      <div style="color:#ccc;font-size:12px;margin-top:6px;line-height:1.5;">Hover over any message<br>and tap the pin icon to save it here.</div>
    </div>`;
}

function buildByDate(pins, history) {
  const byDate = {};
  pins.forEach(key => {
    const [dateKey, idxStr] = key.split('::');
    const idx = parseInt(idxStr);
    if (history[dateKey] && history[dateKey][idx]) {
      if (!byDate[dateKey]) byDate[dateKey] = [];
      if (!byDate[dateKey].find(e => e.key === key)) byDate[dateKey].push({ key, idx, msg: history[dateKey][idx] });
    }
  });
  return byDate;
}

function renderPinnedByDate(contentArea, byDate, sortedDates, onUnpin) {
  sortedDates.forEach(dateKey => {
    const dateHeader = document.createElement('div');
    dateHeader.style.cssText = 'font-size:11px;font-weight:600;color:#bbb;text-transform:uppercase;letter-spacing:0.05em;padding:6px 0 4px;margin-top:6px;border-bottom:1px solid #f0f0f0;margin-bottom:8px;';
    dateHeader.textContent = dateKey;
    contentArea.appendChild(dateHeader);

    byDate[dateKey].sort((a, b) => a.idx - b.idx).forEach(({ key, msg }) => {
      const isUser = msg.role === 'user';

      if (!isUser && msg.comparisonData) {
        const cardWrap = document.createElement('div');
        cardWrap.style.cssText = 'position:relative;margin-bottom:6px;';
        addComparisonCard(cardWrap, msg.comparisonData, true, null);
        const innerWrapper = cardWrap.firstChild;
        if (innerWrapper) {
          const metaRow = innerWrapper.lastChild;
          if (metaRow) {
            const timeEl = metaRow.firstChild;
            if (timeEl) timeEl.textContent = msg.time;
            const existingPin = metaRow.querySelector('.pr-pin-btn');
            if (existingPin) existingPin.remove();
            metaRow.appendChild(makeUnpinButton(key, onUnpin));
          }
        }
        contentArea.appendChild(cardWrap);
        return;
      }

      const row = document.createElement('div');
      row.setAttribute('data-select-row', 'true');
      row.setAttribute('data-select-key', key);
      row.setAttribute('data-select-role', isUser ? 'user' : 'bot');
      row.style.cssText = `display:flex;flex-direction:column;align-items:${isUser?'flex-end':'flex-start'};margin-bottom:10px;position:relative;transition:background 0.15s,transform 0.32s cubic-bezier(0.4,0,0.2,1);`;

      const bubble = document.createElement('div');
      bubble.style.cssText = isUser
        ? `background:${BRAND.green};color:#fff;padding:8px 14px;border-radius:14px 14px 4px 14px;max-width:82%;font-size:13px;word-wrap:break-word;line-height:1.5;`
        : `background:#f5f5f5;color:#333;padding:8px 14px;border-radius:14px 14px 14px 4px;max-width:82%;font-size:13px;word-wrap:break-word;line-height:1.5;`;
      if (isUser) bubble.textContent = msg.text;
      else bubble.innerHTML = formatBotMessage(convertLinksToHTML(msg.text));

      const metaRow = document.createElement('div');
      metaRow.style.cssText = 'display:flex;align-items:center;gap:4px;margin-top:2px;padding:0 4px;';
      const time = document.createElement('div');
      time.style.cssText = 'font-size:10px;color:#ccc;';
      time.textContent = msg.time;
      const unpinBtn = makeUnpinButton(key, onUnpin);

      if (isUser) { metaRow.appendChild(unpinBtn); metaRow.appendChild(time); }
      else { metaRow.appendChild(time); metaRow.appendChild(unpinBtn); }

      row.appendChild(bubble);
      row.appendChild(metaRow);
      contentArea.appendChild(row);
    });
  });
}