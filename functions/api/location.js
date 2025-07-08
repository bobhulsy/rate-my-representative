/**
 * Cloudflare Function to handle location detection
 * GET /api/location - Get user location from IP or provide geolocation
 */

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  
  // Check if coordinates were provided
  const lat = url.searchParams.get('lat');
  const lng = url.searchParams.get('lng');
  
  if (lat && lng) {
    // Use provided coordinates
    try {
      const locationData = await reverseGeocode(parseFloat(lat), parseFloat(lng));
      
      return new Response(JSON.stringify({
        success: true,
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        ...locationData,
        source: 'provided'
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=3600'
        }
      });
    } catch (error) {
      console.error('Error with reverse geocoding:', error);
    }
  }
  
  try {
    // Get location from Cloudflare headers
    const country = request.headers.get('CF-IPCountry') || 'US';
    const region = request.headers.get('CF-IPStateProvince') || '';
    const city = request.headers.get('CF-IPCity') || '';
    const timezone = request.headers.get('CF-Timezone') || 'America/New_York';
    
    // Convert region code to full state name if US
    const state = country === 'US' ? getFullStateName(region) : region;
    
    // Get approximate coordinates for the location
    const coordinates = await getCoordinatesForLocation(city, state, country);
    
    return new Response(JSON.stringify({
      success: true,
      lat: coordinates.lat,
      lng: coordinates.lng,
      city: city || 'Unknown',
      state: state || region,
      stateCode: region,
      country: country,
      timezone: timezone,
      source: 'cloudflare-headers'
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=1800' // Cache for 30 minutes
      }
    });
    
  } catch (error) {
    console.error('Error detecting location:', error);
    
    // Return default location (Washington, DC)
    return new Response(JSON.stringify({
      success: true,
      lat: 38.9072,
      lng: -77.0369,
      city: 'Washington',
      state: 'District of Columbia',
      stateCode: 'DC',
      country: 'US',
      timezone: 'America/New_York',
      source: 'default'
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

// Helper functions
async function reverseGeocode(lat, lng) {
  // Simple reverse geocoding based on major metropolitan areas
  const majorCities = [
    { lat: 38.9072, lng: -77.0369, city: 'Washington', state: 'District of Columbia', stateCode: 'DC' },
    { lat: 40.7128, lng: -74.0060, city: 'New York', state: 'New York', stateCode: 'NY' },
    { lat: 34.0522, lng: -118.2437, city: 'Los Angeles', state: 'California', stateCode: 'CA' },
    { lat: 41.8781, lng: -87.6298, city: 'Chicago', state: 'Illinois', stateCode: 'IL' },
    { lat: 29.7604, lng: -95.3698, city: 'Houston', state: 'Texas', stateCode: 'TX' },
    { lat: 33.4484, lng: -112.0740, city: 'Phoenix', state: 'Arizona', stateCode: 'AZ' },
    { lat: 39.7392, lng: -104.9903, city: 'Denver', state: 'Colorado', stateCode: 'CO' },
    { lat: 47.6062, lng: -122.3321, city: 'Seattle', state: 'Washington', stateCode: 'WA' },
    { lat: 25.7617, lng: -80.1918, city: 'Miami', state: 'Florida', stateCode: 'FL' },
    { lat: 42.3601, lng: -71.0589, city: 'Boston', state: 'Massachusetts', stateCode: 'MA' }
  ];
  
  let closestCity = majorCities[0];
  let minDistance = Infinity;
  
  for (const city of majorCities) {
    const distance = Math.sqrt(
      Math.pow(lat - city.lat, 2) + Math.pow(lng - city.lng, 2)
    );
    
    if (distance < minDistance) {
      minDistance = distance;
      closestCity = city;
    }
  }
  
  return {
    city: closestCity.city,
    state: closestCity.state,
    stateCode: closestCity.stateCode,
    country: 'US'
  };
}

async function getCoordinatesForLocation(city, state, country) {
  // Simplified coordinate lookup for major US locations
  const locationMap = {
    'Washington-DC': { lat: 38.9072, lng: -77.0369 },
    'New York-NY': { lat: 40.7128, lng: -74.0060 },
    'Los Angeles-CA': { lat: 34.0522, lng: -118.2437 },
    'Chicago-IL': { lat: 41.8781, lng: -87.6298 },
    'Houston-TX': { lat: 29.7604, lng: -95.3698 },
    'Phoenix-AZ': { lat: 33.4484, lng: -112.0740 },
    'Denver-CO': { lat: 39.7392, lng: -104.9903 },
    'Seattle-WA': { lat: 47.6062, lng: -122.3321 },
    'Miami-FL': { lat: 25.7617, lng: -80.1918 },
    'Boston-MA': { lat: 42.3601, lng: -71.0589 },
    'Atlanta-GA': { lat: 33.7490, lng: -84.3880 },
    'Dallas-TX': { lat: 32.7767, lng: -96.7970 },
    'San Francisco-CA': { lat: 37.7749, lng: -122.4194 },
    'Philadelphia-PA': { lat: 39.9526, lng: -75.1652 },
    'San Diego-CA': { lat: 32.7157, lng: -117.1611 }
  };
  
  // Try exact match first
  const key = `${city}-${state}`;
  if (locationMap[key]) {
    return locationMap[key];
  }
  
  // Try state-only match for state capitals
  const stateCapitals = {
    'AL': { lat: 32.3668, lng: -86.2999 }, // Montgomery
    'AK': { lat: 58.2014, lng: -134.4197 }, // Juneau
    'AZ': { lat: 33.4484, lng: -112.0740 }, // Phoenix
    'AR': { lat: 34.7465, lng: -92.2896 }, // Little Rock
    'CA': { lat: 38.5767, lng: -121.4934 }, // Sacramento
    'CO': { lat: 39.7392, lng: -104.9903 }, // Denver
    'CT': { lat: 41.7658, lng: -72.6734 }, // Hartford
    'DE': { lat: 39.1612, lng: -75.5264 }, // Dover
    'FL': { lat: 30.4518, lng: -84.27277 }, // Tallahassee
    'GA': { lat: 33.7490, lng: -84.3880 }, // Atlanta
    'HI': { lat: 21.30895, lng: -157.826182 }, // Honolulu
    'ID': { lat: 43.6150, lng: -116.2023 }, // Boise
    'IL': { lat: 39.78325, lng: -89.650373 }, // Springfield
    'IN': { lat: 39.790942, lng: -86.147685 }, // Indianapolis
    'IA': { lat: 41.590939, lng: -93.620866 }, // Des Moines
    'KS': { lat: 39.04, lng: -95.69 }, // Topeka
    'KY': { lat: 38.194, lng: -84.86 }, // Frankfort
    'LA': { lat: 30.45809, lng: -91.140229 }, // Baton Rouge
    'ME': { lat: 44.323535, lng: -69.765261 }, // Augusta
    'MD': { lat: 38.972945, lng: -76.501157 }, // Annapolis
    'MA': { lat: 42.2352, lng: -71.0275 }, // Boston
    'MI': { lat: 42.354558, lng: -84.955255 }, // Lansing
    'MN': { lat: 44.95, lng: -93.094 }, // St. Paul
    'MS': { lat: 32.320, lng: -90.207 }, // Jackson
    'MO': { lat: 38.572954, lng: -92.189283 }, // Jefferson City
    'MT': { lat: 46.595805, lng: -112.027031 }, // Helena
    'NE': { lat: 40.809868, lng: -96.675345 }, // Lincoln
    'NV': { lat: 39.161921, lng: -119.767409 }, // Carson City
    'NH': { lat: 43.220093, lng: -71.549896 }, // Concord
    'NJ': { lat: 40.221741, lng: -74.756138 }, // Trenton
    'NM': { lat: 35.667231, lng: -105.964575 }, // Santa Fe
    'NY': { lat: 42.659829, lng: -73.781339 }, // Albany
    'NC': { lat: 35.771, lng: -78.638 }, // Raleigh
    'ND': { lat: 46.813343, lng: -100.779004 }, // Bismarck
    'OH': { lat: 39.961176, lng: -82.998794 }, // Columbus
    'OK': { lat: 35.482309, lng: -97.534994 }, // Oklahoma City
    'OR': { lat: 44.931109, lng: -123.029159 }, // Salem
    'PA': { lat: 40.269789, lng: -76.875613 }, // Harrisburg
    'RI': { lat: 41.82355, lng: -71.422132 }, // Providence
    'SC': { lat: 34.000, lng: -81.035 }, // Columbia
    'SD': { lat: 44.367966, lng: -100.336378 }, // Pierre
    'TN': { lat: 36.165, lng: -86.784 }, // Nashville
    'TX': { lat: 30.266667, lng: -97.75 }, // Austin
    'UT': { lat: 40.777477, lng: -111.888237 }, // Salt Lake City
    'VT': { lat: 44.26639, lng: -72.580536 }, // Montpelier
    'VA': { lat: 37.54, lng: -77.46 }, // Richmond
    'WA': { lat: 47.042418, lng: -122.893077 }, // Olympia
    'WV': { lat: 38.349497, lng: -81.633294 }, // Charleston
    'WI': { lat: 43.074722, lng: -89.384444 }, // Madison
    'WY': { lat: 41.145548, lng: -104.802042 }, // Cheyenne
    'DC': { lat: 38.9072, lng: -77.0369 } // Washington DC
  };
  
  const stateCode = getStateCodeFromName(state);
  if (stateCode && stateCapitals[stateCode]) {
    return stateCapitals[stateCode];
  }
  
  // Default to Washington, DC
  return { lat: 38.9072, lng: -77.0369 };
}

function getFullStateName(stateCode) {
  const stateNames = {
    'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas',
    'CA': 'California', 'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware',
    'FL': 'Florida', 'GA': 'Georgia', 'HI': 'Hawaii', 'ID': 'Idaho',
    'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa', 'KS': 'Kansas',
    'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
    'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi',
    'MO': 'Missouri', 'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada',
    'NH': 'New Hampshire', 'NJ': 'New Jersey', 'NM': 'New Mexico', 'NY': 'New York',
    'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio', 'OK': 'Oklahoma',
    'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
    'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah',
    'VT': 'Vermont', 'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia',
    'WI': 'Wisconsin', 'WY': 'Wyoming', 'DC': 'District of Columbia'
  };
  
  return stateNames[stateCode] || stateCode;
}

function getStateCodeFromName(stateName) {
  const namesToCodes = {
    'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR',
    'california': 'CA', 'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE',
    'florida': 'FL', 'georgia': 'GA', 'hawaii': 'HI', 'idaho': 'ID',
    'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA', 'kansas': 'KS',
    'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
    'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS',
    'missouri': 'MO', 'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV',
    'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
    'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH', 'oklahoma': 'OK',
    'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
    'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT',
    'vermont': 'VT', 'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV',
    'wisconsin': 'WI', 'wyoming': 'WY', 'district of columbia': 'DC'
  };
  
  return namesToCodes[stateName.toLowerCase()];
}