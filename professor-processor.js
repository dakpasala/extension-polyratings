// ==================== PROFESSOR PROCESSING ====================
function processMobileProfessors() {
  const dtElements = document.querySelectorAll(SELECTORS.MOBILE_INSTRUCTOR);
  const mobileBatch = [];

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

          // Mark as processing immediately to prevent duplicate attempts
          markProfessorProcessed(professorName, elementId);

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
    // Add skeletons immediately without delay
    const containerToSkeleton = new Map();
    mobileBatch.forEach((item) => {
      if (!containerToSkeleton.has(item.element)) {
        const sk = createLoadingSkeleton();
        sk.setAttribute(CSS_CLASSES.DATA_ATTR, "true");
        item.element.appendChild(sk);
        containerToSkeleton.set(item.element, sk);
      }
    });

    // Process immediately without debounce delay
    Promise.all(mobileBatch.map((b) => b.promise.then((res) => ({ res, b }))))
      .then((results) => {
        // Remove all skeletons
        containerToSkeleton.forEach((sk) => {
          if (sk?.parentNode) sk.parentNode.removeChild(sk);
        });

        // Inject ratings immediately
        results.forEach(({ res, b }) => {
          const { element, professorName, profIndex } = b;
          if (!element || !document.contains(element)) return;

          // Skip if already processing or rating exists
          if (element.hasAttribute("data-pr-processing")) return;

          const exists = element.querySelector(
            `[data-professor="${CSS.escape(
              professorName
            )}"][data-index="${profIndex}"]`
          );
          if (exists) return;

          if (res.status === "success" && res.professor) {
            injectRatingUI(element, res.professor, profIndex);
          } else if (res.status === "not_found") {
            const notFoundBadge = createNotFoundBadge(professorName, {
              animate: true,
            });
            notFoundBadge.className = CSS_CLASSES.RATING_ELEMENT;
            notFoundBadge.setAttribute("data-professor", professorName);
            notFoundBadge.setAttribute("data-index", profIndex.toString());
            const br = document.createElement("br");
            br.setAttribute(CSS_CLASSES.DATA_ATTR, "true");
            element.appendChild(br);
            element.appendChild(notFoundBadge);
            if (profIndex > 0) notFoundBadge.style.marginLeft = "12px";

            // Trigger animation
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                notFoundBadge.style.opacity = "1";
                notFoundBadge.style.transform = "translateY(0) scale(1)";
              });
            });
          }
        });
      })
      .catch(() => {
        // Remove skeletons on error
        containerToSkeleton.forEach((sk) => {
          if (sk?.parentNode) sk.parentNode.removeChild(sk);
        });
      });
  }

  return mobileBatch.length > 0;
}

function processDesktopProfessors() {
  const mainGridContainers = document.querySelectorAll(SELECTORS.DESKTOP_GRID);
  if (mainGridContainers.length === 0) {
    console.log("PR: No desktop grid containers found");
    return false;
  }

  console.log(`PR: Found ${mainGridContainers.length} desktop grid containers`);
  let processedCount = 0;

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

      // Prevent race condition: skip if already processing
      if (professorNameElement.hasAttribute("data-pr-processing")) {
        console.log(`PR: Skipping ${professorName} - already processing`);
        return;
      }

      // Check if already processed using the tracking system
      if (isProfessorProcessed(professorName, elementId)) {
        console.log(`PR: Skipping ${professorName} - already tracked`);
        return;
      }

      // Mark as processing immediately
      markProfessorProcessed(professorName, elementId);
      processedCount++;
      console.log(`PR: Processing desktop professor: ${professorName}`);

      chrome.runtime.sendMessage(
        { type: "getProfRating", profName: professorName },
        (response) => {
          if (!document.contains(professorNameElement)) {
            console.log(`PR: Element removed for ${professorName}`);
            return;
          }

          if (response.status === "success" && response.professor) {
            console.log(`PR: Injecting rating for ${professorName}`);
            injectDesktopRatingUI(professorNameElement, response.professor);
          } else if (response.status === "not_found") {
            console.log(`PR: Professor not found: ${professorName}`);
            injectDesktopNotFoundUI(professorNameElement, professorName);
          }
        }
      );
    });
  });

  console.log(`PR: Processed ${processedCount} desktop professors`);
  return processedCount > 0;
}

function findAndLogProfessors() {
  // Prevent race condition: return if already processing
  if (window.processingProfessors) {
    console.log("PR: Skipping - already processing");
    return;
  }
  window.processingProfessors = true;
  console.log("PR: Starting professor processing");

  // Simple timeout-based lock release (not blocking async operations)
  const releaseLock = () => {
    setTimeout(() => {
      window.processingProfessors = false;
      console.log("PR: Processing lock released");
    }, 100);
  };

  try {
    // Check if we should skip rating injection but keep agent button
    const isDisabledPage = shouldDisableForClassNotes(document);

    if (isDisabledPage) {
      // Remove any existing ratings and related elements on disabled pages
      document
        .querySelectorAll(`.${CSS_CLASSES.RATING_ELEMENT}`)
        .forEach((el) => {
          el.remove();
        });
      // Remove any professor tooltips
      document
        .querySelectorAll(`.${CSS_CLASSES.PROFESSOR_TOOLTIP}`)
        .forEach((el) => {
          el.remove();
        });
      // Remove loading skeletons
      document
        .querySelectorAll(`.${CSS_CLASSES.LOADING_SKELETON}`)
        .forEach((el) => {
          el.remove();
        });
      // Remove any line breaks we added (but not the agent button)
      document
        .querySelectorAll(`[${CSS_CLASSES.DATA_ATTR}="true"]`)
        .forEach((el) => {
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
      console.log("PR: Processed professors - mobile:", mobileFound);
    }

    // Always inject the agent button, even on disabled pages
    injectAskAgentButton();
  } catch (error) {
    console.error("PR: Error processing professors:", error);
  } finally {
    releaseLock();
  }
}
