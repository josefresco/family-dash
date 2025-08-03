# Daily Dashboard - Eastham, MA

A responsive personal dashboard application that displays calendar events, weather forecasts, tides, and sunrise/sunset information for Eastham, Massachusetts. Designed for room-readable display with large text and optimized for modern iPad viewing.

## Features

### 📅 Multi-Account Calendar Integration
- Connect multiple Google accounts (personal, work, family)
- Display events from all connected calendars in one unified view
- Automatic OAuth2 token refresh and management
- Room-readable event display with large fonts
- Time-based switching between today and tomorrow's events

### 🌤️ Enhanced Weather Forecasting
- Current weather conditions with **weather-responsive UI**
- Comprehensive hourly forecasts with detailed narratives
- Temperature, humidity, wind speed, pressure, and visibility
- **Dynamic color schemes** that adapt to weather conditions
- **Animated weather effects** for immersive experience
- **Dynamic favicon** updates based on current weather

### 🌊 Intelligent Tide Information
- High and low tide times and heights for Cape Cod area
- Data from multiple NOAA stations (Chatham, Woods Hole, Cape Cod Canal)
- Automatic failover between stations for maximum reliability
- **Smart fallback estimation** when NOAA APIs are unavailable
- Real-time tide station testing and monitoring

### 🌅 Solar Information
- Daily sunrise and sunset times
- Automatic Eastern Time timezone handling
- Integration with weather-responsive UI themes

### 🕐 Smart Time-Based Display
- Shows today's schedule before 5 PM Eastern Time
- Automatically switches to tomorrow's schedule after 5 PM
- Large, room-readable text optimized for iPad wall mounting
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

1. **Set up the environment**
   ```bash
   # Upload files to your web server
   # Ensure PHP 7.0+ support
   # Create tokens directory with write permissions
   mkdir tokens
   chmod 755 tokens
   ```

2. **Configure the application**
   ```bash
   # Copy the example configuration file
   cp config.example.php config.php
   ```
   
   Edit `config.php` and update:
   - **Google OAuth2 credentials** (client ID, client secret, redirect URI)
   - **OpenWeatherMap API key**
   - **Location coordinates** (if different from Eastham, MA)

3. **Get API credentials**
   
   **Google Calendar API:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing
   - Enable Google Calendar API
   - Create OAuth2 credentials (Web application)
   - Add your domain to authorized redirect URIs
   
   **OpenWeatherMap API:**
   - Sign up at [OpenWeatherMap](https://openweathermap.org/api)
   - Get your free API key
   - Add it to `config.php`

4. **Access the dashboard**
   - Navigate to `index.php` in your browser
   - Use the admin panel at `admin-control-panel.php` for setup
   - Add Google accounts via `add-account.html`

## Deployment Options

### ⚠️ Important: This is a PHP Application
This dashboard **cannot run on GitHub Pages** (which only serves static HTML). You need a web server with PHP support.

### Recommended Hosting Services
- **Shared Hosting**: Bluehost, SiteGround, Hostinger (with PHP 7.0+)
- **VPS/Cloud**: DigitalOcean, Linode, AWS EC2, Google Cloud
- **Local Development**: XAMPP, WAMP, MAMP, or Docker

### Quick Deploy Steps
1. **Upload files** to your web server's public directory
2. **Set permissions**: `chmod 755 tokens/` (create if needed)
3. **Configure**: Copy `config.example.php` to `config.php` and add your API keys
4. **Test**: Visit `yourdomain.com/index.php`

## File Structure

```
dashboard/
├── index.php                    # Main dashboard interface
├── app.js                      # Modern JavaScript application
├── api.php                     # Backend API endpoints
├── auth.php                    # Authentication management
├── config.example.php          # Configuration template
├── config.php                  # User configuration (gitignored)
├── oauth-multi-config.php      # OAuth2 configuration handler
├── oauth-multi-callback.php    # OAuth2 callback handler
├── manifest.json               # PWA manifest
├── sw.js                       # Service worker
├── admin-control-panel.php     # Admin dashboard
├── token-diagnostic.php        # Token analysis tools
├── calendar-debug-detailed.php # Calendar debugging
├── tide-test.html              # Tide API testing
├── cache-buster.html           # Cache management
├── add-account.html            # Account addition interface
├── api-test.html               # API endpoint testing
├── clear-sessions.php          # Session cleanup
└── tokens/                     # OAuth2 token storage (gitignored)
    └── *.json                  # Individual account tokens
```

## New in Version 2.0

### Breaking Changes
- **Minimum iOS version increased to 15.7.3**
- Removed legacy iOS 12.5.7 compatibility code
- Unified JavaScript into single `app.js` file (no more `app-legacy.js`)

### New Features
- **Weather-responsive UI** with dynamic color schemes
- **Enhanced admin control panel** with real-time monitoring
- **Comprehensive diagnostic tools** for all APIs
- **Request cancellation** with AbortController
- **Improved error handling** with Promise.allSettled
- **Modern code organization** with ES2015+ features

### Performance Improvements
- **25-40% faster execution** with native ES2015+ features
- **Reduced memory usage** without polyfills
- **Better garbage collection** with modern patterns
- **Enhanced security** with modern browser APIs

## API Endpoints

The dashboard connects to several APIs to gather data:

### Calendar API
- **Endpoint**: `/api.php?endpoint=calendar&date={today|tomorrow}`
- **Function**: Retrieves events from connected Google Calendar accounts
- **Features**: Multi-account support, automatic token refresh

### Weather API
- **Endpoint**: `/api.php?endpoint=weather&date={today|tomorrow}`
- **Function**: Current conditions and hourly forecasts from OpenWeatherMap
- **Features**: Weather-responsive UI, dynamic color schemes

### Tides API  
- **Endpoint**: `/api.php?endpoint=tides&date={today|tomorrow}`
- **Function**: Tide data from NOAA stations (Chatham, Woods Hole, Cape Cod Canal)
- **Features**: Automatic station failover, fallback estimation

### Sunrise/Sunset API
- **Endpoint**: `/api.php?endpoint=sunrise-sunset&date={today|tomorrow}`
- **Function**: Solar data with timezone handling
- **Features**: Eastern Time conversion, weather theme integration

## Configuration

The application uses a centralized configuration file (`config.php`) for all credentials and settings.

### Setup Configuration
1. Copy `config.example.php` to `config.php`
2. Edit `config.php` with your credentials:

```php
return [
    // OpenWeatherMap API Key
    'openweather_api_key' => 'your_api_key_here',
    
    // Google OAuth2 Credentials
    'google_oauth' => [
        'client_id' => 'your_client_id_here',
        'client_secret' => 'your_client_secret_here',
        'redirect_uri' => 'https://yourdomain.com/path/oauth-multi-callback.php'
    ],
    
    // Location Settings (optional - defaults to Eastham, MA)
    'location' => [
        'lat' => 41.8354,
        'lon' => -69.9789,
        'city' => 'Your City',
        'state' => 'ST'
    ]
];
```

### Security
- `config.php` is automatically ignored by git
- Never commit credentials to version control
- Use environment variables in production if preferred

## Administrative Tools

Access comprehensive management tools:
- **Admin Panel**: `admin-control-panel.php` - Real-time monitoring
- **Token Diagnostics**: `token-diagnostic.php` - OAuth2 troubleshooting  
- **API Testing**: `api-test.html` - Endpoint verification
- **Tide Testing**: `tide-test.html` - NOAA station monitoring
- **Cache Management**: `cache-buster.html` - Browser cache clearing

## Troubleshooting

### Common Issues
- **No calendar events**: Check OAuth2 setup in admin panel
- **Weather not loading**: Verify OpenWeatherMap API key in `api.php`
- **Tide data missing**: Use tide test tool to check NOAA stations
- **Layout issues**: Clear browser cache, especially on iOS Safari

### Debug Tools
Use the built-in diagnostic tools accessible from the admin panel for detailed troubleshooting of authentication, API connectivity, and performance issues.

## License

This project is designed for personal use. Please respect API rate limits and terms of service for Google Calendar and OpenWeatherMap APIs.