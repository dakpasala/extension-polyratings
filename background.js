console.log("PolyRatings Enhancer background script is active.");
console.log("🚀 Background script loaded at:", new Date().toISOString());
console.log("🚀 Chrome runtime available:", typeof chrome !== "undefined");
console.log(
  "🚀 Chrome runtime onMessage available:",
  typeof chrome.runtime.onMessage !== "undefined"
);

// Cache for professor data
let professorCache = null;
let isFetching = false;

// Sample data for testing (fallback)
const sampleProfessors = [
  {
    name: "John Smith",
    rating: 4.2,
    link: "https://polyratings.dev/professor/john-smith",
  },
  {
    name: "Jane Doe",
    rating: 3.8,
    link: "https://polyratings.dev/professor/jane-doe",
  },
  {
    name: "Bob Johnson",
    rating: 4.5,
    link: "https://polyratings.dev/professor/bob-johnson",
  },
];

/* ==================== GROQ API INTEGRATION ==================== */
const GROQ_API_KEY = process.env.GROQ_API_KEY; 
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

// Get next model in rotation
function getNextGroqModel() {
  const model = GROQ_MODELS[currentModelIndex];
  currentModelIndex = (currentModelIndex + 1) % GROQ_MODELS.length;
  return model;
}

// Call GROQ API with automatic fallback
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
        continue; // Try next model
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

// Parse query to determine intent
function parseQueryIntent(query) {
  const lower = query.toLowerCase();
  
  // Extract professor names
  const profMatch = lower.match(/(?:professor|prof|dr\.?)\s+([a-z\s]+?)(?:\s+for\s+|\s+in\s+|$)/i);
  const profName = profMatch ? profMatch[1].trim() : null;
  
  // Extract course codes (e.g., CSC 307, CPE 350)
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

// Fetch reviews for specific course
async function getReviewsForCourse(professorName, courseCode) {
  try {
    const csvUrl = "https://raw.githubusercontent.com/sreshtalluri/polyratings-data-collection/refs/heads/main/data/main/professor_detailed_reviews.csv";
    const response = await fetch(csvUrl);
    const csvText = await response.text();
    const rows = parseCSV(csvText);
    
    const reviews = rows
      .filter(row => 
        row.professor_name === professorName && 
        row.course_code === courseCode
      )
      .map(row => ({
        rating: parseFloat(row.overall_rating) || 0,
        text: row.rating_text || "",
        grade: row.grade,
        gradeLevel: row.grade_level,
        date: row.post_date
      }))
      .filter(r => r.text);
    
    return reviews;
  } catch (error) {
    console.error("Failed to fetch course reviews:", error);
    return [];
  }
}

/* ==================== END GROQ API ==================== */

// Function to parse CSV data
function parseCSV(csvText) {
  const lines = csvText.split("\n");
  const headers = lines[0].split(",");
  const data = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line) {
      const values = line.split(",");
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || "";
      });
      data.push(row);
    }
  }

  return data;
}

// Function to convert CSV data to expected format
function convertCSVToProfessorData(ratingsData, commentsData) {
  const professorMap = new Map();

  ratingsData.forEach((row) => {
    const profName = row.fullName;
    if (!profName) return;

    professorMap.set(profName, {
      name: profName,
      rating: parseFloat(row.overallRating) || 0,
      numEvals: parseInt(row.numEvals) || 0,
      link: /^[a-zA-Z0-9\-_]+$/.test(row.id)
        ? `https://polyratings.dev/professor/${row.id}`
        : "https://polyratings.dev/new-professor",
      clarity: parseFloat(row.materialClear) || 0,
      helpfulness: parseFloat(row.studentDifficulties) || 0,
      comments: "",
      department: row.department || "",
      courses: row.courses || "",
      allComments: [],
      gradeLevels: [],
      grades: [],
    });
  });

  commentsData.forEach((row) => {
    const profName = row.professor_name;
    if (!profName) return;

    if (!professorMap.has(profName)) {
      professorMap.set(profName, {
        name: profName,
        rating: 0,
        numEvals: 0,
        link: `https://polyratings.dev/professor/${
          row.professor_id || profName.toLowerCase().replace(/\s+/g, "-")
        }`,
        clarity: 0,
        helpfulness: 0,
        comments: "",
        department: row.professor_department || "",
        courses: row.course_code || "",
        allComments: [],
        gradeLevels: [],
        grades: [],
      });
    }

    const prof = professorMap.get(profName);
    const comment = row.rating_text || "";
    if (comment.trim()) prof.allComments.push(comment.trim());
    if (row.grade_level && row.grade_level !== "N/A")
      prof.gradeLevels.push(row.grade_level);
    if (row.grade && row.grade !== "N/A") prof.grades.push(row.grade);
  });

  return Array.from(professorMap.values()).map((prof) => {
    prof.comments = prof.allComments.join(" | ").substring(0, 2000);
    delete prof.allComments;
    delete prof.gradeLevels;
    delete prof.grades;
    return prof;
  });
}

// Fetch professor data from CSVs
async function fetchProfessorData() {
  console.log("🚀 fetchProfessorData() called!");
  if (professorCache) {
    console.log("✅ Using cached professor data");
    return professorCache;
  }

  // Clear any stale storage cache so bad links get rebuilt fresh
  chrome.storage.local.remove("professorData");
  console.log("🧹 Cleared stale professor cache from storage");

  // If already fetching, wait and retry a few times
  if (isFetching) {
    console.log("⏳ Already fetching, waiting for completion...");
    for (let i = 0; i < 50; i++) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      if (professorCache) {
        console.log("✅ Cache populated, returning cached data");
        return professorCache;
      }
      if (!isFetching) break;
    }
    if (professorCache) return professorCache;
  }

  isFetching = true;
  try {
    const [ratingsResponse, commentsResponse] = await Promise.all([
      fetch(
        "https://raw.githubusercontent.com/sreshtalluri/polyratings-data-collection/refs/heads/main/data/main/professors_data.csv"
      ),
      fetch(
        "https://raw.githubusercontent.com/sreshtalluri/polyratings-data-collection/refs/heads/main/data/main/professor_detailed_reviews.csv"
      ),
    ]);
    const [ratingsCsvText, commentsCsvText] = await Promise.all([
      ratingsResponse.text(),
      commentsResponse.text(),
    ]);
    const ratingsData = parseCSV(ratingsCsvText);
    const commentsData = parseCSV(commentsCsvText);
    const data = convertCSVToProfessorData(ratingsData, commentsData);
    professorCache = data;
    chrome.storage.local.set({ professorData: data }, () =>
      console.log("💾 Professor data saved to chrome.storage")
    );
    return data;
  } catch (err) {
    console.log("❌ Error fetching professor data:", err);
    return sampleProfessors;
  } finally {
    isFetching = false;
  }
}

function preloadProfessorData() {
  fetchProfessorData();
}

// Find professor in cache
function findProfessor(profName) {
  if (!professorCache) {
    console.log(
      `❌ No professor cache available when searching for: ${profName}`
    );
    return null;
  }
  const normalized = profName.toLowerCase().trim();
  console.log(
    `🔍 Searching for professor: "${profName}" (normalized: "${normalized}")`
  );

  // Try exact match first
  const exactMatch = professorCache.find(
    (p) => p.name.toLowerCase().trim() === normalized
  );
  if (exactMatch) {
    console.log(`✅ Exact match found: ${exactMatch.name}`);
    return exactMatch;
  }

  // Try partial match — require at least 2 words in common to avoid false positives
  const partialMatch = professorCache.find((p) => {
    const name = p.name.toLowerCase().trim();
    if (name.length < 4) return false;
    const nameWords = name.split(/\s+/);
    const searchWords = normalized.split(/\s+/).filter(w => w.length > 1);
    const commonWords = searchWords.filter(w => nameWords.includes(w));
    return commonWords.length >= 2;
  });
  if (partialMatch) {
    console.log(
      `✅ Partial match found: ${partialMatch.name} (searched for: ${profName})`
    );
    return partialMatch;
  }

  // Debug: show similar names
  const similarNames = professorCache
    .filter((p) => {
      const name = p.name.toLowerCase().trim();
      const searchWords = normalized.split(" ");
      return (
        searchWords.some((word) => name.includes(word)) ||
        name.split(" ").some((word) => normalized.includes(word))
      );
    })
    .slice(0, 5)
    .map((p) => p.name);

  if (similarNames.length > 0) {
    console.log(`💡 Similar names found: ${similarNames.join(", ")}`);
  } else {
    console.log(`❌ No match found for: ${profName}`);
  }

  return null;
}

/* -------------------- STATIC AI SUMMARIES (JSON-BASED) -------------------- */

const AI_SUMMARIES_URL =
  "https://raw.githubusercontent.com/dakpasala/polyratings-ai-generator/main/summaries/ai_summaries.json";

let aiSummariesCache = null;

// Fetch once & cache
async function fetchAISummaries() {
  if (aiSummariesCache) return aiSummariesCache;
  try {
    console.log("🌐 Fetching pre-generated AI summaries...");
    const res = await fetch(AI_SUMMARIES_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    aiSummariesCache = await res.json();
    console.log(
      `✅ Loaded ${Object.keys(aiSummariesCache).length} AI summaries`
    );
    return aiSummariesCache;
  } catch (err) {
    console.error("❌ Failed to fetch AI summaries:", err);
    aiSummariesCache = {};
    return {};
  }
}

// Shared fallback message for any professor without a summary
function noRatingsMessage(profName) {
  return `No PolyRatings found. Try asking classmates or other professors for insights before enrolling.\n\nhttps://polyratings.dev/new-professor`;
}

// Tooltip (no link shown — link stripped by tooltips.js)
async function callGeminiTooltipAnalysis(profName) {
  await fetchProfessorData();

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
    console.log(`💬 Tooltip summary for ${profName}:`, summary);
    return summary;
  }

  // No summary found — same message whether in CSV or not
  console.log(`💬 No summary for ${profName}, showing fallback`);
  return "No PolyRatings found. Try asking classmates or other professors for insights before enrolling.";
}

// Chatbot / popup (with add-professor link)
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
    console.log(`🧠 Found AI summary for ${profName}`);
    // Use the professor's real profile link if available
    return `${summary}\n\n${professorData?.link || ""}`;
  }

  // No summary found — same message whether in CSV or not, always include add link
  console.log(`🚫 No summary for ${profName}, showing fallback`);
  return noRatingsMessage(profName);
}

/* ------------------ END STATIC AI SUMMARIES ------------------ */

// Extract professor name from query
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
        .replace(
          /\b(professor|prof|dr|dr\.|about|tell|me|how|is|rate|rating|info|information)\b/gi,
          ""
        )
        .trim();
      if (n.length > 2) return n;
    }
  }
  return null;
}

// General chatbot fallback
async function generateGeneralResponse(query) {
  return "I'm here to help with professor info! Try asking about a specific professor by name.";
}

/* ------------------ MESSAGING HANDLER ------------------ */

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "getProfRating") {
    (async () => {
      try {
        const data = await fetchProfessorData();
        const professor = findProfessor(message.profName);
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
        
        // CASE 1: Course comparison (e.g., "CSC 307 vs CSC 357" or "which is easier")
        if (intent.isComparison && intent.courses.length >= 2) {
          try {
            const courseData = await Promise.all(
              intent.courses.map(async (course) => {
                const csvUrl = "https://raw.githubusercontent.com/sreshtalluri/polyratings-data-collection/refs/heads/main/data/main/professor_detailed_reviews.csv";
                const response = await fetch(csvUrl);
                const csvText = await response.text();
                const rows = parseCSV(csvText);
                
                const reviews = rows
                  .filter(row => row.course_code === course)
                  .map(row => ({
                    professor: row.professor_name,
                    rating: parseFloat(row.overall_rating) || 0,
                    text: row.rating_text || "",
                    grade: row.grade
                  }))
                  .filter(r => r.text);
                
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

Provide a concise comparison (3-4 sentences) highlighting key differences in difficulty, workload, and student satisfaction. Be specific and use the review data.`;

            const response = await callGroqAPI([
              { role: "system", content: "You are a helpful Cal Poly academic advisor analyzing course reviews." },
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
        
        // CASE 2: Professor + specific course (e.g., "Professor Seng for CPE 350")
        if (intent.professorName && intent.isCourseSpecific) {
          const professor = findProfessor(intent.professorName);
          if (!professor) {
            sendResponse({
              status: "not_found",
              message: `Professor ${intent.professorName} not found in our database.`
            });
            return;
          }
          
          const courseCode = intent.courses[0];
          const reviews = await getReviewsForCourse(professor.name, courseCode);
          
          if (reviews.length === 0) {
            sendResponse({
              status: "success",
              professor: {
                analysis: `No ratings found for ${professor.name} teaching ${courseCode}. They may not have taught this course recently, or it hasn't been reviewed yet.`
              }
            });
            return;
          }
          
          const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
          
          const prompt = `Analyze Professor ${professor.name}'s ${courseCode} course based on ${reviews.length} student reviews:

Average Rating: ${avgRating.toFixed(2)}/4.0

Sample Reviews:
${reviews.slice(0, 8).map(r => `* Grade: ${r.grade}, Level: ${r.gradeLevel}\n  "${r.text.substring(0, 200)}..."`).join('\n\n')}

Provide a 3-4 sentence summary of: teaching style, difficulty level, and what types of students succeed. Be specific.`;

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
        
        // CASE 3: General professor query - use existing AI summary
        const professorName = extractProfessorNameFromQuery(query);
        if (professorName) {
          const data = await fetchProfessorData();
          const professor = findProfessor(professorName);
          const analysis = await callGeminiAnalysis(professorName, professor);
          sendResponse({
            status: "success",
            professor: { ...professor, analysis },
          });
          return;
        }
        
        // CASE 4: General question - default response
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
        const data = await fetchProfessorData();
        const professor = findProfessor(message.profName);
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
        const data = await fetchProfessorData();
        const professor = findProfessor(message.profName);
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

  // NEW: Fetch detailed reviews on-demand
  if (message.type === "getProfessorReviews") {
    (async () => {
      try {
        const profName = message.profName;
        if (!profName) {
          sendResponse({ status: "error", reviews: [] });
          return;
        }

        // Fetch the detailed reviews CSV
        const csvUrl = "https://raw.githubusercontent.com/sreshtalluri/polyratings-data-collection/refs/heads/main/data/main/professor_detailed_reviews.csv";
        const response = await fetch(csvUrl);
        const csvText = await response.text();
        const rows = parseCSV(csvText);

        // Filter reviews for this specific professor
        const reviews = rows
          .filter(row => row.professor_name === profName)
          .map(row => ({
            course: row.course_code || "Unknown Course",
            rating: parseFloat(row.overall_rating) || 0,
            clarity: parseFloat(row.presents_material_clearly) || 0,
            helpfulness: parseFloat(row.recognizes_student_difficulties) || 0,
            text: (row.rating_text || "").trim(),
            grade: row.grade && row.grade !== "N/A" ? row.grade : null,
            gradeLevel: row.grade_level && row.grade_level !== "N/A" ? row.grade_level : null,
            courseType: row.course_type || null,
            date: row.post_date || null,
          }))
          .filter(r => r.text); // Only reviews with text

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