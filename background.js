// ==================== SUPABASE CLIENT ====================
// const SUPABASE_URL = process.env.SUPABASE_URL;
// const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

const SUPABASE_URL = "https://sttbldldsatbkknguznf.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN0dGJsZGxkc2F0Ymtrbmd1em5mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzMjY2MzUsImV4cCI6MjA4OTkwMjYzNX0.fX7w_3qa8GJO4NntIAdsWv92F8ssFSj0UnM6mXqsuOE";

/* ==================== CORE QUERY FUNCTION ==================== */
async function supabaseQuery(table, params = {}) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
  
  // Add select fields
  if (params.select) {
    url.searchParams.set('select', params.select);
  }
  
  // Add filters
  if (params.eq) {
    Object.entries(params.eq).forEach(([key, value]) => {
      url.searchParams.set(key, `eq.${value}`);
    }); 
  }
  
  if (params.ilike) {
    Object.entries(params.ilike).forEach(([key, value]) => {
      url.searchParams.set(key, `ilike.${value}`);
    });
  }
  
  if (params.in) {
    Object.entries(params.in).forEach(([key, values]) => {
      url.searchParams.set(key, `in.(${values.join(',')})`);
    });
  }
  
  if (params.limit) {
    url.searchParams.set('limit', params.limit);
  }
  
  if (params.order) {
    url.searchParams.set('order', params.order);
  }
  
  const response = await fetch(url, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Supabase query failed: ${error}`);
  }
  
  return response.json();
}

/* ==================== PROFESSOR QUERIES ==================== */

// Get all professors (for initial cache)
async function getAllProfessors() {
  try {
    const data = await supabaseQuery('professors_data', {
      select: '*'
    });
    
    return data.map(prof => ({
      name: prof.fullName,
      rating: parseFloat(prof.overallRating) || 0,
      numEvals: parseInt(prof.numEvals) || 0,
      link: /^[a-zA-Z0-9\-_]+$/.test(prof.id)
        ? `https://polyratings.dev/professor/${prof.id}`
        : "https://polyratings.dev/new-professor",
      clarity: parseFloat(prof.materialClear) || 0,
      helpfulness: parseFloat(prof.studentDifficulties) || 0,
      department: prof.department || "",
      courses: prof.courses || "",
      id: prof.id
    }));
  } catch (error) {
    console.error("Failed to fetch all professors:", error);
    return [];
  }
}

// Find professor by name (case-insensitive)
async function findProfessorByName(name) {
  try {
    // Try exact match first
    const exact = await supabaseQuery('professors_data', {
      eq: { fullName: name },
      limit: 1
    });
    
    if (exact.length > 0) {
      const prof = exact[0];
      return {
        name: prof.fullName,
        rating: parseFloat(prof.overallRating) || 0,
        numEvals: parseInt(prof.numEvals) || 0,
        link: /^[a-zA-Z0-9\-_]+$/.test(prof.id)
          ? `https://polyratings.dev/professor/${prof.id}`
          : "https://polyratings.dev/new-professor",
        clarity: parseFloat(prof.materialClear) || 0,
        helpfulness: parseFloat(prof.studentDifficulties) || 0,
        department: prof.department || "",
        courses: prof.courses || "",
        id: prof.id
      };
    }
    
    // Try case-insensitive partial match
    const partial = await supabaseQuery('professors_data', {
      ilike: { fullName: `%${name}%` },
      limit: 5
    });
    
    if (partial.length > 0) {
      const prof = partial[0];
      return {
        name: prof.fullName,
        rating: parseFloat(prof.overallRating) || 0,
        numEvals: parseInt(prof.numEvals) || 0,
        link: /^[a-zA-Z0-9\-_]+$/.test(prof.id)
          ? `https://polyratings.dev/professor/${prof.id}`
          : "https://polyratings.dev/new-professor",
        clarity: parseFloat(prof.materialClear) || 0,
        helpfulness: parseFloat(prof.studentDifficulties) || 0,
        department: prof.department || "",
        courses: prof.courses || "",
        id: prof.id
      };
    }
    
    return null;
  } catch (error) {
    console.error(`Failed to find professor ${name}:`, error);
    return null;
  }
}

/* ==================== REVIEW QUERIES ==================== */

// Get reviews for a specific professor
async function getReviewsByProfessor(professorName, limit = 100) {
  try {
    const data = await supabaseQuery('professor_reviews', {
      eq: { professor_name: professorName },
      order: 'post_date.desc',
      limit: limit
    });
    
    return data.map(row => ({
      course: row.course_code || "Unknown Course",
      rating: parseFloat(row.overall_rating) || 0,
      clarity: parseFloat(row.presents_material_clearly) || 0,
      helpfulness: parseFloat(row.recognizes_student_difficulties) || 0,
      text: (row.rating_text || "").trim(),
      grade: row.grade && row.grade !== "N/A" ? row.grade : null,
      gradeLevel: row.grade_level && row.grade_level !== "N/A" ? row.grade_level : null,
      courseType: row.course_type || null,
      date: row.post_date || null
    }));
  } catch (error) {
    console.error(`Failed to get reviews for ${professorName}:`, error);
    return [];
  }
}

// Get reviews for a specific course
async function getReviewsByCourse(courseCode, limit = 50) {
  try {
    const data = await supabaseQuery('professor_reviews', {
      eq: { course_code: courseCode },
      order: 'overall_rating.desc',
      limit: limit
    });
    
    return data.map(row => ({
      professor: row.professor_name,
      rating: parseFloat(row.overall_rating) || 0,
      text: (row.rating_text || "").trim(),
      grade: row.grade,
      gradeLevel: row.grade_level,
      date: row.post_date
    }));
  } catch (error) {
    console.error(`Failed to get reviews for ${courseCode}:`, error);
    return [];
  }
}

// Get reviews for professor + specific course
async function getReviewsByProfessorAndCourse(professorName, courseCode, limit = 20) {
  try {
    const url = new URL(`${SUPABASE_URL}/rest/v1/professor_reviews`);
    url.searchParams.set('professor_name', `eq.${professorName}`);
    url.searchParams.set('course_code', `eq.${courseCode}`);
    url.searchParams.set('order', 'post_date.desc');
    url.searchParams.set('limit', limit);
    
    const response = await fetch(url, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });
    
    const data = await response.json();
    
    return data.map(row => ({
      rating: parseFloat(row.overall_rating) || 0,
      text: (row.rating_text || "").trim(),
      grade: row.grade,
      gradeLevel: row.grade_level,
      date: row.post_date
    }));
  } catch (error) {
    console.error(`Failed to get reviews for ${professorName} - ${courseCode}:`, error);
    return [];
  }
}
console.log("PolyRatings Enhancer background script is active.");
console.log("🚀 Background script loaded at:", new Date().toISOString());

// Import Supabase client functions (loaded via manifest.json)
// Make sure supabase-client.js is loaded first in manifest.json background scripts

// Cache for professor data
let professorCache = null;

/* ==================== GROQ API INTEGRATION ==================== */
const GROQ_API_KEY = "your_groq_api_key_here"; // TODO: Replace with actual key
const GROQ_MODELS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-70b-versatile",
  "llama-3.1-8b-instant",
  "mixtral-8x7b-32768",
  "gemma2-9b-it",
  "llama3-70b-8192",
  "llama3-8b-8192",
  "gemma-7b-it",
  "llama-3.2-90b-text-preview",
  "llama-3.2-11b-text-preview"
];

let currentModelIndex = 0;

function getNextGroqModel() {
  const model = GROQ_MODELS[currentModelIndex];
  currentModelIndex = (currentModelIndex + 1) % GROQ_MODELS.length;
  return model;
}

async function callGroqAPI(messages, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const model = getNextGroqModel();
    try {
      console.log(`🤖 Calling GROQ with model: ${model} (attempt ${attempt + 1})`);
      
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: model,
          messages: messages,
          temperature: 0.7,
          max_tokens: 1000
        })
      });

      if (!response.ok) {
        const error = await response.text();
        console.warn(`❌ GROQ ${model} failed:`, error);
        continue;
      }

      const data = await response.json();
      console.log(`✅ GROQ ${model} succeeded`);
      return data.choices[0].message.content;
    } catch (error) {
      console.warn(`❌ GROQ ${model} error:`, error);
      if (attempt === maxRetries - 1) {
        throw new Error("All GROQ models failed");
      }
    }
  }
  throw new Error("All GROQ models failed after retries");
}

function parseQueryIntent(query) {
  const lower = query.toLowerCase();
  
  const profMatch = lower.match(/(?:professor|prof|dr\.?)\s+([a-z\s]+?)(?:\s+for\s+|\s+in\s+|$)/i);
  const profName = profMatch ? profMatch[1].trim() : null;
  
  const coursePattern = /([A-Z]{2,4})\s*(\d{3})/gi;
  const courses = [];
  let match;
  while ((match = coursePattern.exec(query)) !== null) {
    courses.push(`${match[1]} ${match[2]}`);
  }
  
  const isComparison = /(?:vs|versus|compared to|or|easier|harder|better)/i.test(lower);
  
  return {
    professorName: profName,
    courses: courses,
    isComparison: isComparison && courses.length >= 2,
    isCourseSpecific: courses.length > 0,
    rawQuery: query
  };
}

/* ==================== DATA FETCHING (SUPABASE) ==================== */

async function fetchProfessorData() {
  if (professorCache) {
    console.log("✅ Using cached professor data");
    return professorCache;
  }

  console.log("🚀 Fetching professors from Supabase...");
  try {
    const data = await getAllProfessors();
    professorCache = data;
    console.log(`✅ Loaded ${data.length} professors from Supabase`);
    return data;
  } catch (error) {
    console.error("❌ Failed to fetch professors:", error);
    return [];
  }
}

function preloadProfessorData() {
  fetchProfessorData();
}

async function findProfessor(profName) {
  // Try cache first
  if (professorCache) {
    const normalized = profName.toLowerCase().trim();
    const cached = professorCache.find(p => 
      p.name.toLowerCase().trim() === normalized
    );
    if (cached) return cached;
  }
  
  // Fall back to Supabase query
  console.log(`🔍 Searching Supabase for: ${profName}`);
  return await findProfessorByName(profName);
}

/* ==================== AI SUMMARIES (GITHUB - KEEP AS IS) ==================== */

const AI_SUMMARIES_URL =
  "https://raw.githubusercontent.com/dakpasala/polyratings-ai-generator/main/summaries/ai_summaries.json";

let aiSummariesCache = null;

async function fetchAISummaries() {
  if (aiSummariesCache) return aiSummariesCache;
  try {
    console.log("🌐 Fetching pre-generated AI summaries...");
    const res = await fetch(AI_SUMMARIES_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    aiSummariesCache = await res.json();
    console.log(`✅ Loaded ${Object.keys(aiSummariesCache).length} AI summaries`);
    return aiSummariesCache;
  } catch (err) {
    console.error("❌ Failed to fetch AI summaries:", err);
    aiSummariesCache = {};
    return {};
  }
}

function noRatingsMessage(profName) {
  return `No PolyRatings found. Try asking classmates or other professors for insights before enrolling.\n\nhttps://polyratings.dev/new-professor`;
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

  return "No PolyRatings found. Try asking classmates or other professors for insights before enrolling.";
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
    /(?:tell me about|what about|how is|rate|rating for|info on|information about)\s+([a-z\s,]+)/i,
    /(?:professor|prof|dr\.?|dr)\s+([a-z\s,]+)/i,
    /^([a-z\s,]+)$/i,
  ];
  for (const p of patterns) {
    const m = query.match(p);
    if (m && m[1]) {
      let n = m[1]
        .replace(/\b(professor|prof|dr|dr\.|about|tell|me|how|is|rate|rating|info|information)\b/gi, "")
        .trim();
      if (n.length > 2) return n;
    }
  }
  return null;
}

async function generateGeneralResponse(query) {
  return "I'm here to help with professor info! Try asking about a specific professor by name.";
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
            message: "Professor not found in database",
          });
        }
      } catch (e) {
        sendResponse({ status: "error", message: "Failed to fetch rating" });
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
            const courseData = await Promise.all(
              intent.courses.map(async (course) => {
                const reviews = await getReviewsByCourse(course, 10);
                const avgRating = reviews.length > 0
                  ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
                  : 0;
                
                return {
                  course,
                  avgRating: avgRating.toFixed(2),
                  reviewCount: reviews.length,
                  sampleReviews: reviews.slice(0, 5)
                };
              })
            );
            
            const prompt = `Compare these Cal Poly courses based on student reviews:

${courseData.map(c => `
${c.course}:
- Average Rating: ${c.avgRating}/4.0
- Number of Reviews: ${c.reviewCount}
- Sample Reviews:
${c.sampleReviews.map(r => `  * ${r.professor}: "${r.text.substring(0, 150)}..." (Rating: ${r.rating}/4.0, Grade: ${r.grade})`).join('\n')}
`).join('\n')}

User asked: "${query}"

Provide a concise comparison (3-4 sentences) highlighting key differences in difficulty, workload, and student satisfaction.`;

            const response = await callGroqAPI([
              { role: "system", content: "You are a helpful Cal Poly academic advisor." },
              { role: "user", content: prompt }
            ]);
            
            sendResponse({
              status: "success",
              professor: { analysis: response }
            });
          } catch (error) {
            console.error("Comparison failed:", error);
            sendResponse({
              status: "error",
              message: "Sorry, I couldn't compare those courses. Please try again."
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
          
          const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
          
          const prompt = `Analyze Professor ${professor.name}'s ${courseCode} course based on ${reviews.length} student reviews:

Average Rating: ${avgRating.toFixed(2)}/4.0

Sample Reviews:
${reviews.slice(0, 8).map(r => `* Grade: ${r.grade}, Level: ${r.gradeLevel}\n  "${r.text.substring(0, 200)}..."`).join('\n\n')}

Provide a 3-4 sentence summary of teaching style, difficulty, and what types of students succeed.`;

          const response = await callGroqAPI([
            { role: "system", content: "You are a helpful Cal Poly academic advisor." },
            { role: "user", content: prompt }
          ]);
          
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
        console.error("Chatbot query error:", error);
        sendResponse({
          status: "error",
          message: "Sorry, I couldn't process your query.",
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

  // Fetch detailed reviews on-demand (now uses Supabase)
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