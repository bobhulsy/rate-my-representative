// Mock API for local development
import { testOfficials } from '../test-data.js';

// Mock fetch for local development
const mockApi = {
  async fetchOfficials(params = {}) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const { state, zip, lat, lng, bioguideId } = params;
    
    // Filter test data based on parameters
    let filteredOfficials = [...testOfficials];
    
    if (bioguideId) {
      filteredOfficials = testOfficials.filter(official => official.bioguideId === bioguideId);
    } else if (zip) {
      const zipToState = {
        '27713': 'NC', // Durham, NC
        '35801': 'AL', // Huntsville, AL  
        '80301': 'CO', // Boulder, CO
        '73301': 'OK', // Oklahoma City, OK
        '48104': 'MI', // Ann Arbor, MI
      };
      
      if (zipToState[zip]) {
        const targetState = zipToState[zip];
        filteredOfficials = testOfficials.filter(official => official.state === targetState);
      }
    } else if (state) {
      filteredOfficials = testOfficials.filter(official => official.state === state.toUpperCase());
    }
    
    return {
      success: true,
      representatives: filteredOfficials,
      count: filteredOfficials.length,
      fallback: true,
      message: 'Using test data for local development'
    };
  },
  
  async submitRating(ratingData) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    console.log('Mock rating submission:', ratingData);
    
    return {
      success: true,
      message: 'Rating submitted (mock)',
      data: ratingData
    };
  },
  
  async detectLocation() {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Return mock location data
    return {
      success: true,
      city: 'Durham',
      state: 'North Carolina',
      stateCode: 'NC',
      message: 'Mock location detection'
    };
  }
};

export default mockApi;