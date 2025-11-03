// ==================== TOOLTIPS ====================
function initTooltipState() {
  if (!window.PRTooltipState) {
    window.PRTooltipState = {
      owner: null,
      showTimeout: null,
      hideTimeout: null,
      currentTooltip: null,
      isHovering: false,
    };
    document.addEventListener(
      "scroll",
      () => hideProfessorTooltip(null, true),
      { capture: true, passive: true }
    );
    window.addEventListener("blur", () => hideProfessorTooltip(null, true));
  }
}

function addHoverTooltip(element, professor) {
  initTooltipState();

  element.addEventListener("mouseenter", () => {
    window.PRTooltipState.isHovering = true;

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
      if (
        window.PRTooltipState.isHovering &&
        window.PRTooltipState.owner === element &&
        document.contains(element)
      ) {
        showProfessorTooltip(element, professor);
      }
      window.PRTooltipState.showTimeout = null;
    }, 400);
  });

  element.addEventListener("mouseleave", () => {
    window.PRTooltipState.isHovering = false;

    if (window.PRTooltipState.showTimeout) {
      clearTimeout(window.PRTooltipState.showTimeout);
      window.PRTooltipState.showTimeout = null;
    }

    if (window.PRTooltipState.hideTimeout) {
      clearTimeout(window.PRTooltipState.hideTimeout);
      window.PRTooltipState.hideTimeout = null;
    }

    window.PRTooltipState.hideTimeout = setTimeout(() => {
      hideProfessorTooltip(element, false);
      window.PRTooltipState.hideTimeout = null;
    }, 100);
  });
}

function showProfessorTooltip(element, professor) {
  // Clean up any existing tooltip first
  hideProfessorTooltip(null, true);

  // Verify element still exists and is in the DOM
  if (!element || !document.contains(element)) {
    return;
  }

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
    visibility: hidden;
  `;
  tooltip.setAttribute(CSS_CLASSES.DATA_ATTR, "true");

  // Store reference to current tooltip
  window.PRTooltipState.currentTooltip = tooltip;

  // Add to DOM with placeholder content
  tooltip.innerHTML = `
    <div style="font-weight: 700; margin-bottom: 8px; font-size: 16px;">${professor.name}</div>
    <div style="line-height: 1.4; font-size: 13px; color: #666;">Loading...</div>
  `;

  document.body.appendChild(tooltip);
  positionTooltip(tooltip, element);

  // Show immediately without RAF complications
  tooltip.style.visibility = "visible";
  setTimeout(() => {
    if (
      tooltip.parentNode &&
      window.PRTooltipState.currentTooltip === tooltip
    ) {
      tooltip.style.opacity = "1";
      tooltip.style.transform = "scale(1) translateY(0)";
    }
  }, 10);

  // Fetch and update content
  chrome.runtime.sendMessage(
    { type: "getGeminiTooltipAnalysis", profName: professor.name },
    (response) => {
      // Check if tooltip still exists and is the current one
      if (
        !tooltip.parentNode ||
        window.PRTooltipState.currentTooltip !== tooltip
      ) {
        return;
      }

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

      // Re-position after content update (size may have changed)
      positionTooltip(tooltip, element);
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
        if (existingTooltip?.parentNode) {
          existingTooltip.parentNode.removeChild(existingTooltip);
        }
        if (window.PRTooltipState) {
          if (!owner || window.PRTooltipState.owner === owner) {
            window.PRTooltipState.owner = null;
          }
          if (window.PRTooltipState.currentTooltip === existingTooltip) {
            window.PRTooltipState.currentTooltip = null;
          }
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
