# RateMyRep 🏛️⭐

> Call. Email. Rate. Share. Hold them accountable.

RateMyRep is an ACTION-FOCUSED civic engagement platform that empowers citizens to directly engage with their elected officials. More than just browsing - it's a comprehensive tool for political accountability through direct action.

## ✨ Core Actions

### 📞 **CALL** - Direct Action
- One-tap calling to representatives
- Track your call history
- Phone numbers for all offices

### 📧 **EMAIL** - Written Engagement  
- Pre-written email templates
- Direct mailto links
- Track email engagement

### ⭐ **RATE** - Conservative Scoring
- Rate representatives' conservative record
- 0-100% conservative scoring system
- Track voting patterns and positions

### 📱 **SHARE** - Accountability Network
- Comprehensive share cards with action stats
- Conservative score highlighting
- Civic engagement tracking
- Social media integration

## 🚀 Additional Features

- 📱 **Swipe Interface**: Tinder-like experience for quick rating
- 🏛️ **Real Official Photos**: Uses bioguide.congress.gov photos
- 📍 **Location-Based**: Automatically shows your representatives
- 📊 **Action Tracking**: Monitor your civic engagement stats
- 👥 **Staff Directory**: Access to official staff information

## 🚀 Quick Start

### Prerequisites

- Node.js 16+
- Cloudflare account (for production)
- Airtable account (for production)
- Wrangler CLI (`npm install -g wrangler`) (for production)

### Local Development (Recommended First Step)

1. **Setup Project**
   ```bash
   git clone <your-repo>
   cd rate-my-rep
   npm install
   ```

2. **Start Development Server**
   ```bash
   npm run dev:local
   # or
   npm run start
   ```
   The app will run on `http://localhost:3000` with test data included.
   
   > **Note**: The server starts automatically and uses mock API data. No Cloudflare or Airtable setup required for local testing!

3. **Test the Application**
   - Try ZIP codes: `27713` (NC), `35801` (AL), `80301` (CO), `48104` (MI)
   - Test location auto-detection
   - Swipe through sample officials (8 included)
   - Test rating and contact features
   - API calls will use fallback test data when Airtable is not configured

4. **Troubleshooting**
   - If you see "Module not found: lucide-react", run: `npm install lucide-react`
   - Build errors? Run: `npm run build` to check for issues
   - For API functionality, all endpoints return test data when Airtable is not configured

### Production Setup

### 1. Configure Airtable

1. Create a new Airtable base
2. Run the setup script for table structures:
   ```bash
   node airtable-setup.js
   ```
3. Get your API key and Base ID from Airtable
4. Update `wrangler.toml` with your credentials

### 2. Import Data

```bash
# Update paths in import-data.js to point to your CSV files
node import-data.js
```

### 4. Environment Variables

Set these in your Cloudflare Pages environment:

```bash
AIRTABLE_API_KEY=your_api_key_here
AIRTABLE_BASE_ID=your_base_id_here
AIRTABLE_OFFICIALS_TABLE=Officials
AIRTABLE_STAFF_TABLE=Staff
AIRTABLE_RATINGS_TABLE=Ratings
```

### 5. Deploy

```bash
# Development
npm run dev

# Production
npm run deploy
```

## 📊 Data Structure

### Officials Table
- Basic info (name, party, state, district)
- Contact information (phone, email, website)
- Bioguide integration for photos
- Rating statistics
- Social media handles

### Staff Table
- Staff member details
- Job titles and contact info
- Policy areas
- Links to officials

### Ratings Table
- User ratings (0-100%)
- Geographic data
- Timestamps and analytics
- Comments and feedback

## 🎨 API Endpoints

### Officials
- `GET /api/officials` - Get officials by location/state
- `GET /api/officials?bioguideId=A000370` - Get specific official
- `POST /api/officials` - Create new official (admin)

### Staff
- `GET /api/staff?officialId=123` - Get staff for official
- `GET /api/staff?bioguideId=A000370` - Get staff by bioguide ID

### Ratings
- `POST /api/rate` - Submit a rating
- `GET /api/rate?officialId=123` - Get rating statistics

### Social Sharing
- `GET /api/og-image` - Generate Open Graph images
- `GET /api/og-image?bioguideId=A000370&template=minimal`

### Location
- `GET /api/location` - Detect user location
- `GET /api/location?lat=38.9&lng=-77.0` - Reverse geocode

## 🎛️ Configuration

### wrangler.toml
```toml
name = "rate-my-rep"
main = "src/index.js"
compatibility_date = "2023-12-01"

[env.production.vars]
AIRTABLE_API_KEY = "your_key"
AIRTABLE_BASE_ID = "your_base"
# ... other vars
```

### Airtable Schema
See `airtable-setup.js` for complete table structures and field types.

## 📱 Component Structure

```
src/
├── components/
│   └── RateMyRep.js          # Main swipe interface
├── App.js                    # Root component
├── index.js                  # Entry point
└── styles.css                # Tailwind + custom styles
```

## 🔧 Cloudflare Functions

```
functions/api/
├── officials.js              # Officials CRUD
├── staff.js                  # Staff data
├── rate.js                   # Rating system
├── og-image.js               # Social cards
└── location.js               # Geolocation
```

## 🎯 Social Sharing

### Open Graph Meta Tags
```html
<meta property="og:title" content="Rate John Doe on RateMyRep">
<meta property="og:description" content="I rated John Doe 85% on RateMyRep!">
<meta property="og:image" content="/api/og-image?bioguideId=A000370">
```

### Dynamic Image Generation
- Official photos from bioguide.congress.gov
- Rating overlays and party colors
- Customizable templates
- 1200x630 optimized for all platforms

## 📊 Analytics & Performance

### Caching Strategy
- Official data: 1 hour cache
- Staff data: 30 minutes cache
- Ratings: 5 minutes cache
- OG images: 24 hours cache

### Rate Limiting
- Built-in Cloudflare protection
- IP-based rating submission limits
- Graceful fallbacks for API failures

## 🛠️ Development

### Local Development
```bash
npm run dev
# or
wrangler pages dev public --compatibility-date=2023-12-01
```

### Testing
```bash
# Test API endpoints
curl http://localhost:8788/api/officials
curl http://localhost:8788/api/location
```

### Building
```bash
npm run build
```

## 🚀 Deployment

### Cloudflare Pages
1. Connect your Git repository
2. Set build command: `npm run build`
3. Set build output directory: `dist`
4. Add environment variables
5. Deploy!

### Custom Domain
1. Add custom domain in Cloudflare Pages
2. Update DNS records
3. SSL automatically configured

## 🔐 Security

- CORS properly configured
- Input validation on all endpoints
- Rate limiting and abuse prevention
- No sensitive data in client code
- Environment variables for secrets

## 📈 Monitoring

### Analytics
- Built-in Cloudflare Analytics
- Custom event tracking available
- Performance monitoring
- Error tracking and logging

### Airtable Limits
- 5 requests/second per base
- 1,200 requests/hour per workspace
- Automatic retries and fallbacks

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

### Common Issues

**API Key Issues**
- Verify Airtable API key in environment variables
- Check base ID matches your Airtable base
- Ensure tables are named correctly

**Photo Loading Issues**
- Bioguide photos may be slow to load
- Fallback placeholders provided
- CDN caching improves performance

**Location Detection**
- Requires HTTPS for geolocation API
- Falls back to IP-based detection
- Default location: Washington, DC

### Contact
- GitHub Issues: [Report bugs or request features]
- Documentation: [Additional docs and guides]

---

Built with ❤️ for political engagement and transparency.