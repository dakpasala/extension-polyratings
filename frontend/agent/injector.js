// ==================== BUTTON INJECTION ====================

function injectAskAgentButton() {
  if (!shouldEnableAgent(document)) return;
  if (document.querySelector(`.${CSS_CLASSES.ASK_AGENT_BTN}`)) return;

  let deleteButton = null;
  document.querySelectorAll('button').forEach(btn => {
    const text = btn.textContent.trim().toLowerCase();
    if (text === 'delete selected' || text.includes('delete selected')) deleteButton = btn;
  });

  if (deleteButton) {
    const container = deleteButton.parentElement;
    if (container) {
      container.insertBefore(makeAgentBtn(), deleteButton);
      return;
    }
  }

  // Fallback — find Cancel / OK / Submit button and inject before it
  const selectors = ['button[type="button"]', '.MuiButton-root', 'button', '[role="button"]'];
  const found = [];
  selectors.forEach(sel => {
    document.querySelectorAll(sel).forEach(btn => {
      const t = btn.textContent.trim().toLowerCase();
      if (t.includes('cancel') || t.includes('ok') || t.includes('submit')) found.push(btn);
    });
  });
  if (found.length > 0) {
    const container = found[0].closest('div') || found[0].parentElement;
    if (container) container.insertBefore(makeAgentBtn(), found[0]);
  }
}

function makeAgentBtn() {
  const agentBtn = document.createElement('button');
  agentBtn.className = 'cx-MuiButtonBase-root cx-MuiButton-root cx-MuiButton-contained mr-1 ' + CSS_CLASSES.ASK_AGENT_BTN;
  agentBtn.tabIndex = 0;
  agentBtn.type = 'button';
  agentBtn.style.cssText = `background:${BRAND.green};`;
  const label = document.createElement('span');
  label.className = 'cx-MuiButton-label';
  label.textContent = 'Ask Agent';
  label.style.color = 'white';
  agentBtn.appendChild(label);
  agentBtn.addEventListener('click', (e) => {
    e.preventDefault(); e.stopPropagation();
    if (document.querySelector('.pr-agent-popup')) closeAgentPopup();
    else openAgentPopup(agentBtn);
  });
  return agentBtn;
}

function setupButtonObserver() {
  if (!shouldEnableAgent(document)) return;
  injectAskAgentButton();
  const interval = setInterval(() => {
    if (document.querySelector(`.${CSS_CLASSES.ASK_AGENT_BTN}`)) clearInterval(interval);
    else injectAskAgentButton();
  }, 500);
  setTimeout(() => clearInterval(interval), OBSERVER_TIMEOUT);
}