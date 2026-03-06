# Family Dashboard - v3.29.0 🏠

A sophisticated, room-readable personal dashboard application designed for always-on displays. Features real-time weather narratives with **156 hilarious comments including 100 R-rated additions**, extreme weather alert overlays, modular architecture with utility modules, weekend event previews, and multi-account calendar integration with **accurate timezone handling** and intelligent time-based content switching. Built with modern ES2015+ JavaScript, optimized for 24/7 operation on wall-mounted displays and smart home setups.

---

## 🎉 Latest Updates

### New Release (v3.29.0) - Weather UI Overhaul & Alert System
- **Extreme Weather Alerts**: Full-screen overlay (orange / red / animated rainbow) for warning, severe, and extreme conditions — alternates with normal dashboard every 15 minutes
- **Two-Color Narrative**: Forecast text renders in dark blue; R-rated commentary renders in deep red italic — glanceable at a distance
- **Prominent Sunset**: Upgraded from a tiny 14px badge to a clear 18px pill below the panel header
- **Larger Temperature**: 72px (today) and 60px (tomorrow) for across-the-room readability
- **Richer "Later Today" Box**: Now shows high/low, wind speed, humidity, and precipitation hours
- **Icon Removed**: Eliminated the redundant large emoji icon above the temperature

### Previous Release (v3.28.1) - Comedian Weather Comments
- **156 Total Weather Comments**: Added 50 comedian-inspired R-rated comments (up from 106)
- **18 Comedians**: Carlin, Pryor, Robin Williams, Dangerfield, Joan Rivers, Bill Burr, Chappelle, Mulaney, Norm Macdonald, Mitch Hedberg, Amy Schumer, Wanda Sykes, Don Rickles, Jeselnik, Sarah Silverman, Jeff Ross, Phyllis Diller, Henny Youngman

### Previous Release (v3.28.0) - Multi-Account CalDAV
- **Multi-Account Calendar**: Connect up to 3 CalDAV accounts simultaneously — Google Workspace, Gmail, iCloud, Outlook, or any generic CalDAV server
- **Per-Account Colors**: Each account gets a distinct color that carries through to event cards and weekend previews
- **Accounts Management UI**: Colored account cards with individual Test and Remove buttons; 3-account limit enforced in UI
- **Auto-Migration**: Existing single-account configs silently migrate to the new multi-account storage format on first load
- **Generic CalDAV Fixed**: `api/calendar.js` now correctly handles custom CalDAV server endpoints end-to-end
- **Partial Failure Resilience**: If one account fails, events from the other accounts still load
- **Timezone Fix**: Weekend event date filtering now uses the configured timezone consistently, not the browser locale

### Previous Release (v3.27.4) - Vercel Migration
- **Migrated**: CalDAV proxy from Netlify to Vercel (`api/calendar.js`)
- **Removed**: `netlify.toml` and `netlify/` directory
- **Fixed**: Calendar proxy URL now correctly routes through Vercel functions

### Previous Release (v3.27.3) - ZIP Code Location
- **Simplified Setup**: Single ZIP code field replaces city + state inputs — one field, no abbreviations
- **Smarter Auto-Detect**: Geolocation button kept; on success it populates ZIP automatically via reverse geocode; fails gracefully on locked-down iPads
- **Unambiguous Geocoding**: OpenWeatherMap zip endpoint eliminates city name conflicts (Springfield, IL vs MO etc.)

### Previous Release (v3.27.1) - CalDAV Date Range Fix
- **🤬 50 R-Rated Weather Comments**: Hilarious, uncensored adult humor added
- **😂 106 Total Comments**: Nearly doubled from 56 for maximum variety
- **💋 Spicy Categories**: Sunny, cloudy, rainy, and cold all got saucier
- **🍑 Mature Audiences**: Weather descriptions that make you laugh AND blush

[See complete version history below](#-version-history--evolution)

---

## ✨ Key Features

### 📅 Universal Calendar Integration
- **CalDAV Support**: Google Calendar, iCloud, Outlook, and any generic CalDAV server
- **Multi-Account**: Connect up to 3 accounts simultaneously — personal, work, and family calendars each with a distinct color
- **Weekend Events Preview**: Dedicated section showing upcoming Saturday/Sunday events
- **Accurate Timezone Handling**: Automatic EST/EDT transitions for correct event times; weekend filter uses configured timezone, not browser locale
- **Serverless Backend**: Vercel functions handle authentication and CORS
- **Always-On Reliability**: Basic auth eliminates OAuth token refresh issues; partial account failures don't block healthy accounts
- **All-Day Event Fix**: All-day events now display on correct single day only
- **Connection Testing**: Built-in per-account CalDAV connection testing
- **Room-Readable Display**: Large fonts and high-contrast design for wall displays
- **iPad Optimized**: Responsive layout optimized for 1080x810 tablet displays

### 🌤️ Enhanced Weather System (v3.25)
- **Sunset Time Display**: Real-time sunset time in weather panel upper corner
- **Smart Commentary**: Weather-specific activity suggestions (outdoor vs indoor)
- **Context-Aware Display**: "Right Now" vs "Tomorrow" focused layouts
- **Massive Typography**: 60px+ temperatures for room visibility
- **Dynamic Color Themes**: Weather-responsive gradients and high contrast
- **Smart Geocoding**: Auto-detects location with OpenWeatherMap API
- **Hourly Forecasts**: Detailed breakdown with precipitation alerts
- **Dynamic Favicon**: Updates with current weather conditions
- **Debug Tools**: Comprehensive weather API debugging and troubleshooting

### 🏠 Smart Home Optimization
- **Time-Based Intelligence**: Automatically switches to tomorrow at 5 PM Eastern
- **Always-On Design**: Optimized for 24/7 wall-mounted displays
- **Mobile PWA Support**: Install as native app with service worker
- **Responsive Layout**: Perfect for tablets, smart displays, and desktops
- **Zero-Maintenance**: Self-updating weather and calendar data every 30 minutes

### 🌊 Environmental Data
- **Tide Information**: NOAA API with multiple station fallbacks
- **Sunrise/Sunset**: Accurate solar data with timezone handling
- **Location-Aware**: Configurable for coastal and inland locations
- **Smart Fallbacks**: Estimated data when APIs are unavailable

### ⚡ Technical Excellence
- **Modern JavaScript**: ES2015+ features, async/await, destructuring
- **GitHub Pages Ready**: Pure client-side application, no server required
- **Vercel Functions**: Serverless backend for CalDAV calendar integration
- **Service Worker**: Offline capability and performance optimization
- **LocalStorage Config**: Secure, browser-based configuration management
- **Optimized Bundle**: 57% smaller with advanced minification (160 KB → 68 KB)

## 🆕 What's New in v3.27 - Adults Only Weather Edition 🔥

### 🤬 50 New R-Rated Weather Comments
- **Sunny outdoor**: +13 spicy comments like "Hot as balls outside - embrace it!" and "This weather fucks. Hard."
- **Cloudy outdoor**: +12 sassy comments like "Clouds thicker than a Kardashian!" and "Moody weather for moody bitches!"
- **Rainy indoor**: +13 cheeky comments like "F*ck it, it's a Netflix and actually chill day!" and "Perfect excuse to day-drink guilt-free!"
- **Cold indoor**: +12 frosty zingers like "Cold as a witch's tit out there!" and "Freezing your balls off weather!"

### 📊 Commentary Statistics
| Category | Before | After | R-Rated Added |
|----------|--------|-------|---------------|
| Sunny Outdoor | 15 | 28 | +13 |
| Cloudy Outdoor | 10 | 22 | +12 |
| Rainy Indoor | 16 | 29 | +13 |
| Cold Indoor | 15 | 27 | +12 |
| **Total** | **56** | **106** | **+50** |

### 🎭 Adult Humor Features
- **Uncensored Commentary**: Real talk about the weather
- **Mature Themes**: Adult humor that actually makes you laugh
- **Mixed Content**: Family-friendly and R-rated comments coexist
- **Random Selection**: Never know if you'll get spicy or sweet!

## 🆕 What's New in v3.26

### 🔧 Major Code Refactoring
- **4 New Utility Modules**: Modular architecture for improved maintainability
  - `weather-narrative-engine.js` - Centralized weather commentary (108 comments!)
  - `logger.js` - Structured logging with debug levels
  - `date-utils.js` - Date/time operations and timezone handling
  - `error-handler.js` - Centralized error management with retry logic
- **Eliminated Code Duplication**: Weather logic consolidated from multiple files
- **Improved Organization**: Better separation of concerns and code reusability
- **Enhanced Maintainability**: Changes to weather commentary now in single location

### 💬 Doubled Weather Commentary (54 → 108 Comments)
- **Sunny outdoor comments**: 18 → 36 (100% increase!)
- **Cloudy outdoor comments**: 10 → 20 (100% increase!)
- **Rainy indoor comments**: 16 → 32 (100% increase!)
- **Cold indoor comments**: 10 → 20 (100% increase!)
- **More variety**: Users see fresh, engaging weather descriptions every time
- **Consistent tone**: All comments maintain the fun, personality-driven style

### 🏗️ Improved Architecture
- **Modular Design**: Utility functions separated into focused modules
- **Better Error Handling**: Retry logic with exponential backoff
- **Structured Logging**: Context-specific loggers for different modules
- **Date Utilities**: Centralized timezone and date formatting functions
- **Weather Engine**: Single source of truth for all weather narratives

## 🆕 What's New in v3.25

### 🎯 Weekend Events Preview
- **Dedicated weekend section** at the bottom of the calendar panel
- **Shows upcoming Saturday and Sunday events** without affecting daily view
- **Responsive design** optimized for iPad 1080x810 displays
- **Orange accent styling** to distinguish from daily events
- **Auto-calculates** next weekend dates dynamically

### 🌅 Enhanced Weather Display  
- **Sunset time indicator** in upper right corner of weather panel
- **Real-time sunrise/sunset data** from Sunrise-Sunset API
- **Compact display** that doesn't increase panel height
- **Updates automatically** with weather data refresh

### 🔧 Backend Improvements
- **Fixed CalDAV function** to handle specific date requests (YYYY-MM-DD format)
- **Enhanced date filtering** for accurate event display
- **Improved error handling** and debugging capabilities
- **Better timezone support** for multi-date queries

### 📱 Display Optimizations
- **Font size refinements** - weather narrative reduced from 46px to 40px for better fit
- **Improved responsive design** for various screen sizes
- **Enhanced scrolling behavior** in weekend events section
- **Better contrast** and readability improvements

## 🚀 Quick Start

### Option 1: GitHub Pages (Recommended for Basic Use)
1. **Fork this repository** or download the code
2. **Enable GitHub Pages** in repository settings:
   - Go to Settings → Pages
   - Source: Deploy from a branch
   - Branch: main / (root)
   - Save
3. **Visit your site** at `https://username.github.io/family-dash`
4. **Configure APIs** using the built-in setup interface (setup.html)
5. **Note**: GitHub Pages works great for weather but has limited CalDAV support due to CORS restrictions

### Option 2: Vercel (Recommended for Full Features)
1. **Deploy to Vercel** for full CalDAV functionality:
   - Connect your GitHub repository
   - No build command required — deploy directory: `.` (root)
2. **Serverless functions** in `api/` handle calendar authentication automatically
3. **Custom domains** and SSL certificates included free
4. **Better calendar integration** with CORS handling via Vercel functions
5. **Instant deployments** on every git push

### Option 3: Local Development
1. Clone repository: `git clone https://github.com/josefresco/family-dash.git`
2. Navigate to directory: `cd family-dash`
3. Serve locally (choose one):
   - Python 3: `python -m http.server 8000`
   - Python 2: `python -m SimpleHTTPServer 8000`
   - Node.js: `npx serve .`
   - PHP: `php -S localhost:8000`
4. Open browser: `http://localhost:8000`
5. Configure APIs through the setup interface
6. **Note**: CalDAV features require deploying to Vercel or a server with function support

## 🔧 Configuration

### Required APIs
- **OpenWeatherMap API Key** (Required for weather features)
  - Free tier: 1,000 calls/day
  - Get your key: [OpenWeatherMap API](https://openweathermap.org/api)
  - Sign up → API Keys → Create key
  - Cost: Free forever for basic tier
- **Location**: Auto-detected via browser geolocation or manual entry

### Optional Calendar Setup
To display calendar events, you'll need CalDAV access:

- **Google Calendar** (Recommended)
  - CalDAV URL: `https://apidata.googleusercontent.com/caldav/v2/`
  - Username: Your full Gmail address
  - Password: [App Password](https://myaccount.google.com/apppasswords) (NOT your regular password)
  - Note: Requires 2-factor authentication enabled

- **iCloud Calendar**
  - CalDAV URL: `https://caldav.icloud.com/`
  - Username: Your Apple ID
  - Password: App-specific password from [appleid.apple.com](https://appleid.apple.com)

- **Outlook/Office 365**
  - CalDAV URL: `https://outlook.office365.com/`
  - Username: Your Outlook email
  - Password: Account password

- **Generic CalDAV**
  - Any RFC 4791-compliant CalDAV server
  - Check your calendar provider's documentation for CalDAV endpoint

### Enhanced Setup Process (v3.24)
1. Navigate to your deployed dashboard
2. Click "🔧 Setup Configuration" 
3. **View Current Configuration**: See existing CalDAV/weather settings
4. **Test Connections**: Verify API credentials and connection health
5. **Debug Tools**: Comprehensive diagnostics for troubleshooting
6. **Edit Configuration**: Modify existing settings without starting over
7. **Step-by-Step Guidance**: Provider-specific setup instructions (Google App Passwords, etc.)
8. Launch your personalized dashboard!

## 🏗️ Architecture & Technical Details

### Application Structure
```
family-dash/
├── 📄 Core Application Files
│   ├── index.html              # Smart entry point with config detection
│   ├── dashboard.html          # Main dashboard interface
│   └── setup.html              # Comprehensive setup wizard
│
├── ⚡ JavaScript Modules (ES2015+)
│   ├── 🛠️ Utility Modules (v3.26)
│   │   ├── logger.js                    # Structured logging utility (244 lines)
│   │   ├── error-handler.js             # Centralized error handling (322 lines)
│   │   ├── date-utils.js                # Date/time utilities (300 lines)
│   │   └── weather-narrative-engine.js  # Weather commentary - 106 comments (50 R-rated!)
│   ├── config.js               # LocalStorage configuration management
│   ├── api-client.js           # Direct external API integration
│   ├── caldav-client.js        # CalDAV client with Vercel proxy
│   └── app-client.js           # Main application logic
│
├── 🔧 Deployment & Services
│   ├── vercel.json             # Vercel configuration
│   ├── api/                    # Vercel serverless functions
│   │   └── calendar.js         # CalDAV proxy with timezone fixes
│   ├── sw.js                   # Service worker for PWA features
│   └── favicon.svg             # Dynamic weather-based favicon
│
└── 📚 Documentation
    ├── README.md               # This file
    └── CHANGELOG.md            # Detailed version history
```

### Browser Compatibility
- **Modern Browsers Required**: Chrome 88+, Firefox 78+, Safari 15+, Edge 88+
- **JavaScript Features**: ES2015+ classes, async/await, destructuring, optional chaining
- **APIs Used**: Fetch with AbortController, Geolocation, Service Workers, LocalStorage
- **No Legacy Support**: Optimized for modern browsers and smart displays

### External API Integration
- **OpenWeatherMap**: Current conditions, forecasts, geocoding
- **NOAA Tides**: Real-time tide data with station fallbacks
- **Sunrise-Sunset**: Solar data with timezone conversion
- **CalDAV Servers**: Google, iCloud, Outlook, generic RFC-compliant servers

## ⚡ Performance & Bundle Optimization

### Bundle Size Optimization (v3.26.1)
The dashboard now includes production build tools for optimal performance:

- **Original Bundle**: 160.02 KB (8 JavaScript files)
- **Optimized Bundle**: 68.54 KB minified (-57.17%)
- **Network Transfer**: ~20-25 KB with gzip/brotli
- **Parse Time**: 60% faster on mobile devices

### Build Tools

```bash
# Analyze current bundle
npm run analyze

# Create optimized production build
npm run build:advanced

# View optimization statistics
npm run stats
```

### Optimization Results

| File | Original | Minified | Reduction |
|------|----------|----------|-----------|
| app-client.js | 67.32 KB | 33.09 KB | 50.85% |
| api-client.js | 25.06 KB | 9.58 KB | 61.76% |
| caldav-client.js | 19.53 KB | 7.13 KB | 63.49% |
| weather-narrative-engine.js | 17.18 KB | 8.88 KB | 48.34% |
| Other utilities | 30.93 KB | 9.86 KB | 68.12% |

See [CHANGELOG.md](CHANGELOG.md) for complete version history.

## 🎯 Use Cases & Smart Home Integration

### Perfect For
- **🏠 Wall-Mounted Displays**: Optimized for tablets and smart displays
- **🏢 Office Dashboards**: Show team calendars and local conditions  
- **🏡 Family Command Centers**: Unified schedule and weather display
- **🎛️ Smart Home Hubs**: Integration-ready with home automation
- **📱 Mobile PWA**: Install as native app on phones and tablets

### Display Optimization
- **Room Readability**: 60px+ fonts visible from across the room
- **High Contrast**: Weather-responsive colors for all lighting conditions
- **Auto-Brightness**: Adapts to ambient light conditions
- **Landscape Layout**: Perfect for horizontal tablet mounting
- **24/7 Operation**: Designed for continuous operation

## 📈 Version History & Evolution

### v3.28.1 - Comedian Weather Comments (Latest)
- **156 Weather Comments**: 50 comedian-inspired additions across all four weather categories
- **18 Comedians**: Carlin, Pryor, Robin Williams, Dangerfield, Joan Rivers, Bill Burr, Chappelle, Mulaney, Norm MacDonald, Mitch Hedberg, Amy Schumer, and more

### v3.28.0 - Multi-Account CalDAV
- **Multi-Account Calendar**: Up to 3 CalDAV accounts with per-account color coding
- **Generic CalDAV Fixed**: Custom CalDAV server endpoints now work end-to-end
- **Partial Failure Resilience**: One bad account doesn't block the others
- **Timezone Fix**: Weekend event date filter uses configured timezone consistently
- **XSS Fix**: Account labels and usernames sanitized before HTML rendering
- **Setup UX**: Account cards with Test/Remove, 3-account limit enforced, skip button restored correctly

### v3.27.4 - Vercel Migration
- **Migrated**: CalDAV proxy from Netlify functions to Vercel (`api/calendar.js`)
- **Cleaned**: Removed all Netlify config files and references

### v3.27.3 - ZIP Code Location
- **Simplified Setup**: Single ZIP code field replaces city + state inputs
- **Smarter Auto-Detect**: Geolocation now populates ZIP directly; fails gracefully on restricted devices
- **More Reliable Geocoding**: Uses OpenWeatherMap's zip-based endpoint (unambiguous, single field)

### v3.27.1 - CalDAV Date Range Fix
- **Bug Fix**: Previous-evening events no longer bleed into the next day's calendar view
- **Correct UTC Boundaries**: Eastern midnight now computed accurately for both EST and EDT
- **DST-Safe Tomorrow**: Day increment uses integer calendar arithmetic
- **Post-Query Filter**: Timed events validated against the correct Eastern date

### v3.27.0 - Adults Only Weather Edition
- **🤬 50 R-Rated Weather Comments**: Hilarious, uncensored adult humor
- **😂 106 Total Comments**: Nearly doubled commentary variety (was 56)
- **🍑 Spicy Additions**: All four weather categories got sassier
- **💋 Mature Audiences**: Perfect for adults who like their weather with a side of laughs

### v3.26.1 - Timezone Fix
- **🐛 Fixed EST/EDT Timezone Bug**: Calendar events now display at correct times year-round
- **⏰ Dynamic Offset Calculation**: Automatically applies +4 hours (EDT) or +5 hours (EST)
- **📅 Accurate Event Times**: Fixed issue where 9:00 AM appointments showed as 8:00 AM in winter

### v3.26 - Code Refactoring & Enhanced Commentary Edition
- **🔧 Major Refactoring**: Created 4 utility modules (1,320+ lines of organized code)
- **💬 Doubled Weather Commentary**: 108 unique comments (up from 54)
- **🏗️ Modular Architecture**: Eliminated code duplication across files
- **📝 Structured Logging**: Context-aware logging with multiple levels
- **🎯 Better Error Handling**: Retry logic and user-friendly error messages
- **📅 Date Utilities**: Centralized timezone and date formatting
- **⚡ Weather Engine**: Single source for all weather narratives
- **🧹 Code Cleanup**: Consolidated duplicate logic from api-client.js and app-client.js

### v3.25 - Weekend Events & Enhanced Display Edition
- **🎯 Weekend Events Preview**: Dedicated section for Saturday/Sunday events
- **🌅 Enhanced Weather Display**: Sunset time indicator in weather panel
- **🔧 Backend Improvements**: Fixed CalDAV date handling
- **📱 Display Optimizations**: Font refinements and responsive design

### v3.24 - Enhanced Setup & Debug Edition
- **🐛 All-Day Event Fix**: All-day calendar events now display on single correct day only
- **🌤️ Smart Weather Commentary**: Context-aware activity suggestions (sunny=outdoors, rainy=indoors)
- **🔧 Enhanced Setup Interface**: Current configuration viewing, editing, and management
- **🐛 Comprehensive Debug Tools**: Weather and CalDAV debugging with exportable logs
- **📚 Step-by-Step Guidance**: Provider-specific setup instructions with Google App Password help
- **🔍 Connection Testing**: Built-in API testing and health verification
- **💾 Configuration Management**: Edit existing settings without reconfiguration

### v3.23 - Production CalDAV Edition
- **🔄 Complete CalDAV Overhaul**: Serverless functions eliminate CORS issues
- **🎨 Enhanced Weather Narratives**: Personality-driven weather stories
- **🕐 Intelligent Time Switching**: Eastern timezone awareness
- **🔍 Advanced Debugging**: CalDAV diagnostic tools and logging
- **📱 PWA Improvements**: Better mobile app experience

### v3.20-3.22 - Reliability & Polish
- **🐛 Bug Fixes**: Calendar timezone handling and API reliability
- **⚡ Performance**: Faster loading and smoother animations
- **🎨 UI Refinements**: Better responsive design and color schemes

### v3.18-3.19 - Smart Display Focus
- **📺 Wall Display Optimization**: Perfect for always-on displays
- **🔄 Auto-Refresh Logic**: Intelligent content updating
- **🌡️ Weather Personality**: Fun, engaging weather descriptions

### v3.10-3.17 - Feature Expansion
- **📅 Multi-Calendar Support**: Connect multiple Google accounts
- **🌊 Tide Integration**: NOAA API with coastal location support
- **🌅 Sunrise/Sunset**: Automatic solar data with timezone handling
- **🔧 Setup Wizard**: Comprehensive configuration interface

### v3.0-3.9 - Foundation & Migration
- **🏠 GitHub Pages Conversion**: From PHP to pure JavaScript
- **📱 PWA Implementation**: Service worker and offline capability
- **🔐 LocalStorage Config**: Secure browser-based configuration
- **🎨 Modern Design**: Complete UI overhaul with responsive layout

## 🔧 Troubleshooting & Support

### Common Issues & Solutions

#### 📅 Calendar Not Loading
- **Check CalDAV Config**: Use the debug tools in `setup.html` for detailed diagnostics
- **Verify Credentials**: Ensure App Password is correctly entered
- **Network Issues**: Check browser Network tab for CORS/connection errors
- **Provider Issues**: Try different CalDAV endpoints if using Google Workspace
- **Deployment Required**: CalDAV features require Vercel deployment (not available on GitHub Pages)

#### ⏰ Calendar Times Are Wrong
- **Timezone Issues**: Events showing 1 hour off? This was fixed in v3.26.1
- **Update Required**: Pull latest code to get EST/EDT automatic switching
- **Clear Cache**: Hard refresh browser after updating (Ctrl+F5 or Cmd+Shift+R)
- **Verify Fix**: Check that `calendar.js` uses `isEDT()` function for dynamic offset

#### 🌤️ Weather Problems  
- **API Key Invalid**: Verify OpenWeatherMap key in setup interface
- **Location Issues**: Try manual location entry if auto-detection fails
- **Rate Limits**: Free tier allows 1,000 calls/day (resets at UTC midnight)
- **Network Errors**: Check firewall/ad-blocker blocking API calls

#### 🔄 Data Not Updating
- **Service Worker**: Clear browser cache or disable service worker temporarily
- **LocalStorage**: Reset configuration by clearing browser data
- **API Limits**: Check if you've exceeded daily API quotas
- **Network Issues**: Verify internet connection and DNS resolution

### Debug Tools & Utilities

#### Built-in Debugging (Enhanced v3.24)
- **Setup Screen Debug Tools**: Integrated weather and CalDAV debugging
  - 🌤️ **Weather Debug**: Shows concise API responses, rate limits, and key validation
  - 📅 **CalDAV Debug**: Comprehensive connection testing with exportable logs
  - 📋 **Copy/Export Functions**: Save debug data for troubleshooting
- **Configuration Management**: View, edit, test, and remove existing configurations
- **Browser Console**: Press F12 → Console for detailed error logging
- **Network Inspector**: Monitor real-time API calls and responses

#### Advanced Troubleshooting
- **LocalStorage Inspector**: Check `Application → Local Storage` in DevTools
- **Service Worker**: `Application → Service Workers` for cache debugging
- **Vercel Functions**: Check function logs in the Vercel dashboard for CalDAV proxy issues
- **External APIs**: Test endpoints directly in browser or Postman

### Performance Optimization

#### For Wall Displays
- **Refresh Interval**: 30-minute default balances freshness vs API usage
- **Cache Strategy**: Service worker caches static assets for offline use
- **Memory Management**: Automatic cleanup prevents memory leaks during 24/7 operation
- **Display Sleep**: Most tablets/displays will sleep automatically; dashboard resumes smoothly

#### API Efficiency
- **Smart Caching**: Duplicate requests are deduplicated automatically
- **Fallback Systems**: Local estimation when external APIs fail
- **Request Cancellation**: AbortController prevents stale requests
- **Rate Limit Awareness**: Built-in throttling respects API limits

## 🤝 Contributing & Development

### Development Setup
```bash
# Clone the repository
git clone https://github.com/josefresco/family-dash.git
cd family-dash

# Serve locally (choose one)
python -m http.server 8000
npx serve .
php -S localhost:8000

# Open browser
open http://localhost:8000  # macOS
xdg-open http://localhost:8000  # Linux
start http://localhost:8000  # Windows
```

### Code Structure
- **Modern JavaScript**: ES2015+ throughout, no legacy compatibility
- **Modular Design**: Utility modules for reusable functionality
  - `logger.js` - Centralized logging
  - `error-handler.js` - Consistent error handling
  - `date-utils.js` - Timezone and date operations
  - `weather-narrative-engine.js` - Weather commentary
- **Progressive Enhancement**: Core functionality works without JavaScript
- **Responsive CSS**: Mobile-first design with desktop enhancements
- **No Build Step**: Pure ES6 modules, no bundler required

### Testing
- **Manual Testing**: Use setup interface to verify all APIs
- **Debug Tools**: Comprehensive logging and error reporting
  - Enable debug mode: `window.enableDebugLogging()`
  - View logs: Open browser console (F12)
  - Export logs: Use built-in debug export in setup.html
- **Cross-Browser**: Test on target devices (tablets, smart displays)
- **Performance**: Monitor memory usage during extended operation
- **CalDAV Testing**: Use the built-in debug tools in setup.html for connection diagnostics

### Making Contributions
When contributing to this project:
1. **Test thoroughly**: Verify on multiple browsers and devices
2. **Follow patterns**: Use existing utility modules for new features
3. **Document changes**: Update README.md and CHANGELOG.md
4. **Add version notes**: Include release notes for significant changes
5. **Maintain compatibility**: Keep ES2015+ standard, avoid experimental features

## ❓ Frequently Asked Questions

### General Questions

**Q: Do I need a server to run this?**
A: No! You can deploy to GitHub Pages (free) for weather-only, or Vercel (free) for full calendar features.

**Q: What does this cost to run?**
A: $0! All APIs used have free tiers, and hosting on GitHub Pages or Vercel is free.

**Q: Can I use this with my existing calendar?**
A: Yes! Works with Google Calendar, iCloud, Outlook, and any CalDAV-compatible calendar.

**Q: Will my calendar data be sent to any servers?**
A: Only to Vercel functions (for CORS handling). All calendar credentials are stored locally in your browser.

### Technical Questions

**Q: Why are my calendar times wrong?**
A: Make sure you have the latest version (v3.27.1+) which fixes the CalDAV date range calculation and EST/EDT timezone transitions.

**Q: Can I customize the weather commentary?**
A: Yes! Edit `weather-narrative-engine.js` to modify the 106 built-in weather comments (including 50 R-rated ones!).

**Q: Does this work offline?**
A: Partially. The service worker caches static files, but weather and calendar data require an internet connection.

**Q: Can I add more calendar accounts?**
A: Yes! Up to 3 CalDAV accounts can be configured simultaneously (v3.28.0+). Each account gets a distinct color shown on event cards. Add accounts from the Calendar section in setup.html.

**Q: What tablets work best for this?**
A: Optimized for iPad displays (1080x810), but responsive design works on most tablets and smart displays.

### GitHub Token Management
If you receive a notification that your GitHub Personal Access Token is expiring:
1. **Regenerate**: Click the regeneration link in the GitHub email
2. **Auto-Update**: GitHub automatically updates connected apps (Vercel)
3. **Verify**: Make a test commit to confirm deployment still works
4. **No Manual Entry**: Vercel uses OAuth, so no token entry required

## 📄 License & Credits

**Personal Use License**: This project is designed for personal and family use. Commercial deployment requires permission.

**API Credits**:
- Weather data provided by [OpenWeatherMap](https://openweathermap.org/)
- Tide data courtesy of [NOAA](https://tidesandcurrents.noaa.gov/)
- Solar data from [Sunrise-Sunset API](https://sunrise-sunset.org/)
- Calendar integration via standard CalDAV protocols

**Respect API Terms**: Please follow rate limits and terms of service for all integrated APIs. The application includes built-in throttling and caching to minimize API usage.