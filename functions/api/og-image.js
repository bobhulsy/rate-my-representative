/**
 * Cloudflare Function to generate Open Graph images
 * GET /api/og-image - Generate dynamic social share cards
 */

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  
  // Get parameters
  const bioguideId = url.searchParams.get('bioguideId');
  const officialName = url.searchParams.get('name') || 'Representative';
  const party = url.searchParams.get('party') || 'Independent';
  const state = url.searchParams.get('state') || 'US';
  const rating = url.searchParams.get('rating') || '0';
  const totalRatings = url.searchParams.get('totalRatings') || '0';
  const template = url.searchParams.get('template') || 'default';
  
  try {
    // Generate SVG-based Open Graph image
    const svgImage = generateOGImageSVG({
      bioguideId,
      officialName,
      party,
      state,
      rating: parseFloat(rating),
      totalRatings: parseInt(totalRatings),
      template
    });
    
    return new Response(svgImage, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
        'Access-Control-Allow-Origin': '*'
      }
    });
    
  } catch (error) {
    console.error('Error generating OG image:', error);
    
    // Return fallback image
    const fallbackSVG = generateFallbackOGImage();
    
    return new Response(fallbackSVG, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=3600'
      }
    });
  }
}

function generateOGImageSVG({
  bioguideId,
  officialName,
  party,
  state,
  rating,
  totalRatings,
  template
}) {
  // Set party colors
  const partyColors = {
    'Democratic': { primary: '#0084ff', secondary: '#4fb3ff' },
    'Republican': { primary: '#ff0000', secondary: '#ff4d4d' },
    'Independent': { primary: '#8b5cf6', secondary: '#a78bfa' }
  };
  
  const colors = partyColors[party] || partyColors['Independent'];
  
  // Generate photo URL
  const photoUrl = bioguideId 
    ? `https://bioguide.congress.gov/bioguide/photo/${bioguideId[0]}/${bioguideId}.jpg`
    : null;
  
  // Calculate rating display
  const ratingDisplay = Math.round(rating * 10) / 10;
  const ratingColor = rating >= 60 ? '#10b981' : rating >= 40 ? '#f59e0b' : '#ef4444';
  
  // Generate star rating
  const starCount = Math.round(rating / 20); // Convert 0-100 to 0-5 stars
  const stars = '★'.repeat(starCount) + '☆'.repeat(5 - starCount);
  
  if (template === 'minimal') {
    return `
      <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${colors.primary};stop-opacity:1" />
            <stop offset="100%" style="stop-color:${colors.secondary};stop-opacity:1" />
          </linearGradient>
        </defs>
        
        <!-- Background -->
        <rect width="1200" height="630" fill="url(#bg)"/>
        
        <!-- Content -->
        <text x="600" y="200" font-family="Arial, sans-serif" font-size="48" font-weight="bold" fill="white" text-anchor="middle">
          Rate ${officialName}
        </text>
        
        <text x="600" y="260" font-family="Arial, sans-serif" font-size="32" fill="white" text-anchor="middle" opacity="0.9">
          ${party} • ${state}
        </text>
        
        <text x="600" y="350" font-family="Arial, sans-serif" font-size="72" font-weight="bold" fill="white" text-anchor="middle">
          ${ratingDisplay}%
        </text>
        
        <text x="600" y="410" font-family="Arial, sans-serif" font-size="24" fill="white" text-anchor="middle" opacity="0.8">
          ${totalRatings} ratings • ${stars}
        </text>
        
        <text x="600" y="500" font-family="Arial, sans-serif" font-size="28" font-weight="bold" fill="white" text-anchor="middle">
          RateMyRep.com
        </text>
      </svg>
    `;
  }
  
  // Default template with photo placeholder
  return `
    <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
        </linearGradient>
        <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="rgba(0,0,0,0.3)"/>
        </filter>
      </defs>
      
      <!-- Background -->
      <rect width="1200" height="630" fill="url(#bg)"/>
      
      <!-- Background pattern -->
      <g opacity="0.1">
        <circle cx="100" cy="100" r="50" fill="white"/>
        <circle cx="1100" cy="530" r="80" fill="white"/>
        <circle cx="200" cy="500" r="30" fill="white"/>
        <circle cx="1000" cy="150" r="40" fill="white"/>
      </g>
      
      <!-- Main card -->
      <rect x="80" y="80" width="1040" height="470" rx="20" fill="white" filter="url(#shadow)"/>
      
      <!-- Photo placeholder -->
      <rect x="120" y="120" width="200" height="250" rx="15" fill="${colors.primary}"/>
      <text x="220" y="260" font-family="Arial, sans-serif" font-size="16" fill="white" text-anchor="middle">
        OFFICIAL
      </text>
      <text x="220" y="280" font-family="Arial, sans-serif" font-size="16" fill="white" text-anchor="middle">
        PHOTO
      </text>
      
      <!-- Content area -->
      <text x="360" y="180" font-family="Arial, sans-serif" font-size="48" font-weight="bold" fill="#1f2937">
        ${officialName}
      </text>
      
      <!-- Party badge -->
      <rect x="360" y="200" width="120" height="35" rx="17" fill="${colors.primary}"/>
      <text x="420" y="222" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="white" text-anchor="middle">
        ${party.substring(0, 3).toUpperCase()}
      </text>
      
      <text x="500" y="222" font-family="Arial, sans-serif" font-size="18" fill="#6b7280">
        ${state}
      </text>
      
      <!-- Rating section -->
      <text x="360" y="290" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="#374151">
        Approval Rating
      </text>
      
      <text x="360" y="340" font-family="Arial, sans-serif" font-size="64" font-weight="bold" fill="${ratingColor}">
        ${ratingDisplay}%
      </text>
      
      <text x="360" y="370" font-family="Arial, sans-serif" font-size="18" fill="#6b7280">
        ${stars} (${totalRatings} ratings)
      </text>
      
      <!-- Call to action -->
      <rect x="360" y="400" width="200" height="50" rx="25" fill="${colors.primary}"/>
      <text x="460" y="430" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="white" text-anchor="middle">
        Rate Now
      </text>
      
      <!-- Branding -->
      <text x="1040" y="520" font-family="Arial, sans-serif" font-size="32" font-weight="bold" fill="#667eea" text-anchor="end">
        RateMyRep
      </text>
      
      <!-- App description -->
      <text x="120" y="510" font-family="Arial, sans-serif" font-size="16" fill="#6b7280">
        Rate and review your elected officials • Share your political opinions
      </text>
    </svg>
  `;
}

function generateFallbackOGImage() {
  return `
    <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="fallbackBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
        </linearGradient>
      </defs>
      
      <!-- Background -->
      <rect width="1200" height="630" fill="url(#fallbackBg)"/>
      
      <!-- Content -->
      <text x="600" y="250" font-family="Arial, sans-serif" font-size="64" font-weight="bold" fill="white" text-anchor="middle">
        RateMyRep
      </text>
      
      <text x="600" y="320" font-family="Arial, sans-serif" font-size="32" fill="white" text-anchor="middle" opacity="0.9">
        Rate Your Elected Officials
      </text>
      
      <text x="600" y="400" font-family="Arial, sans-serif" font-size="24" fill="white" text-anchor="middle" opacity="0.8">
        Swipe • Rate • Share • Engage
      </text>
      
      <!-- Stars decoration -->
      <text x="300" y="350" font-family="Arial, sans-serif" font-size="32" fill="white" opacity="0.7">
        ★★★★★
      </text>
      <text x="900" y="350" font-family="Arial, sans-serif" font-size="32" fill="white" opacity="0.7">
        ★★★★★
      </text>
    </svg>
  `;
}