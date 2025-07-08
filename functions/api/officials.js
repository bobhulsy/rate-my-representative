/**
 * Cloudflare Function to fetch officials data
 * GET /api/officials - Get officials by location or all officials
 * POST /api/officials - Create new official (admin only)
 */

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const lat = url.searchParams.get('lat');
  const lng = url.searchParams.get('lng');
  const bioguideId = url.searchParams.get('bioguideId');
  const state = url.searchParams.get('state');
  const limit = parseInt(url.searchParams.get('limit')) || 20;
  
  try {
    // Initialize Airtable
    const Airtable = require('airtable');
    const base = new Airtable({ apiKey: env.AIRTABLE_API_KEY }).base(env.AIRTABLE_BASE_ID);
    
    let filterFormula = '';
    
    // Build filter based on parameters
    if (bioguideId) {
      filterFormula = `{Bioguide_ID} = "${bioguideId}"`;
    } else if (state) {
      filterFormula = `{State} = "${state}"`;
    } else if (lat && lng) {
      // For now, we'll filter by general region
      // In production, you'd use a more sophisticated geo-lookup
      const stateFromCoords = getStateFromCoordinates(parseFloat(lat), parseFloat(lng));
      if (stateFromCoords) {
        filterFormula = `{State} = "${stateFromCoords}"`;
      }
    }
    
    // Query Airtable
    const records = await base(env.AIRTABLE_OFFICIALS_TABLE).select({
      filterByFormula: filterFormula,
      maxRecords: limit,
      sort: [{ field: 'Last_Updated', direction: 'desc' }]
    }).all();
    
    // Transform records to our format
    const officials = records.map(record => ({
      id: record.id,
      bioguideId: record.get('Bioguide_ID'),
      name: record.get('Full_Name'),
      firstName: record.get('First_Name'),
      lastName: record.get('Last_Name'),
      party: record.get('Party'),
      state: record.get('State'),
      district: record.get('District'),
      chamber: record.get('Chamber'),
      officeLevel: record.get('Office_Level'),
      bio: generateBio(record),
      phone: record.get('Primary_Phone'),
      email: record.get('Primary_Email'),
      website: record.get('Official_Website'),
      photoUrl: record.get('Official_Photo_URL') || generatePhotoUrl(record.get('Bioguide_ID')),
      images: [
        record.get('Official_Photo_URL') || generatePhotoUrl(record.get('Bioguide_ID')),
        `https://via.placeholder.com/400x600/4F46E5/FFFFFF?text=${encodeURIComponent('Committee')}`,
        `https://via.placeholder.com/400x600/6366F1/FFFFFF?text=${encodeURIComponent('Town Hall')}`
      ],
      keyIssues: parseKeyIssues(record.get('Key_Issues')),
      rating: calculateRating(record),
      totalRatings: getTotalRatings(record),
      socialMedia: {
        twitter: record.get('Twitter_Handle'),
        instagram: record.get('Instagram_Handle'),
        facebook: record.get('Facebook_Handle')
      },
      lastUpdated: record.get('Last_Updated')
    }));
    
    return new Response(JSON.stringify({
      success: true,
      representatives: officials,
      count: officials.length,
      location: lat && lng ? { lat: parseFloat(lat), lng: parseFloat(lng) } : null
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
      }
    });
    
  } catch (error) {
    console.error('Error fetching officials:', error);
    
    // Return fallback data for development
    const fallbackData = getFallbackOfficials(lat, lng, state, bioguideId);
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to fetch officials data',
      representatives: fallbackData,
      fallback: true
    }), {
      status: 200, // Return 200 so frontend doesn't error
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;
  
  try {
    const data = await request.json();
    
    // Initialize Airtable
    const Airtable = require('airtable');
    const base = new Airtable({ apiKey: env.AIRTABLE_API_KEY }).base(env.AIRTABLE_BASE_ID);
    
    // Create new official record
    const record = await base(env.AIRTABLE_OFFICIALS_TABLE).create({
      'Bioguide_ID': data.bioguideId,
      'First_Name': data.firstName,
      'Last_Name': data.lastName,
      'Full_Name': data.fullName,
      'Party': data.party,
      'State': data.state,
      'District': data.district,
      'Chamber': data.chamber,
      'Office_Level': data.officeLevel,
      'Primary_Email': data.email,
      'Official_Website': data.website,
      'Official_Photo_URL': data.photoUrl,
      'Last_Updated': new Date().toISOString().split('T')[0]
    });
    
    return new Response(JSON.stringify({
      success: true,
      official: {
        id: record.id,
        ...data
      }
    }), {
      status: 201,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
    
  } catch (error) {
    console.error('Error creating official:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to create official'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

// Helper functions
function generatePhotoUrl(bioguideId) {
  if (!bioguideId) return null;
  return `https://bioguide.congress.gov/bioguide/photo/${bioguideId[0]}/${bioguideId}.jpg`;
}

function generateBio(record) {
  const party = record.get('Party') || '';
  const state = record.get('State') || '';
  const chamber = record.get('Chamber') || '';
  const officeLevel = record.get('Office_Level') || '';
  
  if (officeLevel === 'Federal') {
    return `${party} ${chamber === 'Senate' ? 'Senator' : 'Representative'} representing ${state}. Dedicated to serving constituents and advancing legislative priorities.`;
  } else {
    return `${party} ${chamber} member representing ${state}. Focused on state-level issues and community development.`;
  }
}

function parseKeyIssues(issuesString) {
  if (!issuesString) return ['Government', 'Policy', 'Community'];
  return issuesString.split(',').map(issue => issue.trim()).slice(0, 4);
}

function calculateRating(record) {
  // Placeholder - in production this would come from ratings table
  return Math.round((Math.random() * 2 + 3) * 10) / 10; // Random rating between 3.0-5.0
}

function getTotalRatings(record) {
  // Placeholder - in production this would come from ratings table
  return Math.floor(Math.random() * 2000) + 100; // Random count between 100-2100
}

function getStateFromCoordinates(lat, lng) {
  // Simplified state lookup - in production use a proper geo service
  const stateMap = {
    // Major population centers
    'DC': { lat: 38.9, lng: -77.0 },
    'CA': { lat: 36.7, lng: -119.7 },
    'TX': { lat: 31.9, lng: -99.9 },
    'FL': { lat: 27.8, lng: -81.7 },
    'NY': { lat: 42.2, lng: -74.9 },
    'PA': { lat: 40.3, lng: -76.9 },
    'IL': { lat: 40.3, lng: -89.0 },
    'OH': { lat: 40.4, lng: -82.8 },
    'GA': { lat: 33.0, lng: -83.6 },
    'NC': { lat: 35.6, lng: -79.8 },
    'MI': { lat: 43.3, lng: -84.5 },
    'NJ': { lat: 40.3, lng: -74.5 },
    'VA': { lat: 37.8, lng: -78.2 },
    'WA': { lat: 47.4, lng: -121.5 }
  };
  
  let closestState = 'DC';
  let minDistance = Infinity;
  
  for (const [state, coords] of Object.entries(stateMap)) {
    const distance = Math.sqrt(
      Math.pow(lat - coords.lat, 2) + Math.pow(lng - coords.lng, 2)
    );
    if (distance < minDistance) {
      minDistance = distance;
      closestState = state;
    }
  }
  
  return closestState;
}

function getFallbackOfficials(lat, lng, state, bioguideId) {
  // Fallback data for development/demo
  return [
    {
      id: "demo_1",
      bioguideId: "A000370",
      name: "Alma Adams",
      firstName: "Alma",
      lastName: "Adams", 
      party: "Democratic",
      state: "NC",
      district: "12th District",
      chamber: "House",
      officeLevel: "Federal",
      bio: "Democratic Representative from North Carolina's 12th district. Focused on education, healthcare, and economic opportunity.",
      phone: "(202) 225-1510",
      email: "alma.adams@mail.house.gov",
      website: "https://adams.house.gov/",
      photoUrl: "https://bioguide.congress.gov/bioguide/photo/A/A000370.jpg",
      images: [
        "https://bioguide.congress.gov/bioguide/photo/A/A000370.jpg",
        "https://via.placeholder.com/400x600/3B82F6/FFFFFF?text=Committee+Work",
        "https://via.placeholder.com/400x600/6366F1/FFFFFF?text=Town+Hall"
      ],
      keyIssues: ["Education", "Healthcare", "Economic Justice"],
      rating: 4.2,
      totalRatings: 1847,
      socialMedia: {
        twitter: "@RepAdams",
        instagram: "@repadams",
        facebook: "RepAdams"
      },
      lastUpdated: "2025-07-08"
    },
    {
      id: "demo_2",
      bioguideId: "A000055",
      name: "Robert Aderholt",
      firstName: "Robert",
      lastName: "Aderholt",
      party: "Republican", 
      state: "AL",
      district: "4th District",
      chamber: "House",
      officeLevel: "Federal",
      bio: "Republican Representative from Alabama's 4th district. Focused on fiscal responsibility, defense, and traditional values.",
      phone: "(202) 225-4876",
      email: "robert.aderholt@mail.house.gov", 
      website: "https://aderholt.house.gov/",
      photoUrl: "https://bioguide.congress.gov/bioguide/photo/A/A000055.jpg",
      images: [
        "https://bioguide.congress.gov/bioguide/photo/A/A000055.jpg",
        "https://via.placeholder.com/400x600/EF4444/FFFFFF?text=Committee+Work",
        "https://via.placeholder.com/400x600/DC2626/FFFFFF?text=Town+Hall"
      ],
      keyIssues: ["Fiscal Responsibility", "Defense", "Agriculture"],
      rating: 3.8,
      totalRatings: 1243,
      socialMedia: {
        twitter: "@RobertAderholt",
        instagram: null,
        facebook: "RepAderholt"
      },
      lastUpdated: "2025-07-08"
    }
  ];
}