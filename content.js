// PolyRatings Enhancer - Content Script
console.log("PolyRatings Enhancer content script loaded!");

// ==================== INITIALIZATION ====================
// Note: We check shouldDisableForClassNotes dynamically in observers,
// not just once at load time, so the extension can re-enable on navigation
if (window.top === window) {
  chrome.runtime.sendMessage({ type: "preloadData" }, () => {});
  const iframe = document.querySelector('iframe[name="TargetContent"]');
  if (iframe) {
    iframe.addEventListener("load", () => {
      try {
        const iframeDoc =
          iframe.contentDocument || iframe.contentWindow?.document;
        if (iframeDoc && shouldDisableForClassNotes(iframeDoc)) return;
      } catch {}
      setupMutationObserver();
      if (shouldEnableAgent(iframe.contentDocument)) setupButtonObserver();
    });
    if (iframe.contentDocument?.readyState === "complete") {
      const iframeDoc = iframe.contentDocument;
      if (!shouldDisableForClassNotes(iframeDoc)) {
        setupMutationObserver();
        setupButtonObserver();
      }
    }
  } else {
    setupMutationObserver();
    if (shouldEnableAgent(document)) setupButtonObserver();
  }
} else {
  setupMutationObserver();
  if (shouldEnableAgent(document)) setupButtonObserver();
}
