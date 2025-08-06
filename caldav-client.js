// CalDAV client for always-on dashboard calendar integration
// Eliminates OAuth token refresh issues by using basic auth

class CalDAVClient {
    constructor(config) {
        this.config = config;
        this.storageKey = 'dashboard-caldav-config';
        this.isConfigured = false;
        this.credentials = null;
        
        // CalDAV endpoints for major providers
        this.providers = {
            google: {
                name: 'Google Calendar',
                endpoint: 'https://apidata.googleusercontent.com/caldav/v2/',
                instructions: 'Use your Google email and an App Password (not your regular password)'
            },
            apple: {
                name: 'Apple iCloud',
                endpoint: 'https://caldav.icloud.com/',
                instructions: 'Use your Apple ID and an app-specific password'
            },
            outlook: {
                name: 'Microsoft Outlook',
                endpoint: 'https://outlook.office365.com/owa/calendar/',
                instructions: 'Use your Outlook email and password'
            },
            generic: {
                name: 'Generic CalDAV Server',
                endpoint: '',
                instructions: 'Enter your CalDAV server URL, username, and password'
            }
        };
        
        this.loadSavedConfig();
    }
    
    // Load saved CalDAV configuration
    loadSavedConfig() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            if (saved) {
                const config = JSON.parse(saved);
                if (config.provider && config.username && config.password) {
                    this.credentials = config;
                    this.isConfigured = true;
                    console.log('CalDAV configuration loaded for provider:', config.provider);
                }
            }
        } catch (error) {
            console.error('Failed to load CalDAV configuration:', error);
        }
    }
    
    // Save CalDAV configuration (with basic encryption)
    saveConfig(provider, username, password, customEndpoint = '') {
        try {
            const config = {
                provider,
                username,
                password: btoa(password), // Basic encoding (not secure, but better than plain text)
                customEndpoint,
                savedAt: Date.now()
            };
            
            localStorage.setItem(this.storageKey, JSON.stringify(config));
            this.credentials = {
                ...config,
                password: password // Keep unencoded for use
            };
            this.isConfigured = true;
            console.log('CalDAV configuration saved for provider:', provider);
            
            return true;
        } catch (error) {
            console.error('Failed to save CalDAV configuration:', error);
            return false;
        }
    }
    
    // Clear CalDAV configuration
    clearConfig() {
        localStorage.removeItem(this.storageKey);
        this.credentials = null;
        this.isConfigured = false;
        console.log('CalDAV configuration cleared');
    }
    
    // Get CalDAV URL for the configured provider
    getCalDAVUrl() {
        if (!this.credentials) return null;
        
        const provider = this.providers[this.credentials.provider];
        if (!provider) return null;
        
        if (this.credentials.provider === 'generic') {
            return this.credentials.customEndpoint;
        }
        
        let url = provider.endpoint;
        
        // Build provider-specific URLs
        switch (this.credentials.provider) {
            case 'google':
                url += `${this.credentials.username}/events/`;
                break;
            case 'apple':
                const appleUser = this.credentials.username.split('@')[0];
                url += `${appleUser}/calendars/`;
                break;
            case 'outlook':
                url += `${this.credentials.username}/`;
                break;
        }
        
        return url;
    }
    
    // Make CalDAV request with authentication
    async makeCalDAVRequest(method, url, body = null) {
        if (!this.credentials) {
            throw new Error('CalDAV not configured');
        }
        
        const authHeader = 'Basic ' + btoa(`${this.credentials.username}:${this.credentials.password}`);
        
        const options = {
            method,
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/xml; charset=utf-8',
                'Depth': '1'
            }
        };
        
        if (body) {
            options.body = body;
        }
        
        try {
            console.log(`CalDAV ${method} request to:`, url.replace(/\/\/[^@]*@/, '//***:***@'));
            
            const response = await fetch(url, options);
            
            console.log('CalDAV response:', {
                status: response.status,
                statusText: response.statusText,
                ok: response.ok
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('CalDAV Error Response:', errorText);
                throw new Error(`CalDAV ${method} failed: ${response.status} ${response.statusText}`);
            }
            
            return await response.text();
        } catch (error) {
            console.error(`CalDAV ${method} request failed:`, error);
            throw error;
        }
    }
    
    // Test CalDAV connection via Vercel proxy
    async testConnection() {
        if (!this.credentials) {
            return { success: false, error: 'No CalDAV configuration found' };
        }
        
        try {
            console.log('Testing CalDAV connection via proxy...');
            
            // Use the proxy to test connection
            const proxyUrl = this.getProxyUrl();
            const response = await fetch(proxyUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    provider: this.credentials.provider,
                    username: this.credentials.username,
                    password: this.credentials.password,
                    dateParam: 'today'
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Connection test failed' }));
                return { 
                    success: false, 
                    error: errorData.error || `HTTP ${response.status}: ${response.statusText}`
                };
            }
            
            const data = await response.json();
            
            return { 
                success: true, 
                message: `Successfully connected to ${this.providers[this.credentials.provider].name} via proxy` 
            };
            
        } catch (error) {
            return { 
                success: false, 
                error: `Connection test failed: ${error.message}` 
            };
        }
    }
    
    // Get calendar events for a specific date
    async getCalendarEvents(date = 'today') {
        console.log('=== CALDAV CALENDAR REQUEST ===');
        console.log('Date requested:', date);
        console.log('CalDAV configured:', this.isConfigured);
        
        if (!this.isConfigured) {
            return {
                calendars: [],
                connected_users: [],
                total_accounts: 0,
                successful_accounts: 0,
                failed_accounts: 0,
                total_events: 0,
                date_requested: date,
                source: 'caldav_not_configured',
                message: 'CalDAV calendar not configured. Please set up your calendar connection.'
            };
        }
        
        try {
            // Calculate date range
            const now = new Date();
            const targetDate = date === 'tomorrow' 
                ? new Date(now.getTime() + 24 * 60 * 60 * 1000)
                : now;
            
            const startOfDay = new Date(targetDate);
            startOfDay.setHours(0, 0, 0, 0);
            
            const endOfDay = new Date(targetDate);
            endOfDay.setHours(23, 59, 59, 999);
            
            console.log('Fetching CalDAV events for date range:', {
                start: startOfDay.toISOString(),
                end: endOfDay.toISOString()
            });
            
            // Fetch events via Vercel proxy
            const proxyUrl = this.getProxyUrl();
            const response = await fetch(proxyUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    provider: this.credentials.provider,
                    username: this.credentials.username,
                    password: this.credentials.password,
                    dateParam: date
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                throw new Error(`CalDAV proxy failed: ${errorData.error || response.statusText}`);
            }
            
            const calendarData = await response.json();
            console.log('CalDAV proxy response:', calendarData);
            
            return calendarData;
            
        } catch (error) {
            console.error('CalDAV calendar request failed:', error);
            
            return {
                calendars: [],
                connected_users: [],
                total_accounts: 1,
                successful_accounts: 0,
                failed_accounts: 1,
                total_events: 0,
                date_requested: date,
                source: 'caldav_error',
                message: `CalDAV error: ${error.message}`
            };
        }
    }
    
    // Fetch events for a specific date range using Vercel proxy
    async fetchEventsForDateRange(startDate, endDate) {
        if (!this.credentials) {
            throw new Error('CalDAV credentials not configured');
        }
        
        const dateParam = startDate.toDateString() === new Date().toDateString() ? 'today' : 'tomorrow';
        
        try {
            console.log('Using Vercel CalDAV proxy for:', this.credentials.provider);
            
            // Use Vercel serverless function to avoid CORS issues
            const proxyUrl = this.getProxyUrl();
            const response = await fetch(proxyUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    provider: this.credentials.provider,
                    username: this.credentials.username,
                    password: this.credentials.password,
                    dateParam: dateParam
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                throw new Error(`Proxy request failed: ${errorData.error || response.statusText}`);
            }
            
            const data = await response.json();
            console.log('Proxy response:', data);
            
            // Return events from the proxy response
            return data.calendars?.[0]?.events || [];
            
        } catch (error) {
            console.error('Failed to fetch CalDAV events via proxy:', error);
            throw error;
        }
    }
    
    // Get the Vercel proxy URL
    getProxyUrl() {
        // In production, this will be your Vercel deployment URL
        // For development, you can test with local Vercel dev server
        const baseUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
            ? 'http://localhost:3000'  // Local development
            : 'https://family-dash-git-main-josiah-coles-projects.vercel.app';  // Production Vercel deployment
            
        return `${baseUrl}/api/calendar`;
    }
    
    // Format date for CalDAV time-range queries
    formatDateForCalDAV(date) {
        return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    }
    
    // Parse CalDAV XML response and extract events
    parseCalDAVResponse(xmlResponse) {
        const events = [];
        
        try {
            // Simple XML parsing for CalDAV responses
            // This is a basic implementation - could be enhanced with a proper XML parser
            
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlResponse, 'text/xml');
            
            const responses = xmlDoc.querySelectorAll('response');
            
            responses.forEach(response => {
                const calendarData = response.querySelector('calendar-data');
                if (calendarData) {
                    const icsData = calendarData.textContent;
                    const parsedEvents = this.parseICSData(icsData);
                    events.push(...parsedEvents);
                }
            });
            
        } catch (error) {
            console.error('Failed to parse CalDAV XML response:', error);
            // Try fallback ICS parsing if XML parsing fails
            if (xmlResponse.includes('BEGIN:VCALENDAR')) {
                return this.parseICSData(xmlResponse);
            }
        }
        
        return events;
    }
    
    // Parse ICS (iCalendar) data to extract events
    parseICSData(icsData) {
        const events = [];
        
        try {
            const lines = icsData.split('\n').map(line => line.trim());
            let currentEvent = null;
            
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                
                if (line === 'BEGIN:VEVENT') {
                    currentEvent = {};
                } else if (line === 'END:VEVENT' && currentEvent) {
                    if (currentEvent.summary) {
                        events.push({
                            summary: currentEvent.summary,
                            start: currentEvent.start,
                            end: currentEvent.end,
                            all_day: currentEvent.all_day || false,
                            location: currentEvent.location || '',
                            description: currentEvent.description || '',
                            calendar_name: 'CalDAV Calendar'
                        });
                    }
                    currentEvent = null;
                } else if (currentEvent) {
                    const [key, ...valueParts] = line.split(':');
                    const value = valueParts.join(':');
                    
                    switch (key) {
                        case 'SUMMARY':
                            currentEvent.summary = value;
                            break;
                        case 'DTSTART':
                            currentEvent.start = this.parseICSDate(value);
                            if (value.length === 8) { // YYYYMMDD format = all-day
                                currentEvent.all_day = true;
                            }
                            break;
                        case 'DTEND':
                            currentEvent.end = this.parseICSDate(value);
                            break;
                        case 'LOCATION':
                            currentEvent.location = value;
                            break;
                        case 'DESCRIPTION':
                            currentEvent.description = value;
                            break;
                    }
                }
            }
            
        } catch (error) {
            console.error('Failed to parse ICS data:', error);
        }
        
        return events;
    }
    
    // Parse ICS date format to JavaScript Date
    parseICSDate(icsDate) {
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
                const timePart = icsDate.split('T')[1].replace('Z', '');
                
                const year = datePart.substring(0, 4);
                const month = datePart.substring(4, 6);
                const day = datePart.substring(6, 8);
                
                const hour = timePart.substring(0, 2);
                const minute = timePart.substring(2, 4);
                const second = timePart.substring(4, 6);
                
                return `${year}-${month}-${day}T${hour}:${minute}:${second}Z`;
            }
            
            return icsDate;
        } catch (error) {
            console.error('Failed to parse ICS date:', icsDate, error);
            return icsDate;
        }
    }
    
    // Get configuration status for UI
    getConfigStatus() {
        if (!this.isConfigured) {
            return {
                configured: false,
                message: 'CalDAV calendar not configured'
            };
        }
        
        return {
            configured: true,
            provider: this.providers[this.credentials.provider].name,
            username: this.credentials.username,
            message: `Connected to ${this.providers[this.credentials.provider].name}`
        };
    }
}

// Export for global use
window.CalDAVClient = CalDAVClient;