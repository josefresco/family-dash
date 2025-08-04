# Daily Dashboard - v3.7

A responsive personal dashboard application that displays calendar events, weather forecasts, tides, and sunrise/sunset information. Built with modern HTML5, JavaScript, and CSS for GitHub Pages deployment. Features a completely overhauled weather UI with simplified design, room-readable typography, and compelling weather narratives.

## Features

### 📅 Multi-Account Calendar Integration
- Connect multiple Google accounts (personal, work, family)
- Display events from all connected calendars in one unified view
- Automatic OAuth2 token refresh and management
- Room-readable event display with large fonts
- Time-based switching between today and tomorrow's events

### 🌤️ Overhauled Weather UI (v3.2-3.7)
- **Simplified, room-readable design** with large typography (64px+ temps)
- **High-contrast color schemes** optimized for all weather conditions
- **Weather narratives** - compelling summaries from API data
- **Today vs Tomorrow focus** - current conditions vs daily overview
- **API-generated summaries** with temperature ranges and forecasts
- **Fun icons and colors** with weather-responsive gradients
- **Dynamic favicon** updates based on current weather
- **Compact layout** - sunrise, sunset, and tides on single line

### 🌊🌅 Compact Sun & Tide Display
- **Single horizontal line layout** - sunrise, sunset, high/low tides
- High and low tide times from multiple NOAA stations
- **Smart fallback estimation** when NOAA APIs are unavailable
- Automatic Eastern Time timezone handling
- **Responsive grid** - prevents text wrapping (10:45 AM displays properly)
- Configurable for different coastal locations

### 🕐 Smart Time-Based Display
- Shows today's schedule before 5 PM Eastern Time
- Automatically switches to tomorrow's schedule after 5 PM
- **Two-line calendar titles** - prevents date cutoff ("Today's Schedule" / "Monday, August 5th")
- Large, room-readable text optimized for 1024x768 displays
- Responsive grid layout for multiple display sizes

### 🔧 Comprehensive Administrative Tools
- **Real-time admin control panel** with live system monitoring
- **Token diagnostic tools** with detailed OAuth2 analysis
- **Tide station testing suite** with all Cape Cod stations
- **API testing interface** with comprehensive endpoint coverage
- **Cache management tools** for iOS Safari compatibility
- **Error log viewer** with auto-refresh capabilities
- **Performance monitoring** and health checking

## Browser Compatibility

### Modern Browsers (Required)
- **iOS Safari**: 15.7.3+ (Safari 15+)
- **Chrome**: 88+ (ES2015+ support)
- **Firefox**: 78+ (ES2015+ support) 
- **Edge**: 88+ (Chromium-based)
- **Safari**: 15+ (macOS Big Sur+)

### JavaScript Features Used
- **ES2015+ Classes** and modern syntax
- **Async/await** for asynchronous operations
- **Fetch API with AbortController** for request management
- **Promise.allSettled()** for robust error handling
- **Template literals** for dynamic content rendering
- **Destructuring assignment** for clean code
- **Optional chaining** (?.) and **nullish coalescing** (??)

**Note**: This application uses modern JavaScript features for optimal performance and maintainability. Legacy browser support has been removed in favor of enhanced functionality.

## Quick Start

1. **Deploy to GitHub Pages**
   ```bash
   # Fork or clone this repository
   # Enable GitHub Pages in repository settings
   # Set source to main branch
   ```

2. **Configure the application**
   - Navigate to your deployed site (e.g., `username.github.io/daily-dashboard`)
   - Click "Setup Configuration" on the welcome screen
   - Enter your API credentials in the setup form

3. **Get API credentials**
   
   **Google Calendar API:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing
   - Enable Google Calendar API
   - Create OAuth2 credentials (Web application)
   - Add your GitHub Pages domain to authorized origins
   
   **OpenWeatherMap API:**
   - Sign up at [OpenWeatherMap](https://openweathermap.org/api)
   - Get your free API key
   - Enter it in the setup form

4. **Access the dashboard**
   - Complete the setup form with your API keys
   - Click "Go to Dashboard" to view your personal dashboard
   - Use the Setup link in the dashboard to modify configuration

## Deployment Options

### ✅ GitHub Pages Ready
This dashboard is built with modern HTML5, JavaScript, and CSS - **perfect for GitHub Pages deployment**!

### Deployment Options
- **GitHub Pages**: Free hosting with automatic HTTPS
- **Netlify**: Free tier with form handling and custom domains
- **Vercel**: Free deployment with global CDN
- **Any static hosting service**

### GitHub Pages Setup
1. **Fork this repository** to your GitHub account
2. **Enable GitHub Pages** in repository settings
3. **Set source** to main branch
4. **Visit your site** at `username.github.io/repository-name`
5. **Configure APIs** using the setup interface

## File Structure

```
family-dash/
├── index.html                  # Smart entry point with config detection
├── dashboard.html              # Main dashboard interface (v3.7)
├── setup.html                  # API configuration interface with location detection
├── add-account.html           # Google account management interface
├── config.js                   # Configuration management with LocalStorage
├── api-client.js              # Direct API calls with weather narratives
├── auth-client.js             # Browser-based Google OAuth with multi-account
├── app-client.js              # Main application logic (overhauled weather UI)
├── favicon.svg                # Dynamic dashboard chart favicon
├── manifest.json              # PWA manifest for mobile installation
├── sw.js                      # Service worker for offline functionality
├── tokens/                    # Google OAuth token storage directory
└── README.md                  # Documentation (updated v3.7)
```

## Recent Updates

### Version 3.7 - Calendar Title Fix
- **Two-line calendar titles** prevent date cutoff issues
- Better typography with improved font sizes and line height

### Version 3.6 - Text Wrap Fix  
- **No-wrap styling** prevents AM/PM from breaking to new lines
- Ensures clean time display for 4-digit times like "10:45 AM"

### Version 3.5 - Layout Fix
- **Tighter spacing** in sun/tide grid (100px minimum, 6px gaps)
- All 4 cards (sunrise, sunset, high/low tide) fit on single line

### Version 3.4 - Compact Layout
- **Single horizontal line** for all sun/tide information
- Responsive grid with auto-fit columns for optimal spacing

### Version 3.3 - Weather Narratives
- **API-generated weather summaries** with temperature ranges
- **Smart narratives** for today's conditions and tomorrow's forecast
- Enhanced daily summary structure with high/low temps

### Version 3.2 - Weather UI Overhaul
- **Simplified design** - removed complex multi-box layout
- **Room-readable typography** - 64px+ temperatures, 28px+ text
- **High-contrast colors** optimized for all weather conditions  
- **Weather narratives** - compelling daily overviews
- **Today/Tomorrow focus** - current + later vs narrative overview

### Version 3.0 - GitHub Pages Edition
- **Converted from PHP to pure HTML/JavaScript** for GitHub Pages
- **Client-side API integration** with direct external service calls
- **Browser-based Google OAuth** using Google's JavaScript library
- **LocalStorage configuration** replacing server-side config files

## External API Integration

The dashboard connects directly to external APIs from the browser:

### Google Calendar API
- **Service**: Google Calendar API via JavaScript SDK
- **Function**: Retrieves events from connected Google accounts
- **Features**: Multi-account OAuth, automatic token refresh, browser-based authentication

### OpenWeatherMap API
- **Endpoint**: `https://api.openweathermap.org/data/2.5/forecast`
- **Function**: Current conditions and hourly forecasts
- **Features**: Weather-responsive UI, dynamic color schemes, CORS-enabled

### NOAA Tides API
- **Endpoint**: `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter`
- **Function**: Tide data from multiple East Coast stations
- **Features**: Automatic station failover, fallback estimation, New York Harbor focus

### Sunrise-Sunset API
- **Endpoint**: `https://api.sunrise-sunset.org/json`
- **Function**: Solar data with timezone handling
- **Features**: Automatic timezone conversion, weather theme integration

## Configuration

The application uses browser-based LocalStorage for secure configuration management.

### Setup Configuration
1. Navigate to your deployed dashboard
2. Click "Setup Configuration" on the welcome screen
3. Enter your API credentials in the setup form:

**Required:**
- **OpenWeatherMap API Key**: Get from [OpenWeatherMap](https://openweathermap.org/api)
- **Google Client ID**: Get from [Google Cloud Console](https://console.cloud.google.com/)

**Optional:**
- **Location coordinates**: Defaults to New York, NY (40.7128, -74.0060)

### Security
- All configuration stored in browser LocalStorage
- No server-side credential storage required
- Credentials never leave your browser
- Git repository contains no secrets

## Configuration Management

Access configuration tools:
- **Setup Interface**: `setup.html` - API key configuration and testing
- **Dashboard Settings**: Available via "Setup" link in dashboard header
- **Browser DevTools**: Use console for debugging API calls and errors
- **LocalStorage Management**: Clear browser data to reset configuration

## Troubleshooting

### Common Issues
- **No calendar events**: Check Google OAuth setup and permissions in browser console
- **Weather not loading**: Verify OpenWeatherMap API key in setup interface
- **Tide data missing**: NOAA stations may be temporarily unavailable (fallback data will show)
- **Configuration lost**: Check browser LocalStorage and re-run setup if needed
- **CORS errors**: Ensure APIs support cross-origin requests (all integrated APIs do)

### Debug Tools
- **Browser Console**: Check for JavaScript errors and API response details
- **Setup Interface**: Test API credentials before saving configuration
- **Network Tab**: Monitor API calls and responses in browser DevTools

## License

This project is designed for personal use. Please respect API rate limits and terms of service for Google Calendar and OpenWeatherMap APIs.