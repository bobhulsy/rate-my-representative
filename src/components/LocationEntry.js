import React, { useState, useEffect } from 'react';
import { MapPin, Search, Loader, Star } from 'lucide-react';

const LocationEntry = ({ onLocationSet }) => {
  const [zipCode, setZipCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isAutoDetecting, setIsAutoDetecting] = useState(false);

  // Check for saved location on mount
  useEffect(() => {
    const savedZip = localStorage.getItem('ratemyrep_zipcode');
    if (savedZip && /^\d{5}$/.test(savedZip)) {
      setZipCode(savedZip);
    }
  }, []);

  const validateZipCode = (zip) => {
    return /^\d{5}$/.test(zip);
  };

  const handleZipSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateZipCode(zipCode)) {
      setError('Please enter a valid 5-digit ZIP code');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Save to localStorage
      localStorage.setItem('ratemyrep_zipcode', zipCode);
      
      // Pass the zip code to parent component
      onLocationSet({ type: 'zip', value: zipCode });
      
    } catch (err) {
      console.error('Error setting location:', err);
      setError('Unable to set location. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAutoDetect = async () => {
    setIsAutoDetecting(true);
    setError('');

    try {
      // Try geolocation first
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            try {
              const { latitude, longitude } = position.coords;
              
              // Call our location API to get zip code from coordinates
              const response = await fetch(`/api/location?lat=${latitude}&lng=${longitude}`);
              const locationData = await response.json();
              
              if (locationData.success && locationData.stateCode) {
                // Use coordinates for more precise location
                localStorage.setItem('ratemyrep_location', JSON.stringify({
                  lat: latitude,
                  lng: longitude,
                  city: locationData.city,
                  state: locationData.state
                }));
                
                onLocationSet({ 
                  type: 'coordinates', 
                  value: { 
                    lat: latitude, 
                    lng: longitude,
                    city: locationData.city,
                    state: locationData.state,
                    stateCode: locationData.stateCode
                  }
                });
              } else {
                throw new Error('Unable to determine location');
              }
            } catch (err) {
              console.error('Error with location API:', err);
              fallbackToIP();
            } finally {
              setIsAutoDetecting(false);
            }
          },
          () => {
            // Geolocation denied, fall back to IP detection
            fallbackToIP();
          }
        );
      } else {
        // No geolocation support, fall back to IP detection
        fallbackToIP();
      }
    } catch (err) {
      console.error('Error with auto-detection:', err);
      setError('Unable to detect location automatically. Please enter your ZIP code.');
      setIsAutoDetecting(false);
    }
  };

  const fallbackToIP = async () => {
    try {
      // Use IP-based location detection
      const response = await fetch('/api/location');
      const locationData = await response.json();
      
      if (locationData.success) {
        localStorage.setItem('ratemyrep_location', JSON.stringify(locationData));
        
        onLocationSet({ 
          type: 'ip', 
          value: {
            city: locationData.city,
            state: locationData.state,
            stateCode: locationData.stateCode
          }
        });
      } else {
        throw new Error('IP detection failed');
      }
    } catch (err) {
      console.error('Error with IP detection:', err);
      setError('Unable to detect location automatically. Please enter your ZIP code.');
    } finally {
      setIsAutoDetecting(false);
    }
  };

  const handleZipChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 5);
    setZipCode(value);
    if (error) setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-700 to-indigo-800 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Star className="h-12 w-12 text-yellow-400 mr-2" />
            <h1 className="text-4xl font-bold text-white">RateMyRep</h1>
          </div>
          <p className="text-white/80 text-lg">
            Rate and review your elected officials
          </p>
        </div>

        {/* Location Entry Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <div className="text-center mb-6">
            <MapPin className="h-16 w-16 text-blue-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Find Your Representatives
            </h2>
            <p className="text-gray-600">
              Enter your ZIP code to see your elected officials
            </p>
          </div>

          {/* ZIP Code Form */}
          <form onSubmit={handleZipSubmit} className="space-y-4">
            <div>
              <label htmlFor="zipcode" className="block text-sm font-medium text-gray-700 mb-2">
                ZIP Code
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="zipcode"
                  value={zipCode}
                  onChange={handleZipChange}
                  placeholder="12345"
                  className={`w-full px-4 py-3 text-lg text-center border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                    error 
                      ? 'border-red-500 bg-red-50' 
                      : 'border-gray-300 focus:border-blue-500'
                  }`}
                  maxLength="5"
                  autoComplete="postal-code"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
              </div>
              {error && (
                <p className="mt-2 text-sm text-red-600">{error}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading || !zipCode}
              className={`w-full py-3 px-6 rounded-xl font-semibold text-white transition-all duration-200 ${
                isLoading || !zipCode
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 transform hover:scale-105 shadow-lg hover:shadow-xl'
              }`}
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <Loader className="animate-spin h-5 w-5 mr-2" />
                  Finding Representatives...
                </div>
              ) : (
                'Find My Representatives'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">or</span>
            </div>
          </div>

          {/* Auto-detect Button */}
          <button
            onClick={handleAutoDetect}
            disabled={isAutoDetecting}
            className={`w-full py-3 px-6 rounded-xl font-semibold border-2 transition-all duration-200 ${
              isAutoDetecting
                ? 'border-gray-300 bg-gray-100 text-gray-500 cursor-not-allowed'
                : 'border-blue-600 text-blue-600 hover:bg-blue-50 transform hover:scale-105'
            }`}
          >
            {isAutoDetecting ? (
              <div className="flex items-center justify-center">
                <Loader className="animate-spin h-5 w-5 mr-2" />
                Detecting Location...
              </div>
            ) : (
              <div className="flex items-center justify-center">
                <MapPin className="h-5 w-5 mr-2" />
                Auto-Detect My Location
              </div>
            )}
          </button>

          {/* Example ZIP codes */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500 mb-2">Try these ZIP codes:</p>
            <div className="flex justify-center space-x-3">
              {['90210', '10001', '60601'].map((zip) => (
                <button
                  key={zip}
                  onClick={() => setZipCode(zip)}
                  className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  {zip}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-white/60 text-sm">
            Your location is only used to find your representatives
          </p>
        </div>
      </div>
    </div>
  );
};

export default LocationEntry;