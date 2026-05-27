// CalDAV calendar proxy — Express route handler
// Credentials are loaded from server environment variables, never sent by the client

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');

  try {
    const body = req.body || {};
    const { accountId, dateParam = 'today' } = body;

    console.log('Calendar request:', { accountId, dateParam });

    if (!accountId) {
      res.status(400).json({ error: 'Missing required field: accountId' });
      return;
    }

    const idx = accountId.replace('acc_', '');
    const username = process.env[`CALDAV_${idx}_USERNAME`];
    const password = process.env[`CALDAV_${idx}_PASSWORD`];
    const provider = process.env[`CALDAV_${idx}_PROVIDER`] || 'google';
    const customEndpoint = process.env[`CALDAV_${idx}_CUSTOM_ENDPOINT`] || '';

    console.log('Calendar request:', { provider, username: username ? 'provided' : 'missing', dateParam });

    if (!provider || !username || !password) {
      res.status(400).json({ error: `No credentials configured for account ${accountId}` });
      return;
    }

    // CalDAV provider endpoints
    const providers = {
      google: {
        name: 'Google Calendar',
        endpoint: 'https://apidata.googleusercontent.com/caldav/v2/',
        workspaceEndpoint: 'https://calendar.google.com/calendar/dav/'
      },
      apple: {
        name: 'Apple iCloud',
        endpoint: 'https://caldav.icloud.com/'
      },
      outlook: {
        name: 'Microsoft Outlook',
        endpoint: 'https://outlook.office365.com/owa/calendar/'
      },
      generic: {
        name: 'Generic CalDAV Server',
        endpoint: ''
      }
    };

    const providerConfig = providers[provider];
    if (!providerConfig) {
      res.status(400).json({ error: `Unsupported provider: ${provider}` });
      return;
    }

    if (provider === 'generic' && !customEndpoint) {
      res.status(400).json({ error: 'Custom endpoint URL is required for generic CalDAV servers' });
      return;
    }

    // Build CalDAV URL
    let caldavUrl = providerConfig.endpoint;
    switch (provider) {
      case 'google':
        const isWorkspaceAccount = !username.endsWith('@gmail.com') && !username.endsWith('@googlemail.com');
        if (isWorkspaceAccount) {
          console.log('Detected Google Workspace account, using workspace endpoint');
          caldavUrl = providerConfig.workspaceEndpoint + `${username}/events/`;
        } else {
          console.log('Detected Gmail account, using standard endpoint');
          caldavUrl += `${username}/events/`;
        }
        break;
      case 'apple':
        const appleUser = username.split('@')[0];
        caldavUrl += `${appleUser}/calendars/`;
        break;
      case 'outlook':
        caldavUrl += `${username}/`;
        break;
      case 'generic':
        caldavUrl = customEndpoint;
        break;
    }

    console.log('CalDAV URL (masked):', caldavUrl.replace(username, '[username]'));

    // Calculate date range - use Eastern timezone for proper date boundaries
    const now = new Date();
    console.log('Server UTC time:', now.toISOString());

    const easternTodayStr = now.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
    console.log('Current Eastern date:', easternTodayStr);

    let targetEasternDateStr;
    let isRangeQuery = false;

    if (dateParam === 'tomorrow') {
      const [y, m, d] = easternTodayStr.split('-').map(Number);
      targetEasternDateStr = new Date(Date.UTC(y, m - 1, d + 1)).toISOString().split('T')[0];
    } else if (dateParam === 'today') {
      targetEasternDateStr = easternTodayStr;
    } else if (dateParam === 'upcoming-30') {
      targetEasternDateStr = easternTodayStr;
      isRangeQuery = true;
    } else if (dateParam.match(/^\d{4}-\d{2}-\d{2}$/)) {
      console.log('Processing specific date string:', dateParam);
      targetEasternDateStr = dateParam;
    } else {
      console.log('Unknown date parameter, defaulting to today:', dateParam);
      targetEasternDateStr = easternTodayStr;
    }

    console.log('Target Eastern date:', targetEasternDateStr, isRangeQuery ? '(30-day range)' : '');

    const targetNoonUTC = new Date(targetEasternDateStr + 'T12:00:00Z');
    const easternOffsetHours = isEDT(targetNoonUTC) ? 4 : 5;

    const startOfDayUTC = new Date(
      new Date(targetEasternDateStr + 'T00:00:00Z').getTime() + easternOffsetHours * 3600000
    );

    const [ty, tm, td] = targetEasternDateStr.split('-').map(Number);
    const windowDays = isRangeQuery ? 31 : 1;
    const windowEndDateStr = new Date(Date.UTC(ty, tm - 1, td + windowDays)).toISOString().split('T')[0];
    const queryEndUTC = new Date(
      new Date(windowEndDateStr + 'T12:00:00Z').getTime() + easternOffsetHours * 3600000
    );

    const startTimeUTC = formatDateForCalDAV(startOfDayUTC);
    const endTimeUTC = formatDateForCalDAV(queryEndUTC);

    console.log('Date range for CalDAV query (Eastern timezone aware):');
    console.log('  Date parameter:', dateParam);
    console.log('  Target Eastern date:', targetEasternDateStr);
    console.log('  Eastern offset:', `UTC-${easternOffsetHours}`, isEDT(targetNoonUTC) ? '(EDT)' : '(EST)');
    console.log('  Start UTC:', startTimeUTC, '=', startOfDayUTC.toISOString());
    console.log('  End UTC:', endTimeUTC);

    // CalDAV REPORT request body
    const reportBody = `<?xml version="1.0" encoding="utf-8" ?>
<C:calendar-query xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
  <D:prop>
    <D:getetag />
    <C:calendar-data />
  </D:prop>
  <C:filter>
    <C:comp-filter name="VCALENDAR">
      <C:comp-filter name="VEVENT">
        <C:time-range start="${startTimeUTC}" end="${endTimeUTC}"/>
      </C:comp-filter>
    </C:comp-filter>
  </C:filter>
</C:calendar-query>`;

    const authHeader = 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');

    const reportHeaders = {
      'Authorization': authHeader,
      'Content-Type': 'application/xml; charset=utf-8',
      'Depth': '1'
    };

    // === Step 1: Primary calendar fetch (existing behavior, always runs first) ===
    const primaryFallbackUrls = [caldavUrl];
    if (provider === 'google') {
      const isGmail = username.endsWith('@gmail.com') || username.endsWith('@googlemail.com');
      if (isGmail) {
        primaryFallbackUrls.push(
          `https://calendar.google.com/calendar/dav/${username}/events/`,
          `https://calendar.google.com/calendar/dav/${username}/user/`,
          `https://www.google.com/calendar/dav/${username}/events/`,
          `https://apidata.googleusercontent.com/caldav/v2/${username}/user/`
        );
      } else {
        primaryFallbackUrls.push(
          providerConfig.workspaceEndpoint + `${username}/user/`,
          `https://apidata.googleusercontent.com/caldav/v2/${username}/events/`,
          providerConfig.workspaceEndpoint + `${username}/`,
          providerConfig.workspaceEndpoint + `${username.split('@')[0]}/events/`
        );
      }
    }

    let xmlData = '';
    let lastError;

    for (const url of primaryFallbackUrls) {
      console.log(`Making CalDAV REPORT request to: ${url.replace(username, '[username]')}`);
      try {
        const response = await fetch(url, { method: 'REPORT', headers: reportHeaders, body: reportBody });
        console.log(`CalDAV response status for ${url.replace(username, '[username]')}: ${response.status}`);
        if (response.ok) {
          console.log(`CalDAV connection succeeded: ${url.replace(username, '[username]')}`);
          xmlData = await response.text();
          break;
        } else {
          lastError = await response.text();
          console.log(`Failed with ${url.replace(username, '[username]')}: ${response.status}`);
        }
      } catch (err) {
        console.error(`Network error with ${url.replace(username, '[username]')}:`, err.message);
        lastError = err.message;
      }
    }

    if (!xmlData) {
      console.error('All CalDAV endpoints failed');
      res.status(502).json({
        error: 'CalDAV request failed: All endpoints failed',
        details: lastError ? lastError.substring(0, 200) : 'No additional details',
        attempted_urls: primaryFallbackUrls.length
      });
      return;
    }

    // Parse primary calendar events
    let allEvents = parseCalDAVResponseWithDebug(xmlData).events;
    console.log('CalDAV response length:', xmlData.length);
    console.log('CalDAV raw response (first 1000 chars):', xmlData.substring(0, 1000));
    console.log('Primary calendar events:', allEvents.length);

    // === Step 2: Calendar discovery — query additional collections (invited/shared calendars) ===
    console.log('Discovering additional calendar collections...');
    const discoveredCollections = await discoverCalendarCollections(caldavUrl, authHeader);

    // Filter out any URLs already covered by the primary fetch to avoid double-counting
    const extraCollections = discoveredCollections.filter(({ url }) => {
      const norm = url.replace(/\/$/, '');
      return !primaryFallbackUrls.some(pu => pu.replace(/\/$/, '') === norm);
    });

    if (extraCollections.length > 0) {
      console.log(`Querying ${extraCollections.length} additional collection(s)...`);
      const extraResults = await Promise.allSettled(
        extraCollections.map(async ({ url, name }) => {
          console.log(`REPORT → "${name}" (${url.replace(username, '[username]')})`);
          const resp = await fetch(url, { method: 'REPORT', headers: reportHeaders, body: reportBody });
          if (!resp.ok) throw new Error(`${resp.status} ${resp.statusText}`);
          return { name, xml: await resp.text() };
        })
      );

      for (const r of extraResults) {
        if (r.status === 'fulfilled') {
          const { name, xml } = r.value;
          console.log(`  "${name}": ${xml.length} bytes`);
          allEvents.push(...parseCalDAVResponseWithDebug(xml).events);
        } else {
          console.log(`  Extra collection REPORT failed: ${r.reason?.message}`);
        }
      }
    }

    // Deduplicate events by UID across all collections
    const events = deduplicateByUid(allEvents);

    console.log('CalDAV response length:', xmlData.length);
    console.log('CalDAV raw response (first 1000 chars):', xmlData.substring(0, 1000));
    console.log('Parsed events (all collections, deduplicated):', events.length);

    if (events.length === 0) {
      console.log('No events parsed - checking XML structure...');
      console.log('XML contains VEVENT:', xmlData.includes('BEGIN:VEVENT'));
      console.log('XML contains calendar-data:', xmlData.includes('calendar-data'));
      console.log('XML contains error:', xmlData.toLowerCase().includes('error'));

      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - 3);
      weekStart.setHours(0, 0, 0, 0);

      const weekEnd = new Date(now);
      weekEnd.setDate(now.getDate() + 4);
      weekEnd.setHours(23, 59, 59, 999);

      const weekStartUTC = formatDateForCalDAV(weekStart);
      const weekEndUTC = formatDateForCalDAV(weekEnd);

      const broadReportBody = `<?xml version="1.0" encoding="utf-8" ?>
<C:calendar-query xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
  <D:prop>
    <D:getetag />
    <C:calendar-data />
  </D:prop>
  <C:filter>
    <C:comp-filter name="VCALENDAR">
      <C:comp-filter name="VEVENT">
        <C:time-range start="${weekStartUTC}" end="${weekEndUTC}"/>
      </C:comp-filter>
    </C:comp-filter>
  </C:filter>
</C:calendar-query>`;

      try {
        const broadResponse = await fetch(caldavUrl, {
          method: 'REPORT',
          headers: reportHeaders,
          body: broadReportBody
        });

        if (broadResponse.ok) {
          const broadXmlData = await broadResponse.text();
          const broadEvents = parseCalDAVResponse(broadXmlData);
          console.log(`Broad query found ${broadEvents.length} events in 7-day range`);

          if (broadEvents.length > 0) {
            broadEvents.slice(0, 3).forEach((event, i) => {
              console.log(`  ${i + 1}. "${event.summary}" (${event.start} - ${event.end})`);
            });
          }
        }
      } catch (broadError) {
        console.log('Broad query failed:', broadError.message);
      }
    }

    // For range queries return all events sorted; for single-date queries filter to that day
    let filteredEvents;
    if (isRangeQuery) {
      filteredEvents = events.sort((a, b) => new Date(a.start) - new Date(b.start));
    } else {
      filteredEvents = events.filter(event => {
        if (event.all_day) {
          const matches = event.start === targetEasternDateStr;
          if (!matches) {
            console.log(`Filtering out all-day event "${event.summary}": event date=${event.start}, target=${targetEasternDateStr}`);
          }
          return matches;
        }

        try {
          const eventEasternDateStr = new Date(event.start).toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
          const matches = eventEasternDateStr === targetEasternDateStr;
          if (!matches) {
            console.log(`Filtering out timed event "${event.summary}": event Eastern date=${eventEasternDateStr}, target=${targetEasternDateStr}`);
          }
          return matches;
        } catch (e) {
          return true;
        }
      });
    }

    console.log(`Events before filtering: ${events.length}, after filtering: ${filteredEvents.length}`);

    const result = {
      calendars: filteredEvents.length > 0 ? [{
        name: providerConfig.name,
        color: '#4285f4',
        events: filteredEvents,
        event_count: filteredEvents.length
      }] : [],
      connected_users: [{ email: username }],
      total_accounts: 1,
      successful_accounts: 1,
      failed_accounts: 0,
      total_events: filteredEvents.length,
      date_requested: dateParam,
      source: 'pi_caldav',
      message: filteredEvents.length > 0 ? `Found ${filteredEvents.length} events` : 'No events found for this date',
      debug: {
        caldav_url: caldavUrl.replace(username, '[username]'),
        response_length: xmlData.length,
        response_preview: xmlData.substring(0, 500),
        contains_vevent: xmlData.includes('BEGIN:VEVENT'),
        contains_calendar_data: xmlData.includes('calendar-data'),
        contains_error: xmlData.toLowerCase().includes('error'),
        parsing_attempted: events !== undefined,
        parsed_event_count: events.length,
        date_range: {
          start_utc: startTimeUTC,
          end_utc: endTimeUTC,
          target_date: targetEasternDateStr,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        }
      }
    };

    res.status(200).json(result);

  } catch (error) {
    console.error('Calendar function error:', error);
    res.status(500).json({
      error: 'Internal server error: ' + error.message,
      source: 'pi_calendar_route'
    });
  }
};

// Helper function to format date for CalDAV
function formatDateForCalDAV(date) {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

// Helper function to parse CalDAV XML response with debug info
function parseCalDAVResponseWithDebug(xmlData) {
  const events = [];
  const debug = {
    calendar_data_sections: 0,
    patterns_tried: [],
    ics_sections: [],
    total_vevent_blocks: 0,
    parsed_events: 0
  };

  try {
    const patterns = [
      { name: 'C:calendar-data', regex: /<C:calendar-data[^>]*>([\s\S]*?)<\/C:calendar-data>/gi },
      { name: 'calendar-data', regex: /<calendar-data[^>]*>([\s\S]*?)<\/calendar-data>/gi },
      { name: 'cal:calendar-data', regex: /<cal:calendar-data[^>]*>([\s\S]*?)<\/cal:calendar-data>/gi },
      { name: 'any:calendar-data', regex: /<[^:]*:?calendar-data[^>]*>([\s\S]*?)<\/[^:]*:?calendar-data>/gi },
      { name: 'CDATA', regex: /<!\[CDATA\[([\s\S]*?)\]\]>/gi },
      { name: 'response-with-vevent', regex: /<response[^>]*>([\s\S]*?BEGIN:VEVENT[\s\S]*?END:VEVENT[\s\S]*?)<\/response>/gi },
      { name: 'any-vevent', regex: />([\s\S]*?BEGIN:VEVENT[\s\S]*?END:VEVENT[\s\S]*?)</gi }
    ];

    let totalMatches = 0;

    for (const pattern of patterns) {
      debug.patterns_tried.push(pattern.name);
      let match;
      let matchCount = 0;

      while ((match = pattern.regex.exec(xmlData)) !== null) {
        totalMatches++;
        matchCount++;
        const icsData = match[1].trim();

        debug.ics_sections.push({
          pattern: pattern.name,
          length: icsData.length,
          preview: icsData.substring(0, 200),
          contains_vevent: icsData.includes('BEGIN:VEVENT')
        });

        if (icsData && icsData.includes('BEGIN:VEVENT')) {
          const parseResult = parseICSDataWithDebug(icsData);
          events.push(...parseResult.events);
          debug.total_vevent_blocks += parseResult.debug.vevent_blocks;
          debug.parsed_events += parseResult.events.length;
        }
      }

      if (matchCount > 0) {
        totalMatches = matchCount;
        break;
      }
    }

    debug.calendar_data_sections = totalMatches;

  } catch (error) {
    console.error('Failed to parse CalDAV XML:', error);
    debug.error = error.message;
  }

  return { events, debug };
}

// Helper function to parse CalDAV XML response
function parseCalDAVResponse(xmlData) {
  const events = [];

  try {
    const patterns = [
      /<C:calendar-data[^>]*>([\s\S]*?)<\/C:calendar-data>/gi,
      /<calendar-data[^>]*>([\s\S]*?)<\/calendar-data>/gi,
      /<cal:calendar-data[^>]*>([\s\S]*?)<\/cal:calendar-data>/gi
    ];

    for (const pattern of patterns) {
      let match;
      let matched = false;
      while ((match = pattern.exec(xmlData)) !== null) {
        matched = true;
        const icsData = match[1].trim();
        if (icsData && icsData.includes('BEGIN:VEVENT')) {
          events.push(...parseICSData(icsData));
        }
      }
      if (matched) break;
    }

  } catch (error) {
    console.error('Failed to parse CalDAV XML:', error);
  }

  return events;
}

// Helper function to parse ICS data with debug info
function parseICSDataWithDebug(icsData) {
  const events = [];
  const debug = {
    vevent_blocks: 0,
    processed_blocks: 0,
    events_with_summary: 0,
    sample_event_data: []
  };

  try {
    const eventBlocks = icsData.split('BEGIN:VEVENT');
    debug.vevent_blocks = eventBlocks.length - 1;

    for (let i = 1; i < eventBlocks.length; i++) {
      const block = eventBlocks[i];
      const endIndex = block.indexOf('END:VEVENT');

      if (endIndex === -1) continue;

      debug.processed_blocks++;
      const eventData = block.substring(0, endIndex);

      if (debug.sample_event_data.length < 2) {
        debug.sample_event_data.push({
          block_index: i,
          length: eventData.length,
          preview: eventData.substring(0, 300)
        });
      }

      const event = parseICSEvent(eventData);

      if (event && event.summary) {
        debug.events_with_summary++;
        events.push(event);
      }
    }
  } catch (error) {
    console.error('Failed to parse ICS data:', error);
    debug.error = error.message;
  }

  return { events, debug };
}

// Helper function to parse ICS data
function parseICSData(icsData) {
  const events = [];

  try {
    const eventBlocks = icsData.split('BEGIN:VEVENT');

    for (let i = 1; i < eventBlocks.length; i++) {
      const block = eventBlocks[i];
      const endIndex = block.indexOf('END:VEVENT');

      if (endIndex === -1) continue;

      const event = parseICSEvent(block.substring(0, endIndex));
      if (event && event.summary) {
        events.push(event);
      }
    }
  } catch (error) {
    console.error('Failed to parse ICS data:', error);
  }

  return events;
}

// Helper function to parse individual ICS event
function parseICSEvent(eventData) {
  const event = {
    summary: '',
    start: '',
    end: '',
    all_day: false,
    location: '',
    description: '',
    uid: '',
    calendar_name: 'CalDAV Calendar'
  };

  // Unfold ICS line continuations (RFC 5545 §3.1) before splitting
  const lines = eventData.replace(/\r?\n[ \t]/g, '').split(/\r?\n/);
  let inSubComponent = false; // skip VALARM, VTODO etc. nested blocks

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Track nested components so we don't read VALARM fields as event fields
    if (/^BEGIN:(VALARM|VTODO|VJOURNAL|VFREEBUSY)/.test(trimmed)) { inSubComponent = true; continue; }
    if (/^END:(VALARM|VTODO|VJOURNAL|VFREEBUSY)/.test(trimmed)) { inSubComponent = false; continue; }
    if (inSubComponent) continue;

    const colonIndex = trimmed.indexOf(':');
    if (colonIndex === -1) continue;

    const key = trimmed.substring(0, colonIndex);
    const value = trimmed.substring(colonIndex + 1);

    if (key === 'SUMMARY') {
      event.summary = decodeICSText(value);
    } else if (key.startsWith('DTSTART')) {
      const timezone = key.includes('TZID=') ? key.split('TZID=')[1].split(';')[0] : null;
      event.start = parseICSDateTime(value, timezone);
      if (key.includes('VALUE=DATE') || value.length === 8) {
        event.all_day = true;
      }
    } else if (key.startsWith('DTEND')) {
      const timezone = key.includes('TZID=') ? key.split('TZID=')[1].split(';')[0] : null;
      event.end = parseICSDateTime(value, timezone);
    } else if (key === 'LOCATION') {
      event.location = decodeICSText(value);
    } else if (key === 'DESCRIPTION') {
      event.description = decodeICSText(value);
    } else if (key === 'UID') {
      event.uid = value;
    }
  }

  return event.summary ? event : null;
}

// Helper function to parse ICS date/time with timezone support
function parseICSDateTime(icsDateTime, timezone = null) {
  try {
    if (icsDateTime.length === 8) {
      const year = icsDateTime.substring(0, 4);
      const month = icsDateTime.substring(4, 6);
      const day = icsDateTime.substring(6, 8);
      return `${year}-${month}-${day}`;
    } else if (icsDateTime.includes('T')) {
      const date = icsDateTime.split('T')[0];
      const time = icsDateTime.split('T')[1].replace(/Z$/, '');

      const year = date.substring(0, 4);
      const month = date.substring(4, 6);
      const day = date.substring(6, 8);

      if (time.length >= 6) {
        const hour = time.substring(0, 2);
        const minute = time.substring(2, 4);
        const second = time.substring(4, 6) || '00';

        if (timezone && timezone.includes('America/New_York')) {
          try {
            const easternTimeString = `${year}-${month}-${day}T${hour}:${minute}:${second}Z`;
            const tempDate = new Date(easternTimeString);
            const offsetHours = isEDT(tempDate) ? 4 : 5;
            const utcDate = new Date(tempDate.getTime() + (offsetHours * 60 * 60 * 1000));
            return utcDate.toISOString();
          } catch (conversionError) {
            console.error('Timezone conversion failed:', conversionError);
            return `${year}-${month}-${day}T${hour}:${minute}:${second}Z`;
          }
        }

        return `${year}-${month}-${day}T${hour}:${minute}:${second}Z`;
      }

      return `${year}-${month}-${day}`;
    }

    return icsDateTime;
  } catch (error) {
    console.error('Failed to parse ICS date:', icsDateTime, error);
    return icsDateTime;
  }
}

// Helper function to determine if a date is in Eastern Daylight Time
function isEDT(date) {
  const year = date.getFullYear();
  const marchSecondSunday = new Date(year, 2, 8 + (7 - new Date(year, 2, 8).getDay()) % 7);
  const novemberFirstSunday = new Date(year, 10, 1 + (7 - new Date(year, 10, 1).getDay()) % 7);
  return date >= marchSecondSunday && date < novemberFirstSunday;
}

// Helper function to decode ICS text
function decodeICSText(text) {
  return text
    .replace(/\\n/g, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\');
}

// Resolve a potentially relative href from a CalDAV PROPFIND response to an absolute URL
function resolveUrl(base, path) {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  try {
    const url = new URL(base);
    return path.startsWith('/')
      ? `${url.protocol}//${url.host}${path}`
      : `${url.protocol}//${url.host}/${path}`;
  } catch (e) {
    return path;
  }
}

// Discover all VEVENT-capable calendar collections for an account via PROPFIND chain.
// Returns array of { url, name }. Returns [] on any failure so callers can fall back.
async function discoverCalendarCollections(startUrl, authHeader) {
  const headers0 = { 'Authorization': authHeader, 'Content-Type': 'application/xml; charset=utf-8', 'Depth': '0' };

  // Step 1 — current-user-principal
  let principalUrl = null;
  try {
    const resp = await fetch(startUrl, {
      method: 'PROPFIND',
      headers: headers0,
      body: '<?xml version="1.0" encoding="utf-8"?><D:propfind xmlns:D="DAV:"><D:prop><D:current-user-principal/></D:prop></D:propfind>'
    });
    if (resp.ok) {
      const xml = await resp.text();
      const m = xml.match(/<[^:>\s]*:?current-user-principal[^>]*>[\s\S]*?<[^:>\s]*:?href[^>]*>([^<]+)<\/[^:>\s]*:?href>/i);
      if (m) principalUrl = resolveUrl(startUrl, m[1].trim());
      console.log('Discovery principal:', principalUrl);
    }
  } catch (e) {
    console.log('Discovery step 1 error:', e.message);
  }

  // Step 2 — calendar-home-set
  let calendarHomeUrl = null;
  try {
    const resp = await fetch(principalUrl || startUrl, {
      method: 'PROPFIND',
      headers: headers0,
      body: '<?xml version="1.0" encoding="utf-8"?><D:propfind xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav"><D:prop><C:calendar-home-set/></D:prop></D:propfind>'
    });
    if (resp.ok) {
      const xml = await resp.text();
      const m = xml.match(/<[^:>\s]*:?calendar-home-set[^>]*>[\s\S]*?<[^:>\s]*:?href[^>]*>([^<]+)<\/[^:>\s]*:?href>/i);
      if (m) calendarHomeUrl = resolveUrl(startUrl, m[1].trim());
      console.log('Discovery calendar home:', calendarHomeUrl);
    }
  } catch (e) {
    console.log('Discovery step 2 error:', e.message);
  }

  if (!calendarHomeUrl) return [];

  // Step 3 — list all calendar collections under the home set
  try {
    const resp = await fetch(calendarHomeUrl, {
      method: 'PROPFIND',
      headers: { ...headers0, 'Depth': '1' },
      body: '<?xml version="1.0" encoding="utf-8"?><D:propfind xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav"><D:prop><D:resourcetype/><D:displayname/><C:supported-calendar-component-set/></D:prop></D:propfind>'
    });
    if (!resp.ok) return [];

    const xml = await resp.text();
    const collections = [];
    const responseRe = /<[^:>\s]*:?response[^>]*>([\s\S]*?)<\/[^:>\s]*:?response>/gi;
    let m;

    while ((m = responseRe.exec(xml)) !== null) {
      const block = m[1];

      // Must be a calendar collection (resourcetype contains both 'collection' and 'calendar')
      const rtMatch = block.match(/<[^:>\s]*:?resourcetype[^>]*>([\s\S]*?)<\/[^:>\s]*:?resourcetype>/i);
      if (!rtMatch) continue;
      const rt = rtMatch[1];
      if (!rt.includes('collection') || !rt.includes('calendar')) continue;

      // Skip if explicitly declared to not support VEVENT
      const compSetMatch = block.match(/<[^:>\s]*:?supported-calendar-component-set[^>]*>([\s\S]*?)<\/[^:>\s]*:?supported-calendar-component-set>/i);
      if (compSetMatch && !compSetMatch[1].toLowerCase().includes('vevent')) continue;

      const hrefMatch = block.match(/<[^:>\s]*:?href[^>]*>([^<]+)<\/[^:>\s]*:?href>/i);
      if (!hrefMatch) continue;

      const nameMatch = block.match(/<[^:>\s]*:?displayname[^>]*>([^<]*)<\/[^:>\s]*:?displayname>/i);
      const name = nameMatch ? nameMatch[1].trim() || 'Unnamed Calendar' : 'Unnamed Calendar';
      const url = resolveUrl(calendarHomeUrl, hrefMatch[1].trim());
      if (url) collections.push({ url, name });
    }

    console.log('Discovery collections:', collections.map(c => `"${c.name}"`).join(', '));
    return collections;
  } catch (e) {
    console.log('Discovery step 3 error:', e.message);
    return [];
  }
}

// Remove duplicate events that appear in multiple calendar collections, matched by UID
function deduplicateByUid(events) {
  const seen = new Set();
  return events.filter(event => {
    if (!event.uid) return true;
    if (seen.has(event.uid)) return false;
    seen.add(event.uid);
    return true;
  });
}
