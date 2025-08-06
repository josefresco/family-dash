// Serverless CalDAV proxy for Family Dashboard
// Handles CalDAV requests server-side to avoid CORS issues

export default async function handler(request) {
    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
        return new Response(null, {
            status: 200,
            headers: {
                'Access-Control-Allow-Origin': 'https://josefresco.github.io',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                'Access-Control-Max-Age': '86400',
            },
        });
    }

    try {
        console.log('CalDAV proxy request:', request.method, request.url);

        if (request.method !== 'POST') {
            return new Response(JSON.stringify({ error: 'Method not allowed' }), {
                status: 405,
                headers: {
                    'Access-Control-Allow-Origin': 'https://josefresco.github.io',
                    'Content-Type': 'application/json',
                },
            });
        }

        const body = await request.json();
        const { provider, username, password, dateParam = 'today' } = body;

        if (!provider || !username || !password) {
            return new Response(JSON.stringify({ 
                error: 'Missing required fields: provider, username, password' 
            }), {
                status: 400,
                headers: {
                    'Access-Control-Allow-Origin': 'https://josefresco.github.io',
                    'Content-Type': 'application/json',
                },
            });
        }

        console.log('Processing CalDAV request for provider:', provider);

        // Calculate date range
        const now = new Date();
        const targetDate = dateParam === 'tomorrow' 
            ? new Date(now.getTime() + 24 * 60 * 60 * 1000)
            : now;
        
        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(targetDate);
        endOfDay.setHours(23, 59, 59, 999);

        console.log('Date range:', { start: startOfDay.toISOString(), end: endOfDay.toISOString() });

        // Get CalDAV events
        const calendarData = await fetchCalDAVEvents(provider, username, password, startOfDay, endOfDay);

        return new Response(JSON.stringify(calendarData), {
            status: 200,
            headers: {
                'Access-Control-Allow-Origin': 'https://josefresco.github.io',
                'Content-Type': 'application/json',
            },
        });

    } catch (error) {
        console.error('CalDAV proxy error:', error);
        
        return new Response(JSON.stringify({ 
            error: 'CalDAV request failed', 
            message: error.message 
        }), {
            status: 500,
            headers: {
                'Access-Control-Allow-Origin': 'https://josefresco.github.io',
                'Content-Type': 'application/json',
            },
        });
    }
}

// CalDAV provider configurations
const CALDAV_PROVIDERS = {
    google: {
        name: 'Google Calendar',
        baseUrl: 'https://apidata.googleusercontent.com/caldav/v2/',
        getUrl: (username) => `https://apidata.googleusercontent.com/caldav/v2/${username}/events/`
    },
    apple: {
        name: 'Apple iCloud',
        baseUrl: 'https://caldav.icloud.com/',
        getUrl: (username) => {
            const appleUser = username.split('@')[0];
            return `https://caldav.icloud.com/${appleUser}/calendars/`;
        }
    },
    outlook: {
        name: 'Microsoft Outlook',
        baseUrl: 'https://outlook.office365.com/owa/calendar/',
        getUrl: (username) => `https://outlook.office365.com/owa/calendar/${username}/`
    }
};

async function fetchCalDAVEvents(provider, username, password, startDate, endDate) {
    console.log('Fetching CalDAV events for provider:', provider);

    const providerConfig = CALDAV_PROVIDERS[provider];
    if (!providerConfig) {
        throw new Error(`Unsupported CalDAV provider: ${provider}`);
    }

    const caldavUrl = providerConfig.getUrl(username);
    console.log('CalDAV URL:', caldavUrl.replace(username, '***'));

    // Create CalDAV REPORT query
    const reportQuery = `<?xml version="1.0" encoding="utf-8"?>
<C:calendar-query xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
  <D:prop>
    <D:getetag/>
    <C:calendar-data/>
  </D:prop>
  <C:filter>
    <C:comp-filter name="VCALENDAR">
      <C:comp-filter name="VEVENT">
        <C:time-range start="${formatDateForCalDAV(startDate)}" end="${formatDateForCalDAV(endDate)}"/>
      </C:comp-filter>
    </C:comp-filter>
  </C:filter>
</C:calendar-query>`;

    // Create authorization header
    const authHeader = 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');

    console.log('Making CalDAV REPORT request...');

    // Make CalDAV request
    const response = await fetch(caldavUrl, {
        method: 'REPORT',
        headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/xml; charset=utf-8',
            'Depth': '1',
            'User-Agent': 'Family-Dashboard-CalDAV-Proxy/1.0'
        },
        body: reportQuery
    });

    console.log('CalDAV response status:', response.status, response.statusText);

    if (!response.ok) {
        const errorText = await response.text();
        console.error('CalDAV error response:', errorText);
        
        if (response.status === 401) {
            throw new Error('Authentication failed - check username and password');
        } else if (response.status === 403) {
            throw new Error('Access forbidden - check CalDAV permissions');
        } else {
            throw new Error(`CalDAV request failed: ${response.status} ${response.statusText}`);
        }
    }

    const xmlResponse = await response.text();
    console.log('CalDAV XML response length:', xmlResponse.length);

    // Parse the CalDAV response
    const events = parseCalDAVResponse(xmlResponse);
    console.log('Parsed events count:', events.length);

    return {
        calendars: events.length > 0 ? [{
            name: `${providerConfig.name}`,
            color: '#4285f4',
            events: events,
            event_count: events.length
        }] : [],
        connected_users: [{ email: username }],
        total_accounts: 1,
        successful_accounts: 1,
        failed_accounts: 0,
        total_events: events.length,
        date_requested: startDate.toDateString() === new Date().toDateString() ? 'today' : 'tomorrow',
        source: 'caldav_proxy',
        message: events.length > 0 ? `Found ${events.length} events via CalDAV proxy` : 'No events found for this date'
    };
}

function formatDateForCalDAV(date) {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function parseCalDAVResponse(xmlResponse) {
    const events = [];

    try {
        // Simple regex-based parsing for CalDAV responses
        // This handles the most common iCalendar formats
        
        // Split by VEVENT blocks
        const eventBlocks = xmlResponse.split('BEGIN:VEVENT');
        
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
        console.error('Failed to parse CalDAV response:', error);
    }

    return events;
}

function parseICSEvent(icsData) {
    const event = {
        summary: '',
        start: '',
        end: '',
        all_day: false,
        location: '',
        description: '',
        calendar_name: 'CalDAV Calendar'
    };

    const lines = icsData.split(/\r?\n/);
    
    for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;
        
        const colonIndex = trimmedLine.indexOf(':');
        if (colonIndex === -1) continue;
        
        const key = trimmedLine.substring(0, colonIndex).trim();
        const value = trimmedLine.substring(colonIndex + 1).trim();
        
        // Handle different property names and formats
        if (key === 'SUMMARY') {
            event.summary = decodeICSText(value);
        } else if (key.startsWith('DTSTART')) {
            event.start = parseICSDate(value);
            if (key.includes('VALUE=DATE') || value.length === 8) {
                event.all_day = true;
            }
        } else if (key.startsWith('DTEND')) {
            event.end = parseICSDate(value);
        } else if (key === 'LOCATION') {
            event.location = decodeICSText(value);
        } else if (key === 'DESCRIPTION') {
            event.description = decodeICSText(value);
        }
    }

    return event;
}

function parseICSDate(icsDate) {
    try {
        // Handle different ICS date formats
        if (icsDate.length === 8) {
            // YYYYMMDD format (all-day)
            const year = icsDate.substring(0, 4);
            const month = icsDate.substring(4, 6);
            const day = icsDate.substring(6, 8);
            return `${year}-${month}-${day}`;
        } else if (icsDate.includes('T')) {
            // YYYYMMDDTHHMMSS format
            const datePart = icsDate.split('T')[0];
            const timePart = icsDate.split('T')[1].replace(/Z$/, '');
            
            const year = datePart.substring(0, 4);
            const month = datePart.substring(4, 6);
            const day = datePart.substring(6, 8);
            
            if (timePart.length >= 6) {
                const hour = timePart.substring(0, 2);
                const minute = timePart.substring(2, 4);
                const second = timePart.substring(4, 6);
                return `${year}-${month}-${day}T${hour}:${minute}:${second}Z`;
            } else {
                return `${year}-${month}-${day}`;
            }
        }
        
        return icsDate;
    } catch (error) {
        console.error('Failed to parse ICS date:', icsDate, error);
        return icsDate;
    }
}

function decodeICSText(text) {
    // Basic ICS text decoding
    return text
        .replace(/\\n/g, '\n')
        .replace(/\\,/g, ',')
        .replace(/\\;/g, ';')
        .replace(/\\\\/g, '\\');
}