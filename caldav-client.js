// CalDAV client for always-on dashboard calendar integration
// Eliminates OAuth token refresh issues by using basic auth
// v2: Multi-account support with fan-out fetch

const COLOR_PALETTE = ['#4285f4', '#ea4335', '#34a853', '#ff9800', '#9c27b0', '#00bcd4'];

class CalDAVClient {
    constructor(config) {
        this.config = config;
        this.accounts = [];

        // CalDAV endpoints for major providers
        this.providers = {
            google: {
                name: 'Google Calendar',
                endpoint: 'https://apidata.googleusercontent.com/caldav/v2/',
                workspaceEndpoint: 'https://calendar.google.com/calendar/dav/',
                instructions: 'Use your Google email and an App Password. For Workspace accounts, use your full email address.'
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

        this.loadAccounts();
    }

    get isConfigured() {
        return this.accounts.length > 0;
    }

    // Load accounts from new or legacy storage
    loadAccounts() {
        try {
            // Try new multi-account key first
            const newData = localStorage.getItem('dashboard-caldav-accounts');
            if (newData) {
                const parsed = JSON.parse(newData);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    this.accounts = parsed.map(acc => ({
                        ...acc,
                        password: atob(acc.password)
                    }));
                    console.log('CalDAV accounts loaded:', this.accounts.length);
                    return;
                }
            }

            // Fall through: migrate legacy single-account key
            const legacyData = localStorage.getItem('dashboard-caldav-config');
            if (legacyData) {
                const legacy = JSON.parse(legacyData);
                if (legacy.provider && legacy.username && legacy.password) {
                    const migrated = {
                        id: 'acc_' + (legacy.savedAt || Date.now()),
                        label: '',
                        provider: legacy.provider,
                        username: legacy.username,
                        password: atob(legacy.password),
                        customEndpoint: legacy.customEndpoint || '',
                        color: COLOR_PALETTE[0],
                        savedAt: legacy.savedAt || Date.now()
                    };
                    this.accounts = [migrated];
                    this._persistAccounts();
                    localStorage.removeItem('dashboard-caldav-config');
                    console.log('CalDAV config migrated from legacy key');
                }
            }
        } catch (error) {
            console.error('Failed to load CalDAV accounts:', error);
            this.accounts = [];
        }
    }

    // Add or update an account
    addAccount(provider, username, password, customEndpoint = '', label = '') {
        try {
            const existing = this.accounts.findIndex(
                a => a.username === username && a.provider === provider
            );

            if (existing >= 0) {
                // Update in place
                this.accounts[existing] = {
                    ...this.accounts[existing],
                    password,
                    customEndpoint,
                    label,
                    savedAt: Date.now()
                };
                console.log('CalDAV account updated:', username);
            } else {
                const idx = this.accounts.length;
                this.accounts.push({
                    id: 'acc_' + Date.now(),
                    label,
                    provider,
                    username,
                    password,
                    customEndpoint,
                    color: COLOR_PALETTE[idx % COLOR_PALETTE.length],
                    savedAt: Date.now()
                });
                console.log('CalDAV account added:', username);
            }

            this._persistAccounts();
            return true;
        } catch (error) {
            console.error('Failed to add CalDAV account:', error);
            return false;
        }
    }

    // Remove an account by id
    removeAccount(id) {
        this.accounts = this.accounts.filter(a => a.id !== id);
        this._persistAccounts();
        console.log('CalDAV account removed:', id);
    }

    // Persist accounts array to localStorage (passwords re-encoded)
    _persistAccounts() {
        try {
            const toStore = this.accounts.map(acc => ({
                ...acc,
                password: btoa(acc.password)
            }));
            localStorage.setItem('dashboard-caldav-accounts', JSON.stringify(toStore));
        } catch (error) {
            console.error('Failed to persist CalDAV accounts:', error);
        }
    }

    // Legacy wrapper — used by testCalDAVConnection() in setup.html
    saveConfig(provider, username, password, customEndpoint = '') {
        this.accounts = [];
        return this.addAccount(provider, username, password, customEndpoint, '');
    }

    // Clear all accounts
    clearConfig() {
        this.accounts = [];
        localStorage.removeItem('dashboard-caldav-accounts');
        localStorage.removeItem('dashboard-caldav-config');
        console.log('CalDAV configuration cleared');
    }

    // Get calendar events — fan-out across all accounts
    async getCalendarEvents(date = 'today') {
        console.log('=== CALDAV CALENDAR REQUEST ===');
        console.log('Date requested:', date);
        console.log('CalDAV configured:', this.isConfigured, '— accounts:', this.accounts.length);

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

        const proxyUrl = this.getProxyUrl();
        const results = await Promise.allSettled(
            this.accounts.map(acc => this._fetchAccountEvents(acc, date, proxyUrl))
        );

        const calendars = [];
        let successful = 0;
        let failed = 0;

        results.forEach((result, i) => {
            const acc = this.accounts[i];
            if (result.status === 'fulfilled') {
                const data = result.value;
                // Inject account color into each calendar returned
                if (data.calendars) {
                    data.calendars.forEach(cal => {
                        cal.color = acc.color;           // override API's hardcoded color
                        cal.account_color = acc.color;   // also kept for future use
                        cal.account_label = acc.label || acc.username;
                        calendars.push(cal);
                    });
                }
                successful++;
            } else {
                console.warn(`CalDAV account ${acc.username} failed:`, result.reason);
                failed++;
            }
        });

        const totalEvents = calendars.reduce((sum, cal) => sum + (cal.events?.length || 0), 0);

        return {
            calendars,
            connected_users: this.accounts.map(a => a.label || a.username),
            total_accounts: this.accounts.length,
            successful_accounts: successful,
            failed_accounts: failed,
            total_events: totalEvents,
            date_requested: date,
            source: 'caldav',
            message: failed > 0
                ? `${successful} of ${this.accounts.length} accounts loaded successfully`
                : `Loaded events from ${successful} account(s)`
        };
    }

    // Fetch events for a single account via Vercel proxy
    async _fetchAccountEvents(account, date, proxyUrl) {
        const response = await fetch(proxyUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                provider: account.provider,
                username: account.username,
                password: account.password,
                customEndpoint: account.customEndpoint || '',
                dateParam: date
            })
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({ error: response.statusText }));
            throw new Error(`CalDAV proxy failed for ${account.username}: ${err.error || response.statusText}`);
        }

        return response.json();
    }

    // Fetch all events in the next 30 days across all accounts, return flattened
    async getUpcomingSpecialEvents() {
        if (!this.isConfigured) return [];

        const proxyUrl = this.getProxyUrl();
        const results = await Promise.allSettled(
            this.accounts.map(acc => this._fetchAccountEvents(acc, 'upcoming-30', proxyUrl))
        );

        const events = [];
        results.forEach((result, i) => {
            const acc = this.accounts[i];
            if (result.status === 'fulfilled' && result.value.calendars) {
                result.value.calendars.forEach(cal => {
                    (cal.events || []).forEach(event => {
                        events.push({ ...event, calendarColor: acc.color, accountLabel: acc.label || acc.username });
                    });
                });
            } else if (result.status === 'rejected') {
                console.warn(`Upcoming specials: account ${acc.username} failed:`, result.reason);
            }
        });

        return events;
    }

    // Test connection for a specific account (by id) or first account if null
    async testConnection(accountId = null) {
        const account = accountId
            ? this.accounts.find(a => a.id === accountId)
            : this.accounts[0];

        if (!account) {
            return { success: false, error: 'No CalDAV account found' };
        }

        try {
            console.log('Testing CalDAV connection via proxy for:', account.username);
            await this._fetchAccountEvents(account, 'today', this.getProxyUrl());
            return {
                success: true,
                message: `Successfully connected to ${this.providers[account.provider]?.name || account.provider}`
            };
        } catch (error) {
            return { success: false, error: `Connection test failed: ${error.message}` };
        }
    }

    // Get configuration status for UI
    getConfigStatus() {
        if (!this.isConfigured) {
            return { configured: false, message: 'CalDAV calendar not configured' };
        }

        return {
            configured: true,
            accounts: this.accounts.map(a => ({
                id: a.id,
                label: a.label,
                username: a.username,
                provider: a.provider,
                color: a.color
            })),
            message: `${this.accounts.length} account(s) configured`
        };
    }

    // Get the Vercel function URL
    getProxyUrl() {
        return window.location.origin + '/api/calendar';
    }

    // Format date for CalDAV time-range queries
    formatDateForCalDAV(date) {
        return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    }

    // Parse CalDAV XML response and extract events
    parseCalDAVResponse(xmlResponse) {
        const events = [];

        try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlResponse, 'text/xml');
            const responses = xmlDoc.querySelectorAll('response');

            responses.forEach(response => {
                const calendarData = response.querySelector('calendar-data');
                if (calendarData) {
                    events.push(...this.parseICSData(calendarData.textContent));
                }
            });
        } catch (error) {
            console.error('Failed to parse CalDAV XML response:', error);
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
            const lines = icsData.split('\n');
            let currentEvent = null;

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();

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
                    const colonIndex = line.indexOf(':');
                    if (colonIndex === -1) continue;

                    const key = line.substring(0, colonIndex);
                    const value = line.substring(colonIndex + 1);

                    switch (key) {
                        case 'SUMMARY':
                            currentEvent.summary = value;
                            break;
                        case 'DTSTART':
                            currentEvent.start = this.parseICSDate(value);
                            if (value.length === 8) {
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
            if (icsDate.length === 8) {
                const year = icsDate.substring(0, 4);
                const month = icsDate.substring(4, 6);
                const day = icsDate.substring(6, 8);
                return `${year}-${month}-${day}`;
            } else if (icsDate.includes('T')) {
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
}

// Export for global use
window.CalDAVClient = CalDAVClient;
