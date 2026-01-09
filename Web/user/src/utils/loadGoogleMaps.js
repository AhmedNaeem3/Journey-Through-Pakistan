let loadingPromise = null;

export function loadGoogleMapsPlaces(apiKey) {
  if (!apiKey) return Promise.reject(new Error("Missing Google Maps API key"));
  if (window.google?.maps?.places) return Promise.resolve(window.google);

  if (loadingPromise) return loadingPromise;

  loadingPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-google-maps="true"]');
    if (existing) {
      // Check if already loaded
      if (window.google?.maps?.places) {
        return resolve(window.google);
      }
      existing.addEventListener("load", () => resolve(window.google));
      existing.addEventListener("error", () => reject(new Error("Failed to load Google Maps script")));
      return;
    }

    const script = document.createElement("script");
    script.dataset.googleMaps = "true";
    script.async = true;
    script.defer = true;
    
    // Validate API key format before using
    if (!apiKey.startsWith("AIza")) {
      console.warn("API key format might be incorrect. Google API keys usually start with 'AIza'");
    }
    
    // Add loading=async parameter as recommended by Google
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places&loading=async`;
    
    // Enhanced error handling
    script.onload = () => {
      console.log("Google Maps script onload fired");
      // Wait a bit for Google Maps to fully initialize
      setTimeout(() => {
        // Check for API errors after load
        if (window.google?.maps) {
          // Suppress deprecation warnings (they're just warnings, not errors)
          const originalWarn = console.warn;
          const originalError = console.error;
          
          console.warn = function(...args) {
            const message = args[0]?.toString() || '';
            // Suppress Google Maps deprecation warnings
            if (message.includes('deprecated') || 
                message.includes('AdvancedMarkerElement') || 
                message.includes('PlaceAutocompleteElement')) {
              return; // Suppress these warnings
            }
            originalWarn.apply(console, args);
          };
          
          // Catch Google Maps API errors but don't suppress activation errors
          console.error = function(...args) {
            const message = args[0]?.toString() || '';
            // Only suppress deprecation-related errors, not activation errors
            if (message.includes('ApiNotActivatedMapError') || 
                message.includes('ApiNotActivated')) {
              // Log activation errors so user knows what's wrong
              originalError.apply(console, args);
              return;
            }
            originalError.apply(console, args);
          };
          
          resolve(window.google);
        } else {
          reject(new Error("Google Maps API loaded but maps object not available. Please check if Maps JavaScript API is enabled in Google Cloud Console."));
        }
      }, 500);
    };
    
    script.onerror = () => {
      reject(new Error("Failed to load Google Maps script. Please check your API key and ensure Maps JavaScript API and Places API are enabled in Google Cloud Console."));
    };
    
    document.head.appendChild(script);
    
    // Timeout after 10 seconds
    setTimeout(() => {
      if (!window.google?.maps) {
        reject(new Error("Google Maps API loading timeout. Please check your API key and network connection."));
      }
    }, 10000);
  });

  return loadingPromise;
}


