import { getGooglePlacesAPIKey } from "../utils/settingsHelper.js";

/**
 * Returns a client-usable Google Maps/Places key.
 * NOTE: Any browser key is inherently public. Restrict this key by HTTP referrers in Google Cloud Console.
 */
export const getGoogleMapsPublicKey = async (req, res) => {
  try {
    const key = await getGooglePlacesAPIKey();
    
    // Debug logging in development
    if (process.env.NODE_ENV === "development") {
      console.log("Google Maps API Key requested:");
      console.log("- Key exists:", !!key);
      console.log("- Key length:", key ? key.length : 0);
      console.log("- Key preview:", key ? `${key.substring(0, 10)}...${key.substring(key.length - 4)}` : "N/A");
    }
    
    if (!key || key.trim() === "") {
      console.warn("Google Maps API key is empty or not configured");
      return res.status(500).json({ 
        message: "Google Maps API key is not configured on the server",
        key: "" 
      });
    }
    
    return res.json({ key: key.trim() });
  } catch (error) {
    console.error("Error getting Google Maps public key:", error);
    console.error("Error stack:", error.stack);
    return res.status(500).json({ 
      message: "Failed to load maps key",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
};


