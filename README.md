# Family Dashboard - v3.23 Production CalDAV Edition 🏠

A sophisticated, room-readable personal dashboard application designed for always-on displays. Features real-time weather narratives, multi-account calendar integration, and intelligent time-based content switching. Built with modern ES2015+ JavaScript, optimized for 24/7 operation on wall-mounted displays and smart home setups.

## ✨ Key Features

### 📅 Universal Calendar Integration
- **CalDAV Support**: Google Calendar, iCloud, Outlook, and any CalDAV server
- **Multi-Account Management**: Connect personal, work, and family calendars
- **Serverless Backend**: Netlify functions handle authentication and CORS
- **Always-On Reliability**: Basic auth eliminates OAuth token refresh issues
- **Intelligent Fallback**: Shows today's events when tomorrow is empty
- **Room-Readable Display**: Large fonts and high-contrast design for wall displays

### 🌤️ Enhanced Weather System (v3.23)
- **Real-Time Narratives**: AI-powered weather storytelling with personality
- **Context-Aware Display**: "Right Now" vs "Tomorrow" focused layouts
- **Massive Typography**: 60px+ temperatures for room visibility
- **Dynamic Color Themes**: Weather-responsive gradients and high contrast
- **Smart Geocoding**: Auto-detects location with OpenWeatherMap API
- **Hourly Forecasts**: Detailed breakdown with precipitation alerts
- **Dynamic Favicon**: Updates with current weather conditions

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
- **Netlify Functions**: Optional serverless backend for enhanced calendar features
- **Service Worker**: Offline capability and performance optimization
- **LocalStorage Config**: Secure, browser-based configuration management

## 🚀 Quick Start

### Option 1: GitHub Pages (Recommended)
1. **Fork this repository** or download the code
2. **Enable GitHub Pages** in repository settings (Source: main branch)
3. **Visit your site** at `username.github.io/family-dash`
4. **Configure APIs** using the built-in setup interface

### Option 2: Netlify (Enhanced Features)
1. **Deploy to Netlify** for full CalDAV functionality
2. **Serverless functions** handle calendar authentication automatically
3. **Custom domains** and SSL certificates included
4. **Better calendar integration** with CORS handling

### Option 3: Local Development
1. Clone repository: `git clone https://github.com/username/family-dash.git`
2. Serve locally: `python -m http.server 8000` or any static server
3. Open browser: `http://localhost:8000`
4. Configure APIs through the setup interface

## 🔧 Configuration

### Required APIs
- **OpenWeatherMap API Key**: Free tier includes 1,000 calls/day ([Get API Key](https://openweathermap.org/api))
- **Location**: Auto-detected via browser geolocation or manual entry

### Optional Calendar Setup
- **Google Calendar**: Use App Passwords for reliable authentication
- **iCloud Calendar**: Requires app-specific passwords
- **Outlook/Office 365**: Standard account credentials
- **Generic CalDAV**: Any RFC-compliant CalDAV server

### Setup Process
1. Navigate to your deployed dashboard
2. Click "🔧 Setup Configuration" 
3. Enter API credentials and test connections
4. Configure location and timezone preferences
5. Launch your personalized dashboard!

## 🏗️ Architecture & Technical Details

### Application Structure
```
family-dash/
├── 📄 Core Application Files
│   ├── index.html              # Smart entry point with config detection
│   ├── dashboard.html          # Main dashboard interface (v3.23)
│   ├── setup.html              # Comprehensive setup wizard
│   └── test-caldav-debug.html  # CalDAV debugging interface
│
├── ⚡ JavaScript Modules (ES2015+)
│   ├── config.js               # LocalStorage configuration management
│   ├── api-client.js           # Direct external API integration
│   ├── caldav-client.js        # CalDAV client with Netlify proxy
│   └── app-client.js           # Main application logic (1,600+ lines)
│
├── 🔧 Deployment & Services
│   ├── netlify.toml            # Netlify configuration with functions
│   ├── netlify/functions/      # Serverless backend
│   │   └── calendar.js         # CalDAV proxy function (700+ lines)
│   ├── sw.js                   # Service worker for PWA features
│   └── favicon.svg             # Dynamic weather-based favicon
│
└── 🎨 Assets
    ├── functions.png           # Setup interface images
    └── settings.png
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

### v3.23 - Production CalDAV Edition (Current)
- **🔄 Complete CalDAV Overhaul**: Netlify functions eliminate CORS issues
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
- **Check CalDAV Config**: Use `test-caldav-debug.html` for detailed diagnostics
- **Verify Credentials**: Ensure App Password is correctly entered
- **Network Issues**: Check browser Network tab for CORS/connection errors
- **Provider Issues**: Try different CalDAV endpoints if using Google Workspace

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

#### Built-in Debugging
- **CalDAV Debug Tool**: `test-caldav-debug.html` - Comprehensive calendar diagnostics
- **Browser Console**: Press F12 → Console for detailed error logging
- **Setup Interface**: Test all APIs before saving configuration
- **Network Inspector**: Monitor real-time API calls and responses

#### Advanced Troubleshooting
- **LocalStorage Inspector**: Check `Application → Local Storage` in DevTools
- **Service Worker**: `Application → Service Workers` for cache debugging
- **Netlify Functions**: Check function logs for CalDAV proxy issues
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
git clone https://github.com/username/family-dash.git
cd family-dash

# Serve locally (choose one)
python -m http.server 8000
npx serve .
php -S localhost:8000

# Open browser
open http://localhost:8000
```

### Code Structure
- **Modern JavaScript**: ES2015+ throughout, no legacy compatibility
- **Modular Design**: Separate files for configuration, APIs, and UI logic
- **Progressive Enhancement**: Works without JavaScript for basic functionality
- **Responsive CSS**: Mobile-first design with desktop enhancements

### Testing
- **Manual Testing**: Use setup interface to verify all APIs
- **Debug Tools**: Comprehensive logging and error reporting
- **Cross-Browser**: Test on target devices (tablets, smart displays)
- **Performance**: Monitor memory usage during extended operation

## 📄 License & Credits

**Personal Use License**: This project is designed for personal and family use. Commercial deployment requires permission.

**API Credits**: 
- Weather data provided by [OpenWeatherMap](https://openweathermap.org/)
- Tide data courtesy of [NOAA](https://tidesandcurrents.noaa.gov/)
- Solar data from [Sunrise-Sunset API](https://sunrise-sunset.org/)
- Calendar integration via standard CalDAV protocols

**Respect API Terms**: Please follow rate limits and terms of service for all integrated APIs. The application includes built-in throttling and caching to minimize API usage.