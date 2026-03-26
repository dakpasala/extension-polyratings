/* ==================== SUPABASE CLIENT ==================== */
const SUPABASE_URL = "https://sttbldldsatbkknguznf.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN0dGJsZGxkc2F0Ymtrbmd1em5mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzMjY2MzUsImV4cCI6MjA4OTkwMjYzNX0.fX7w_3qa8GJO4NntIAdsWv92F8ssFSj0UnM6mXqsuOE";

/* ==================== CORE QUERY FUNCTION ==================== */
async function supabaseQuery(table, params = {}) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
  
  if (params.select) {
    url.searchParams.set('select', params.select);
  } else {
    url.searchParams.set('select', '*');
  }
  
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
      const escapedValues = values.map(v => `"${v}"`).join(',');
      url.searchParams.set(key, `in.(${escapedValues})`);
    });
  }
  
  if (params.limit) url.searchParams.set('limit', params.limit);
  if (params.order) url.searchParams.set('order', params.order);
  
  console.log('🔍 Supabase query:', url.toString());
  
  const response = await fetch(url, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    const error = await response.text();
    console.error('❌ Supabase error:', error);
    throw new Error(`Supabase query failed: ${response.statusText}`);
  }
  
  return response.json();
}

/* ==================== PROFESSOR QUERIES ==================== */

async function getAllProfessors() {
  try {
    const data = await supabaseQuery('professors_data', {
      select: 'id,fullName,firstName,lastName,department,overallRating,numEvals'
    });
    
    return data.map(prof => ({
      id: prof.id,
      name: prof.fullName,
      firstName: prof.firstName,
      lastName: prof.lastName,
      rating: parseFloat(prof.overallRating) || 0,
      numEvals: parseInt(prof.numEvals) || 0,
      department: prof.department || "",
      link: /^[a-zA-Z0-9\-_]+$/.test(prof.id)
        ? `https://polyratings.dev/professor/${prof.id}`
        : "https://polyratings.dev/new-professor"
    }));
  } catch (error) {
    console.error("❌ Failed to get all professors:", error);
    return [];
  }
}

async function findProfessorByName(name) {
  try {
    const exact = await supabaseQuery('professors_data', {
      eq: { fullName: name },
      limit: 1
    });
    
    if (exact.length > 0) {
      const prof = exact[0];
      return {
        id: prof.id,
        name: prof.fullName,
        rating: parseFloat(prof.overallRating) || 0,
        numEvals: parseInt(prof.numEvals) || 0,
        department: prof.department || "",
        link: /^[a-zA-Z0-9\-_]+$/.test(prof.id)
          ? `https://polyratings.dev/professor/${prof.id}`
          : "https://polyratings.dev/new-professor"
      };
    }
    
    const partial = await supabaseQuery('professors_data', {
      ilike: { fullName: `%${name}%` },
      limit: 5
    });
    
    if (partial.length > 0) {
      const prof = partial[0];
      console.log(`✅ Found via fuzzy: ${name} → ${prof.fullName}`);
      return {
        id: prof.id,
        name: prof.fullName,
        rating: parseFloat(prof.overallRating) || 0,
        numEvals: parseInt(prof.numEvals) || 0,
        department: prof.department || "",
        link: /^[a-zA-Z0-9\-_]+$/.test(prof.id)
          ? `https://polyratings.dev/professor/${prof.id}`
          : "https://polyratings.dev/new-professor"
      };
    }
    
    return null;
  } catch (error) {
    console.error(`❌ Failed to find ${name}:`, error);
    return null;
  }
}

/* ==================== REVIEW QUERIES ==================== */

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
    console.error(`❌ Reviews error for ${professorName}:`, error);
    return [];
  }
}

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
    console.error(`❌ Reviews error for ${courseCode}:`, error);
    return [];
  }
}

async function getReviewsByProfessorAndCourse(professorName, courseCode, limit = 20) {
  try {
    const url = new URL(`${SUPABASE_URL}/rest/v1/professor_reviews`);
    url.searchParams.set('professor_name', `eq.${professorName}`);
    url.searchParams.set('course_code', `eq.${courseCode}`);
    url.searchParams.set('order', 'post_date.desc');
    url.searchParams.set('limit', limit);
    url.searchParams.set('select', '*');
    
    console.log('🔍 Supabase query:', url.toString());
    
    const response = await fetch(url, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });
    
    if (!response.ok) throw new Error(`Query failed: ${response.statusText}`);
    
    const data = await response.json();
    
    return data.map(row => ({
      rating: parseFloat(row.overall_rating) || 0,
      text: (row.rating_text || "").trim(),
      grade: row.grade,
      gradeLevel: row.grade_level,
      date: row.post_date
    }));
  } catch (error) {
    console.error(`❌ Reviews error for ${professorName} - ${courseCode}:`, error);
    return [];
  }
}

async function getReviewsForCourses(courseCodes, limitPerCourse = 10) {
  try {
    const data = await supabaseQuery('professor_reviews', {
      in: { course_code: courseCodes },
      order: 'overall_rating.desc',
      limit: limitPerCourse * courseCodes.length
    });
    
    const grouped = {};
    courseCodes.forEach(code => grouped[code] = []);
    
    data.forEach(row => {
      if (grouped[row.course_code]) {
        grouped[row.course_code].push({
          professor: row.professor_name,
          rating: parseFloat(row.overall_rating) || 0,
          text: (row.rating_text || "").trim(),
          grade: row.grade,
          gradeLevel: row.grade_level
        });
      }
    });
    
    return grouped;
  } catch (error) {
    console.error('❌ getReviewsForCourses error:', error);
    return {};
  }
}