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
      setupMutationObserver();
      setupButtonObserver();
    });
    if (iframe.contentDocument?.readyState === "complete") {
      setupMutationObserver();
      setupButtonObserver();
    }
  } else {
    setupMutationObserver();
    setupButtonObserver();
  }
} else {
  setupMutationObserver();
  setupButtonObserver();
}
