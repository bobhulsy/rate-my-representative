/**
 * Airtable Setup Script for RateMyRep
 * Run this script to create the necessary Airtable base structure
 */

const Airtable = require('airtable');

// Configuration - UPDATE THESE VALUES
const AIRTABLE_API_KEY = 'your_airtable_api_key_here';
const AIRTABLE_BASE_ID = 'your_base_id_here';

async function setupAirtableBase() {
  console.log('Setting up Airtable base for RateMyRep...');
  
  try {
    const base = new Airtable({ apiKey: AIRTABLE_API_KEY }).base(AIRTABLE_BASE_ID);
    
    // Test connection
    console.log('Testing Airtable connection...');
    
    // The tables should be created manually in Airtable UI with these structures:
    
    console.log(`
    📋 AIRTABLE SETUP INSTRUCTIONS
    ==============================
    
    Create these tables in your Airtable base:
    
    1. 📊 OFFICIALS TABLE
    ----------------------
    Table Name: Officials
    
    Fields:
    - Official_ID (Single line text) - Primary field
    - Bioguide_ID (Single line text)
    - First_Name (Single line text)
    - Last_Name (Single line text)
    - Middle_Name (Single line text)
    - Full_Name (Single line text)
    - Party (Single select: Democratic, Republican, Independent, Other)
    - Office_Level (Single select: Federal, State, Local)
    - Office_Type (Single line text)
    - Chamber (Single select: House, Senate, State House, State Senate, Other)
    - State (Single select: AL, AK, AZ, AR, CA, CO, CT, DE, FL, GA, HI, ID, IL, IN, IA, KS, KY, LA, ME, MD, MA, MI, MN, MS, MO, MT, NE, NV, NH, NJ, NM, NY, NC, ND, OH, OK, OR, PA, RI, SC, SD, TN, TX, UT, VT, VA, WA, WV, WI, WY, DC)
    - District (Single line text)
    - Birth_Year (Number)
    - Term_Start_Date (Date)
    - Primary_Email (Email)
    - Primary_Phone (Phone number)
    - Official_Website (URL)
    - Official_Photo_URL (URL)
    - Twitter_Handle (Single line text)
    - Instagram_Handle (Single line text)
    - Facebook_Handle (Single line text)
    - Key_Issues (Long text)
    - Average_Rating (Number - decimal)
    - Total_Ratings (Number)
    - Last_Rating_Date (Date)
    - Is_Current (Checkbox)
    - Data_Source (Single line text)
    - Last_Updated (Date)
    
    2. 👥 STAFF TABLE
    -----------------
    Table Name: Staff
    
    Fields:
    - Staff_ID (Single line text) - Primary field
    - First_Name (Single line text)
    - Last_Name (Single line text)
    - Full_Name (Single line text)
    - Job_Title (Single line text)
    - Phone (Phone number)
    - Email (Email)
    - Office_Location (Single line text)
    - Policy_Areas (Long text)
    - Website (URL)
    - Official_Link (Link to another record - Officials table)
    - Bioguide_ID (Single line text)
    - Valid_From_Date (Date)
    - Valid_To_Date (Date)
    - Data_Source (Single line text)
    - Last_Updated (Date)
    
    3. ⭐ RATINGS TABLE
    -------------------
    Table Name: Ratings
    
    Fields:
    - Rating_ID (Autonumber) - Primary field
    - Official_ID (Single line text)
    - Bioguide_ID (Single line text)
    - Rating (Number - 0 to 100)
    - Direction (Single select: like, dislike, neutral)
    - Comment (Long text)
    - Location_Lat (Number - decimal)
    - Location_Lng (Number - decimal)
    - Client_IP (Single line text)
    - User_Agent (Long text)
    - Timestamp (Date & time)
    - Date_Created (Date)
    
    4. 📊 ANALYTICS TABLE (Optional)
    --------------------------------
    Table Name: Analytics
    
    Fields:
    - Event_ID (Autonumber) - Primary field
    - Event_Type (Single select: view, rate, share, contact)
    - Official_ID (Single line text)
    - Bioguide_ID (Single line text)
    - User_Location (Single line text)
    - Referrer (URL)
    - User_Agent (Long text)
    - Timestamp (Date & time)
    - Date_Created (Date)
    
    💡 NEXT STEPS:
    ==============
    1. Create the base structure above in Airtable
    2. Update your wrangler.toml with your API key and base ID
    3. Import your CSV data using the import script
    4. Deploy to Cloudflare Pages
    
    🔐 ENVIRONMENT VARIABLES:
    =========================
    Set these in your Cloudflare Pages environment:
    - AIRTABLE_API_KEY=your_api_key
    - AIRTABLE_BASE_ID=your_base_id
    - AIRTABLE_OFFICIALS_TABLE=Officials
    - AIRTABLE_STAFF_TABLE=Staff
    - AIRTABLE_RATINGS_TABLE=Ratings
    `);
    
  } catch (error) {
    console.error('Error setting up Airtable:', error);
  }
}

if (require.main === module) {
  setupAirtableBase();
}

module.exports = { setupAirtableBase };