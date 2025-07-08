/**
 * Data Import Script for RateMyRep
 * Imports CSV data into Airtable base
 */

const fs = require('fs');
const csv = require('csv-parser');
const Airtable = require('airtable');

// Configuration - UPDATE THESE VALUES
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY || 'your_airtable_api_key_here';
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID || 'your_base_id_here';

// File paths - Update these to match your CSV file locations
const OFFICIALS_CSV = '../political-swipe/data/csv/political_swipe_officials.csv';
const STAFF_CSV = '../political-swipe/data/csv/political_swipe_staff.csv';

async function importOfficials() {
  console.log('🏛️ Importing officials data...');
  
  const base = new Airtable({ apiKey: AIRTABLE_API_KEY }).base(AIRTABLE_BASE_ID);
  const officials = [];
  
  return new Promise((resolve, reject) => {
    fs.createReadStream(OFFICIALS_CSV)
      .pipe(csv())
      .on('data', (row) => {
        // Transform CSV row to Airtable format
        const official = {
          'Official_ID': row.Official_ID,
          'Bioguide_ID': row.Bioguide_ID || '',
          'First_Name': row.First_Name || '',
          'Last_Name': row.Last_Name || '',
          'Middle_Name': row.Middle_Name || '',
          'Full_Name': row.Full_Name || '',
          'Party': row.Party || 'Independent',
          'Office_Level': row.Office_Level || 'Federal',
          'Office_Type': row.Office_Type || '',
          'Chamber': row.Chamber || '',
          'State': row.State || '',
          'District': row.District || '',
          'Birth_Year': row.Birth_Year ? parseInt(row.Birth_Year) : null,
          'Term_Start_Date': row.Term_Start_Date || '',
          'Primary_Email': row.Primary_Email || '',
          'Official_Website': row.Official_Website || '',
          'Official_Photo_URL': row.Official_Photo_URL || '',
          'Is_Current': row.Is_Current === 'True' || row.Is_Current === 'true',
          'Data_Source': row.Data_Source || 'CSV Import',
          'Last_Updated': row.Last_Updated || new Date().toISOString().split('T')[0]
        };
        
        officials.push(official);
      })
      .on('end', async () => {
        console.log(`📊 Found ${officials.length} officials to import`);
        
        try {
          // Import in batches of 10 (Airtable limit)
          const batchSize = 10;
          let imported = 0;
          
          for (let i = 0; i < officials.length; i += batchSize) {
            const batch = officials.slice(i, i + batchSize);
            
            await base('Officials').create(batch);
            imported += batch.length;
            
            console.log(`✅ Imported ${imported}/${officials.length} officials`);
            
            // Add delay to avoid rate limiting
            if (i + batchSize < officials.length) {
              await new Promise(resolve => setTimeout(resolve, 200));
            }
          }
          
          console.log(`🎉 Successfully imported ${imported} officials!`);
          resolve(imported);
        } catch (error) {
          console.error('❌ Error importing officials:', error);
          reject(error);
        }
      })
      .on('error', reject);
  });
}

async function importStaff() {
  console.log('👥 Importing staff data...');
  
  const base = new Airtable({ apiKey: AIRTABLE_API_KEY }).base(AIRTABLE_BASE_ID);
  const staff = [];
  
  return new Promise((resolve, reject) => {
    fs.createReadStream(STAFF_CSV)
      .pipe(csv())
      .on('data', (row) => {
        // Transform CSV row to Airtable format
        const staffMember = {
          'Staff_ID': row.Staff_ID,
          'First_Name': row.First_Name || '',
          'Last_Name': row.Last_Name || '',
          'Full_Name': row.Full_Name || '',
          'Job_Title': row.Job_Title || '',
          'Phone': row.Phone || '',
          'Email': row.Email || '',
          'Office_Location': row.Office_Location || '',
          'Policy_Areas': row.Policy_Areas || '',
          'Website': row.Website || '',
          'Valid_From_Date': row.Valid_From_Date || '',
          'Valid_To_Date': row.Valid_To_Date || '',
          'Data_Source': row.Data_Source || 'CSV Import',
          'Last_Updated': row.Last_Updated || new Date().toISOString().split('T')[0]
        };
        
        staff.push(staffMember);
      })
      .on('end', async () => {
        console.log(`📊 Found ${staff.length} staff members to import`);
        
        try {
          // Import in batches of 10 (Airtable limit)
          const batchSize = 10;
          let imported = 0;
          
          for (let i = 0; i < staff.length; i += batchSize) {
            const batch = staff.slice(i, i + batchSize);
            
            await base('Staff').create(batch);
            imported += batch.length;
            
            console.log(`✅ Imported ${imported}/${staff.length} staff members`);
            
            // Add delay to avoid rate limiting
            if (i + batchSize < staff.length) {
              await new Promise(resolve => setTimeout(resolve, 200));
            }
          }
          
          console.log(`🎉 Successfully imported ${imported} staff members!`);
          resolve(imported);
        } catch (error) {
          console.error('❌ Error importing staff:', error);
          reject(error);
        }
      })
      .on('error', reject);
  });
}

async function linkStaffToOfficials() {
  console.log('🔗 Linking staff to officials...');
  
  const base = new Airtable({ apiKey: AIRTABLE_API_KEY }).base(AIRTABLE_BASE_ID);
  
  try {
    // This is a placeholder - you would need to implement the linking logic
    // based on your specific data structure and relationships
    console.log('⚠️ Staff-to-official linking not implemented yet');
    console.log('💡 You can do this manually in Airtable or extend this script');
    
  } catch (error) {
    console.error('❌ Error linking staff to officials:', error);
  }
}

async function validateImport() {
  console.log('🔍 Validating import...');
  
  const base = new Airtable({ apiKey: AIRTABLE_API_KEY }).base(AIRTABLE_BASE_ID);
  
  try {
    // Count officials
    const officialsCount = await base('Officials').select({
      fields: ['Official_ID']
    }).all();
    
    // Count staff
    const staffCount = await base('Staff').select({
      fields: ['Staff_ID']
    }).all();
    
    console.log(`📊 IMPORT SUMMARY:`);
    console.log(`   Officials: ${officialsCount.length}`);
    console.log(`   Staff: ${staffCount.length}`);
    console.log(`   Total records: ${officialsCount.length + staffCount.length}`);
    
    // Sample a few records
    console.log(`\\n📋 SAMPLE OFFICIALS:`);
    officialsCount.slice(0, 3).forEach((record, index) => {
      console.log(`   ${index + 1}. ${record.get('Full_Name')} (${record.get('Party')}-${record.get('State')})`);
    });
    
    console.log(`\\n📋 SAMPLE STAFF:`);
    staffCount.slice(0, 3).forEach((record, index) => {
      console.log(`   ${index + 1}. ${record.get('Full_Name')} - ${record.get('Job_Title')}`);
    });
    
  } catch (error) {
    console.error('❌ Error validating import:', error);
  }
}

async function main() {
  console.log('🚀 Starting RateMyRep data import...');
  console.log(`📅 ${new Date().toISOString()}`);
  
  if (AIRTABLE_API_KEY === 'your_airtable_api_key_here') {
    console.error('❌ Please set your AIRTABLE_API_KEY in the script or environment variables');
    process.exit(1);
  }
  
  if (AIRTABLE_BASE_ID === 'your_base_id_here') {
    console.error('❌ Please set your AIRTABLE_BASE_ID in the script or environment variables');
    process.exit(1);
  }
  
  try {
    // Import data
    await importOfficials();
    await importStaff();
    
    // Link relationships
    await linkStaffToOfficials();
    
    // Validate
    await validateImport();
    
    console.log('\\n🎉 Data import completed successfully!');
    console.log('\\n💡 Next steps:');
    console.log('   1. Review the data in your Airtable base');
    console.log('   2. Set up any missing field relationships');
    console.log('   3. Update your Cloudflare environment variables');
    console.log('   4. Deploy your RateMyRep app');
    
  } catch (error) {
    console.error('❌ Import failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  importOfficials,
  importStaff,
  linkStaffToOfficials,
  validateImport
};