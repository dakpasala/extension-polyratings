// ==================== TOOLTIPS ====================
function initTooltipState() {
  if (!window.PRTooltipState) {
    window.PRTooltipState = {
      owner: null,
      showTimeout: null,
      hideTimeout: null,
    };
    document.addEventListener(
      "scroll",
      () => hideProfessorTooltip(null, true),
      { capture: true }
    );
    window.addEventListener("blur", () => hideProfessorTooltip(null, true));
  }
}

function addHoverTooltip(element, professor) {
  initTooltipState();
  element.addEventListener("mouseenter", () => {
    if (window.PRTooltipState.hideTimeout) {
      clearTimeout(window.PRTooltipState.hideTimeout);
      window.PRTooltipState.hideTimeout = null;
    }
    if (window.PRTooltipState.showTimeout) {
      clearTimeout(window.PRTooltipState.showTimeout);
      window.PRTooltipState.showTimeout = null;
    }
    if (
      window.PRTooltipState.owner &&
      window.PRTooltipState.owner !== element
    ) {
      hideProfessorTooltip(window.PRTooltipState.owner, true);
    }
    window.PRTooltipState.owner = element;
    window.PRTooltipState.showTimeout = setTimeout(() => {
      showProfessorTooltip(element, professor);
      window.PRTooltipState.showTimeout = null;
    }, 300);
  });
  element.addEventListener("mouseleave", () => {
    if (window.PRTooltipState.showTimeout) {
      clearTimeout(window.PRTooltipState.showTimeout);
      window.PRTooltipState.showTimeout = null;
    }
    window.PRTooltipState.hideTimeout = setTimeout(() => {
      hideProfessorTooltip(element, false);
      window.PRTooltipState.hideTimeout = null;
    }, 50);
  });
}

function showProfessorTooltip(element, professor) {
  hideProfessorTooltip();
  const tooltip = document.createElement("div");
  tooltip.className = CSS_CLASSES.PROFESSOR_TOOLTIP;
  tooltip.style.cssText = `
    position: absolute; background: linear-gradient(135deg, #FFD700, #FFA500);
    color: #000; padding: 16px 20px; border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3); font-size: 14px; font-weight: 500;
    max-width: 300px; z-index: 10000; opacity: 0;
    transform: scale(0.8) translateY(10px);
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    pointer-events: none; border: 2px solid rgba(255, 255, 255, 0.3);
  `;
  tooltip.setAttribute(CSS_CLASSES.DATA_ATTR, "true");

  chrome.runtime.sendMessage(
    { type: "getGeminiTooltipAnalysis", profName: professor.name },
    (response) => {
      if (response.status === "success" && response.professor) {
        const prof = response.professor;
        tooltip.innerHTML = `
        <div style="font-weight: 700; margin-bottom: 8px; font-size: 16px;">${prof.name}</div>
        <div style="margin-bottom: 8px;">
          <span style="background: rgba(0,0,0,0.1); padding: 4px 8px; border-radius: 6px; font-size: 12px;">
            ⭐ ${prof.rating}/4.0
          </span>
        </div>
        <div style="line-height: 1.4; font-size: 13px;">${response.analysis}</div>
      `;
      } else if (response.status === "ai_analysis") {
        tooltip.innerHTML = `
        <div style="font-weight: 700; margin-bottom: 8px; font-size: 16px;">${professor.name}</div>
        <div style="margin-bottom: 8px;">
          <span style="background: rgba(0,0,0,0.1); padding: 4px 8px; border-radius: 6px; font-size: 12px;">
            📝 Not Rated
          </span>
        </div>
        <div style="line-height: 1.4; font-size: 13px;">${response.analysis}</div>
      `;
      } else {
        tooltip.innerHTML = `
        <div style="font-weight: 700; margin-bottom: 8px; font-size: 16px;">${professor.name}</div>
        <div style="margin-bottom: 8px;">
          <span style="background: rgba(0,0,0,0.1); padding: 4px 8px; border-radius: 6px; font-size: 12px;">
            📝 Not Rated
          </span>
        </div>
        <div style="line-height: 1.4; font-size: 13px; color: #666;">
          This professor hasn't been rated yet. Click to add them to PolyRatings!
        </div>
      `;
      }
      positionTooltip(tooltip, element);
      document.body.appendChild(tooltip);
      setTimeout(() => {
        tooltip.style.opacity = "1";
        tooltip.style.transform = "scale(1) translateY(0)";
      }, 10);
    }
  );
}

function positionTooltip(tooltip, element) {
  const rect = element.getBoundingClientRect();
  const tooltipRect = tooltip.getBoundingClientRect();
  let top = rect.top - tooltipRect.height - 10;
  let left = rect.left + rect.width / 2 - tooltipRect.width / 2;
  if (left < 10) left = 10;
  else if (left + tooltipRect.width > window.innerWidth - 10)
    left = window.innerWidth - tooltipRect.width - 10;
  if (top < 10) top = rect.bottom + 10;
  tooltip.style.top = `${top}px`;
  tooltip.style.left = `${left}px`;
}

function hideProfessorTooltip(owner = null, immediate = false) {
  const existingTooltip = document.querySelector(
    `.${CSS_CLASSES.PROFESSOR_TOOLTIP}`
  );
  if (existingTooltip) {
    if (!owner || window.PRTooltipState?.owner === owner) {
      const removeNow = () => {
        if (existingTooltip?.parentNode)
          existingTooltip.parentNode.removeChild(existingTooltip);
        if (
          window.PRTooltipState &&
          (!owner || window.PRTooltipState.owner === owner)
        ) {
          window.PRTooltipState.owner = null;
        }
      };
      if (immediate) {
        removeNow();
      } else {
        existingTooltip.style.opacity = "0";
        existingTooltip.style.transform = "scale(0.8) translateY(10px)";
        setTimeout(removeNow, 200);
      }
    }
  }
}
