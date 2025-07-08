/**
 * Cloudflare Function to handle rating submissions
 * POST /api/rate - Submit a rating for an official
 * GET /api/rate - Get rating statistics
 */

export async function onRequestPost(context) {
  const { request, env } = context;
  
  try {
    const data = await request.json();
    const { officialId, bioguideId, rating, direction, location, comment } = data;
    
    // Validate input
    if (!officialId && !bioguideId) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Either officialId or bioguideId is required'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
    
    if (rating < 0 || rating > 100) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Rating must be between 0 and 100'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
    
    // Initialize Airtable
    const Airtable = require('airtable');
    const base = new Airtable({ apiKey: env.AIRTABLE_API_KEY }).base(env.AIRTABLE_BASE_ID);
    
    // Get client IP for rate limiting (optional)
    const clientIP = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown';
    
    // Create rating record
    const record = await base(env.AIRTABLE_RATINGS_TABLE).create({
      'Official_ID': officialId,
      'Bioguide_ID': bioguideId,
      'Rating': rating,
      'Direction': direction,
      'Comment': comment || '',
      'Location_Lat': location?.lat ? location.lat.toString() : '',
      'Location_Lng': location?.lng ? location.lng.toString() : '',
      'Client_IP': clientIP,
      'User_Agent': request.headers.get('User-Agent') || '',
      'Timestamp': new Date().toISOString(),
      'Date_Created': new Date().toISOString().split('T')[0]
    });
    
    // Update official's aggregate rating (you might want to do this via a background job)
    try {
      await updateOfficialRating(base, env, officialId || bioguideId, rating);
    } catch (updateError) {
      console.error('Error updating aggregate rating:', updateError);
      // Don't fail the request if aggregate update fails
    }
    
    return new Response(JSON.stringify({
      success: true,
      rating: {
        id: record.id,
        officialId: officialId || bioguideId,
        rating,
        direction,
        timestamp: new Date().toISOString()
      }
    }), {
      status: 201,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
    
  } catch (error) {
    console.error('Error submitting rating:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to submit rating'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const officialId = url.searchParams.get('officialId');
  const bioguideId = url.searchParams.get('bioguideId');
  const days = parseInt(url.searchParams.get('days')) || 30;
  
  try {
    // Initialize Airtable
    const Airtable = require('airtable');
    const base = new Airtable({ apiKey: env.AIRTABLE_API_KEY }).base(env.AIRTABLE_BASE_ID);
    
    let filterFormula = '';
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);
    const dateString = dateThreshold.toISOString().split('T')[0];
    
    // Build filter
    if (officialId) {
      filterFormula = `AND({Official_ID} = "${officialId}", {Date_Created} >= "${dateString}")`;
    } else if (bioguideId) {
      filterFormula = `AND({Bioguide_ID} = "${bioguideId}", {Date_Created} >= "${dateString}")`;
    } else {
      filterFormula = `{Date_Created} >= "${dateString}"`;
    }
    
    // Query ratings
    const records = await base(env.AIRTABLE_RATINGS_TABLE).select({
      filterByFormula: filterFormula,
      sort: [{ field: 'Timestamp', direction: 'desc' }]
    }).all();
    
    // Calculate statistics
    const ratings = records.map(record => ({
      id: record.id,
      rating: record.get('Rating'),
      direction: record.get('Direction'),
      comment: record.get('Comment'),
      timestamp: record.get('Timestamp'),
      location: {
        lat: parseFloat(record.get('Location_Lat')) || null,
        lng: parseFloat(record.get('Location_Lng')) || null
      }
    }));
    
    const stats = calculateRatingStats(ratings);
    
    return new Response(JSON.stringify({
      success: true,
      stats,
      ratings: ratings.slice(0, 100), // Limit to latest 100 ratings
      count: ratings.length,
      period: `${days} days`
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=300' // Cache for 5 minutes
      }
    });
    
  } catch (error) {
    console.error('Error fetching ratings:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to fetch ratings',
      stats: {
        averageRating: 0,
        totalRatings: 0,
        positivePercentage: 0,
        negativePercentage: 0
      }
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

// OPTIONS handler for CORS
export async function onRequestOptions(context) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  });
}

// Helper functions
async function updateOfficialRating(base, env, officialKey, newRating) {
  try {
    // Find the official record
    const filterFormula = officialKey.startsWith('OFF_') 
      ? `{Official_ID} = "${officialKey}"`
      : `{Bioguide_ID} = "${officialKey}"`;
    
    const officials = await base(env.AIRTABLE_OFFICIALS_TABLE).select({
      filterByFormula: filterFormula,
      maxRecords: 1
    }).all();
    
    if (officials.length === 0) return;
    
    const official = officials[0];
    const currentRating = official.get('Average_Rating') || 0;
    const currentCount = official.get('Total_Ratings') || 0;
    
    // Calculate new average
    const newCount = currentCount + 1;
    const newAverage = ((currentRating * currentCount) + newRating) / newCount;
    
    // Update the record
    await base(env.AIRTABLE_OFFICIALS_TABLE).update(official.id, {
      'Average_Rating': Math.round(newAverage * 10) / 10, // Round to 1 decimal
      'Total_Ratings': newCount,
      'Last_Rating_Date': new Date().toISOString().split('T')[0]
    });
    
  } catch (error) {
    console.error('Error updating official rating:', error);
    throw error;
  }
}

function calculateRatingStats(ratings) {
  if (ratings.length === 0) {
    return {
      averageRating: 0,
      totalRatings: 0,
      positivePercentage: 0,
      negativePercentage: 0,
      neutralPercentage: 0,
      ratingDistribution: {
        excellent: 0, // 80-100
        good: 0,      // 60-79
        neutral: 0,   // 40-59
        poor: 0,      // 20-39
        terrible: 0   // 0-19
      }
    };
  }
  
  const total = ratings.length;
  const sum = ratings.reduce((acc, r) => acc + r.rating, 0);
  const average = sum / total;
  
  let positive = 0;
  let negative = 0;
  let neutral = 0;
  
  const distribution = {
    excellent: 0,
    good: 0,
    neutral: 0,
    poor: 0,
    terrible: 0
  };
  
  ratings.forEach(r => {
    if (r.rating >= 60) positive++;
    else if (r.rating <= 40) negative++;
    else neutral++;
    
    if (r.rating >= 80) distribution.excellent++;
    else if (r.rating >= 60) distribution.good++;
    else if (r.rating >= 40) distribution.neutral++;
    else if (r.rating >= 20) distribution.poor++;
    else distribution.terrible++;
  });
  
  return {
    averageRating: Math.round(average * 10) / 10,
    totalRatings: total,
    positivePercentage: Math.round((positive / total) * 100),
    negativePercentage: Math.round((negative / total) * 100),
    neutralPercentage: Math.round((neutral / total) * 100),
    ratingDistribution: distribution
  };
}