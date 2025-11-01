// ==================== PROFESSOR PROCESSING ====================
function processMobileProfessors() {
  const dtElements = document.querySelectorAll(SELECTORS.MOBILE_INSTRUCTOR);
  const mobileBatch = [];
  let mobileBatchTimeout;

  dtElements.forEach((dt) => {
    if (dt.textContent.trim() === "Instructor:") {
      const nextElement = dt.nextElementSibling;
      if (nextElement) {
        const instructorText = nextElement.textContent.trim();
        const professorNames = instructorText
          .split(",")
          .map((n) => n.trim())
          .filter((n) => n.length > 0);
        professorNames.forEach((professorName, profIndex) => {
          const elementId = getElementPath(nextElement);
          const existingProfRating = nextElement.querySelector(
            `[data-professor="${professorName}"][data-index="${profIndex}"]`
          );
          if (
            existingProfRating ||
            isProfessorProcessed(professorName, elementId)
          )
            return;

          mobileBatch.push({
            element: nextElement,
            professorName,
            profIndex,
            elementId,
            promise: prMessage("getProfRating", { profName: professorName }),
          });
        });
      }
    }
  });

  if (mobileBatch.length > 0) {
    const containerToSkeleton = new Map();
    mobileBatch.forEach((item) => {
      if (!containerToSkeleton.has(item.element)) {
        const sk = createLoadingSkeleton();
        sk.setAttribute(CSS_CLASSES.DATA_ATTR, "true");
        item.element.appendChild(sk);
        containerToSkeleton.set(item.element, sk);
      }
    });

    clearTimeout(mobileBatchTimeout);
    mobileBatchTimeout = setTimeout(async () => {
      try {
        const results = await Promise.all(
          mobileBatch.map((b) => b.promise.then((res) => ({ res, b })))
        );
        containerToSkeleton.forEach((sk) => {
          if (sk?.parentNode) sk.parentNode.removeChild(sk);
        });

        results.forEach(({ res, b }) => {
          const { element, professorName, profIndex, elementId } = b;
          if (!element || !document.contains(element)) return;

          scheduleStableRender(element, () => {
            const exists = element.querySelector(
              `[data-professor="${CSS.escape(
                professorName
              )}"][data-index="${profIndex}"]`
            );
            if (exists) return;

            if (res.status === "success" && res.professor) {
              injectRatingUI(element, res.professor, profIndex);
              markProfessorProcessed(professorName, elementId);
            } else if (res.status === "not_found") {
              const notFoundBadge = createNotFoundBadge(professorName);
              notFoundBadge.className = CSS_CLASSES.RATING_ELEMENT;
              notFoundBadge.setAttribute("data-professor", professorName);
              notFoundBadge.setAttribute("data-index", profIndex.toString());
              const br = document.createElement("br");
              br.setAttribute(CSS_CLASSES.DATA_ATTR, "true");
              element.appendChild(br);
              element.appendChild(notFoundBadge);
              if (profIndex > 0) notFoundBadge.style.marginLeft = "12px";
              markProfessorProcessed(professorName, elementId);
            }
          });
        });
      } catch {
        containerToSkeleton.forEach((sk) => {
          if (sk?.parentNode) sk.parentNode.removeChild(sk);
        });
      }
    }, DEBOUNCE_DELAY);
  }

  return mobileBatch.length > 0;
}

function processDesktopProfessors() {
  const mainGridContainers = document.querySelectorAll(SELECTORS.DESKTOP_GRID);
  if (mainGridContainers.length === 0) return;

  mainGridContainers.forEach((container) => {
    const detailsGridItems = container.querySelectorAll(
      SELECTORS.DESKTOP_DETAILS
    );
    detailsGridItems.forEach((detailsItem) => {
      const professorNameCells = detailsItem.querySelectorAll(
        SELECTORS.DESKTOP_PROF_NAME.split(" ")[0]
      );
      if (professorNameCells.length === 0) return;

      const firstCell = professorNameCells[0];
      const professorNameElement = firstCell.querySelector(
        ".cx-MuiTypography-body2"
      );
      if (!professorNameElement) return;

      const professorName = professorNameElement.textContent.trim();
      if (!professorName) return;

      const elementId = getElementPath(professorNameElement);
      const existingRating = professorNameElement.querySelector(
        `.${CSS_CLASSES.RATING_ELEMENT}, .pr-rating-container`
      );
      if (existingRating) return;

      chrome.runtime.sendMessage(
        { type: "getProfRating", profName: professorName },
        (response) => {
          if (response.status === "success" && response.professor) {
            injectDesktopRatingUI(professorNameElement, response.professor);
          } else if (response.status === "not_found") {
            injectDesktopNotFoundUI(professorNameElement, professorName);
          }
        }
      );
    });
  });
}

function findAndLogProfessors() {
  if (window.processingProfessors) return;
  window.processingProfessors = true;
  setTimeout(() => {
    window.processingProfessors = false;
  }, 50);

  // Check if we should skip rating injection but keep agent button
  const isDisabledPage = shouldDisableForClassNotes(document);
  
  if (isDisabledPage) {
    // Remove any existing ratings and related elements on disabled pages
    document.querySelectorAll(`.${CSS_CLASSES.RATING_ELEMENT}`).forEach((el) => {
      el.remove();
    });
    // Remove any professor tooltips
    document.querySelectorAll(`.${CSS_CLASSES.PROFESSOR_TOOLTIP}`).forEach((el) => {
      el.remove();
    });
    // Remove loading skeletons
    document.querySelectorAll(`.${CSS_CLASSES.LOADING_SKELETON}`).forEach((el) => {
      el.remove();
    });
    // Remove any line breaks we added (but not the agent button)
    document.querySelectorAll(`[${CSS_CLASSES.DATA_ATTR}="true"]`).forEach((el) => {
      if (!el.classList.contains(CSS_CLASSES.ASK_AGENT_BTN)) {
        el.remove();
      }
    });
  } else {
    cleanupCorruptedText(
      document.querySelector('[role="cell"]') || document.body
    );
    const mobileFound = processMobileProfessors();
    if (!mobileFound) processDesktopProfessors();
  }
  
  // Always inject the agent button, even on disabled pages
  injectAskAgentButton();
}
