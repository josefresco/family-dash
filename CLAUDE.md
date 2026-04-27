# family-dash — Project Instructions for Claude

## Release Workflow (REQUIRED — update docs BEFORE every commit and push)

**This is non-negotiable.** Every code change — no matter how small — must include a version bump and docs update in the SAME commit. Never commit code without updating these files first.

### Files to update on every release:
1. **CHANGELOG.md** — add a new `## [x.y.z] - YYYY-MM-DD` entry at the top with Added / Changed / Fixed sections
2. **README.md** — bump title `# Family Dashboard - vX.Y.Z`, update "Latest Updates" (demote current to "Previous Release", add new entry), update the description line if wording has changed
3. **`package.json`** — bump `"version"`
4. **`sw.js`** — bump `CACHE_NAME` (`dashboard-vX.Y.Z`)
5. **`dashboard.html`** — bump `<title>` and ALL `?v=X.Y` query strings on script/preload tags
6. **`module-loader.js`** — bump `?v=X.Y` query string in `loadCalDAV()`

### Version bump rules:
- `patch` (x.y.**Z**) — bug fixes, copy/content changes, comment edits
- `minor` (x.**Y**.0) — new features, new UI sections, new API support
- `major` (**X**.0.0) — breaking changes or full rewrites

**Do not wait to be asked.** If you pushed code without updating docs, immediately create a follow-up commit with the version bump and doc updates.

## Project Overview

Always-on family dashboard for wall-mounted tablet displays. Self-hosted on Raspberry Pi at `dash.josefresco.com` (HTTP Basic Auth required).

- **Frontend**: `dashboard.html`, `app-client.js`, `caldav-client.js`, `api-client.js`, `config.js`
- **Backend**: `server.js` (Express, port 3003), `api/calendar.js` (CalDAV proxy route)
- **Utility modules**: `weather-narrative-engine.js`, `logger.js`, `error-handler.js`, `date-utils.js`
- **Config**: all secrets in server `.env` — never exposed to the browser. Client receives only non-sensitive config (weather key, account labels/colors) via `GET /api/config`.

## Key Architecture Notes

- **CalDAV credential flow**: client sends only `accountId` to `POST /api/calendar`; server looks up username/password from `.env` by index (`CALDAV_1_*`, `CALDAV_2_*`, etc.)
- **Calendar data flow**: `caldav-client.js` → `Promise.allSettled` fan-out → `POST /api/calendar` per account → merged `calendars[]` returned to `app-client.js` → `renderMultiAccountCalendar()`
- **Server init**: `dashboard.html` load handler is `async`; `await config.loadFromServer()` must complete before any data fetches
- **Timezone**: always use `toLocaleDateString('en-CA', { timeZone: tz })` for date string comparisons. Never use `getDate()` / `getMonth()` for cross-timezone logic.
- **ICS datetime parsing**: `parseICSDateTime()` in `api/calendar.js` appends `Z` to Eastern time strings before `new Date()` to force UTC parsing — prevents double timezone shift on non-UTC servers
- **Colors**: per-account colors come from `CALDAV_N_COLOR` in `.env`; hex values must be quoted (unquoted `#` is treated as a dotenv comment)

## Do Not Modify (without explicit instruction)

- `dashboard.html` layout
- `config.js`
- `server.js` auth and config endpoint structure
- Service worker (`sw.js`) caching strategy

## Commit Message Format

Follow Conventional Commits with `[josefresco]` footer:

```
feat(calendar): add multi-account support

[josefresco]
Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```
