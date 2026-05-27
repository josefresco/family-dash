# Family Dashboard - v3.32.0 🏠

A room-readable personal dashboard for always-on wall-mounted displays. Shows real-time weather with narrative commentary, Google Calendar events across multiple accounts, upcoming birthdays & holidays, and weekend previews. Built with vanilla JS, self-hosted on a Raspberry Pi.

---

## 🎉 Latest Updates

### New Release (v3.32.0) - CalDAV Calendar Discovery
- **Full calendar collection discovery**: the server now performs a 3-step PROPFIND chain (current-user-principal → calendar-home-set → collection list) so all calendars in an account are queried — including events you've been invited to from other people's calendars, shared calendars, and secondary calendars
- **Parallel collection fetch**: all discovered collections are queried concurrently; results are merged and deduplicated by UID
- **Graceful fallback**: if discovery fails, the previous hardcoded primary-URL behavior is used unchanged

### Previous Release (v3.31.6) - Documentation Corrections
- **Accurate comment count**: `weather-narrative-engine.js` now correctly documented as 56 comments (was incorrectly listed as 156)
- **Feature list corrected**: comedian quotes were removed in a prior release; Key Features now reads "weather commentary" instead of "comedian commentary"
- **Version reference fix**: "Previous Release v3.30.2" corrected to v3.30.1 (v3.30.2 never existed)

### Previous Release (v3.31.5) - Weather Summary Contrast Fix
- **High-contrast summary panels**: weather summary and "Later today" panels now always white with black text (`#111111`/`#333333`), regardless of weather theme color

### Previous Release (v3.31.4) - Weather Panel Polish
- **No floating weather card**: weather content sits directly on the body gradient — no visible panel border or shadow
- **Calendar panel**: white background retained for readability

### Previous Release (v3.31.0) - Self-Hosted, Private
- **Raspberry Pi hosting**: Express.js server replaces Vercel deployment
- **Server-side credentials**: weather API key and Google App Passwords in server `.env` — never exposed in browser
- **HTTP Basic Auth**: shared family password required on first visit
- **Vercel removed**: self-hosting required; users must run their own instance

### Previous Release (v3.30.1) - Clean Weather Commentary
- **Family-friendly quotes**: replaced R-rated content with clean, family-friendly weather commentary
- **Expanded comedian roster**: added quotes from Jerry Seinfeld, Steven Wright, Jim Gaffigan, Kevin Hart, and others; dropped Louis C.K.

### Previous Release (v3.30.0) - Weather & Calendar Intelligence
- **Temperature Shift Alert**: "WARM ALERT!" / "COLD ALERT!" pill when any forecast day swings ≥15°F from today
- **Upcoming Birthdays & Holidays**: scans 30 days across all accounts, detects birthdays, anniversaries, holidays
- **Sunrise / Sunset Toggle**: sun pill switches automatically after dark
- **96px temperature**: maximum across-the-room readability
- **Plain-English "Later" sentence**: replaces raw high/low/wind/humidity data
- **Calendar account name**: shown in grey on each event card
- **Gmail CalDAV fix**: 401 errors resolved with fallback endpoint chain
- **VALARM bug fixed**: alarm sub-component fields no longer overwrite event titles

[See complete version history below](#-version-history--evolution)

---

## ✨ Key Features

- **Multi-Account CalDAV**: up to 3 Google Calendar (or other CalDAV) accounts simultaneously, each with a distinct color
- **Weather Narratives**: condition-matched color themes, narrative forecast, weather commentary, extreme weather alerts
- **Weekend Preview**: dedicated Saturday/Sunday event section
- **Birthdays & Holidays**: 30-day lookahead across all calendar accounts
- **Time-Based Switching**: automatically shows tomorrow's view after 5 PM Eastern
- **HTTP Basic Auth**: private — requires shared family password
- **PWA**: installable as a native app with service worker

---

## 🚀 Self-Hosting (Required)

This app requires a Node.js server. There is no Vercel or GitHub Pages option — credentials are kept server-side.

### Prerequisites
- Node.js v18+
- An [OpenWeatherMap API key](https://openweathermap.org/api) (free tier)
- Google App Passwords for each Google Calendar account (requires 2FA enabled)

### Setup

```bash
git clone https://github.com/josefresco/family-dash.git
cd family-dash
npm install
```

Create `.env` from the provided template:

```bash
cp .env.example .env
nano .env
```

`.env` variables:

```env
# Dashboard login (HTTP Basic Auth)
DASHBOARD_USERNAME=family
DASHBOARD_PASSWORD=yourpassword

# Weather
OPENWEATHER_API_KEY=your_key_here

# Location
LOCATION_ZIP=02601
LOCATION_TIMEZONE=America/New_York

# CalDAV accounts (repeat block, numbered 1..3)
CALDAV_1_LABEL=Alice
CALDAV_1_PROVIDER=google
CALDAV_1_USERNAME=alice@gmail.com
CALDAV_1_PASSWORD=xxxx xxxx xxxx xxxx
CALDAV_1_COLOR="#4285f4"

CALDAV_2_LABEL=Bob
CALDAV_2_PROVIDER=google
CALDAV_2_USERNAME=bob@gmail.com
CALDAV_2_PASSWORD=xxxx xxxx xxxx xxxx
CALDAV_2_COLOR="#ea4335"
```

> **Important:** hex color values must be quoted — an unquoted `#` is treated as a comment by dotenv.

Start the server:

```bash
npm start
# Running on http://127.0.0.1:3003
```

Visit `http://localhost:3003` — you'll be prompted for the username and password from `.env`.

### Production (nginx + PM2)

```bash
# Start and persist with PM2
pm2 start server.js --name family-dash
pm2 save

# nginx reverse proxy (HTTPS)
# See /etc/nginx/sites-available/dash for example config
# TLS via: sudo certbot certonly --nginx -d yourdomain.com
```

---

## 🔧 Configuration

All config lives in `.env` on the server. There is no browser-based setup UI.

### Google Calendar App Passwords
1. Enable 2-factor authentication on your Google account
2. Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
3. Create an app password for "Mail" or "Other"
4. Use that 16-character password as `CALDAV_N_PASSWORD` in `.env`

### Supported CalDAV Providers
- **Google** (`provider=google`) — uses `https://apidata.googleusercontent.com/caldav/v2/`
- **iCloud** (`provider=icloud`) — uses `https://caldav.icloud.com/`
- **Generic** (`provider=generic`) — requires a full CalDAV URL as username

---

## 🏗️ Architecture

```
browser (HTTP Basic Auth)
    ↓
server.js  (Express, port 3003)
    ├── GET  /api/config      → weather key + account labels/colors (no passwords)
    ├── POST /api/calendar    → CalDAV proxy (credentials from .env by accountId)
    └── static files         → dashboard.html, app-client.js, etc.
```

**Credential flow**: the client never handles passwords. It sends only `accountId` to `/api/calendar`; the server looks up credentials from `.env` by index.

### Files
```
family-dash/
├── server.js                      # Express entry point
├── .env                           # Secrets (gitignored)
├── .env.example                   # Template
├── dashboard.html                 # Main dashboard UI
├── app-client.js                  # Weather + calendar rendering
├── caldav-client.js               # CalDAV fan-out (sends accountId only)
├── config.js                      # Fetches /api/config on init
├── api-client.js                  # OpenWeatherMap API
├── api/calendar.js                # CalDAV proxy route
├── weather-narrative-engine.js    # 56 weather comments
├── logger.js / error-handler.js / date-utils.js
└── sw.js                          # Service worker (PWA)
```

---

## ❓ FAQ

**Q: Do I need Vercel or GitHub Pages?**
No. This app runs on a Node.js server — all credentials are server-side. Vercel is not supported.

**Q: Will my calendar passwords be sent to the browser?**
No. The server looks up credentials by account index from `.env`. The browser only ever receives account labels and color values.

**Q: Calendar times are wrong by an hour.**
The ICS parser forces UTC interpretation before applying the Eastern timezone offset. If events are still off, verify `LOCATION_TIMEZONE` is set correctly in `.env`.

**Q: Can I add more than 3 accounts?**
The UI is designed for 3 accounts. You can add `CALDAV_4_*` blocks to `.env` and `server.js` will expose them, but the dashboard layout only shows 3.

**Q: How do I update?**
```bash
git pull
npm install
pm2 restart family-dash
```

---

## 🔧 Troubleshooting

**Calendar not loading**
- Check PM2 logs: `pm2 logs family-dash`
- Verify App Password is correct (no spaces, 16 chars)
- Confirm `CALDAV_N_USERNAME` is the full email address
- Test: `curl -u family:password http://localhost:3003/api/config`

**Weather not loading**
- Confirm `OPENWEATHER_API_KEY` is set in `.env`
- Confirm `LOCATION_ZIP` is set
- Restart after `.env` changes: `pm2 restart family-dash`

**Changes to `.env` not taking effect**
- Always restart: `pm2 restart family-dash --update-env`

---

## 📈 Version History & Evolution

### v3.29.0 - Weather UI Overhaul & Alert System
- Extreme weather full-screen overlay (orange/red/animated rainbow)
- Two-color narrative: forecast in dark blue, commentary in deep red italic
- Larger temperatures: 72px (today), 60px (tomorrow)

### v3.28.0 - Multi-Account CalDAV
- Up to 3 CalDAV accounts simultaneously with per-account colors
- Auto-migration from single-account format
- Partial failure resilience (one account down doesn't block others)

### v3.27.4 - Vercel Migration (historical)
- CalDAV proxy migrated from Netlify to Vercel

### v3.27.3 - ZIP Code Location
- Single ZIP field replaces city + state inputs
- OpenWeatherMap zip endpoint for unambiguous geocoding

### v3.27.1 - CalDAV Date Range Fix
- Previous-evening events no longer bleed into next day
- Correct UTC boundaries for EST and EDT

### v3.26 - Code Refactoring
- 4 utility modules: `logger.js`, `error-handler.js`, `date-utils.js`, `weather-narrative-engine.js`
- Doubled weather commentary (54 → 108 comments)

### v3.25 - Weekend Events
- Dedicated Saturday/Sunday preview section
- Sunset time in weather panel

### v3.0–3.24 - Foundation
- GitHub Pages → self-hosted migration
- PWA service worker
- Multi-calendar support
- NOAA tide integration
- Sunrise/sunset data

---

## 📄 License & Credits

Personal use. Commercial deployment requires permission.

- Weather: [OpenWeatherMap](https://openweathermap.org/)
- Tide data: [NOAA](https://tidesandcurrents.noaa.gov/)
- Solar data: [Sunrise-Sunset API](https://sunrise-sunset.org/)
- Calendar: standard CalDAV (RFC 4791)
