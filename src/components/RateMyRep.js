import React, { useState, useRef, useEffect } from 'react';
import { Heart, X, Phone, Mail, Share, MapPin, User, Users, Star, Zap, Globe, Twitter, Instagram, ThumbsUp, ThumbsDown, Settings } from 'lucide-react';
import LocationEntry from './LocationEntry';
import mockApi from '../mockApi';

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
  const [swipeDirection, setSwipeDirection] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [showLocationEntry, setShowLocationEntry] = useState(true);
  const [locationDisplay, setLocationDisplay] = useState('');
  
  const [userStats, setUserStats] = useState({
    ratedCount: 0,
    approvalRating: 0,
    topIssues: [],
    shareCount: 0,
    callCount: 0,
    emailCount: 0,
    actionsCompleted: {
      called: false,
      emailed: false,
      rated: false,
      shared: false
    }
  });

  // Check for saved location on mount
  useEffect(() => {
    checkSavedLocation();
  }, []);

  const checkSavedLocation = () => {
    const savedZip = localStorage.getItem('ratemyrep_zipcode');
    const savedLocation = localStorage.getItem('ratemyrep_location');
    
    if (savedZip && /^\d{5}$/.test(savedZip)) {
      setLocationDisplay(`ZIP ${savedZip}`);
      setShowLocationEntry(false);
      loadRepresentativesData({ type: 'zip', value: savedZip });
    } else if (savedLocation) {
      try {
        const locationData = JSON.parse(savedLocation);
        setLocationDisplay(`${locationData.city}, ${locationData.state}`);
        setShowLocationEntry(false);
        loadRepresentativesData({ type: 'coordinates', value: locationData });
      } catch (e) {
        console.error('Error parsing saved location:', e);
        setShowLocationEntry(true);
      }
    }
  };

  const handleLocationSet = (location) => {
    if (location.type === 'zip') {
      setLocationDisplay(`ZIP ${location.value}`);
    } else if (location.type === 'coordinates' || location.type === 'ip') {
      setLocationDisplay(`${location.value.city}, ${location.value.state}`);
    }
    
    setShowLocationEntry(false);
    loadRepresentativesData(location);
  };

  const loadRepresentativesData = async (location) => {
    try {
      setIsLoading(true);
      
      // Use mock API for local development
      const params = {};
      
      if (location.type === 'zip') {
        params.zip = location.value;
      } else if (location.type === 'coordinates') {
        params.lat = location.value.lat;
        params.lng = location.value.lng;
      } else if (location.type === 'ip') {
        params.state = location.value.stateCode;
      }
      
      // Use mock API instead of real API calls
      const repsData = await mockApi.fetchOfficials(params);
      
      setRepresentatives(repsData.representatives || []);
      setUserLocation(location.value);
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading representatives:', error);
      // Fallback to sample data for development
      setRepresentatives(getSampleData());
      setIsLoading(false);
    }
  };

  const handleChangeLocation = () => {
    setShowLocationEntry(true);
    localStorage.removeItem('ratemyrep_zipcode');
    localStorage.removeItem('ratemyrep_location');
    setLocationDisplay('');
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

  // Show location entry if no location is set
  if (showLocationEntry) {
    return <LocationEntry onLocationSet={handleLocationSet} />;
  }

  const handleVote = async (rating, direction) => {
    if (isAnimating || !currentRep) return;

    setIsAnimating(true);
    setLastVote({ rating, direction, rep: currentRep });

    // Send rating to mock API
    try {
      await mockApi.submitRating({
        officialId: currentRep.bioguideId,
        rating: rating,
        direction: direction,
        location: userLocation
      });
    } catch (error) {
      console.error('Error submitting rating:', error);
    }

    // Update local stats
    setUserStats(prev => ({
      ...prev,
      ratedCount: prev.ratedCount + 1,
      approvalRating: calculateNewApproval(prev, rating),
      actionsCompleted: { ...prev.actionsCompleted, rated: true }
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

    // Auto-dismiss vote feedback after 3 seconds
    setTimeout(() => {
      setLastVote(null);
    }, 3000);
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

  const shareRepresentative = (rep) => {
    setActiveModal({ type: 'share', rep });
  };

  const handleActualShare = async (rep, platform = 'twitter') => {
    const scores = generateConservativeScore(rep);
    
    // Platform-specific messages
    const messages = {
      twitter: `🦏 RINO ALERT: ${rep.name} votes with Dems ${scores.rinoAlert}%! Check their record: ${window.location.origin}`,
      facebook: `I just rated ${rep.name} on RateMyRep. Their conservative score shocked me... See for yourself: ${window.location.origin}`,
      instagram: `Swipe to see ${rep.name}'s real voting record 👀 ${window.location.origin}`,
      email: `Subject: Check out ${rep.name}'s voting record\n\nI found ${rep.name}'s conservative alignment on RateMyRep. You should see this: ${window.location.origin}`
    };

    const shareText = messages[platform] || messages.twitter;
    
    // Generate share card image
    const imageDataUrl = generateShareCard(rep, platform);
    
    const shareData = {
      title: `${rep.name}'s Conservative Score - RateMyRep`,
      text: shareText,
      url: `${window.location.origin}/rep/${rep.bioguideId}`
    };

    try {
      // For platforms that support image sharing
      if (platform === 'twitter' || platform === 'facebook') {
        // Convert dataURL to blob for sharing
        const response = await fetch(imageDataUrl);
        const blob = await response.blob();
        const file = new File([blob], `${rep.name}-score.png`, { type: 'image/png' });
        
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            ...shareData,
            files: [file]
          });
        } else {
          // Fallback: copy text and show image
          await navigator.clipboard.writeText(`${shareData.text}\n\n${shareData.url}`);
          
          // Open image in new window for manual saving
          const newWindow = window.open();
          newWindow.document.write(`
            <html>
              <head><title>Share Card - ${rep.name}</title></head>
              <body style="margin:0; display:flex; justify-content:center; align-items:center; min-height:100vh; background:#000;">
                <div style="text-align:center;">
                  <img src="${imageDataUrl}" style="max-width:100%; height:auto;" alt="Share Card"/>
                  <p style="color:white; margin-top:20px;">Right-click to save image. Text copied to clipboard!</p>
                </div>
              </body>
            </html>
          `);
        }
      } else {
        // Text-only sharing
        if (navigator.share) {
          await navigator.share(shareData);
        } else {
          await navigator.clipboard.writeText(`${shareData.text}\n\n${shareData.url}`);
          alert('Share text copied to clipboard!');
        }
      }
      
      setUserStats(prev => ({ 
        ...prev, 
        shareCount: prev.shareCount + 1,
        actionsCompleted: { ...prev.actionsCompleted, shared: true }
      }));
      setActiveModal(null);
    } catch (error) {
      console.error('Error sharing:', error);
      // Fallback: just copy text
      await navigator.clipboard.writeText(`${shareData.text}\n\n${shareData.url}`);
      alert('Share text copied to clipboard!');
      setActiveModal(null);
    }
  };

  const openContactModal = (rep, type) => {
    setActiveModal({ type, rep });
  };

  const openStaffModal = (rep) => {
    setActiveModal({ type: 'staff', rep });
  };

  const openProfileModal = (rep) => {
    setActiveModal({ type: 'profile', rep });
  };

  const openMapModal = () => {
    setActiveModal({ type: 'map', rep: null });
  };

  // Generate share card image
  const generateShareCard = (rep, platform = 'twitter') => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Platform-specific dimensions
    const dimensions = {
      twitter: { width: 1200, height: 675 },
      facebook: { width: 1200, height: 630 },
      instagram: { width: 1080, height: 1080 }
    };
    
    const { width, height } = dimensions[platform] || dimensions.twitter;
    canvas.width = width;
    canvas.height = height;
    
    // Black background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);
    
    // Generate conservative score
    const scores = generateConservativeScore(rep);
    
    // Header section
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(rep.name, 60, 80);
    
    ctx.font = '32px Arial';
    ctx.fillStyle = '#9ca3af';
    ctx.fillText(`${rep.party} • ${rep.state} ${rep.district}`, 60, 120);
    
    // Large score display
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 120px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(`${scores.magaScore}%`, width - 60, 150);
    
    ctx.font = '28px Arial';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Conservative Score', width - 60, 180);
    
    // MAGA slider background
    const sliderY = height - 200;
    const sliderWidth = width - 120;
    const sliderHeight = 20;
    
    // Slider track
    ctx.fillStyle = '#374151';
    ctx.fillRect(60, sliderY, sliderWidth, sliderHeight);
    
    // Slider position based on score
    const sliderPosition = (scores.magaScore / 100) * sliderWidth;
    ctx.fillStyle = scores.magaScore > 70 ? '#22c55e' : scores.magaScore > 40 ? '#f59e0b' : '#ef4444';
    ctx.fillRect(60, sliderY, sliderPosition, sliderHeight);
    
    // Slider labels
    ctx.font = '20px Arial';
    ctx.fillStyle = '#9ca3af';
    ctx.textAlign = 'left';
    ctx.fillText('RINO', 60, sliderY - 10);
    ctx.textAlign = 'right';
    ctx.fillText('MAGA', width - 60, sliderY - 10);
    
    // Call to action
    ctx.font = 'bold 32px Arial';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText('I rated my rep! See how yours scores ⬇️', width / 2, height - 120);
    
    // App branding
    ctx.font = '24px Arial';
    ctx.fillStyle = '#6366f1';
    ctx.fillText('RateMyRep.com', width / 2, height - 40);
    
    return canvas.toDataURL('image/png');
  };

  // Generate conservative scorecard data
  const generateConservativeScore = (rep) => {
    const baseScore = rep.party === 'Republican' ? 75 + Math.random() * 20 : 25 + Math.random() * 20;
    return {
      magaScore: Math.round(baseScore),
      schoolChoice: rep.party === 'Republican' ? Math.random() > 0.3 : Math.random() > 0.7,
      antiCRT: rep.party === 'Republican' ? Math.random() > 0.2 : Math.random() > 0.8,
      secondAmendment: rep.party === 'Republican' ? Math.random() > 0.1 : Math.random() > 0.6,
      borderSecurity: rep.party === 'Republican' ? Math.random() > 0.2 : Math.random() > 0.8,
      healthFreedom: rep.party === 'Republican' ? Math.random() > 0.4 : Math.random() > 0.7,
      rinoAlert: rep.party === 'Republican' ? Math.round(Math.random() * 25) : Math.round(50 + Math.random() * 40)
    };
  };

  // Generate staff data
  const generateStaffData = (rep) => {
    const titles = ['Chief of Staff', 'Legislative Director', 'Communications Director', 'District Director', 'Policy Advisor', 'Scheduler'];
    const firstNames = ['Sarah', 'Michael', 'Jennifer', 'David', 'Lisa', 'Robert', 'Amanda', 'James', 'Jessica', 'Christopher'];
    const lastNames = ['Johnson', 'Williams', 'Brown', 'Davis', 'Miller', 'Wilson', 'Moore', 'Taylor', 'Anderson', 'Thomas'];
    
    return Array.from({ length: 4 + Math.floor(Math.random() * 3) }, (_, i) => ({
      id: `staff_${i}`,
      name: `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`,
      title: titles[Math.floor(Math.random() * titles.length)],
      email: `staff${i}@${rep.name.toLowerCase().replace(/\s+/g, '')}.house.gov`,
      phone: `(202) 225-${String(Math.floor(Math.random() * 9000) + 1000)}`
    }));
  };

  const handleContactAction = (type) => {
    if (type === 'phone') {
      setUserStats(prev => ({ 
        ...prev, 
        callCount: prev.callCount + 1,
        actionsCompleted: { ...prev.actionsCompleted, called: true }
      }));
    } else if (type === 'email') {
      setUserStats(prev => ({ 
        ...prev, 
        emailCount: prev.emailCount + 1,
        actionsCompleted: { ...prev.actionsCompleted, emailed: true }
      }));
    }
    setTimeout(() => setActiveModal(null), 100);
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
    
    // Update swipe direction for overlay
    if (Math.abs(deltaX) > 30) {
      setSwipeDirection(deltaX > 0 ? 'like' : 'nope');
    } else {
      setSwipeDirection(null);
    }
    
    if (cardRef.current) {
      const rotation = deltaX * 0.1;
      cardRef.current.style.transform = `translateX(${deltaX}px) translateY(${deltaY}px) rotate(${rotation}deg)`;
      
      // Enhanced visual feedback
      if (deltaX > 50) {
        cardRef.current.style.boxShadow = '0 0 30px rgba(34, 197, 94, 0.8)';
        cardRef.current.style.borderColor = '#22c55e';
      } else if (deltaX < -50) {
        cardRef.current.style.boxShadow = '0 0 30px rgba(239, 68, 68, 0.8)';
        cardRef.current.style.borderColor = '#ef4444';
      } else {
        cardRef.current.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.2)';
        cardRef.current.style.borderColor = 'transparent';
      }
    }
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    
    setIsDragging(false);
    setSwipeDirection(null);
    const threshold = 100;
    
    if (Math.abs(dragOffset.x) > threshold) {
      const rating = dragOffset.x > 0 ? 80 : 20; // Positive rating for right swipe
      handleVote(rating, dragOffset.x > 0 ? 'like' : 'dislike');
    } else {
      // Snap back
      if (cardRef.current) {
        cardRef.current.style.transform = 'translateX(0) translateY(0) rotate(0)';
        cardRef.current.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.2)';
        cardRef.current.style.borderColor = 'transparent';
      }
    }
    
    setDragOffset({ x: 0, y: 0 });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-lg">Loading your representatives...</p>
        </div>
      </div>
    );
  }

  if (!currentRep) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-center max-w-md mx-auto p-6">
          <Star className="h-16 w-16 mx-auto mb-4 text-yellow-400" />
          <h2 className="text-2xl font-bold mb-4">Great job!</h2>
          <p className="text-lg mb-6">You've rated all your representatives. Check back for updates or explore other districts.</p>
          <button 
            onClick={() => setCurrentRepIndex(0)}
            className="bg-white text-black px-6 py-3 rounded-full font-semibold hover:bg-gray-200 transition-colors"
          >
            Rate Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4">
        <div className="flex items-center justify-between text-white">
          <div className="flex flex-col">
            <div className="flex items-center space-x-2">
              <Star className="h-6 w-6 text-yellow-400" />
              <span className="font-bold text-lg">RateMyRep</span>
            </div>
            <span className="text-xs text-white/80 mt-1">Call. Email. Rate. Share.</span>
          </div>
          <button
            onClick={handleChangeLocation}
            className="text-sm bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full hover:bg-white/30 transition-colors flex items-center space-x-1"
          >
            <Settings className="h-4 w-4" />
            <span>Change</span>
          </button>
        </div>
      </div>

      {/* Location Display */}
      <div className="absolute top-16 left-4 right-4 z-10">
        <div className="bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 text-white text-center">
          <div className="flex items-center justify-center space-x-2">
            <MapPin className="h-4 w-4" />
            <span className="font-medium">Showing representatives for {locationDisplay}</span>
          </div>
        </div>
      </div>

      {/* Action Stats Bar */}
      <div className="absolute top-28 left-4 right-4 z-10">
        <div className="bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 flex items-center justify-between text-white text-sm">
          <div className="flex items-center space-x-3">
            <span className="flex items-center">📞 {userStats.callCount}</span>
            <span className="flex items-center">📧 {userStats.emailCount}</span>
            <span className="flex items-center">⭐ {userStats.ratedCount}</span>
            <span className="flex items-center">📱 {userStats.shareCount}</span>
          </div>
        </div>
      </div>

      {/* Main Card */}
      <div className="flex items-center justify-center min-h-screen p-4 pt-40">
        <div className="relative w-full max-w-sm">
          {/* Card */}
          <div
            ref={cardRef}
            className="bg-gray-900 border border-gray-700 rounded-3xl shadow-2xl overflow-hidden cursor-grab active:cursor-grabbing transform transition-transform duration-300 relative z-10"
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

              {/* Swipe Overlays */}
              {swipeDirection && (
                <div className={`absolute inset-0 flex items-center justify-center ${
                  swipeDirection === 'like' ? 'bg-green-500/80' : 'bg-red-500/80'
                }`}>
                  <div className="text-white text-6xl font-bold transform rotate-12 border-4 border-white px-8 py-4 rounded-2xl">
                    {swipeDirection === 'like' ? 'LIKE' : 'NOPE'}
                  </div>
                </div>
              )}

              {/* Photo indicators */}
              {currentRep.images?.length > 1 && (
                <div className="absolute top-3 left-4 right-4 flex space-x-1 z-10">
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
              <div className="absolute top-4 right-4 z-10">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-sm ${
                  currentRep.party === 'Democratic' 
                    ? 'bg-blue-500/90 text-white' 
                    : currentRep.party === 'Republican'
                    ? 'bg-red-500/90 text-white'
                    : 'bg-gray-500/90 text-white'
                }`}>
                  {currentRep.party?.substring(0, 3).toUpperCase()}
                </span>
              </div>

              {/* Rating badge */}
              {currentRep.rating && (
                <div className="absolute bottom-4 left-4 z-10">
                  <div className="bg-black/80 backdrop-blur-sm text-white px-3 py-2 rounded-full text-sm flex items-center">
                    <Star className="h-3 w-3 mr-1 text-yellow-400" />
                    <span className="font-semibold">{currentRep.rating}</span>
                    <span className="text-xs ml-1">({currentRep.totalRatings})</span>
                  </div>
                </div>
              )}

              {/* Hints */}
              {!isDragging && (
                <div className="absolute bottom-4 right-4 z-10">
                  <div className="bg-black/80 backdrop-blur-sm text-white text-xs px-3 py-2 rounded-full text-center max-w-48">
                    💡 Swipe to see more • Tap Map to find YOUR rep
                  </div>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-2xl font-bold text-white">{currentRep.name}</h3>
                <MapPin className="h-5 w-5 text-gray-400" />
              </div>
              
              <p className="text-gray-300 mb-1">
                {currentRep.chamber} • {currentRep.state} {currentRep.district}
              </p>
              
              <p className="text-gray-400 text-sm mb-4 line-clamp-3">
                {currentRep.bio}
              </p>

              {/* Key Issues */}
              {currentRep.keyIssues && (
                <div className="mb-4">
                  <p className="text-sm font-semibold text-gray-300 mb-2">Key Issues:</p>
                  <div className="flex flex-wrap gap-2">
                    {currentRep.keyIssues.slice(0, 3).map((issue, index) => (
                      <span key={index} className="px-2 py-1 bg-gray-800 text-gray-300 text-xs rounded-full border border-gray-600">
                        {issue}
                      </span>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-8 space-y-4 relative z-50">
            {/* Row 1: Primary Swipe Actions */}
            <div className="flex items-center justify-center space-x-12">
              <button
                onClick={() => handleVote(20, 'dislike')}
                className="p-6 bg-red-500 text-white rounded-full shadow-xl hover:bg-red-600 transform hover:scale-110 transition-all duration-200"
                disabled={isAnimating}
                title="Reject"
              >
                <X className="h-8 w-8" />
              </button>
              
              <button
                onClick={() => handleVote(80, 'like')}
                className="p-6 bg-green-500 text-white rounded-full shadow-xl hover:bg-green-600 transform hover:scale-110 transition-all duration-200"
                disabled={isAnimating}
                title="Approve"
              >
                <Heart className="h-8 w-8" />
              </button>
            </div>

            {/* Row 2: All Other Actions */}
            <div className="flex items-center justify-center space-x-2">
              <button
                onClick={() => openContactModal(currentRep, 'phone')}
                className="p-3 bg-green-600 text-white rounded-full shadow-lg hover:bg-green-700 transform hover:scale-105 transition-all duration-200"
                title="Call"
              >
                <Phone className="h-4 w-4" />
              </button>
              
              <button
                onClick={() => openContactModal(currentRep, 'email')}
                className="p-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transform hover:scale-105 transition-all duration-200"
                title="Email"
              >
                <Mail className="h-4 w-4" />
              </button>
              
              <button
                onClick={() => shareRepresentative(currentRep)}
                className="p-3 bg-gray-600 text-white rounded-full shadow-lg hover:bg-gray-700 transform hover:scale-105 transition-all duration-200 border border-gray-500"
                title="Share"
              >
                <Share className="h-4 w-4" />
              </button>
              
              <button
                onClick={() => openStaffModal(currentRep)}
                className="p-3 bg-purple-600 text-white rounded-full shadow-lg hover:bg-purple-700 transform hover:scale-105 transition-all duration-200"
                title="Staff"
              >
                <Users className="h-4 w-4" />
              </button>

              <button
                onClick={() => openProfileModal(currentRep)}
                className="p-3 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transform hover:scale-105 transition-all duration-200"
                title="Profile"
              >
                <User className="h-4 w-4" />
              </button>
              
              <button
                onClick={openMapModal}
                className="p-3 bg-orange-600 text-white rounded-full shadow-lg hover:bg-orange-700 transform hover:scale-105 transition-all duration-200"
                title="Map"
              >
                <MapPin className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {activeModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className={`bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full ${activeModal.type === 'share' ? 'max-w-lg' : 'max-w-sm'}`}>
            
            {/* Contact Modals */}
            {(activeModal.type === 'phone' || activeModal.type === 'email') && (
              <div className="text-center">
                <h3 className="text-lg font-bold mb-4 text-white">
                  Contact {activeModal.rep.name}
                </h3>
                
                {activeModal.type === 'phone' && (
                  <div>
                    <Phone className="h-8 w-8 mx-auto mb-3 text-blue-500" />
                    <p className="text-gray-400 mb-4">
                      Ready to call your representative?
                    </p>
                    <a
                      href={`tel:${activeModal.rep.phone}`}
                      onClick={() => handleContactAction('phone')}
                      className="block w-full bg-blue-500 text-white py-3 rounded-full font-semibold hover:bg-blue-600 transition-colors"
                    >
                      Call {activeModal.rep.phone}
                    </a>
                  </div>
                )}
                
                {activeModal.type === 'email' && (
                  <div>
                    <Mail className="h-8 w-8 mx-auto mb-3 text-green-500" />
                    <p className="text-gray-400 mb-4">
                      Send an email to your representative
                    </p>
                    <a
                      href={`mailto:${activeModal.rep.email}`}
                      onClick={() => handleContactAction('email')}
                      className="block w-full bg-green-500 text-white py-3 rounded-full font-semibold hover:bg-green-600 transition-colors"
                    >
                      Email {activeModal.rep.email}
                    </a>
                  </div>
                )}
                
                <button
                  onClick={() => setActiveModal(null)}
                  className="mt-4 text-gray-400 hover:text-gray-200"
                >
                  Close
                </button>
              </div>
            )}

            {/* Share Modal */}
            {activeModal.type === 'share' && (
              <div>
                <div className="text-center mb-6">
                  <Share className="h-8 w-8 mx-auto mb-3 text-purple-600" />
                  <h3 className="text-xl font-bold mb-2">Share & Hold Accountable</h3>
                  <p className="text-gray-600">
                    Spread the word about {activeModal.rep.name}'s record
                  </p>
                </div>

                {/* Features Section */}
                <div className="bg-purple-50 rounded-xl p-4 mb-6">
                  <h4 className="font-bold text-purple-900 mb-3">What you can do on RateMyRep:</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center text-purple-800">
                      <span className="mr-2">✅</span>
                      <span className="mr-2">📞</span>
                      <span className="font-semibold">CALL</span>
                      <span className="ml-1">your representatives directly</span>
                    </div>
                    <div className="flex items-center text-purple-800">
                      <span className="mr-2">✅</span>
                      <span className="mr-2">📧</span>
                      <span className="font-semibold">EMAIL</span>
                      <span className="ml-1">with pre-written templates</span>
                    </div>
                    <div className="flex items-center text-purple-800">
                      <span className="mr-2">✅</span>
                      <span className="mr-2">⭐</span>
                      <span className="font-semibold">RATE</span>
                      <span className="ml-1">their conservative record</span>
                    </div>
                    <div className="flex items-center text-purple-800">
                      <span className="mr-2">✅</span>
                      <span className="mr-2">📱</span>
                      <span className="font-semibold">SHARE</span>
                      <span className="ml-1">to hold them accountable</span>
                    </div>
                  </div>
                </div>

                {/* Action Stats */}
                {(userStats.callCount > 0 || userStats.emailCount > 0 || userStats.ratedCount > 0 || userStats.shareCount > 0) && (
                  <div className="bg-blue-50 rounded-xl p-4 mb-6">
                    <h4 className="font-bold text-blue-900 mb-3">My civic engagement:</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center text-blue-800">
                        <span className="mr-2">📞</span>
                        <span>Called {userStats.callCount} times</span>
                      </div>
                      <div className="flex items-center text-blue-800">
                        <span className="mr-2">📧</span>
                        <span>Sent {userStats.emailCount} emails</span>
                      </div>
                      <div className="flex items-center text-blue-800">
                        <span className="mr-2">⭐</span>
                        <span>Rated {userStats.ratedCount} reps</span>
                      </div>
                      <div className="flex items-center text-blue-800">
                        <span className="mr-2">📱</span>
                        <span>Shared {userStats.shareCount} times</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Platform Share Actions */}
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => handleActualShare(activeModal.rep, 'twitter')}
                      className="bg-blue-500 text-white py-3 px-4 rounded-xl font-semibold hover:bg-blue-600 transition-colors flex items-center justify-center"
                    >
                      🐦 Twitter
                    </button>
                    
                    <button
                      onClick={() => handleActualShare(activeModal.rep, 'facebook')}
                      className="bg-blue-700 text-white py-3 px-4 rounded-xl font-semibold hover:bg-blue-800 transition-colors flex items-center justify-center"
                    >
                      📘 Facebook
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => handleActualShare(activeModal.rep, 'instagram')}
                      className="bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 px-4 rounded-xl font-semibold hover:from-purple-600 hover:to-pink-600 transition-colors flex items-center justify-center"
                    >
                      📷 Instagram
                    </button>
                    
                    <button
                      onClick={() => handleActualShare(activeModal.rep, 'email')}
                      className="bg-gray-600 text-white py-3 px-4 rounded-xl font-semibold hover:bg-gray-700 transition-colors flex items-center justify-center"
                    >
                      📧 Email
                    </button>
                  </div>
                  
                  <button
                    onClick={() => setActiveModal(null)}
                    className="w-full bg-gray-700 text-white py-3 rounded-full font-semibold hover:bg-gray-600 transition-colors border border-gray-600"
                  >
                    Cancel
                  </button>
                </div>

                {/* Tagline */}
                <div className="text-center mt-4 pt-4 border-t border-gray-700">
                  <p className="text-sm font-medium text-gray-400">
                    RateMyRep: Call. Email. Rate. Share. Hold them accountable.
                  </p>
                </div>
              </div>
            )}

            {/* Staff Modal */}
            {activeModal.type === 'staff' && (
              <div>
                <div className="text-center mb-6">
                  <Users className="h-8 w-8 mx-auto mb-3 text-purple-600" />
                  <h3 className="text-xl font-bold mb-2 text-white">Staff Directory</h3>
                  <p className="text-gray-400">
                    Contact {activeModal.rep.name}'s team directly
                  </p>
                </div>

                <div className="max-h-96 overflow-y-auto space-y-2">
                  {generateStaffData(activeModal.rep).map((staff, index) => (
                    <div 
                      key={staff.id} 
                      className={`${index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-900'} rounded-xl p-4 border border-gray-700 flex items-center justify-between`}
                    >
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-white mb-1 truncate">{staff.name}</h4>
                        <p className="text-sm text-gray-400 truncate">{staff.title}</p>
                      </div>
                      
                      <div className="flex space-x-2 ml-4">
                        <a
                          href={`tel:${staff.phone}`}
                          className="bg-green-600 text-white py-2 px-3 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex items-center"
                        >
                          <Phone className="h-4 w-4 mr-1" />
                          Call
                        </a>
                        <a
                          href={`mailto:${staff.email}`}
                          className="bg-blue-600 text-white py-2 px-3 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center"
                        >
                          <Mail className="h-4 w-4 mr-1" />
                          Email
                        </a>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => setActiveModal(null)}
                  className="w-full mt-6 bg-gray-700 text-white py-3 rounded-full font-semibold hover:bg-gray-600 transition-colors border border-gray-600"
                >
                  Close
                </button>
              </div>
            )}

            {/* Profile Modal */}
            {activeModal.type === 'profile' && (
              <div>
                <div className="text-center mb-6">
                  <User className="h-8 w-8 mx-auto mb-3 text-indigo-600" />
                  <h3 className="text-xl font-bold mb-2">Conservative Profile</h3>
                  <p className="text-gray-600">
                    {activeModal.rep.name}'s conservative alignment
                  </p>
                </div>

                {(() => {
                  const scores = generateConservativeScore(activeModal.rep);
                  return (
                    <div className="space-y-4">
                      {/* MAGA Score */}
                      <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-red-900 flex items-center">
                            🇺🇸 MAGA Score
                          </span>
                          <span className="text-2xl font-bold text-red-600">
                            {scores.magaScore}%
                          </span>
                        </div>
                      </div>

                      {/* Conservative Scorecard */}
                      <div className="bg-blue-50 rounded-xl p-4">
                        <h4 className="font-bold text-blue-900 mb-3">Conservative Scorecard:</h4>
                        <div className="space-y-3 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="flex items-center">🎓 School Choice:</span>
                            <span className={`font-bold ${scores.schoolChoice ? 'text-green-600' : 'text-red-600'}`}>
                              {scores.schoolChoice ? '✅ Champion' : '❌ Opposed'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="flex items-center">🚫 Anti-CRT/DEI:</span>
                            <span className={`font-bold ${scores.antiCRT ? 'text-green-600' : 'text-red-600'}`}>
                              {scores.antiCRT ? '✅ Voted to ban' : '❌ Supports CRT'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="flex items-center">🔫 2nd Amendment:</span>
                            <span className={`font-bold ${scores.secondAmendment ? 'text-green-600' : 'text-red-600'}`}>
                              {scores.secondAmendment ? '✅ Shall not infringe' : '❌ Gun control'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="flex items-center">🛡️ Border Security:</span>
                            <span className={`font-bold ${scores.borderSecurity ? 'text-green-600' : 'text-red-600'}`}>
                              {scores.borderSecurity ? '✅ Strong' : '❌ Weak'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="flex items-center">💊 Health Freedom:</span>
                            <span className={`font-bold ${scores.healthFreedom ? 'text-green-600' : 'text-red-600'}`}>
                              {scores.healthFreedom ? '✅ Pro-freedom' : '❌ Supported mandates'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between border-t pt-3">
                            <span className="flex items-center">🦏 RINO Alert:</span>
                            <span className={`font-bold ${scores.rinoAlert < 25 ? 'text-green-600' : 'text-red-600'}`}>
                              Votes with Dems {scores.rinoAlert}%
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Note */}
                      <div className="bg-yellow-50 rounded-xl p-3 border border-yellow-200">
                        <p className="text-sm text-yellow-800">
                          <strong>Note:</strong> Full voting record available with Airtable integration
                        </p>
                      </div>

                      <button
                        onClick={() => setActiveModal(null)}
                        className="w-full bg-indigo-600 text-white py-3 rounded-full font-semibold hover:bg-indigo-700 transition-colors"
                      >
                        Close Profile
                      </button>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Map Modal */}
            {activeModal.type === 'map' && (
              <div>
                <div className="text-center mb-6">
                  <MapPin className="h-8 w-8 mx-auto mb-3 text-orange-600" />
                  <h3 className="text-xl font-bold mb-2">Find Representatives</h3>
                  <p className="text-gray-600">
                    Location and search options
                  </p>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={() => {
                      setActiveModal(null);
                      handleChangeLocation();
                    }}
                    className="w-full bg-orange-500 text-white py-4 px-4 rounded-xl font-semibold hover:bg-orange-600 transition-colors flex items-center justify-center"
                  >
                    <MapPin className="h-5 w-5 mr-2" />
                    Change ZIP Code
                  </button>
                  
                  <button
                    onClick={() => {
                      setActiveModal(null);
                      // Filter to user's exact district - would need location service
                      alert('Feature coming soon: Find your exact representative by district');
                    }}
                    className="w-full bg-blue-500 text-white py-4 px-4 rounded-xl font-semibold hover:bg-blue-600 transition-colors flex items-center justify-center"
                  >
                    <User className="h-5 w-5 mr-2" />
                    Find MY Representative
                  </button>
                  
                  <button
                    onClick={() => {
                      setActiveModal(null);
                      // Show all reps in state
                      loadRepresentativesData({ type: 'state', value: userLocation?.state || 'NC' });
                    }}
                    className="w-full bg-purple-500 text-white py-4 px-4 rounded-xl font-semibold hover:bg-purple-600 transition-colors flex items-center justify-center"
                  >
                    <Globe className="h-5 w-5 mr-2" />
                    View All in State
                  </button>

                  <button
                    onClick={() => setActiveModal(null)}
                    className="w-full bg-gray-700 text-white py-3 rounded-full font-semibold hover:bg-gray-600 transition-colors border border-gray-600"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Vote feedback - positioned above buttons */}
      {lastVote && (
        <div className="fixed top-32 left-1/2 transform -translate-x-1/2 bg-white px-4 py-2 rounded-full shadow-lg z-40 border-2 border-green-200">
          <p className="text-gray-800 font-medium text-sm">
            ✅ Rated {lastVote.rep.name} 
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