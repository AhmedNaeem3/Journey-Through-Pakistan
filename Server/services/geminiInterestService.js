import axios from 'axios';
import { getGoogleGeminiAPIKey } from '../utils/settingsHelper.js';

/**
 * Gemini Interest Expansion Service
 * Expands user interests and generates tourism search queries for Google Places API
 */

/**
 * Expand interests using Gemini AI and generate search queries
 * @param {Array<string>} interests - Array of user interests (e.g., ["mountains", "adventure"])
 * @param {Object} userLocation - Optional user location { latitude, longitude }
 * @returns {Promise<Array<string>>} - Array of search queries for Google Places API
 */
export async function expandInterestsWithGemini(interests, userLocation = null) {
  if (!interests || interests.length === 0) {
    return [];
  }

  try {
    const geminiApiKey = await getGoogleGeminiAPIKey();
    if (!geminiApiKey) {
      return generateDirectQueries(interests, userLocation);
    }

    // Build prompt for Gemini
    const locationContext = userLocation 
      ? `The user is currently located at ${userLocation.latitude}, ${userLocation.longitude} in Pakistan. Focus on finding TOP places in their CURRENT CITY/REGION.`
      : "The user is in Pakistan. Focus on finding TOP places ALL OVER Pakistan (not location-specific).";

    const searchScope = userLocation 
      ? "in the user's current city/region" 
      : "all over Pakistan (any city)";

    const prompt = `You are a tourism recommendation assistant for Pakistan. 

${locationContext}

User interest: ${interests.join(", ")}

Your task:
1. Generate 3-5 specific search queries for Google Places Text Search API to find TOP tourist attractions and places ${searchScope} related to this interest
2. Focus on finding the MOST POPULAR and FAMOUS places for this interest category ${searchScope}
3. Each query should be optimized to find actual tourist attractions, landmarks, or places
4. ${userLocation ? 'Include the city name or region in queries (e.g., "Lahore", "Karachi", "Islamabad")' : 'Include "Pakistan" in each query'}
5. Make queries specific to find top-rated, well-known places

Format your response as a JSON array of strings, like this:
["query 1", "query 2", "query 3"]

Examples (all over Pakistan):
Input: "nature"
Output: ["top nature parks Pakistan", "famous national parks Pakistan", "best nature reserves Pakistan", "popular wildlife sanctuaries Pakistan"]

Examples (city-specific - user in Lahore):
Input: "nature" (user in Lahore)
Output: ["top nature parks Lahore", "famous parks Lahore Pakistan", "best nature places Lahore", "popular gardens Lahore"]

Examples (city-specific - user in Karachi):
Input: "history" (user in Karachi)
Output: ["famous historical sites Karachi", "top historical monuments Karachi", "best museums Karachi", "ancient sites Karachi"]

Now generate queries for: ${interests.join(", ")}

Return ONLY the JSON array, no other text.`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${geminiApiKey}`;

    const requestBody = {
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      }
    };

    const response = await axios.post(geminiUrl, requestBody, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 15000, // 15 second timeout
    });

    if (response.data && response.data.candidates && response.data.candidates.length > 0) {
      const candidate = response.data.candidates[0];
      const content = candidate.content.parts[0].text.trim();

      // Try to parse JSON from response
      // Gemini might return text with markdown code blocks
      let jsonText = content;
      
      // Remove markdown code blocks if present
      if (content.includes('```')) {
        const jsonMatch = content.match(/```(?:json)?\s*(\[[\s\S]*\])\s*```/);
        if (jsonMatch) {
          jsonText = jsonMatch[1];
        }
      }

      try {
        const queries = JSON.parse(jsonText);
        if (Array.isArray(queries) && queries.length > 0) {
          return queries.filter(q => typeof q === "string" && q.trim().length > 0);
        }
      } catch (parseError) {
        // Fallback to direct queries if parsing fails
      }
    }

    // Fallback to direct queries if Gemini fails
    return generateDirectQueries(interests, userLocation);
  } catch (error) {
    console.error("❌ Error expanding interests with Gemini:", error.message);
    // Fallback to direct queries
    return generateDirectQueries(interests, userLocation);
  }
}

/**
 * Generate direct search queries from interests (fallback)
 * @param {Array<string>} interests - User interests
 * @param {Object} userLocation - Optional user location
 * @returns {Array<string>} - Search queries
 */
function generateDirectQueries(interests, userLocation = null) {
  const queries = [];
  
  // Determine city name from coordinates (rough estimation for major Pakistani cities)
  let cityName = null;
  if (userLocation) {
    const lat = userLocation.latitude;
    const lng = userLocation.longitude;
    
    // Major Pakistani cities with approximate coordinates
    if (lat >= 31.4 && lat <= 31.6 && lng >= 74.2 && lng <= 74.4) cityName = "Lahore";
    else if (lat >= 24.8 && lat <= 25.0 && lng >= 67.0 && lng <= 67.2) cityName = "Karachi";
    else if (lat >= 33.6 && lat <= 33.8 && lng >= 73.0 && lng <= 73.2) cityName = "Islamabad";
    else if (lat >= 33.5 && lat <= 33.7 && lng >= 73.0 && lng <= 73.2) cityName = "Rawalpindi";
    else if (lat >= 30.1 && lat <= 30.3 && lng >= 71.4 && lng <= 71.6) cityName = "Multan";
    else if (lat >= 31.4 && lat <= 31.6 && lng >= 73.0 && lng <= 73.2) cityName = "Faisalabad";
    else if (lat >= 34.0 && lat <= 34.2 && lng >= 71.4 && lng <= 71.6) cityName = "Peshawar";
    else if (lat >= 30.1 && lat <= 30.3 && lng >= 66.5 && lng <= 66.7) cityName = "Quetta";
  }
  
  // Location suffix - use city name if available, otherwise "Pakistan"
  const locationSuffix = cityName ? cityName : "Pakistan";
  
  // Generate queries for each interest
  for (const interest of interests) {
    const normalized = interest.toLowerCase().trim();
    
    // Add variations
    if (cityName) {
      // City-specific queries
      queries.push(`top ${normalized} ${locationSuffix}`);
      queries.push(`famous ${normalized} places ${locationSuffix}`);
      queries.push(`best ${normalized} ${locationSuffix} Pakistan`);
    } else {
      // All-Pakistan queries
      queries.push(`top ${normalized} ${locationSuffix}`);
      queries.push(`famous ${normalized} ${locationSuffix}`);
      queries.push(`best ${normalized} places ${locationSuffix}`);
    }
    
    // Add specific variations based on common interests
    if (normalized.includes("mountain") || normalized.includes("hill")) {
      queries.push(cityName ? `mountain hiking ${locationSuffix}` : `mountain hiking ${locationSuffix}`);
      queries.push(cityName ? `mountain resorts ${locationSuffix}` : `mountain resorts ${locationSuffix}`);
    }
    if (normalized.includes("adventure") || normalized.includes("sport")) {
      queries.push(cityName ? `adventure sports ${locationSuffix}` : `adventure sports ${locationSuffix}`);
      queries.push(cityName ? `outdoor activities ${locationSuffix}` : `outdoor activities ${locationSuffix}`);
    }
    if (normalized.includes("history") || normalized.includes("historical")) {
      queries.push(cityName ? `historical sites ${locationSuffix}` : `historical sites ${locationSuffix}`);
      queries.push(cityName ? `historical monuments ${locationSuffix}` : `historical monuments ${locationSuffix}`);
    }
    if (normalized.includes("food") || normalized.includes("cuisine")) {
      queries.push(cityName ? `famous restaurants ${locationSuffix}` : `famous restaurants ${locationSuffix}`);
      queries.push(cityName ? `local cuisine ${locationSuffix}` : `local cuisine ${locationSuffix}`);
    }
    if (normalized.includes("nature") || normalized.includes("park")) {
      queries.push(cityName ? `parks ${locationSuffix}` : `national parks ${locationSuffix}`);
      queries.push(cityName ? `nature places ${locationSuffix}` : `nature reserves ${locationSuffix}`);
    }
  }
  
  // Remove duplicates and limit to 10
  return [...new Set(queries)].slice(0, 10);
}
