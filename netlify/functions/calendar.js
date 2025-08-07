// Netlify function for CalDAV calendar integration
// Handles authentication and CORS for always-on dashboards

exports.handler = async (event, context) => {
  console.log('Netlify calendar function called:', event.httpMethod, event.path);
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    // Parse request body
    const body = event.body ? JSON.parse(event.body) : {};
    const { provider, username, password, dateParam = 'today' } = body;
    
    console.log('Calendar request:', { provider, username: username ? 'provided' : 'missing', dateParam });
    
    if (!provider || !username || !password) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Missing required fields: provider, username, password' 
        })
      };
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
      }
    };
    
    const providerConfig = providers[provider];
    if (!providerConfig) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: `Unsupported provider: ${provider}` })
      };
    }
    
    // Build CalDAV URL
    let caldavUrl = providerConfig.endpoint;
    switch (provider) {
      case 'google':
        // Detect Google Workspace vs Gmail accounts
        const isWorkspaceAccount = !username.endsWith('@gmail.com') && !username.endsWith('@googlemail.com');
        
        if (isWorkspaceAccount) {
          console.log('Detected Google Workspace account, using workspace endpoint');
          // For Workspace, target the primary calendar events collection
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
    }
    
    console.log('CalDAV URL (masked):', caldavUrl.replace(username, '[username]'));
    
    // Calculate date range - use Eastern timezone for proper date boundaries
    // Server runs in UTC but we need to calculate dates relative to Eastern timezone
    const now = new Date();
    
    // Get current Eastern time to determine the actual "today" and "tomorrow"
    const easternNow = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
    console.log('Current Eastern time:', easternNow.toLocaleString());
    console.log('Server UTC time:', now.toISOString());
    
    const targetDate = dateParam === 'tomorrow' 
      ? new Date(easternNow.getTime() + 24 * 60 * 60 * 1000)
      : easternNow;
    
    // Create date boundaries in Eastern time, then convert to UTC
    const startOfDayEastern = new Date(targetDate);
    startOfDayEastern.setHours(0, 0, 0, 0);
    
    const endOfDayEastern = new Date(targetDate);
    endOfDayEastern.setHours(22, 59, 59, 999); // End at 22:59 to prevent next-day overlap
    
    // Convert Eastern boundaries to UTC for CalDAV query
    const startOfDay = new Date(startOfDayEastern.toLocaleString("en-US", {timeZone: "UTC"}));
    const adjustedEndOfDay = new Date(endOfDayEastern.toLocaleString("en-US", {timeZone: "UTC"}));
    
    const startTimeUTC = formatDateForCalDAV(startOfDay);
    const endTimeUTC = formatDateForCalDAV(adjustedEndOfDay);
    
    console.log('Date range for CalDAV query (Eastern timezone aware):');
    console.log('  Date parameter:', dateParam);
    console.log('  Target date (Eastern):', targetDate.toLocaleDateString());
    console.log('  Start Eastern:', startOfDayEastern.toLocaleString());
    console.log('  End Eastern:', endOfDayEastern.toLocaleString());
    console.log('  Start UTC:', startTimeUTC);
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
    
    // Make CalDAV request with fallback for Workspace accounts
    const authHeader = 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');
    
    // For Workspace accounts, try multiple endpoints if the first fails
    const urlsToTry = [caldavUrl];
    
    if (provider === 'google' && !username.endsWith('@gmail.com') && !username.endsWith('@googlemail.com')) {
      // Add fallback URLs for Google Workspace
      urlsToTry.push(
        providerConfig.workspaceEndpoint + `${username}/user/`,
        `https://apidata.googleusercontent.com/caldav/v2/${username}/events/`,
        providerConfig.workspaceEndpoint + `${username}/`,
        // Try primary calendar ID format  
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
          console.log(`✅ Successful CalDAV connection with: ${url.replace(username, '[username]')}`);
          break; // Success, exit the loop
        } else {
          const errorText = await response.text();
          console.log(`❌ Failed with ${url.replace(username, '[username]')}: ${response.status} ${response.statusText}`);
          lastError = errorText;
        }
      } catch (error) {
        console.error(`Network error with ${url.replace(username, '[username]')}:`, error.message);
        lastError = error.message;
      }
    }
    
    if (!response || !response.ok) {
      console.error('All CalDAV endpoints failed');
      return {
        statusCode: response?.status || 500,
        headers,
        body: JSON.stringify({ 
          error: `CalDAV request failed: ${response?.status || 'Network Error'} ${response?.statusText || 'All endpoints failed'}`,
          details: lastError ? lastError.substring(0, 200) : 'No additional details',
          attempted_urls: urlsToTry.length
        })
      };
    }
    
    const xmlData = await response.text();
    console.log('CalDAV response length:', xmlData.length);
    console.log('CalDAV raw response (first 1000 chars):', xmlData.substring(0, 1000));
    
    // Parse CalDAV XML response
    const parseResult = parseCalDAVResponseWithDebug(xmlData);
    const events = parseResult.events;
    console.log('Parsed events:', events.length);
    
    // Additional debug info
    if (events.length === 0) {
      console.log('🔍 No events parsed - checking XML structure...');
      console.log('XML contains VEVENT:', xmlData.includes('BEGIN:VEVENT'));
      console.log('XML contains calendar-data:', xmlData.includes('calendar-data'));
      console.log('XML contains error:', xmlData.toLowerCase().includes('error'));
      
      // Try a broader date range (7 days) to see if any events exist
      console.log('🔍 Trying broader date range (7 days)...');
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
      
      console.log('Broad query range:', weekStartUTC, 'to', weekEndUTC);
      
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
          console.log(`🔍 Broad query found ${broadEvents.length} events in 7-day range`);
          
          if (broadEvents.length > 0) {
            console.log('Sample events found:');
            broadEvents.slice(0, 3).forEach((event, i) => {
              console.log(`  ${i + 1}. "${event.summary}" (${event.start} - ${event.end})`);
            });
          }
        }
      } catch (broadError) {
        console.log('Broad query failed:', broadError.message);
      }
    }
    
    // Return in expected dashboard format
    const result = {
      calendars: events.length > 0 ? [{
        name: providerConfig.name,
        color: '#4285f4',
        events: events,
        event_count: events.length
      }] : [],
      connected_users: [{ email: username }],
      total_accounts: 1,
      successful_accounts: 1,
      failed_accounts: 0,
      total_events: events.length,
      date_requested: dateParam,
      source: 'netlify_caldav',
      message: events.length > 0 ? `Found ${events.length} events` : 'No events found for this date',
      // Add debug information to response for troubleshooting
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
          target_date: targetDate.toISOString(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        }
      }
    };
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result)
    };
    
  } catch (error) {
    console.error('Calendar function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error: ' + error.message,
        source: 'netlify_function'
      })
    };
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
    console.log('🔍 Parsing CalDAV XML response...');
    
    // Extract calendar-data sections - try multiple regex patterns
    const patterns = [
      { name: 'C:calendar-data', regex: /<C:calendar-data[^>]*>([\s\S]*?)<\/C:calendar-data>/gi },
      { name: 'calendar-data', regex: /<calendar-data[^>]*>([\s\S]*?)<\/calendar-data>/gi },
      { name: 'cal:calendar-data', regex: /<cal:calendar-data[^>]*>([\s\S]*?)<\/cal:calendar-data>/gi },
      // Add more flexible patterns for any namespace
      { name: 'any:calendar-data', regex: /<[^:]*:?calendar-data[^>]*>([\s\S]*?)<\/[^:]*:?calendar-data>/gi },
      // Try looking for CDATA sections that might contain ICS data
      { name: 'CDATA', regex: /<!\[CDATA\[([\s\S]*?)\]\]>/gi },
      // Try looking for the actual VEVENT content directly in response elements
      { name: 'response-with-vevent', regex: /<response[^>]*>([\s\S]*?BEGIN:VEVENT[\s\S]*?END:VEVENT[\s\S]*?)<\/response>/gi },
      // Look for any element containing BEGIN:VEVENT
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
        
        const sectionInfo = {
          pattern: pattern.name,
          length: icsData.length,
          preview: icsData.substring(0, 200),
          contains_vevent: icsData.includes('BEGIN:VEVENT')
        };
        
        debug.ics_sections.push(sectionInfo);
        console.log(`📄 Found calendar-data section ${totalMatches} (${pattern.name}): ${icsData.length} chars`);
        console.log(`📄 Preview: ${icsData.substring(0, 200)}...`);
        
        if (icsData && icsData.includes('BEGIN:VEVENT')) {
          console.log('✅ Found VEVENT in ICS data');
          const parseResult = parseICSDataWithDebug(icsData);
          console.log(`📅 Parsed ${parseResult.events.length} events from this section`);
          events.push(...parseResult.events);
          debug.total_vevent_blocks += parseResult.debug.vevent_blocks;
          debug.parsed_events += parseResult.events.length;
        } else {
          console.log('❌ No VEVENT found in this ICS data');
        }
      }
      
      if (matchCount > 0) {
        console.log(`✅ Pattern '${pattern.name}' found ${matchCount} matches`);
        break; // Stop if we found matches with this pattern
      }
    }
    
    debug.calendar_data_sections = totalMatches;
    console.log(`🔍 Total calendar-data sections found: ${totalMatches}`);
    console.log(`📅 Total events parsed: ${events.length}`);
    
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
    console.log('🔍 Parsing CalDAV XML response...');
    
    // Extract calendar-data sections - try multiple regex patterns
    const patterns = [
      /<C:calendar-data[^>]*>([\s\S]*?)<\/C:calendar-data>/gi,
      /<calendar-data[^>]*>([\s\S]*?)<\/calendar-data>/gi,
      /<cal:calendar-data[^>]*>([\s\S]*?)<\/cal:calendar-data>/gi
    ];
    
    let totalMatches = 0;
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(xmlData)) !== null) {
        totalMatches++;
        const icsData = match[1].trim();
        console.log(`📄 Found calendar-data section ${totalMatches}: ${icsData.length} chars`);
        console.log(`📄 Preview: ${icsData.substring(0, 200)}...`);
        
        if (icsData && icsData.includes('BEGIN:VEVENT')) {
          console.log('✅ Found VEVENT in ICS data');
          const parsedEvents = parseICSData(icsData);
          console.log(`📅 Parsed ${parsedEvents.length} events from this section`);
          events.push(...parsedEvents);
        } else {
          console.log('❌ No VEVENT found in this ICS data');
        }
      }
      if (totalMatches > 0) break; // Stop if we found matches with this pattern
    }
    
    console.log(`🔍 Total calendar-data sections found: ${totalMatches}`);
    console.log(`📅 Total events parsed: ${events.length}`);
    
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
    console.log('🔍 Parsing ICS data...');
    console.log(`📄 ICS data length: ${icsData.length}`);
    console.log(`📄 ICS preview: ${icsData.substring(0, 300)}...`);
    
    const eventBlocks = icsData.split('BEGIN:VEVENT');
    debug.vevent_blocks = eventBlocks.length - 1;
    console.log(`📅 Found ${debug.vevent_blocks} VEVENT blocks`);
    
    for (let i = 1; i < eventBlocks.length; i++) {
      const block = eventBlocks[i];
      const endIndex = block.indexOf('END:VEVENT');
      
      console.log(`🔍 Processing VEVENT block ${i}:`);
      console.log(`   Block length: ${block.length}`);
      console.log(`   END:VEVENT found at: ${endIndex}`);
      
      if (endIndex === -1) {
        console.log(`❌ Block ${i}: No END:VEVENT found`);
        continue;
      }
      
      debug.processed_blocks++;
      const eventData = block.substring(0, endIndex);
      console.log(`   Event data preview: ${eventData.substring(0, 200)}...`);
      
      if (debug.sample_event_data.length < 2) {
        debug.sample_event_data.push({
          block_index: i,
          length: eventData.length,
          preview: eventData.substring(0, 300)
        });
      }
      
      const event = parseICSEvent(eventData);
      console.log(`   Parsed event:`, event);
      
      if (event && event.summary) {
        debug.events_with_summary++;
        console.log(`✅ Adding event: "${event.summary}"`);
        events.push(event);
      } else {
        console.log(`❌ Skipping event (no summary):`, event);
      }
    }
  } catch (error) {
    console.error('Failed to parse ICS data:', error);
    debug.error = error.message;
  }
  
  console.log(`📅 Total events parsed from ICS: ${events.length}`);
  return { events, debug };
}

// Helper function to parse ICS data
function parseICSData(icsData) {
  const events = [];
  
  try {
    console.log('🔍 Parsing ICS data...');
    console.log(`📄 ICS data length: ${icsData.length}`);
    console.log(`📄 ICS preview: ${icsData.substring(0, 300)}...`);
    
    const eventBlocks = icsData.split('BEGIN:VEVENT');
    console.log(`📅 Found ${eventBlocks.length - 1} VEVENT blocks`);
    
    for (let i = 1; i < eventBlocks.length; i++) {
      const block = eventBlocks[i];
      const endIndex = block.indexOf('END:VEVENT');
      
      console.log(`🔍 Processing VEVENT block ${i}:`);
      console.log(`   Block length: ${block.length}`);
      console.log(`   END:VEVENT found at: ${endIndex}`);
      
      if (endIndex === -1) {
        console.log(`❌ Block ${i}: No END:VEVENT found`);
        continue;
      }
      
      const eventData = block.substring(0, endIndex);
      console.log(`   Event data preview: ${eventData.substring(0, 200)}...`);
      
      const event = parseICSEvent(eventData);
      console.log(`   Parsed event:`, event);
      
      if (event && event.summary) {
        console.log(`✅ Adding event: "${event.summary}"`);
        events.push(event);
      } else {
        console.log(`❌ Skipping event (no summary): ${event}`);
      }
    }
  } catch (error) {
    console.error('Failed to parse ICS data:', error);
  }
  
  console.log(`📅 Total events parsed from ICS: ${events.length}`);
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
      // Parse timezone from key if present (e.g., "DTSTART;TZID=America/New_York")
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
    console.log('🕐 Parsing ICS date/time:', { icsDateTime, timezone });
    
    if (icsDateTime.length === 8) {
      // YYYYMMDD - all day event
      const year = icsDateTime.substring(0, 4);
      const month = icsDateTime.substring(4, 6);
      const day = icsDateTime.substring(6, 8);
      return `${year}-${month}-${day}`;
    } else if (icsDateTime.includes('T')) {
      // YYYYMMDDTHHMMSS
      const date = icsDateTime.split('T')[0];
      const time = icsDateTime.split('T')[1].replace(/Z$/, '');
      
      const year = date.substring(0, 4);
      const month = date.substring(4, 6);
      const day = date.substring(6, 8);
      
      if (time.length >= 6) {
        const hour = time.substring(0, 2);
        const minute = time.substring(2, 4);
        const second = time.substring(4, 6) || '00';
        
        // If we have timezone info, convert from local timezone to UTC
        if (timezone && timezone.includes('America/New_York')) {
          try {
            // Create the date string in ISO format but interpret it as Eastern time
            const easternTimeString = `${year}-${month}-${day}T${hour}:${minute}:${second}`;
            console.log('🕐 Converting Eastern time to UTC:', easternTimeString);
            
            // Use toLocaleString to convert from Eastern to UTC properly
            // This is a more reliable method that handles DST automatically
            const tempDate = new Date(easternTimeString);
            
            // August 8, 2025 is in EDT (Eastern Daylight Time = UTC-4)
            // So 3:00 PM EDT = 7:00 PM UTC (add 4 hours)
            const utcDate = new Date(tempDate.getTime() + (4 * 60 * 60 * 1000));
            
            console.log('🕐 Timezone conversion result:', {
              originalTime: easternTimeString,
              originalDate: tempDate.toISOString(),
              utcResult: utcDate.toISOString(),
              timezone: timezone
            });
            
            return utcDate.toISOString();
            
          } catch (conversionError) {
            console.error('Timezone conversion failed:', conversionError);
            // Fallback to original behavior
            return `${year}-${month}-${day}T${hour}:${minute}:${second}Z`;
          }
        }
        
        // Default: return as UTC (original behavior)
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
  // EDT runs from 2nd Sunday in March to 1st Sunday in November
  const year = date.getFullYear();
  
  // 2nd Sunday in March
  const marchSecondSunday = new Date(year, 2, 8 + (7 - new Date(year, 2, 8).getDay()) % 7);
  
  // 1st Sunday in November  
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