/**
 * Cloudflare Function to fetch staff data
 * GET /api/staff - Get staff by official ID or office
 */

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const officialId = url.searchParams.get('officialId');
  const bioguideId = url.searchParams.get('bioguideId');
  const office = url.searchParams.get('office');
  const limit = parseInt(url.searchParams.get('limit')) || 20;
  
  try {
    // Initialize Airtable
    const Airtable = require('airtable');
    const base = new Airtable({ apiKey: env.AIRTABLE_API_KEY }).base(env.AIRTABLE_BASE_ID);
    
    let filterFormula = '';
    
    // Build filter based on parameters
    if (officialId) {
      filterFormula = `{Official_Link} = "${officialId}"`;
    } else if (bioguideId) {
      filterFormula = `{Bioguide_ID} = "${bioguideId}"`;
    } else if (office) {
      filterFormula = `SEARCH("${office}", {Office_Location}) > 0`;
    }
    
    // Query Airtable for staff
    const records = await base(env.AIRTABLE_STAFF_TABLE).select({
      filterByFormula: filterFormula,
      maxRecords: limit,
      sort: [{ field: 'Job_Title', direction: 'asc' }]
    }).all();
    
    // Transform records to our format
    const staff = records.map(record => ({
      id: record.id,
      staffId: record.get('Staff_ID'),
      firstName: record.get('First_Name'),
      lastName: record.get('Last_Name'),
      fullName: record.get('Full_Name'),
      jobTitle: record.get('Job_Title'),
      phone: record.get('Phone'),
      email: record.get('Email'),
      officeLocation: record.get('Office_Location'),
      policyAreas: parseArray(record.get('Policy_Areas')),
      website: record.get('Website'),
      officialLink: record.get('Official_Link'),
      bioguideId: record.get('Bioguide_ID'),
      validFromDate: record.get('Valid_From_Date'),
      validToDate: record.get('Valid_To_Date'),
      dataSource: record.get('Data_Source'),
      lastUpdated: record.get('Last_Updated')
    }));
    
    // Group staff by role type for better organization
    const groupedStaff = groupStaffByRole(staff);
    
    return new Response(JSON.stringify({
      success: true,
      staff: staff,
      grouped: groupedStaff,
      count: staff.length,
      filters: {
        officialId,
        bioguideId,
        office
      }
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=1800' // Cache for 30 minutes
      }
    });
    
  } catch (error) {
    console.error('Error fetching staff:', error);
    
    // Return fallback data for development
    const fallbackData = getFallbackStaff(officialId, bioguideId);
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to fetch staff data',
      staff: fallbackData,
      fallback: true
    }), {
      status: 200,
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
    
    // Create new staff record
    const record = await base(env.AIRTABLE_STAFF_TABLE).create({
      'Staff_ID': data.staffId || generateStaffId(),
      'First_Name': data.firstName,
      'Last_Name': data.lastName,
      'Full_Name': data.fullName,
      'Job_Title': data.jobTitle,
      'Phone': data.phone,
      'Email': data.email,
      'Office_Location': data.officeLocation,
      'Policy_Areas': Array.isArray(data.policyAreas) ? data.policyAreas.join(', ') : data.policyAreas,
      'Official_Link': data.officialLink,
      'Bioguide_ID': data.bioguideId,
      'Data_Source': 'Manual Entry',
      'Last_Updated': new Date().toISOString().split('T')[0]
    });
    
    return new Response(JSON.stringify({
      success: true,
      staff: {
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
    console.error('Error creating staff:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to create staff member'
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
function parseArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return value.split(',').map(item => item.trim()).filter(item => item.length > 0);
}

function groupStaffByRole(staff) {
  const groups = {
    leadership: [],
    communications: [],
    policy: [],
    operations: [],
    other: []
  };
  
  staff.forEach(member => {
    const title = (member.jobTitle || '').toLowerCase();
    
    if (title.includes('chief') || title.includes('director') || title.includes('deputy')) {
      groups.leadership.push(member);
    } else if (title.includes('communication') || title.includes('press') || title.includes('media')) {
      groups.communications.push(member);
    } else if (title.includes('policy') || title.includes('legislative') || title.includes('advisor')) {
      groups.policy.push(member);
    } else if (title.includes('admin') || title.includes('scheduler') || title.includes('assistant')) {
      groups.operations.push(member);
    } else {
      groups.other.push(member);
    }
  });
  
  return groups;
}

function generateStaffId() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5);
  return `STF_${timestamp}_${random}`.toUpperCase();
}

function getFallbackStaff(officialId, bioguideId) {
  // Fallback data for development/demo
  return [
    {
      id: "demo_staff_1",
      staffId: "STF_DEMO_001",
      firstName: "Sarah",
      lastName: "Johnson",
      fullName: "Sarah Johnson",
      jobTitle: "Chief of Staff",
      phone: "(202) 225-0001",
      email: "sarah.johnson@mail.house.gov",
      officeLocation: "Washington, DC",
      policyAreas: ["Administration", "Strategy", "Operations"],
      website: null,
      officialLink: officialId || "demo_1",
      bioguideId: bioguideId || "A000370",
      validFromDate: "2023-01-01",
      validToDate: null,
      dataSource: "Demo Data",
      lastUpdated: "2025-07-08"
    },
    {
      id: "demo_staff_2", 
      staffId: "STF_DEMO_002",
      firstName: "Michael",
      lastName: "Chen",
      fullName: "Michael Chen",
      jobTitle: "Communications Director",
      phone: "(202) 225-0002",
      email: "michael.chen@mail.house.gov",
      officeLocation: "Washington, DC",
      policyAreas: ["Media Relations", "Public Affairs", "Social Media"],
      website: null,
      officialLink: officialId || "demo_1",
      bioguideId: bioguideId || "A000370",
      validFromDate: "2023-01-01",
      validToDate: null,
      dataSource: "Demo Data",
      lastUpdated: "2025-07-08"
    },
    {
      id: "demo_staff_3",
      staffId: "STF_DEMO_003", 
      firstName: "Emily",
      lastName: "Rodriguez",
      fullName: "Emily Rodriguez",
      jobTitle: "Legislative Assistant",
      phone: "(202) 225-0003",
      email: "emily.rodriguez@mail.house.gov",
      officeLocation: "Washington, DC",
      policyAreas: ["Healthcare", "Education", "Immigration"],
      website: null,
      officialLink: officialId || "demo_1",
      bioguideId: bioguideId || "A000370",
      validFromDate: "2023-06-01",
      validToDate: null,
      dataSource: "Demo Data",
      lastUpdated: "2025-07-08"
    },
    {
      id: "demo_staff_4",
      staffId: "STF_DEMO_004",
      firstName: "David",
      lastName: "Thompson",
      fullName: "David Thompson",
      jobTitle: "District Director",
      phone: "(704) 344-9500",
      email: "david.thompson@mail.house.gov", 
      officeLocation: "Charlotte, NC",
      policyAreas: ["Constituent Services", "Community Outreach", "Local Issues"],
      website: null,
      officialLink: officialId || "demo_1",
      bioguideId: bioguideId || "A000370",
      validFromDate: "2022-01-01",
      validToDate: null,
      dataSource: "Demo Data",
      lastUpdated: "2025-07-08"
    }
  ];
}