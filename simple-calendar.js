// Simple calendar client that works without CORS issues
// Uses public calendar URLs (ICS feeds) instead of CalDAV

class SimpleCalendarClient {
    constructor(config) {
        this.config = config;
        this.storageKey = 'dashboard-simple-calendar';
        this.isConfigured = false;
        this.settings = null;
        
        this.loadSavedSettings();
    }
    
    loadSavedSettings() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            if (saved) {
                this.settings = JSON.parse(saved);
                this.isConfigured = !!this.settings.calendarUrl;
            }
        } catch (error) {
            console.error('Failed to load calendar settings:', error);
        }
    }
    
    saveSettings(calendarUrl, calendarName = 'My Calendar') {
        try {
            this.settings = {
                calendarUrl,
                calendarName,
                savedAt: Date.now()
            };
            
            localStorage.setItem(this.storageKey, JSON.stringify(this.settings));
            this.isConfigured = true;
            console.log('Calendar settings saved');
            return true;
        } catch (error) {
            console.error('Failed to save calendar settings:', error);
            return false;
        }
    }
    
    clearSettings() {
        localStorage.removeItem(this.storageKey);
        this.settings = null;
        this.isConfigured = false;
    }
    
    async testConnection() {
        if (!this.settings?.calendarUrl) {
            return { success: false, error: 'No calendar URL configured' };
        }
        
        try {
            // Use allorigins.win to bypass CORS for testing
            const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(this.settings.calendarUrl)}`;
            const response = await fetch(proxyUrl);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const icsData = await response.text();
            if (!icsData.includes('BEGIN:VCALENDAR')) {
                throw new Error('Invalid calendar data - not an ICS file');
            }
            
            return {
                success: true,
                message: `Successfully connected to ${this.settings.calendarName}`
            };
            
        } catch (error) {
            return {
                success: false,
                error: `Connection test failed: ${error.message}`
            };
        }
    }
    
    async getCalendarEvents(date = 'today') {
        console.log('=== SIMPLE CALENDAR REQUEST ===');
        console.log('Date requested:', date);
        console.log('Calendar configured:', this.isConfigured);
        
        if (!this.isConfigured || !this.settings?.calendarUrl) {
            return {
                calendars: [],
                connected_users: [],
                total_accounts: 0,
                successful_accounts: 0,
                failed_accounts: 0,
                total_events: 0,
                date_requested: date,
                source: 'calendar_not_configured',
                message: 'Calendar not configured. Please set up your calendar connection.'
            };
        }
        
        try {
            // Use public CORS proxy to fetch calendar data
            const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(this.settings.calendarUrl)}`;
            const response = await fetch(proxyUrl);
            
            if (!response.ok) {
                throw new Error(`Failed to fetch calendar: ${response.statusText}`);
            }
            
            const icsData = await response.text();
            console.log('ICS data fetched, length:', icsData.length);
            
            // Parse events for the requested date
            const events = this.parseICSEvents(icsData, date);
            
            return {
                calendars: events.length > 0 ? [{
                    name: this.settings.calendarName,
                    color: '#4285f4',
                    events: events,
                    event_count: events.length
                }] : [],
                connected_users: [{ email: 'calendar-user' }],
                total_accounts: 1,
                successful_accounts: 1,
                failed_accounts: 0,
                total_events: events.length,
                date_requested: date,
                source: 'simple_calendar',
                message: events.length > 0 ? `Found ${events.length} events` : 'No events found for this date'
            };
            
        } catch (error) {
            console.error('Calendar request failed:', error);
            return {
                calendars: [],
                connected_users: [],
                total_accounts: 1,
                successful_accounts: 0,
                failed_accounts: 1,
                total_events: 0,
                date_requested: date,
                source: 'calendar_error',
                message: `Calendar error: ${error.message}`
            };
        }
    }
    
    parseICSEvents(icsData, dateParam) {
        const events = [];
        
        // Calculate target date
        const now = new Date();
        const targetDate = dateParam === 'tomorrow' 
            ? new Date(now.getTime() + 24 * 60 * 60 * 1000)
            : now;
        
        const targetDateStr = targetDate.toISOString().split('T')[0]; // YYYY-MM-DD
        
        try {
            const eventBlocks = icsData.split('BEGIN:VEVENT');
            
            for (let i = 1; i < eventBlocks.length; i++) {
                const block = eventBlocks[i];
                const endIndex = block.indexOf('END:VEVENT');
                if (endIndex === -1) continue;
                
                const eventData = block.substring(0, endIndex);
                const event = this.parseICSEvent(eventData);
                
                if (event && this.isEventOnDate(event, targetDateStr)) {
                    events.push(event);
                }
            }
        } catch (error) {
            console.error('Failed to parse ICS events:', error);
        }
        
        return events.sort((a, b) => {
            // Sort by start time
            const aTime = new Date(a.start).getTime();
            const bTime = new Date(b.start).getTime();
            return aTime - bTime;
        });
    }
    
    parseICSEvent(eventData) {
        const event = {
            summary: '',
            start: '',
            end: '',
            all_day: false,
            location: '',
            description: '',
            calendar_name: this.settings?.calendarName || 'Calendar'
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
                event.summary = this.decodeICSText(value);
            } else if (key.startsWith('DTSTART')) {
                event.start = this.parseICSDateTime(value);
                if (key.includes('VALUE=DATE') || value.length === 8) {
                    event.all_day = true;
                }
            } else if (key.startsWith('DTEND')) {
                event.end = this.parseICSDateTime(value);
            } else if (key === 'LOCATION') {
                event.location = this.decodeICSText(value);
            } else if (key === 'DESCRIPTION') {
                event.description = this.decodeICSText(value);
            }
        }
        
        return event.summary ? event : null;
    }
    
    parseICSDateTime(icsDateTime) {
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
    
    isEventOnDate(event, targetDateStr) {
        try {
            const eventDate = new Date(event.start);
            const eventDateStr = eventDate.toISOString().split('T')[0];
            return eventDateStr === targetDateStr;
        } catch (error) {
            return false;
        }
    }
    
    decodeICSText(text) {
        return text
            .replace(/\\n/g, '\n')
            .replace(/\\,/g, ',')
            .replace(/\\;/g, ';')
            .replace(/\\\\/g, '\\');
    }
    
    getConfigStatus() {
        if (!this.isConfigured) {
            return {
                configured: false,
                message: 'Calendar not configured'
            };
        }
        
        return {
            configured: true,
            calendarName: this.settings.calendarName,
            message: `Connected to ${this.settings.calendarName}`
        };
    }
}

// Export for global use
window.SimpleCalendarClient = SimpleCalendarClient;