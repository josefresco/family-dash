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
    
    // Calculate date range
    const now = new Date();
    const targetDate = dateParam === 'tomorrow' 
      ? new Date(now.getTime() + 24 * 60 * 60 * 1000)
      : now;
    
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    const startTimeUTC = formatDateForCalDAV(startOfDay);
    const endTimeUTC = formatDateForCalDAV(endOfDay);
    
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
    
    // Make CalDAV request
    const authHeader = 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');
    
    console.log('Making CalDAV REPORT request...');
    const response = await fetch(caldavUrl, {
      method: 'REPORT',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/xml; charset=utf-8',
        'Depth': '1'
      },
      body: reportBody
    });
    
    console.log('CalDAV response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('CalDAV error:', response.status, errorText);
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ 
          error: `CalDAV request failed: ${response.status} ${response.statusText}`,
          details: errorText.substring(0, 200) // Truncate error details
        })
      };
    }
    
    const xmlData = await response.text();
    console.log('CalDAV response length:', xmlData.length);
    
    // Parse CalDAV XML response
    const events = parseCalDAVResponse(xmlData);
    console.log('Parsed events:', events.length);
    
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
      message: events.length > 0 ? `Found ${events.length} events` : 'No events found for this date'
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

// Helper function to parse CalDAV XML response
function parseCalDAVResponse(xmlData) {
  const events = [];
  
  try {
    // Extract calendar-data sections
    const calendarDataRegex = /<C:calendar-data[^>]*>([\s\S]*?)<\/C:calendar-data>/gi;
    let match;
    
    while ((match = calendarDataRegex.exec(xmlData)) !== null) {
      const icsData = match[1].trim();
      if (icsData && icsData.includes('BEGIN:VEVENT')) {
        const parsedEvents = parseICSData(icsData);
        events.push(...parsedEvents);
      }
    }
  } catch (error) {
    console.error('Failed to parse CalDAV XML:', error);
  }
  
  return events;
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
      
      const eventData = block.substring(0, endIndex);
      const event = parseICSEvent(eventData);
      
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
      event.start = parseICSDateTime(value);
      if (key.includes('VALUE=DATE') || value.length === 8) {
        event.all_day = true;
      }
    } else if (key.startsWith('DTEND')) {
      event.end = parseICSDateTime(value);
    } else if (key === 'LOCATION') {
      event.location = decodeICSText(value);
    } else if (key === 'DESCRIPTION') {
      event.description = decodeICSText(value);
    }
  }
  
  return event.summary ? event : null;
}

// Helper function to parse ICS date/time
function parseICSDateTime(icsDateTime) {
  try {
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

// Helper function to decode ICS text
function decodeICSText(text) {
  return text
    .replace(/\\n/g, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\');
}