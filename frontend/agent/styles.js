// ==================== STYLES ====================
function injectAgentStyles() {
  if (document.getElementById('pr-agent-styles')) return;
  const s = document.createElement('style');
  s.id = 'pr-agent-styles';
  s.textContent = `
    .pr-agent-popup {
      position: fixed; top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      width: 420px; max-width: 92vw;
      height: 540px; max-height: 85vh;
      min-width: 300px; min-height: 400px;
      background: #fff; border-radius: 14px;
      box-shadow: 0 16px 48px rgba(0,0,0,0.14), 0 4px 12px rgba(0,0,0,0.06);
      display: flex; flex-direction: column; overflow: hidden;
      z-index: 10000; opacity: 0;
      transition: opacity 0.2s ease-out;
      resize: both;
      font-family: -apple-system, "Helvetica Neue", Arial, sans-serif;
    }
    .pr-agent-popup.visible { opacity: 1; }

    @keyframes agentSlideIn {
      from { opacity: 0; transform: translateY(8px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes agentSlideInR {
      from { opacity: 0; transform: translateX(12px); }
      to   { opacity: 1; transform: translateX(0); }
    }
    @keyframes agentSlideInL {
      from { opacity: 0; transform: translateX(-12px); }
      to   { opacity: 1; transform: translateX(0); }
    }
    @keyframes agentTyping {
      0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
      30%           { transform: translateY(-6px); opacity: 1; }
    }
    @keyframes agentBannerIn {
      from { opacity: 0; transform: translateY(4px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes prPinPop {
      0%   { transform: scale(1); }
      40%  { transform: scale(1.5); }
      70%  { transform: scale(0.88); }
      100% { transform: scale(1); }
    }

    .pr-pin-btn {
      opacity: 0;
      transition: opacity 0.18s ease, color 0.18s ease;
      background: none;
      border: none;
      cursor: pointer;
      padding: 2px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ccc;
      flex-shrink: 0;
    }
    .pr-pin-btn:hover  { color: #154734 !important; opacity: 1 !important; }
    .pr-pin-btn.pinned { opacity: 1 !important; color: #154734 !important; }
    .pr-pin-btn.pin-pop svg {
      animation: prPinPop 0.32s cubic-bezier(0.34,1.56,0.64,1) forwards;
    }
    .pr-msg-wrapper:hover .pr-pin-btn { opacity: 1; }

    .pr-history-sticky-header {
      opacity: 0;
      transform: translateY(-6px);
      transition: opacity 0.22s ease, transform 0.22s ease;
    }
    .pr-history-sticky-header.visible {
      opacity: 1;
      transform: translateY(0);
    }
  `;
  document.head.appendChild(s);
}

injectAgentStyles();