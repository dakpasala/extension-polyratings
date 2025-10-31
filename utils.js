// ==================== STATE ====================
let currentUrl = window.location.href.split("#")[0];
const processedProfessors = new Set();

// ==================== UTILITY FUNCTIONS ====================
function isElementMostlyVisible(el) {
  try {
    const rect = el.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight;
    const vw = window.innerWidth || document.documentElement.clientWidth;
    if (rect.width === 0 || rect.height === 0) return false;
    const vertVisible = Math.min(rect.bottom, vh) - Math.max(rect.top, 0);
    const horizVisible = Math.min(rect.right, vw) - Math.max(rect.left, 0);
    const visibleArea = Math.max(0, vertVisible) * Math.max(0, horizVisible);
    const totalArea = rect.width * rect.height;
    return totalArea > 0 && visibleArea / totalArea >= VISIBILITY_THRESHOLD;
  } catch {
    return true;
  }
}

function prMessage(type, payload) {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage({ type, ...payload }, (response) => {
        resolve(response || { status: "error", message: "no_response" });
      });
    } catch (e) {
      resolve({ status: "error", message: e?.message || "send_failed" });
    }
  });
}

function scheduleStableRender(hostElement, renderFn, attempts = 10) {
  const tryRender = () => {
    if (window.prScrollState?.busy) {
      if (attempts <= 0) return;
      setTimeout(
        () => scheduleStableRender(hostElement, renderFn, attempts - 1),
        80
      );
      return;
    }
    if (!isElementMostlyVisible(hostElement)) {
      if (attempts <= 0) return;
      setTimeout(
        () => scheduleStableRender(hostElement, renderFn, attempts - 1),
        120
      );
      return;
    }
    try {
      renderFn();
    } catch {}
  };
  tryRender();
}

function shouldDisableForClassNotes(rootDoc) {
  try {
    const doc = rootDoc || document;
    const headers = Array.from(
      doc.querySelectorAll("p.cx-MuiTypography-h4, .cx-MuiTypography-h4")
    ).filter(
      (el) => (el.textContent || "").trim().toLowerCase() === "class notes"
    );

    for (const header of headers) {
      let notesContainer = header.parentElement;
      let notesText = "";
      if (header.nextElementSibling) {
        notesText = header.nextElementSibling.textContent || "";
      }
      if (!notesText && notesContainer) {
        const bodyNode = notesContainer.querySelector(
          ".cx-MuiTypography-body1, .cx-MuiTypography-body2, p"
        );
        if (bodyNode) notesText = bodyNode.textContent || "";
      }
      notesText = notesText.toLowerCase();
      if (DISABLING_PHRASES.some((p) => notesText.includes(p))) return true;
    }

    const bodyText = (
      doc.body?.innerText ||
      doc.documentElement?.textContent ||
      ""
    ).toLowerCase();
    if (!bodyText.includes("class notes")) return false;
    return DISABLING_PHRASES.some((phrase) => bodyText.includes(phrase));
  } catch {
    return false;
  }
}

function shouldEnableAgent(rootDoc) {
  const doc = rootDoc || document;
  const host = location?.hostname || "";
  if (!CALPOLY_REGEX.test(host)) return false;
  try {
    const text = (
      doc.body?.innerText ||
      doc.documentElement?.textContent ||
      ""
    ).toLowerCase();
    return text.includes("select sections");
  } catch {
    return false;
  }
}

function markProfessorProcessed(professorName, elementId) {
  processedProfessors.add(`${professorName}-${elementId}`);
}

function isProfessorProcessed(professorName, elementId) {
  return processedProfessors.has(`${professorName}-${elementId}`);
}

function getElementPath(element) {
  const path = [];
  let current = element;
  while (current && current !== document.body) {
    let selector = current.tagName.toLowerCase();
    if (current.id) {
      selector += `#${current.id}`;
    } else if (current.className) {
      selector += `.${Array.from(current.classList).join(".")}`;
    }
    const siblings = Array.from(current.parentNode.children);
    selector += `:nth-child(${siblings.indexOf(current) + 1})`;
    path.unshift(selector);
    current = current.parentNode;
  }
  return path.join(" > ");
}

function clearRatingsIfUrlChanged() {
  if (typeof currentUrl === "undefined") {
    currentUrl = window.location.href.split("#")[0];
  }
  const newUrl = window.location.href.split("#")[0];
  if (newUrl !== currentUrl) {
    document
      .querySelectorAll(`.${CSS_CLASSES.RATING_ELEMENT}`)
      .forEach((r) => r.remove());
    currentUrl = newUrl;
  }
}

// ==================== SCROLL MANAGEMENT ====================
if (!window.prScrollState) {
  window.prScrollState = { busy: false, t: null };
  const onScroll = () => {
    window.prScrollState.busy = true;
    if (window.prScrollState.t) clearTimeout(window.prScrollState.t);
    window.prScrollState.t = setTimeout(() => {
      window.prScrollState.busy = false;
      window.prScrollState.t = null;
    }, SCROLL_THROTTLE_MS);
  };
  document.addEventListener("scroll", onScroll, {
    capture: true,
    passive: true,
  });
}

setInterval(clearRatingsIfUrlChanged, URL_CHECK_INTERVAL);
