# family-dash — Project Instructions for Claude

## Release Workflow (REQUIRED before every push)

Every code change that gets pushed must include:

1. **CHANGELOG.md** — add a new `## [x.y.z] - YYYY-MM-DD` entry at the top with Added / Changed / Fixed sections
2. **README.md** — bump the version number in the `# Family Dashboard - vX.Y.Z` title, add a bullet in "Latest Updates", and add a line in the "Version History" table at the bottom
3. **Version bump rules**:
   - `patch` (x.y.**Z**) — bug fixes, comment additions, copy changes
   - `minor` (x.**Y**.0) — new features, new UI, new API support
   - `major` (**X**.0.0) — breaking changes or full rewrites

Do not wait to be reminded. Update CHANGELOG and README as part of every task, before committing.

## Project Overview

Always-on family dashboard for wall-mounted tablet displays. Deployed on Vercel.

- **Frontend**: `dashboard.html`, `setup.html`, `app-client.js`, `caldav-client.js`, `api-client.js`, `config.js`
- **Backend**: `api/calendar.js` (Vercel serverless function — CalDAV proxy)
- **Utility modules**: `weather-narrative-engine.js`, `logger.js`, `error-handler.js`, `date-utils.js`
- **Config**: stored in `localStorage` — never in code or `.env`

## Key Architecture Notes

- **CalDAV storage key**: `dashboard-caldav-accounts` (array, max 3 accounts). Legacy key `dashboard-caldav-config` is auto-migrated on first load.
- **Calendar data flow**: `caldav-client.js` → `Promise.allSettled` fan-out → `api/calendar.js` per account → merged `calendars[]` returned to `app-client.js` → `renderMultiAccountCalendar()`
- **Timezone**: always use `toLocaleDateString('en-CA', { timeZone: tz })` for date string comparisons. Never use `getDate()` / `getMonth()` for cross-timezone logic.
- **Colors**: per-account colors come from `COLOR_PALETTE` in `caldav-client.js` and are injected as `cal.color` during the fan-out merge — they override the API's hardcoded value.

## Do Not Modify (without explicit instruction)

- `api/calendar.js` structure (Vercel handler format)
- `dashboard.html` layout
- `config.js`
- Service worker (`sw.js`) caching strategy

## Commit Message Format

Follow Conventional Commits with `[josefresco]` footer:

```
feat(calendar): add multi-account support

[josefresco]
Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```
