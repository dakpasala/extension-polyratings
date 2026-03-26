// Load client modules
importScripts('supabase-client.js', 'groq-client.js');

console.log("PolyRatings Enhancer background script is active.");
console.log("🚀 Background loaded at:", new Date().toISOString());

// Cache for professor data
let professorCache = null;
let isFetching = false;

// Sample fallback data
const sampleProfessors = [
  {
    name: "John Smith",
    rating: 4.2,
    link: "https://polyratings.dev/professor/john-smith",
  }
];

/* ==================== HELPER FUNCTIONS ==================== */

// Parse query to determine intent
function parseQueryIntent(query) {
  const lower = query.toLowerCase();
  
  // Extract professor names (stops before "for")
  const profMatch = lower.match(/(?:professor|prof|dr\.?)\s+([a-z]+(?:\s+[a-z]+)?)\s+(?:for|in|teaching)/i);
  const profName = profMatch ? profMatch[1].trim() : null;
  
  // Extract course codes
  const coursePattern = /([A-Z]{2,4})\s*(\d{3})/gi;
  const courses = [];
  let match;
  while ((match = coursePattern.exec(query)) !== null) {
    courses.push(`${match[1]} ${match[2]}`);
  }
  
  // Detect comparison
  const isComparison = /(?:vs|versus|compared to|or|easier|harder|better)/i.test(lower);
  
  return {
    professorName: profName,
    courses: courses,
    isComparison: isComparison && courses.length >= 2,
    isCourseSpecific: courses.length > 0,
    rawQuery: query
  };
}

// Fetch professor data from Supabase
async function fetchProfessorData() {
  if (professorCache) return professorCache;
  if (isFetching) {
    return new Promise((resolve) => {
      const check = setInterval(() => {
        if (professorCache) {
          clearInterval(check);
          resolve(professorCache);
        }
      }, 100);
    });
  }
  
  isFetching = true;
  console.log("📚 Fetching professors from Supabase...");
  
  try {
    const professors = await getAllProfessors();
    professorCache = professors;
    console.log(`✅ Loaded ${professorCache.length} professors`);
    return professorCache;
  } catch (error) {
    console.error("❌ Failed to fetch from Supabase:", error);
    professorCache = sampleProfessors;
    return professorCache;
  } finally {
    isFetching = false;
  }
}

function preloadProfessorData() {
  fetchProfessorData();
}

// Find professor in cache or DB
async function findProfessor(profName) {
  if (!profName) return null;
  
  // Try cache first
  if (professorCache) {
    const normalized = profName.toLowerCase().trim();
    const cached = professorCache.find(p => 
      p.name.toLowerCase().trim() === normalized ||
      p.name.toLowerCase().includes(normalized)
    );
    if (cached) {
      console.log(`✅ Found in cache: ${profName} → ${cached.name}`);
      return cached;
    }
  }
  
  // Try Supabase with fuzzy search
  console.log(`🔍 Searching Supabase for: ${profName}`);
  return await findProfessorByName(profName);
}

/* ==================== AI SUMMARIES (GITHUB) ==================== */

const AI_SUMMARIES_URL =
  "https://raw.githubusercontent.com/dakpasala/polyratings-ai-generator/main/summaries/ai_summaries.json";

let aiSummariesCache = null;

async function fetchAISummaries() {
  if (aiSummariesCache) return aiSummariesCache;
  try {
    console.log("🌐 Fetching AI summaries...");
    const res = await fetch(AI_SUMMARIES_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    aiSummariesCache = await res.json();
    console.log(`✅ Loaded ${Object.keys(aiSummariesCache).length} summaries`);
    return aiSummariesCache;
  } catch (err) {
    console.error("❌ Failed to fetch summaries:", err);
    aiSummariesCache = {};
    return {};
  }
}

function noRatingsMessage(profName) {
  return `No PolyRatings found. Try asking classmates or other professors for insights.\n\nhttps://polyratings.dev/new-professor`;
}

async function callGeminiTooltipAnalysis(profName) {
  const summaries = await fetchAISummaries();
  const key = Object.keys(summaries).find(
    (k) => k.toLowerCase().trim() === profName.toLowerCase().trim()
  );

  if (key) {
    let summary = summaries[key];
    if (summary.includes("\n\nProfessor")) {
      summary = "Professor" + summary.split("\n\nProfessor")[1];
    }
    summary = summary.replace(/\n\nhttps?:\/\/[^\s]+/g, "");
    summary = summary.replace(/https?:\/\/[^\s]+/g, "");
    return summary;
  }

  return "No PolyRatings found. Try asking classmates for insights.";
}

async function callGeminiAnalysis(profName, professorData = null) {
  const summaries = await fetchAISummaries();
  const key = Object.keys(summaries).find(
    (k) => k.toLowerCase().trim() === profName.toLowerCase().trim()
  );

  if (key) {
    let summary = summaries[key];
    if (summary.includes("\n\nProfessor")) {
      summary = "Professor" + summary.split("\n\nProfessor")[1];
    }
    summary = summary.replace(/\n\nhttps?:\/\/[^\s]+/g, "");
    summary = summary.replace(/https?:\/\/[^\s]+/g, "");
    return `${summary}\n\n${professorData?.link || ""}`;
  }

  return noRatingsMessage(profName);
}

function extractProfessorNameFromQuery(query) {
  const patterns = [
    /(?:tell me about|what about|how is|rate|rating for|info on)\s+([a-z\s,]+)/i,
    /(?:professor|prof|dr\.?)\s+([a-z\s,]+)/i,
    /^([a-z\s,]+)$/i,
  ];
  for (const p of patterns) {
    const m = query.match(p);
    if (m && m[1]) {
      let n = m[1]
        .replace(/\b(professor|prof|dr|about|tell|me|how|is|rate|rating|info)\b/gi, "")
        .trim();
      if (n.length > 2) return n;
    }
  }
  return null;
}

async function generateGeneralResponse(query) {
  return "I'm here to help with professor info! Try asking about a specific professor.";
}

/* ==================== MESSAGE HANDLERS ==================== */

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "getProfRating") {
    (async () => {
      try {
        await fetchProfessorData();
        const professor = await findProfessor(message.profName);
        if (professor) {
          sendResponse({ status: "success", professor });
        } else {
          sendResponse({
            status: "not_found",
            message: "Professor not found",
          });
        }
      } catch (e) {
        sendResponse({ status: "error", message: "Failed to fetch" });
      }
    })();
    return true;
  }

  if (message.type === "preloadData") {
    preloadProfessorData();
    sendResponse({ status: "preloading" });
    return true;
  }

  if (message.type === "chatbotQuery") {
    (async () => {
      try {
        const query = message.query;
        const intent = parseQueryIntent(query);
        
        console.log("🔍 Query intent:", intent);
        
        // CASE 1: Course comparison
        if (intent.isComparison && intent.courses.length >= 2) {
          try {
            const reviewsGrouped = await getReviewsForCourses(intent.courses, 10);
            
            const courseData = intent.courses.map(course => {
              const reviews = reviewsGrouped[course] || [];
              const avgRating = reviews.length > 0
                ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
                : 0;
              
              return {
                course,
                avgRating: avgRating.toFixed(2),
                reviewCount: reviews.length,
                sampleReviews: reviews
              };
            });
            
            const response = await compareCourses(courseData, query);
            
            sendResponse({
              status: "success",
              professor: { analysis: response }
            });
          } catch (error) {
            console.error("Comparison failed:", error);
            sendResponse({
              status: "error",
              message: "Sorry, couldn't compare courses."
            });
          }
          return;
        }
        
        // CASE 2: Professor + specific course
        if (intent.professorName && intent.isCourseSpecific) {
          const professor = await findProfessor(intent.professorName);
          if (!professor) {
            sendResponse({
              status: "not_found",
              message: `Professor ${intent.professorName} not found.`
            });
            return;
          }
          
          const courseCode = intent.courses[0];
          const reviews = await getReviewsByProfessorAndCourse(professor.name, courseCode, 15);
          
          if (reviews.length === 0) {
            sendResponse({
              status: "success",
              professor: {
                analysis: `No ratings found for ${professor.name} teaching ${courseCode}.`
              }
            });
            return;
          }
          
          const response = await analyzeProfessorForCourse(professor.name, courseCode, reviews);
          
          sendResponse({
            status: "success",
            professor: { ...professor, analysis: response }
          });
          return;
        }
        
        // CASE 3: General professor query
        const professorName = extractProfessorNameFromQuery(query);
        if (professorName) {
          await fetchProfessorData();
          const professor = await findProfessor(professorName);
          const analysis = await callGeminiAnalysis(professorName, professor);
          sendResponse({
            status: "success",
            professor: { ...professor, analysis },
          });
          return;
        }
        
        // CASE 4: General question
        const generalResponse = await generateGeneralResponse(query);
        sendResponse({
          status: "general_response",
          message: generalResponse,
        });
        
      } catch (error) {
        console.error("Chatbot error:", error);
        sendResponse({
          status: "error",
          message: "Sorry, couldn't process your query.",
        });
      }
    })();
    return true;
  }

  if (message.type === "getGeminiAnalysis") {
    (async () => {
      try {
        await fetchProfessorData();
        const professor = await findProfessor(message.profName);
        const analysis = await callGeminiAnalysis(message.profName, professor);
        sendResponse({
          status: "success",
          analysis,
          professor,
        });
      } catch (error) {
        sendResponse({
          status: "error",
          message: "Failed to get AI summary",
        });
      }
    })();
    return true;
  }

  if (message.type === "getGeminiTooltipAnalysis") {
    (async () => {
      try {
        await fetchProfessorData();
        const professor = await findProfessor(message.profName);
        const analysis = await callGeminiTooltipAnalysis(message.profName);
        sendResponse({
          status: "success",
          analysis,
          professor: professor || { name: message.profName },
        });
      } catch (error) {
        sendResponse({
          status: "error",
          message: "Failed to get tooltip summary",
        });
      }
    })();
    return true;
  }

  if (message.type === "getProfessorReviews") {
    (async () => {
      try {
        const profName = message.profName;
        if (!profName) {
          sendResponse({ status: "error", reviews: [] });
          return;
        }

        const reviews = await getReviewsByProfessor(profName, 100);
        sendResponse({ status: "success", reviews });
      } catch (error) {
        console.error("Failed to fetch reviews:", error);
        sendResponse({ status: "error", reviews: [] });
      }
    })();
    return true;
  }

  sendResponse({ status: "error", message: "Unknown message type" });
});