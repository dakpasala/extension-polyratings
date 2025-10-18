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
      link: `https://polyratings.dev/professor/${row.id}`,
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
  if (isFetching) return;
  if (professorCache) return professorCache;

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
  if (!professorCache) return null;
  const normalized = profName.toLowerCase().trim();
  return (
    professorCache.find(
      (p) =>
        p.name.toLowerCase().trim() === normalized ||
        p.name.toLowerCase().includes(normalized)
    ) || null
  );
}

/* -------------------- STATIC AI SUMMARIES (JSON-BASED) -------------------- */

// Hosted JSON file with pre-generated AI summaries
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

// Tooltip (no link)
async function callGeminiTooltipAnalysis(profName) {
  const summaries = await fetchAISummaries();
  const professor = findProfessor(profName);
  const key = Object.keys(summaries).find(
    (k) => k.toLowerCase().trim() === profName.toLowerCase().trim()
  );

  let summary;
  if (key) {
    summary = summaries[key];
    if (summary.includes("\n\nProfessor")) {
      summary = summary.split("\n\nProfessor")[1];
      summary = "Professor" + summary;
    }
    // Remove any existing links from the summary for tooltip
    summary = summary.replace(/\n\nhttps?:\/\/[^\s]+/g, "");
    summary = summary.replace(/https?:\/\/[^\s]+/g, "");
  } else {
    // professor exists in PolyRatings but not in summaries JSON
    if (professor) summary = "No summary yet.";
    else
      summary =
        "No PolyRatings found. Try asking classmates or other professors for insights before enrolling.";
  }

  console.log(`💬 Tooltip summary for ${profName}:`, summary);
  return summary;
}

// Chatbot / popup (with link)
async function callGeminiAnalysis(profName, professorData = null) {
  const summaries = await fetchAISummaries();
  const professor = findProfessor(profName);
  const key = Object.keys(summaries).find(
    (k) => k.toLowerCase().trim() === profName.toLowerCase().trim()
  );

  let summary;
  if (key) {
    summary = summaries[key];
    if (summary.includes("\n\nProfessor")) {
      summary = summary.split("\n\nProfessor")[1];
      summary = "Professor" + summary;
    }
    // Remove any existing links from the summary, we'll add our own
    summary = summary.replace(/\n\nhttps?:\/\/[^\s]+/g, "");
    summary = summary.replace(/https?:\/\/[^\s]+/g, "");
    console.log(`🧠 Found AI summary for ${profName}`);
    return `${summary}\n\n${professorData?.link || ""}`;
  }

  // Professor exists but no summary yet
  if (professor) {
    console.log(`⚠️ Professor ${profName} found but no summary in JSON`);
    return `No summary yet.\n\n${professorData?.link || ""}`;
  }

  // Professor doesn't exist at all
  console.log(`🚫 ${profName} not found in PolyRatings`);
  return `No PolyRatings found. Try asking classmates or other professors for insights before enrolling.\n\n${
    professorData?.link ||
    `https://polyratings.dev/new-professor?name=${encodeURIComponent(profName)}`
  }`;
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
        const query = message.query.toLowerCase();
        const professorName = extractProfessorNameFromQuery(query);
        if (professorName) {
          const data = await fetchProfessorData();
          const professor = findProfessor(professorName);
          const analysis = await callGeminiAnalysis(professorName, professor);
          sendResponse({
            status: "success",
            professor: { ...professor, analysis },
          });
        } else {
          const generalResponse = await generateGeneralResponse(query);
          sendResponse({
            status: "general_response",
            message: generalResponse,
          });
        }
      } catch (error) {
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
        const analysis = await callGeminiTooltipAnalysis(message.profName);
        sendResponse({
          status: "success",
          analysis,
          professor: { name: message.profName },
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

  sendResponse({ status: "error", message: "Unknown message type" });
});
