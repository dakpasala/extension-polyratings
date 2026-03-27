// Load client modules (relative to backend/ folder)
importScripts('supabase-client.js', 'groq-client.js', '../shared/utils.js');

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

/* ==================== RAG SYSTEM ==================== */

// Extract entities from user query using GROQ
async function extractEntitiesWithGROQ(query) {
  const prompt = `Extract course codes and professor names from this query. Respond ONLY with valid JSON, no markdown formatting.

Query: "${query}"

Return format:
{
  "courses": ["CSC 307", "CPE 350"],
  "professors": ["Oliver", "Seng"],
  "intent": "comparison" | "difficulty" | "rating" | "recommendation" | "general"
}

Rules:
- Course codes: 2-4 UPPERCASE letters + 3 digits (e.g., CSC 307, CHEM 110)
- Normalize casing: "csc 307" → "CSC 307"
- Professors: Extract last names only
- If nothing found, return empty arrays
- Intent: What is the user asking about?

Examples:
"CSC 307 vs CSC 357" → {"courses": ["CSC 307", "CSC 357"], "professors": [], "intent": "comparison"}
"How is Professor Oliver for CPE 350?" → {"courses": ["CPE 350"], "professors": ["Oliver"], "intent": "rating"}
"Is chem 110 hard?" → {"courses": ["CHEM 110"], "professors": [], "intent": "difficulty"}`;

  try {
    const response = await callGroqAPI([
      { role: "system", content: "You extract structured data from queries. Return only valid JSON." },
      { role: "user", content: prompt }
    ]);
    
    // Clean response (remove markdown if present)
    const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);
    
    console.log("🧠 Extracted entities:", parsed);
    return parsed;
  } catch (error) {
    console.error("❌ Entity extraction failed:", error);
    return { courses: [], professors: [], intent: "general" };
  }
}

// Universal RAG query handler
async function handleRAGQuery(query) {
  try {
    // Step 1: Extract entities
    const entities = await extractEntitiesWithGROQ(query);
    
    // Step 2: Fetch relevant data
    let reviewData = {};
    let professorData = {};
    
    // Fetch course reviews
    if (entities.courses.length > 0) {
      console.log(`📚 Fetching reviews for courses: ${entities.courses.join(', ')}`);
      for (const course of entities.courses) {
        const reviews = await getReviewsByCourse(course, 20);
        reviewData[course] = {
          reviews: reviews,
          avgRating: reviews.length > 0 
            ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(2)
            : "N/A",
          count: reviews.length
        };
      }
    }
    
    // Fetch professor reviews
    if (entities.professors.length > 0) {
      console.log(`👨‍🏫 Fetching reviews for professors: ${entities.professors.join(', ')}`);
      for (const profName of entities.professors) {
        let professor = await findProfessor(profName);
        
        // Verify we found the right professor (fuzzy search might match wrong person)
        // Check if extracted name appears as a complete WORD in found professor's name
        const nameWords = professor.name.toLowerCase().split(/\s+/);
        const searchWords = profName.toLowerCase().split(/\s+/);
        const allWordsMatch = searchWords.every(word => nameWords.includes(word));
        
        if (professor && !allWordsMatch) {
          console.log(`⚠️ Fuzzy match might be wrong: searched "${profName}", found "${professor.name}"`);
          
          // Try to find full name in original query
          const profPattern = /(?:tell me about|about|professor|prof|dr\.?|for)\s+([a-zA-Z]+(?:\s+[a-zA-Z]+)+)/i;
          const match = query.match(profPattern);
          
          if (match && match[1]) {
            const fullName = match[1].trim();
            console.log(`🔍 Trying full name from query: "${fullName}"`);
            const betterMatch = await findProfessor(fullName);
            if (betterMatch) {
              console.log(`✅ Better match found: ${fullName} → ${betterMatch.name}`);
              professor = betterMatch; // Use the better match
            }
          }
        }
        
        if (professor) {
          // If specific course mentioned, get professor+course reviews
          if (entities.courses.length === 1) {
            const reviews = await getReviewsByProfessorAndCourse(professor.name, entities.courses[0], 15);
            professorData[professor.name] = {
              info: professor,
              reviews: reviews,
              course: entities.courses[0],
              avgRating: reviews.length > 0
                ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(2)
                : "N/A",
              count: reviews.length
            };
          } else {
            // General professor reviews
            const reviews = await getReviewsByProfessor(professor.name, 20);
            professorData[professor.name] = {
              info: professor,
              reviews: reviews.slice(0, 10), // Limit to 10 for context
              avgRating: professor.rating,
              count: reviews.length
            };
          }
        }
      }
    }
    
    // Step 3: Build context for GROQ - just feed all the data
    let context = `User Question: "${query}"\n\n`;
    
    if (Object.keys(reviewData).length > 0) {
      context += "=== COURSE REVIEWS ===\n";
      for (const [course, data] of Object.entries(reviewData)) {
        context += `\n${course} (${data.count} student reviews):\n`;
        
        // Group by professor to show who teaches it
        const byProfessor = {};
        data.reviews.forEach(r => {
          if (!byProfessor[r.professor]) byProfessor[r.professor] = [];
          byProfessor[r.professor].push(r);
        });
        
        // Show reviews grouped by professor
        Object.entries(byProfessor).forEach(([prof, reviews]) => {
          const avgRating = (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(2);
          context += `\n  Professor: ${prof} (${reviews.length} reviews, avg rating: ${avgRating}/4.0)\n`;
          reviews.slice(0, 3).forEach(r => {
            context += `    - "${r.text.substring(0, 120)}..." [${r.rating}/4.0, Grade: ${r.grade || 'N/A'}]\n`;
          });
        });
      }
    }
    
    if (Object.keys(professorData).length > 0) {
      context += "\n=== PROFESSOR REVIEWS ===\n";
      for (const [profName, data] of Object.entries(professorData)) {
        context += `\n${profName} (${data.count} total reviews, avg: ${data.avgRating}/4.0)`;
        if (data.course) {
          context += ` - specifically for ${data.course}`;
        }
        context += `:\n`;
        data.reviews.slice(0, 8).forEach(r => {
          context += `  - "${r.text.substring(0, 120)}..." [${r.rating}/4.0, Grade: ${r.grade || 'N/A'}]\n`;
        });
      }
    }
    
    if (Object.keys(reviewData).length === 0 && Object.keys(professorData).length === 0) {
      return "I couldn't find any review data for that query. Try asking about a specific Cal Poly professor or course!";
    }
    
    // Step 4: Let the model figure out what to do with the data
    const answerPrompt = `${context}

Answer the user's question based on the review data above. Guidelines:
- Be conversational and helpful (3-4 sentences)
- DON'T calculate or mention overall course averages (the sample is biased)
- DO mention what students say about difficulty, workload, teaching style, grading
- If comparing courses: highlight key differences students mention
- If asked "best professor": recommend based on ratings and positive feedback
- If asked about difficulty: cite specific student comments
- Reference professor names when relevant`;

    const answer = await callGroqAPI([
      { role: "system", content: "You are a Cal Poly academic advisor helping students choose courses and professors. Be helpful and specific based on the student review data provided." },
      { role: "user", content: answerPrompt }
    ]);
    
    return answer;
    
  } catch (error) {
    console.error("❌ RAG query failed:", error);
    throw error;
  }
}

/* ==================== HELPER FUNCTIONS ==================== */

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
      p.name.toLowerCase().includes(normalized) ||
      p.lastName?.toLowerCase() === normalized
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
        console.log(`💬 User query: "${query}"`);
        
        // Try RAG system for all queries
        const answer = await handleRAGQuery(query);
        
        sendResponse({
          status: "success",
          professor: { analysis: answer }
        });
        
      } catch (error) {
        console.error("Chatbot error:", error);
        
        // Fallback to simple professor lookup
        const professorName = extractProfessorNameFromQuery(message.query);
        if (professorName) {
          try {
            await fetchProfessorData();
            const professor = await findProfessor(professorName);
            const analysis = await callGeminiAnalysis(professorName, professor);
            sendResponse({
              status: "success",
              professor: { ...professor, analysis },
            });
            return;
          } catch (e) {
            console.error("Fallback also failed:", e);
          }
        }
        
        sendResponse({
          status: "error",
          message: "Sorry, I couldn't process your query. Try asking about a specific Cal Poly professor or course!",
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