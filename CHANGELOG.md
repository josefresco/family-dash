# Changelog

All notable changes to Family Dashboard will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.30.1] - 2026-03-06

### Changed
- **Weather commentary** — removed all R-rated and profanity-containing comments; replaced with family-friendly alternatives
- **Expanded comedian quotes** — added ~13 new clean quotes per weather category from Jerry Seinfeld, Steven Wright, Jim Gaffigan, Kevin Hart, Ellen DeGeneres, Conan O'Brien, Steve Martin, Jay Leno, George Burns, Bob Hope, Kathleen Madigan, Mike Birbiglia, Demetri Martin, and Bob Newhart; dropped Louis C.K.
- Total commentary: 156 quotes across all four categories, now fully family-friendly

---

## [3.30.0] - 2026-03-06

### Added
- **Temperature shift alert pill** — orange "WARM ALERT!" or blue "COLD ALERT!" pill appears below "Later" when any day in the 5-day forecast is ≥15°F warmer or cooler than today's high; hidden when no qualifying shift exists
- **Upcoming Birthdays & Holidays box** — new section in the left column below "This Weekend"; scans next 30 days across all CalDAV accounts via a single range query; detects birthdays, anniversaries, and major holidays by keyword
- **Sunrise / Sunset toggle** — sun pill in weather panel automatically switches from "Sunset: X:XX PM" to "Sunrise: X:XX AM" after sunset each day

### Changed
- **Temperature font** — increased from 72px → 96px (today panel) for maximum wall-display readability
- **Condition label removed** — one-word weather description next to temperature removed; forecast detail lives in narrative box
- **"Later" box** — replaced structured high/low/wind/humidity data with a single plain-English sentence (e.g. "Later it will be warm and rainy."); repositioned below the narrative box; hidden in tomorrow mode
- **Calendar name on event cards** — account label or calendar name shown in small light grey text (11px) on the right side of each event's time row
- **Panel headers cleaned up** — removed emoji icons from "RIGHT NOW", "TOMORROW", and the sunset/sunrise pill
- **`api-client.js`** — `processCurrentWeatherWithForecast()` now extracts `upcoming_daily_highs` from the 5-day forecast list and includes it in the weather data payload
- **`api/calendar.js`** — new `upcoming-30` dateParam mode: 30-day CalDAV time window, events returned sorted rather than filtered to a single day
- **`caldav-client.js`** — new `getUpcomingSpecialEvents()` method fans out the `upcoming-30` query across all accounts

### Fixed
- **VALARM parsing bug** — `SUMMARY:Alarm notification` inside `BEGIN:VALARM` blocks was overwriting the actual event title; parser now skips all lines inside VALARM, VTODO, VJOURNAL, and VFREEBUSY sub-components
- **Personal Gmail CalDAV 401** — `apidata.googleusercontent.com` rejects App Passwords for personal Gmail; backend now tries `calendar.google.com` and `www.google.com/calendar/dav` as fallbacks
- **Setup App Password instructions** — updated with direct link to `myaccount.google.com/apppasswords`, removed outdated "Select Mail" step, added explicit 401 guidance

---

## [3.29.0] - 2026-03-06

### Added
- **Extreme weather alert system** — full-screen overlay when severe conditions are detected:
  - **Orange** (Warning): thunderstorm, freezing rain, high winds ≥ 35 mph, heat ≥ 100°F, cold ≤ 0°F
  - **Red** (Severe): severe thunderstorm, blizzard, hail, winds ≥ 50 mph, heat ≥ 105°F, cold ≤ −10°F
  - **Animated rainbow** (Extreme): tornado or hurricane warning, winds ≥ 73 mph
  - Alternates between full-screen warning and normal dashboard on a 15-minute cycle with countdown timer
  - Alert clears automatically when weather data no longer meets thresholds

### Changed
- **Sunset time** — upgraded from tiny absolute-positioned badge (14px) to a prominent inline pill below the panel header (18px, bold, dark background)
- **Temperature font** — increased from 48px → 72px (today) and 36px → 60px (tomorrow); ultra-light weight for clean readability
- **"Later Today" box** — expanded from 2 data points to 4: high/low temps, wind speed, humidity, and precipitation hours; font increased from 14px → 17px with dedicated header
- **Forecast/commentary split** — weather narrative now renders in two visually distinct sections:
  - Forecast text in **dark blue** (`#1a237e`) — serious, factual
  - R-rated commentary in **deep red** (`#b71c1c`) italic — clearly separated humor
- **Weather icon removed** — eliminated the large 60–70px emoji icon above the temperature (redundant with the colored background theme)
- `weather-narrative-engine.js` — added `createTodayNarrativeParts()` and `createWeatherNarrativeParts()` returning `{ forecast, commentary }` objects

---

## [3.28.1] - 2026-03-06

### Added
- **50 comedian-inspired weather comments** — 156 total (up from 106), across all four weather categories:
  - Sunny outdoor: 28 → 41 comments (+13)
  - Cloudy outdoor: 22 → 34 comments (+12)
  - Rainy indoor: 29 → 42 comments (+13)
  - Cold indoor: 27 → 39 comments (+12)
- Comedians represented: George Carlin, Richard Pryor, Robin Williams, Rodney Dangerfield, Joan Rivers, Bill Burr, Dave Chappelle, John Mulaney, Norm Macdonald, Mitch Hedberg, Amy Schumer, Wanda Sykes, Don Rickles, Anthony Jeselnik, Sarah Silverman, Jeff Ross, Phyllis Diller, Henny Youngman

---

## [3.28.0] - 2026-03-06

### Added
- **Multi-account CalDAV support** — connect up to 3 calendar accounts simultaneously (Google Workspace, Gmail, iCloud, Outlook, or any generic CalDAV server)
  - New storage key `dashboard-caldav-accounts` replaces `dashboard-caldav-config`
  - Automatic one-time migration: existing single-account config is silently converted on first load; old key deleted
  - Each account gets a distinct color from a 6-color palette (`#4285f4`, `#ea4335`, `#34a853`, `#ff9800`, `#9c27b0`, `#00bcd4`)
  - Optional account label field (e.g. "Work", "Personal") displayed in the accounts list and on event cards
- **Generic CalDAV server support** — `api/calendar.js` now handles the `generic` provider using the `customEndpoint` URL sent from the client; returns a descriptive 400 if endpoint is missing
- **Accounts management UI** in `setup.html` — colored account cards with per-account Test and Remove buttons; "Add Account" button disables at the 3-account limit with an inline message; "Skip" button correctly restores when all accounts are removed

### Changed
- `caldav-client.js` rewritten around `this.accounts[]` array instead of a single `this.credentials` object
  - `isConfigured` is now a computed getter (`accounts.length > 0`)
  - `getCalendarEvents()` fans out via `Promise.allSettled()` — partial failures (one bad account) do not block events from working accounts
  - `getConfigStatus()` returns `accounts[]` array for UI rendering
  - `saveConfig()` kept as a legacy no-op wrapper (called internally during connection testing only)
- `caldav-client.js` → `_fetchAccountEvents()` now includes `customEndpoint` in the POST body so generic CalDAV accounts reach the correct server
- `app-client.js` → `initializeCalDAV()` sets `activeCalendarClient` before the connection test — a failed test no longer blocks all calendar fetches
- `app-client.js` → `loadEventsForDate()` date filter now uses `toLocaleDateString('en-CA', { timeZone })` consistently for both the target date and event date comparison, eliminating timezone mismatch when browser locale differs from configured timezone; all-day events (plain `YYYY-MM-DD` start) are compared directly without `Date` parsing
- `setup.html` → account cards HTML-escaped (`escapeHtml()` helper) before insertion into `innerHTML`
- Removed ~20 per-event debug `console.log` calls from `renderMultiAccountCalendar` and `loadEventsForDate` that fired on every refresh cycle

### Fixed
- **Account colors**: per-account colors (`COLOR_PALETTE`) now correctly reach `renderMultiAccountCalendar` and `renderWeekendEvents` — previously all events rendered with the API's hardcoded `#4285f4` regardless of account
- **Test connection wipes accounts**: `testCalDAVConnection()` in setup.html previously called `saveConfig()` which cleared all saved accounts before testing; it now POSTs directly to `/api/calendar` without touching client state
- **Skip button stuck hidden**: removing the last calendar account now correctly restores the "Skip Calendar Setup" button
- **XSS in account cards**: user-supplied label and username values are now HTML-escaped before rendering
- **Generic CalDAV**: selecting the `generic` provider no longer returns `400 Unsupported provider` from the Vercel function

---

## [3.27.4] - 2026-03-06

### Changed
- **Hosting migration**: CalDAV proxy function migrated from Netlify to Vercel
  - `netlify/functions/calendar.js` → `api/calendar.js` (Vercel `(req, res)` handler format)
  - `caldav-client.js` proxy URL updated from `/.netlify/functions/calendar` to `/api/calendar`
  - `vercel.json` simplified (Vercel auto-discovers the `api/` directory)
- **Removed**: `netlify.toml`, `netlify/` directory

---

## [3.27.3] - 2026-03-06

### Changed
- **Location input**: Replaced city + state fields with a single ZIP code field in setup
  - Geolocation auto-detect kept; on success it now populates the ZIP field via Nominatim reverse geocode
  - Falls back gracefully to manual entry on locked-down devices (e.g. iPads with restricted location permissions)
  - ZIP validation: must be exactly 5 digits before saving
- **Geocoding**: `geocodeLocation()` now uses OpenWeatherMap `/geo/1.0/zip` endpoint instead of `/geo/1.0/direct`
- **Tide station selection**: Uses ZIP prefix (`026xx` = Cape Cod) instead of city/state string matching
- **Config**: `location.zip` replaces `location.city` and `location.state` — existing users will be prompted to re-enter their ZIP on next setup visit

---

## [3.27.2] - 2026-03-06

### Removed
- **Repository cleanup** - Removed 19 AI-generated/artifact files that accumulated from agent sessions:
  - 14 stale markdown reports (optimization reports, PR descriptions, release notes, test file)
  - 4 build artifacts and debug files (`lighthouse-report-optimized.report.html`, `test-caldav-debug.html`, `dashboard-bundled.html`, `optimize-images.js`)
  - `PERFORMANCE_SUMMARY.txt` (point-in-time audit output)

### Fixed
- **README**: Removed broken references to deleted files, updated troubleshooting links to point to `setup.html` debug tools

---

## [3.27.1] - 2026-03-06

### Fixed
- **CalDAV date range calculation** - Events from the previous evening (e.g. 7 PM) no longer bleed into the next day's view
  - Root cause: `new Date(toLocaleString(..., {timeZone: "America/New_York"}))` produced a UTC timestamp 4–5 hours off because JS interprets the Eastern wall-clock string as UTC
  - Fix: use `toLocaleDateString('en-CA', { timeZone: 'America/New_York' })` to get a plain `YYYY-MM-DD` string, then compute exact UTC midnight by adding the Eastern offset (5 h EST / 4 h EDT)
  - Tomorrow calculation now uses DST-safe integer day arithmetic (`Date.UTC(y, m-1, d+1)`)
  - Added post-query filter that verifies every timed event falls on the correct Eastern date as a second layer of defence

---

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
