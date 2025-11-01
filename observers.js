// ==================== MUTATION OBSERVER ====================
function isOurNode(node) {
  if (!node || node.nodeType !== Node.ELEMENT_NODE) return false;
  const el = node;
  if (el.getAttribute?.(CSS_CLASSES.DATA_ATTR) === "true") return true;
  const cls = el.classList || { contains: () => false };
  if (
    cls.contains(CSS_CLASSES.RATING_ELEMENT) ||
    cls.contains(CSS_CLASSES.PROFESSOR_TOOLTIP) ||
    cls.contains(CSS_CLASSES.ASK_AGENT_BTN)
  )
    return true;
  if (el.id === "polyratings-gradients" || el.id === "pr-style") return true;
  return (
    el.querySelector?.(`[${CSS_CLASSES.DATA_ATTR}="true"]`) ||
    el.querySelector?.(`.${CSS_CLASSES.RATING_ELEMENT}`) ||
    el.querySelector?.(`.${CSS_CLASSES.PROFESSOR_TOOLTIP}`) ||
    el.querySelector?.(`.${CSS_CLASSES.ASK_AGENT_BTN}`)
  );
}

function hasRelevantChanges(mutations) {
  return mutations.some((mutation) => {
    for (let node of mutation.addedNodes || []) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        if (node.querySelectorAll?.(SELECTORS.MOBILE_INSTRUCTOR)?.length > 0)
          return true;
        if (node.tagName === "DT") return true;
        if (node.querySelectorAll?.(SELECTORS.DESKTOP_GRID)?.length > 0)
          return true;
        if (
          node.classList?.contains("cx-MuiGrid-container") &&
          node.classList?.contains("cx-MuiGrid-wrap-xs-nowrap")
        )
          return true;
        if (node.textContent?.includes("Instructor")) return true;
      }
    }
    if (mutation.type === "attributes") {
      const target = mutation.target;
      if (
        target.classList?.contains("cx-MuiGrid-container") ||
        target.classList?.contains("cx-MuiGrid-wrap-xs-nowrap")
      )
        return true;
    }
    return false;
  });
}

function setupMutationObserver() {
  let debounceTimeout;
  let isProcessing = false;

  const observer = new MutationObserver((mutations) => {
    const onlyOurChanges = mutations.every((mutation) => {
      const nodes = [
        ...Array.from(mutation.addedNodes || []),
        ...Array.from(mutation.removedNodes || []),
      ];
      return nodes.length > 0 && nodes.every((n) => isOurNode(n));
    });

    if (onlyOurChanges) return;
    
    // Check if we should disable on this specific page
    if (shouldDisableForClassNotes(document)) {
      // Don't disconnect - just skip processing so we can re-enable on navigation
      return;
    }
    
    if (isProcessing) return;

    if (hasRelevantChanges(mutations)) {
      clearTimeout(debounceTimeout);
      isProcessing = true;
      debounceTimeout = setTimeout(() => {
        findAndLogProfessors();
        isProcessing = false;
      }, 25);
    }
  });

  // Always set up the observer so it can re-enable on navigation
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    characterData: true,
  });
  
  // Only process initially if not on a disabled page
  if (!shouldDisableForClassNotes(document)) {
    findAndLogProfessors();
  }
}
