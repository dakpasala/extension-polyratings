// ==================== RATE LIMIT BANNER ====================

function showRateLimitBanner(popup, remaining) {
  if (!popup) return;
  const existing = popup.querySelector('.pr-agent-limit-banner');
  if (existing) existing.remove();
  if (remaining > 3) return;

  const bannerWrap = document.createElement('div');
  bannerWrap.className = 'pr-agent-limit-banner';
  bannerWrap.style.cssText = 'width:100%;flex-shrink:0;';

  const banner = document.createElement('div');
  const isOut = remaining === 0;
  banner.style.cssText = `
    padding: 10px 16px;
    background: ${isOut ? 'rgba(180,30,30,0.95)' : 'rgba(28,28,36,0.97)'};
    color: rgba(255,255,255,0.92); font-size: 12px; font-weight: 500;
    display: flex; align-items: center; gap: 8px;
    border-radius: 10px 10px 0 0;
    margin: 8px 10px 0;
    animation: agentBannerIn 0.2s ease-out;
  `;
  if (isOut) {
    banner.textContent = 'Daily limit reached — resets at 12:00 AM';
  } else {
    banner.innerHTML = `<div style="width:5px;height:5px;border-radius:50%;background:${remaining===1?'#F59E0B':'#A78BFA'};"></div>${remaining} message${remaining===1?'':'s'} remaining today`;
  }
  bannerWrap.appendChild(banner);

  const inputArea = popup.querySelector('.pr-agent-input');
  if (inputArea) {
    inputArea.insertBefore(bannerWrap, inputArea.firstChild);
    inputArea.style.borderTop = 'none';
  }

  if (isOut) {
    const inputRow = inputArea?.querySelector('.pr-input-inner') || inputArea;
    const input = inputRow?.querySelector('input');
    const sendBtn = inputRow?.querySelector('.pr-agent-send');
    if (input) { input.disabled = true; input.placeholder = 'Limit reached'; input.style.opacity = '0.4'; }
    if (sendBtn) { sendBtn.style.opacity = '0.3'; sendBtn.style.pointerEvents = 'none'; }
  }
}

// ==================== COMPARISON CARD ====================

function addComparisonCard(container, data, skipSave, pinKey) {
  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'margin-bottom:12px;animation:agentSlideInL 0.25s ease-out;';

  const sorted = [...data.items].sort((a, b) => b.rating - a.rating);
  const winnerId = sorted[0]?.name;

  function ratingDots(rating) {
    const max = 4, filled = Math.round(rating);
    let html = '<div style="display:flex;gap:3px;align-items:center;">';
    for (let i = 1; i <= max; i++) {
      html += `<div style="width:7px;height:7px;border-radius:50%;background:${i <= filled ? BRAND.green : '#e0e0e0'};"></div>`;
    }
    html += `<span style="font-size:11px;color:#888;margin-left:4px;">${parseFloat(rating).toFixed(1)}</span></div>`;
    return html;
  }

  function diffColor(diff) {
    if (!diff) return '#999';
    const d = diff.toLowerCase();
    if (d === 'easy') return '#16a34a';
    if (d === 'medium') return '#d97706';
    if (d === 'hard') return '#dc2626';
    return '#888';
  }

  const grid = document.createElement('div');
  grid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;';

  data.items.forEach(item => {
    const isWinner = item.name === winnerId;
    const card = document.createElement('div');
    card.style.cssText = `background:#fafafa;border:1.5px solid ${isWinner ? BRAND.green : '#ebebeb'};border-radius:12px;padding:12px;position:relative;transition:border-color 0.15s;`;

    if (isWinner) {
      const badge = document.createElement('div');
      badge.style.cssText = `position:absolute;top:-1px;right:8px;background:${BRAND.green};color:white;font-size:8px;font-weight:600;letter-spacing:0.05em;padding:2px 6px;border-radius:0 0 5px 5px;text-transform:uppercase;`;
      badge.textContent = 'Top pick';
      card.appendChild(badge);
    }

    const name = document.createElement('div');
    name.style.cssText = `font-size:13px;font-weight:600;color:#222;margin-bottom:6px;line-height:1.3;padding-right:4px;${isWinner ? 'margin-top:14px;' : ''}`;
    name.textContent = item.name;
    card.appendChild(name);

    const ratingEl = document.createElement('div');
    ratingEl.style.cssText = 'margin-bottom:5px;';
    ratingEl.innerHTML = ratingDots(item.rating);
    card.appendChild(ratingEl);

    if (item.reviewCount) {
      const rc = document.createElement('div');
      rc.style.cssText = 'font-size:10px;color:#bbb;margin-bottom:6px;';
      rc.textContent = `${item.reviewCount} review${item.reviewCount === 1 ? '' : 's'}`;
      card.appendChild(rc);
    }

    if (item.difficulty) {
      const diff = document.createElement('div');
      diff.style.cssText = `display:inline-block;font-size:10px;font-weight:600;color:${diffColor(item.difficulty)};background:${diffColor(item.difficulty)}18;padding:2px 7px;border-radius:20px;margin-bottom:7px;`;
      diff.textContent = item.difficulty;
      card.appendChild(diff);
    }

    if (item.tags && item.tags.length > 0) {
      const tagsEl = document.createElement('div');
      tagsEl.style.cssText = 'display:flex;flex-wrap:wrap;gap:3px;margin-bottom:7px;';
      item.tags.slice(0, 3).forEach(tag => {
        const t = document.createElement('div');
        t.style.cssText = 'font-size:10px;color:#666;background:#f0f0f0;padding:2px 6px;border-radius:10px;';
        t.textContent = tag;
        tagsEl.appendChild(t);
      });
      card.appendChild(tagsEl);
    }

    if (item.summary) {
      const summary = document.createElement('div');
      summary.style.cssText = 'font-size:11px;color:#777;line-height:1.5;border-top:1px solid #f0f0f0;padding-top:7px;margin-top:2px;';
      summary.textContent = item.summary;
      card.appendChild(summary);
    }

    grid.appendChild(card);
  });

  wrapper.appendChild(grid);

  if (data.verdict) {
    const verdict = document.createElement('div');
    verdict.style.cssText = `background:${BRAND.greenLight};border-left:3px solid ${BRAND.green};border-radius:0 8px 8px 0;padding:9px 12px;font-size:12px;color:#333;line-height:1.5;`;
    verdict.innerHTML = `<span style="font-weight:600;color:${BRAND.green};">Verdict: </span>${data.verdict}`;
    wrapper.appendChild(verdict);
  }

  const metaRow = document.createElement('div');
  metaRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-top:4px;padding:0 2px;';
  const time = document.createElement('div');
  time.style.cssText = 'font-size:10px;color:#ccc;';
  time.textContent = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  metaRow.appendChild(time);
  if (pinKey) metaRow.appendChild(makePinButton(pinKey));
  wrapper.appendChild(metaRow);

  container.appendChild(wrapper);
  if (container.className === 'agent-messages') container.scrollTop = container.scrollHeight;

  const historyText = `[Comparison] ${data.items.map(i => `${i.name} (${i.rating}/4.0)`).join(' vs ')}. ${data.verdict || ''}`;
  if (!skipSave) saveChatMessage('bot', historyText, data);
}

// ==================== TRANSITIONS ====================

function fadeTransition(messagesArea, popup, outDuration, inDuration, fn) {
  const stickyHeader = popup.querySelector('.pr-history-sticky-header');
  const targets = [messagesArea];
  if (stickyHeader) targets.push(stickyHeader);

  targets.forEach(el => {
    el.style.transition = `opacity ${outDuration}ms ease-out, transform ${outDuration}ms ease-out`;
    el.style.opacity = '0';
    if (el === messagesArea) el.style.transform = 'translateY(4px)';
    if (el === stickyHeader) el.style.transform = 'translateY(-4px)';
  });

  setTimeout(() => {
    fn();
    requestAnimationFrame(() => {
      messagesArea.style.transition = `opacity ${inDuration}ms ease-out, transform ${inDuration}ms ease-out`;
      messagesArea.style.opacity = '1';
      messagesArea.style.transform = 'translateY(0)';
    });
  }, outDuration);
}

function navigateBackToChat(popup, messagesArea) {
  const inputArea = popup.querySelector('.pr-agent-input');

  fadeTransition(messagesArea, popup, 160, 220, () => {
    const existingHeader = popup.querySelector('.pr-history-sticky-header');
    const backToTopEl = popup.querySelector('.pr-back-to-top-pill');
    if (existingHeader) existingHeader.remove();
    if (backToTopEl) backToTopEl.remove();

    if (inputArea) inputArea.style.display = 'flex';
    messagesArea.innerHTML = '';
    messagesArea.style.paddingTop = '16px';
    renderWelcomeState(messagesArea);
  });
}

function fadeContent(contentArea, fn) {
  contentArea.style.transition = 'opacity 0.12s ease-out';
  contentArea.style.opacity = '0';
  setTimeout(() => {
    fn();
    contentArea.style.transition = 'opacity 0.15s ease-in';
    contentArea.style.opacity = '1';
  }, 120);
}

// ==================== BACK TO TOP PILL ====================

function makeBackToTopPill(popup, messagesArea) {
  const pill = document.createElement('div');
  pill.className = 'pr-back-to-top-pill';
  pill.style.cssText = `
    position:absolute; bottom:20px; left:50%; transform:translateX(-50%) translateY(16px);
    background:${BRAND.green}; color:white;
    font-size:11px; font-weight:600; letter-spacing:0.02em;
    padding:7px 16px; border-radius:20px;
    display:flex; align-items:center; gap:5px;
    cursor:pointer; opacity:0; pointer-events:none;
    transition:opacity 0.25s ease, transform 0.25s ease;
    white-space:nowrap; z-index:100;
    box-shadow: 0 3px 12px rgba(21,71,52,0.3);
  `;
  pill.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round"><polyline points="18 15 12 9 6 15"/></svg> Back to top`;
  pill.addEventListener('click', () => messagesArea.scrollTo({ top: 0, behavior: 'smooth' }));
  popup.appendChild(pill);
  return pill;
}

function showPill(pill) {
  pill.style.opacity = '1';
  pill.style.transform = 'translateX(-50%) translateY(0)';
  pill.style.pointerEvents = 'auto';
}

function hidePill(pill) {
  pill.style.opacity = '0';
  pill.style.transform = 'translateX(-50%) translateY(12px)';
  pill.style.pointerEvents = 'none';
}

// ==================== SCROLL-AWARE SEARCH BAR ====================

function attachScrollBehaviour(messagesArea, searchWrap, backToTopPill, getActionBarVisible) {
  const SCROLL_THRESHOLD = 150;
  let searchCollapsed = false;
  const easing = 'cubic-bezier(0.4,0,0.2,1)';

  messagesArea.addEventListener('scroll', () => {
    const scrolled = messagesArea.scrollTop > SCROLL_THRESHOLD;

    if (scrolled && !searchCollapsed) {
      searchCollapsed = true;
      searchWrap.style.transition = `opacity 0.3s ${easing}, max-height 0.35s ${easing}, margin-bottom 0.35s ${easing}, transform 0.3s ${easing}`;
      searchWrap.style.opacity = '0';
      searchWrap.style.maxHeight = '0';
      searchWrap.style.marginBottom = '0';
      searchWrap.style.transform = 'translateY(-4px) scaleY(0.95)';
      searchWrap.style.pointerEvents = 'none';
    } else if (!scrolled && searchCollapsed) {
      searchCollapsed = false;
      searchWrap.style.transition = `opacity 0.3s ${easing}, max-height 0.35s ${easing}, margin-bottom 0.35s ${easing}, transform 0.3s ${easing}`;
      searchWrap.style.opacity = '1';
      searchWrap.style.maxHeight = '50px';
      searchWrap.style.marginBottom = '10px';
      searchWrap.style.transform = 'translateY(0) scaleY(1)';
      searchWrap.style.pointerEvents = '';
    }

    const actionBarOpen = getActionBarVisible ? getActionBarVisible() : false;
    if (scrolled && !actionBarOpen) showPill(backToTopPill);
    else hidePill(backToTopPill);
  });
}