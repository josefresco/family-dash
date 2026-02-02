# Changelog

All notable changes to Family Dashboard will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.27.0] - 2025-01-24

### Added
- **50 New R-Rated Weather Comments** - Adult humor edition with hilarious, uncensored commentary:
  - Sunny outdoor: +13 spicy comments (15 → 28 total)
  - Cloudy outdoor: +12 sassy comments (10 → 22 total)
  - Rainy indoor: +13 cheeky comments (16 → 29 total)
  - Cold indoor: +12 frosty zingers (15 → 27 total)
- **Total Commentary**: Now 106 unique weather comments (up from 56)
- **Adult Humor**: Weather descriptions that make you laugh and blush

### Changed
- **Updated `weather-narrative-engine.js`** with expanded commentary arrays
- **Funnier Weather Experience**: More variety and entertainment for mature audiences

### Technical Details
- Weather commentary increased by 89% (56 → 106 comments)
- Maintained family-friendly comments alongside new R-rated additions
- Version bumped to 3.27.0 for the "Adults Only Weather" edition

---

## [3.26.0] - 2024-11-13

### Added
- **4 New Utility Modules** for improved code organization:
  - `weather-narrative-engine.js` - Centralized weather commentary with 108 unique comments
  - `logger.js` - Structured logging utility with debug levels (debug, info, warn, error)
  - `date-utils.js` - Centralized date/time operations and timezone handling
  - `error-handler.js` - Centralized error management with retry logic and exponential backoff
- **54 New Weather Comments** - Doubled from 54 to 108 total comments:
  - Sunny outdoor: 18 → 36 comments
  - Cloudy outdoor: 10 → 20 comments
  - Rainy indoor: 16 → 32 comments
  - Cold indoor: 10 → 20 comments
- Debug logging helpers: `enableDebugLogging()`, `enableProductionLogging()`, `disableLogging()`

### Changed
- **Refactored `api-client.js`** to use WeatherNarrativeEngine for weather summaries
- **Refactored `app-client.js`** to use WeatherNarrativeEngine for weather narratives
- **Updated `dashboard.html`** to load new utility modules
- Eliminated code duplication between api-client.js and app-client.js
- Improved error handling with consistent patterns across the application
- Enhanced maintainability with better separation of concerns

### Technical Details
- Added 1,320+ lines of organized utility code
- Removed ~270 lines of duplicate code
- Module loading order: logger → error-handler → date-utils → weather-narrative-engine
- Version bumped to 3.26 for cache busting on new modules

## [3.25.0] - 2024-11-09

### Added
- **Weekend Events Preview** - Dedicated section showing upcoming Saturday/Sunday events
- **Sunset Time Display** - Real-time sunset indicator in weather panel upper corner
- Enhanced responsive design for iPad 1080x810 displays

### Fixed
- **CalDAV Date Handling** - Backend function now properly handles specific date strings (YYYY-MM-DD)
- **All-Day Event Display** - All-day events correctly appear on single day only
- **Date Filtering** - Re-enabled frontend date filtering after backend CalDAV fix

### Changed
- Font size refinements for better fit (weather narrative: 46px → 40px)
- Improved scrolling behavior in weekend events section
- Enhanced contrast and readability

## [3.24.0] - 2024-11-08

### Added
- **Enhanced Setup Interface** with current configuration viewing and editing
- **Comprehensive Debug Tools** for Weather and CalDAV with exportable logs
- **Connection Testing** - Built-in API testing and health verification
- **Step-by-Step Guidance** with provider-specific setup instructions

### Fixed
- **All-Day Event Bug** - Events now display on correct single day only
- **CalDAV Configuration** - Improved management and editing capabilities

### Changed
- **Smart Weather Commentary** - Context-aware activity suggestions (outdoor vs indoor)
- Better error messages and troubleshooting guidance

## [3.23.0] - 2024-11-05

### Added
- **Complete CalDAV Overhaul** using Netlify functions
- **Enhanced Weather Narratives** with personality-driven stories
- **Intelligent Time Switching** with Eastern timezone awareness
- **Advanced CalDAV Debugging** tools and logging

### Changed
- Improved PWA mobile app experience
- Better calendar integration with CORS handling

## [3.20.0 - 3.22.0] - 2024-10-30

### Fixed
- Calendar timezone handling improvements
- API reliability enhancements
- Multiple bug fixes and stability improvements

### Changed
- Performance optimizations for faster loading
- UI refinements and better responsive design
- Improved color schemes

## [3.18.0 - 3.19.0] - 2024-10-25

### Added
- **Wall Display Optimization** for always-on displays
- **Auto-Refresh Logic** with intelligent content updating
- **Weather Personality** - Fun, engaging weather descriptions

## [3.10.0 - 3.17.0] - 2024-10-15

### Added
- **Multi-Calendar Support** - Connect multiple Google accounts
- **Tide Integration** with NOAA API
- **Sunrise/Sunset Data** with automatic timezone handling
- **Setup Wizard** - Comprehensive configuration interface

### Changed
- Improved calendar event rendering
- Better error handling and fallbacks

## [3.0.0 - 3.9.0] - 2024-10-01

### Added
- **GitHub Pages Conversion** from PHP to pure JavaScript
- **PWA Implementation** with service worker
- **LocalStorage Configuration** for secure browser-based settings
- **Modern Design** with complete UI overhaul

### Changed
- Complete rewrite using ES2015+ JavaScript
- Responsive layout for all screen sizes
- Improved accessibility and usability

---

## Version Numbering

Family Dashboard uses semantic versioning:
- **Major** (3.x.x): Breaking changes or major feature additions
- **Minor** (x.26.x): New features, refactoring, non-breaking changes
- **Patch** (x.x.1): Bug fixes and minor improvements

## Links

- [GitHub Repository](https://github.com/josefresco/family-dash)
- [Documentation](README.md)
- [Setup Guide](setup.html)
