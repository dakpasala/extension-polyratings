// ==================== WELCOME STATE ====================

function renderWelcomeState(messagesArea) {
  const userName = localStorage.getItem('pr_user_name') || '';
  const firstName = userName.split(' ')[0] || '';
  const greeting = firstName ? `Hi ${firstName}` : 'Hi there';

  const welcome = document.createElement('div');
  welcome.style.cssText = 'animation:agentSlideIn 0.3s ease-out;';
  welcome.innerHTML = `
    <div style="background:#f8f8f8;border-radius:10px;padding:14px 16px;margin-bottom:12px;">
      <div style="font-size:14px;font-weight:500;color:#222;margin-bottom:4px;">${greeting}</div>
      <div style="font-size:12px;color:#888;line-height:1.5;">Ask me about professors, course difficulty, or schedule conflicts.</div>
    </div>
  `;
  messagesArea.appendChild(welcome);

  const chips = document.createElement('div');
  chips.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin-bottom:16px;';
  ['Compare professors', 'Compare classes', 'Who is the best professor?', 'Course difficulty'].forEach(label => {
    const chip = document.createElement('div');
    chip.style.cssText = `font-size:12px;color:#777;padding:6px 12px;border-radius:20px;border:1px solid #e8e8e8;cursor:pointer;transition:all 0.15s;`;
    chip.textContent = label;
    chip.addEventListener('mouseenter', () => { chip.style.borderColor = BRAND.green; chip.style.color = BRAND.green; chip.style.background = BRAND.greenLight; });
    chip.addEventListener('mouseleave', () => { chip.style.borderColor = '#e8e8e8'; chip.style.color = '#777'; chip.style.background = 'transparent'; });
    chip.addEventListener('click', () => {
      const popup = messagesArea.closest('.pr-agent-popup');
      const input = popup?.querySelector('.pr-agent-input input');
      if (input) { input.value = label + ' for '; input.focus(); }
    });
    chips.appendChild(chip);
  });
  messagesArea.appendChild(chips);
}

// ==================== CHAT MESSAGES ====================

function addUserMessage(container, message) {
  saveChatMessage('user', message);
  const history = getChatHistory();
  const now = new Date();
  const dateKey = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const idx = (history[dateKey] || []).length - 1;
  const pinKey = `${dateKey}::${idx}`;

  const wrapper = document.createElement('div');
  wrapper.className = 'pr-msg-wrapper';
  wrapper.style.cssText = 'display:flex;flex-direction:column;align-items:flex-end;margin-bottom:10px;animation:agentSlideInR 0.25s ease-out;';

  const bubble = document.createElement('div');
  bubble.style.cssText = `background:${BRAND.green};color:#fff;padding:10px 14px;border-radius:16px 16px 4px 16px;margin-left:48px;font-size:13px;word-wrap:break-word;line-height:1.5;`;
  bubble.textContent = message;

  const metaRow = document.createElement('div');
  metaRow.style.cssText = 'display:flex;align-items:center;gap:4px;margin-top:2px;padding:0 4px;';
  const time = document.createElement('div');
  time.style.cssText = 'font-size:10px;color:#ccc;';
  time.textContent = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  metaRow.appendChild(makePinButton(pinKey));
  metaRow.appendChild(time);

  wrapper.appendChild(bubble);
  wrapper.appendChild(metaRow);
  container.appendChild(wrapper);
  if (container.className === 'agent-messages') container.scrollTop = container.scrollHeight;
}

function addBotMessage(container, message) {
  saveChatMessage('bot', message);
  const history = getChatHistory();
  const now = new Date();
  const dateKey = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const idx = (history[dateKey] || []).length - 1;
  const pinKey = `${dateKey}::${idx}`;

  const wrapper = document.createElement('div');
  wrapper.className = 'pr-msg-wrapper';
  wrapper.style.cssText = 'display:flex;flex-direction:column;align-items:flex-start;margin-bottom:10px;animation:agentSlideInL 0.25s ease-out;';

  const bubble = document.createElement('div');
  bubble.style.cssText = 'background:#f5f5f5;color:#333;padding:10px 14px;border-radius:16px 16px 16px 4px;margin-right:48px;font-size:13px;word-wrap:break-word;line-height:1.6;';
  bubble.innerHTML = formatBotMessage(convertLinksToHTML(message));

  const metaRow = document.createElement('div');
  metaRow.style.cssText = 'display:flex;align-items:center;gap:4px;margin-top:2px;padding:0 4px;';
  const time = document.createElement('div');
  time.style.cssText = 'font-size:10px;color:#ccc;';
  time.textContent = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  metaRow.appendChild(time);
  metaRow.appendChild(makePinButton(pinKey));

  wrapper.appendChild(bubble);
  wrapper.appendChild(metaRow);
  container.appendChild(wrapper);
  if (container.className === 'agent-messages') container.scrollTop = container.scrollHeight;
}

function addTypingIndicator(container) {
  const id = 'typing-' + Date.now();
  const el = document.createElement('div');
  el.id = id;
  el.style.cssText = 'display:flex;align-items:center;gap:6px;padding:10px 14px;background:#f5f5f5;border-radius:16px 16px 16px 4px;margin-right:48px;margin-bottom:10px;width:fit-content;animation:agentSlideInL 0.2s ease-out;';
  el.innerHTML = `<div style="display:flex;gap:3px;">${[0,0.15,0.3].map(d=>`<div style="width:5px;height:5px;border-radius:50%;background:#999;animation:agentTyping 1.2s infinite ease-in-out ${d}s;"></div>`).join('')}</div>`;
  container.appendChild(el);
  if (container.className === 'agent-messages') container.scrollTop = container.scrollHeight;
  return id;
}