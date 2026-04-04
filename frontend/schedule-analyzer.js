// ==================== SCHEDULE ANALYZER ====================

// Extract checked courses from the schedule builder page
function getCheckedCourses() {
  const courses = [];
  
  // Find all rows with the paper container class (Cal Poly's structure)
  const rows = document.querySelectorAll('.cx-MuiPaper-root');
  console.log(`🔍 Found ${rows.length} course rows`);
  
  rows.forEach((row, index) => {
    // Look for checkbox input with aria-checked="true"
    const checkbox = row.querySelector('input[type="checkbox"][aria-checked="true"]');
    
    if (!checkbox) {
      return; // Not checked, skip
    }
    
    // Get course code - it's in a button with class cx-MuiLink-button
    const courseButton = row.querySelector('button.cx-MuiLink-button');
    const courseCode = courseButton ? courseButton.textContent.trim() : '';
    
    // Get course title - first p tag with cx-MuiTypography-body1
    const titleElements = row.querySelectorAll('.cx-MuiTypography-body1');
    const courseTitle = titleElements.length > 0 ? titleElements[0].textContent.trim() : '';
    
    // Get units - element with cx-MuiTypography-alignCenter
    const unitsElement = row.querySelector('.cx-MuiTypography-alignCenter');
    const units = unitsElement ? unitsElement.textContent.trim() : '';
    
    if (!courseCode) {
      console.log(`   Row ${index}: No course code found, skipping`);
      return;
    }
    
    console.log(`   ✅ Found: ${courseCode} - ${courseTitle} (${units} units)`);
    
    courses.push({
      code: courseCode,
      title: courseTitle,
      units: units
    });
  });
  
  console.log(`📚 Total checked courses: ${courses.length}`, courses);
  return courses;
}

// Create "Analyze My Schedule" button
function createAnalyzeScheduleButton() {
  // Don't create duplicate buttons
  if (document.querySelector('.pr-analyze-schedule-btn')) {
    console.log('✅ Analyze Schedule button already exists');
    return;
  }
  
  console.log('🔍 Looking for button container at bottom...');
  
  // Find the container with "delete selected", "save", "build schedule" buttons
  let buttonContainer = null;
  
  // Look for "Build Schedule" button and get its container
  const allButtons = document.querySelectorAll('button');
  allButtons.forEach(btn => {
    const text = btn.textContent.trim().toLowerCase();
    if (text === 'build schedule') {
      buttonContainer = btn.closest('.cx-MuiGrid-root.d-flex');
      console.log('✅ Found Build Schedule button container');
    }
  });
  
  if (!buttonContainer) {
    console.log('⚠️ Could not find button container at bottom');
    return;
  }
  
  // Create button container
  const buttonWrapper = document.createElement('div');
  buttonWrapper.style.cssText = 'margin: 16px 0; display: flex; gap: 12px; align-items: center;';
  
  // Create Analyze button matching Cal Poly's style
  const analyzeBtn = document.createElement('button');
  analyzeBtn.className = 'pr-analyze-schedule-btn cx-MuiButtonBase-root cx-MuiButton-root cx-MuiButton-outlined mr-1';
  analyzeBtn.tabIndex = 0;
  analyzeBtn.type = 'button';
  
  // Override outline color to purple
  analyzeBtn.style.cssText = `
    border-color: #154734;
    color: #154734;
  `;
  analyzeBtn.addEventListener('mouseenter', () => {
    analyzeBtn.style.backgroundColor = 'rgba(21, 71, 52, 0.08)';
  });
  analyzeBtn.addEventListener('mouseleave', () => {
    analyzeBtn.style.backgroundColor = 'transparent';
  });
  
  // Create button label span (Cal Poly structure)
  const buttonLabel = document.createElement('span');
  buttonLabel.className = 'cx-MuiButton-label';
  buttonLabel.textContent = 'analyze schedule';
  analyzeBtn.appendChild(buttonLabel);
  
  analyzeBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    analyzeSchedule();
  }, true);
  
  // Insert as first button in the container
  buttonContainer.insertBefore(analyzeBtn, buttonContainer.firstChild);
  console.log('✅ Analyze Schedule button inserted at bottom');
}

// Open separate analysis popup (NOT the agent popup)
function openAnalysisPopup(courses) {
  // Close any existing analysis popup
  const existingPopup = document.querySelector('.pr-analysis-popup');
  if (existingPopup) existingPopup.remove();
  
  // Create popup container
  const popup = document.createElement('div');
  popup.className = 'pr-analysis-popup';
  popup.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    border-radius: 14px;
    box-shadow: 0 16px 48px rgba(0,0,0,0.14), 0 4px 12px rgba(0,0,0,0.06);
    width: 500px;
    max-width: 90vw;
    height: 600px;
    max-height: 80vh;
    min-width: 350px;
    min-height: 400px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    z-index: 10000;
    opacity: 0;
    resize: both;
  `;
  
  // Trigger fade in after element is in DOM
  setTimeout(() => {
    popup.style.transition = 'opacity 0.2s ease-out';
    popup.style.opacity = '1';
  }, 10);
  
  // Header
  const header = document.createElement('div');
  header.style.cssText = `
    padding: 12px 16px;
    border-bottom: 1px solid #f0f0f0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    cursor: default;
    user-select: none;
    background: #fff;
    border-radius: 14px 14px 0 0;
  `;
  header.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;">
      <div style="width:28px;height:28px;border-radius:50%;background:#154734;display:flex;align-items:center;justify-content:center;">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M3 3h18v18H3z"/><path d="M12 8v8"/><path d="M8 12h8"/></svg>
      </div>
      <div>
        <div style="font-size:14px;font-weight:500;color:#222;">Schedule analysis</div>
        <div style="font-size:11px;color:#bbb;">AI-powered insights</div>
      </div>
    </div>
    <div class="close-analysis-btn" style="
      width:24px;height:24px;border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      cursor:pointer;color:#ccc;transition:all 0.15s;
    "><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></div>
  `;
  
  // Make draggable
  let isDragging = false;
  let startX, startY, initialLeft, initialTop;
  
  header.addEventListener('mousedown', (e) => {
    if (e.target.classList.contains('close-analysis-btn')) return;
    
    isDragging = true;
    header.style.cursor = 'grabbing';
    
    const rect = popup.getBoundingClientRect();
    startX = e.clientX;
    startY = e.clientY;
    initialLeft = rect.left;
    initialTop = rect.top;
    
    const onMouseMove = (moveEvent) => {
      if (!isDragging) return;
      
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      
      let newLeft = initialLeft + deltaX;
      let newTop = initialTop + deltaY;
      
      // Clamp to viewport
      const margin = 10;
      const width = popup.offsetWidth;
      const height = popup.offsetHeight;
      newLeft = Math.max(margin, Math.min(newLeft, window.innerWidth - width - margin));
      newTop = Math.max(margin, Math.min(newTop, window.innerHeight - height - margin));
      
      popup.style.left = `${newLeft}px`;
      popup.style.top = `${newTop}px`;
      popup.style.transform = 'none';
    };
    
    const onMouseUp = () => {
      isDragging = false;
      header.style.cursor = 'grab';
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  });
  
  // Messages area
  const messagesArea = document.createElement('div');
  messagesArea.className = 'analysis-messages';
  messagesArea.style.cssText = 'flex: 1; padding: 20px; overflow-y: auto; background: #fff;';
  
  // Analyzing message
  const analyzingMsg = document.createElement('div');
  analyzingMsg.style.cssText = `
    background: white; padding: 16px; border-radius: 12px;
    margin-bottom: 16px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    border-left: 4px solid #154734;
  `;
  analyzingMsg.innerHTML = `
    <div style="font-weight: 600; margin-bottom: 8px; color: #333;">
      Analyzing Your Schedule
    </div>
    <div style="color: #666; font-size: 14px; line-height: 1.4;">
      Checking ${courses.length} course${courses.length > 1 ? 's' : ''}...<br>
      ${courses.map(c => c.code).join(', ')}
    </div>
  `;
  messagesArea.appendChild(analyzingMsg);
  
  // Typing indicator
  const typingIndicator = document.createElement('div');
  typingIndicator.style.cssText = `
    background: white; padding: 12px 16px; border-radius: 12px;
    display: inline-block; margin-bottom: 16px;
  `;
  typingIndicator.innerHTML = `
    <div style="display: flex; gap: 4px; align-items: center;">
      <div style="width: 8px; height: 8px; border-radius: 50%; background: #154734; animation: bounce 1.4s infinite ease-in-out both;"></div>
      <div style="width: 8px; height: 8px; border-radius: 50%; background: #154734; animation: bounce 1.4s infinite ease-in-out both; animation-delay: 0.16s;"></div>
      <div style="width: 8px; height: 8px; border-radius: 50%; background: #154734; animation: bounce 1.4s infinite ease-in-out both; animation-delay: 0.32s;"></div>
    </div>
  `;
  messagesArea.appendChild(typingIndicator);
  
  popup.appendChild(header);
  popup.appendChild(messagesArea);
  document.body.appendChild(popup);
  
  // Close button handler with animation
  const closeBtn = header.querySelector('.close-analysis-btn');
  closeBtn.addEventListener('mouseenter', function() { this.style.color = '#666'; this.style.background = '#f0f0f0'; });
  closeBtn.addEventListener('mouseleave', function() { this.style.color = '#ccc'; this.style.background = 'transparent'; });
  closeBtn.addEventListener('click', () => {
    popup.style.transition = 'opacity 0.2s ease-out';
    popup.style.opacity = '0';
    setTimeout(() => popup.remove(), 200);
  });
  
  // Send to background for analysis
  const userId = localStorage.getItem('pr_user_id') || null;
  chrome.runtime.sendMessage(
    {
      type: 'analyzeSchedule',
      courses: courses,
      userId: userId
    },
    (response) => {
      // Remove typing indicator and analyzing message
      typingIndicator.remove();
      analyzingMsg.remove();

      if (response?.status === 'rate_limited') {
        // Show limit reached inside the popup
        const limitMsg = document.createElement('div');
        limitMsg.style.cssText = `
          background: white; padding: 20px; border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          border-left: 4px solid #F59E0B;
          text-align: center;
          opacity: 0;
          animation: fadeInResult 0.4s ease-out forwards;
        `;
        limitMsg.innerHTML = `
          <div style="font-size: 28px; margin-bottom: 10px;">📊</div>
          <div style="font-weight: 600; color: #333; font-size: 15px; margin-bottom: 8px;">
            Daily Limit Reached
          </div>
          <div style="color: #666; font-size: 13px; line-height: 1.5;">
            You've used all 5 schedule analyses for today.<br>
            Your limit resets at 12:00 AM.
          </div>
        `;
        messagesArea.appendChild(limitMsg);
        return;
      }
      
      // Show result with better formatting and smooth animation
      const resultMsg = document.createElement('div');
      resultMsg.style.cssText = `
        background: white; padding: 20px; border-radius: 12px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        border-left: 4px solid ${response?.status === 'success' ? '#154734' : '#f44336'};
        opacity: 0;
        animation: fadeInResult 0.4s ease-out forwards;
      `;

      // Show remaining count
      const remainingText = response?.remaining != null
        ? `<div style="font-size: 11px; color: #999; margin-top: 12px; text-align: right;">${response.remaining} analysis${response.remaining === 1 ? '' : 'es'} remaining today</div>`
        : '';
      
      if (response?.status === 'success') {
        let formattedAnalysis = response.analysis
          .replace(/\*\*/g, '')
          .split(/\d+\.\s+/)
          .filter(Boolean)
          .map((section, index) => {
            const parts = section.split(':');
            const title = parts[0].trim();
            const content = parts.slice(1).join(':').trim();
            
            return `
              <div style="margin-bottom: 16px;">
                <div style="font-weight: 600; color: #154734; margin-bottom: 8px; font-size: 15px;">
                  ${index + 1}. ${title}
                </div>
                <div style="color: #444; font-size: 14px; line-height: 1.6; padding-left: 20px;">
                  ${content}
                </div>
              </div>
            `;
          })
          .join('');
        
        resultMsg.innerHTML = `
          <div style="font-weight: 600; color: #333; margin-bottom: 16px; font-size: 16px; border-bottom: 2px solid #f0f0f0; padding-bottom: 12px;">
            Your Schedule Analysis
          </div>
          ${formattedAnalysis}
          ${remainingText}
        `;
      } else {
        resultMsg.innerHTML = `
          <div style="color: #333; font-size: 14px; line-height: 1.6;">
            ${response?.message || '❌ Sorry, I couldn\'t analyze your schedule. Please try again.'}
          </div>
        `;
      }
      
      messagesArea.appendChild(resultMsg);
    }
  );
}

// Main analyze function
function analyzeSchedule() {
  const courses = getCheckedCourses();
  
  if (courses.length === 0) {
    alert('Please select some courses first! Check the boxes on the left.');
    return;
  }
  
  // Check rate limit from DB before opening popup
  const userId = localStorage.getItem('pr_user_id') || null;
  chrome.runtime.sendMessage(
    { type: 'checkAnalysisLimit', userId: userId },
    (response) => {
      if (response?.canSend === false) {
        // Show a clean inline limit message instead of popup
        showAnalysisLimitMessage();
      } else {
        openAnalysisPopup(courses);
      }
    }
  );
}

function showAnalysisLimitMessage() {
  // Close any existing
  const existing = document.querySelector('.pr-analysis-limit-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'pr-analysis-limit-toast';
  toast.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    border-radius: 14px;
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.2);
    padding: 28px 32px;
    z-index: 10001;
    text-align: center;
    max-width: 360px;
    opacity: 0;
    transition: opacity 0.2s ease-out;
  `;
  toast.innerHTML = `
    <div style="font-size: 32px; margin-bottom: 12px;">📊</div>
    <div style="font-weight: 600; font-size: 16px; color: #333; margin-bottom: 8px;">
      Daily Limit Reached
    </div>
    <div style="color: #666; font-size: 14px; line-height: 1.5; margin-bottom: 16px;">
      You've used all 5 schedule analyses for today. Your limit resets at 12:00 AM.
    </div>
    <button style="
      background: #154734;
      color: white; border: none; border-radius: 10px;
      padding: 10px 28px; font-size: 14px; font-weight: 600;
      cursor: pointer; transition: transform 0.15s;
    ">Got it</button>
  `;

  document.body.appendChild(toast);
  requestAnimationFrame(() => { toast.style.opacity = '1'; });

  toast.querySelector('button').addEventListener('click', () => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 200);
  });

  // Also close on click outside
  setTimeout(() => {
    document.addEventListener('click', function handler(e) {
      if (!toast.contains(e.target)) {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 200);
        document.removeEventListener('click', handler);
      }
    });
  }, 100);
}

// Initialize only when DOM is ready, but don't parse courses yet
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(createAnalyzeScheduleButton, 500);
  });
} else {
  setTimeout(createAnalyzeScheduleButton, 500);
}

// Watch for page changes (in case user navigates)
const scheduleObserver = new MutationObserver(() => {
  if (!document.querySelector('.pr-analyze-schedule-btn')) {
    createAnalyzeScheduleButton();
  }
});

scheduleObserver.observe(document.body, {
  childList: true,
  subtree: true
});

// Add animation styles
if (!document.querySelector('#schedule-analyzer-styles')) {
  const style = document.createElement('style');
  style.id = 'schedule-analyzer-styles';
  style.textContent = `
    @keyframes fadeIn {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }
    @keyframes fadeOut {
      from { opacity: 1; transform: scale(1); }
      to { opacity: 0; transform: scale(0.95); }
    }
    @keyframes fadeInResult {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `;
  document.head.appendChild(style);
}