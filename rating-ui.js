// ==================== RATING UI CREATION ====================
function createLoadingSkeleton() {
  const skeleton = document.createElement("div");
  skeleton.className = CSS_CLASSES.LOADING_SKELETON;
  skeleton.setAttribute("data-loading", "true");
  return skeleton;
}

function getRatingClass(rating) {
  const numRating = parseFloat(rating);
  if (numRating >= 3.0) return "rating-stars-excellent";
  if (numRating >= 2.0) return "rating-stars-high";
  if (numRating >= 1.0) return "rating-stars-medium";
  return "rating-stars-low";
}

function ensureSVGGradients() {
  if (document.getElementById("polyratings-gradients")) return;
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  Object.assign(svg.style, {
    position: "absolute",
    width: "0",
    height: "0",
    visibility: "hidden",
  });
  svg.id = "polyratings-gradients";
  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");

  const gradients = [
    { id: "goldGradient", colors: ["#FFD700", "#FFA500", "#FF8C00"] },
    { id: "yellowOrangeGradient", colors: ["#FFA500", "#FF8C00", "#FF7F00"] },
    { id: "orangeGradient", colors: ["#FF8C00", "#FF7F00", "#FF6B00"] },
    { id: "redGradient", colors: ["#FF6B00", "#FF4500", "#FF0000"] },
  ];

  gradients.forEach(({ id, colors }) => {
    const grad = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "linearGradient"
    );
    grad.id = id;
    grad.setAttribute("x1", "0%");
    grad.setAttribute("y1", "0%");
    grad.setAttribute("x2", "100%");
    grad.setAttribute("y2", "100%");
    colors.forEach((color, i) => {
      const stop = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "stop"
      );
      stop.setAttribute("offset", `${i * 50}%`);
      stop.setAttribute("stop-color", color);
      grad.appendChild(stop);
    });
    defs.appendChild(grad);
  });

  svg.appendChild(defs);
  document.body.appendChild(svg);
}

function createRatingElement(professor, options = { animate: false }) {
  const ratingContainer = document.createElement("a");
  ratingContainer.href = professor.link;
  ratingContainer.target = "_blank";
  ratingContainer.className = CSS_CLASSES.RATING_ELEMENT;
  ratingContainer.style.cssText = `
    display: inline-flex; align-items: center; text-decoration: none;
    padding: 3px 8px; border: 1px solid #7F8A9E; border-radius: 12px;
    font-size: 12px; color: #090d19; transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    cursor: pointer; white-space: nowrap; background: rgba(255, 255, 255, 0.9);
    box-shadow: 0 1px 2px rgba(0,0,0,0.1); margin-left: 0px;
    max-width: calc(100% - 4px); overflow: hidden; width: fit-content;
    ${
      options.animate
        ? "opacity: 0; transform: translateY(8px) scale(0.95);"
        : "opacity: 1; transform: translateY(0) scale(1);"
    }
  `;
  ratingContainer.title = `View ${professor.name}'s profile on PolyRatings`;
  ratingContainer.addEventListener("click", (e) => e.stopPropagation());
  ratingContainer.addEventListener("mouseenter", () => {
    ratingContainer.style.background = "rgba(21, 71, 52, 0.12)";
    ratingContainer.style.borderColor = "#154734";
  });
  ratingContainer.addEventListener("mouseleave", () => {
    ratingContainer.style.background = "rgba(255, 255, 255, 0.9)";
    ratingContainer.style.borderColor = "#7F8A9E";
  });
  addHoverTooltip(ratingContainer, professor);

  const ratingText = document.createElement("span");
  ratingText.textContent =
    professor.rating === 0 ? "Add Prof" : `${professor.rating}/4`;
  ratingText.style.marginRight = "3px";

  const stars = document.createElement("span");
  stars.className = "star-rating";
  stars.style.display = "inline-flex";
  stars.style.gap = "1px";

  if (professor.rating > 0) {
    ensureSVGGradients();
    const ratingClass = getRatingClass(professor.rating);
    stars.innerHTML = `<svg viewBox="0 0 51 48" style="width:0.9em; height:0.9em; align-self: flex-start; margin-top: -2px;" stroke-width="2" class="${ratingClass}"><path d="m25,1 6,17h18l-14,11 5,17-15-10-15,10 5-17-14-11h18z"></path></svg>`;

    // Retry mechanism for star rendering
    [100, 500, 1000].forEach((delay, idx) => {
      setTimeout(() => {
        const svgElement = stars.querySelector("svg");
        if (!svgElement?.querySelector("path")) {
          if (idx === 2) {
            const rating = parseFloat(professor.rating);
            let color = "#FFD700";
            if (rating >= 3.0) color = "#FFD700";
            else if (rating >= 2.0) color = "#FFA500";
            else if (rating >= 1.0) color = "#FF8C00";
            else color = "#FF6B00";
            stars.innerHTML = `<svg viewBox="0 0 51 48" style="width:0.9em; height:0.9em; align-self: flex-start; margin-top: -2px;" stroke-width="2" fill="${color}" stroke="#B8860B"><path d="m25,1 6,17h18l-14,11 5,17-15-10-15,10 5-17-14-11h18z"></path></svg>`;
          } else {
            const ratingClass = getRatingClass(professor.rating);
            stars.innerHTML = `<svg viewBox="0 0 51 48" style="width:0.9em; height:0.9em; align-self: flex-start; margin-top: -2px;" stroke-width="2" class="${ratingClass}"><path d="m25,1 6,17h18l-14,11 5,17-15-10-15,10 5-17-14-11h18z"></path></svg>`;
          }
        }
      }, delay);
    });
  }

  ratingContainer.appendChild(ratingText);
  ratingContainer.appendChild(stars);
  if (options.animate) {
    ratingContainer.classList.add("fade-in");
    setTimeout(() => {
      ratingContainer.style.transform = "translateY(0) scale(1)";
      ratingContainer.style.opacity = "1";
    }, 10);
  }
  return ratingContainer;
}

function createNotFoundBadge(professorName) {
  const notFoundContainer = document.createElement("span");
  notFoundContainer.style.cssText = `
    display: inline-flex; align-items: center; padding: 3px 8px;
    background: rgba(255, 255, 255, 0.9); border: 1px solid #7F8A9E;
    border-radius: 12px; font-size: 12px; color: #090d19; text-decoration: none;
    transition: all 0.2s ease; cursor: pointer; white-space: nowrap;
    box-shadow: 0 1px 2px rgba(0,0,0,0.1); margin-left: 0px;
    max-width: calc(100% - 4px); overflow: hidden; width: fit-content; margin-top: 4px;
  `;
  const notFoundText = document.createElement("span");
  notFoundText.textContent = "Add Prof";
  notFoundText.style.cssText =
    "white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%;";
  notFoundContainer.appendChild(notFoundText);
  notFoundContainer.addEventListener("mouseenter", () => {
    notFoundContainer.style.background = "rgba(21, 71, 52, 0.12)";
    notFoundContainer.style.borderColor = "#154734";
  });
  notFoundContainer.addEventListener("mouseleave", () => {
    notFoundContainer.style.background = "rgba(255, 255, 255, 0.9)";
    notFoundContainer.style.borderColor = "#7F8A9E";
  });
  notFoundContainer.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    window.open(
      `https://polyratings.dev/new-professor?name=${encodeURIComponent(
        professorName
      )}`,
      "_blank"
    );
  });
  notFoundContainer.title = `Add ${professorName} to PolyRatings`;
  addHoverTooltip(notFoundContainer, { name: professorName, rating: 0 });
  return notFoundContainer;
}

function cleanupCorruptedText(element) {
  const textNodes = Array.from(element.childNodes).filter(
    (n) => n.nodeType === Node.TEXT_NODE
  );
  textNodes.forEach((node) => {
    if (node.textContent.includes("Add to PolyRatings")) node.remove();
  });
}

function injectRatingUI(professorElement, professor, profIndex = 0) {
  // Safety check: don't inject on disabled pages
  if (shouldDisableForClassNotes(document)) return;
  
  const professorName = professor.name;
  const existingRatings = professorElement.querySelectorAll(
    `[data-professor="${professorName}"][data-index="${profIndex}"]`
  );
  existingRatings.forEach((r) => r.remove());

  const ratingElement = createRatingElement(professor, { animate: true });
  ratingElement.setAttribute("data-professor", professorName);
  ratingElement.setAttribute("data-index", profIndex.toString());
  ratingElement.setAttribute(CSS_CLASSES.DATA_ATTR, "true");
  ratingElement.setAttribute("data-pr-initialized", "true");
  if (profIndex > 0) ratingElement.style.marginLeft = "12px";

  const lineBreak = document.createElement("br");
  lineBreak.setAttribute(CSS_CLASSES.DATA_ATTR, "true");
  professorElement.appendChild(lineBreak);
  professorElement.appendChild(ratingElement);

  // Trigger animation smoothly
  requestAnimationFrame(() => {
    ratingElement.style.opacity = "1";
    ratingElement.style.transform = "translateY(0) scale(1)";
  });

  const localObserver = new MutationObserver(() => {
    const exists = professorElement.querySelector(
      `[data-professor="${CSS.escape(
        professorName
      )}"][data-index="${profIndex}"]`
    );
    if (!exists) {
      setTimeout(() => {
        if (
          professorElement.querySelector(
            `[data-professor="${CSS.escape(
              professorName
            )}"][data-index="${profIndex}"]`
          )
        )
          return;
        if (!isElementMostlyVisible(professorElement)) return;
        const reInjected = createRatingElement(professor, { animate: false });
        reInjected.setAttribute("data-professor", professorName);
        reInjected.setAttribute("data-index", profIndex.toString());
        reInjected.setAttribute(CSS_CLASSES.DATA_ATTR, "true");
        reInjected.setAttribute("data-pr-initialized", "true");
        const br = document.createElement("br");
        br.setAttribute(CSS_CLASSES.DATA_ATTR, "true");
        professorElement.appendChild(br);
        professorElement.appendChild(reInjected);
      }, 200);
    }
  });
  try {
    localObserver.observe(professorElement, { childList: true });
    setTimeout(() => localObserver.disconnect(), OBSERVER_TIMEOUT);
  } catch {}
}

function injectDesktopRatingUI(professorNameElement, professor) {
  // Safety check: don't inject on disabled pages
  if (shouldDisableForClassNotes(document)) return;
  
  cleanupCorruptedText(professorNameElement);
  const existingRatings = professorNameElement.querySelectorAll(
    `.${CSS_CLASSES.RATING_ELEMENT}, .pr-rating-container`
  );
  existingRatings.forEach((r) => r.remove());

  injectStyles();
  const ratingEl = createRatingElement(professor, { animate: true });
  const originalText = professorNameElement.textContent.trim();

  const container = document.createElement("div");
  container.style.cssText =
    "display: flex; flex-direction: column; width: 100%; align-items: flex-start; gap: 2px;";

  const nameSpan = document.createElement("div");
  nameSpan.textContent = originalText;
  nameSpan.style.cssText =
    "white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 100%; line-height: 1.2;";

  const ratingContainer = document.createElement("div");
  ratingContainer.style.cssText = "width: 100%; overflow: hidden;";
  ratingContainer.appendChild(ratingEl);

  container.appendChild(nameSpan);
  container.appendChild(ratingContainer);
  professorNameElement.innerHTML = "";
  professorNameElement.appendChild(container);
  addHoverTooltip(professorNameElement, professor);
  container.setAttribute(CSS_CLASSES.DATA_ATTR, "true");

  // Trigger animation smoothly
  requestAnimationFrame(() => {
    ratingEl.style.opacity = "1";
    ratingEl.style.transform = "translateY(0) scale(1)";
  });

  const desktopObserver = new MutationObserver(() => {
    if (!document.contains(container)) {
      setTimeout(() => {
        if (document.contains(container)) return;
        if (!isElementMostlyVisible(professorNameElement)) return;
        desktopObserver.disconnect();
        injectDesktopRatingUI(professorNameElement, professor);
      }, 200);
    }
  });
  try {
    desktopObserver.observe(professorNameElement, { childList: true });
    setTimeout(() => desktopObserver.disconnect(), OBSERVER_TIMEOUT);
  } catch {}
}

function injectDesktopNotFoundUI(professorNameElement, professorName) {
  // Safety check: don't inject on disabled pages
  if (shouldDisableForClassNotes(document)) return;
  
  cleanupCorruptedText(professorNameElement);
  const existingRatings = professorNameElement.querySelectorAll(
    `.${CSS_CLASSES.RATING_ELEMENT}, .pr-rating-container`
  );
  existingRatings.forEach((r) => r.remove());

  injectStyles();
  const notFoundEl = createNotFoundBadge(professorName);
  const originalText = professorNameElement.textContent.trim();

  const container = document.createElement("div");
  container.style.cssText =
    "display: flex; flex-direction: column; width: 100%; align-items: flex-start; gap: 2px;";

  const nameSpan = document.createElement("div");
  nameSpan.textContent = originalText;
  nameSpan.style.cssText =
    "white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 100%; line-height: 1.2;";

  const badgeContainer = document.createElement("div");
  badgeContainer.style.cssText = "width: 100%; overflow: hidden;";
  badgeContainer.appendChild(notFoundEl);

  container.appendChild(nameSpan);
  container.appendChild(badgeContainer);
  professorNameElement.innerHTML = "";
  professorNameElement.appendChild(container);
  addHoverTooltip(professorNameElement, { name: professorName, rating: 0 });
  container.setAttribute(CSS_CLASSES.DATA_ATTR, "true");

  const checkInterval = setInterval(() => {
    if (!document.contains(container)) {
      clearInterval(checkInterval);
      setTimeout(
        () => injectDesktopNotFoundUI(professorNameElement, professorName),
        100
      );
    }
  }, 1000);
  setTimeout(() => clearInterval(checkInterval), OBSERVER_TIMEOUT);
}
