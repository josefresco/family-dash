// Vercel serverless function for CalDAV calendar integration
// Handles authentication and CORS for always-on dashboards

module.exports = async (req, res) => {
  console.log('Vercel calendar function called:', req.method, req.url);

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const body = req.body || {};
    const { provider, username, password, dateParam = 'today', customEndpoint = '' } = body;

    console.log('Calendar request:', { provider, username: username ? 'provided' : 'missing', dateParam });

    if (!provider || !username || !password) {
      res.status(400).json({ error: 'Missing required fields: provider, username, password' });
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

    if (dateParam === 'tomorrow') {
      const [y, m, d] = easternTodayStr.split('-').map(Number);
      targetEasternDateStr = new Date(Date.UTC(y, m - 1, d + 1)).toISOString().split('T')[0];
    } else if (dateParam === 'today') {
      targetEasternDateStr = easternTodayStr;
    } else if (dateParam.match(/^\d{4}-\d{2}-\d{2}$/)) {
      console.log('Processing specific date string:', dateParam);
      targetEasternDateStr = dateParam;
    } else {
      console.log('Unknown date parameter, defaulting to today:', dateParam);
      targetEasternDateStr = easternTodayStr;
    }

    console.log('Target Eastern date:', targetEasternDateStr);

    const targetNoonUTC = new Date(targetEasternDateStr + 'T12:00:00Z');
    const easternOffsetHours = isEDT(targetNoonUTC) ? 4 : 5;

    const startOfDayUTC = new Date(
      new Date(targetEasternDateStr + 'T00:00:00Z').getTime() + easternOffsetHours * 3600000
    );

    const [ty, tm, td] = targetEasternDateStr.split('-').map(Number);
    const nextEasternDayStr = new Date(Date.UTC(ty, tm - 1, td + 1)).toISOString().split('T')[0];
    const queryEndUTC = new Date(
      new Date(nextEasternDayStr + 'T12:00:00Z').getTime() + easternOffsetHours * 3600000
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

    const urlsToTry = [caldavUrl];

    if (provider === 'google' && !username.endsWith('@gmail.com') && !username.endsWith('@googlemail.com')) {
      urlsToTry.push(
        providerConfig.workspaceEndpoint + `${username}/user/`,
        `https://apidata.googleusercontent.com/caldav/v2/${username}/events/`,
        providerConfig.workspaceEndpoint + `${username}/`,
        providerConfig.workspaceEndpoint + `${username.split('@')[0]}/events/`
      );
    }

    let response;
    let lastError;

    for (const url of urlsToTry) {
      console.log(`Making CalDAV REPORT request to: ${url.replace(username, '[username]')}`);

      try {
        response = await fetch(url, {
          method: 'REPORT',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/xml; charset=utf-8',
            'Depth': '1'
          },
          body: reportBody
        });

        console.log(`CalDAV response status for ${url.replace(username, '[username]')}: ${response.status}`);

        if (response.ok) {
          console.log(`CalDAV connection succeeded: ${url.replace(username, '[username]')}`);
          break;
        } else {
          const errorText = await response.text();
          console.log(`Failed with ${url.replace(username, '[username]')}: ${response.status} ${response.statusText}`);
          lastError = errorText;
        }
      } catch (error) {
        console.error(`Network error with ${url.replace(username, '[username]')}:`, error.message);
        lastError = error.message;
      }
    }

    if (!response || !response.ok) {
      console.error('All CalDAV endpoints failed');
      res.status(response?.status || 500).json({
        error: `CalDAV request failed: ${response?.status || 'Network Error'} ${response?.statusText || 'All endpoints failed'}`,
        details: lastError ? lastError.substring(0, 200) : 'No additional details',
        attempted_urls: urlsToTry.length
      });
      return;
    }

    const xmlData = await response.text();
    console.log('CalDAV response length:', xmlData.length);
    console.log('CalDAV raw response (first 1000 chars):', xmlData.substring(0, 1000));

    const parseResult = parseCalDAVResponseWithDebug(xmlData);
    const events = parseResult.events;
    console.log('Parsed events:', events.length);

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
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/xml; charset=utf-8',
            'Depth': '1'
          },
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

    // Filter events to the target Eastern date
    const filteredEvents = events.filter(event => {
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
      source: 'vercel_caldav',
      message: filteredEvents.length > 0 ? `Found ${filteredEvents.length} events` : 'No events found for this date',
      debug: {
        caldav_url: caldavUrl.replace(username, '[username]'),
        response_length: xmlData.length,
        response_preview: xmlData.substring(0, 500),
        contains_vevent: xmlData.includes('BEGIN:VEVENT'),
        contains_calendar_data: xmlData.includes('calendar-data'),
        contains_error: xmlData.toLowerCase().includes('error'),
        parsing_attempted: events !== undefined,
        parsing_debug: parseResult.debug,
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
      source: 'vercel_function'
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
    calendar_name: 'CalDAV Calendar'
  };

  const lines = eventData.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

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
            const easternTimeString = `${year}-${month}-${day}T${hour}:${minute}:${second}`;
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
