import React, { useState, useRef, useEffect } from 'react';
import { Heart, X, Phone, Mail, Share2, MapPin, User, Users, Star, Zap, Globe, Twitter, Instagram, ThumbsUp, ThumbsDown } from 'lucide-react';

const RateMyRep = () => {
  const [representatives, setRepresentatives] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentRepIndex, setCurrentRepIndex] = useState(0);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [activeModal, setActiveModal] = useState(null);
  const [lastVote, setLastVote] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [userLocation, setUserLocation] = useState(null);
  
  const [userStats, setUserStats] = useState({
    ratedCount: 0,
    approvalRating: 0,
    topIssues: [],
    shareCount: 0
  });

  // Load representatives data from Cloudflare Functions
  useEffect(() => {
    loadRepresentativesData();
    getUserLocation();
  }, []);

  const loadRepresentativesData = async () => {
    try {
      setIsLoading(true);
      
      // Get user's location first
      const locationResponse = await fetch('/api/location');
      const locationData = await locationResponse.json();
      
      // Fetch representatives based on location
      const repsResponse = await fetch(`/api/officials?lat=${locationData.lat}&lng=${locationData.lng}`);
      const repsData = await repsResponse.json();
      
      setRepresentatives(repsData.representatives || []);
      setUserLocation(locationData);
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading representatives:', error);
      // Fallback to sample data for development
      setRepresentatives(getSampleData());
      setIsLoading(false);
    }
  };

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.log('Location access denied, using default');
          // Default to DC area
          setUserLocation({ lat: 38.9072, lng: -77.0369 });
        }
      );
    }
  };

  const getSampleData = () => [
    {
      id: 1,
      name: "Alma Adams",
      party: "Democratic",
      state: "NC",
      district: "12th District",
      bioguideId: "A000370",
      images: [
        "https://bioguide.congress.gov/bioguide/photo/A/A000370.jpg",
        "https://via.placeholder.com/400x600/3B82F6/FFFFFF?text=Committee+Work",
        "https://via.placeholder.com/400x600/6366F1/FFFFFF?text=Town+Hall"
      ],
      bio: "Democratic Representative from North Carolina's 12th district. Focused on education, healthcare, and economic opportunity.",
      phone: "(202) 225-1510",
      email: "alma.adams@mail.house.gov",
      website: "https://adams.house.gov/",
      chamber: "House",
      rating: 4.2,
      totalRatings: 1847,
      keyIssues: ["Education", "Healthcare", "Economic Justice"],
      recentVotes: [
        { bill: "Infrastructure Investment Act", vote: "Yes", date: "2023-11-15" },
        { bill: "Climate Action Bill", vote: "Yes", date: "2023-10-28" }
      ],
      socialMedia: {
        twitter: "@RepAdams",
        instagram: "@repadams",
        facebook: "RepAdams"
      }
    }
  ];

  const currentRep = representatives[currentRepIndex];
  const cardRef = useRef(null);

  const handleVote = async (rating, direction) => {
    if (isAnimating || !currentRep) return;

    setIsAnimating(true);
    setLastVote({ rating, direction, rep: currentRep });

    // Send rating to API
    try {
      await fetch('/api/rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          officialId: currentRep.bioguideId,
          rating: rating,
          direction: direction,
          location: userLocation
        })
      });
    } catch (error) {
      console.error('Error submitting rating:', error);
    }

    // Update local stats
    setUserStats(prev => ({
      ...prev,
      ratedCount: prev.ratedCount + 1,
      approvalRating: calculateNewApproval(prev, rating)
    }));

    // Animate card exit
    if (cardRef.current) {
      cardRef.current.style.transform = `translateX(${direction === 'like' ? '100%' : '-100%'}) rotate(${direction === 'like' ? '15deg' : '-15deg'})`;
      cardRef.current.style.opacity = '0';
    }

    setTimeout(() => {
      nextRepresentative();
      setIsAnimating(false);
    }, 300);
  };

  const calculateNewApproval = (prevStats, newRating) => {
    const totalRatings = prevStats.ratedCount + 1;
    const currentTotal = prevStats.approvalRating * prevStats.ratedCount;
    return Math.round((currentTotal + newRating) / totalRatings);
  };

  const nextRepresentative = () => {
    setCurrentRepIndex((prev) => (prev + 1) % representatives.length);
    setCurrentPhotoIndex(0);
    if (cardRef.current) {
      cardRef.current.style.transform = 'translateX(0) rotate(0)';
      cardRef.current.style.opacity = '1';
    }
  };

  const shareRepresentative = async (rep) => {
    const shareData = {
      title: `Rate ${rep.name} on RateMyRep`,
      text: `I just rated ${rep.name} (${rep.party}-${rep.state}) on RateMyRep! Check out their profile and rate your representatives too.`,
      url: `${window.location.origin}/rep/${rep.bioguideId}`
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
        alert('Link copied to clipboard!');
      }
      
      setUserStats(prev => ({ ...prev, shareCount: prev.shareCount + 1 }));
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const openContactModal = (rep, type) => {
    setActiveModal({ type, rep });
  };

  // Drag handlers
  const handleMouseDown = (e) => {
    if (isAnimating) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e) => {
    if (!isDragging || isAnimating) return;
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;
    setDragOffset({ x: deltaX, y: deltaY });
    
    if (cardRef.current) {
      const rotation = deltaX * 0.1;
      cardRef.current.style.transform = `translateX(${deltaX}px) translateY(${deltaY}px) rotate(${rotation}deg)`;
      
      // Visual feedback
      const opacity = Math.max(0, 1 - Math.abs(deltaX) / 200);
      if (deltaX > 50) {
        cardRef.current.style.boxShadow = '0 0 20px rgba(34, 197, 94, 0.6)';
      } else if (deltaX < -50) {
        cardRef.current.style.boxShadow = '0 0 20px rgba(239, 68, 68, 0.6)';
      } else {
        cardRef.current.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.2)';
      }
    }
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    
    setIsDragging(false);
    const threshold = 100;
    
    if (Math.abs(dragOffset.x) > threshold) {
      const rating = dragOffset.x > 0 ? 80 : 20; // Positive rating for right swipe
      handleVote(rating, dragOffset.x > 0 ? 'like' : 'dislike');
    } else {
      // Snap back
      if (cardRef.current) {
        cardRef.current.style.transform = 'translateX(0) translateY(0) rotate(0)';
        cardRef.current.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.2)';
      }
    }
    
    setDragOffset({ x: 0, y: 0 });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-700 to-indigo-800 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-lg">Loading your representatives...</p>
        </div>
      </div>
    );
  }

  if (!currentRep) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-700 to-indigo-800 flex items-center justify-center">
        <div className="text-white text-center max-w-md mx-auto p-6">
          <Star className="h-16 w-16 mx-auto mb-4 text-yellow-400" />
          <h2 className="text-2xl font-bold mb-4">Great job!</h2>
          <p className="text-lg mb-6">You've rated all your representatives. Check back for updates or explore other districts.</p>
          <button 
            onClick={() => setCurrentRepIndex(0)}
            className="bg-white text-purple-700 px-6 py-3 rounded-full font-semibold hover:bg-gray-100 transition-colors"
          >
            Rate Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-700 to-indigo-800 relative overflow-hidden">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4">
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center space-x-2">
            <Star className="h-6 w-6 text-yellow-400" />
            <span className="font-bold text-lg">RateMyRep</span>
          </div>
          <div className="text-sm">
            <span>{userStats.ratedCount} rated</span>
            {userLocation && (
              <span className="ml-2 opacity-75">📍 {userLocation.city || 'Your Area'}</span>
            )}
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="absolute top-16 left-4 right-4 z-10">
        <div className="bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 flex items-center justify-between text-white text-sm">
          <div className="flex items-center space-x-4">
            <span>👍 {userStats.approvalRating}% avg</span>
            <span>📊 {userStats.ratedCount} total</span>
            <span>📤 {userStats.shareCount} shared</span>
          </div>
        </div>
      </div>

      {/* Main Card */}
      <div className="flex items-center justify-center min-h-screen p-4 pt-32">
        <div className="relative w-full max-w-sm">
          {/* Card */}
          <div
            ref={cardRef}
            className="bg-white rounded-3xl shadow-2xl overflow-hidden cursor-grab active:cursor-grabbing transform transition-transform duration-300"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{ 
              transform: `translateX(${dragOffset.x}px) translateY(${dragOffset.y}px) rotate(${dragOffset.x * 0.1}deg)`,
              transition: isDragging ? 'none' : 'transform 0.3s ease-out'
            }}
          >
            {/* Photo */}
            <div className="relative h-96 bg-gray-200 overflow-hidden">
              <img
                src={currentRep.images?.[currentPhotoIndex] || currentRep.images?.[0]}
                alt={currentRep.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Fallback to placeholder if bioguide image fails
                  e.target.src = `https://via.placeholder.com/400x600/4F46E5/FFFFFF?text=${encodeURIComponent(currentRep.name)}`;
                }}
              />
              
              {/* Photo indicators */}
              {currentRep.images?.length > 1 && (
                <div className="absolute top-4 left-4 right-4 flex space-x-1">
                  {currentRep.images.map((_, index) => (
                    <div
                      key={index}
                      className={`h-1 flex-1 rounded-full ${
                        index === currentPhotoIndex ? 'bg-white' : 'bg-white/50'
                      }`}
                    />
                  ))}
                </div>
              )}

              {/* Party badge */}
              <div className="absolute top-4 right-4">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  currentRep.party === 'Democratic' 
                    ? 'bg-blue-500 text-white' 
                    : currentRep.party === 'Republican'
                    ? 'bg-red-500 text-white'
                    : 'bg-gray-500 text-white'
                }`}>
                  {currentRep.party?.substring(0, 3).toUpperCase()}
                </span>
              </div>

              {/* Rating badge */}
              {currentRep.rating && (
                <div className="absolute bottom-4 left-4">
                  <div className="bg-black/70 text-white px-2 py-1 rounded-full text-sm flex items-center">
                    <Star className="h-3 w-3 mr-1 text-yellow-400" />
                    {currentRep.rating} ({currentRep.totalRatings})
                  </div>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-2xl font-bold text-gray-900">{currentRep.name}</h3>
                <MapPin className="h-5 w-5 text-gray-500" />
              </div>
              
              <p className="text-gray-600 mb-1">
                {currentRep.chamber} • {currentRep.state} {currentRep.district}
              </p>
              
              <p className="text-gray-700 text-sm mb-4 line-clamp-3">
                {currentRep.bio}
              </p>

              {/* Key Issues */}
              {currentRep.keyIssues && (
                <div className="mb-4">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Key Issues:</p>
                  <div className="flex flex-wrap gap-2">
                    {currentRep.keyIssues.slice(0, 3).map((issue, index) => (
                      <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                        {issue}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => openContactModal(currentRep, 'phone')}
                  className="p-3 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
                >
                  <Phone className="h-5 w-5 text-gray-600" />
                </button>
                
                <button
                  onClick={() => openContactModal(currentRep, 'email')}
                  className="p-3 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
                >
                  <Mail className="h-5 w-5 text-gray-600" />
                </button>
                
                <button
                  onClick={() => shareRepresentative(currentRep)}
                  className="p-3 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
                >
                  <Share2 className="h-5 w-5 text-gray-600" />
                </button>
                
                {currentRep.website && (
                  <button
                    onClick={() => window.open(currentRep.website, '_blank')}
                    className="p-3 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
                  >
                    <Globe className="h-5 w-5 text-gray-600" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-center mt-8 space-x-8">
            <button
              onClick={() => handleVote(20, 'dislike')}
              className="p-4 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transform hover:scale-110 transition-all duration-200"
              disabled={isAnimating}
            >
              <ThumbsDown className="h-6 w-6" />
            </button>
            
            <button
              onClick={() => handleVote(50, 'neutral')}
              className="p-3 bg-gray-500 text-white rounded-full shadow-lg hover:bg-gray-600 transform hover:scale-110 transition-all duration-200"
              disabled={isAnimating}
            >
              <X className="h-5 w-5" />
            </button>
            
            <button
              onClick={() => handleVote(80, 'like')}
              className="p-4 bg-green-500 text-white rounded-full shadow-lg hover:bg-green-600 transform hover:scale-110 transition-all duration-200"
              disabled={isAnimating}
            >
              <ThumbsUp className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Contact Modal */}
      {activeModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <div className="text-center">
              <h3 className="text-lg font-bold mb-4">
                Contact {activeModal.rep.name}
              </h3>
              
              {activeModal.type === 'phone' && (
                <div>
                  <Phone className="h-8 w-8 mx-auto mb-3 text-blue-500" />
                  <p className="text-gray-600 mb-4">
                    Ready to call your representative?
                  </p>
                  <a
                    href={`tel:${activeModal.rep.phone}`}
                    className="block w-full bg-blue-500 text-white py-3 rounded-full font-semibold hover:bg-blue-600 transition-colors"
                  >
                    Call {activeModal.rep.phone}
                  </a>
                </div>
              )}
              
              {activeModal.type === 'email' && (
                <div>
                  <Mail className="h-8 w-8 mx-auto mb-3 text-green-500" />
                  <p className="text-gray-600 mb-4">
                    Send an email to your representative
                  </p>
                  <a
                    href={`mailto:${activeModal.rep.email}`}
                    className="block w-full bg-green-500 text-white py-3 rounded-full font-semibold hover:bg-green-600 transition-colors"
                  >
                    Email {activeModal.rep.email}
                  </a>
                </div>
              )}
              
              <button
                onClick={() => setActiveModal(null)}
                className="mt-4 text-gray-500 hover:text-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vote feedback */}
      {lastVote && (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-white px-6 py-3 rounded-full shadow-lg z-50">
          <p className="text-gray-800 font-semibold">
            Rated {lastVote.rep.name} 
            <span className={`ml-2 ${
              lastVote.direction === 'like' ? 'text-green-600' : 
              lastVote.direction === 'dislike' ? 'text-red-600' : 'text-gray-600'
            }`}>
              {lastVote.rating}%
            </span>
          </p>
        </div>
      )}
    </div>
  );
};

export default RateMyRep;